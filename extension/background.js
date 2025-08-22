// Background Service Worker for YouTube Subtitle Extension

class SubtitleExtensionBackground {
  constructor() {
    this.init();
  }

  init() {
    // 监听扩展安装
    chrome.runtime.onInstalled.addListener((details) => {
      if (details.reason === 'install') {
        this.onInstall();
      } else if (details.reason === 'update') {
        this.onUpdate();
      }
    });

    // 监听来自content script和popup的消息
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      this.handleMessage(request, sender, sendResponse);
      return true; // 保持消息通道打开
    });

    // 监听标签页更新
    chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
      if (changeInfo.status === 'complete' && this.isYouTubePage(tab.url)) {
        this.onYouTubePageLoaded(tabId);
      }
    });
  }

  onInstall() {
    console.log('YouTube字幕扩展已安装');
    
    // 清除可能存在的旧数据，设置默认配置
    chrome.storage.local.clear().then(() => {
      chrome.storage.local.set({
        subtitleEnabled: false,
        subtitleData: [],
        englishSubtitles: [],
        chineseSubtitles: [],
        englishFileName: '',
        chineseFileName: '',
        subtitleSettings: {
          fontSize: 18,
          fontColor: '#ffffff',
          backgroundColor: 'rgba(0,0,0,0.7)',
          position: 'bottom',
          theme: 'dark'
        }
      });
      console.log('默认设置已初始化');
    });
  }

  onUpdate() {
    console.log('YouTube字幕扩展已更新');
  }

  async handleMessage(request, sender, sendResponse) {
    try {
      switch (request.action) {
        case 'getSubtitleData':
          const data = await this.getSubtitleData();
          sendResponse({ success: true, data });
          break;
          
        case 'getBilingualSubtitleData':
          const bilingualData = await this.getBilingualSubtitleData();
          sendResponse({ success: true, data: bilingualData });
          break;

        case 'saveSubtitleData':
          await this.saveSubtitleData(request.data);
          await this.notifyContentScript('loadSubtitle', { subtitleData: request.data });
          sendResponse({ success: true });
          break;
          
        case 'saveBilingualSubtitles':
          await this.saveBilingualSubtitles(
            request.englishSubtitles,
            request.chineseSubtitles,
            request.englishFileName,
            request.chineseFileName
          );
          await this.notifyContentScript('loadBilingualSubtitles', { 
            englishSubtitles: request.englishSubtitles,
            chineseSubtitles: request.chineseSubtitles
          });
          sendResponse({ success: true });
          break;

        case 'toggleSubtitle':
          await this.toggleSubtitle(request.enabled);
          sendResponse({ success: true });
          break;

        case 'updateSettings':
          await this.updateSettings(request.settings);
          sendResponse({ success: true });
          break;

        case 'clearSubtitleData':
          await this.clearSubtitleData();
          sendResponse({ success: true });
          break;

        default:
          sendResponse({ success: false, error: '未知操作' });
      }
    } catch (error) {
      console.error('处理消息时出错:', error);
      sendResponse({ success: false, error: error.message });
    }
  }

  async getBilingualSubtitleData() {
    const result = await chrome.storage.local.get([
      'subtitleData',
      'englishSubtitles',
      'chineseSubtitles',
      'subtitleEnabled', 
      'subtitleSettings',
      'englishFileName',
      'chineseFileName'
    ]);
    return {
      subtitleData: result.subtitleData || [],
      englishSubtitles: result.englishSubtitles || [],
      chineseSubtitles: result.chineseSubtitles || [],
      subtitleEnabled: result.subtitleEnabled || false,
      subtitleSettings: result.subtitleSettings || {},
      englishFileName: result.englishFileName || '',
      chineseFileName: result.chineseFileName || ''
    };
  }

  async getSubtitleData() {
    const result = await chrome.storage.local.get([
      'subtitleData', 
      'subtitleEnabled', 
      'subtitleSettings'
    ]);
    return {
      subtitleData: result.subtitleData || [],
      subtitleEnabled: result.subtitleEnabled || false,
      subtitleSettings: result.subtitleSettings || {}
    };
  }

  async saveBilingualSubtitles(englishSubtitles, chineseSubtitles, englishFileName, chineseFileName) {
    await chrome.storage.local.set({ 
      englishSubtitles: englishSubtitles || [],
      chineseSubtitles: chineseSubtitles || [],
      englishFileName: englishFileName || '',
      chineseFileName: chineseFileName || ''
    });
    console.log('双语字幕数据已保存:', {
      英文: englishSubtitles?.length || 0,
      中文: chineseSubtitles?.length || 0
    });
  }

  async saveSubtitleData(data) {
    await chrome.storage.local.set({ subtitleData: data });
    console.log('字幕数据已保存:', data.length, '条');
  }

  async toggleSubtitle(enabled) {
    await chrome.storage.local.set({ subtitleEnabled: enabled });
    await this.notifyContentScript('toggleSubtitle', { enabled });
    console.log('字幕显示已', enabled ? '开启' : '关闭');
  }

  async updateSettings(settings) {
    const currentSettings = await chrome.storage.local.get(['subtitleSettings']);
    const newSettings = {
      ...(currentSettings.subtitleSettings || {}),
      ...settings
    };
    
    await chrome.storage.local.set({ subtitleSettings: newSettings });
    await this.notifyContentScript('updateSettings', { settings: newSettings });
    console.log('设置已更新:', newSettings);
  }

  async clearSubtitleData() {
    await chrome.storage.local.set({ 
      subtitleData: [],
      englishSubtitles: [],
      chineseSubtitles: [],
      englishFileName: '',
      chineseFileName: '',
      subtitleEnabled: false
    });
    await this.notifyContentScript('clearData');
    console.log('字幕数据已清除');
  }

  async notifyContentScript(action, data = {}) {
    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      const currentTab = tabs[0];
      
      if (currentTab && this.isYouTubePage(currentTab.url)) {
        await chrome.tabs.sendMessage(currentTab.id, {
          action,
          ...data
        });
      }
    } catch (error) {
      console.error('向content script发送消息失败:', error);
    }
  }

  isYouTubePage(url) {
    return url && (url.includes('youtube.com/watch') || url.includes('youtu.be/'));
  }

  onYouTubePageLoaded(tabId) {
    // YouTube页面加载完成后，可以进行一些初始化操作
    console.log('YouTube页面已加载:', tabId);
  }
}

// 初始化background服务
const backgroundService = new SubtitleExtensionBackground();

// 处理文件读取相关的工具函数
class FileUtils {
  static readFileAsText(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = (e) => reject(new Error('文件读取失败'));
      reader.readAsText(file, 'UTF-8');
    });
  }

  static getFileExtension(filename) {
    return filename.split('.').pop().toLowerCase();
  }

  static validateSubtitleFile(file) {
    const validExtensions = ['srt', 'vtt', 'ass', 'ssa'];
    const extension = this.getFileExtension(file.name);
    return validExtensions.includes(extension);
  }
}

// 导出工具函数供其他脚本使用
self.FileUtils = FileUtils;