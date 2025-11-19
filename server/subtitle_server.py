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
    "subtitle_dirs": ["~/Downloads", "~/subtitles"],  # 支持多个字幕目录，按优先级排序
    "subtitle_dir": "~/Downloads",  # 保持向后兼容
    "server_port": 8888,
    "server_host": "127.0.0.1",
    "supported_formats": [".ass", ".srt", ".vtt"],  # ASS优先级最高（双语字幕），其次SRT、VTT
    "cors_origins": ["chrome-extension://*", "http://localhost:*"]
}

class SubtitleServer:
    def __init__(self, config_file=None):
        self.config = self.load_config(config_file)
        self.subtitle_dirs = self.setup_subtitle_dirs()
        self.ensure_subtitle_dirs()
        
    def setup_subtitle_dirs(self):
        """设置字幕目录列表，支持多个目录"""
        dirs = []
        
        # 优先使用新的 subtitle_dirs 配置
        if "subtitle_dirs" in self.config:
            for dir_path in self.config["subtitle_dirs"]:
                resolved_path = Path(dir_path).expanduser().resolve()
                dirs.append(resolved_path)
                logger.info(f"添加字幕目录: {resolved_path}")
        else:
            # 向后兼容：使用旧的 subtitle_dir 配置
            legacy_dir = Path(self.config["subtitle_dir"]).expanduser().resolve()
            dirs.append(legacy_dir)
            logger.info(f"使用传统字幕目录: {legacy_dir}")
        
        return dirs
        
    def load_config(self, config_file=None):
        """加载配置文件"""
        if config_file and os.path.exists(config_file):
            try:
                with open(config_file, 'r', encoding='utf-8') as f:
                    return {**DEFAULT_CONFIG, **json.load(f)}
            except Exception as e:
                logger.warning(f"配置文件加载失败: {e}，使用默认配置")
        return DEFAULT_CONFIG.copy()
        
    def ensure_subtitle_dirs(self):
        """确保所有字幕目录存在"""
        for subtitle_dir in self.subtitle_dirs:
            subtitle_dir.mkdir(parents=True, exist_ok=True)
            logger.info(f"字幕目录已确保存在: {subtitle_dir}")
        
    def find_subtitle_file(self, video_id):
        """查找指定视频ID的字幕文件 - 支持灵活匹配、多目录搜索和格式优先级"""
        logger.info(f"开始查找字幕文件，视频ID: {video_id}")
        
        # 按格式优先级排序：ASS > SRT > VTT（ASS支持双语字幕）
        priority_formats = [".ass", ".srt", ".vtt"]
        
        # 1. 按格式优先级在每个目录中进行精确匹配
        for ext in priority_formats:
            if ext in self.config["supported_formats"]:
                for i, subtitle_dir in enumerate(self.subtitle_dirs):
                    logger.info(f"精确搜索格式 {ext} - 目录 {i+1}/{len(self.subtitle_dirs)}: {subtitle_dir}")
                    
                    subtitle_file = subtitle_dir / f"{video_id}{ext}"
                    if subtitle_file.exists():
                        logger.info(f"✅ 找到字幕文件(精确匹配-{ext}): {subtitle_file}")
                        return subtitle_file
        
        # 2. 如果精确匹配失败，按格式优先级进行灵活匹配
        logger.info(f"未找到精确匹配的文件，在所有目录中按格式优先级尝试灵活匹配...")
        
        for ext in priority_formats:
            if ext in self.config["supported_formats"]:
                logger.info(f"灵活匹配格式 {ext}...")
                
                for i, subtitle_dir in enumerate(self.subtitle_dirs):
                    if not subtitle_dir.exists():
                        continue
                    
                    candidates = []
                    for subtitle_file in subtitle_dir.iterdir():
                        if subtitle_file.is_file() and subtitle_file.suffix.lower() == ext.lower():
                            candidates.append(subtitle_file.name)
                            filename = subtitle_file.stem
                            # 检查文件名是否包含video_id
                            # 支持格式：video_id, xxx-video_id, xxx_video_id, video_id-xxx, video_id_xxx
                            if (video_id in filename or 
                                filename.endswith(f"-{video_id}") or 
                                filename.endswith(f"_{video_id}") or
                                filename.startswith(f"{video_id}-") or
                                filename.startswith(f"{video_id}_")):
                                logger.info(f"✅ 找到字幕文件(灵活匹配-{ext}): {subtitle_file}")
                                return subtitle_file
                    
                    if candidates:
                        logger.info(f"目录 {subtitle_dir} 格式 {ext} 候选文件: {candidates}")
        
        logger.info(f"❌ 在所有目录中均未找到匹配的字幕文件")
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
        "subtitle_dirs": [str(d) for d in server.subtitle_dirs],  # 支持多目录
        "subtitle_dir": str(server.subtitle_dirs[0]) if server.subtitle_dirs else "",  # 主目录，向后兼容
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
    processed_video_ids = set()  # 避免重复，优先级高的目录优先
    
    try:
        # 按优先级顺序遍历所有目录
        for i, subtitle_dir in enumerate(server.subtitle_dirs):
            if not subtitle_dir.exists():
                continue
                
            for ext in server.config["supported_formats"]:
                for subtitle_file in subtitle_dir.glob(f"*{ext}"):
                    video_id = subtitle_file.stem
                    
                    # 避免重复处理相同的video_id（优先级高的目录优先）
                    if video_id not in processed_video_ids:
                        info = server.get_subtitle_info(video_id)
                        if info:
                            # 添加目录信息
                            info["source_dir"] = str(subtitle_dir)
                            info["priority"] = i + 1  # 优先级（1最高）
                            subtitles.append(info)
                            processed_video_ids.add(video_id)
                    
        return jsonify({
            "success": True,
            "count": len(subtitles),
            "subtitles": subtitles,
            "search_dirs": [str(d) for d in server.subtitle_dirs]
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
            "subtitle_dirs": [str(d) for d in server.subtitle_dirs],  # 支持多目录
            "subtitle_dir": str(server.subtitle_dirs[0]) if server.subtitle_dirs else "",  # 向后兼容
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
    parser.add_argument('--subtitle-dir', default=DEFAULT_CONFIG["subtitle_dir"], help='主字幕文件目录（向后兼容）')
    parser.add_argument('--subtitle-dirs', nargs='+', help='多个字幕文件目录，按优先级排序')
    parser.add_argument('--config', help='配置文件路径')
    parser.add_argument('--debug', action='store_true', help='调试模式')
    
    args = parser.parse_args()
    
    # 更新配置
    if args.config:
        server.config = server.load_config(args.config)
    
    # 处理多目录参数
    if args.subtitle_dirs:
        server.config["subtitle_dirs"] = args.subtitle_dirs
    elif args.subtitle_dir != DEFAULT_CONFIG["subtitle_dir"]:
        # 如果用户指定了传统的单目录参数，更新配置
        server.config["subtitle_dirs"] = [args.subtitle_dir]
        
    server.config.update({
        "server_host": args.host,
        "server_port": args.port,
    })
    
    # 重新初始化字幕目录
    server.subtitle_dirs = server.setup_subtitle_dirs()
    server.ensure_subtitle_dirs()
    
    # 启动信息
    dirs_info = '\n'.join([f"║   {i+1}. {d}" + " " * (58 - len(str(d))) + "║" 
                          for i, d in enumerate(server.subtitle_dirs)])
    
    print(f"""
╔══════════════════════════════════════════════════════════════╗
║                YouTube SubtitlePlus 字幕服务器                ║
╠══════════════════════════════════════════════════════════════╣
║ 服务地址: http://{args.host}:{args.port}                      ║
║ 字幕目录: (按优先级排序)                                       ║
{dirs_info}
║ 支持格式: {', '.join(server.config['supported_formats'])}                    ║
╠══════════════════════════════════════════════════════════════╣
║ 使用方法:                                                      ║
║ 1. 将字幕文件放入任一字幕目录                                    ║
║ 2. 支持文件名格式:                                              ║
║    - 精确匹配: <YouTube视频ID>.ass                             ║
║    - 灵活匹配: movie-<视频ID>.srt, <视频ID>-subtitle.vtt       ║
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