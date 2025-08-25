class YouTubeSubtitleOverlay {
  constructor() {
    this.subtitleData = [];
    this.englishSubtitles = [];
    this.chineseSubtitles = [];
    this.currentVideo = null;
    this.overlayElement = null;
    this.isEnabled = false;
    
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
      const result = await chrome.storage.local.get([
        'subtitleData', 
        'englishSubtitles',
        'chineseSubtitles',
        'subtitleEnabled', 
        'englishSettings',
        'chineseSettings'
      ]);
      
      if (result.englishSubtitles || result.chineseSubtitles) {
        this.englishSubtitles = result.englishSubtitles || [];
        this.chineseSubtitles = result.chineseSubtitles || [];
        console.log('已加载双语字幕数据:', {
          英文: this.englishSubtitles.length,
          中文: this.chineseSubtitles.length
        });
      } else if (result.subtitleData && result.subtitleData.length > 0) {
        this.subtitleData = result.subtitleData;
        console.log('已加载单语字幕数据:', this.subtitleData.length, '条');
      }
      
      if (result.subtitleEnabled !== undefined) {
        this.isEnabled = result.subtitleEnabled;
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