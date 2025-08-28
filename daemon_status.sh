#!/bin/bash

# YouTube SubtitlePlus 守护服务状态检查脚本

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$SCRIPT_DIR"
LOGS_DIR="$PROJECT_ROOT/logs"
PID_FILE="$LOGS_DIR/subtitle_server.pid"

echo "📊 YouTube SubtitlePlus 服务状态检查"
echo "════════════════════════════════════════"
echo ""

# 检查PID文件
if [ -f "$PID_FILE" ]; then
    SERVER_PID=$(cat "$PID_FILE")
    echo "🆔 PID文件: $SERVER_PID"
    
    # 检查进程是否存在
    if kill -0 "$SERVER_PID" 2>/dev/null; then
        echo "✅ 进程状态: 运行中"
        
        # 获取进程详细信息
        echo "📋 进程信息:"
        ps -p "$SERVER_PID" -o pid,ppid,pcpu,pmem,etime,comm,args 2>/dev/null || echo "   无法获取进程详情"
        
    else
        echo "❌ 进程状态: 已停止 (PID文件过期)"
        echo "🧹 清理过期PID文件..."
        rm -f "$PID_FILE"
    fi
else
    echo "📭 PID文件: 不存在"
    
    # 查找可能的运行进程
    PIDS=$(pgrep -f "subtitle_server.py")
    if [ ! -z "$PIDS" ]; then
        echo "⚠️  发现未记录的进程: $PIDS"
        echo "📋 进程详情:"
        for PID in $PIDS; do
            ps -p "$PID" -o pid,ppid,etime,comm,args 2>/dev/null || true
        done
    else
        echo "❌ 进程状态: 未运行"
    fi
fi

echo ""

# 检查端口占用
echo "🌐 端口检查:"
if lsof -Pi :8888 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo "✅ 端口8888: 已监听"
    echo "📋 端口详情:"
    lsof -Pi :8888 -sTCP:LISTEN 2>/dev/null | head -5
else
    echo "❌ 端口8888: 未监听"
fi

echo ""

# 检查服务响应
echo "🔍 服务响应测试:"
if curl -s --connect-timeout 3 "http://127.0.0.1:8888/health" >/dev/null 2>&1; then
    echo "✅ HTTP健康检查: 通过"
    
    # 获取服务信息
    SERVICE_INFO=$(curl -s "http://127.0.0.1:8888/health" 2>/dev/null)
    if [ ! -z "$SERVICE_INFO" ]; then
        echo "📊 服务信息:"
        echo "$SERVICE_INFO" | python3 -m json.tool 2>/dev/null || echo "$SERVICE_INFO"
    fi
else
    echo "❌ HTTP健康检查: 失败"
fi

echo ""

# 检查日志文件
echo "📋 日志文件:"
if [ -f "$LOGS_DIR/subtitle_server.log" ]; then
    LOG_SIZE=$(stat -f%z "$LOGS_DIR/subtitle_server.log" 2>/dev/null || echo "0")
    LOG_LINES=$(wc -l < "$LOGS_DIR/subtitle_server.log" 2>/dev/null || echo "0")
    echo "✅ 主日志: $(($LOG_SIZE/1024))KB, $LOG_LINES 行"
    echo "   路径: $LOGS_DIR/subtitle_server.log"
    echo "   最新内容:"
    tail -3 "$LOGS_DIR/subtitle_server.log" 2>/dev/null | sed 's/^/      /' || echo "      (无法读取)"
else
    echo "❌ 主日志: 不存在"
fi

if [ -f "$LOGS_DIR/subtitle_server_error.log" ]; then
    ERROR_SIZE=$(stat -f%z "$LOGS_DIR/subtitle_server_error.log" 2>/dev/null || echo "0")
    if [ "$ERROR_SIZE" -gt 0 ]; then
        echo "⚠️  错误日志: $(($ERROR_SIZE/1024))KB (有错误信息)"
        echo "   最新错误:"
        tail -3 "$LOGS_DIR/subtitle_server_error.log" 2>/dev/null | sed 's/^/      /' || echo "      (无法读取)"
    else
        echo "✅ 错误日志: 空 (无错误)"
    fi
else
    echo "❌ 错误日志: 不存在"
fi

echo ""
echo "💡 管理命令:"
echo "   启动服务: ./daemon_server.sh"
echo "   停止服务: ./stop_daemon.sh"  
echo "   重启服务: ./restart_daemon.sh"
echo "   实时日志: tail -f $LOGS_DIR/subtitle_server.log"