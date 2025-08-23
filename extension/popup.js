class PopupController {
  constructor() {
    this.subtitleData = [];
    this.englishSubtitles = [];
    this.chineseSubtitles = [];
    this.currentFileName = '';
    this.englishFileName = '';
    this.chineseFileName = '';
    this.init();
  }

  init() {
    this.bindEvents();
    this.loadCurrentState();
  }

  bindEvents() {
    // 字幕开关
    const subtitleToggle = document.getElementById('subtitleToggle');
    subtitleToggle.addEventListener('change', (e) => {
      this.toggleSubtitle(e.target.checked);
    });

    // 英文字幕上传
    this.bindFileUploadEvents('english', 'englishUploadArea', 'englishFileInput', 'englishBrowseButton');
    
    // 中文字幕上传  
    this.bindFileUploadEvents('chinese', 'chineseUploadArea', 'chineseFileInput', 'chineseBrowseButton');

    // 清除按钮
    const clearButton = document.getElementById('clearButton');
    clearButton.addEventListener('click', () => this.clearSubtitle());

    // 设置面板
    const settingsToggle = document.getElementById('settingsToggle');
    const settingsPanel = document.getElementById('settingsPanel');
    
    settingsToggle.addEventListener('click', () => {
      const isActive = settingsToggle.classList.contains('active');
      if (isActive) {
        settingsToggle.classList.remove('active');
        settingsPanel.classList.remove('active');
      } else {
        settingsToggle.classList.add('active');
        settingsPanel.classList.add('active');
      }
    });

    // 设置控件
    this.bindSettingsEvents();

    // 帮助链接
    document.getElementById('helpLink').addEventListener('click', (e) => {
      e.preventDefault();
      this.showHelp();
    });

    document.getElementById('feedbackLink').addEventListener('click', (e) => {
      e.preventDefault();
      this.showFeedback();
    });
  }

  bindFileUploadEvents(language, uploadAreaId, fileInputId, browseButtonId) {
    const uploadArea = document.getElementById(uploadAreaId);
    const fileInput = document.getElementById(fileInputId);
    const browseButton = document.getElementById(browseButtonId);

    uploadArea.addEventListener('click', () => fileInput.click());
    browseButton.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', (e) => this.handleFileSelect(e, language));

    // 拖拽上传
    uploadArea.addEventListener('dragover', (e) => {
      e.preventDefault();
      uploadArea.classList.add('dragover');
    });

    uploadArea.addEventListener('dragleave', () => {
      uploadArea.classList.remove('dragover');
    });

    uploadArea.addEventListener('drop', (e) => {
      e.preventDefault();
      uploadArea.classList.remove('dragover');
      const files = e.dataTransfer.files;
      if (files.length > 0) {
        this.processFile(files[0], language);
      }
    });
  }

  bindSettingsEvents() {
    // 预设配置
    const presets = {
      standard: { fontSize: 16, fontColor: '#ffffff', backgroundOpacity: 60, position: 'bottom' },
      large: { fontSize: 24, fontColor: '#ffffff', backgroundOpacity: 70, position: 'bottom' },
      contrast: { fontSize: 20, fontColor: '#ffff00', backgroundOpacity: 90, position: 'bottom' },
      cinema: { fontSize: 18, fontColor: '#ffffff', backgroundOpacity: 40, position: 'bottom' }
    };

    // 预设按钮事件
    document.querySelectorAll('.preset-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const presetName = btn.dataset.preset;
        const preset = presets[presetName];
        
        // 更新所有预设按钮状态
        document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        // 应用预设设置
        this.applyPreset(preset);
      });
    });

    // 字体大小
    const fontSize = document.getElementById('fontSize');
    const fontSizeValue = document.getElementById('fontSizeValue');
    fontSize.addEventListener('input', (e) => {
      const value = parseInt(e.target.value);
      fontSizeValue.textContent = value + 'px';
      this.updatePreview({ fontSize: value });
      this.updateSettings({ fontSize: value });
    });

    // 字体颜色
    const fontColor = document.getElementById('fontColor');
    const colorName = document.getElementById('colorName');
    fontColor.addEventListener('change', (e) => {
      const color = e.target.value;
      colorName.textContent = this.getColorName(color);
      this.updatePreview({ fontColor: color });
      this.updateSettings({ fontColor: color });
    });

    // 背景透明度
    const bgOpacity = document.getElementById('bgOpacity');
    const bgOpacityValue = document.getElementById('bgOpacityValue');
    bgOpacity.addEventListener('input', (e) => {
      const value = parseInt(e.target.value);
      bgOpacityValue.textContent = value + '%';
      this.updatePreview({ backgroundOpacity: value });
      this.updateSettings({ backgroundOpacity: value });
    });

    // 字幕位置
    const subtitlePosition = document.getElementById('subtitlePosition');
    subtitlePosition.addEventListener('change', (e) => {
      this.updateSettings({ position: e.target.value });
    });

    // 重置按钮
    document.getElementById('resetSettings').addEventListener('click', () => {
      this.resetToDefault();
    });

    // 初始化预览
    this.initializePreview();
  }

  // 应用预设设置
  applyPreset(preset) {
    // 更新UI控件
    document.getElementById('fontSize').value = preset.fontSize;
    document.getElementById('fontSizeValue').textContent = preset.fontSize + 'px';
    document.getElementById('fontColor').value = preset.fontColor;
    document.getElementById('colorName').textContent = this.getColorName(preset.fontColor);
    document.getElementById('bgOpacity').value = preset.backgroundOpacity;
    document.getElementById('bgOpacityValue').textContent = preset.backgroundOpacity + '%';
    document.getElementById('subtitlePosition').value = preset.position;

    // 更新预览
    this.updatePreview(preset);
    
    // 保存设置
    this.updateSettings(preset);
    
    // 显示保存状态
    this.showSaveStatus();
  }

  // 更新预览区域
  updatePreview(settings = {}) {
    const previewContainer = document.querySelector('.preview-container');
    if (!previewContainer) return;

    // 更新CSS变量
    const fontSize = settings.fontSize || parseInt(document.getElementById('fontSize').value);
    const fontColor = settings.fontColor || document.getElementById('fontColor').value;
    const backgroundOpacity = settings.backgroundOpacity !== undefined ? 
      settings.backgroundOpacity : parseInt(document.getElementById('bgOpacity').value);

    previewContainer.style.setProperty('--preview-font-size', fontSize + 'px');
    previewContainer.style.setProperty('--preview-font-color', fontColor);
    previewContainer.style.setProperty('--preview-bg-color', `rgba(0, 0, 0, ${backgroundOpacity / 100})`);
  }

  // 初始化预览
  initializePreview() {
    // 设置初始值
    this.updatePreview();
  }

  // 获取颜色名称
  getColorName(color) {
    const colorNames = {
      '#ffffff': '白色',
      '#ffff00': '黄色',
      '#ff0000': '红色',
      '#00ff00': '绿色',
      '#0000ff': '蓝色',
      '#000000': '黑色',
      '#ffa500': '橙色',
      '#800080': '紫色'
    };
    return colorNames[color.toLowerCase()] || '自定义';
  }

  // 重置为默认设置
  resetToDefault() {
    const defaultSettings = { fontSize: 16, fontColor: '#ffffff', backgroundOpacity: 60, position: 'bottom' };
    
    // 移除所有预设按钮的active状态
    document.querySelectorAll('.preset-btn').forEach(btn => btn.classList.remove('active'));
    // 激活标准预设
    document.querySelector('[data-preset="standard"]').classList.add('active');
    
    this.applyPreset(defaultSettings);
  }

  // 显示保存状态提示
  showSaveStatus() {
    const saveStatus = document.getElementById('saveStatus');
    saveStatus.classList.add('show');
    setTimeout(() => {
      saveStatus.classList.remove('show');
    }, 2000);
  }

  async loadCurrentState() {
    try {
      const response = await chrome.runtime.sendMessage({ action: 'getBilingualSubtitleData' });
      if (response.success) {
        const { 
          subtitleData, 
          englishSubtitles, 
          chineseSubtitles, 
          subtitleEnabled, 
          subtitleSettings,
          englishFileName,
          chineseFileName
        } = response.data;
        
        // 更新UI状态
        document.getElementById('subtitleToggle').checked = subtitleEnabled;
        
        this.subtitleData = subtitleData || [];
        this.englishSubtitles = englishSubtitles || [];
        this.chineseSubtitles = chineseSubtitles || [];
        this.englishFileName = englishFileName || '';
        this.chineseFileName = chineseFileName || '';
        
        this.updateSubtitleInfo();
        
        // 更新设置UI
        if (subtitleSettings) {
          this.updateSettingsUI(subtitleSettings);
        }
      }
    } catch (error) {
      console.error('加载当前状态失败:', error);
      this.showStatus('加载设置失败', 'error');
    }
  }

  updateSettingsUI(settings) {
    if (settings.fontSize) {
      document.getElementById('fontSize').value = settings.fontSize;
      document.getElementById('fontSizeValue').textContent = settings.fontSize + 'px';
    }
    
    if (settings.fontColor) {
      document.getElementById('fontColor').value = settings.fontColor;
      document.getElementById('colorName').textContent = this.getColorName(settings.fontColor);
    }
    
    if (settings.backgroundOpacity !== undefined) {
      document.getElementById('bgOpacity').value = settings.backgroundOpacity;
      document.getElementById('bgOpacityValue').textContent = settings.backgroundOpacity + '%';
    }
    
    if (settings.position) {
      document.getElementById('subtitlePosition').value = settings.position;
    }

    // 更新预览
    this.updatePreview(settings);
    
    // 检查是否匹配某个预设，并高亮对应按钮
    this.checkAndHighlightPreset(settings);
  }

  // 检查并高亮匹配的预设
  checkAndHighlightPreset(settings) {
    const presets = {
      standard: { fontSize: 16, fontColor: '#ffffff', backgroundOpacity: 60, position: 'bottom' },
      large: { fontSize: 24, fontColor: '#ffffff', backgroundOpacity: 70, position: 'bottom' },
      contrast: { fontSize: 20, fontColor: '#ffff00', backgroundOpacity: 90, position: 'bottom' },
      cinema: { fontSize: 18, fontColor: '#ffffff', backgroundOpacity: 40, position: 'bottom' }
    };

    // 移除所有active状态
    document.querySelectorAll('.preset-btn').forEach(btn => btn.classList.remove('active'));

    // 检查是否匹配某个预设
    for (const [presetName, preset] of Object.entries(presets)) {
      if (this.settingsMatch(settings, preset)) {
        document.querySelector(`[data-preset="${presetName}"]`)?.classList.add('active');
        break;
      }
    }
  }

  // 检查设置是否匹配预设
  settingsMatch(settings, preset) {
    return settings.fontSize === preset.fontSize &&
           settings.fontColor === preset.fontColor &&
           settings.backgroundOpacity === preset.backgroundOpacity &&
           settings.position === preset.position;
  }

  async toggleSubtitle(enabled) {
    try {
      const response = await chrome.runtime.sendMessage({
        action: 'toggleSubtitle',
        enabled: enabled
      });
      
      if (response.success) {
        this.showStatus(enabled ? '字幕显示已开启' : '字幕显示已关闭', 'success');
      } else {
        throw new Error(response.error);
      }
    } catch (error) {
      console.error('切换字幕状态失败:', error);
      this.showStatus('操作失败: ' + error.message, 'error');
      // 恢复开关状态
      document.getElementById('subtitleToggle').checked = !enabled;
    }
  }

  handleFileSelect(event, language) {
    const file = event.target.files[0];
    if (file) {
      this.processFile(file, language);
    }
  }

  async processFile(file, language) {
    try {
      // 验证文件类型
      if (!this.isValidSubtitleFile(file)) {
        throw new Error('不支持的文件格式，请选择 SRT 或 VTT 文件');
      }

      this.showStatus(`正在解析${language === 'english' ? '英文' : '中文'}字幕文件...`, 'info');

      // 读取文件内容
      const content = await this.readFileAsText(file);
      
      // 解析字幕
      const subtitleData = this.parseSubtitle(content, file.name);
      
      if (subtitleData.length === 0) {
        throw new Error('字幕文件解析失败或文件为空');
      }

      // 保存字幕数据
      let response;
      if (language === 'english') {
        this.englishSubtitles = subtitleData;
        this.englishFileName = file.name;
        response = await chrome.runtime.sendMessage({
          action: 'saveBilingualSubtitles',
          englishSubtitles: this.englishSubtitles,
          chineseSubtitles: this.chineseSubtitles,
          englishFileName: this.englishFileName,
          chineseFileName: this.chineseFileName
        });
      } else {
        this.chineseSubtitles = subtitleData;
        this.chineseFileName = file.name;
        response = await chrome.runtime.sendMessage({
          action: 'saveBilingualSubtitles',
          englishSubtitles: this.englishSubtitles,
          chineseSubtitles: this.chineseSubtitles,
          englishFileName: this.englishFileName,
          chineseFileName: this.chineseFileName
        });
      }

      if (response.success) {
        this.updateSubtitleInfo();
        this.showStatus(`成功加载 ${subtitleData.length} 条${language === 'english' ? '英文' : '中文'}字幕`, 'success');
        
        // 自动启用字幕显示
        if (!document.getElementById('subtitleToggle').checked) {
          document.getElementById('subtitleToggle').checked = true;
          this.toggleSubtitle(true);
        }
      } else {
        throw new Error(response.error);
      }

    } catch (error) {
      console.error('处理文件失败:', error);
      this.showStatus('文件处理失败: ' + error.message, 'error');
    }
  }

  isValidSubtitleFile(file) {
    const validExtensions = ['srt', 'vtt'];
    const extension = file.name.split('.').pop().toLowerCase();
    return validExtensions.includes(extension);
  }

  readFileAsText(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = () => reject(new Error('文件读取失败'));
      reader.readAsText(file, 'UTF-8');
    });
  }

  parseSubtitle(content, filename) {
    const extension = filename.split('.').pop().toLowerCase();
    
    try {
      if (extension === 'srt') {
        return this.parseSRT(content);
      } else if (extension === 'vtt') {
        return this.parseVTT(content);
      } else {
        throw new Error('不支持的文件格式');
      }
    } catch (error) {
      console.error('解析字幕失败:', error);
      return [];
    }
  }

  parseSRT(content) {
    const subtitles = [];
    const blocks = content.trim().split(/\n\s*\n/);
    
    for (const block of blocks) {
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
    }
    
    return subtitles;
  }

  parseVTT(content) {
    const subtitles = [];
    const lines = content.split('\n');
    let currentSubtitle = null;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      if (line === 'WEBVTT' || line === '') continue;
      
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
    }
    
    if (currentSubtitle) {
      subtitles.push(currentSubtitle);
    }
    
    return subtitles;
  }

  parseTime(hours, minutes, seconds, milliseconds) {
    return parseInt(hours) * 3600 + 
           parseInt(minutes) * 60 + 
           parseInt(seconds) + 
           parseInt(milliseconds) / 1000;
  }

  updateSubtitleInfo() {
    document.getElementById('englishSubtitleCount').textContent = `${this.englishSubtitles.length} 条`;
    document.getElementById('chineseSubtitleCount').textContent = `${this.chineseSubtitles.length} 条`;
    document.getElementById('englishFileName').textContent = this.englishFileName || '未选择';
    document.getElementById('chineseFileName').textContent = this.chineseFileName || '未选择';
  }

  async clearSubtitle() {
    try {
      const response = await chrome.runtime.sendMessage({ action: 'clearSubtitleData' });
      if (response.success) {
        this.subtitleData = [];
        this.englishSubtitles = [];
        this.chineseSubtitles = [];
        this.currentFileName = '';
        this.englishFileName = '';
        this.chineseFileName = '';
        this.updateSubtitleInfo();
        document.getElementById('subtitleToggle').checked = false;
        this.showStatus('字幕数据已清除', 'success');
      }
    } catch (error) {
      console.error('清除字幕失败:', error);
      this.showStatus('清除失败: ' + error.message, 'error');
    }
  }

  async updateSettings(settings) {
    try {
      await chrome.runtime.sendMessage({
        action: 'updateSettings',
        settings: settings
      });
      
      // 显示保存状态提示
      this.showSaveStatus();
      
      console.log('设置已更新并保存:', settings);
    } catch (error) {
      console.error('更新设置失败:', error);
    }
  }

  showStatus(message, type = 'info') {
    const statusElement = document.getElementById('statusMessage');
    statusElement.textContent = message;
    statusElement.className = `status-message ${type}`;
    
    // 3秒后隐藏
    setTimeout(() => {
      statusElement.className = 'status-message';
    }, 3000);
  }

  showHelp() {
    this.showStatus('使用方法：分别选择英文和中文SRT/VTT字幕文件，在YouTube视频页面启用双语显示', 'info');
  }

  showFeedback() {
    this.showStatus('如有问题请通过Chrome扩展商店反馈', 'info');
  }
}

// 初始化popup控制器
document.addEventListener('DOMContentLoaded', () => {
  new PopupController();
});