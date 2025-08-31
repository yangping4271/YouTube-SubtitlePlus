#!/bin/bash

# YouTube SubtitlePlus 守护进程启动脚本
# 支持即使关闭终端也能持续运行

set -e  # 遇到错误立即退出

echo "🚀 YouTube SubtitlePlus 守护服务启动中..."

# 获取脚本所在目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$SCRIPT_DIR"
LOGS_DIR="$PROJECT_ROOT/logs"
PID_FILE="$LOGS_DIR/subtitle_server.pid"

# 确保日志目录存在
mkdir -p "$LOGS_DIR"

# 检查是否已有服务在运行
if [ -f "$PID_FILE" ]; then
    OLD_PID=$(cat "$PID_FILE")
    if kill -0 "$OLD_PID" 2>/dev/null; then
        echo "⚠️  服务已在运行 (PID: $OLD_PID)"
        echo "   使用 './stop_daemon.sh' 先停止现有服务"
        exit 1
    else
        echo "🧹 清理过期的PID文件"
        rm -f "$PID_FILE"
    fi
fi

# 进入服务器目录
cd "$PROJECT_ROOT/server"

# 检查uv是否可用并设置Python命令
if command -v uv &> /dev/null; then
    echo "🐍 使用uv运行Python环境"
    PYTHON_CMD="uv run"
    
    # 同步依赖
    echo "📦 同步Python依赖..."
    uv sync >/dev/null 2>&1 || {
        echo "❌ uv依赖同步失败，请检查环境"
        exit 1
    }
else
    echo "🐍 使用系统Python环境"
    if command -v python3 &> /dev/null; then
        PYTHON_CMD="python3"
    elif command -v python &> /dev/null; then
        PYTHON_CMD="python"
    else
        echo "❌ 未找到Python，请先安装Python 3.8+"
        exit 1
    fi
    
    # 检查依赖
    if ! $PYTHON_CMD -c "import flask, flask_cors" &> /dev/null; then
        echo "❌ Python依赖未安装，请运行 './start_server.sh' 安装依赖"
        exit 1
    fi
fi

echo "🌐 启动后台守护服务..."
echo "📂 工作目录: $PROJECT_ROOT"
echo "📋 日志文件: $LOGS_DIR/subtitle_server.log"
echo "🆔 PID文件: $PID_FILE"
echo ""

# 使用nohup启动服务，确保即使终端关闭也能继续运行
nohup $PYTHON_CMD subtitle_server.py --subtitle-dir ../subtitles \
    > "$LOGS_DIR/subtitle_server.log" \
    2> "$LOGS_DIR/subtitle_server_error.log" &

# 记录进程ID
SERVER_PID=$!
echo "$SERVER_PID" > "$PID_FILE"

# 等待服务启动
sleep 3

# 验证服务是否成功启动
if kill -0 "$SERVER_PID" 2>/dev/null; then
    # 测试服务响应
    if curl -s "http://127.0.0.1:8888/health" >/dev/null 2>&1; then
        echo "✅ 守护服务启动成功！"
        echo "🆔 进程ID: $SERVER_PID"
        echo "🌐 服务地址: http://127.0.0.1:8888"
        echo "📋 实时日志: tail -f $LOGS_DIR/subtitle_server.log"
        echo ""
        echo "💡 服务管理命令:"
        echo "   查看状态: ./daemon_status.sh"
        echo "   停止服务: ./stop_daemon.sh"
        echo "   重启服务: ./restart_daemon.sh"
        echo ""
        echo "🎉 服务现在在后台运行，关闭终端窗口不会影响服务"
    else
        echo "❌ 服务进程启动但无法响应请求，请检查日志"
        echo "📋 错误日志: cat $LOGS_DIR/subtitle_server_error.log"
        kill "$SERVER_PID" 2>/dev/null || true
        rm -f "$PID_FILE"
        exit 1
    fi
else
    echo "❌ 服务启动失败，请检查日志文件"
    echo "📋 错误日志: cat $LOGS_DIR/subtitle_server_error.log"
    rm -f "$PID_FILE"
    exit 1
fi