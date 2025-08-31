# YouTube SubtitlePlus 后台守护服务使用指南

## 🎯 简化说明

YouTube SubtitlePlus 现在提供精简的后台守护服务，支持关闭终端后持续运行！

## 🚀 快速开始

### 守护进程管理

```bash
# 启动后台守护服务
./daemon_server.sh

# 查看服务状态
./daemon_status.sh

# 停止服务
scripts/server/stop_daemon.sh

# 重启服务
scripts/server/restart_daemon.sh
```

## 📊 功能特性

| 功能 | 守护进程模式 |
|------|-------------|
| 启动命令 | `./daemon_server.sh` |
| 关闭终端后运行 | ✅ 继续运行 |
| 日志管理 | 文件记录 |
| 服务管理 | 完整的启停控制 |

## 🔍 服务状态检查

运行 `./daemon_status.sh` 可以查看详细的服务状态：

```bash
📊 YouTube SubtitlePlus 服务状态检查
════════════════════════════════════════

🆔 PID文件: 7765
✅ 进程状态: 运行中
🌐 端口检查: ✅ 端口8888已监听
🔍 服务响应测试: ✅ HTTP健康检查通过
📋 日志文件: ✅ 运行正常
```

## 📋 日志管理

### 日志文件位置
- **主日志**: `logs/subtitle_server.log`
- **错误日志**: `logs/subtitle_server_error.log`
- **PID文件**: `logs/subtitle_server.pid`

### 实时查看日志
```bash
# 查看主日志
tail -f logs/subtitle_server.log

# 查看错误日志
tail -f logs/subtitle_server_error.log
```

## 🛠 故障排除

### 服务启动失败
```bash
# 检查错误日志
cat logs/subtitle_server_error.log

# 检查端口占用
lsof -i :8888

# 手动清理残留进程
scripts/server/stop_daemon.sh
```

### 服务无响应
```bash
# 重启服务
scripts/server/restart_daemon.sh

# 检查服务状态
./daemon_status.sh
```

## 🎉 使用效果

启用守护服务后，你可以：

1. **关闭终端** - 服务继续在后台运行
2. **重启电脑** - 使用系统服务可自动启动
3. **远程访问** - 服务地址 http://127.0.0.1:8888 始终可用
4. **稳定运行** - 服务崩溃后自动重启（系统服务模式）

现在终于有了真正可靠的后台字幕服务！🎊