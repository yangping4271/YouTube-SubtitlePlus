// ========================================
// YouTube字幕助手 - 现代化弹窗控制器
// ========================================

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
        
        // 自动加载相关设置
        this.autoLoadEnabled = false;
        this.serverUrl = 'http://127.0.0.1:8888';
        this.serverStatus = 'unknown'; // unknown, connected, error
        
        // 使用默认设置初始化，而不是空对象
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
        
        this.syncSettings = false;
        
        // UI状态
        this.currentTab = 'files';
        this.advancedExpanded = false;
        
        this.init();
    }

    // 辅助方法：健壮地设置下拉框选中项，确保UI显示同步
    setSelectValue(selectEl, value) {
        if (!selectEl) return;
        const options = Array.from(selectEl.options || []);
        let index = options.findIndex(opt => opt.value === value);
        if (index < 0 && options.length > 0) {
            index = 0; // 回退到第一项
        }
        if (index >= 0) {
            selectEl.selectedIndex = index;
            options.forEach((opt, i) => opt.selected = i === index);
        }
    }

    async init() {
        this.setupTabs();
        this.setupUploadModeSelection();
        this.bindEvents();
        
        // 先确保默认设置写入 storage，再加载当前状态
        try {
            await this.ensureDefaultSettings();
        } catch (e) {
            console.warn('确保默认设置时出现问题，但继续加载当前状态:', e);
        }
        
        await this.loadCurrentState();
        this.setupFileNameTooltips();
    }
    
    // 确保默认设置存在于storage中
    async ensureDefaultSettings() {
        try {
            const result = await chrome.storage.local.get(['englishSettings', 'chineseSettings']);
            let needsSave = false;
            
            if (!result.englishSettings || Object.keys(result.englishSettings).length === 0) {
                await chrome.runtime.sendMessage({
                    action: 'updateSettings',
                    settings: {
                        language: 'english',
                        data: this.englishSettings
                    }
                });
                needsSave = true;
            }
            
            if (!result.chineseSettings || Object.keys(result.chineseSettings).length === 0) {
                await chrome.runtime.sendMessage({
                    action: 'updateSettings',
                    settings: {
                        language: 'chinese',
                        data: this.chineseSettings
                    }
                });
                needsSave = true;
            }
            
            if (needsSave) {
                console.log('已初始化默认设置到storage');
            }
        } catch (error) {
            console.error('初始化默认设置失败:', error);
        }
    }

    // ========================================
    // 标签页管理
    // ========================================
    setupTabs() {
        const tabButtons = document.querySelectorAll('.tab-button');
        const tabContents = document.querySelectorAll('.tab-content');
        
        tabButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                const tabId = e.currentTarget.dataset.tab;
                this.switchTab(tabId);
            });
        });
    }
    
    switchTab(tabId) {
        // 更新按钮状态
        document.querySelectorAll('.tab-button').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-tab="${tabId}"]`).classList.add('active');
        
        // 更新内容显示
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        
        const targetContent = document.getElementById(`${tabId}Tab`);
        if (targetContent) {
            targetContent.classList.add('active');
        }
        
        this.currentTab = tabId;
    }

    // ========================================
    // 上传模式选择管理
    // ========================================
    setupUploadModeSelection() {
        const modeButtons = document.querySelectorAll('.mode-tab');
        const uploadContents = document.querySelectorAll('.upload-content');
        
        modeButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                const mode = e.currentTarget.dataset.mode;
                this.switchUploadMode(mode);
            });
        });
    }
    
    switchUploadMode(mode) {
        // 更新按钮状态
        document.querySelectorAll('.mode-tab').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-mode="${mode}"]`).classList.add('active');
        
        // 更新内容显示
        document.querySelectorAll('.upload-content').forEach(content => {
            content.classList.remove('active');
        });
        
        let targetContent;
        switch (mode) {
            case 'auto':
                targetContent = document.getElementById('autoMode');
                this.initAutoLoadMode();
                break;
            case 'bilingual':
                targetContent = document.getElementById('bilingualMode');
                break;
            case 'separate':
                targetContent = document.getElementById('separateMode');
                break;
        }
        
        if (targetContent) {
            targetContent.classList.add('active');
        }
    }

    // ========================================
    // 事件绑定
    // ========================================
    bindEvents() {
        // 字幕主开关
        const subtitleToggle = document.getElementById('subtitleToggle');
        if (subtitleToggle) {
            subtitleToggle.addEventListener('change', (e) => {
                this.toggleSubtitle(e.target.checked);
            });
        }

        // 文件上传事件
        this.bindFileUploadEvents('english', 'englishUploadArea', 'englishFileInput');
        this.bindFileUploadEvents('chinese', 'chineseUploadArea', 'chineseFileInput');
        
        // ASS文件上传事件
        this.bindASSUploadEvents();
        
        // 文件移除事件
        const englishRemove = document.getElementById('englishRemove');
        const chineseRemove = document.getElementById('chineseRemove');
        const assRemove = document.getElementById('assRemove');
        
        if (englishRemove) {
            englishRemove.addEventListener('click', () => {
                this.removeFile('english');
            });
        }
        
        if (chineseRemove) {
            chineseRemove.addEventListener('click', () => {
                this.removeFile('chinese');
            });
        }
        
        if (assRemove) {
            assRemove.addEventListener('click', () => {
                this.removeASSFile();
            });
        }

        // 清除所有字幕
        const clearButton = document.getElementById('clearButton');
        if (clearButton) {
            clearButton.addEventListener('click', () => {
                this.clearSubtitle();
            });
        }

        // 设置控件事件
        this.bindSettingsEvents();

        // 高级设置折叠
        const advancedToggle = document.getElementById('advancedToggle');
        const advancedSettings = document.getElementById('advancedSettings');
        
        if (advancedToggle && advancedSettings) {
            advancedToggle.addEventListener('click', () => {
                this.advancedExpanded = !this.advancedExpanded;
                advancedToggle.classList.toggle('active', this.advancedExpanded);
                advancedSettings.classList.toggle('active', this.advancedExpanded);
                
                // 更新箭头方向
                const arrow = advancedToggle.querySelector('span:first-child');
                if (arrow) {
                    arrow.textContent = this.advancedExpanded ? '▼' : '▶';
                }
            });
        }

        // 帮助链接
        const helpLink = document.getElementById('helpLink');
        const feedbackLink = document.getElementById('feedbackLink');
        
        if (helpLink) {
            helpLink.addEventListener('click', (e) => {
                e.preventDefault();
                this.showHelp();
            });
        }

        if (feedbackLink) {
            feedbackLink.addEventListener('click', (e) => {
                e.preventDefault();
                this.showFeedback();
            });
        }

        // 自动加载相关事件
        this.bindAutoLoadEvents();
    }

    bindFileUploadEvents(language, uploadAreaId, fileInputId) {
        const uploadArea = document.getElementById(uploadAreaId);
        const fileInput = document.getElementById(fileInputId);

        if (!uploadArea || !fileInput) return;

        // 点击上传
        uploadArea.addEventListener('click', () => fileInput.click());
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

    bindASSUploadEvents() {
        const assUploadArea = document.getElementById('assUploadArea');
        const assFileInput = document.getElementById('assFileInput');

        if (!assUploadArea || !assFileInput) return;

        // 点击上传
        assUploadArea.addEventListener('click', () => assFileInput.click());
        assFileInput.addEventListener('change', (e) => this.handleASSFileSelect(e));

        // 拖拽上传
        assUploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            assUploadArea.classList.add('dragover');
        });

        assUploadArea.addEventListener('dragleave', () => {
            assUploadArea.classList.remove('dragover');
        });

        assUploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            assUploadArea.classList.remove('dragover');
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                this.processASSFile(files[0]);
            }
        });
    }

    handleASSFileSelect(event) {
        const file = event.target.files[0];
        if (file) {
            this.processASSFile(file);
        }
    }

    async processASSFile(file) {
        try {
            // 验证文件类型
            if (!file.name.toLowerCase().endsWith('.ass')) {
                throw new Error('请选择ASS格式的字幕文件');
            }

            this.showStatus('正在解析ASS双语字幕文件...', 'info');

            // 读取文件内容
            const content = await this.readFileAsText(file);
            
            // 解析ASS文件
            const assResult = this.parseASS(content);
            
            if (assResult.english.length === 0 && assResult.chinese.length === 0) {
                throw new Error('ASS文件解析失败或未找到有效的双语字幕');
            }
            
            // 设置字幕数据，但不设置英文和中文的文件名
            this.englishSubtitles = assResult.english;
            this.chineseSubtitles = assResult.chinese;
            // 不设置 englishFileName 和 chineseFileName，避免在分别上传区域显示
            
            const response = await chrome.runtime.sendMessage({
                action: 'saveBilingualSubtitles',
                englishSubtitles: this.englishSubtitles,
                chineseSubtitles: this.chineseSubtitles,
                englishFileName: '', // 清空英文文件名
                chineseFileName: ''  // 清空中文文件名
            });
            
            if (response.success) {
                this.updateSubtitleInfo();
                this.updateASSFileStatus(file.name, assResult);
                this.showStatus(
                    `成功加载ASS双语字幕: ${assResult.english.length} 条英文, ${assResult.chinese.length} 条中文`, 
                    'success'
                );
                
                // 自动启用字幕显示
                const subtitleToggle = document.getElementById('subtitleToggle');
                if (subtitleToggle && !subtitleToggle.checked) {
                    subtitleToggle.checked = true;
                    this.toggleSubtitle(true);
                }
            } else {
                throw new Error(response.error);
            }
        } catch (error) {
            console.error('处理ASS文件失败:', error);
            this.showStatus('ASS文件处理失败: ' + error.message, 'error');
        }
    }

    updateASSFileStatus(filename, assResult) {
        const assFileStatus = document.getElementById('assFileStatus');
        const assFileName = document.getElementById('assFileName');

        if (assFileStatus && assFileName) {
            // 使用更短的截断长度，更适合界面显示
            const displayName = this.truncateFileName(filename, 18);
            assFileName.textContent = displayName;
            // 设置完整文件名作为title，用于工具提示
            assFileName.setAttribute('title', filename);
            assFileStatus.style.display = 'block';
        }
    }

    removeASSFile() {
        // 清除ASS文件状态显示
        const assFileStatus = document.getElementById('assFileStatus');
        if (assFileStatus) {
            assFileStatus.style.display = 'none';
        }
        
        // 清除文件输入
        const assFileInput = document.getElementById('assFileInput');
        if (assFileInput) {
            assFileInput.value = '';
        }
        
        // 清除字幕数据
        this.englishSubtitles = [];
        this.chineseSubtitles = [];
        this.englishFileName = '';
        this.chineseFileName = '';
        
        // 更新UI显示
        this.updateSubtitleInfo();
        
        // 保存到后台
        chrome.runtime.sendMessage({
            action: 'clearSubtitleData'
        });
        
        // 注意：不再自动关闭字幕开关，让用户手动控制
        
        this.showStatus('ASS字幕已移除', 'success');
    }

    bindSettingsEvents() {
        // 语言切换按钮
        const englishTab = document.getElementById('englishTab');
        const chineseTab = document.getElementById('chineseTab');
        
        if (englishTab && chineseTab) {
            englishTab.addEventListener('click', () => this.switchLanguage('english'));
            chineseTab.addEventListener('click', () => this.switchLanguage('chinese'));
        }
        
        // 同步设置开关
        const syncSettings = document.getElementById('syncSettings');
        if (syncSettings) {
            syncSettings.addEventListener('change', (e) => {
                this.syncSettings = e.target.checked;
                this.updateSettings({ sync: this.syncSettings });
                
                if (this.syncSettings) {
                    this.syncSettingsToOtherLanguage();
                }
            });
        }

        // 预设按钮
        document.querySelectorAll('.preset-item').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const preset = e.currentTarget.dataset.preset;
                const lang = e.currentTarget.dataset.lang;
                
                if (preset && lang) {
                    this.applyPreset(preset, lang);
                    
                    // 更新按钮状态
                    const group = e.currentTarget.closest('.preset-group');
                    if (group) {
                        group.querySelectorAll('.preset-item').forEach(item => {
                            item.classList.remove('active');
                        });
                        e.currentTarget.classList.add('active');
                    }
                }
            });
        });

        // 设置控件
        this.bindSettingControls();
        
        // 重置按钮
        const resetBtn = document.getElementById('resetSettings');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => this.resetToDefault());
        }
    }

    bindSettingControls() {
        // 字体大小
        const fontSize = document.getElementById('fontSize');
        const fontSizeValue = document.getElementById('fontSizeValue');
        if (fontSize && fontSizeValue) {
            fontSize.addEventListener('input', (e) => {
                const value = parseInt(e.target.value);
                fontSizeValue.textContent = value + 'px';
                this.updateCurrentLanguageSetting('fontSize', value);
            });
        }

        // 字体颜色
        const fontColorPreset = document.getElementById('fontColorPreset');
        const fontColor = document.getElementById('fontColor');
        const colorPreview = document.getElementById('colorPreview');
        
        if (fontColorPreset) {
            fontColorPreset.addEventListener('change', (e) => {
                const value = e.target.value;
                if (value === 'custom') {
                    fontColor.style.display = 'block';
                    fontColor.click();
                } else {
                    fontColor.style.display = 'none';
                    this.updateCurrentLanguageSetting('fontColor', value);
                    if (colorPreview) {
                        colorPreview.style.backgroundColor = value;
                    }
                }
            });
        }
        
        if (fontColor) {
            fontColor.addEventListener('change', (e) => {
                const value = e.target.value;
                this.updateCurrentLanguageSetting('fontColor', value);
                if (colorPreview) {
                    colorPreview.style.backgroundColor = value;
                }
            });
        }

        // 背景透明度
        const bgOpacity = document.getElementById('bgOpacity');
        const bgOpacityValue = document.getElementById('bgOpacityValue');
        if (bgOpacity && bgOpacityValue) {
            bgOpacity.addEventListener('input', (e) => {
                const value = parseInt(e.target.value);
                bgOpacityValue.textContent = value + '%';
                this.updateCurrentLanguageSetting('backgroundOpacity', value);
            });
        }

        // 字幕位置
        const subtitlePosition = document.getElementById('subtitlePosition');
        if (subtitlePosition) {
            subtitlePosition.addEventListener('change', (e) => {
                this.updateCurrentLanguageSetting('position', e.target.value);
            });
        }

        // 高级设置控件
        this.bindAdvancedControls();
    }

    bindAdvancedControls() {
        // 字体类型
        const fontFamily = document.getElementById('fontFamily');
        if (fontFamily) {
            // 去掉“系统默认”，优先提供 Noto Serif
            const fontOptions = [
                { value: '"Noto Serif", Georgia, serif', text: 'Noto Serif' },
                { value: 'Arial, sans-serif', text: 'Arial' },
                { value: 'Georgia, serif', text: 'Georgia' },
                { value: '"Times New Roman", serif', text: 'Times New Roman' },
                { value: '"Courier New", monospace', text: 'Courier New' },
                { value: '"Helvetica Neue", sans-serif', text: 'Helvetica Neue' },
                { value: 'SimSun, serif', text: '宋体' },
                { value: '"Microsoft YaHei", sans-serif', text: '微软雅黑' },
                { value: '"PingFang SC", sans-serif', text: '苹方' }
            ];
            
            fontFamily.innerHTML = fontOptions.map(option => 
                `<option value="${option.value}">${option.text}</option>`
            ).join('');
            
            // 初始化时使用健壮方式设置选中项
            const targetDefault = this.currentLanguage === 'english' 
                ? '"Noto Serif", Georgia, serif' 
                : 'SimSun, serif';
            this.setSelectValue(fontFamily, targetDefault);
            
            fontFamily.addEventListener('change', (e) => {
                this.updateCurrentLanguageSetting('fontFamily', e.target.value);
            });
        }

        // 字体粗细
        const fontWeight = document.getElementById('fontWeight');
        if (fontWeight) {
            fontWeight.addEventListener('change', (e) => {
                this.updateCurrentLanguageSetting('fontWeight', e.target.value);
            });
        }

        // 文字阴影
        const textShadow = document.getElementById('textShadow');
        const textShadowValue = document.getElementById('textShadowValue');
        if (textShadow && textShadowValue) {
            textShadow.addEventListener('input', (e) => {
                const value = parseInt(e.target.value);
                textShadowValue.textContent = value + 'px';
                this.updateCurrentLanguageSetting('textShadow', `${value}px ${value}px ${value * 2}px rgba(0, 0, 0, 0.8)`);
            });
        }

        // 行高
        const lineHeight = document.getElementById('lineHeight');
        const lineHeightValue = document.getElementById('lineHeightValue');
        if (lineHeight && lineHeightValue) {
            lineHeight.addEventListener('input', (e) => {
                const value = parseFloat(e.target.value);
                lineHeightValue.textContent = value.toString();
                this.updateCurrentLanguageSetting('lineHeight', value);
            });
        }
    }

    // ========================================
    // 语言切换
    // ========================================
    switchLanguage(language) {
        this.currentLanguage = language;
        
        // 更新按钮状态
        document.querySelectorAll('.lang-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.getElementById(language + 'Tab').classList.add('active');
        
        // 切换预设显示
        const englishPresets = document.getElementById('englishPresets');
        const chinesePresets = document.getElementById('chinesePresets');
        
        if (englishPresets && chinesePresets) {
            if (language === 'english') {
                englishPresets.style.display = 'grid';
                chinesePresets.style.display = 'none';
            } else {
                englishPresets.style.display = 'none';
                chinesePresets.style.display = 'grid';
            }
        }
        
        // 加载当前语言设置到UI
        this.loadLanguageSettingsToUI(language);
    }

    // ========================================
    // 设置管理
    // ========================================
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

    loadLanguageSettingsToUI(language) {
        const settings = language === 'english' ? this.englishSettings : this.chineseSettings;
        
        // 字体大小
        if (settings.fontSize !== undefined) {
            const fontSize = document.getElementById('fontSize');
            const fontSizeValue = document.getElementById('fontSizeValue');
            if (fontSize) fontSize.value = settings.fontSize;
            if (fontSizeValue) fontSizeValue.textContent = settings.fontSize + 'px';
        }
        
        // 字体颜色
        if (settings.fontColor) {
            const fontColorPreset = document.getElementById('fontColorPreset');
            const fontColor = document.getElementById('fontColor');
            const colorPreview = document.getElementById('colorPreview');
            
            // 检查是否为预设颜色
            const isPresetColor = Array.from(fontColorPreset?.options || []).some(option => option.value === settings.fontColor);
            
            if (fontColorPreset) {
                if (isPresetColor) {
                    fontColorPreset.value = settings.fontColor;
                    if (fontColor) fontColor.style.display = 'none';
                } else {
                    fontColorPreset.value = 'custom';
                    if (fontColor) {
                        fontColor.style.display = 'block';
                        fontColor.value = settings.fontColor;
                    }
                }
            }
            
            if (colorPreview) {
                colorPreview.style.backgroundColor = settings.fontColor;
            }
        }
        
        // 背景透明度
        if (settings.backgroundOpacity !== undefined) {
            const bgOpacity = document.getElementById('bgOpacity');
            const bgOpacityValue = document.getElementById('bgOpacityValue');
            if (bgOpacity) bgOpacity.value = settings.backgroundOpacity;
            if (bgOpacityValue) bgOpacityValue.textContent = settings.backgroundOpacity + '%';
        }
        
        // 字幕位置
        if (settings.position) {
            const subtitlePosition = document.getElementById('subtitlePosition');
            if (subtitlePosition) subtitlePosition.value = settings.position;
        }
        
        // 高级设置
        if (settings.fontFamily) {
            const fontFamily = document.getElementById('fontFamily');
            if (fontFamily) this.setSelectValue(fontFamily, settings.fontFamily);
        }
        
        if (settings.fontWeight) {
            const fontWeight = document.getElementById('fontWeight');
            if (fontWeight) fontWeight.value = settings.fontWeight;
        }
        
        if (settings.textShadow) {
            const match = settings.textShadow.match(/(\\d+)px/);
            const shadowValue = match ? parseInt(match[1]) : 2;
            const textShadow = document.getElementById('textShadow');
            const textShadowValue = document.getElementById('textShadowValue');
            if (textShadow) textShadow.value = shadowValue;
            if (textShadowValue) textShadowValue.textContent = shadowValue + 'px';
        }
        
        if (settings.lineHeight !== undefined) {
            const lineHeight = document.getElementById('lineHeight');
            const lineHeightValue = document.getElementById('lineHeightValue');
            if (lineHeight) lineHeight.value = settings.lineHeight;
            if (lineHeightValue) lineHeightValue.textContent = settings.lineHeight.toString();
        }
        
        // 更新预览
        this.updatePreview();
    }

    // 预设样式定义
    getPresetSettings(preset, language) {
        const baseSize = language === 'english' ? 34 : 32;
        
        const presets = {
            standard: {
                fontSize: baseSize,
                fontColor: '#ffffff',
                fontFamily: language === 'english' ? '"Noto Serif", Georgia, serif' : 'SimSun, serif',
                fontWeight: language === 'english' ? '700' : '900',
                backgroundOpacity: 20,
                textShadow: '2px 2px 4px rgba(0, 0, 0, 0.8)',
                lineHeight: language === 'english' ? 1.3 : 1.4,
                position: 'bottom'
            },
            large: {
                fontSize: baseSize + 8,
                fontColor: '#ffffff',
                fontFamily: language === 'english' ? '"Noto Serif", Georgia, serif' : 'SimSun, serif',
                fontWeight: '800',
                backgroundOpacity: 25,
                textShadow: '3px 3px 6px rgba(0, 0, 0, 0.9)',
                lineHeight: language === 'english' ? 1.3 : 1.4,
                position: 'bottom'
            },
            contrast: {
                fontSize: baseSize,
                fontColor: '#ffff00',
                fontFamily: language === 'english' ? '"Noto Serif", Georgia, serif' : 'SimSun, serif',
                fontWeight: '900',
                backgroundOpacity: 40,
                textShadow: '2px 2px 8px rgba(0, 0, 0, 1)',
                lineHeight: language === 'english' ? 1.2 : 1.3,
                position: 'bottom'
            },
            cinema: {
                fontSize: baseSize + 4,
                fontColor: '#ffffff',
                fontFamily: language === 'english' ? '"Noto Serif", Georgia, serif' : 'SimSun, serif',
                fontWeight: '600',
                backgroundOpacity: 15,
                textShadow: '1px 1px 3px rgba(0, 0, 0, 0.7)',
                lineHeight: language === 'english' ? 1.4 : 1.5,
                position: 'bottom'
            }
        };
        
        return presets[preset] || presets.standard;
    }

    applyPreset(preset, language) {
        const presetSettings = this.getPresetSettings(preset, language);
        
        // 更新对应语言的设置
        const targetSettings = language === 'english' ? this.englishSettings : this.chineseSettings;
        Object.assign(targetSettings, presetSettings);
        
        // 如果是当前语言，更新UI
        if (language === this.currentLanguage) {
            this.loadLanguageSettingsToUI(language);
        }
        
        // 保存设置
        this.updateSettings({
            language: language,
            data: presetSettings
        });
        
        // 更新预览
        this.updatePreview();
        
        // 显示保存状态
        this.showSaveStatus();
    }

    updatePreview() {
        // 更新英文字幕预览CSS变量
        const englishSettings = this.englishSettings;
        if (englishSettings.fontSize) {
            document.documentElement.style.setProperty('--english-font-size', englishSettings.fontSize + 'px');
        }
        if (englishSettings.fontColor) {
            document.documentElement.style.setProperty('--english-font-color', englishSettings.fontColor);
        }
        if (englishSettings.fontFamily) {
            document.documentElement.style.setProperty('--english-font-family', englishSettings.fontFamily);
        }
        if (englishSettings.fontWeight) {
            document.documentElement.style.setProperty('--english-font-weight', englishSettings.fontWeight);
        }
        if (englishSettings.backgroundOpacity !== undefined) {
            document.documentElement.style.setProperty('--english-bg-opacity', (englishSettings.backgroundOpacity / 100));
        }
        if (englishSettings.textShadow) {
            document.documentElement.style.setProperty('--english-text-shadow', englishSettings.textShadow);
        }
        if (englishSettings.lineHeight) {
            document.documentElement.style.setProperty('--english-line-height', englishSettings.lineHeight);
        }
        
        // 更新中文字幕预览CSS变量
        const chineseSettings = this.chineseSettings;
        if (chineseSettings.fontSize) {
            document.documentElement.style.setProperty('--chinese-font-size', chineseSettings.fontSize + 'px');
        }
        if (chineseSettings.fontColor) {
            document.documentElement.style.setProperty('--chinese-font-color', chineseSettings.fontColor);
        }
        if (chineseSettings.fontFamily) {
            document.documentElement.style.setProperty('--chinese-font-family', chineseSettings.fontFamily);
        }
        if (chineseSettings.fontWeight) {
            document.documentElement.style.setProperty('--chinese-font-weight', chineseSettings.fontWeight);
        }
        if (chineseSettings.backgroundOpacity !== undefined) {
            document.documentElement.style.setProperty('--chinese-bg-opacity', (chineseSettings.backgroundOpacity / 100));
        }
        if (chineseSettings.textShadow) {
            document.documentElement.style.setProperty('--chinese-text-shadow', chineseSettings.textShadow);
        }
        if (chineseSettings.lineHeight) {
            document.documentElement.style.setProperty('--chinese-line-height', chineseSettings.lineHeight);
        }
    }

    // ========================================
    // 文件处理
    // ========================================
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
                const subtitleToggle = document.getElementById('subtitleToggle');
                if (subtitleToggle) subtitleToggle.checked = subtitleEnabled;
                
                this.subtitleData = subtitleData || [];
                this.englishSubtitles = englishSubtitles || [];
                this.chineseSubtitles = chineseSubtitles || [];
                this.englishFileName = englishFileName || '';
                this.chineseFileName = chineseFileName || '';
                
                // 定义默认设置，与构造函数保持一致
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
                
                // 使用默认设置作为后备：当对象为空时回退到默认
                const isEmpty = (obj) => !obj || Object.keys(obj).length === 0;
                this.englishSettings = isEmpty(englishSettings) ? defaultEnglishSettings : englishSettings;
                this.chineseSettings = isEmpty(chineseSettings) ? defaultChineseSettings : chineseSettings;

                // 额外修正：若英文字体为 'inherit' 或缺失，强制回退为默认首选字体
                let needPersistFix = false;
                if (!this.englishSettings.fontFamily || this.englishSettings.fontFamily === 'inherit') {
                    this.englishSettings.fontFamily = defaultEnglishSettings.fontFamily;
                    needPersistFix = true;
                }
                // 额外修正：若中文字幕粗细缺失或为非数值字符串，回退为 900
                if (!this.chineseSettings.fontWeight) {
                    this.chineseSettings.fontWeight = defaultChineseSettings.fontWeight;
                    needPersistFix = true;
                }
                
                if (needPersistFix) {
                    try {
                        // 持久化修正，避免下次仍显示系统默认
                        await this.updateSettings({ language: 'english', data: { fontFamily: this.englishSettings.fontFamily } });
                        await this.updateSettings({ language: 'chinese', data: { fontWeight: this.chineseSettings.fontWeight } });
                    } catch (e) {
                        console.warn('持久化默认字体修正失败，不影响前端显示:', e);
                    }
                }
                this.syncSettings = syncSettings || false;
                
                // 更新同步设置UI
                const syncSettingsCheckbox = document.getElementById('syncSettings');
                if (syncSettingsCheckbox) syncSettingsCheckbox.checked = this.syncSettings;
                
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
                throw new Error('不支持的文件格式，请选择 SRT、VTT 或 ASS 文件');
            }

            this.showStatus(`正在解析${language === 'english' ? '英文' : '中文'}字幕文件...`, 'info');

            // 读取文件内容
            const content = await this.readFileAsText(file);
            
            // 检查是否是ASS文件
            const isASSFile = file.name.split('.').pop().toLowerCase() === 'ass';
            
            if (isASSFile) {
                // 在分别上传模式中，禁止ASS文件
                throw new Error('ASS文件请使用"双语ASS"上传模式，这里只支持单语SRT/VTT文件');
            }
            
            // 普通SRT/VTT文件处理
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
                this.updateFileCardState(language, true);
                this.showStatus(`成功加载 ${subtitleData.length} 条${language === 'english' ? '英文' : '中文'}字幕`, 'success');
                
                // 自动启用字幕显示
                const subtitleToggle = document.getElementById('subtitleToggle');
                if (subtitleToggle && !subtitleToggle.checked) {
                    subtitleToggle.checked = true;
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

    // ========================================
    // 智能文件名处理和工具提示
    // ========================================
    setupFileNameTooltips() {
        const fileNames = document.querySelectorAll('.file-name');
        fileNames.forEach(nameElement => {
            nameElement.addEventListener('mouseenter', (e) => {
                const fullName = e.target.getAttribute('title');
                if (fullName && fullName !== e.target.textContent) {
                    this.showTooltip(e.target, fullName);
                }
            });
            
            nameElement.addEventListener('mouseleave', () => {
                this.hideTooltip();
            });
        });
    }

    showTooltip(element, text) {
        // 移除现有工具提示
        this.hideTooltip();
        
        const tooltip = document.createElement('div');
        tooltip.className = 'file-tooltip';
        tooltip.textContent = text;
        tooltip.style.cssText = `
            position: absolute;
            background: #1a1a1a;
            color: white;
            padding: 8px 12px;
            border-radius: 6px;
            font-size: 12px;
            z-index: 1000;
            max-width: 300px;
            word-break: break-all;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
            pointer-events: none;
        `;
        
        document.body.appendChild(tooltip);
        
        const rect = element.getBoundingClientRect();
        tooltip.style.top = (rect.top - tooltip.offsetHeight - 8) + 'px';
        tooltip.style.left = Math.max(8, rect.left) + 'px';
        
        // 确保工具提示不超出屏幕
        const tooltipRect = tooltip.getBoundingClientRect();
        if (tooltipRect.right > window.innerWidth - 8) {
            tooltip.style.left = (window.innerWidth - tooltipRect.width - 8) + 'px';
        }
        
        this.currentTooltip = tooltip;
    }

    hideTooltip() {
        if (this.currentTooltip) {
            this.currentTooltip.remove();
            this.currentTooltip = null;
        }
    }

    // 智能截断文件名
    truncateFileName(fileName, maxLength = 25) {
        if (fileName.length <= maxLength) {
            return fileName;
        }
        
        const extension = fileName.substring(fileName.lastIndexOf('.'));
        const nameWithoutExt = fileName.substring(0, fileName.lastIndexOf('.'));
        const availableLength = maxLength - extension.length - 3; // 3 for "..."
        
        if (availableLength < 1) {
            return '...' + extension;
        }
        
        return nameWithoutExt.substring(0, availableLength) + '...' + extension;
    }

    updateFileCardState(language, hasFile) {
        const card = document.getElementById(language + 'Card');
        const fileName = document.getElementById(language + 'FileName');
        const removeBtn = document.getElementById(language + 'Remove');
        
        if (hasFile) {
            card.classList.add('has-file');
            const fullFileName = language === 'english' ? this.englishFileName : this.chineseFileName;
            const displayName = this.truncateFileName(fullFileName);
            
            fileName.textContent = displayName;
            fileName.setAttribute('title', fullFileName);
            removeBtn.style.display = 'block';
        } else {
            card.classList.remove('has-file');
            fileName.textContent = '未选择文件';
            fileName.setAttribute('title', '');
            removeBtn.style.display = 'none';
        }
    }

    removeFile(language) {
        if (language === 'english') {
            this.englishSubtitles = [];
            this.englishFileName = '';
        } else {
            this.chineseSubtitles = [];
            this.chineseFileName = '';
        }
        
        this.updateFileCardState(language, false);
        this.updateSubtitleInfo();
        
        // 保存到后台
        chrome.runtime.sendMessage({
            action: 'saveBilingualSubtitles',
            englishSubtitles: this.englishSubtitles,
            chineseSubtitles: this.chineseSubtitles,
            englishFileName: this.englishFileName,
            chineseFileName: this.chineseFileName
        });
        
        this.showStatus(`已移除${language === 'english' ? '英文' : '中文'}字幕`, 'success');
    }

    updateSubtitleInfo() {
        // 更新计数显示
        const englishCount = document.getElementById('englishCount');
        const chineseCount = document.getElementById('chineseCount');
        
        if (englishCount) englishCount.textContent = `${this.englishSubtitles.length}条`;
        if (chineseCount) chineseCount.textContent = `${this.chineseSubtitles.length}条`;
        
        // 更新文件卡片状态 - 只有当对应的文件名存在时才显示为有文件状态
        this.updateFileCardState('english', this.englishFileName && this.englishFileName.length > 0);
        this.updateFileCardState('chinese', this.chineseFileName && this.chineseFileName.length > 0);
    }

    // ========================================
    // 其他方法保持不变
    // ========================================
    
    isValidSubtitleFile(file) {
        const validExtensions = ['srt', 'vtt', 'ass'];
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
            } else if (extension === 'ass') {
                return this.parseASS(content);
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
                const timeMatch = lines[1].match(/(\d{2}:\d{2}:\d{2}[,.]\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2}[,.]\d{3})/);
                if (timeMatch) {
                    const startTime = this.timeToSeconds(timeMatch[1]);
                    const endTime = this.timeToSeconds(timeMatch[2]);
                    const text = lines.slice(2).join(' ').replace(/<[^>]*>/g, '').trim();
                    
                    if (text) {
                        subtitles.push({
                            startTime,
                            endTime,
                            text
                        });
                    }
                }
            }
        }
        
        return subtitles;
    }

    parseVTT(content) {
        const subtitles = [];
        const lines = content.split('\n');
        let i = 0;
        
        // 跳过VTT头部
        while (i < lines.length && !lines[i].includes('-->')) {
            i++;
        }
        
        while (i < lines.length) {
            const line = lines[i].trim();
            const timeMatch = line.match(/(\d{2}:\d{2}:\d{2}[,.]\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2}[,.]\d{3})/);
            
            if (timeMatch) {
                const startTime = this.timeToSeconds(timeMatch[1]);
                const endTime = this.timeToSeconds(timeMatch[2]);
                const textLines = [];
                
                i++;
                while (i < lines.length && lines[i].trim() !== '') {
                    textLines.push(lines[i].trim());
                    i++;
                }
                
                const text = textLines.join(' ').replace(/<[^>]*>/g, '').trim();
                if (text) {
                    subtitles.push({
                        startTime,
                        endTime,
                        text
                    });
                }
            }
            i++;
        }
        
        return subtitles;
    }
    
    parseASS(content) {
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
    
    parseASSTime(timeStr) {
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
    
    cleanASSText(text) {
        // 移除ASS样式标签，如 {\i1}、{\b1}、{\c&Hffffff&} 等
        return text
            .replace(/\{[^}]*\}/g, '') // 移除所有 {} 包围的标签
            .replace(/\\N/g, '\n') // 转换换行符
            .replace(/\\h/g, ' ') // 转换硬空格
            .trim();
    }

    timeToSeconds(timeStr) {
        const [time, ms] = timeStr.replace(',', '.').split('.');
        const [hours, minutes, seconds] = time.split(':');
        return parseInt(hours) * 3600 + 
               parseInt(minutes) * 60 + 
               parseInt(seconds) + 
               parseInt(ms) / 1000;
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
                
                // 注意：不再自动关闭字幕开关，让用户手动控制
                
                this.showStatus('字幕数据已清除', 'success');
            }
        } catch (error) {
            console.error('清除字幕失败:', error);
            this.showStatus('清除失败: ' + error.message, 'error');
        }
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
            const subtitleToggle = document.getElementById('subtitleToggle');
            if (subtitleToggle) subtitleToggle.checked = !enabled;
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
        const syncSettingsCheckbox = document.getElementById('syncSettings');
        if (syncSettingsCheckbox) syncSettingsCheckbox.checked = false;
        
        // 激活标准预设按钮
        document.querySelectorAll('.preset-item').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('[data-preset=\"standard\"]').forEach(btn => btn.classList.add('active'));
        
        // 加载当前语言设置到UI
        this.loadLanguageSettingsToUI(this.currentLanguage);
        
        // 保存设置
        this.updateSettings({ language: 'english', data: defaultEnglishSettings });
        this.updateSettings({ language: 'chinese', data: defaultChineseSettings });
        this.updateSettings({ sync: false });
        
        // 更新预览和显示状态
        this.updatePreview();
        this.showSaveStatus();
        this.showStatus('已恢复默认设置', 'success');
    }

    showSaveStatus() {
        const saveStatus = document.getElementById('saveStatus');
        if (saveStatus) {
            saveStatus.classList.add('show');
            setTimeout(() => {
                saveStatus.classList.remove('show');
            }, 2000);
        }
    }

    showStatus(message, type = 'info') {
        const statusElement = document.getElementById('statusMessage');
        if (statusElement) {
            statusElement.textContent = message;
            statusElement.className = `status-message ${type}`;
            
            // 3秒后隐藏
            setTimeout(() => {
                statusElement.className = 'status-message';
            }, 3000);
        }
    }

    showHelp() {
        this.showStatus('使用方法：分别选择英文和中文SRT/VTT字幕文件，在YouTube视频页面启用双语显示', 'info');
        this.switchTab('about'); // 自动切换到关于页面
    }

    showFeedback() {
        this.showStatus('如有问题请通过Chrome扩展商店反馈', 'info');
        this.switchTab('about'); // 自动切换到关于页面
    }

    // ========================================
    // 自动加载相关方法
    // ========================================
    bindAutoLoadEvents() {
        // 自动加载开关
        const autoLoadToggle = document.getElementById('autoLoadToggle');
        if (autoLoadToggle) {
            autoLoadToggle.addEventListener('change', (e) => {
                this.toggleAutoLoad(e.target.checked);
            });
        }

        // 服务器地址配置
        const serverUrl = document.getElementById('serverUrl');
        if (serverUrl) {
            serverUrl.addEventListener('change', (e) => {
                this.updateServerUrl(e.target.value);
            });
        }

        // 测试连接按钮
        const testServer = document.getElementById('testServer');
        if (testServer) {
            testServer.addEventListener('click', () => {
                this.testServerConnection();
            });
        }

        // 配置折叠按钮
        const configToggle = document.getElementById('configToggle');
        const configPanel = document.getElementById('configPanel');
        if (configToggle && configPanel) {
            configToggle.addEventListener('click', () => {
                const isExpanded = configPanel.classList.contains('expanded');
                
                if (isExpanded) {
                    configPanel.classList.remove('expanded');
                    configToggle.classList.remove('expanded');
                } else {
                    configPanel.classList.add('expanded');
                    configToggle.classList.add('expanded');
                }
            });
        }
    }

    initAutoLoadMode() {
        console.log('初始化自动加载模式');
        this.checkServerStatus();
        this.loadAutoLoadSettings();
        
        // 获取当前视频信息
        this.getCurrentVideoInfo();
        
        // 监听来自content script的消息
        if (!this.messageListenerBound) {
            chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
                if (request.action === 'autoLoadSuccess') {
                    this.updateAutoLoadStatus('成功: ' + request.filename, 'success');
                    this.getCurrentVideoInfo(); // 重新获取状态
                } else if (request.action === 'autoLoadError') {
                    this.updateAutoLoadStatus('失败: ' + request.error, 'error');
                }
            });
            this.messageListenerBound = true;
        }
    }

    async loadAutoLoadSettings() {
        try {
            const result = await chrome.storage.local.get(['autoLoadEnabled', 'serverUrl']);
            this.autoLoadEnabled = result.autoLoadEnabled || false;
            this.serverUrl = result.serverUrl || 'http://127.0.0.1:8888';

            const autoLoadToggle = document.getElementById('autoLoadToggle');
            const serverUrlInput = document.getElementById('serverUrl');

            if (autoLoadToggle) autoLoadToggle.checked = this.autoLoadEnabled;
            if (serverUrlInput) serverUrlInput.value = this.serverUrl;

        } catch (error) {
            console.error('加载自动加载设置失败:', error);
        }
    }

    async toggleAutoLoad(enabled) {
        this.autoLoadEnabled = enabled;

        try {
            // 保存设置
            await chrome.storage.local.set({ autoLoadEnabled: enabled });

            // 通知content script
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                if (tabs[0]) {
                    chrome.tabs.sendMessage(tabs[0].id, {
                        action: 'toggleAutoLoad',
                        enabled: enabled
                    });
                }
            });

            this.showStatus(
                enabled ? '自动加载已启用' : '自动加载已禁用', 
                enabled ? 'success' : 'info'
            );

            if (enabled) {
                this.checkServerStatus();
            }

        } catch (error) {
            console.error('切换自动加载状态失败:', error);
            this.showStatus('设置失败: ' + error.message, 'error');
        }
    }

    async updateServerUrl(url) {
        this.serverUrl = url;

        try {
            await chrome.storage.local.set({ serverUrl: url });

            // 通知content script
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                if (tabs[0]) {
                    chrome.tabs.sendMessage(tabs[0].id, {
                        action: 'updateServerUrl',
                        url: url
                    });
                }
            });

            console.log('服务器地址已更新:', url);

        } catch (error) {
            console.error('更新服务器地址失败:', error);
        }
    }

    async checkServerStatus() {
        // 设置检查状态
        this.updateServerStatus('connecting', '检查服务器状态中...');

        try {
            const response = await fetch(`${this.serverUrl}/health`, {
                method: 'GET',
                timeout: 5000
            });

            if (response.ok) {
                const result = await response.json();
                this.updateServerStatus('connected', '服务器已连接');
                console.log('服务器状态:', result);
            } else {
                this.updateServerStatus('error', `服务器错误 (${response.status})`);
            }

        } catch (error) {
            this.updateServerStatus('error', '服务器连接失败');
            console.log('服务器连接失败:', error.message);
        }
    }

    updateServerStatus(status, message) {
        this.serverStatus = status;
        
        const statusText = document.getElementById('statusText');
        const statusSubtext = document.getElementById('statusSubtext');
        const statusCircle = document.querySelector('.status-circle');
        const statusIcon = document.getElementById('statusIcon');
        
        // 更新主状态文本
        if (statusText) statusText.textContent = message;
        
        // 根据状态更新圆圈样式和图标
        if (statusCircle && statusIcon) {
            statusCircle.className = `status-circle ${status}`;
            
            switch (status) {
                case 'connected':
                    statusIcon.textContent = '✅';
                    if (statusSubtext) statusSubtext.textContent = '服务器运行正常';
                    break;
                case 'disconnected':
                case 'error':
                    statusIcon.textContent = '❌';
                    if (statusSubtext) statusSubtext.textContent = '无法连接到服务器';
                    break;
                case 'connecting':
                    statusIcon.textContent = '⚡';
                    if (statusSubtext) statusSubtext.textContent = '正在检查连接状态';
                    break;
                default:
                    statusIcon.textContent = '❓';
                    if (statusSubtext) statusSubtext.textContent = '服务器状态未知';
            }
        }
    }

    async testServerConnection() {
        const testButton = document.getElementById('testServer');
        const testText = testButton?.querySelector('.test-text');
        const originalText = testText?.textContent || '测试';

        if (testButton && testText) {
            testText.textContent = '测试中...';
            testButton.disabled = true;
            testButton.style.opacity = '0.6';
        }

        await this.checkServerStatus();

        if (testButton && testText) {
            testText.textContent = originalText;
            testButton.disabled = false;
            testButton.style.opacity = '1';
        }

        // 显示测试结果
        if (this.serverStatus === 'connected') {
            this.showStatus('服务器连接正常', 'success');
        } else {
            this.showStatus('服务器连接失败，请检查服务器是否启动', 'error');
        }
    }

    updateAutoLoadStatus(message, type) {
        const autoLoadStatus = document.getElementById('autoLoadStatus');
        if (autoLoadStatus) {
            autoLoadStatus.textContent = message;
            autoLoadStatus.className = `load-status ${type}`;
        }
    }

    async getCurrentVideoInfo() {
        try {
            // 获取当前活动的YouTube标签页
            const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
            if (tabs.length === 0) return;
            
            const currentTab = tabs[0];
            if (!currentTab.url || !currentTab.url.includes('youtube.com/watch')) {
                this.updateVideoDisplay(null, '未在YouTube页面');
                return;
            }

            // 向content script发送消息获取视频信息
            chrome.tabs.sendMessage(currentTab.id, { action: 'getVideoInfo' }, (response) => {
                if (chrome.runtime.lastError) {
                    console.log('无法连接到content script:', chrome.runtime.lastError);
                    this.updateVideoDisplay(null, '页面未加载完成');
                    return;
                }
                
                if (response && response.videoId) {
                    this.updateVideoDisplay(response.videoId, response.subtitleLoaded ? '已加载字幕' : '无字幕');
                } else {
                    this.updateVideoDisplay(null, '获取视频信息失败');
                }
            });
        } catch (error) {
            console.error('获取视频信息失败:', error);
            this.updateVideoDisplay(null, '获取失败');
        }
    }

    updateVideoDisplay(videoId, status) {
        const videoIdElement = document.getElementById('currentVideoId');
        const statusElement = document.getElementById('autoLoadStatus');
        
        if (videoIdElement) {
            videoIdElement.textContent = videoId || '未检测到视频';
        }
        
        if (statusElement) {
            statusElement.textContent = status || '等待检测';
            
            // 更新状态样式
            statusElement.className = 'load-status';
            if (status === '已加载字幕') {
                statusElement.classList.add('success');
            } else if (status && (status.includes('失败') || status.includes('错误'))) {
                statusElement.classList.add('error');
            } else if (status && (status.includes('加载中') || status.includes('检测中'))) {
                statusElement.classList.add('loading');
            }
        }
    }
}

// 初始化popup控制器
document.addEventListener('DOMContentLoaded', () => {
    new PopupController();
});
