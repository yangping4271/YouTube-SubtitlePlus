// Background Service Worker for YouTube Subtitle Extension

// 导入统一配置中心
importScripts('config.js');

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
        // 英文和中文字幕独立设置（从统一配置中心加载）
        englishSettings: getDefaultEnglishSettings(),  // Popup 和 background 不需要完全透明背景
        chineseSettings: getDefaultChineseSettings(),
        // 自动加载设置
        autoLoadEnabled: false,
        serverUrl: 'http://127.0.0.1:8888'
      });
      console.log('默认双语独立设置已初始化 - 32px基础字体');
    });
  }

  onUpdate() {
    console.log('YouTube字幕扩展已更新');

    // 迁移修复：确保“标准预设”下英文字体为 Noto Serif 而非系统默认
    // 针对老版本可能将 fontFamily 设为 'inherit' 或未设置的情况
    chrome.storage.local.get(['englishSettings']).then((res) => {
      const english = res.englishSettings || {};
      const needsFix = !english.fontFamily || english.fontFamily === 'inherit';
      if (needsFix) {
        const fixed = {
          ...english,
          fontFamily: '"Noto Serif", Georgia, serif'
        };
        chrome.storage.local.set({ englishSettings: fixed }).then(() => {
          console.log('迁移修复：已将英文字体设为 Noto Serif（标准预设）');
          // 同步通知 content script 更新样式
          try {
            this.notifyContentScript('updateSettings', { language: 'english', settings: fixed });
          } catch (e) {
            // 忽略通知错误，用户打开页面后会自动同步
          }
        });
      }
    });
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

        case 'saveVideoSubtitles':
          await this.saveVideoSubtitles(
            request.videoId,
            request.englishSubtitles,
            request.chineseSubtitles,
            request.subtitleData,
            request.englishFileName,
            request.chineseFileName,
            request.fileName
          );
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
          
        case 'forceReset':
          await this.forceReset();
          sendResponse({ success: true });
          break;
          
        case 'setSubtitleEnabled':
          await this.setSubtitleEnabled(request.enabled);
          sendResponse({ success: true });
          break;

        // 🔧 新增：处理来自content script的自动加载消息并转发给popup
        case 'autoLoadSuccess':
          console.log('🎉 Background收到自动加载成功消息:', request);
          // 不需要sendResponse，这是来自content script的通知消息
          // 消息会自动转发给所有监听的popup
          break;
          
        case 'autoLoadError':  
          console.log('❌ Background收到自动加载失败消息:', request);
          // 不需要sendResponse，这是来自content script的通知消息
          // 消息会自动转发给所有监听的popup
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
      'englishSettings',
      'chineseSettings',
      'englishFileName',
      'chineseFileName'
    ]);
    return {
      subtitleData: result.subtitleData || [],
      englishSubtitles: result.englishSubtitles || [],
      chineseSubtitles: result.chineseSubtitles || [],
      subtitleEnabled: result.subtitleEnabled || false,
      englishSettings: result.englishSettings || {},
      chineseSettings: result.chineseSettings || {},
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

  async saveVideoSubtitles(videoId, englishSubtitles, chineseSubtitles, subtitleData, englishFileName, chineseFileName, fileName) {
    if (!videoId) {
      console.error('❌ 保存字幕失败: 缺少视频ID');
      return;
    }

    const subtitleKey = `videoSubtitles_${videoId}`;
    const videoSubtitleData = {
      videoId: videoId,
      timestamp: new Date().toISOString()
    };

    // 添加双语字幕数据
    if (englishSubtitles || chineseSubtitles) {
      videoSubtitleData.englishSubtitles = englishSubtitles || [];
      videoSubtitleData.chineseSubtitles = chineseSubtitles || [];
      videoSubtitleData.englishFileName = englishFileName || '';
      videoSubtitleData.chineseFileName = chineseFileName || '';
    }

    // 添加单语字幕数据
    if (subtitleData) {
      videoSubtitleData.subtitleData = subtitleData;
      videoSubtitleData.fileName = fileName || '';
    }

    await chrome.storage.local.set({ [subtitleKey]: videoSubtitleData });
    console.log('视频字幕数据已保存 (' + videoId + '):', {
      英文: (englishSubtitles || []).length,
      中文: (chineseSubtitles || []).length,
      单语: (subtitleData || []).length
    });
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
  
  async setSubtitleEnabled(enabled) {
    await chrome.storage.local.set({ subtitleEnabled: enabled });
    console.log('字幕状态已设置为:', enabled ? '启用' : '禁用');
  }

  async updateSettings(settings) {
    console.log('=== background updateSettings 调试 ===');
    console.log('接收到的 settings 参数:', settings);
    
    // 根据设置类型更新对应的语言设置
    if (settings.language === 'english') {
      const currentSettings = await chrome.storage.local.get(['englishSettings']);
      console.log('英文当前存储设置:', currentSettings.englishSettings);
      const newSettings = {
        ...(currentSettings.englishSettings || {}),
        ...settings.data
      };
      console.log('英文合并后设置:', newSettings);
      
      await chrome.storage.local.set({ englishSettings: newSettings });
      await this.notifyContentScript('updateSettings', { 
        language: 'english', 
        settings: newSettings 
      });
      console.log('英文字幕设置已更新:', newSettings);
    } else if (settings.language === 'chinese') {
      const currentSettings = await chrome.storage.local.get(['chineseSettings']);
      console.log('中文当前存储设置:', currentSettings.chineseSettings);
      console.log('要更新的数据 settings.data:', settings.data);
      const newSettings = {
        ...(currentSettings.chineseSettings || {}),
        ...settings.data
      };
      console.log('中文合并后设置:', newSettings);
      
      await chrome.storage.local.set({ chineseSettings: newSettings });
      await this.notifyContentScript('updateSettings', { 
        language: 'chinese', 
        settings: newSettings 
      });
      console.log('中文字幕设置已更新:', newSettings);
    }
  }

  async clearSubtitleData() {
    // 获取所有存储的键，清除视频级别缓存
    const allData = await chrome.storage.local.get(null);
    const videoSubtitleKeys = Object.keys(allData).filter(key => key.startsWith('videoSubtitles_'));
    
    // 清除全局字幕数据
    await chrome.storage.local.set({ 
      subtitleData: [],
      englishSubtitles: [],
      chineseSubtitles: [],
      englishFileName: '',
      chineseFileName: ''
      // 注意：不再设置 subtitleEnabled: false，让用户手动控制开关状态
    });
    
    // 清除所有视频级别的字幕缓存
    if (videoSubtitleKeys.length > 0) {
      await chrome.storage.local.remove(videoSubtitleKeys);
      console.log(`🧹 已清除 ${videoSubtitleKeys.length} 个视频缓存:`, videoSubtitleKeys);
    }
    
    await this.notifyContentScript('clearData');
    console.log('✅ 字幕数据和所有缓存已彻底清除，开关状态保持不变');
  }

  // 新增：强制重置所有扩展数据
  async forceReset() {
    console.log('🔄 执行强制重置...');
    
    // 完全清除所有存储数据
    await chrome.storage.local.clear();
    
    // 重新初始化默认设置（复用安装时的逻辑）
    await chrome.storage.local.set({
      subtitleEnabled: false,
      subtitleData: [],
      englishSubtitles: [],
      chineseSubtitles: [],
      englishFileName: '',
      chineseFileName: '',
      // 英文和中文字幕独立设置（从统一配置中心加载）
      englishSettings: getDefaultEnglishSettings(),
      chineseSettings: getDefaultChineseSettings(),
      // 自动加载设置
      autoLoadEnabled: false,
      serverUrl: 'http://127.0.0.1:8888'
    });
    
    // 通知content script强制清除
    await this.notifyContentScript('forceReset');
    console.log('🎉 强制重置完成，所有数据已重置为默认状态');
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
