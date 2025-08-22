# YouTube本地字幕显示器 - 项目配置

## 项目概述
YouTube本地字幕显示器是一个Chrome扩展，允许用户在YouTube视频上显示本地字幕文件(SRT/VTT格式)。

## 开发环境配置

### 项目结构
```
Chrome-Translator/
├── extension/              # Chrome扩展核心文件
│   ├── manifest.json       # 扩展配置
│   ├── content.js          # 内容脚本
│   ├── background.js       # 后台服务
│   ├── popup.html/js/css   # 用户界面
│   └── icons/              # 扩展图标
├── docs/                   # 项目文档
├── examples/               # 示例文件
└── tests/                  # 测试工具
```

### 开发规范

#### 代码风格
- 使用ES6+语法
- 避免使用过多的`!important`CSS声明
- 保持代码简洁、可读性强
- 使用有意义的变量和函数命名

#### 测试和调试
- 扩展安装：选择`extension/`文件夹加载
- 测试页面：任意YouTube视频页面
- 调试工具：浏览器开发者工具Console
- 全局测试函数：`testSubtitleNow()`

#### 文件管理
- **必需文件**：放在`extension/`文件夹
- **文档文件**：放在`docs/`文件夹  
- **示例文件**：放在`examples/`文件夹
- **调试工具**：放在`tests/`文件夹

### 技术栈
- **Chrome Manifest V3**
- **Vanilla JavaScript (ES6+)**
- **CSS3 (响应式设计)**
- **Chrome Extensions API**
  - chrome.storage (本地存储)
  - chrome.runtime (消息传递)
  - chrome.tabs (标签页管理)

### 核心功能模块

#### 1. 字幕解析 (SubtitleParser)
- SRT格式解析
- VTT格式解析
- 时间戳转换
- HTML标签清理

#### 2. 字幕显示 (YouTubeSubtitleOverlay)
- DOM元素创建和管理
- 样式应用和定位
- 视频时间同步
- 响应式布局适配

#### 3. 用户界面 (Popup)
- 文件上传处理
- 字幕开关控制
- 样式设置调整
- 状态信息显示

#### 4. 后台服务 (Background)
- 数据存储管理
- 消息路由处理
- 设置配置管理
- 扩展生命周期管理

### 开发指南

#### 本地开发
1. 修改`extension/`文件夹中的代码
2. 在`chrome://extensions/`重新加载扩展
3. 刷新YouTube页面测试功能
4. 使用开发者工具查看调试信息

#### 功能测试
- **基础功能**：字幕文件上传和显示
- **同步测试**：视频播放时字幕同步
- **样式测试**：全屏、剧场模式适配
- **性能测试**：大字幕文件处理

#### 代码提交
- 使用语义化提交信息
- 包含功能描述和技术细节
- 添加Claude Code生成标识

### 常见问题解决

#### 字幕不显示
1. 检查字幕是否正确上传
2. 确认字幕开关已开启
3. 验证视频时间在字幕范围内
4. 使用`testSubtitleNow()`测试

#### 样式被覆盖
- 使用`position: fixed`确保定位
- 设置高`z-index`值避免遮挡
- 在关键样式使用`!important`

#### 性能优化
- 避免频繁DOM操作
- 使用事件委托减少监听器
- 合理使用ResizeObserver

### 发布准备

#### 扩展商店发布
1. 准备扩展描述和截图
2. 设置合适的权限申请
3. 测试不同Chrome版本兼容性
4. 准备隐私政策文档

#### 版本管理
- 遵循语义化版本号 (major.minor.patch)
- 更新manifest.json中的版本号
- 记录CHANGELOG变更日志

## 项目状态
- ✅ 核心功能完成
- ✅ UI界面优化
- ✅ 代码结构规范
- ✅ 文档完善
- 🔄 持续优化中

---
*最后更新：2024年8月*