#!/bin/bash

# YouTube SubtitlePlus 系统服务安装脚本
# 将服务注册为 macOS launchd 系统服务

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$SCRIPT_DIR"
PLIST_FILE="$PROJECT_ROOT/com.youtube.subtitleplus.plist"
LAUNCHD_DIR="$HOME/Library/LaunchAgents"
SERVICE_NAME="com.youtube.subtitleplus"

echo "🔧 YouTube SubtitlePlus 系统服务安装器"
echo "════════════════════════════════════════════"
echo ""

# 检查plist文件是否存在
if [ ! -f "$PLIST_FILE" ]; then
    echo "❌ 找不到服务配置文件: $PLIST_FILE"
    exit 1
fi

# 确保LaunchAgents目录存在
mkdir -p "$LAUNCHD_DIR"

# 检查服务是否已安装
TARGET_PLIST="$LAUNCHD_DIR/$SERVICE_NAME.plist"

if [ -f "$TARGET_PLIST" ]; then
    echo "⚠️  服务已安装，先卸载现有服务..."
    
    # 停止并卸载现有服务
    launchctl unload "$TARGET_PLIST" 2>/dev/null || true
    rm -f "$TARGET_PLIST"
    echo "🗑️  已卸载现有服务"
fi

echo "📋 安装服务配置..."

# 复制plist文件到LaunchAgents目录
cp "$PLIST_FILE" "$TARGET_PLIST"

# 设置正确的权限
chmod 644 "$TARGET_PLIST"

echo "🚀 加载并启动服务..."

# 加载服务
if launchctl load "$TARGET_PLIST"; then
    echo "✅ 服务安装成功！"
    echo ""
    echo "📊 服务信息:"
    echo "   服务名称: $SERVICE_NAME"
    echo "   配置文件: $TARGET_PLIST"
    echo "   日志位置: $PROJECT_ROOT/logs/"
    echo ""
    echo "💡 系统服务管理命令:"
    echo "   查看服务: launchctl list | grep youtube"
    echo "   停止服务: launchctl unload $TARGET_PLIST"
    echo "   启动服务: launchctl load $TARGET_PLIST"
    echo "   卸载服务: ./uninstall_system_service.sh"
    echo ""
    
    # 等待服务启动
    sleep 5
    
    # 检查服务状态
    if curl -s "http://127.0.0.1:8888/health" >/dev/null 2>&1; then
        echo "🎉 系统服务运行正常！"
        echo "🌐 服务地址: http://127.0.0.1:8888"
        echo "📋 实时日志: tail -f $PROJECT_ROOT/logs/daemon.log"
        echo ""
        echo "✨ 服务现在会在系统启动时自动启动，并在崩溃时自动重启"
    else
        echo "⚠️  服务已安装但可能未正常启动，请检查日志:"
        echo "   错误日志: cat $PROJECT_ROOT/logs/daemon_error.log"
    fi
    
else
    echo "❌ 服务加载失败"
    rm -f "$TARGET_PLIST"
    exit 1
fi