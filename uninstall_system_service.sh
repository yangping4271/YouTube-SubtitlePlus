#!/bin/bash

# YouTube SubtitlePlus 系统服务卸载脚本

LAUNCHD_DIR="$HOME/Library/LaunchAgents"
SERVICE_NAME="com.youtube.subtitleplus"
TARGET_PLIST="$LAUNCHD_DIR/$SERVICE_NAME.plist"

echo "🗑️  YouTube SubtitlePlus 系统服务卸载器"
echo "══════════════════════════════════════════"
echo ""

# 检查服务是否已安装
if [ ! -f "$TARGET_PLIST" ]; then
    echo "📭 系统服务未安装"
    exit 0
fi

echo "🛑 停止系统服务..."

# 卸载服务
if launchctl unload "$TARGET_PLIST" 2>/dev/null; then
    echo "✅ 服务已停止"
else
    echo "⚠️  服务可能未运行，继续卸载..."
fi

# 删除plist文件
rm -f "$TARGET_PLIST"

echo "🗑️  删除服务配置文件"
echo "✅ 系统服务卸载完成"
echo ""
echo "💡 你仍可以使用以下命令手动管理服务:"
echo "   启动: ./daemon_server.sh"
echo "   停止: ./stop_daemon.sh"
echo "   状态: ./daemon_status.sh"