#!/bin/bash

# YouTube SubtitlePlus 守护服务重启脚本

echo "🔄 重启 YouTube SubtitlePlus 守护服务..."

# 获取脚本所在目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# 停止现有服务
echo "1️⃣ 停止现有服务..."
"$SCRIPT_DIR/stop_daemon.sh"

echo ""

# 等待确保完全停止
echo "⏳ 等待服务完全停止..."
sleep 2

# 启动新服务
echo "2️⃣ 启动新服务..."
"$SCRIPT_DIR/daemon_server.sh"

echo ""
echo "🎉 服务重启完成！"