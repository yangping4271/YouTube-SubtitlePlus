#!/bin/bash

# YouTube SubtitlePlus - 字幕文件管理脚本
# 功能：将Downloads目录中的.ass文件移动到subtitles目录，并删除同名的.srt和.mp3文件

set -e  # 遇到错误时退出

# 定义目录路径
DOWNLOADS_DIR="$HOME/Downloads"

# 固定字幕目标目录为用户字幕目录
SUBTITLES_DIR="$HOME/subtitles"

# 确保目标目录存在
if [ ! -d "$SUBTITLES_DIR" ]; then
    mkdir -p "$SUBTITLES_DIR"
    echo "📁 创建字幕目录: $SUBTITLES_DIR"
fi

echo "📁 字幕文件管理脚本启动"
echo "源目录: $DOWNLOADS_DIR"
echo "目标目录: $SUBTITLES_DIR"
echo ""

# 检查目录是否存在
if [ ! -d "$DOWNLOADS_DIR" ]; then
    echo "❌ 错误: Downloads目录不存在: $DOWNLOADS_DIR"
    exit 1
fi

if [ ! -d "$SUBTITLES_DIR" ]; then
    echo "❌ 错误: 当前目录不存在: $SUBTITLES_DIR"
    exit 1
fi

# 统计变量
moved_count=0
deleted_srt_count=0
deleted_mp3_count=0

echo "🔍 搜索.ass文件..."

# 查找并处理所有.ass文件（使用NUL分隔避免空格/特殊字符问题，且避免管道导致子shell使计数失效）
while IFS= read -r -d '' ass_file; do
    # 获取文件名（不含路径）
    filename=$(basename "$ass_file")
    # 获取文件名（不含扩展名）
    basename_no_ext="${filename%.*}"
    
    echo "📄 处理文件: $filename"
    
    # 移动.ass文件到字幕目录
    if mv "$ass_file" "$SUBTITLES_DIR/"; then
        echo "  ✅ 已移动: $filename"
        ((moved_count++))
    else
        echo "  ❌ 移动失败: $filename"
        continue
    fi
    
    # 查找并删除同名的.srt文件
    srt_file="$DOWNLOADS_DIR/${basename_no_ext}.srt"
    if [ -f "$srt_file" ]; then
        if rm "$srt_file"; then
            echo "  🗑️  已删除同名srt: ${basename_no_ext}.srt"
            ((deleted_srt_count++))
        else
            echo "  ❌ 删除srt失败: ${basename_no_ext}.srt"
        fi
    fi
    
    # 查找并删除同名的.mp3文件
    mp3_file="$DOWNLOADS_DIR/${basename_no_ext}.mp3"
    if [ -f "$mp3_file" ]; then
        if rm "$mp3_file"; then
            echo "  🗑️  已删除同名mp3: ${basename_no_ext}.mp3"
            ((deleted_mp3_count++))
        else
            echo "  ❌ 删除mp3失败: ${basename_no_ext}.mp3"
        fi
    fi
    
    echo ""
done < <(find "$DOWNLOADS_DIR" -maxdepth 1 -type f -name "*.ass" -print0)

echo "✨ 处理完成！"
echo "📊 统计结果:"
echo "  - 已移动.ass文件: $moved_count 个"
echo "  - 已删除.srt文件: $deleted_srt_count 个"  
echo "  - 已删除.mp3文件: $deleted_mp3_count 个"
echo ""
echo "🎯 所有.ass文件已移动到: $SUBTITLES_DIR"
