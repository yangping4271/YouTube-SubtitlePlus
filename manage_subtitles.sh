#!/bin/bash
# YouTube SubtitlePlus 字幕文件管理脚本

SUBTITLE_DIR="/Users/yangping/YouTube-SubtitlePlus/subtitles"

show_help() {
    echo "YouTube SubtitlePlus 字幕管理工具"
    echo "用法: $0 [选项] [视频ID]"
    echo ""
    echo "选项:"
    echo "  list        列出所有字幕文件"
    echo "  info ID     显示指定视频ID的字幕信息"
    echo "  delete ID   删除指定视频ID的字幕文件"
    echo "  clean       删除所有字幕文件"
    echo "  help        显示此帮助信息"
    echo ""
    echo "示例:"
    echo "  $0 list                    # 列出所有字幕"
    echo "  $0 info TnhCX0KkPqs       # 查看视频信息"
    echo "  $0 delete TnhCX0KkPqs     # 删除指定字幕"
}

list_subtitles() {
    echo "📁 字幕文件列表 (目录: $SUBTITLE_DIR)"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    if [ ! -d "$SUBTITLE_DIR" ]; then
        echo "❌ 字幕目录不存在: $SUBTITLE_DIR"
        return 1
    fi
    
    local count=0
    for file in "$SUBTITLE_DIR"/*.{ass,srt,vtt}; do
        if [ -f "$file" ]; then
            local basename=$(basename "$file")
            local video_id="${basename%.*}"
            local format="${basename##*.}"
            local size=$(ls -lh "$file" | awk '{print $5}')
            local modified=$(date -r "$file" "+%Y-%m-%d %H:%M")
            
            echo "🎬 ${video_id} | 格式:${format} | 大小:${size} | 修改:${modified}"
            ((count++))
        fi
    done
    
    if [ $count -eq 0 ]; then
        echo "📭 未找到任何字幕文件"
    else
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo "✅ 共找到 $count 个字幕文件"
    fi
}

show_info() {
    local video_id="$1"
    if [ -z "$video_id" ]; then
        echo "❌ 请提供视频ID"
        return 1
    fi
    
    echo "🔍 视频字幕信息: $video_id"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    local found=0
    for ext in ass srt vtt; do
        local file="$SUBTITLE_DIR/${video_id}.${ext}"
        if [ -f "$file" ]; then
            local size=$(ls -lh "$file" | awk '{print $5}')
            local modified=$(date -r "$file" "+%Y-%m-%d %H:%M:%S")
            local lines=$(wc -l < "$file")
            
            echo "📄 文件: $(basename "$file")"
            echo "   🗂️  路径: $file"
            echo "   📊 大小: $size"
            echo "   📅 修改: $modified"
            echo "   📝 行数: $lines"
            echo ""
            found=1
        fi
    done
    
    if [ $found -eq 0 ]; then
        echo "❌ 未找到视频ID为 '$video_id' 的字幕文件"
        return 1
    fi
}

delete_subtitle() {
    local video_id="$1"
    if [ -z "$video_id" ]; then
        echo "❌ 请提供视频ID"
        return 1
    fi
    
    echo "🗑️  删除字幕: $video_id"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    local deleted=0
    for ext in ass srt vtt; do
        local file="$SUBTITLE_DIR/${video_id}.${ext}"
        if [ -f "$file" ]; then
            echo "🔄 删除文件: $(basename "$file")"
            rm "$file"
            if [ $? -eq 0 ]; then
                echo "✅ 删除成功: $(basename "$file")"
                ((deleted++))
            else
                echo "❌ 删除失败: $(basename "$file")"
            fi
        fi
    done
    
    if [ $deleted -eq 0 ]; then
        echo "❌ 未找到视频ID为 '$video_id' 的字幕文件"
        return 1
    else
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo "✅ 共删除 $deleted 个文件"
    fi
}

clean_all() {
    echo "🧹 清理所有字幕文件"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    read -p "⚠️  确定要删除所有字幕文件吗？(输入 'yes' 确认): " confirm
    if [ "$confirm" != "yes" ]; then
        echo "❌ 已取消操作"
        return 1
    fi
    
    local deleted=0
    for ext in ass srt vtt; do
        for file in "$SUBTITLE_DIR"/*.${ext}; do
            if [ -f "$file" ]; then
                echo "🔄 删除: $(basename "$file")"
                rm "$file"
                if [ $? -eq 0 ]; then
                    ((deleted++))
                fi
            fi
        done
    done
    
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "✅ 清理完成，共删除 $deleted 个文件"
}

# 主程序逻辑
case "$1" in
    "list")
        list_subtitles
        ;;
    "info")
        show_info "$2"
        ;;
    "delete")
        delete_subtitle "$2"
        ;;
    "clean")
        clean_all
        ;;
    "help"|"")
        show_help
        ;;
    *)
        echo "❌ 未知选项: $1"
        show_help
        exit 1
        ;;
esac