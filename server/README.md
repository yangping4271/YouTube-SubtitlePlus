# YouTube SubtitlePlus 本地字幕服务器

## 功能说明

本地HTTP服务器，为YouTube SubtitlePlus扩展提供自动字幕加载功能。

## 环境要求

- Python 3.8+
- uv (推荐) 或 pip

## 安装和运行

### 方法一：使用uv（推荐）

```bash
# 安装uv（如果尚未安装）
curl -LsSf https://astral.sh/uv/install.sh | sh
# 或者使用pip安装
pip install uv

# 直接运行服务器（uv会自动管理虚拟环境）
uv run subtitle_server.py
```

### 方法二：使用传统pip

```bash
# 创建虚拟环境
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate

# 安装依赖
pip install -r requirements.txt

# 运行服务器
python subtitle_server.py
```

## 使用方法

### 快速启动

```bash
# 使用默认设置启动
uv run subtitle_server.py

# 自定义端口
uv run subtitle_server.py --port 9999

# 自定义字幕目录
uv run subtitle_server.py --subtitle-dir /path/to/subtitles

# 允许外部访问
uv run subtitle_server.py --host 0.0.0.0

# 调试模式
uv run subtitle_server.py --debug
```

默认配置：
- 地址：http://127.0.0.1:8888
- 字幕目录：../subtitles

### 3. 添加字幕文件

将字幕文件放入字幕目录，文件名格式：
```
<YouTube视频ID>.ass
<YouTube视频ID>.srt
<YouTube视频ID>.vtt
```

示例：
```
QSqc6MMS6Fk.ass  # 对应 https://www.youtube.com/watch?v=QSqc6MMS6Fk
abc123def.srt    # 对应 https://www.youtube.com/watch?v=abc123def
```

## API端点

### GET /health
健康检查，返回服务器状态

### GET /subtitle/<video_id>
获取指定视频的字幕内容

**参数：**
- `video_id`: YouTube视频ID

**返回：**
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

### GET /subtitle/<video_id>/info
获取字幕文件信息（不返回内容）

### GET /list
列出所有可用的字幕文件

### GET /config
获取服务器配置信息

## 错误处理

- 404：字幕文件不存在
- 400：无效的视频ID
- 500：服务器内部错误

## 安全说明

- 服务器默认只监听本地地址(127.0.0.1)
- 支持跨域请求，仅允许Chrome扩展访问
- 不支持文件上传，只提供只读访问