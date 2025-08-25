#!/usr/bin/env python3
"""
YouTube SubtitlePlus - 本地字幕服务器
自动为YouTube视频提供本地ASS字幕文件
"""

import os
import sys
import json
import logging
from pathlib import Path
from flask import Flask, jsonify, send_file, request
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# 默认配置
DEFAULT_CONFIG = {
    "subtitle_dir": "../subtitles",
    "server_port": 8888,
    "server_host": "127.0.0.1",
    "supported_formats": [".ass", ".srt", ".vtt"],
    "cors_origins": ["chrome-extension://*", "http://localhost:*"]
}

class SubtitleServer:
    def __init__(self, config_file=None):
        self.config = self.load_config(config_file)
        self.subtitle_dir = Path(self.config["subtitle_dir"]).resolve()
        self.ensure_subtitle_dir()
        
    def load_config(self, config_file=None):
        """加载配置文件"""
        if config_file and os.path.exists(config_file):
            try:
                with open(config_file, 'r', encoding='utf-8') as f:
                    return {**DEFAULT_CONFIG, **json.load(f)}
            except Exception as e:
                logger.warning(f"配置文件加载失败: {e}，使用默认配置")
        return DEFAULT_CONFIG.copy()
        
    def ensure_subtitle_dir(self):
        """确保字幕目录存在"""
        self.subtitle_dir.mkdir(parents=True, exist_ok=True)
        logger.info(f"字幕目录: {self.subtitle_dir}")
        
    def find_subtitle_file(self, video_id):
        """查找指定视频ID的字幕文件"""
        for ext in self.config["supported_formats"]:
            subtitle_file = self.subtitle_dir / f"{video_id}{ext}"
            if subtitle_file.exists():
                logger.info(f"找到字幕文件: {subtitle_file}")
                return subtitle_file
        return None
        
    def get_subtitle_info(self, video_id):
        """获取字幕文件信息"""
        subtitle_file = self.find_subtitle_file(video_id)
        if not subtitle_file:
            return None
            
        try:
            stat = subtitle_file.stat()
            return {
                "video_id": video_id,
                "filename": subtitle_file.name,
                "format": subtitle_file.suffix.lower(),
                "size": stat.st_size,
                "modified": int(stat.st_mtime),
                "path": str(subtitle_file)
            }
        except Exception as e:
            logger.error(f"获取文件信息失败: {e}")
            return None

# 创建服务器实例
server = SubtitleServer()

@app.route('/health')
def health_check():
    """健康检查端点"""
    return jsonify({
        "status": "ok",
        "service": "YouTube SubtitlePlus Server",
        "subtitle_dir": str(server.subtitle_dir),
        "supported_formats": server.config["supported_formats"]
    })

@app.route('/subtitle/<video_id>')
def get_subtitle(video_id):
    """获取指定视频的字幕内容"""
    logger.info(f"请求字幕: {video_id}")
    
    # 验证视频ID格式
    if not video_id or len(video_id) < 5:
        return jsonify({"error": "无效的视频ID"}), 400
        
    # 查找字幕文件
    subtitle_file = server.find_subtitle_file(video_id)
    if not subtitle_file:
        logger.info(f"未找到字幕文件: {video_id}")
        return jsonify({"error": "字幕文件不存在"}), 404
        
    try:
        # 读取文件内容
        with open(subtitle_file, 'r', encoding='utf-8') as f:
            content = f.read()
            
        # 获取文件信息
        info = server.get_subtitle_info(video_id)
        
        return jsonify({
            "success": True,
            "video_id": video_id,
            "content": content,
            "info": info
        })
        
    except UnicodeDecodeError:
        # 尝试其他编码
        try:
            with open(subtitle_file, 'r', encoding='gbk') as f:
                content = f.read()
            return jsonify({
                "success": True,
                "video_id": video_id,
                "content": content,
                "info": server.get_subtitle_info(video_id),
                "encoding": "gbk"
            })
        except Exception as e:
            logger.error(f"文件编码解析失败: {e}")
            return jsonify({"error": "文件编码不支持"}), 500
            
    except Exception as e:
        logger.error(f"读取字幕文件失败: {e}")
        return jsonify({"error": "读取文件失败"}), 500

