class PopupController {
  constructor() {
    this.subtitleData = [];
    this.englishSubtitles = [];
    this.chineseSubtitles = [];
    this.currentFileName = '';
    this.englishFileName = '';
    this.chineseFileName = '';
    
    // 当前选择的语言和设置
    this.currentLanguage = 'english';
    this.englishSettings = {};
    this.chineseSettings = {};
    this.syncSettings = false;
    
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
    // 初始化字体系列选项
    this.initializeFontFamilyOptions();
    
    // 语言标签切换
    document.querySelectorAll('.lang-tab').forEach(tab => {
      tab.addEventListener('click', (e) => {
        const language = e.currentTarget.dataset.lang;
        this.switchLanguage(language);
      });
    });

    // 同步设置选项
    const syncCheckbox = document.getElementById('syncSettings');
    syncCheckbox.addEventListener('change', (e) => {
      this.syncSettings = e.target.checked;
      this.updateSettings({ sync: this.syncSettings });
      
      if (this.syncSettings) {
        // 如果开启同步，将当前语言设置复制到另一种语言
        this.syncSettingsToOtherLanguage();
      }
    });

    // 双语预设配置
    const englishPresets = {
      standard: { fontSize: 34, fontColor: '#ffffff', fontFamily: '"Noto Serif", Georgia, serif', fontWeight: '700', backgroundOpacity: 20, textShadow: '2px 2px 4px rgba(0, 0, 0, 0.8)', lineHeight: 1.3, position: 'bottom' },
      large: { fontSize: 40, fontColor: '#ffffff', fontFamily: '"Noto Serif", Georgia, serif', fontWeight: '700', backgroundOpacity: 25, textShadow: '3px 3px 6px rgba(0, 0, 0, 0.9)', lineHeight: 1.3, position: 'bottom' },
      contrast: { fontSize: 36, fontColor: '#ffff00', fontFamily: '"Noto Serif", Georgia, serif', fontWeight: '900', backgroundOpacity: 40, textShadow: '2px 2px 4px rgba(0, 0, 0, 1.0)', lineHeight: 1.2, position: 'bottom' },
      cinema: { fontSize: 34, fontColor: '#f0f0f0', fontFamily: '"Noto Serif", Georgia, serif', fontWeight: '700', backgroundOpacity: 15, textShadow: '2px 2px 8px rgba(0, 0, 0, 0.8)', lineHeight: 1.4, position: 'bottom' }
    };

    const chinesePresets = {
      standard: { fontSize: 32, fontColor: '#ffffff', fontFamily: 'SimSun, serif', fontWeight: '900', backgroundOpacity: 20, textShadow: '2px 2px 4px rgba(0, 0, 0, 0.8)', lineHeight: 1.4, position: 'bottom' },
      large: { fontSize: 40, fontColor: '#ffffff', fontFamily: 'SimSun, serif', fontWeight: '700', backgroundOpacity: 25, textShadow: '3px 3px 6px rgba(0, 0, 0, 0.9)', lineHeight: 1.4, position: 'bottom' },
      contrast: { fontSize: 36, fontColor: '#00ff00', fontFamily: 'SimSun, serif', fontWeight: '900', backgroundOpacity: 40, textShadow: '2px 2px 4px rgba(0, 0, 0, 1.0)', lineHeight: 1.3, position: 'bottom' },
      cinema: { fontSize: 34, fontColor: '#f0f0f0', fontFamily: 'SimSun, serif', fontWeight: '700', backgroundOpacity: 20, textShadow: '2px 2px 8px rgba(0, 0, 0, 0.8)', lineHeight: 1.5, position: 'bottom' }
    };

    // 预设按钮事件
    document.querySelectorAll('.preset-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const presetName = btn.dataset.preset;
        const language = btn.dataset.lang;
        const presets = language === 'english' ? englishPresets : chinesePresets;
        const preset = presets[presetName];
        
        // 更新对应语言的预设按钮状态
        const targetContainer = language === 'english' ? 'englishPresets' : 'chinesePresets';
        document.querySelectorAll(`#${targetContainer} .preset-btn`).forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        // 应用预设设置
        this.applyPreset(preset, language);
      });
    });

    // 设置控件事件绑定
    this.bindSettingControls();
    
    // 重置按钮
    document.getElementById('resetSettings').addEventListener('click', () => {
      this.resetToDefault();
    });

    // 初始化预览
    this.initializePreview();
  }

  // 初始化字体系列选项
  initializeFontFamilyOptions() {
    const fontFamilySelect = document.getElementById('fontFamily');
    
    // 清空现有选项
    fontFamilySelect.innerHTML = '';
    
    // 英文字体选项
    const englishFonts = [
      { value: '"Noto Serif", Georgia, serif', name: 'Noto Serif（推荐）' },
      { value: 'Georgia, serif', name: 'Georgia' },
      { value: 'Arial, sans-serif', name: 'Arial' },
      { value: 'Helvetica, Arial, sans-serif', name: 'Helvetica' },
      { value: '"Times New Roman", serif', name: 'Times New Roman' },
      { value: 'Verdana, sans-serif', name: 'Verdana' },
      { value: '"Courier New", monospace', name: 'Courier New' }
    ];
    
    // 中文字体选项
    const chineseFonts = [
      { value: 'SimSun, serif', name: '宋体（推荐）' },
      { value: '"Microsoft YaHei", "PingFang SC", "Hiragino Sans GB", sans-serif', name: '微软雅黑' },
      { value: '"SimHei", "Heiti SC", "Microsoft YaHei", sans-serif', name: '黑体' },
      { value: '"SimSun", "Songti SC", "Microsoft YaHei", serif', name: '宋体' },
      { value: '"KaiTi", "Kaiti SC", "Microsoft YaHei", serif', name: '楷体' },
      { value: '"PingFang SC", "Microsoft YaHei", sans-serif', name: '苹方' }
    ];
    
    // 根据当前语言填充选项
    const fonts = this.currentLanguage === 'english' ? englishFonts : chineseFonts;
    fonts.forEach(font => {
      const option = document.createElement('option');
      option.value = font.value;
      option.textContent = font.name;
      fontFamilySelect.appendChild(option);
    });
  }

  // 切换语言标签
  switchLanguage(language) {
    if (this.currentLanguage === language) return;
    
    this.currentLanguage = language;
    
    // 更新标签状态
    document.querySelectorAll('.lang-tab').forEach(tab => {
      tab.classList.toggle('active', tab.dataset.lang === language);
    });
    
    // 切换预设区域显示
    document.getElementById('englishPresets').style.display = language === 'english' ? 'block' : 'none';
    document.getElementById('chinesePresets').style.display = language === 'chinese' ? 'block' : 'none';
    
    // 更新字体选项
    this.initializeFontFamilyOptions();
    
    // 加载对应语言的设置到UI
    this.loadLanguageSettingsToUI(language);
  }

  // 绑定设置控件
  bindSettingControls() {
    // 字体大小
    const fontSize = document.getElementById('fontSize');
    const fontSizeValue = document.getElementById('fontSizeValue');
    fontSize.addEventListener('input', (e) => {
      const value = parseInt(e.target.value);
      fontSizeValue.textContent = value + 'px';
      this.updateCurrentLanguageSetting('fontSize', value);
    });

    // 字体系列
    const fontFamily = document.getElementById('fontFamily');
    fontFamily.addEventListener('change', (e) => {
      this.updateCurrentLanguageSetting('fontFamily', e.target.value);
    });

    // 字体粗细
    const fontWeight = document.getElementById('fontWeight');
    fontWeight.addEventListener('change', (e) => {
      this.updateCurrentLanguageSetting('fontWeight', e.target.value);
    });

    // 字体颜色
    const fontColorPreset = document.getElementById('fontColorPreset');
    const fontColor = document.getElementById('fontColor');
    const colorName = document.getElementById('colorName');
    
    fontColorPreset.addEventListener('change', (e) => {
      const value = e.target.value;
      if (value === 'custom') {
        fontColor.style.display = 'block';
        fontColor.click(); // 自动打开颜色选择器
      } else {
        fontColor.style.display = 'none';
        const colorNameText = this.getColorName(value);
        colorName.textContent = colorNameText;
        this.updateCurrentLanguageSetting('fontColor', value);
      }
    });
    
    fontColor.addEventListener('change', (e) => {
      const color = e.target.value;
      colorName.textContent = this.getColorName(color);
      this.updateCurrentLanguageSetting('fontColor', color);
    });

    // 背景透明度
    const bgOpacity = document.getElementById('bgOpacity');
    const bgOpacityValue = document.getElementById('bgOpacityValue');
    bgOpacity.addEventListener('input', (e) => {
      const value = parseInt(e.target.value);
      bgOpacityValue.textContent = value + '%';
      this.updateCurrentLanguageSetting('backgroundOpacity', value);
    });

    // 文字阴影
    const textShadow = document.getElementById('textShadow');
    const textShadowValue = document.getElementById('textShadowValue');
    textShadow.addEventListener('input', (e) => {
      const value = parseInt(e.target.value);
      textShadowValue.textContent = value + 'px';
      const shadowValue = `${value}px ${value}px ${value * 2}px rgba(0, 0, 0, 0.8)`;
      this.updateCurrentLanguageSetting('textShadow', shadowValue);
    });

    // 行高
    const lineHeight = document.getElementById('lineHeight');
    const lineHeightValue = document.getElementById('lineHeightValue');
    lineHeight.addEventListener('input', (e) => {
      const value = parseFloat(e.target.value);
      lineHeightValue.textContent = value.toString();
      this.updateCurrentLanguageSetting('lineHeight', value);
    });

    // 字幕位置
    const subtitlePosition = document.getElementById('subtitlePosition');
    subtitlePosition.addEventListener('change', (e) => {
      this.updateCurrentLanguageSetting('position', e.target.value);
    });
  }

  // 更新当前语言设置
  updateCurrentLanguageSetting(key, value) {
    const settings = this.currentLanguage === 'english' ? this.englishSettings : this.chineseSettings;
    settings[key] = value;
    
    // 更新预览
    this.updatePreview();
    
    // 保存设置
    this.updateSettings({
      language: this.currentLanguage,
      data: { [key]: value }
    });
    
    // 如果开启同步，同步到另一种语言
    if (this.syncSettings) {
      const otherLanguage = this.currentLanguage === 'english' ? 'chinese' : 'english';
      const otherSettings = otherLanguage === 'english' ? this.englishSettings : this.chineseSettings;
      otherSettings[key] = value;
      
      this.updateSettings({
        language: otherLanguage,
        data: { [key]: value }
      });
    }
    
    // 显示保存状态
    this.showSaveStatus();
  }

  // 同步设置到另一种语言
  syncSettingsToOtherLanguage() {
    const currentSettings = this.currentLanguage === 'english' ? this.englishSettings : this.chineseSettings;
    const otherLanguage = this.currentLanguage === 'english' ? 'chinese' : 'english';
    const otherSettings = otherLanguage === 'english' ? this.englishSettings : this.chineseSettings;
    
    // 复制设置
    Object.assign(otherSettings, currentSettings);
    
    // 保存
    this.updateSettings({
      language: otherLanguage,
      data: currentSettings
    });
  }

  // 加载语言设置到UI
  loadLanguageSettingsToUI(language) {
    const settings = language === 'english' ? this.englishSettings : this.chineseSettings;
    
    if (settings.fontSize !== undefined) {
      document.getElementById('fontSize').value = settings.fontSize;
      document.getElementById('fontSizeValue').textContent = settings.fontSize + 'px';
    }
    
    if (settings.fontFamily) {
      document.getElementById('fontFamily').value = settings.fontFamily;
    }
    
    if (settings.fontWeight) {
      document.getElementById('fontWeight').value = settings.fontWeight;
    }
    
    if (settings.fontColor) {
      // 更新预设选择器
      const fontColorPreset = document.getElementById('fontColorPreset');
      const fontColor = document.getElementById('fontColor');
      const colorName = document.getElementById('colorName');
      
      // 检查是否为预设颜色
      const isPresetColor = Array.from(fontColorPreset.options).some(option => option.value === settings.fontColor);
      
      if (isPresetColor) {
        fontColorPreset.value = settings.fontColor;
        fontColor.style.display = 'none';
      } else {
        fontColorPreset.value = 'custom';
        fontColor.style.display = 'block';
        fontColor.value = settings.fontColor;
      }
      
      colorName.textContent = this.getColorName(settings.fontColor);
    }
    
    if (settings.backgroundOpacity !== undefined) {
      document.getElementById('bgOpacity').value = settings.backgroundOpacity;
      document.getElementById('bgOpacityValue').textContent = settings.backgroundOpacity + '%';
    }
    
    if (settings.textShadow) {
      // 从阴影字符串提取数值（简化处理）
      const match = settings.textShadow.match(/(\d+)px/);
      const shadowValue = match ? parseInt(match[1]) : 2;
      document.getElementById('textShadow').value = shadowValue;
      document.getElementById('textShadowValue').textContent = shadowValue + 'px';
    }
    
    if (settings.lineHeight !== undefined) {
      document.getElementById('lineHeight').value = settings.lineHeight;
      document.getElementById('lineHeightValue').textContent = settings.lineHeight.toString();
    }
    
    if (settings.position) {
      document.getElementById('subtitlePosition').value = settings.position;
    }
    
    // 更新预览
    this.updatePreview();
  }

  // 应用预设设置
  applyPreset(preset, language) {
    // 更新对应语言的设置
    const targetSettings = language === 'english' ? this.englishSettings : this.chineseSettings;
    Object.assign(targetSettings, preset);
    
    // 如果是当前语言，更新UI
    if (language === this.currentLanguage) {
      this.loadLanguageSettingsToUI(language);
    }
    
    // 保存设置
    this.updateSettings({
      language: language,
      data: preset
    });
    
    // 更新预览
    this.updatePreview();
    
    // 显示保存状态
    this.showSaveStatus();
  }

  // 更新预览区域
  updatePreview() {
    // 更新英文字幕预览CSS变量
    const englishSettings = this.englishSettings;
    if (englishSettings.fontSize) {
      document.documentElement.style.setProperty('--preview-english-size', englishSettings.fontSize + 'px');
    }
    if (englishSettings.fontColor) {
      document.documentElement.style.setProperty('--preview-english-color', englishSettings.fontColor);
    }
    if (englishSettings.backgroundOpacity !== undefined) {
      document.documentElement.style.setProperty('--preview-english-bg', `rgba(0, 0, 0, ${englishSettings.backgroundOpacity / 100})`);
    }
    
    // 更新中文字幕预览CSS变量
    const chineseSettings = this.chineseSettings;
    if (chineseSettings.fontSize) {
      document.documentElement.style.setProperty('--preview-chinese-size', chineseSettings.fontSize + 'px');
    }
    if (chineseSettings.fontColor) {
      document.documentElement.style.setProperty('--preview-chinese-color', chineseSettings.fontColor);
    }
    if (chineseSettings.backgroundOpacity !== undefined) {
      document.documentElement.style.setProperty('--preview-chinese-bg', `rgba(0, 0, 0, ${chineseSettings.backgroundOpacity / 100})`);
    }
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
      '#00ff00': '绿色',
      '#ff0000': '红色',
      '#0000ff': '蓝色',
      '#ffa500': '橙色',
      '#800080': '紫色',
      '#ffc0cb': '粉色',
      '#00ffff': '青色',
      '#a0a0a0': '灰色',
      '#000000': '黑色',
      '#f0f0f0': '浅灰色',
      '#c0c0c0': '银色',
      '#800000': '栗色',
      '#008000': '深绿色',
      '#000080': '藏青色',
      '#ff00ff': '洋红色',
      '#808000': '橄榄色',
      '#008080': '青绿色',
      '#ffd700': '金色'
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
          englishSettings,
          chineseSettings,
          syncSettings,
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
        
        // 更新设置
        this.englishSettings = englishSettings || {};
        this.chineseSettings = chineseSettings || {};
        this.syncSettings = syncSettings || false;
        
        // 更新同步设置UI
        document.getElementById('syncSettings').checked = this.syncSettings;
        
        this.updateSubtitleInfo();
        
        // 加载当前语言设置到UI
        this.loadLanguageSettingsToUI(this.currentLanguage);
        
        // 更新预览
        this.updatePreview();
      }
    } catch (error) {
      console.error('加载当前状态失败:', error);
      this.showStatus('加载设置失败', 'error');
    }
  }

  // 重置为默认设置
  resetToDefault() {
    // 默认英文设置 (34px基础)
    const defaultEnglishSettings = {
      fontSize: 34,
      fontColor: '#ffffff',
      fontFamily: '"Noto Serif", Georgia, serif',
      fontWeight: '700',
      backgroundOpacity: 20,
      textShadow: '2px 2px 4px rgba(0, 0, 0, 0.8)',
      lineHeight: 1.3,
      position: 'bottom'
    };
    
    // 默认中文设置 (32px基础)
    const defaultChineseSettings = {
      fontSize: 32,
      fontColor: '#ffffff',
      fontFamily: 'SimSun, serif',
      fontWeight: '900',
      backgroundOpacity: 20,
      textShadow: '2px 2px 4px rgba(0, 0, 0, 0.8)',
      lineHeight: 1.4,
      position: 'bottom'
    };
    
    // 更新设置对象
    this.englishSettings = { ...defaultEnglishSettings };
    this.chineseSettings = { ...defaultChineseSettings };
    this.syncSettings = false;
    
    // 更新UI
    document.getElementById('syncSettings').checked = false;
    
    // 激活标准预设按钮
    document.querySelectorAll('.preset-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('[data-preset="standard"]').forEach(btn => btn.classList.add('active'));
    
    // 加载当前语言设置到UI
    this.loadLanguageSettingsToUI(this.currentLanguage);
    
    // 保存设置
    this.updateSettings({ language: 'english', data: defaultEnglishSettings });
    this.updateSettings({ language: 'chinese', data: defaultChineseSettings });
    this.updateSettings({ sync: false });
    
    // 更新预览和显示状态
    this.updatePreview();
    this.showSaveStatus();
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