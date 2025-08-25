#!/bin/bash

# YouTube SubtitlePlus 一键启动脚本

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║                YouTube SubtitlePlus 自动加载                  ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

# 检查当前目录结构
if [ ! -f "server/subtitle_server.py" ]; then
    echo "❌ 错误: 未找到服务器文件，请确保在项目根目录运行此脚本"
    exit 1
fi

if [ ! -d "subtitles" ]; then
    echo "📁 创建字幕目录: subtitles/"
    mkdir -p subtitles
fi

# 进入服务器目录
cd server

# 检查uv是否可用
if command -v uv &> /dev/null; then
    echo "🚀 使用uv管理Python环境（推荐方式）"
    PYTHON_CMD="uv run"
    INSTALL_CMD="uv sync"
    
    # uv会自动管理虚拟环境和依赖
    echo "📦 检查并同步依赖..."
    uv sync
    
    if [ $? -ne 0 ]; then
        echo "❌ 依赖同步失败，尝试初始化项目..."
        uv init --no-readme --no-git 2>/dev/null || true
        uv add flask flask-cors werkzeug
        
        if [ $? -ne 0 ]; then
            echo "❌ uv依赖安装失败，回退到传统方式"
            PYTHON_CMD="python"
            INSTALL_CMD="pip install -r requirements.txt"
        else
            echo "✅ 使用uv成功初始化项目"
        fi
    else
        echo "✅ uv依赖检查完成"
    fi
else
    echo "💡 未找到uv，使用传统Python方式"
    echo "   提示: 安装uv可获得更好体验: curl -LsSf https://astral.sh/uv/install.sh | sh"
    
    # 检查Python是否已安装
    if ! command -v python3 &> /dev/null && ! command -v python &> /dev/null; then
        echo "❌ 错误: Python未安装，请先安装Python 3.8+"
        exit 1
    fi

    # 确定Python命令
    if command -v python3 &> /dev/null; then
        PYTHON_CMD="python3"
    elif command -v python &> /dev/null; then
        PYTHON_CMD="python"
    else
        echo "❌ 错误: 未找到Python，请安装Python 3.8+"
        exit 1
    fi
    
    echo "🐍 使用Python命令: $PYTHON_CMD"

    # 检查并安装依赖
    echo "📦 检查Python依赖..."
    if [ ! -f "requirements.txt" ]; then
        echo "❌ 错误: requirements.txt文件不存在"
        exit 1
    fi

    # 尝试安装依赖
    if ! $PYTHON_CMD -c "import flask, flask_cors" &> /dev/null; then
        echo "🔧 安装Python依赖..."
        
        # 尝试不同的安装方式
        if $PYTHON_CMD -m pip install --user -r requirements.txt &> /dev/null; then
            echo "✅ 使用 --user 标志安装成功"
        elif $PYTHON_CMD -m pip install --break-system-packages -r requirements.txt &> /dev/null; then
            echo "✅ 使用 --break-system-packages 标志安装成功"
        else
            echo "❌ 依赖安装失败，请手动运行以下命令之一:"
            echo "   $PYTHON_CMD -m pip install --user -r server/requirements.txt"
            echo "   $PYTHON_CMD -m pip install --break-system-packages -r server/requirements.txt"
            exit 1
        fi
        echo "✅ 依赖安装完成"
    else
        echo "✅ 依赖已安装"
    fi
fi

# 启动服务器
echo ""
echo "🚀 启动字幕服务器..."
echo "📂 字幕目录: $(pwd)/../subtitles"
echo "🌐 服务地址: http://127.0.0.1:8888"
echo ""
echo "💡 使用说明:"
echo "   1. 将字幕文件放入 subtitles/ 目录"
echo "   2. 文件名格式: <视频ID>.ass (例如: QSqc6MMS6Fk.ass)"
echo "   3. 在Chrome扩展中启用自动加载功能"
echo "   4. 按Ctrl+C停止服务器"
echo ""

# 启动服务器
$PYTHON_CMD subtitle_server.py --subtitle-dir ../subtitles

echo ""
echo "👋 服务器已停止"