@app.route('/subtitle/<video_id>/info')
def get_subtitle_info(video_id):
    """获取字幕文件信息（不返回内容）"""
    info = server.get_subtitle_info(video_id)
    if not info:
        return jsonify({"error": "字幕文件不存在"}), 404
        
    return jsonify({
        "success": True,
        "info": info
    })

@app.route('/list')
def list_subtitles():
    """列出所有可用的字幕文件"""
    subtitles = []
    
    try:
        for ext in server.config["supported_formats"]:
            for subtitle_file in server.subtitle_dir.glob(f"*{ext}"):
                video_id = subtitle_file.stem
                info = server.get_subtitle_info(video_id)
                if info:
                    subtitles.append(info)
                    
        return jsonify({
            "success": True,
            "count": len(subtitles),
            "subtitles": subtitles
        })
        
    except Exception as e:
        logger.error(f"列出字幕文件失败: {e}")
        return jsonify({"error": "列出文件失败"}), 500

@app.route('/config')
def get_config():
    """获取服务器配置"""
    return jsonify({
        "success": True,
        "config": {
            "subtitle_dir": str(server.subtitle_dir),
            "supported_formats": server.config["supported_formats"],
            "server_port": server.config["server_port"],
            "server_host": server.config["server_host"]
        }
    })

def main():
    """主函数"""
    import argparse
    
    parser = argparse.ArgumentParser(description='YouTube SubtitlePlus 本地字幕服务器')
    parser.add_argument('--host', default=DEFAULT_CONFIG["server_host"], help='服务器地址')
    parser.add_argument('--port', type=int, default=DEFAULT_CONFIG["server_port"], help='服务器端口')
    parser.add_argument('--subtitle-dir', default=DEFAULT_CONFIG["subtitle_dir"], help='字幕文件目录')
    parser.add_argument('--config', help='配置文件路径')
    parser.add_argument('--debug', action='store_true', help='调试模式')
    
    args = parser.parse_args()
    
    # 更新配置
    if args.config:
        server.config = server.load_config(args.config)
    server.config.update({
        "server_host": args.host,
        "server_port": args.port,
        "subtitle_dir": args.subtitle_dir
    })
    
    # 重新初始化字幕目录
    server.subtitle_dir = Path(server.config["subtitle_dir"]).resolve()
    server.ensure_subtitle_dir()
    
    # 启动信息
    print(f"""
╔══════════════════════════════════════════════════════════════╗
║                YouTube SubtitlePlus 字幕服务器                ║
╠══════════════════════════════════════════════════════════════╣
║ 服务地址: http://{args.host}:{args.port}                      ║
║ 字幕目录: {server.subtitle_dir}           ║
║ 支持格式: {', '.join(server.config['supported_formats'])}                    ║
╠══════════════════════════════════════════════════════════════╣
║ 使用方法:                                                      ║
║ 1. 将字幕文件放入字幕目录                                        ║
║ 2. 文件名格式: <YouTube视频ID>.ass                              ║
║ 3. 在Chrome扩展中启用自动加载功能                               ║
║                                                              ║
║ API端点:                                                      ║
║ GET /health - 健康检查                                         ║
║ GET /subtitle/<video_id> - 获取字幕内容                        ║
║ GET /subtitle/<video_id>/info - 获取字幕信息                   ║
║ GET /list - 列出所有字幕文件                                   ║
║ GET /config - 获取服务器配置                                   ║
╚══════════════════════════════════════════════════════════════╝
    """)
    
    try:
        app.run(
            host=args.host,
            port=args.port,
            debug=args.debug,
            threaded=True
        )
    except KeyboardInterrupt:
        logger.info("服务器已停止")
    except Exception as e:
        logger.error(f"服务器启动失败: {e}")
        sys.exit(1)

if __name__ == '__main__':
    main()