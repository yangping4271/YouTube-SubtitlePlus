#!/bin/bash

# YouTube SubtitlePlus 服务器停止脚本

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║                YouTube SubtitlePlus 停止服务器                ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

# 查找运行中的字幕服务器进程
PIDS=$(pgrep -f "subtitle_server.py")

if [ -z "$PIDS" ]; then
    echo "📭 未找到正在运行的字幕服务器进程"
    
    # 检查端口8888是否被占用
    if lsof -Pi :8888 -sTCP:LISTEN -t >/dev/null 2>&1; then
        echo "⚠️  端口8888仍被占用，尝试停止占用进程..."
        PORT_PIDS=$(lsof -Pi :8888 -sTCP:LISTEN -t)
        for PID in $PORT_PIDS; do
            PROCESS_INFO=$(ps -p $PID -o comm= 2>/dev/null)
            if [ ! -z "$PROCESS_INFO" ]; then
                echo "🔍 找到占用端口8888的进程: $PROCESS_INFO (PID: $PID)"
                kill -TERM $PID 2>/dev/null
                sleep 2
                
                # 检查进程是否还在运行
                if kill -0 $PID 2>/dev/null; then
                    echo "⚡ 强制终止进程 $PID"
                    kill -KILL $PID 2>/dev/null
                fi
                echo "✅ 进程 $PID 已停止"
            fi
        done
    else
        echo "✅ 端口8888当前空闲"
    fi
    exit 0
fi

echo "🔍 找到字幕服务器进程:"
for PID in $PIDS; do
    # 获取进程详细信息
    PROCESS_INFO=$(ps -p $PID -o pid,ppid,comm,args 2>/dev/null | tail -n +2)
    if [ ! -z "$PROCESS_INFO" ]; then
        echo "   PID: $PID"
        echo "   详情: $PROCESS_INFO"
        echo ""
    fi
done

echo "🛑 正在停止字幕服务器进程..."

# 首先尝试温和终止 (SIGTERM)
for PID in $PIDS; do
    if kill -0 $PID 2>/dev/null; then
        echo "📤 发送终止信号给进程 $PID"
        kill -TERM $PID
    fi
done

# 等待进程停止
echo "⏳ 等待进程正常退出 (5秒)..."
sleep 5

# 检查是否有进程仍在运行
REMAINING_PIDS=$(pgrep -f "subtitle_server.py")
if [ ! -z "$REMAINING_PIDS" ]; then
    echo "⚡ 某些进程仍在运行，强制终止..."
    for PID in $REMAINING_PIDS; do
        if kill -0 $PID 2>/dev/null; then
            echo "🔪 强制杀死进程 $PID"
            kill -KILL $PID
        fi
    done
    sleep 1
fi

# 最终检查
FINAL_CHECK=$(pgrep -f "subtitle_server.py")
if [ -z "$FINAL_CHECK" ]; then
    echo "✅ 所有字幕服务器进程已成功停止"
else
    echo "❌ 警告: 仍有进程残留:"
    ps -p $FINAL_CHECK -o pid,comm,args 2>/dev/null
fi

# 检查端口状态
echo ""
echo "🌐 检查端口8888状态..."
if lsof -Pi :8888 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo "⚠️  端口8888仍被占用"
    echo "占用进程信息:"
    lsof -Pi :8888 -sTCP:LISTEN
else
    echo "✅ 端口8888已释放"
fi

echo ""
echo "📄 操作完成!"
echo "💡 提示:"
echo "   - 使用 './start_server.sh' 重新启动服务器"
echo "   - 使用 'ps aux | grep subtitle_server' 检查进程状态"
echo "   - 使用 'lsof -i :8888' 检查端口占用情况"
echo ""