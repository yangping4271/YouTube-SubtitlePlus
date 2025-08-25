# YouTube本地字幕显示器

一个Chrome扩展，可以在YouTube视频上显示您的本地字幕文件。

## 📁 项目结构

```
Youtube-Translator/
├── extension/              # Chrome扩展文件（必须加载到浏览器）
│   ├── manifest.json       # 扩展配置文件
│   ├── content.js          # 内容脚本（YouTube页面注入）
│   ├── background.js       # 后台服务worker
│   ├── popup.html          # 扩展弹窗界面
│   ├── popup.js            # 弹窗逻辑脚本
│   ├── popup.css           # 弹窗样式
│   ├── subtitle-overlay.css # 字幕显示样式
│   └── icons/              # 扩展图标
│       ├── icon16.png      # 16x16工具栏图标
│       ├── icon48.png      # 48x48管理页图标
│       └── icon128.png     # 128x128商店图标
├── docs/                   # 文档文件
│   ├── README.md           # 详细使用说明
│   └── INSTALL.md          # 安装和测试指南
└── examples/               # 示例文件
    └── example-subtitle.srt # 测试用字幕文件
```

## 🚀 快速开始

### 安装扩展
1. 打开Chrome浏览器
2. 访问 `chrome://extensions/`
3. 开启"开发者模式"
4. 点击"加载已解压的扩展程序"
5. **选择 `extension` 文件夹**（重要：只选择extension文件夹）

### 使用方法

#### 单语字幕
1. 打开任意YouTube视频
2. 点击扩展图标（工具栏中的字幕图标）
3. 上传SRT或VTT字幕文件
4. 开启"启用字幕显示"开关
5. 字幕将自动与视频同步显示

#### 双语字幕
1. 打开任意YouTube视频
2. 点击扩展图标
3. 分别上传英文和中文字幕文件（SRT/VTT格式）
4. 开启"启用字幕显示"开关
5. 英文字幕将显示在上方，中文字幕显示在下方

## ✨ 功能特点

- ✅ 支持SRT和VTT字幕格式
- ✅ **双语字幕显示**：同时显示英文和中文字幕
- ✅ 实时同步视频播放进度
- ✅ 自定义字幕样式（字体大小、颜色、位置等）
- ✅ 支持拖拽上传字幕文件
- ✅ 响应式设计，适配全屏和剧场模式
- ✅ 简洁易用的操作界面
- ✅ 智能背景适配，每个字幕独立背景

## 📝 技术特性

- 基于Chrome Manifest V3开发
- 使用现代JavaScript ES6+语法
- 响应式CSS设计
- 高性能的字幕解析和同步算法
- 安全的本地数据存储

## 🔧 开发说明

- **extension/**: 包含所有必需的Chrome扩展文件
- **docs/**: 用户文档和说明
- **examples/**: 测试用的示例文件

## 📄 许可证

本项目采用MIT许可证。

---

**享受更好的YouTube观看体验！** 🎬