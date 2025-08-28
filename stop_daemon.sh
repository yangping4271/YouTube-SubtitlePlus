#!/bin/bash

# YouTube SubtitlePlus 守护服务停止脚本

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$SCRIPT_DIR"
LOGS_DIR="$PROJECT_ROOT/logs"
PID_FILE="$LOGS_DIR/subtitle_server.pid"

echo "🛑 停止 YouTube SubtitlePlus 守护服务..."

# 检查PID文件是否存在
if [ ! -f "$PID_FILE" ]; then
    echo "📭 未找到PID文件，尝试查找运行中的进程"
    
    # 查找运行中的服务进程
    PIDS=$(pgrep -f "subtitle_server.py")
    if [ -z "$PIDS" ]; then
        echo "✅ 没有找到运行中的服务进程"
        exit 0
    fi
    
    echo "🔍 找到运行中的进程: $PIDS"
    for PID in $PIDS; do
        echo "⏹️  停止进程 $PID"
        kill -TERM "$PID" 2>/dev/null || true
    done
    
    sleep 3
    
    # 检查是否还有残留进程
    REMAINING=$(pgrep -f "subtitle_server.py")
    if [ ! -z "$REMAINING" ]; then
        echo "⚡ 强制终止残留进程"
        kill -KILL $REMAINING 2>/dev/null || true
    fi
    
    echo "✅ 服务已停止"
    exit 0
fi

# 读取PID
SERVER_PID=$(cat "$PID_FILE")

# 检查进程是否仍在运行
if ! kill -0 "$SERVER_PID" 2>/dev/null; then
    echo "📭 进程 $SERVER_PID 已不存在，清理PID文件"
    rm -f "$PID_FILE"
    exit 0
fi

echo "🆔 停止进程: $SERVER_PID"

# 温和停止
echo "📤 发送TERM信号..."
kill -TERM "$SERVER_PID" 2>/dev/null

# 等待进程停止
echo "⏳ 等待进程退出..."
sleep 5

# 检查进程是否已停止
if kill -0 "$SERVER_PID" 2>/dev/null; then
    echo "⚡ 进程仍在运行，强制终止"
    kill -KILL "$SERVER_PID" 2>/dev/null
    sleep 2
fi

# 最终检查
if kill -0 "$SERVER_PID" 2>/dev/null; then
    echo "❌ 无法停止进程 $SERVER_PID"
    exit 1
else
    echo "✅ 服务已成功停止"
    rm -f "$PID_FILE"
    
    # 检查端口是否释放
    if ! lsof -Pi :8888 -sTCP:LISTEN -t >/dev/null 2>&1; then
        echo "🌐 端口 8888 已释放"
    else
        echo "⚠️  端口 8888 仍被占用"
    fi
fi