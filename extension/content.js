class YouTubeSubtitleOverlay {
  constructor() {
    this.subtitleData = [];
    this.englishSubtitles = [];
    this.chineseSubtitles = [];
    this.currentVideo = null;
    this.overlayElement = null;
    this.isEnabled = false;
    this.settings = {
      fontSize: 16,
      fontColor: '#ffffff',
      backgroundOpacity: 60,
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
          this.updateSettings(request.settings);
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
    // 主容器样式
    const mainStyles = {
      position: 'fixed',
      zIndex: '100',
      display: 'none',
      left: '50%',
      transform: 'translateX(-50%)',
      pointerEvents: 'none',
      userSelect: 'none',
      fontFamily: 'Arial, "Helvetica Neue", Helvetica, sans-serif'
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
    
    // 英文字幕样式
    const englishSubtitle = this.overlayElement.querySelector('#englishSubtitle');
    if (englishSubtitle) {
      Object.assign(englishSubtitle.style, {
        fontSize: this.settings.fontSize + 'px',
        color: this.settings.fontColor,
        fontWeight: '600',
        textShadow: '1px 1px 2px rgba(0, 0, 0, 0.8)',
        lineHeight: '1.2',
        background: `rgba(0, 0, 0, ${this.settings.backgroundOpacity / 100})`,
        padding: '2px 6px',
        borderRadius: '3px',
        display: 'inline-block',
        textAlign: 'center',
        whiteSpace: 'nowrap',
        margin: '0'
      });
    }
    
    // 中文字幕样式
    const chineseSubtitle = this.overlayElement.querySelector('#chineseSubtitle');
    if (chineseSubtitle) {
      Object.assign(chineseSubtitle.style, {
        fontSize: this.settings.fontSize + 'px',
        color: this.settings.fontColor,
        fontWeight: '600',
        textShadow: '1px 1px 2px rgba(0, 0, 0, 0.8)',
        lineHeight: '1.2',
        background: `rgba(0, 0, 0, ${this.settings.backgroundOpacity / 100})`,
        padding: '2px 6px',
        borderRadius: '3px',
        display: 'inline-block',
        textAlign: 'center',
        whiteSpace: 'nowrap',
        margin: '0'
      });
    }
    
    this.repositionSubtitle();
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
    
    this.resizeObserver = new ResizeObserver(() => {
      if (this.overlayElement && this.isEnabled) {
        this.repositionSubtitle();
      }
    });
    
    this.scrollListener = () => {
      if (this.overlayElement && this.isEnabled) {
        this.repositionSubtitle();
      }
    };
    
    this.fullscreenListener = () => {
      setTimeout(() => {
        if (this.overlayElement && this.isEnabled) {
          this.repositionSubtitle();
        }
      }, 100);
    };
    
    this.resizeWindowListener = () => {
      if (this.overlayElement && this.isEnabled) {
        this.repositionSubtitle();
      }
    };
    
    this.setupYouTubeStateListener();
    
    if (this.currentVideo) {
      this.resizeObserver.observe(this.currentVideo);
    }
    window.addEventListener('scroll', this.scrollListener, { passive: true });
    document.addEventListener('fullscreenchange', this.fullscreenListener);
    window.addEventListener('resize', this.resizeWindowListener, { passive: true });
    
    console.log('动态定位监听器已设置');
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
    
    if (isFullscreen) {
      this.overlayElement.style.position = 'fixed';
      this.overlayElement.style.left = '50%';
      this.overlayElement.style.transform = 'translateX(-50%)';
      this.overlayElement.style.bottom = '80px';
      this.updateSubtitleStyles(this.settings.fontSize + 4);
    } else if (isMiniPlayer) {
      this.overlayElement.style.display = 'none';
      return;
    } else {
      this.overlayElement.style.position = 'fixed';
      this.overlayElement.style.left = (videoRect.left + videoRect.width / 2) + 'px';
      this.overlayElement.style.transform = 'translateX(-50%)';
      
      let bottomOffset = 30;
      let fontSize = this.settings.fontSize;
      
      if (isTheaterMode) {
        bottomOffset = 40;
        fontSize = this.settings.fontSize + 2;
      }
      
      this.overlayElement.style.bottom = (window.innerHeight - videoRect.bottom + bottomOffset) + 'px';
      this.updateSubtitleStyles(fontSize);
    }
    
    console.log('字幕位置已调整');
  }

  updateSubtitleStyles(fontSize) {
    const englishSubtitle = this.overlayElement.querySelector('#englishSubtitle');
    const chineseSubtitle = this.overlayElement.querySelector('#chineseSubtitle');
    
    if (englishSubtitle) {
      englishSubtitle.style.fontSize = fontSize + 'px';
      englishSubtitle.style.color = this.settings.fontColor;
      englishSubtitle.style.background = `rgba(0, 0, 0, ${this.settings.backgroundOpacity / 100})`;
      englishSubtitle.style.padding = '2px 6px';
      englishSubtitle.style.lineHeight = '1.2';
      englishSubtitle.style.margin = '0';
    }
    if (chineseSubtitle) {
      chineseSubtitle.style.fontSize = fontSize + 'px';
      chineseSubtitle.style.color = this.settings.fontColor;
      chineseSubtitle.style.background = `rgba(0, 0, 0, ${this.settings.backgroundOpacity / 100})`;
      chineseSubtitle.style.padding = '2px 6px';
      chineseSubtitle.style.lineHeight = '1.2';
      chineseSubtitle.style.margin = '0';
    }
  }

  insertOverlayToPage() {
    const existingOverlay = document.getElementById('youtube-local-subtitle-overlay');
    if (existingOverlay) {
      existingOverlay.remove();
    }
    
    const playerContainer = document.querySelector('#movie_player') || 
                           document.querySelector('.html5-video-container') ||
                           document.body;
    
    playerContainer.appendChild(this.overlayElement);
    console.log('字幕容器已插入到页面');
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
    this.overlayElement.style.position = 'fixed';
    this.overlayElement.style.zIndex = '100';
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
      if (this.englishSubtitles.length > 0 || this.chineseSubtitles.length > 0 || this.subtitleData.length > 0) {
        if (this.currentVideo) {
          this.updateSubtitle();
        } else {
          this.testSubtitleDisplay();
        }
      } else {
        this.testSubtitleDisplay();
      }
    }
  }

  testSubtitleDisplay() {
    if (!this.overlayElement) return;
    
    this.showBilingualSubtitle('✅ Subtitle system working', '✅ 字幕功能正常 - 3秒后消失');
    
    setTimeout(() => {
      if (!this.isEnabled || !this.currentVideo) {
        this.hideSubtitle();
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
    this.isEnabled = false;
    this.hideSubtitle();
    console.log('字幕数据已清除');
  }

  updateSettings(settings) {
    this.settings = { ...this.settings, ...settings };
    console.log('字幕设置已更新:', this.settings);
    
    this.applyStyles();
    
    if (this.isEnabled && this.overlayElement && this.overlayElement.style.display !== 'none') {
      this.repositionSubtitle();
    }
  }

  async loadSubtitleData() {
    try {
      const result = await chrome.storage.local.get([
        'subtitleData', 
        'englishSubtitles',
        'chineseSubtitles',
        'subtitleEnabled', 
        'subtitleSettings'
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
      
      if (result.subtitleSettings) {
        this.settings = { ...this.settings, ...result.subtitleSettings };
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
    'Layer Test: Should appear BELOW YouTube controls', 
    '层级测试：应显示在YouTube控制栏下方'
  );
  
  // 检查z-index设置
  const zIndex = instance.overlayElement?.style.zIndex;
  console.log('🎯 字幕层级设置:', {
    zIndex: zIndex,
    位置类型: instance.overlayElement?.style.position,
    显示状态: instance.overlayElement?.style.display
  });
  
  // 检查进度条等控件的z-index（用于对比）
  const progressBar = document.querySelector('.ytp-progress-bar');
  const controls = document.querySelector('.ytp-chrome-bottom');
  
  if (progressBar || controls) {
    console.log('🎮 YouTube控件层级对比:', {
      进度条zIndex: progressBar ? window.getComputedStyle(progressBar).zIndex : '未找到',
      控制栏zIndex: controls ? window.getComputedStyle(controls).zIndex : '未找到'
    });
  }
  
  console.log('✅ 字幕已显示，请检查是否在进度条下方');
  
  // 5秒后隐藏测试字幕
  setTimeout(() => {
    if (!instance.currentVideo || !instance.englishSubtitles.length) {
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