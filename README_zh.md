# YouTube-SubtitlePlus

[中文版本](./README_zh.md) | [English](./README.md)

一个现代化的 Chrome 扩展，为 YouTube 视频提供本地字幕文件显示功能，支持高级双语字幕、自动加载和全面的样式自定义。

## ✨ 核心特性

### 🎯 核心功能
- **智能自动加载**：基于 YouTube 视频 ID 自动加载字幕文件
- **双语字幕支持**：同时显示英文和中文字幕
- **多格式支持**：智能解析 ASS、SRT 和 VTT 字幕格式
- **实时同步**：与视频播放完美同步
- **响应式设计**：无缝适配全屏、剧场和迷你播放器模式

### 🎨 高级自定义
- **字体控制**：字体大小 (12-32px)、颜色和粗细自定义
- **背景设置**：可调节透明度 (0-100%) 和颜色选项
- **定位系统**：底部、顶部或中央对齐，支持智能自动调整
- **布局引擎**：基于现代 Flexbox 的双语字幕布局，优化间距
- **样式预设**：快速应用标准、大字幕、高对比度和影院模式预设

### 🚀 现代架构
- **Chrome Manifest V3**：采用最新扩展标准构建
- **本地 HTTP 服务器**：基于 Flask 的自动加载服务器和 REST API
- **智能解析**：智能 ASS 格式解析，基于样式的语言检测
- **性能优化**：高效的 DOM 操作和内存管理
- **开发者友好**：完整的调试工具和可扩展代码库

## 📁 项目架构

```
YouTube-SubtitlePlus/
├── extension/                  # Chrome 扩展核心
│   ├── manifest.json          # 扩展配置 (Manifest V3)
│   ├── content.js             # YouTube 集成的主要内容脚本
│   ├── background.js          # 扩展生命周期服务工作者
│   ├── popup.html/js/css      # 用户界面和样式
│   ├── subtitle-overlay.css   # 高级字幕显示样式
│   └── icons/                 # 扩展图标集 (16px, 48px, 128px)
├── server/                    # 自动加载服务器
│   ├── subtitle_server.py     # Flask HTTP 服务器
│   ├── pyproject.toml         # 现代 Python 项目配置 (uv)
│   ├── requirements.txt       # 备用 pip 依赖
│   └── README.md              # 服务器文档和 API 参考
├── subtitles/                 # 本地字幕存储
│   └── [VideoID].ass         # 按 YouTube 视频 ID 命名的字幕文件
├── scripts/                   # 管理脚本
│   ├── server/               # 服务器守护进程管理
│   └── subtitles/            # 字幕文件管理
├── examples/                  # 示例文件
│   └── example-subtitle.srt   # 测试用示例字幕
├── daemon_server.sh          # 后台服务器启动脚本（软链接）
└── daemon_status.sh          # 服务器状态检查脚本（软链接）
```

## 🚀 快速安装和设置

### 方法一：Chrome 扩展安装

1. **下载或克隆**此仓库
2. **打开 Chrome** 并访问 `chrome://extensions/`
3. **启用开发者模式**（右上角开关）
4. **加载已解压的扩展程序** → 选择 `extension/` 文件夹
5. **验证安装** → 工具栏应出现扩展图标

### 方法二：自动加载服务器设置（推荐）

#### 前提条件
安装 **uv**（现代 Python 包管理器）：
```bash
# macOS/Linux
curl -LsSf https://astral.sh/uv/install.sh | sh

#### 服务器设置
```bash
# 1. 启动自动加载服务器
./daemon_server.sh

# 2. 添加字幕文件到 subtitles/ 目录
# 格式：[YouTube-视频-ID].[扩展名]
# 例如：TnhCX0KkPqs.ass 对应 https://youtube.com/watch?v=TnhCX0KkPqs

# 3. 在扩展弹窗中启用自动加载
# 打开扩展 → "自动加载"标签 → 开启"启用自动加载"

