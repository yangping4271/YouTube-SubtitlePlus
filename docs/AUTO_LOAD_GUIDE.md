# YouTube SubtitlePlus 自动加载功能使用指南

## 功能概述

YouTube SubtitlePlus 现在支持从本地自动加载字幕文件，无需手动上传。通过运行本地字幕服务器，扩展可以根据YouTube视频ID自动匹配并加载对应的字幕文件。

## 环境要求

- **操作系统**: Unix/Linux/macOS (推荐) 或 Windows WSL
- **Python**: 3.8+ 
- **包管理器**: uv (推荐) 或 pip

## 快速开始

### 1. 安装uv（推荐）

```bash
# 使用官方安装脚本
curl -LsSf https://astral.sh/uv/install.sh | sh

# 或使用pip安装
pip install uv
```

### 2. 启动本地字幕服务器

```bash
# 一键启动（自动处理依赖）
./start_server.sh

# 或直接使用uv运行
cd server
uv run subtitle_server.py
```

服务器将在 `http://127.0.0.1:8888` 启动。

### 3. 添加字幕文件

将字幕文件放入 `subtitles` 目录，文件名格式为：
```
<YouTube视频ID>.<格式>
```

示例：
- `QSqc6MMS6Fk.ass` - 对应视频 https://www.youtube.com/watch?v=QSqc6MMS6Fk
- `abc123def456.srt` - 对应视频 https://www.youtube.com/watch?v=abc123def456

### 4. 在Chrome扩展中启用自动加载

1. 打开YouTube页面
2. 点击扩展图标打开弹窗
3. 切换到"自动加载"标签页
4. 点击"启用自动加载"开关
5. 确认服务器状态为"已连接"

## 高级用法

### 使用uv进行开发

```bash
# 进入服务器目录
cd server

# 同步依赖
uv sync

# 运行服务器
uv run subtitle_server.py

# 自定义参数
uv run subtitle_server.py --port 9999 --subtitle-dir /custom/path

# 调试模式
uv run subtitle_server.py --debug
```

## 支持的字幕格式

### ASS格式（推荐）
- 支持双语字幕（英文+中文）
- 自动识别English和Chinese样式
- 保持原有格式和时间轴

### SRT/VTT格式
- 标准单语字幕格式
- 自动解析时间轴和文本

## 文件命名规则

### 获取YouTube视频ID

从YouTube网址提取视频ID：
```
https://www.youtube.com/watch?v=QSqc6MMS6Fk
                              └── 这部分就是视频ID
```

### 文件命名示例

```
subtitles/
├── QSqc6MMS6Fk.ass          # ASS双语字幕
├── dQw4w9WgXcQ.srt          # SRT单语字幕  
├── oHg5SJYRHA0.vtt          # VTT单语字幕
└── BaW_jenozKc.ass          # 另一个ASS字幕
```

## 服务器配置

### 默认配置
- 服务器地址：`http://127.0.0.1:8888`
- 字幕目录：`../subtitles`
- 支持格式：`.ass`, `.srt`, `.vtt`

### 自定义配置

#### 修改服务器端口
```bash
python subtitle_server.py --port 9999
```

#### 修改字幕目录
```bash
python subtitle_server.py --subtitle-dir /path/to/your/subtitles
```

#### 允许外部访问
```bash
python subtitle_server.py --host 0.0.0.0
```

#### 在Chrome扩展中修改服务器地址
1. 打开扩展弹窗
2. 切换到"自动加载"标签页
3. 在"服务器地址"输入框中修改地址
4. 点击"测试连接"验证

## 工作流程

1. **页面加载检测**：当用户打开YouTube视频页面时，扩展自动检测视频ID
2. **自动请求字幕**：如果启用了自动加载，扩展向本地服务器请求对应的字幕文件
3. **字幕解析**：服务器找到文件后返回内容，扩展自动解析并显示
4. **状态反馈**：在扩展弹窗中显示加载状态（成功/失败）

## API接口

本地服务器提供以下REST API接口：

### GET /health
健康检查，返回服务器状态
```json
{
    "status": "ok",
    "service": "YouTube SubtitlePlus Server",
    "subtitle_dir": "/path/to/subtitles",
    "supported_formats": [".ass", ".srt", ".vtt"]
}
```

### GET /subtitle/{video_id}
获取指定视频的字幕内容
```json
{
    "success": true,
    "video_id": "QSqc6MMS6Fk",
    "content": "字幕文件内容...",
    "info": {
        "filename": "QSqc6MMS6Fk.ass",
        "format": ".ass",
        "size": 12345,
        "modified": 1692345678
    }
}
```

### GET /list
列出所有可用的字幕文件
```json
{
    "success": true,
    "count": 5,
    "subtitles": [...]
}
```

## 故障排除

### 服务器连接失败
1. 确认服务器已启动：`python subtitle_server.py`
2. 检查端口是否被占用：`netstat -an | grep 8888`
3. 检查防火墙设置
4. 在扩展中测试连接

### 字幕未自动加载
1. 确认文件名与视频ID完全匹配
2. 检查文件格式是否支持（.ass/.srt/.vtt）
3. 查看浏览器控制台错误信息
4. 确认"自动加载"开关已启用

### ASS文件解析错误
1. 确认文件编码为UTF-8
2. 检查ASS文件格式是否正确
3. 确认包含English/Chinese样式定义

### 权限错误
1. 确认Chrome扩展已获得访问本地服务器的权限
2. 重新加载扩展：chrome://extensions/
3. 检查manifest.json中的host_permissions配置

## 安全考虑

- 服务器默认只监听本地地址(127.0.0.1)，不接受外部连接
- 服务器为只读模式，不支持文件上传或修改
- 所有请求都经过严格的路径验证，防止目录遍历攻击
- 扩展仅能访问配置的服务器地址

## 性能优化

- 字幕文件会被缓存，避免重复读取
- 服务器支持多线程处理请求
- 文件大小限制合理，避免内存溢出
- 自动检测文件编码，支持多种字符集

## 技术架构

```
┌─────────────────┐    HTTP请求    ┌─────────────────┐
│   Chrome扩展     │ ──────────────► │  本地字幕服务器   │
│                 │                │                 │
│ - content.js    │    字幕内容    │ - Flask应用      │
│ - popup.js      │ ◄────────────── │ - 文件管理       │
│ - background.js │                │ - API接口        │
└─────────────────┘                └─────────────────┘
         │                                    │
         ▼                                    ▼
┌─────────────────┐                ┌─────────────────┐
│  Chrome存储      │                │  本地文件系统     │
│                 │                │                 │
│ - 用户设置       │                │ - 字幕文件目录    │
│ - 字幕缓存       │                │ - 配置文件       │
└─────────────────┘                └─────────────────┘
```

## 更新日志

### v1.1.0 - 自动加载功能
- ✅ 新增本地字幕服务器
- ✅ 支持根据视频ID自动加载字幕
- ✅ 新增自动加载管理界面
- ✅ 支持服务器状态检测
- ✅ 完善错误处理和状态反馈

## 贡献与反馈

如有问题或建议，请通过以下方式联系：
- GitHub Issues
- Chrome扩展商店评论
- 开发者邮箱

---

**提示**：首次使用建议先阅读完整文档，确保正确配置服务器和字幕文件。