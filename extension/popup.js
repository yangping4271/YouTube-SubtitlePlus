// ========================================
// YouTube字幕助手 - 现代化弹窗控制器
// ========================================

// 轻量级Toast提示系统
class Toast {
    static show(message, type = 'info', duration = 2000) {
        // 创建toast元素
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        
        // 设置样式
        const colors = {
            success: { bg: 'rgba(16, 185, 129, 0.9)', color: '#ffffff' },
            error: { bg: 'rgba(239, 68, 68, 0.9)', color: '#ffffff' },
            warning: { bg: 'rgba(245, 158, 11, 0.9)', color: '#ffffff' },
            info: { bg: 'rgba(59, 130, 246, 0.9)', color: '#ffffff' }
        };
        
        const style = colors[type] || colors.info;
        toast.style.cssText = `
            position: fixed;
            bottom: 20px;
            left: 50%;
            transform: translateX(-50%) translateY(60px);
            padding: 10px 16px;
            background: ${style.bg};
            color: ${style.color};
            border-radius: 8px;
            font-size: 13px;
            font-weight: 500;
            z-index: 9999;
            opacity: 0;
            transition: all 0.3s ease-out;
            max-width: 300px;
            text-align: center;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            backdrop-filter: blur(8px);
        `;
        
        document.body.appendChild(toast);
        
        // 动画显示
        setTimeout(() => {
            toast.style.opacity = '1';
            toast.style.transform = 'translateX(-50%) translateY(0)';
        }, 10);
        
        // 自动隐藏
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(-50%) translateY(-60px)';
            setTimeout(() => toast.remove(), 300);
        }, duration);
    }
    
    static success(message, duration = 2000) {
        this.show(message, 'success', duration);
    }
    
    static error(message, duration = 3000) {
        this.show(message, 'error', duration);
    }
    
    static warning(message, duration = 2500) {
        this.show(message, 'warning', duration);
    }
}

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
            lineHeight: 1.3
        };
        
        this.chineseSettings = {
            fontSize: 32,
            fontColor: '#ffffff',
            fontFamily: '"Songti SC", serif',
            fontWeight: '900',
            backgroundOpacity: 20,
            textShadow: '2px 2px 4px rgba(0, 0, 0, 0.8)',
            lineHeight: 1.4
        };
        
        this.syncSettings = false;
        
        // UI状态
        this.currentTab = 'files';
        this.advancedExpanded = false;
        
        // 🔧 添加调试功能到全局作用域
        window.popupController = this;
        window.debugSubtitles = () => this.debugSubtitles();
        window.forceRefreshStats = () => this.forceRefreshStats();
        window.monitorStats = () => this.monitorStats();
        
        // 🔧 添加简单的测试功能
        window.testSubtitleUpdate = () => {
            console.log('🧪 测试字幕统计更新');
            // 模拟一些字幕数据
            this.englishSubtitles = [{text: 'Test 1'}, {text: 'Test 2'}];
            this.chineseSubtitles = [{text: '测试 1'}, {text: '测试 2'}, {text: '测试 3'}];
            this.updateSubtitleInfoWithRetry();
            return `测试完成：英文 ${this.englishSubtitles.length} 条，中文 ${this.chineseSubtitles.length} 条`;
        };
        
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
        
        // 监听来自content script的消息（全局监听）
        if (!this.messageListenerBound) {
            chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
                if (request.action === 'autoLoadSuccess') {
                    console.log('🎉 收到自动加载成功消息:', request);
                    this.updateAutoLoadStatus('成功: ' + request.filename, 'success');

                    // 🔧 修复：如果消息包含字幕数据，直接使用，否则再同步
                    if (request.englishSubtitles || request.chineseSubtitles || request.subtitleData) {
                        console.log('📊 收到字幕数据，直接更新显示');
                        this.englishSubtitles = request.englishSubtitles || [];
                        this.chineseSubtitles = request.chineseSubtitles || [];
                        this.subtitleData = request.subtitleData || [];
                        this.englishFileName = request.englishFileName || '';
                        this.chineseFileName = request.chineseFileName || '';
                        this.currentFileName = request.fileName || '';
                        this.updateSubtitleInfoWithRetry();
                    } else {
                        // 后备方案：从存储中同步数据
                        this.getCurrentVideoInfo();
                    }
                } else if (request.action === 'autoLoadError') {
                    console.log('❌ 收到自动加载失败消息:', request);
                    this.updateAutoLoadStatus('失败: ' + request.error, 'error');
                }
            });
            this.messageListenerBound = true;
        }
        
        // 先确保默认设置写入 storage，再加载当前状态
        try {
            await this.ensureDefaultSettings();
        } catch (e) {
            console.warn('确保默认设置时出现问题，但继续加载当前状态:', e);
        }
        
        await this.loadCurrentState();
        this.setupFileNameTooltips();
        
        // 如果当前在自动加载模式，也要获取视频信息
        const activeMode = document.querySelector('.mode-tab.active');
        if (activeMode && activeMode.dataset.mode === 'auto') {
            console.log('🚀 当前处于自动加载模式，执行初始化');
            this.initAutoLoadMode();
        }
        
        // 主动检查一次当前视频的字幕状态，初始化计数
        this.checkCurrentVideoSubtitleStatus();

        // 监听存储变化，实时更新计数（基于当前视频ID）
        this.observeSubtitleStorageChanges();
    }

    // 监听chrome.storage变化，保持计数同步与简化更新路径
    observeSubtitleStorageChanges() {
        if (this._storageObserved) return;
        this._storageObserved = true;
        chrome.storage.onChanged.addListener((changes, areaName) => {
            if (areaName !== 'local') return;
            // 获取当前视频ID后再判断对应键是否变化
            this.getCurrentVideoId().then((videoId) => {
                const videoKey = videoId ? `videoSubtitles_${videoId}` : null;
                const keys = Object.keys(changes);
                // 视频级别数据变化
                if (videoKey && keys.includes(videoKey)) {
                    const data = changes[videoKey].newValue || {};
                    this.englishSubtitles = data.englishSubtitles || [];
                    this.chineseSubtitles = data.chineseSubtitles || [];
                    this.englishFileName = data.englishFileName || '';
                    this.chineseFileName = data.chineseFileName || '';
                    this.updateSubtitleInfo();
                    return;
                }
                // 全局后备数据变化
                if (keys.includes('englishSubtitles') || keys.includes('chineseSubtitles')) {
                    chrome.runtime.sendMessage({ action: 'getBilingualSubtitleData' })
                        .then((res) => {
                            if (res && res.success && !videoKey) {
                                this.englishSubtitles = res.data.englishSubtitles || [];
                                this.chineseSubtitles = res.data.chineseSubtitles || [];
                                this.englishFileName = res.data.englishFileName || '';
                                this.chineseFileName = res.data.chineseFileName || '';
                                this.updateSubtitleInfo();
                            }
                        })
                        .catch(() => {});
                }
            });
        });
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

        // 强制重置按钮事件
        const forceResetButton = document.getElementById('forceResetButton');
        if (forceResetButton) {
            forceResetButton.addEventListener('click', () => {
                this.handleForceReset(forceResetButton);
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

            Toast.show('正在解析ASS双语字幕文件...', 'info');

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
            
            // 获取当前视频ID并保存字幕
            const currentVideoId = await this.getCurrentVideoId();
            let response;
            
            if (currentVideoId) {
                // 基于视频ID保存字幕
                response = await chrome.runtime.sendMessage({
                    action: 'saveVideoSubtitles',
                    videoId: currentVideoId,
                    englishSubtitles: this.englishSubtitles,
                    chineseSubtitles: this.chineseSubtitles,
                    englishFileName: file.name + ' (英文)',
                    chineseFileName: file.name + ' (中文)'
                });
            } else {
                // 后备方案：使用旧的保存方式
                response = await chrome.runtime.sendMessage({
                    action: 'saveBilingualSubtitles',
                    englishSubtitles: this.englishSubtitles,
                    chineseSubtitles: this.chineseSubtitles,
                    englishFileName: '', // 清空英文文件名
                    chineseFileName: ''  // 清空中文文件名
                });
            }
            
            if (response.success) {
                this.updateSubtitleInfoWithRetry();
                this.updateASSFileStatus(file.name, assResult);
                
                // 更新自动加载状态显示
                this.getCurrentVideoInfo();
                
                Toast.success(
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
            Toast.error('ASS文件处理失败: ' + error.message);
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
        this.updateSubtitleInfoWithRetry();
        
        // 更新自动加载状态显示
        this.getCurrentVideoInfo();
        
        // 保存到后台
        chrome.runtime.sendMessage({
            action: 'clearSubtitleData'
        });
        
        // 注意：不再自动关闭字幕开关，让用户手动控制
        
        Toast.success('已移除ASS字幕');
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

        // 高级设置控件
        this.bindAdvancedControls();
    }

    bindAdvancedControls() {
        // 字体类型
        const fontFamily = document.getElementById('fontFamily');
        if (fontFamily) {
            // 去掉"系统默认"，优先提供 Noto Serif
            const fontOptions = [
                { value: '"Noto Serif", Georgia, serif', text: 'Noto Serif' },
                { value: 'Arial, sans-serif', text: 'Arial' },
                { value: 'Georgia, serif', text: 'Georgia' },
                { value: '"Times New Roman", serif', text: 'Times New Roman' },
                { value: '"Courier New", monospace', text: 'Courier New' },
                { value: '"Helvetica Neue", sans-serif', text: 'Helvetica Neue' },
                { value: '"Songti SC", serif', text: '宋体' },
                { value: '"Microsoft YaHei", sans-serif', text: '微软雅黑' },
                { value: '"PingFang SC", sans-serif', text: '苹方' }
            ];
            
            fontFamily.innerHTML = fontOptions.map(option => 
                `<option value='${option.value}'>${option.text}</option>`
            ).join('');
            
            // 初始化时使用当前设置的字体值
            const currentSettings = this.currentLanguage === 'english' ? this.englishSettings : this.chineseSettings;
            const currentFontFamily = currentSettings.fontFamily || (this.currentLanguage === 'english' 
                ? '"Noto Serif", Georgia, serif' 
                : '"Songti SC", serif');
            
            this.setSelectValue(fontFamily, currentFontFamily);
            
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
        // Toast.success('设置已保存'); // 已保存反馈改为静默，UI变化已足够反馈
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

        // 高级设置 - 字体类型
        const fontFamily = document.getElementById('fontFamily');
        if (fontFamily) {
            // 如果存储的 fontFamily 为空，使用默认值
            const fontFamilyValue = settings.fontFamily || (language === 'english' 
                ? '"Noto Serif", Georgia, serif' 
                : '"Songti SC", serif');
            
            this.setSelectValue(fontFamily, fontFamilyValue);
        }
        
        if (settings.fontWeight) {
            const fontWeight = document.getElementById('fontWeight');
            if (fontWeight) fontWeight.value = settings.fontWeight;
        }
    }

    // ========================================
    // 获取当前视频ID的辅助方法
    // ========================================
    async getCurrentVideoId() {
        try {
            const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
            const currentTab = tabs[0];
            if (!currentTab) return null;

            return await new Promise((resolve) => {
                chrome.tabs.sendMessage(currentTab.id, { action: 'getVideoInfo' }, (response) => {
                    if (chrome.runtime.lastError || !response || !response.videoId) {
                        resolve(null);
                    } else {
                        resolve(response.videoId);
                    }
                });
            });
        } catch (error) {
            console.error('获取视频ID失败:', error);
            return null;
        }
    }

    // ========================================
    // 文件处理
    // ========================================
    async loadCurrentState() {
        try {
            const currentVideoId = await this.getCurrentVideoId();
            
            // 加载全局设置
            const globalResponse = await chrome.runtime.sendMessage({ action: 'getBilingualSubtitleData' });
            let videoSubtitles = null;
            
            // 如果有当前视频ID，尝试加载对应的字幕数据
            if (currentVideoId) {
                const videoResult = await chrome.storage.local.get(`videoSubtitles_${currentVideoId}`);
                videoSubtitles = videoResult[`videoSubtitles_${currentVideoId}`];
            }
            
            if (globalResponse.success) {
                const { 
                    subtitleEnabled, 
                    englishSettings,
                    chineseSettings,
                    syncSettings
                } = globalResponse.data;
                
                // 更新UI状态
                const subtitleToggle = document.getElementById('subtitleToggle');
                if (subtitleToggle) subtitleToggle.checked = subtitleEnabled;
                
                console.log('📊 loadCurrentState - 数据加载详情:', {
                    当前视频ID: currentVideoId,
                    使用视频特定数据: !!videoSubtitles,
                    全局数据: {
                        英文字幕数量: globalResponse.data.englishSubtitles?.length || 0,
                        中文字幕数量: globalResponse.data.chineseSubtitles?.length || 0
                    },
                    视频数据: videoSubtitles ? {
                        英文字幕数量: videoSubtitles.englishSubtitles?.length || 0,
                        中文字幕数量: videoSubtitles.chineseSubtitles?.length || 0
                    } : null
                });
                
                // 优先使用当前视频的字幕数据，否则使用全局数据作为后备
                if (videoSubtitles) {
                    this.subtitleData = videoSubtitles.subtitleData || [];
                    this.englishSubtitles = videoSubtitles.englishSubtitles || [];
                    this.chineseSubtitles = videoSubtitles.chineseSubtitles || [];
                    this.englishFileName = videoSubtitles.englishFileName || '';
                    this.chineseFileName = videoSubtitles.chineseFileName || '';
                    this.currentFileName = videoSubtitles.fileName || '';
                } else {
                    // 使用全局数据作为后备
                    const { subtitleData, englishSubtitles, chineseSubtitles, englishFileName, chineseFileName } = globalResponse.data;
                    this.subtitleData = subtitleData || [];
                    this.englishSubtitles = englishSubtitles || [];
                    this.chineseSubtitles = chineseSubtitles || [];
                    this.englishFileName = englishFileName || '';
                    this.chineseFileName = chineseFileName || '';
                }
                
                console.log('📂 最终加载的数据状态:', {
                    英文字幕数量: this.englishSubtitles.length,
                    中文字幕数量: this.chineseSubtitles.length,
                    英文文件名: this.englishFileName,
                    中文文件名: this.chineseFileName,
                    单语字幕数量: this.subtitleData.length,
                    使用视频特定数据: !!videoSubtitles,
                    视频ID: currentVideoId
                });
                
                // 定义默认设置，与构造函数保持一致
                const defaultEnglishSettings = {
                    fontSize: 34,
                    fontColor: '#ffffff',
                    fontFamily: '"Noto Serif", Georgia, serif',
                    fontWeight: '700',
                    backgroundOpacity: 20,
                    textShadow: '2px 2px 4px rgba(0, 0, 0, 0.8)',
                    lineHeight: 1.3
                };
                
                const defaultChineseSettings = {
                    fontSize: 32,
                    fontColor: '#ffffff',
                    fontFamily: '"Songti SC", serif',
                    fontWeight: '900',
                    backgroundOpacity: 20,
                    textShadow: '2px 2px 4px rgba(0, 0, 0, 0.8)',
                    lineHeight: 1.4
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
                        await this.updateSettings({ language: 'chinese', data: { 
                            fontWeight: this.chineseSettings.fontWeight,
                            fontFamily: this.chineseSettings.fontFamily  // 确保也包含 fontFamily
                        } });
                    } catch (e) {
                        console.warn('持久化默认字体修正失败，不影响前端显示:', e);
                    }
                }
                this.syncSettings = syncSettings || false;
                
                // 更新同步设置UI
                const syncSettingsCheckbox = document.getElementById('syncSettings');
                if (syncSettingsCheckbox) syncSettingsCheckbox.checked = this.syncSettings;
                
                // 🔧 修复：确保执行顺序，避免竞态条件
                await this.loadAutoLoadSettings();
                
                // 延迟执行字幕统计更新，确保DOM完全就绪
                await this.updateSubtitleInfoWithRetry();
                
                // 加载当前语言设置到UI
                this.loadLanguageSettingsToUI(this.currentLanguage);
            }
        } catch (error) {
            console.error('加载当前状态失败:', error);
            Toast.error('加载设置失败');
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

            Toast.show(`正在解析${language === 'english' ? '英文' : '中文'}字幕文件...`, 'info');

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
            const currentVideoId = await this.getCurrentVideoId();
            let response;
            
            if (language === 'english') {
                this.englishSubtitles = subtitleData;
                this.englishFileName = file.name;
                
                if (currentVideoId) {
                    // 基于视频ID保存字幕
                    response = await chrome.runtime.sendMessage({
                        action: 'saveVideoSubtitles',
                        videoId: currentVideoId,
                        englishSubtitles: this.englishSubtitles,
                        chineseSubtitles: this.chineseSubtitles,
                        englishFileName: this.englishFileName,
                        chineseFileName: this.chineseFileName
                    });
                } else {
                    // 后备方案：使用旧的保存方式
                    response = await chrome.runtime.sendMessage({
                        action: 'saveBilingualSubtitles',
                        englishSubtitles: this.englishSubtitles,
                        chineseSubtitles: this.chineseSubtitles,
                        englishFileName: this.englishFileName,
                        chineseFileName: this.chineseFileName
                    });
                }
            } else {
                this.chineseSubtitles = subtitleData;
                this.chineseFileName = file.name;
                
                if (currentVideoId) {
                    // 基于视频ID保存字幕
                    response = await chrome.runtime.sendMessage({
                        action: 'saveVideoSubtitles',
                        videoId: currentVideoId,
                        englishSubtitles: this.englishSubtitles,
                        chineseSubtitles: this.chineseSubtitles,
                        englishFileName: this.englishFileName,
                        chineseFileName: this.chineseFileName
                    });
                } else {
                    // 后备方案：使用旧的保存方式
                    response = await chrome.runtime.sendMessage({
                        action: 'saveBilingualSubtitles',
                        englishSubtitles: this.englishSubtitles,
                        chineseSubtitles: this.chineseSubtitles,
                        englishFileName: this.englishFileName,
                        chineseFileName: this.chineseFileName
                    });
                }
            }

            if (response.success) {
                this.updateSubtitleInfoWithRetry();
                this.updateFileCardState(language, true);
                
                // 更新自动加载状态显示
                this.getCurrentVideoInfo();
                
                Toast.success(`成功加载 ${subtitleData.length} 条${language === 'english' ? '英文' : '中文'}字幕`);
                
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
            Toast.error('文件处理失败: ' + error.message);
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
        this.updateSubtitleInfoWithRetry();
        
        // 更新自动加载状态显示
        this.getCurrentVideoInfo();
        
        // 保存到后台 - 基于当前视频ID
        this.getCurrentVideoId().then(currentVideoId => {
            if (currentVideoId) {
                // 基于视频ID保存字幕
                chrome.runtime.sendMessage({
                    action: 'saveVideoSubtitles',
                    videoId: currentVideoId,
                    englishSubtitles: this.englishSubtitles,
                    chineseSubtitles: this.chineseSubtitles,
                    englishFileName: this.englishFileName,
                    chineseFileName: this.chineseFileName
                });
            } else {
                // 后备方案：使用旧的保存方式
                chrome.runtime.sendMessage({
                    action: 'saveBilingualSubtitles',
                    englishSubtitles: this.englishSubtitles,
                    chineseSubtitles: this.chineseSubtitles,
                    englishFileName: this.englishFileName,
                    chineseFileName: this.chineseFileName
                });
            }
        });
        
        Toast.success(`已移除${language === 'english' ? '英文' : '中文'}字幕`);
    }

    // 简化版：直接调用更新方法，避免复杂重试逻辑
    async updateSubtitleInfoWithRetry() {
        this.updateSubtitleInfo();
    }

    updateSubtitleInfo() {
        const englishCountEl = document.getElementById('englishCount');
        const chineseCountEl = document.getElementById('chineseCount');
        if (englishCountEl) englishCountEl.textContent = `${this.englishSubtitles.length}条`;
        if (chineseCountEl) chineseCountEl.textContent = `${this.chineseSubtitles.length}条`;
        // 同步文件卡片状态
        this.updateFileCardState('english', !!this.englishFileName);
        this.updateFileCardState('chinese', !!this.chineseFileName);
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
            const currentVideoId = await this.getCurrentVideoId();
            
            if (currentVideoId) {
                // 清除当前视频的字幕数据
                await chrome.storage.local.remove(`videoSubtitles_${currentVideoId}`);
                console.log('已清除视频字幕数据:', currentVideoId);
            }
            
            // 同时清除旧的全局存储作为后备
            const response = await chrome.runtime.sendMessage({ action: 'clearSubtitleData' });
            if (response.success) {
                this.subtitleData = [];
                this.englishSubtitles = [];
                this.chineseSubtitles = [];
                this.currentFileName = '';
                this.englishFileName = '';
                this.chineseFileName = '';
                this.updateSubtitleInfoWithRetry();
                
                // 更新自动加载状态显示
                this.getCurrentVideoInfo();
                
                // 注意：不再自动关闭字幕开关，让用户手动控制
                
                Toast.success('字幕数据已清除');
            }
        } catch (error) {
            console.error('清除字幕失败:', error);
            Toast.error('清除失败: ' + error.message);
        }
    }

    // 强制重置处理（双击确认机制）
    async handleForceReset(button) {
        if (!button.classList.contains('confirm')) {
            // 第一次点击：进入确认状态
            button.classList.add('confirm');
            button.title = '再次点击确认重置 (3秒后取消)';
            Toast.warning('⚠️ 再次点击确认重置所有数据');
            
            // 3秒后自动取消确认状态
            setTimeout(() => {
                if (button.classList.contains('confirm')) {
                    button.classList.remove('confirm');
                    button.title = '强制重置所有扩展数据（包括设置）';
                }
            }, 3000);
            
            return;
        }
        
        // 第二次点击：执行重置
        try {
            button.classList.remove('confirm');
            button.disabled = true;
            
            Toast.show('🔄 正在执行强制重置...', 'info');
            console.log('🔄 用户确认执行强制重置');
            
            // 调用background服务的强制重置方法
            const response = await chrome.runtime.sendMessage({ action: 'forceReset' });
            
            if (response.success) {
                // 重置本地状态
                this.subtitleData = [];
                this.englishSubtitles = [];
                this.chineseSubtitles = [];
                this.currentFileName = '';
                this.englishFileName = '';
                this.chineseFileName = '';
                
                // 重置设置为默认值
                this.englishSettings = {
                    fontSize: 34,
                    fontColor: '#ffffff',
                    fontFamily: '"Noto Serif", Georgia, serif',
                    fontWeight: '700',
                    backgroundOpacity: 20,
                    textShadow: '2px 2px 4px rgba(0, 0, 0, 0.8)',
                    lineHeight: 1.3
                };
                
                this.chineseSettings = {
                    fontSize: 32,
                    fontColor: '#ffffff',
                    fontFamily: '"Songti SC", serif',
                    fontWeight: '900',
                    backgroundOpacity: 20,
                    textShadow: '2px 2px 4px rgba(0, 0, 0, 0.8)',
                    lineHeight: 1.4
                };
                
                this.syncSettings = false;
                this.autoLoadEnabled = false;
                this.serverUrl = 'http://127.0.0.1:8888';
                
                // 强制刷新界面
                await this.loadCurrentState();
                this.updateSubtitleInfo();
                this.updateSettingsDisplay();
                
                Toast.success('🎉 强制重置完成！所有数据已重置为默认状态');
                console.log('✅ 强制重置完成');
            } else {
                throw new Error(response.error || '重置失败');
            }
        } catch (error) {
            console.error('强制重置失败:', error);
            Toast.error('重置失败: ' + error.message);
        } finally {
            button.disabled = false;
            button.title = '强制重置所有扩展数据（包括设置）';
        }
    }

    async toggleSubtitle(enabled) {
        try {
            const response = await chrome.runtime.sendMessage({
                action: 'toggleSubtitle',
                enabled: enabled
            });
            
            if (response.success) {
                Toast.success(enabled ? '字幕显示已开启' : '字幕显示已关闭');
            } else {
                throw new Error(response.error);
            }
        } catch (error) {
            console.error('切换字幕状态失败:', error);
            Toast.error('操作失败: ' + error.message);
            
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
            // Toast.success('设置已保存'); // 已保存反馈改为静默，UI变化已足够反馈
            
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
            lineHeight: 1.3
        };
        
        // 默认中文设置 (32px基础)
        const defaultChineseSettings = {
            fontSize: 32,
            fontColor: '#ffffff',
            fontFamily: '"Songti SC", serif',
            fontWeight: '900',
            backgroundOpacity: 20,
            textShadow: '2px 2px 4px rgba(0, 0, 0, 0.8)',
            lineHeight: 1.4
        };
        
        // 更新设置对象
        this.englishSettings = { ...defaultEnglishSettings };
        this.chineseSettings = { ...defaultChineseSettings };
        this.syncSettings = false;
        
        // 更新UI
        const syncSettingsCheckbox = document.getElementById('syncSettings');
        if (syncSettingsCheckbox) syncSettingsCheckbox.checked = false;

        // 加载当前语言设置到UI
        this.loadLanguageSettingsToUI(this.currentLanguage);
        
        // 保存设置
        this.updateSettings({ language: 'english', data: defaultEnglishSettings });
        this.updateSettings({ language: 'chinese', data: defaultChineseSettings });
        this.updateSettings({ sync: false });

        // 显示状态
        // Toast.success('设置已保存'); // 已保存反馈改为静默，UI变化已足够反馈
        Toast.success('已恢复默认设置');
    }

    showHelp() {
        // Toast.show('使用方法：分别选择英文和中文SRT/VTT字幕文件，在YouTube视频页面启用双语显示', 'info'); // 在关于页面不需要toast提示
        this.switchTab('about'); // 自动切换到关于页面
    }

    showFeedback() {
        // Toast.show('如有问题请通过Chrome扩展商店反馈', 'info'); // 不需要toast提示
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
        console.log('🚀 初始化自动加载模式');
        
        // 获取当前视频信息
        this.getCurrentVideoInfo();
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

            // 🔧 修复：主动检测服务器状态
            console.log('🔍 开始检测服务器状态...', this.serverUrl);
            await this.checkServerStatus();
            
        } catch (error) {
            console.error('加载自动加载设置失败:', error);
            this.updateServerStatus('error', '设置加载失败', error.message);
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

            Toast.show(
                enabled ? '自动加载已启用' : '自动加载已禁用', 
                enabled ? 'success' : 'info'
            );

            if (enabled) {
                this.checkServerStatus();
            }

        } catch (error) {
            console.error('切换自动加载状态失败:', error);
            Toast.error('设置失败: ' + error.message);
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
            Toast.success('服务器连接正常');
        } else {
            Toast.error('服务器连接失败，请检查服务器是否启动');
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
            // 向content script发送消息获取视频信息（不依赖读取tab.url权限）
            chrome.tabs.sendMessage(currentTab.id, { action: 'getVideoInfo' }, (response) => {
                if (chrome.runtime.lastError || !response || !response.videoId) {
                    this.updateVideoDisplay(null, '未在YouTube页面');
                    return;
                }
                this.updateVideoDisplay(response.videoId, response.subtitleLoaded ? '已加载字幕' : '无字幕');
                this.syncSubtitleDataFromContentScript()
                    .then(() => {
                        console.log('📊 字幕数据同步完成，最终统计:', {
                            英文字幕: this.englishSubtitles.length,
                            中文字幕: this.chineseSubtitles.length,
                            字幕加载状态: response.subtitleLoaded
                        });
                    })
                    .catch(error => console.error('❌ 字幕数据同步失败:', error));
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

    async syncSubtitleDataFromContentScript() {
        try {
            console.log('🔄 开始同步字幕数据...');
            
            // 获取当前视频ID
            const currentVideoId = await this.getCurrentVideoId();
            
            if (currentVideoId) {
                // 优先从基于videoId的存储中获取数据
                const videoResult = await chrome.storage.local.get(`videoSubtitles_${currentVideoId}`);
                const videoSubtitles = videoResult[`videoSubtitles_${currentVideoId}`];
                
                if (videoSubtitles) {
                    // 使用当前视频的字幕数据
                    const oldEnglishCount = this.englishSubtitles.length;
                    const oldChineseCount = this.chineseSubtitles.length;
                    
                    this.subtitleData = videoSubtitles.subtitleData || [];
                    this.englishSubtitles = videoSubtitles.englishSubtitles || [];
                    this.chineseSubtitles = videoSubtitles.chineseSubtitles || [];
                    this.englishFileName = videoSubtitles.englishFileName || '';
                    this.chineseFileName = videoSubtitles.chineseFileName || '';
                    this.currentFileName = videoSubtitles.fileName || '';
                    
                    console.log('📊 字幕数据已同步(基于videoId):', {
                        视频ID: currentVideoId,
                        英文字幕: `${oldEnglishCount} → ${this.englishSubtitles.length}`,
                        中文字幕: `${oldChineseCount} → ${this.chineseSubtitles.length}`,
                        英文文件名: this.englishFileName,
                        中文文件名: this.chineseFileName
                    });
                } else {
                    // 当前视频没有字幕数据，清空显示
                    const oldEnglishCount = this.englishSubtitles.length;
                    const oldChineseCount = this.chineseSubtitles.length;
                    
                    this.subtitleData = [];
                    this.englishSubtitles = [];
                    this.chineseSubtitles = [];
                    this.englishFileName = '';
                    this.chineseFileName = '';
                    this.currentFileName = '';
                    
                    console.log('📊 字幕数据已清空(当前视频无字幕):', {
                        视频ID: currentVideoId,
                        英文字幕: `${oldEnglishCount} → 0`,
                        中文字幕: `${oldChineseCount} → 0`
                    });
                }
            } else {
                // 无法获取视频ID，使用全局数据作为后备
                console.log('⚠️ 无法获取视频ID，使用全局数据作为后备');
                const response = await chrome.runtime.sendMessage({ action: 'getBilingualSubtitleData' });
                if (response.success) {
                    const oldEnglishCount = this.englishSubtitles.length;
                    const oldChineseCount = this.chineseSubtitles.length;
                    
                    this.englishSubtitles = response.data.englishSubtitles || [];
                    this.chineseSubtitles = response.data.chineseSubtitles || [];
                    this.englishFileName = response.data.englishFileName || '';
                    this.chineseFileName = response.data.chineseFileName || '';
                    
                    console.log('📊 字幕数据已同步(全局后备):', {
                        英文字幕: `${oldEnglishCount} → ${this.englishSubtitles.length}`,
                        中文字幕: `${oldChineseCount} → ${this.chineseSubtitles.length}`,
                        英文文件名: this.englishFileName,
                        中文文件名: this.chineseFileName
                    });
                }
            }
            
            // 更新统计显示
            this.updateSubtitleInfoWithRetry();
        } catch (error) {
            console.error('❌ 同步字幕数据异常:', error);
        }
    }
    
    // 🔧 增强的调试功能
    debugSubtitles() {
        console.log('🔍 手动调试字幕统计功能');
        console.log('当前controller实例:', this);
        console.log('字幕数据:', {
            英文字幕: this.englishSubtitles.length,
            中文字幕: this.chineseSubtitles.length,
            英文文件名: this.englishFileName,
            中文文件名: this.chineseFileName
        });
        
        // 手动触发更新
        console.log('🔄 触发字幕统计更新...');
        this.updateSubtitleInfoWithRetry();
        
        // 检查DOM元素
        const englishCount = document.getElementById('englishCount');
        const chineseCount = document.getElementById('chineseCount');
        console.log('DOM元素状态:', {
            englishCount: {
                存在: !!englishCount,
                内容: englishCount?.textContent,
                可见: englishCount?.offsetParent !== null,
                样式: englishCount ? getComputedStyle(englishCount).display : 'N/A'
            },
            chineseCount: {
                存在: !!chineseCount,
                内容: chineseCount?.textContent,
                可见: chineseCount?.offsetParent !== null,
                样式: chineseCount ? getComputedStyle(chineseCount).display : 'N/A'
            },
            DOM就绪状态: document.readyState
        });
        
        // 检查当前视频状态
        this.getCurrentVideoId().then(videoId => {
            console.log('当前视频状态:', {
                视频ID: videoId,
                是否在YouTube页面: window.location.href.includes('youtube.com'),
                当前URL: window.location.href
            });
            
            if (videoId) {
                chrome.storage.local.get(`videoSubtitles_${videoId}`).then(result => {
                    console.log('视频级别存储数据:', result);
                });
            }
        });
        
        return '调试完成，请查看控制台日志';
    }
    
    // 🔧 新增：强制刷新统计信息的调试方法
    forceRefreshStats() {
        console.log('🔄 强制刷新字幕统计信息');
        
        // 重新从存储加载数据
        this.loadCurrentState().then(() => {
            console.log('✅ 数据重新加载完成，统计信息已更新');
        }).catch(error => {
            console.error('❌ 数据重新加载失败:', error);
        });
        
        return '强制刷新已启动，请查看控制台';
    }
    
    // 🔧 新增：实时监控统计信息变化
    monitorStats(duration = 10000) {
        console.log(`📊 开始监控字幕统计信息变化 (${duration/1000}秒)`);
        
        const startTime = Date.now();
        let previousStats = {
            english: this.englishSubtitles.length,
            chinese: this.chineseSubtitles.length
        };
        
        const monitorInterval = setInterval(() => {
            const currentStats = {
                english: this.englishSubtitles.length,
                chinese: this.chineseSubtitles.length
            };
            
            const englishElement = document.getElementById('englishCount');
            const chineseElement = document.getElementById('chineseCount');
            
            console.log(`📈 [${new Date().toLocaleTimeString()}] 统计监控:`, {
                数据层面: currentStats,
                DOM显示: {
                    英文: englishElement?.textContent || 'N/A',
                    中文: chineseElement?.textContent || 'N/A'
                },
                数据是否变化: JSON.stringify(currentStats) !== JSON.stringify(previousStats),
                DOM元素存在: {
                    英文: !!englishElement,
                    中文: !!chineseElement
                }
            });
            
            // 检测到数据变化时强制更新显示
            if (JSON.stringify(currentStats) !== JSON.stringify(previousStats)) {
                console.log('🔄 检测到数据变化，强制更新显示');
                this.updateSubtitleInfoWithRetry();
                previousStats = { ...currentStats };
            }
            
            // 检查是否需要停止监控
            if (Date.now() - startTime >= duration) {
                clearInterval(monitorInterval);
                console.log('⏹️ 监控结束');
            }
        }, 1000);
        
        return `监控已启动，将持续${duration/1000}秒`;
    }
    
    // 🔧 新增：主动检查当前视频的字幕状态
    async checkCurrentVideoSubtitleStatus() {
        try {
            console.log('🔍 主动检查当前视频字幕状态...');
            
            // 获取当前活动的标签页并询问content script
            const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
            if (tabs.length === 0) return;
            chrome.tabs.sendMessage(tabs[0].id, { action: 'getSubtitleStatus' }, (response) => {
                if (chrome.runtime.lastError || !response) {
                    console.log('📺 无法连接到content script，可能页面未完全加载');
                    return;
                }
                console.log('📊 收到content script状态反馈:', response);
                if (response.hasSubtitles && (response.englishCount > 0 || response.chineseCount > 0)) {
                    this.syncSubtitleDataFromContentScript()
                        .then(() => this.updateSubtitleInfoWithRetry())
                        .catch(error => console.error('❌ 初始化字幕数据同步失败:', error));
                }
            });
            
        } catch (error) {
            console.error('❌ 检查视频字幕状态失败:', error);
        }
    }
}

// 初始化popup控制器
document.addEventListener('DOMContentLoaded', () => {
    // 启动控制器；计数更新由控制器内部统一管理
    new PopupController();
});
