# YouTube本地字幕显示器

[中文版本](./README_zh.md) | [English](./README.md)

一个Chrome扩展，可以在YouTube视频上显示您的本地字幕文件，支持单语和双语字幕显示以及实时样式自定义。

## 🌟 功能特点

- ✅ **双语字幕显示**：同时显示英文和中文字幕
- ✅ **多格式支持**：支持SRT和VTT字幕格式
- ✅ **实时同步**：与视频播放进度完美同步
- ✅ **自定义样式**：字体大小、颜色、位置和透明度设置
- ✅ **拖拽上传**：简单的字幕文件管理
- ✅ **响应式设计**：适配全屏和剧场模式
- ✅ **智能背景**：每个字幕行独立背景
- ✅ **用户友好界面**：直观的弹窗操作界面

## 📁 项目结构

```
Youtube-Translator/
├── extension/              # Chrome扩展文件（加载此文件夹）
│   ├── manifest.json       # 扩展配置文件
│   ├── content.js          # 内容脚本（注入YouTube页面）
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
│   └── INSTALL.md          # 安装指南
└── examples/               # 示例文件
    └── example-subtitle.srt # 示例字幕文件
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
2. 点击工具栏中的扩展图标
3. 上传SRT或VTT字幕文件
4. 开启"启用字幕显示"开关
5. 字幕将自动与视频同步显示

#### 双语字幕
1. 打开任意YouTube视频
2. 点击扩展图标
3. 分别上传英文和中文字幕文件（SRT/VTT格式）
4. 开启"启用字幕显示"开关
5. 英文字幕将显示在上方，中文字幕显示在下方

## ⚙️ 自定义设置

### 样式设置
- **字体大小**：12px - 32px（默认：16px）
- **字体颜色**：完全可自定义（默认：白色）
- **背景透明度**：0-100%（默认：60%）
- **位置设置**：底部/顶部/中央对齐
- **快速预设**：标准、大字幕、高对比、影院模式

### 支持格式
- **SRT**：SubRip字幕格式
- **VTT**：WebVTT字幕格式

## 💻 技术特性

- 基于Chrome Manifest V3开发
- 使用现代JavaScript ES6+语法
- 响应式CSS设计
- 高性能字幕解析和同步算法
- 安全的本地数据存储
- ResizeObserver和MutationObserver优化

## 📖 文档

- [安装指南](./docs/INSTALL.md)
- [用户手册](./docs/README.md)
- [English Documentation](./README.md)

## 🔧 开发说明

- **extension/**: 包含所有必需的Chrome扩展文件
- **docs/**: 用户文档和说明
- **examples/**: 测试用的示例文件

## 📄 许可证

本项目采用MIT许可证。

## 🤝 贡献

1. Fork 本仓库
2. 创建功能分支
3. 提交您的更改
4. 发起 Pull Request

## 📞 支持

如果您遇到任何问题或有建议：
- 在GitHub上创建Issue
- 查看 `docs/` 文件夹中的文档

---

**享受更好的YouTube观看体验！** 🎬