# 4. 检查服务器状态
./daemon_status.sh
```

## 💡 使用指南

### 🤖 自动加载模式（智能高效）

1. **准备字幕**：将字幕文件放在 `subtitles/` 目录中
   - 命名格式：`[视频ID].ass`（例如：`TnhCX0KkPqs.ass`）
   - 支持格式：ASS（双语）、SRT、VTT

2. **启动服务器**：运行 `./daemon_server.sh`

3. **启用自动加载**：
   - 点击扩展图标 → "自动加载"标签
   - 开启"启用自动加载"开关

4. **观看视频**：打开 YouTube 视频时字幕自动加载

### 📁 手动上传模式（传统方式）

1. **打开 YouTube 视频**：导航到任意 YouTube 视频
2. **访问扩展**：点击工具栏中的扩展图标
3. **选择上传方式**：
   - **🤖 自动加载**：用于带自动语言检测的双语 ASS 文件
   - **📑 手动上传**：用于分别上传 SRT/VTT 文件

4. **配置显示**：开启"启用字幕"开关并自定义外观

## ⚙️ 高级配置

### 样式自定义选项

| 设置 | 范围 | 默认值 | 描述 |
|------|------|--------|------|
| **字体大小** | 12-32px | 16px | 字幕文字大小 |
| **字体颜色** | 全光谱 | 白色 | 文字颜色选择器 |
| **背景透明度** | 0-100% | 60% | 字幕背景透明度 |
| **位置** | 底部/顶部/中央 | 底部 | 垂直对齐方式 |
| **间距** | 自动优化 | 2px | 字幕间距 |

### 快速样式预设

- **标准**：16px，白色文字，60% 背景
- **大字幕**：24px，增强可读性
- **高对比度**：粗体文字，不透明背景
- **影院**：针对全屏观看优化

## 🔧 技术实现

### 字幕格式支持

#### ASS（高级字幕格式）
- **双语解析**：通过样式分析自动检测英文/中文
- **样式识别**：`Default` 样式 → 英文，`Secondary` 样式 → 中文
- **丰富格式**：字体样式、定位和特效支持
- **性能**：高效处理 1000+ 字幕条目

#### SRT/VTT（标准格式）
- **通用兼容性**：标准时间戳和文本解析
- **手动语言分配**：用户控制的语言选择
- **轻量处理**：优化快速加载

### 架构特点

#### 现代扩展框架
- **Manifest V3 兼容**：面向未来的 Chrome 扩展架构
- **Service Worker 集成**：高效后台处理
- **内容脚本优化**：对 YouTube 页面影响最小

#### 高级显示引擎
- **Flexbox 布局系统**：完美的双字幕对齐和间距
- **自适应定位**：实时调整视频播放器变化
- **性能监控**：智能 DOM 更新和内存管理
- **多模式支持**：全屏、剧场、画中画兼容

#### 本地服务器架构
- **Flask REST API**：清洁的 HTTP 端点设计
- **CORS 配置**：安全的跨源请求
- **进程管理**：优雅启动/关闭，PID 跟踪
- **现代 Python 工具**：uv 包管理，备用支持

## 📖 文档

- **[服务器文档](./server/README.md)**：API 参考和故障排除
- **[守护进程指南](./DAEMON_GUIDE.md)**：后台服务器管理指南
- **[开发指南](./CLAUDE.md)**：开发者技术文档
- **[英文文档](./README.md)**：English documentation

## 🛠️ 开发

### 开发设置
```bash
# 克隆仓库
git clone https://github.com/username/YouTube-SubtitlePlus.git
cd YouTube-SubtitlePlus

# 在 Chrome 中加载扩展
# 访问 chrome://extensions/ → 开启开发者模式 → 加载已解压的扩展程序 → 选择 extension/

# 启动开发服务器
./daemon_server.sh
```

### 代码架构
- **前端**：Vanilla JavaScript (ES6+)，现代 CSS3 与 Flexbox
- **后端**：Python Flask 与 uv 包管理
- **扩展 API**：Chrome storage，runtime messaging，tabs management
- **构建工具**：无需构建过程 - 直接开发工作流

### 测试和质量保证
- **手动测试**：所有字幕格式的全面测试用例
- **性能测试**：内存使用和 DOM 影响监控
- **兼容性测试**：多浏览器和 YouTube 布局验证
- **调试工具**：控制台日志和错误跟踪集成

## 🤝 贡献

1. **Fork 仓库** → 创建功能分支
2. **遵循代码标准** → ES6+ JavaScript，语义化提交
3. **全面测试** → 所有字幕格式和 YouTube 模式
4. **提交 Pull Request** → 包含详细变更描述

### 代码风格指南
- 现代 JavaScript (ES6+)，清晰的变量命名
- 适当情况下采用 BEM 方法论的模块化 CSS
- 全面的错误处理和日志记录
- 性能优先的 DOM 操作

## 📄 许可证

本项目基于 **MIT 许可证** 授权。详情请参阅 LICENSE 文件。

## 🌟 致谢

- **Chrome Extensions API**：提供强大的扩展框架
- **YouTube**：提供平台集成机会
- **开源社区**：提供灵感和技术指导
- **uv 项目**：现代 Python 依赖管理

---

**用专业字幕支持改变您的 YouTube 体验！** 🎬✨