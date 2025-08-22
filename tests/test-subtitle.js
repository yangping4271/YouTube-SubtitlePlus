// 改进的YouTube字幕显示类
class ImprovedYouTubeSubtitle {
  constructor() {
    this.subtitleElement = null;
    this.testMode = true; // 开启测试模式
    this.init();
  }

  init() {
    this.createSubtitleElement();
    this.insertToPage();
    this.startTest();
  }

  createSubtitleElement() {
    this.subtitleElement = document.createElement('div');
    this.subtitleElement.id = 'improved-youtube-subtitle';
    
    // 使用最强力的样式设置
    this.subtitleElement.style.cssText = `
      position: fixed !important;
      bottom: 10% !important;
      left: 50% !important;
      transform: translateX(-50%) !important;
      z-index: 2147483647 !important;
      background: rgba(0, 0, 0, 0.9) !important;
      color: white !important;
      font-family: Arial, sans-serif !important;
      font-size: 18px !important;
      font-weight: bold !important;
      padding: 12px 24px !important;
      border-radius: 8px !important;
      text-align: center !important;
      max-width: 80% !important;
      word-wrap: break-word !important;
      pointer-events: none !important;
      display: block !important;
      visibility: visible !important;
      opacity: 1 !important;
      border: 2px solid rgba(255, 255, 255, 0.3) !important;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5) !important;
      text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.8) !important;
    `;
    
    this.subtitleElement.textContent = '字幕测试 - 改进版本';
  }

  insertToPage() {
    // 确保移除旧的元素
    const existing = document.getElementById('improved-youtube-subtitle');
    if (existing) existing.remove();
    
    // 插入到body的最后
    document.body.appendChild(this.subtitleElement);
    
    console.log('改进版字幕元素已插入');
    
    // 检查元素是否真的在DOM中
    const inserted = document.getElementById('improved-youtube-subtitle');
    console.log('元素在DOM中:', !!inserted);
    
    if (inserted) {
      const rect = inserted.getBoundingClientRect();
      console.log('元素位置:', rect);
      console.log('元素可见:', rect.width > 0 && rect.height > 0);
    }
  }

  startTest() {
    let counter = 0;
    const interval = setInterval(() => {
      counter++;
      this.subtitleElement.textContent = `测试字幕 ${counter} - 如果看到说明显示正常`;
      
      if (counter >= 10) {
        clearInterval(interval);
        this.subtitleElement.textContent = '测试完成 - 字幕功能正常工作';
        setTimeout(() => {
          this.subtitleElement.style.display = 'none';
        }, 3000);
      }
    }, 1000);
  }
}

// 在YouTube页面控制台运行这个测试
const test = new ImprovedYouTubeSubtitle();