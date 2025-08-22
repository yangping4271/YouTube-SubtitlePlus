class YouTubeSubtitleOverlay {
  constructor() {
    this.subtitleData = [];
    this.currentVideo = null;
    this.overlayElement = null;
    this.isEnabled = false;
    this.settings = {
      fontSize: 20,
      color: '#ffffff',
      backgroundColor: 'rgba(0,0,0,0.8)',
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
    this.applyStyles();
    console.log('字幕容器已创建');
  }

  applyStyles() {
    const styles = {
      position: 'fixed',
      zIndex: '2147483647',
      display: 'none',
      maxWidth: '80%',
      padding: '8px 16px',
      borderRadius: '4px',
      textAlign: 'center',
      whiteSpace: 'pre-wrap',
      wordWrap: 'break-word',
      pointerEvents: 'none',
      userSelect: 'none',
      // 字体样式
      fontFamily: 'Arial, sans-serif',
      fontSize: this.settings.fontSize + 'px',
      fontWeight: 'bold',
      color: this.settings.color,
      lineHeight: '1.3',
      // 视觉效果
      background: this.settings.backgroundColor,
      textShadow: '0 0 2px rgba(0,0,0,0.7), 0 2px 4px rgba(0,0,0,0.7)',
      boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
      border: '1px solid rgba(255,255,255,0.2)'
    };

    Object.assign(this.overlayElement.style, styles);
    
    // 初始定位
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
      if (this.isEnabled && this.subtitleData.length > 0) {
        this.updateSubtitle();
      }
    };
    
    this.currentVideo.addEventListener('timeupdate', this.onTimeUpdate);
    console.log('字幕监听器已绑定');
  }

  setupResizeListener() {
    // 断开之前的监听器
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
    
    // 视频尺寸变化监听
    this.resizeObserver = new ResizeObserver(() => {
      if (this.overlayElement && this.isEnabled) {
        this.repositionSubtitle();
      }
    });
    
    // 页面滚动监听
    this.scrollListener = () => {
      if (this.overlayElement && this.isEnabled) {
        this.repositionSubtitle();
      }
    };
    
    // 全屏状态变化监听
    this.fullscreenListener = () => {
      setTimeout(() => {
        if (this.overlayElement && this.isEnabled) {
          this.repositionSubtitle();
        }
      }, 100); // 延迟确保全屏动画完成
    };
    
    // 窗口大小变化监听
    this.resizeWindowListener = () => {
      if (this.overlayElement && this.isEnabled) {
        this.repositionSubtitle();
      }
    };
    
    // YouTube页面状态变化监听（剧场模式等）
    this.setupYouTubeStateListener();
    
    // 绑定监听器
    if (this.currentVideo) {
      this.resizeObserver.observe(this.currentVideo);
    }
    window.addEventListener('scroll', this.scrollListener, { passive: true });
    document.addEventListener('fullscreenchange', this.fullscreenListener);
    window.addEventListener('resize', this.resizeWindowListener, { passive: true });
    
    console.log('动态定位监听器已设置');
  }

  setupYouTubeStateListener() {
    // 监听YouTube播放器状态变化
    if (this.youtubeStateObserver) {
      this.youtubeStateObserver.disconnect();
    }
    
    this.youtubeStateObserver = new MutationObserver((mutations) => {
      let needsReposition = false;
      
      mutations.forEach((mutation) => {
        // 检测剧场模式切换
        if (mutation.type === 'attributes' && 
            (mutation.attributeName === 'class' || mutation.attributeName === 'theater')) {
          needsReposition = true;
        }
        
        // 检测DOM结构变化
        if (mutation.type === 'childList') {
          needsReposition = true;
        }
      });
      
      if (needsReposition && this.overlayElement && this.isEnabled) {
        setTimeout(() => this.repositionSubtitle(), 200);
      }
    });
    
    // 监听主要的YouTube容器
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
    
    // 获取视频播放器的位置和尺寸
    const videoRect = this.currentVideo.getBoundingClientRect();
    const isFullscreen = document.fullscreenElement !== null;
    const isTheaterMode = document.querySelector('.ytp-size-large') !== null;
    const isMiniPlayer = document.querySelector('.ytp-miniplayer-active') !== null;
    
    if (isFullscreen) {
      // 全屏模式：使用fixed定位，相对于屏幕
      this.overlayElement.style.position = 'fixed';
      this.overlayElement.style.left = '50%';
      this.overlayElement.style.transform = 'translateX(-50%)';
      this.overlayElement.style.bottom = '8%';
      this.overlayElement.style.top = 'auto';
      this.overlayElement.style.maxWidth = '80%';
      this.overlayElement.style.fontSize = (this.settings.fontSize * 1.2) + 'px';
    } else if (isMiniPlayer) {
      // 迷你播放器：隐藏字幕
      this.overlayElement.style.display = 'none';
      return;
    } else {
      // 非全屏模式：相对于视频播放器定位
      this.overlayElement.style.position = 'fixed';
      this.overlayElement.style.left = videoRect.left + videoRect.width / 2 + 'px';
      this.overlayElement.style.transform = 'translateX(-50%)';
      
      // 根据模式调整位置
      let bottomOffset = 20;
      let fontSize = this.settings.fontSize;
      
      if (isTheaterMode) {
        bottomOffset = 40;
        fontSize = this.settings.fontSize * 1.1;
      }
      
      this.overlayElement.style.bottom = (window.innerHeight - videoRect.bottom + bottomOffset) + 'px';
      this.overlayElement.style.top = 'auto';
      this.overlayElement.style.fontSize = fontSize + 'px';
      
      // 限制字幕最大宽度不超过视频宽度的90%
      this.overlayElement.style.maxWidth = Math.min(videoRect.width * 0.9, 800) + 'px';
    }
    
    console.log('字幕位置已调整:', {
      fullscreen: isFullscreen,
      theater: isTheaterMode,
      mini: isMiniPlayer,
      videoRect: {
        width: Math.round(videoRect.width),
        height: Math.round(videoRect.height),
        bottom: Math.round(videoRect.bottom)
      }
    });
  }

  insertOverlayToPage() {
    const existingOverlay = document.getElementById('youtube-local-subtitle-overlay');
    if (existingOverlay) {
      existingOverlay.remove();
    }
    
    // 优先插入到播放器容器，保证层级关系
    const playerContainer = document.querySelector('#movie_player') || 
                           document.querySelector('.html5-video-container') ||
                           document.body;
    
    playerContainer.appendChild(this.overlayElement);
    console.log('字幕容器已插入到页面');
  }

  updateSubtitle() {
    if (!this.currentVideo || !this.isEnabled || !this.overlayElement) return;
    
    const currentTime = this.currentVideo.currentTime;
    const currentSubtitle = this.findCurrentSubtitle(currentTime);
    
    if (currentSubtitle) {
      this.showSubtitle(currentSubtitle.text);
    } else {
      this.hideSubtitle();
    }
  }

  showSubtitle(text) {
    this.overlayElement.textContent = text;
    this.overlayElement.style.display = 'block';
    
    // 确保样式正确应用（解决被覆盖的问题）
    this.overlayElement.style.position = 'fixed';
    this.overlayElement.style.zIndex = '2147483647';
    this.overlayElement.style.visibility = 'visible';
    this.overlayElement.style.opacity = '1';
    
    // 更新位置
    this.repositionSubtitle();
  }

  hideSubtitle() {
    this.overlayElement.style.display = 'none';
  }

  findCurrentSubtitle(currentTime) {
    return this.subtitleData.find(subtitle => 
      currentTime >= subtitle.startTime && currentTime <= subtitle.endTime
    );
  }

  toggleSubtitle(enabled) {
    this.isEnabled = enabled;
    console.log('字幕显示:', enabled ? '开启' : '关闭');
    
    if (!enabled) {
      this.hideSubtitle();
    } else if (this.subtitleData.length > 0) {
      this.testSubtitleDisplay();
    }
  }

  testSubtitleDisplay() {
    if (!this.overlayElement) return;
    
    this.overlayElement.textContent = '✅ 字幕功能正常 - 3秒后消失';
    this.overlayElement.style.display = 'block';
    
    setTimeout(() => {
      if (!this.isEnabled || !this.currentVideo) {
        this.hideSubtitle();
      }
    }, 3000);
  }

  loadNewSubtitle(subtitleData) {
    this.subtitleData = subtitleData;
    console.log('已加载字幕数据:', subtitleData.length, '条');
  }

  clearSubtitleData() {
    this.subtitleData = [];
    this.isEnabled = false;
    this.hideSubtitle();
    console.log('字幕数据已清除');
  }

  updateSettings(settings) {
    this.settings = { ...this.settings, ...settings };
    this.applyStyles();
    console.log('字幕设置已更新');
  }

  async loadSubtitleData() {
    try {
      const result = await chrome.storage.local.get([
        'subtitleData', 
        'subtitleEnabled', 
        'subtitleSettings'
      ]);
      
      if (result.subtitleData && result.subtitleData.length > 0) {
        this.subtitleData = result.subtitleData;
        console.log('已加载字幕数据:', this.subtitleData.length, '条');
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

// 字幕位置测试工具
window.testSubtitlePositioning = () => {
  if (!subtitleOverlayInstance) {
    console.log('❌ 字幕实例不存在');
    return false;
  }

  const instance = subtitleOverlayInstance;
  console.log('🧪 开始字幕位置测试...');
  
  // 强制启用字幕
  instance.isEnabled = true;
  
  // 获取当前状态
  const videoRect = instance.currentVideo?.getBoundingClientRect();
  const isFullscreen = document.fullscreenElement !== null;
  const isTheaterMode = document.querySelector('.ytp-size-large') !== null;
  const isMiniPlayer = document.querySelector('.ytp-miniplayer-active') !== null;
  
  console.log('📊 当前页面状态:', {
    全屏模式: isFullscreen,
    剧场模式: isTheaterMode,
    迷你播放器: isMiniPlayer,
    视频尺寸: videoRect ? {
      宽度: Math.round(videoRect.width),
      高度: Math.round(videoRect.height),
      顶部: Math.round(videoRect.top),
      底部: Math.round(videoRect.bottom)
    } : '未找到视频'
  });
  
  // 测试字幕显示
  instance.showSubtitle('📍 测试字幕 - 位置动态调整\n当前模式: ' + 
    (isFullscreen ? '全屏' : isTheaterMode ? '剧场' : isMiniPlayer ? '迷你' : '普通'));
  
  // 5秒后恢复正常
  setTimeout(() => {
    if (!instance.isEnabled || !instance.currentVideo) {
      instance.hideSubtitle();
    }
    console.log('✅ 字幕位置测试完成');
  }, 5000);
  
  return true;
};