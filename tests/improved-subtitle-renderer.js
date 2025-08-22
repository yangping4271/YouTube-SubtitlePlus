// 参考开源项目的YouTube字幕显示实现
class YouTubeSubtitleRenderer {
  constructor() {
    this.container = null;
    this.subtitles = [];
    this.currentVideo = null;
    this.enabled = false;
    this.settings = {
      fontSize: 20,
      color: '#ffffff',
      backgroundColor: 'rgba(0,0,0,0.8)',
      position: 'bottom'
    };
  }

  // 1. 使用YouTube原生字幕容器的位置策略
  findOptimalPosition() {
    // 查找YouTube原生字幕容器作为参考
    const nativeSubtitle = document.querySelector('.ytp-caption-window-container') ||
                          document.querySelector('.captions-text') ||
                          document.querySelector('[class*="caption"]');
    
    if (nativeSubtitle) {
      const rect = nativeSubtitle.getBoundingClientRect();
      console.log('找到原生字幕容器，位置:', rect);
      return {
        bottom: window.innerHeight - rect.top + 10,
        strategy: 'native-reference'
      };
    }
    
    // 备选策略：相对于视频元素定位
    const video = document.querySelector('video');
    if (video) {
      const rect = video.getBoundingClientRect();
      return {
        bottom: window.innerHeight - rect.bottom + 60,
        strategy: 'video-reference'
      };
    }
    
    // 最后策略：固定位置
    return {
      bottom: 100,
      strategy: 'fixed'
    };
  }

  // 2. 创建字幕容器 - 模仿YouTube的做法
  createSubtitleContainer() {
    this.container = document.createElement('div');
    this.container.id = 'external-subtitle-container';
    
    const position = this.findOptimalPosition();
    
    // 使用类似YouTube原生字幕的样式
    const styles = {
      position: 'fixed',
      left: '50%',
      transform: 'translateX(-50%)',
      bottom: position.bottom + 'px',
      zIndex: '2000', // 不要设置太高，可能被其他元素遮挡
      fontFamily: 'Roboto, Arial, sans-serif',
      fontSize: this.settings.fontSize + 'px',
      fontWeight: '400',
      color: this.settings.color,
      textAlign: 'center',
      maxWidth: '80%',
      lineHeight: '1.3',
      textShadow: '0 0 2px rgba(0,0,0,0.5), 0 2px 6px rgba(0,0,0,0.5)',
      pointerEvents: 'none',
      userSelect: 'none',
      display: 'none'
    };

    // 应用样式
    Object.assign(this.container.style, styles);
    
    console.log('字幕容器创建，策略:', position.strategy);
    return this.container;
  }

  // 3. 创建单个字幕元素
  createSubtitleElement(text) {
    const element = document.createElement('div');
    element.style.cssText = `
      background: ${this.settings.backgroundColor};
      padding: 6px 12px;
      border-radius: 4px;
      margin: 2px 0;
      white-space: pre-wrap;
      word-wrap: break-word;
    `;
    element.textContent = text;
    return element;
  }

  // 4. 插入到页面 - 使用多种策略
  insertToPage() {
    // 策略1：插入到播放器容器内
    let targetContainer = document.querySelector('#movie_player');
    if (targetContainer) {
      targetContainer.appendChild(this.container);
      console.log('字幕插入到播放器容器');
      return true;
    }

    // 策略2：插入到视频容器
    targetContainer = document.querySelector('.html5-video-container');
    if (targetContainer) {
      targetContainer.appendChild(this.container);
      console.log('字幕插入到视频容器');
      return true;
    }

    // 策略3：插入到body（最后策略）
    document.body.appendChild(this.container);
    console.log('字幕插入到body');
    return true;
  }

  // 5. 显示字幕
  showSubtitle(text) {
    if (!this.container || !this.enabled) return;

    // 清空当前内容
    this.container.innerHTML = '';
    
    // 创建新字幕元素
    const subtitleElement = this.createSubtitleElement(text);
    this.container.appendChild(subtitleElement);
    
    // 显示容器
    this.container.style.display = 'block';
    
    // 重新定位（应对页面布局变化）
    const position = this.findOptimalPosition();
    this.container.style.bottom = position.bottom + 'px';
  }

  // 6. 隐藏字幕
  hideSubtitle() {
    if (this.container) {
      this.container.style.display = 'none';
    }
  }

  // 7. 初始化
  init() {
    this.createSubtitleContainer();
    this.insertToPage();
    
    // 监听页面变化，重新定位
    const resizeObserver = new ResizeObserver(() => {
      if (this.container && this.enabled) {
        const position = this.findOptimalPosition();
        this.container.style.bottom = position.bottom + 'px';
      }
    });
    
    const video = document.querySelector('video');
    if (video) {
      resizeObserver.observe(video);
    }
    
    console.log('YouTube字幕渲染器初始化完成');
  }

  // 8. 设置字幕数据
  setSubtitles(subtitleData) {
    this.subtitles = subtitleData;
    console.log('设置字幕数据:', subtitleData.length, '条');
  }

  // 9. 启用/禁用
  setEnabled(enabled) {
    this.enabled = enabled;
    if (!enabled) {
      this.hideSubtitle();
    }
    console.log('字幕显示:', enabled ? '启用' : '禁用');
  }

  // 10. 根据时间更新字幕
  updateByTime(currentTime) {
    if (!this.enabled || !this.subtitles.length) return;

    const currentSubtitle = this.subtitles.find(sub => 
      currentTime >= sub.startTime && currentTime <= sub.endTime
    );

    if (currentSubtitle) {
      this.showSubtitle(currentSubtitle.text);
    } else {
      this.hideSubtitle();
    }
  }
}

// 测试使用
window.testSubtitleRenderer = function() {
  const renderer = new YouTubeSubtitleRenderer();
  renderer.init();
  renderer.setEnabled(true);
  
  // 测试显示
  renderer.showSubtitle('这是一个测试字幕\n检查是否能正确显示');
  
  setTimeout(() => {
    renderer.hideSubtitle();
  }, 5000);
  
  return renderer;
};