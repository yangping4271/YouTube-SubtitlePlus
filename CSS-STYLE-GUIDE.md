# YouTube字幕样式自定义指南

## 📁 样式文件位置

### 1. 外部CSS文件
**文件路径：** `extension/subtitle-overlay.css`
- 包含完整的字幕样式定义
- 所有样式都有详细的中文注释说明
- 适合进行大量样式自定义

### 2. JavaScript内联样式
**文件路径：** `extension/content.js` (applyStyles 函数)
- 双语字幕的动态样式生成
- 主要用于响应用户设置变化
- 适合程序化样式调整

## 🎨 快速自定义方法

### 方法一：修改CSS文件（推荐）
1. 打开 `extension/subtitle-overlay.css` 文件
2. 找到要修改的样式属性（都有中文注释）
3. 按照注释中的建议值进行修改
4. 保存文件并重新加载Chrome扩展

### 方法二：修改JavaScript设置
1. 在扩展弹窗中调整设置选项
2. 系统会自动应用新的样式
3. 设置会自动保存到本地存储

## 🔧 常用样式自定义

### 字体样式
```css
/* 字体大小 */
font-size: 18px;              /* 推荐：12px-32px */

/* 字体颜色 */
color: white;                 /* 可改为：#ffffff, #ffff00, #00ff00 */

/* 字体粗细 */
font-weight: bold;            /* 可选：normal, bold, 600, 700 */
```

### 背景样式
```css
/* 背景颜色和透明度 */
background-color: rgba(0,0,0,0.7);  /* 黑色70%透明度 */

/* 内边距 */
padding: 8px 16px;            /* 上下8px 左右16px */

/* 圆角 */
border-radius: 4px;           /* 0px=直角，8px=圆角 */
```

### 位置调整
```css
/* 底部距离 */
bottom: 80px;                 /* 推荐：60px-120px */

/* 宽度限制 */
max-width: 80%;               /* 推荐：70%-90% */
```

### 文字效果
```css
/* 文字阴影 */
text-shadow: 2px 2px 4px rgba(0,0,0,0.8);

/* 行高 */
line-height: 1.4;             /* 推荐：1.2-1.6 */
```

## 📱 响应式设计

### 小屏幕适配 (≤768px)
```css
@media (max-width: 768px) {
  font-size: 14px;             /* 小屏幕字体 */
  bottom: 60px;                /* 小屏幕位置 */
  max-width: 90%;              /* 小屏幕宽度 */
}
```

### 大屏幕适配 (≥1920px)
```css
@media (min-width: 1920px) {
  font-size: 22px;             /* 大屏幕字体 */
  bottom: 100px;               /* 大屏幕位置 */
}
```

## 🎭 主题样式

### 亮色主题
```css
.light-theme {
  color: black;                /* 深色文字 */
  background-color: rgba(255,255,255,0.9); /* 白色背景 */
}
```

### 高对比度主题
```css
.high-contrast {
  color: yellow;               /* 黄色文字 */
  background-color: rgba(0,0,0,0.9); /* 近不透明黑背景 */
  border: 2px solid yellow;    /* 黄色边框 */
}
```

## ⚡ 动画效果

### 淡入淡出时长
```css
animation: subtitleFadeIn 0.3s ease-in-out; /* 可调整：0.1s-0.5s */
```

### 移动距离
```css
transform: translateX(-50%) translateY(10px); /* 可调整：5px-20px */
```

## 💡 常用数值参考

### 颜色值
- 白色：`#ffffff` 或 `white`
- 黄色：`#ffff00` 或 `yellow`
- 绿色：`#00ff00` 或 `lime`
- 红色：`#ff0000` 或 `red`
- 蓝色：`#0000ff` 或 `blue`

### 尺寸值
- 字体：`12px`, `14px`, `16px`, `18px`, `20px`, `24px`
- 距离：`40px`, `60px`, `80px`, `100px`, `120px`
- 透明度：`0.5`(50%), `0.7`(70%), `0.9`(90%)

## ⚠️ 修改注意事项

1. **备份原文件**：修改前请备份原始CSS文件
2. **保持关键属性**：不要修改 `z-index` 和 `pointer-events`
3. **居中定位**：不要删除 `transform: translateX(-50%)`
4. **重新加载**：修改后需要在Chrome扩展页面重新加载扩展
5. **测试兼容性**：在不同播放模式下测试样式效果

## 🔄 应用修改

1. 修改CSS文件后保存
2. 打开Chrome扩展管理页面 (`chrome://extensions/`)
3. 找到YouTube本地字幕显示器扩展
4. 点击"重新加载"按钮
5. 刷新YouTube页面测试效果

## 📞 获取帮助

如果遇到样式问题，可以：
1. 查看浏览器开发者工具Console中的错误信息
2. 使用项目提供的调试函数 `debugBilingualSubtitles()`
3. 参考原始CSS文件中的详细注释说明