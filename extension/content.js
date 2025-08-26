class YouTubeSubtitleOverlay {
  constructor() {
    this.subtitleData = [];
    this.englishSubtitles = [];
    this.chineseSubtitles = [];
    this.currentVideo = null;
    this.overlayElement = null;
    this.isEnabled = false;
    
    // 自动加载相关配置
    this.autoLoadEnabled = false;
    this.serverUrl = 'http://127.0.0.1:8888';
    this.currentVideoId = null;
    this.autoLoadAttempted = false;
    
    // 独立的语言设置 (32px基础，20%背景透明度)
    this.englishSettings = {
      fontSize: 34,
      fontColor: '#ffffff',
      fontFamily: '"Noto Serif", Georgia, serif',
      fontWeight: '700',
      backgroundOpacity: 20,
      textShadow: '2px 2px 4px rgba(0, 0, 0, 0.8)',
      lineHeight: 1.3,
      position: 'bottom'
    };
    
    this.chineseSettings = {
      fontSize: 32,
      fontColor: '#ffffff',
      fontFamily: 'SimSun, serif',
      fontWeight: '900',
      backgroundOpacity: 20,
      textShadow: '2px 2px 4px rgba(0, 0, 0, 0.8)',
      lineHeight: 1.4,
      position: 'bottom'
    };
    
    this.init();
  }

  init() {
    this.createOverlayElement();
    this.observeVideoChanges();
    this.loadSubtitleData();
    this.bindMessageListener();
  }

  bindMessageListener() {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      switch (request.action) {
        case 'toggleSubtitle':
          this.toggleSubtitle(request.enabled);
          break;
        case 'loadSubtitle':
          this.loadNewSubtitle(request.subtitleData);
          break;
        case 'loadBilingualSubtitles':
          this.loadBilingualSubtitles(request.englishSubtitles, request.chineseSubtitles);
          break;
        case 'clearData':
          this.clearSubtitleData();
          break;
        case 'updateSettings':
          this.updateLanguageSettings(request.language, request.settings);
          break;
        case 'toggleAutoLoad':
          this.toggleAutoLoad(request.enabled);
          break;
        case 'updateServerUrl':
          this.serverUrl = request.url || 'http://127.0.0.1:8888';
          break;
        case 'getVideoInfo':
          const videoId = this.getVideoId();
          const subtitleLoaded = this.englishSubtitles.length > 0 || this.chineseSubtitles.length > 0;
          sendResponse({ 
            videoId: videoId, 
            subtitleLoaded: subtitleLoaded,
            autoLoadEnabled: this.autoLoadEnabled
          });
          break;
      }
    });
  }

  createOverlayElement() {
    this.overlayElement = document.createElement('div');
    this.overlayElement.id = 'youtube-local-subtitle-overlay';
    this.overlayElement.innerHTML = `
      <div class="subtitle-container">
        <div class="english-subtitle" id="englishSubtitle"></div>
        <div class="chinese-subtitle" id="chineseSubtitle"></div>
      </div>
    `;
    this.applyStyles();
    console.log('双语字幕容器已创建');
  }

  applyStyles() {
    // 主容器样式 - 初始为绝对定位
    const mainStyles = {
      position: 'absolute',
      zIndex: '40', // 在视频上方(1-10)，在控制栏下方(50+)
      display: 'none',
      left: '50%',
      transform: 'translateX(-50%)',
      bottom: '60px',
      pointerEvents: 'none',
      userSelect: 'none'
    };
    Object.assign(this.overlayElement.style, mainStyles);

    // 字幕容器样式
    const container = this.overlayElement.querySelector('.subtitle-container');
    if (container) {
      Object.assign(container.style, {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '2px'  // 适当间距
      });
    }
    
    // 应用独立的英文字幕样式
    this.applyLanguageStyles('english');
    
    // 应用独立的中文字幕样式
    this.applyLanguageStyles('chinese');
    
    console.log('字幕样式已应用 - 独立语言样式，等待插入到播放器');
  }

  // 应用独立语言样式
  applyLanguageStyles(language) {
    const settings = language === 'english' ? this.englishSettings : this.chineseSettings;
    const elementId = language === 'english' ? '#englishSubtitle' : '#chineseSubtitle';
    const element = this.overlayElement.querySelector(elementId);
    
    if (element && settings) {
      Object.assign(element.style, {
        fontSize: settings.fontSize + 'px',
        color: settings.fontColor,
        fontFamily: settings.fontFamily,
        fontWeight: settings.fontWeight,
        textShadow: settings.textShadow,
        lineHeight: settings.lineHeight,
        background: `rgba(0, 0, 0, ${settings.backgroundOpacity / 100})`,
        padding: '2px 6px',
        borderRadius: '3px',
        display: 'inline-block',
        textAlign: 'center',
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
        maxWidth: '100%',
        margin: '0'
      });
      
      console.log(`${language === 'english' ? '英文' : '中文'}字幕样式已应用:`, {
        fontSize: settings.fontSize + 'px',
        backgroundOpacity: settings.backgroundOpacity + '%',
        fontFamily: settings.fontFamily
      });
    }
  }

  observeVideoChanges() {
    let currentUrl = location.href;
    const observer = new MutationObserver(() => {
      if (location.href !== currentUrl) {
        currentUrl = location.href;
        setTimeout(() => this.onVideoChange(), 1000);
      }
    });
    
    observer.observe(document.body, { childList: true, subtree: true });
    setTimeout(() => this.onVideoChange(), 1000);
  }

  onVideoChange() {
    const video = document.querySelector('video');
    if (video && video !== this.currentVideo) {
      this.currentVideo = video;
      this.setupVideoListeners();
      this.insertOverlayToPage();
      this.setupResizeListener();
      
      // 视频切换时重新加载对应的字幕数据
      this.loadSubtitleData();
      
      // 重置自动加载状态，允许页面刷新时重新加载字幕
      this.autoLoadAttempted = false;
      
      console.log('🔄 页面/视频切换检测到，当前状态:', {
        视频ID: this.getVideoId(),
        自动加载已启用: this.autoLoadEnabled,
        已尝试加载: this.autoLoadAttempted,
        英文字幕: this.englishSubtitles.length,
        中文字幕: this.chineseSubtitles.length,
        单语字幕: this.subtitleData.length
      });
      
      // 检查并自动加载字幕
      setTimeout(() => {
        console.log('🚀 准备尝试自动加载字幕...');
        this.attemptAutoLoad();
      }, 500); // 延迟500ms确保页面完全加载
    }
  }

  setupVideoListeners() {
    if (!this.currentVideo) return;
    
    if (this.onTimeUpdate) {
      this.currentVideo.removeEventListener('timeupdate', this.onTimeUpdate);
    }
    
    this.onTimeUpdate = () => {
      if (this.isEnabled) {
        if (this.englishSubtitles.length > 0 || this.chineseSubtitles.length > 0 || this.subtitleData.length > 0) {
          this.updateSubtitle();
        }
      }
    };
    
    this.currentVideo.addEventListener('timeupdate', this.onTimeUpdate);
    console.log('字幕监听器已绑定 - 双语支持');
    
    if (this.isEnabled) {
      this.updateSubtitle();
    }
  }

  setupResizeListener() {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
    if (this.scrollListener) {
      window.removeEventListener('scroll', this.scrollListener);
    }
    if (this.fullscreenListener) {
      document.removeEventListener('fullscreenchange', this.fullscreenListener);
    }
    if (this.resizeWindowListener) {
      window.removeEventListener('resize', this.resizeWindowListener);
    }
    
    // 节流函数，避免频繁重新定位
    const throttleReposition = this.throttle(() => {
      if (this.overlayElement && this.isEnabled) {
        this.repositionSubtitle();
      }
    }, 100); // 100ms节流
    
    this.resizeObserver = new ResizeObserver(() => {
      throttleReposition();
    });
    
    this.scrollListener = () => {
      throttleReposition();
    };
    
    this.fullscreenListener = () => {
      // 全屏切换需要立即响应，稍微延迟确保DOM更新完成
      setTimeout(() => {
        if (this.overlayElement && this.isEnabled) {
          this.repositionSubtitle();
        }
      }, 100);
    };
    
    this.resizeWindowListener = () => {
      throttleReposition();
    };
    
    this.setupYouTubeStateListener();
    
    if (this.currentVideo) {
      this.resizeObserver.observe(this.currentVideo);
    }
    window.addEventListener('scroll', this.scrollListener, { passive: true });
    document.addEventListener('fullscreenchange', this.fullscreenListener);
    window.addEventListener('resize', this.resizeWindowListener, { passive: true });
    
    console.log('优化的动态定位监听器已设置');
  }

  // 节流函数
  throttle(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  setupYouTubeStateListener() {
    if (this.youtubeStateObserver) {
      this.youtubeStateObserver.disconnect();
    }
    
    this.youtubeStateObserver = new MutationObserver((mutations) => {
      let needsReposition = false;
      
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && 
            (mutation.attributeName === 'class' || mutation.attributeName === 'theater')) {
          needsReposition = true;
        }
        
        if (mutation.type === 'childList') {
          needsReposition = true;
        }
      });
      
      if (needsReposition && this.overlayElement && this.isEnabled) {
        setTimeout(() => this.repositionSubtitle(), 200);
      }
    });
    
    const targets = [
      document.querySelector('#movie_player'),
      document.querySelector('#masthead-container'),
      document.querySelector('#page-manager'),
      document.body
    ].filter(el => el);
    
    targets.forEach(target => {
      this.youtubeStateObserver.observe(target, {
        attributes: true,
        attributeFilter: ['class', 'theater', 'fullscreen'],
        childList: true,
        subtree: false
      });
    });
  }

  repositionSubtitle() {
    if (!this.overlayElement || !this.currentVideo) return;
    
    const videoRect = this.currentVideo.getBoundingClientRect();
    const isFullscreen = document.fullscreenElement !== null;
    const isTheaterMode = document.querySelector('.ytp-size-large') !== null;
    const isMiniPlayer = document.querySelector('.ytp-miniplayer-active') !== null;
    
    // 获取视频播放器容器
    const playerContainer = document.querySelector('#movie_player');
    const containerRect = playerContainer ? playerContainer.getBoundingClientRect() : videoRect;
    
    if (isFullscreen) {
      // 全屏模式：居中显示
      this.overlayElement.style.position = 'fixed';
      this.overlayElement.style.left = '50%';
      this.overlayElement.style.transform = 'translateX(-50%)';
      this.overlayElement.style.bottom = '80px';
      this.overlayElement.style.maxWidth = '90%';
      this.overlayElement.style.zIndex = '9999';
    } else if (isMiniPlayer) {
      // 迷你播放器：隐藏字幕
      this.overlayElement.style.display = 'none';
      return;
    } else {
      // 普通和剧场模式：相对于视频容器定位
      this.overlayElement.style.display = 'block';
      this.overlayElement.style.position = 'absolute';
      this.overlayElement.style.zIndex = '40';
      
      // 确保字幕容器相对于播放器定位
      if (playerContainer) {
        // 如果播放器容器存在，使用相对定位
        if (playerContainer.style.position !== 'relative') {
          playerContainer.style.position = 'relative';
        }
        
        // 相对于播放器容器居中
        this.overlayElement.style.left = '50%';
        this.overlayElement.style.transform = 'translateX(-50%)';
        this.overlayElement.style.bottom = isTheaterMode ? '70px' : '60px';
        this.overlayElement.style.maxWidth = '90%';
        
        // 确保字幕容器在播放器内部
        if (!playerContainer.contains(this.overlayElement)) {
          playerContainer.appendChild(this.overlayElement);
        }
      } else {
        // 后备方案：使用fixed定位
        this.overlayElement.style.position = 'fixed';
        this.overlayElement.style.left = '50%';
        this.overlayElement.style.transform = 'translateX(-50%)';
        this.overlayElement.style.bottom = (window.innerHeight - videoRect.bottom + 60) + 'px';
        this.overlayElement.style.maxWidth = Math.min(videoRect.width * 0.9, 800) + 'px';
      }
    }
    
    // 字幕定位已优化
  }

  insertOverlayToPage() {
    const existingOverlay = document.getElementById('youtube-local-subtitle-overlay');
    if (existingOverlay) {
      existingOverlay.remove();
    }
    
    // 优先插入到播放器容器内
    const moviePlayer = document.querySelector('#movie_player');
    
    if (moviePlayer) {
      // 设置播放器容器为相对定位，确保字幕绝对定位相对于它
      if (moviePlayer.style.position !== 'relative') {
        moviePlayer.style.position = 'relative';
      }
      
      moviePlayer.appendChild(this.overlayElement);
    } else {
      // 后备方案：插入到body
      document.body.appendChild(this.overlayElement);
    }
    
    // 初始定位
    this.repositionSubtitle();
  }

  updateSubtitle() {
    if (!this.currentVideo || !this.isEnabled || !this.overlayElement) return;
    
    const currentTime = this.currentVideo.currentTime;
    
    let englishText = '';
    let chineseText = '';
    
    if (this.englishSubtitles.length > 0) {
      const englishSubtitle = this.findCurrentSubtitle(currentTime, this.englishSubtitles);
      if (englishSubtitle) {
        englishText = englishSubtitle.text;
      }
    }
    
    if (this.chineseSubtitles.length > 0) {
      const chineseSubtitle = this.findCurrentSubtitle(currentTime, this.chineseSubtitles);
      if (chineseSubtitle) {
        chineseText = chineseSubtitle.text;
      }
    }
    
    if (this.englishSubtitles.length === 0 && this.chineseSubtitles.length === 0 && this.subtitleData.length > 0) {
      const currentSubtitle = this.findCurrentSubtitle(currentTime, this.subtitleData);
      if (currentSubtitle) {
        chineseText = currentSubtitle.text;
      }
    }
    
    if (englishText || chineseText) {
      this.showBilingualSubtitle(englishText, chineseText);
    } else {
      this.hideSubtitle();
    }
  }

  showBilingualSubtitle(englishText, chineseText) {
    const englishSubtitle = this.overlayElement.querySelector('#englishSubtitle');
    const chineseSubtitle = this.overlayElement.querySelector('#chineseSubtitle');
    
    if (englishSubtitle) {
      englishSubtitle.textContent = englishText;
      englishSubtitle.style.display = englishText ? 'inline-block' : 'none';
    }
    
    if (chineseSubtitle) {
      chineseSubtitle.textContent = chineseText;  
      chineseSubtitle.style.display = chineseText ? 'inline-block' : 'none';
    }
    
    this.overlayElement.style.display = 'block';
    this.overlayElement.style.position = 'absolute';
    this.overlayElement.style.zIndex = '40'; // 精确的中等层级
    this.overlayElement.style.visibility = 'visible';
    this.overlayElement.style.opacity = '1';
    
    this.repositionSubtitle();
  }

  showSubtitle(text) {
    this.showBilingualSubtitle('', text);
  }

  hideSubtitle() {
    this.overlayElement.style.display = 'none';
  }

  findCurrentSubtitle(currentTime, subtitles = null) {
    const dataToSearch = subtitles || this.subtitleData;
    return dataToSearch.find(subtitle => 
      currentTime >= subtitle.startTime && currentTime <= subtitle.endTime
    );
  }

  toggleSubtitle(enabled) {
    this.isEnabled = enabled;
    console.log('字幕显示:', enabled ? '开启' : '关闭');
    
    if (!enabled) {
      this.hideSubtitle();
    } else {
      // 开启时总是先显示测试字幕，无论是否有真实字幕数据
      this.testSubtitleDisplay();
      
      // 如果有真实字幕数据，在测试字幕消失后继续更新显示
      if (this.englishSubtitles.length > 0 || this.chineseSubtitles.length > 0 || this.subtitleData.length > 0) {
        if (this.currentVideo) {
          // 4秒后开始显示真实字幕（确保测试字幕已消失）
          setTimeout(() => {
            if (this.isEnabled) {
              this.updateSubtitle();
            }
          }, 4000);
        }
      }
    }
  }

  testSubtitleDisplay() {
    if (!this.overlayElement) return;
    
    this.showBilingualSubtitle('✅ Subtitle system working', '✅ 字幕功能正常 - 3秒后消失');
    
    setTimeout(() => {
      // 只有在没有加载真实字幕数据的情况下才隐藏测试字幕
      const hasRealSubtitles = this.englishSubtitles.length > 0 || 
                               this.chineseSubtitles.length > 0 || 
                               this.subtitleData.length > 0;
      
      if (!hasRealSubtitles) {
        this.hideSubtitle();
        console.log('✅ 测试字幕已自动隐藏');
      }
    }, 3000);
  }

  loadBilingualSubtitles(englishSubtitles, chineseSubtitles) {
    this.englishSubtitles = englishSubtitles || [];
    this.chineseSubtitles = chineseSubtitles || [];
    console.log('已加载双语字幕数据:', {
      英文: this.englishSubtitles.length,
      中文: this.chineseSubtitles.length
    });
    
    // 加载字幕时，同步加载最新的设置
    this.loadSubtitleData();
    
    if (this.isEnabled && this.currentVideo) {
      this.updateSubtitle();
    }
  }

  loadNewSubtitle(subtitleData) {
    this.subtitleData = subtitleData;
    console.log('已加载字幕数据:', subtitleData.length, '条');
  }

  clearSubtitleData() {
    this.subtitleData = [];
    this.englishSubtitles = [];
    this.chineseSubtitles = [];
    // 注意：不再清空设置和开关状态，保持用户的设置不变
    this.hideSubtitle();
    console.log('字幕数据已清除，设置和开关状态保持不变');
  }

  updateSettings(settings) {
    this.settings = { ...this.settings, ...settings };
    console.log('字幕设置已更新:', this.settings);
    
    // 立即更新CSS变量，确保设置实时生效
    this.updateCSSVariables();
    this.applyStyles();
    
    if (this.isEnabled && this.overlayElement && this.overlayElement.style.display !== 'none') {
      this.repositionSubtitle();
    }
  }

  // 更新独立语言设置
  updateLanguageSettings(language, settings) {
    if (language === 'english') {
      this.englishSettings = { ...this.englishSettings, ...settings };
      console.log('英文字幕设置已更新:', settings);
    } else if (language === 'chinese') {
      this.chineseSettings = { ...this.chineseSettings, ...settings };
      console.log('中文字幕设置已更新:', settings);
    }
    
    // 重新应用对应语言的样式
    this.applyLanguageStyles(language);
  }

  async loadSubtitleData() {
    try {
      const currentVideoId = this.getVideoId();
      
      // 获取全局设置和当前视频的字幕数据
      const result = await chrome.storage.local.get([
        'subtitleEnabled', 
        'englishSettings',
        'chineseSettings',
        'autoLoadEnabled',
        `videoSubtitles_${currentVideoId}` // 基于videoId的字幕数据
      ]);
      
      // 清除之前的字幕数据
      this.subtitleData = [];
      this.englishSubtitles = [];
      this.chineseSubtitles = [];
      
      // 只有当前视频ID存在且有对应字幕数据时才加载
      if (currentVideoId && result[`videoSubtitles_${currentVideoId}`]) {
        const videoSubtitles = result[`videoSubtitles_${currentVideoId}`];
        
        // 加载当前视频的字幕数据
        if (videoSubtitles.englishSubtitles || videoSubtitles.chineseSubtitles) {
          this.englishSubtitles = videoSubtitles.englishSubtitles || [];
          this.chineseSubtitles = videoSubtitles.chineseSubtitles || [];
          console.log('已加载视频字幕数据 (', currentVideoId, '):', {
            英文: this.englishSubtitles.length,
            中文: this.chineseSubtitles.length
          });
        } else if (videoSubtitles.subtitleData && videoSubtitles.subtitleData.length > 0) {
          this.subtitleData = videoSubtitles.subtitleData;
          console.log('已加载视频单语字幕数据 (', currentVideoId, '):', this.subtitleData.length, '条');
        }
      } else if (currentVideoId) {
        console.log('当前视频 (', currentVideoId, ') 无字幕数据');
      } else {
        console.log('未找到视频ID，无法加载字幕');
      }
      
      if (result.subtitleEnabled !== undefined) {
        this.isEnabled = result.subtitleEnabled;
      }
      
      // 加载自动加载状态
      if (result.autoLoadEnabled !== undefined) {
        this.autoLoadEnabled = result.autoLoadEnabled;
        console.log('自动加载状态已加载:', this.autoLoadEnabled);
      }
      
      // 加载独立语言设置
      if (result.englishSettings) {
        this.englishSettings = { ...this.englishSettings, ...result.englishSettings };
        console.log('英文字幕设置已加载:', this.englishSettings);
      }
      
      if (result.chineseSettings) {
        this.chineseSettings = { ...this.chineseSettings, ...result.chineseSettings };
        console.log('中文字幕设置已加载:', this.chineseSettings);
      }
      
      // 重新应用样式
      if (this.overlayElement) {
        this.applyLanguageStyles('english');
        this.applyLanguageStyles('chinese');
      }
    } catch (error) {
      console.error('加载字幕数据失败:', error);
    }
  }

  // 自动加载相关方法
  toggleAutoLoad(enabled) {
    this.autoLoadEnabled = enabled;
    console.log('自动加载已', enabled ? '启用' : '禁用');
    
    if (enabled) {
      this.attemptAutoLoad();
    }
  }

  getVideoId() {
    const urlParams = new URLSearchParams(window.location.search);
    const videoId = urlParams.get('v');
    return videoId;
  }

  async attemptAutoLoad() {
    console.log('🔍 attemptAutoLoad 方法被调用');
    
    if (!this.autoLoadEnabled) {
      console.log('❌ 自动加载未启用，跳过加载');
      return;
    }

    const videoId = this.getVideoId();
    if (!videoId) {
      console.log('❌ 未找到视频ID，跳过加载');
      return;
    }

    // 检查是否为新的视频ID或页面刷新情况
    const isNewVideo = videoId !== this.currentVideoId;
    
    // 检查当前是否已有字幕数据
    const hasExistingSubtitles = this.englishSubtitles.length > 0 || 
                                this.chineseSubtitles.length > 0 || 
                                this.subtitleData.length > 0;
    
    // 触发自动加载的条件：
    // 1. 新视频 - 总是尝试加载
    // 2. 页面刷新且当前没有字幕数据 - 重新加载
    // 3. 页面刷新但从未尝试过加载 - 首次加载
    const shouldReload = isNewVideo || 
                        (!hasExistingSubtitles && !this.autoLoadAttempted) ||
                        (!hasExistingSubtitles);
    
    console.log('🔍 自动加载决策分析:', {
      视频ID: videoId,
      当前视频ID: this.currentVideoId,
      是否新视频: isNewVideo,
      是否已有字幕: hasExistingSubtitles,
      已尝试加载: this.autoLoadAttempted,
      是否应该加载: shouldReload
    });
    
    if (!shouldReload) {
      console.log('🔍 跳过自动加载 - 已有字幕数据或已尝试过加载');
      return;
    }

    this.currentVideoId = videoId;
    this.autoLoadAttempted = true;

    // 详细的加载原因日志
    let loadReason = '';
    if (isNewVideo) {
      loadReason = '新视频';
    } else if (!hasExistingSubtitles) {
      loadReason = '页面刷新且无字幕数据';
    }

    console.log('🔍 尝试自动加载字幕:', videoId, `(${loadReason})`);
    console.log('📊 当前字幕状态:', {
      英文字幕: this.englishSubtitles.length,
      中文字幕: this.chineseSubtitles.length,
      单语字幕: this.subtitleData.length,
      自动加载已启用: this.autoLoadEnabled,
      已尝试加载: this.autoLoadAttempted
    });
    
    try {
      const response = await fetch(`${this.serverUrl}/subtitle/${videoId}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        }
      });

      if (!response.ok) {
        if (response.status === 404) {
          console.log('📝 未找到本地字幕文件:', videoId);
        } else {
          console.log('❌ 服务器连接失败:', response.status);
        }
        return;
      }

      const result = await response.json();
      if (result.success && result.content) {
        await this.processAutoLoadedSubtitle(result.content, result.info);
        console.log('✅ 自动加载字幕成功:', videoId);
        
        // 通知popup更新状态
        chrome.runtime.sendMessage({
          action: 'autoLoadSuccess',
          videoId: videoId,
          filename: result.info.filename
        });
      }

    } catch (error) {
      console.log('❌ 自动加载失败:', error.message);
      
      // 通知popup服务器连接失败
      chrome.runtime.sendMessage({
        action: 'autoLoadError',
        error: error.message
      });
    }
  }

  async processAutoLoadedSubtitle(content, info) {
    try {
      const format = info.format.toLowerCase();
      const currentVideoId = this.getVideoId();
      
      if (!currentVideoId) {
        console.error('❌ 无法获取视频ID，跳过字幕保存');
        return;
      }
      
      if (format === '.ass') {
        // 使用现有的ASS解析逻辑
        const assResult = this.parseASSContent(content);
        
        if (assResult.english.length > 0 || assResult.chinese.length > 0) {
          this.englishSubtitles = assResult.english;
          this.chineseSubtitles = assResult.chinese;
          
          // 基于videoId保存到本地存储
          await chrome.runtime.sendMessage({
            action: 'saveVideoSubtitles',
            videoId: currentVideoId,
            englishSubtitles: assResult.english,
            chineseSubtitles: assResult.chinese,
            englishFileName: info.filename + ' (英文)',
            chineseFileName: info.filename + ' (中文)'
          });
          
          console.log('📊 自动加载双语字幕 (' + currentVideoId + '):', {
            英文: assResult.english.length,
            中文: assResult.chinese.length
          });
        }
      } else if (format === '.srt' || format === '.vtt') {
        // 处理SRT/VTT文件
        const subtitleData = format === '.srt' ? 
          SubtitleParser.parseSRT(content) : 
          SubtitleParser.parseVTT(content);
          
        if (subtitleData.length > 0) {
          this.subtitleData = subtitleData;
          
          // 基于videoId保存到本地存储
          await chrome.runtime.sendMessage({
            action: 'saveVideoSubtitles',
            videoId: currentVideoId,
            subtitleData: subtitleData,
            fileName: info.filename
          });
          
          console.log('📊 自动加载单语字幕 (' + currentVideoId + '):', subtitleData.length, '条');
        }
      }
      
      // 自动启用字幕显示
      if (this.englishSubtitles.length > 0 || this.chineseSubtitles.length > 0 || this.subtitleData.length > 0) {
        this.isEnabled = true;
        
        // 通知background更新状态
        chrome.runtime.sendMessage({
          action: 'setSubtitleEnabled',
          enabled: true
        });
        
        if (this.currentVideo) {
          this.updateSubtitle();
        }
      }
      
    } catch (error) {
      console.error('处理自动加载的字幕失败:', error);
    }
  }

  parseASSContent(content) {
    const result = { english: [], chinese: [] };
    const lines = content.split('\n');
    
    let inEventsSection = false;
    
    lines.forEach(line => {
      line = line.trim();
      
      if (line === '[Events]') {
        inEventsSection = true;
        return;
      }
      
      if (line.startsWith('[') && line !== '[Events]') {
        inEventsSection = false;
        return;
      }
      
      if (inEventsSection && line.startsWith('Dialogue:')) {
        const parts = line.split(',');
        if (parts.length >= 10) {
          const style = parts[3];
          const startTime = this.parseASSTime(parts[1]);
          const endTime = this.parseASSTime(parts[2]);
          
          const textParts = parts.slice(9);
          let text = textParts.join(',').trim();
          text = this.cleanASSText(text);
          
          if (text && startTime !== null && endTime !== null) {
            const subtitle = { startTime, endTime, text };
            
            // 根据Style分配到不同语言
            if (style === 'Default') {
              result.english.push(subtitle);
            } else if (style === 'Secondary') {
              result.chinese.push(subtitle);
            }
          }
        }
      }
    });
    
    return result;
  }

  parseASSTime(timeStr) {
    const match = timeStr.match(/(\d+):(\d{2}):(\d{2})\.(\d{2})/);
    if (match) {
      const hours = parseInt(match[1]);
      const minutes = parseInt(match[2]);
      const seconds = parseInt(match[3]);
      const centiseconds = parseInt(match[4]);
      
      return hours * 3600 + minutes * 60 + seconds + centiseconds / 100;
    }
    return null;
  }

  cleanASSText(text) {
    return text.replace(/\{[^}]*\}/g, '')
               .replace(/\\N/g, '\n')
               .replace(/\\n/g, '\n')
               .trim();
  }
}

// 字幕解析器
class SubtitleParser {
  static parseSRT(content) {
    const subtitles = [];
    const blocks = content.trim().split(/\n\s*\n/);
    
    blocks.forEach(block => {
      const lines = block.trim().split('\n');
      if (lines.length >= 3) {
        const timeMatch = lines[1].match(/(\d{2}):(\d{2}):(\d{2}),(\d{3})\s*-->\s*(\d{2}):(\d{2}):(\d{2}),(\d{3})/);
        if (timeMatch) {
          const startTime = this.parseTime(timeMatch[1], timeMatch[2], timeMatch[3], timeMatch[4]);
          const endTime = this.parseTime(timeMatch[5], timeMatch[6], timeMatch[7], timeMatch[8]);
          const text = lines.slice(2).join('\n').replace(/<[^>]*>/g, '');
          
          subtitles.push({ startTime, endTime, text });
        }
      }
    });
    
    return subtitles;
  }

  static parseVTT(content) {
    const subtitles = [];
    const lines = content.split('\n');
    let currentSubtitle = null;
    
    lines.forEach(line => {
      line = line.trim();
      
      if (line === 'WEBVTT' || line === '') return;
      
      const timeMatch = line.match(/(\d{2}):(\d{2}):(\d{2})\.(\d{3})\s*-->\s*(\d{2}):(\d{2}):(\d{2})\.(\d{3})/);
      if (timeMatch) {
        if (currentSubtitle) {
          subtitles.push(currentSubtitle);
        }
        
        currentSubtitle = {
          startTime: this.parseTime(timeMatch[1], timeMatch[2], timeMatch[3], timeMatch[4]),
          endTime: this.parseTime(timeMatch[5], timeMatch[6], timeMatch[7], timeMatch[8]),
          text: ''
        };
      } else if (currentSubtitle && line) {
        currentSubtitle.text += (currentSubtitle.text ? '\n' : '') + line.replace(/<[^>]*>/g, '');
      }
    });
    
    if (currentSubtitle) {
      subtitles.push(currentSubtitle);
    }
    
    return subtitles;
  }

  static parseASS(content) {
    const result = { english: [], chinese: [] };
    const lines = content.split('\n');
    
    let inEventsSection = false;
    
    lines.forEach(line => {
      line = line.trim();
      
      // 检测Events部分开始
      if (line === '[Events]') {
        inEventsSection = true;
        return;
      }
      
      // 检测到新的段落，停止解析Events
      if (line.startsWith('[') && line !== '[Events]') {
        inEventsSection = false;
        return;
      }
      
      // 解析Dialogue行
      if (inEventsSection && line.startsWith('Dialogue:')) {
        const parts = line.split(',');
        if (parts.length >= 10) {
          const style = parts[3]; // Style name
          const startTime = this.parseASSTime(parts[1]); // Start time
          const endTime = this.parseASSTime(parts[2]); // End time
          
          // 提取文本内容，从第10个逗号后开始
          const textParts = parts.slice(9);
          let text = textParts.join(',').trim();
          
          // 清理ASS格式标签
          text = this.cleanASSText(text);
          
          if (text && startTime !== null && endTime !== null) {
            const subtitle = { startTime, endTime, text };
            
            // 根据Style分配到不同语言
            if (style === 'Default') {
              result.english.push(subtitle);
            } else if (style === 'Secondary') {
              result.chinese.push(subtitle);
            }
          }
        }
      }
    });
    
    return result;
  }

  static parseASSTime(timeStr) {
    // ASS时间格式: H:MM:SS.CC
    const match = timeStr.match(/(\d+):(\d{2}):(\d{2})\.(\d{2})/);
    if (match) {
      const hours = parseInt(match[1]);
      const minutes = parseInt(match[2]);
      const seconds = parseInt(match[3]);
      const centiseconds = parseInt(match[4]);
      
      return hours * 3600 + minutes * 60 + seconds + centiseconds / 100;
    }
    return null;
  }

  static cleanASSText(text) {
    // 移除ASS样式标签，如 {\i1}、{\b1}、{\c&Hffffff&} 等
    return text
      .replace(/\{[^}]*\}/g, '') // 移除所有 {} 包围的标签
      .replace(/\\N/g, '\n') // 转换换行符
      .replace(/\\h/g, ' ') // 转换硬空格
      .trim();
  }

  static parseTime(hours, minutes, seconds, milliseconds) {
    return parseInt(hours) * 3600 + 
           parseInt(minutes) * 60 + 
           parseInt(seconds) + 
           parseInt(milliseconds) / 1000;
  }
}

// 初始化
let subtitleOverlayInstance = null;

const initializeSubtitle = () => {
  if (!subtitleOverlayInstance) {
    subtitleOverlayInstance = new YouTubeSubtitleOverlay();
  }
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeSubtitle);
} else {
  initializeSubtitle();
}

// 导出
window.SubtitleParser = SubtitleParser;

// 测试函数
window.testSubtitleNow = () => {
  if (subtitleOverlayInstance) {
    subtitleOverlayInstance.isEnabled = true;
    subtitleOverlayInstance.testSubtitleDisplay();
    return true;
  }
  return false;
};

// 字幕定位和层级测试工具
window.testSubtitlePositioning = () => {
  if (!subtitleOverlayInstance) {
    console.log('❌ 字幕实例不存在');
    return false;
  }

  const instance = subtitleOverlayInstance;
  
  // 检查当前播放器状态
  const video = document.querySelector('video');
  const isFullscreen = document.fullscreenElement !== null;
  const isTheaterMode = document.querySelector('.ytp-size-large') !== null;
  const isMiniPlayer = document.querySelector('.ytp-miniplayer-active') !== null;
  
  console.log('🎬 播放器状态检测:', {
    视频元素: !!video,
    全屏模式: isFullscreen,
    剧场模式: isTheaterMode,
    迷你播放器: isMiniPlayer
  });
  
  // 强制启用字幕并显示测试内容
  instance.isEnabled = true;
  instance.showBilingualSubtitle(
    '✅ Layer Test: Should appear BELOW YouTube controls', 
    '✅ 层级测试：应显示在YouTube控制栏下方'
  );
  
  // 检查z-index设置
  const zIndex = instance.overlayElement?.style.zIndex;
  console.log('🎯 字幕层级设置:', {
    zIndex: zIndex,
    位置类型: instance.overlayElement?.style.position,
    显示状态: instance.overlayElement?.style.display
  });
  
  // 检查YouTube控件的z-index（用于对比）
  const progressBar = document.querySelector('.ytp-progress-bar');
  const controls = document.querySelector('.ytp-chrome-bottom');
  const controlsContainer = document.querySelector('.ytp-chrome-controls');
  
  console.log('🎮 YouTube控件层级对比:', {
    进度条zIndex: progressBar ? window.getComputedStyle(progressBar).zIndex : '未找到',
    控制栏zIndex: controls ? window.getComputedStyle(controls).zIndex : '未找到',
    控制容器zIndex: controlsContainer ? window.getComputedStyle(controlsContainer).zIndex : '未找到'
  });
  
  // 验证层级关系
  const subtitleZ = parseInt(zIndex) || 50;
  const progressZ = progressBar ? parseInt(window.getComputedStyle(progressBar).zIndex) || 0 : 0;
  const controlsZ = controls ? parseInt(window.getComputedStyle(controls).zIndex) || 0 : 0;
  
  console.log('🔍 层级关系验证:', {
    字幕层级: subtitleZ,
    进度条层级: progressZ,
    控制栏层级: controlsZ,
    关系正确: subtitleZ < Math.max(progressZ, controlsZ, 60) ? '✅ 字幕在控制栏下方' : '❌ 字幕仍在控制栏上方'
  });
  
  // 5秒后隐藏测试字幕
  setTimeout(() => {
    const hasRealSubtitles = instance.englishSubtitles.length > 0 || 
                             instance.chineseSubtitles.length > 0 || 
                             instance.subtitleData.length > 0;
    
    if (!hasRealSubtitles) {
      instance.hideSubtitle();
      console.log('🔄 测试字幕已隐藏');
    }
  }, 5000);
  
  return true;
};

window.debugBilingualSubtitles = () => {
  if (!subtitleOverlayInstance) {
    console.log('❌ 字幕实例不存在');
    return false;
  }

  const instance = subtitleOverlayInstance;
  const currentTime = instance.currentVideo?.currentTime || 0;
  
  console.log('🔍 双语字幕调试信息:', {
    当前时间: currentTime.toFixed(2) + 's',
    字幕启用: instance.isEnabled,
    英文字幕数量: instance.englishSubtitles.length,
    中文字幕数量: instance.chineseSubtitles.length,
    单语字幕数量: instance.subtitleData.length,
    容器状态: {
      存在: !!instance.overlayElement,
      显示: instance.overlayElement?.style.display,
      可见性: instance.overlayElement?.style.visibility,
      透明度: instance.overlayElement?.style.opacity
    }
  });
  
  if (instance.englishSubtitles.length > 0) {
    console.log('📝 英文字幕示例（前3条）:');
    instance.englishSubtitles.slice(0, 3).forEach((sub, i) => {
      console.log(`  ${i+1}. ${sub.startTime.toFixed(1)}s-${sub.endTime.toFixed(1)}s: "${sub.text}"`);
    });
  }
  
  if (instance.chineseSubtitles.length > 0) {
    console.log('📝 中文字幕示例（前3条）:');
    instance.chineseSubtitles.slice(0, 3).forEach((sub, i) => {
      console.log(`  ${i+1}. ${sub.startTime.toFixed(1)}s-${sub.endTime.toFixed(1)}s: "${sub.text}"`);
    });
  }
  
  const englishCurrent = instance.findCurrentSubtitle(currentTime, instance.englishSubtitles);
  const chineseCurrent = instance.findCurrentSubtitle(currentTime, instance.chineseSubtitles);
  
  console.log('🎯 当前时间字幕匹配:');
  console.log('  英文:', englishCurrent ? `"${englishCurrent.text}"` : '无匹配');
  console.log('  中文:', chineseCurrent ? `"${chineseCurrent.text}"` : '无匹配');
  
  console.log('🧪 执行强制显示测试...');
  instance.isEnabled = true;
  if (englishCurrent || chineseCurrent) {
    instance.showBilingualSubtitle(
      englishCurrent?.text || '',
      chineseCurrent?.text || ''
    );
  } else {
    instance.showBilingualSubtitle('Test English', '测试中文');
  }
  
  return true;
};

// 完整的自动加载诊断工具
window.diagnoseAutoLoad = async () => {
  if (!subtitleOverlayInstance) {
    console.log('❌ 字幕实例不存在');
    return false;
  }

  const instance = subtitleOverlayInstance;
  
  console.log('🔍 开始自动加载功能全面诊断...');
  console.log('═══════════════════════════════════════');
  
  // 1. 检查基本状态
  console.log('📊 基本状态检查:');
  const videoId = instance.getVideoId();
  const hasExistingSubtitles = instance.englishSubtitles.length > 0 || 
                              instance.chineseSubtitles.length > 0 || 
                              instance.subtitleData.length > 0;
  
  console.log('  视频ID:', videoId || '未找到');
  console.log('  自动加载已启用:', instance.autoLoadEnabled);
  console.log('  已尝试加载:', instance.autoLoadAttempted);
  console.log('  当前视频ID:', instance.currentVideoId);
  console.log('  是否有现有字幕:', hasExistingSubtitles);
  console.log('  字幕数量:', {
    英文: instance.englishSubtitles.length,
    中文: instance.chineseSubtitles.length,
    单语: instance.subtitleData.length
  });
  
  // 2. 检查存储状态
  console.log('\n💾 存储状态检查:');
  try {
    const storageResult = await chrome.storage.local.get([
      'autoLoadEnabled', 'subtitleData', 'englishSubtitles', 'chineseSubtitles'
    ]);
    console.log('  存储中的自动加载状态:', storageResult.autoLoadEnabled);
    console.log('  存储中的字幕数量:', {
      英文: (storageResult.englishSubtitles || []).length,
      中文: (storageResult.chineseSubtitles || []).length,
      单语: (storageResult.subtitleData || []).length
    });
  } catch (error) {
    console.log('  ❌ 无法读取存储:', error.message);
  }
  
  // 3. 检查服务器连接
  console.log('\n🌐 服务器连接检查:');
  console.log('  服务器URL:', instance.serverUrl);
  if (videoId) {
    console.log('  尝试连接服务器...');
    try {
      const testResponse = await fetch(`${instance.serverUrl}/subtitle/${videoId}`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' }
      });
      console.log('  服务器响应状态:', testResponse.status);
      if (testResponse.ok) {
        const testResult = await testResponse.json();
        console.log('  服务器返回数据:', testResult.success ? '成功' : '失败');
        if (testResult.info) {
          console.log('  文件信息:', testResult.info);
        }
      }
    } catch (error) {
      console.log('  ❌ 服务器连接失败:', error.message);
    }
  } else {
    console.log('  ⚠️  无法测试服务器连接 - 缺少视频ID');
  }
  
  // 4. 执行手动自动加载测试
  console.log('\n🧪 手动执行自动加载测试:');
  console.log('  重置状态...');
  instance.autoLoadAttempted = false;
  instance.currentVideoId = null;
  
  if (!instance.autoLoadEnabled) {
    console.log('  ⚠️  自动加载未启用，正在启用...');
    instance.autoLoadEnabled = true;
  }
  
  console.log('  执行自动加载...');
  await instance.attemptAutoLoad();
  
  console.log('═══════════════════════════════════════');
  console.log('🎯 诊断完成！请查看以上信息定位问题。');
  
  return true;
};

// 测试自动加载功能
window.testAutoLoadOnRefresh = () => {
  if (!subtitleOverlayInstance) {
    console.log('❌ 字幕实例不存在');
    return false;
  }

  const instance = subtitleOverlayInstance;
  
  console.log('🧪 开始测试页面刷新时的自动加载功能...');
  
  // 1. 清除现有字幕数据，模拟页面刷新状态
  console.log('🔄 清除现有字幕数据，模拟页面刷新...');
  instance.clearSubtitleData();
  
  // 2. 重置自动加载状态
  instance.autoLoadAttempted = false;
  instance.currentVideoId = null;
  
  // 3. 启用自动加载
  instance.autoLoadEnabled = true;
  
  console.log('📊 测试前状态:', {
    自动加载已启用: instance.autoLoadEnabled,
    已尝试加载: instance.autoLoadAttempted,
    英文字幕数量: instance.englishSubtitles.length,
    中文字幕数量: instance.chineseSubtitles.length,
    单语字幕数量: instance.subtitleData.length,
    当前视频ID: instance.currentVideoId,
    页面视频ID: instance.getVideoId()
  });
  
  // 4. 触发自动加载检查
  console.log('🚀 触发自动加载检查...');
  instance.attemptAutoLoad().then(() => {
    console.log('✅ 自动加载检查完成');
  }).catch(error => {
    console.log('❌ 自动加载检查失败:', error.message);
  });
  
  console.log('💡 请观察Console输出，查看自动加载是否正确触发');
  console.log('💡 如果服务器运行且有对应字幕文件，应该会看到自动加载成功的消息');
  
  return true;
};

// 新的窗口大小调整测试函数
window.testSubtitleWindowResize = () => {
  if (!subtitleOverlayInstance) {
    console.log('❌ 字幕实例不存在');
    return false;
  }

  const instance = subtitleOverlayInstance;
  
  console.log('🔧 开始窗口大小调整测试...');
  
  // 启用字幕并显示长测试文本
  instance.isEnabled = true;
  const longEnglishText = "This is a very long subtitle text that should wrap properly within video boundaries when the window is resized to different sizes";
  const longChineseText = "这是一个非常长的中文字幕文本，当窗口调整为不同尺寸时，它应该在视频边界内正确换行显示，确保不会超出视频范围";
  
  instance.showBilingualSubtitle(longEnglishText, longChineseText);
  
  // 获取当前视频和字幕位置信息
  const video = document.querySelector('video');
  const videoRect = video?.getBoundingClientRect();
  const subtitleRect = instance.overlayElement?.getBoundingClientRect();
  
  console.log('📐 当前尺寸信息:', {
    窗口尺寸: `${window.innerWidth}x${window.innerHeight}`,
    视频尺寸: videoRect ? `${Math.round(videoRect.width)}x${Math.round(videoRect.height)}` : '未找到视频',
    视频位置: videoRect ? `左:${Math.round(videoRect.left)} 上:${Math.round(videoRect.top)}` : '未找到视频',
    字幕尺寸: subtitleRect ? `${Math.round(subtitleRect.width)}x${Math.round(subtitleRect.height)}` : '未找到字幕',
    字幕位置: subtitleRect ? `左:${Math.round(subtitleRect.left)} 上:${Math.round(subtitleRect.top)}` : '未找到字幕'
  });
  
  // 检查字幕是否在视频范围内
  if (videoRect && subtitleRect) {
    const isWithinBounds = 
      subtitleRect.left >= videoRect.left &&
      subtitleRect.right <= videoRect.right &&
      subtitleRect.top >= videoRect.top &&
      subtitleRect.bottom <= videoRect.bottom + 100; // 允许底部超出一些空间
    
    console.log('✅ 边界检查结果:', {
      字幕在视频范围内: isWithinBounds,
      左边界检查: subtitleRect.left >= videoRect.left ? '✅' : '❌',
      右边界检查: subtitleRect.right <= videoRect.right ? '✅' : '❌',
      上边界检查: subtitleRect.top >= videoRect.top ? '✅' : '❌',
      下边界检查: subtitleRect.bottom <= videoRect.bottom + 100 ? '✅' : '❌'
    });
  }
  
  console.log('💡 请手动调整窗口大小，观察字幕是否始终保持在视频范围内...');
  console.log('💡 10秒后自动清除测试字幕');
  
  // 10秒后清除测试字幕
  setTimeout(() => {
    const hasRealSubtitles = instance.englishSubtitles.length > 0 || 
                             instance.chineseSubtitles.length > 0 || 
                             instance.subtitleData.length > 0;
    
    if (!hasRealSubtitles) {
      instance.hideSubtitle();
      console.log('🔄 测试完成，字幕已隐藏');
    }
  }, 10000);
  
  return true;
};