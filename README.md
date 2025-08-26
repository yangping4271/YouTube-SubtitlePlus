# YouTube-SubtitlePlus

[中文版本](./README_zh.md) | [English](./README.md)

A Chrome extension that displays local subtitle files on YouTube videos, supporting both single and bilingual subtitles with real-time style customization.

## 🌟 Features

- ✅ **Auto-load Local Subtitles**: Automatically load subtitle files based on YouTube video ID
- ✅ **Bilingual Subtitle Support**: Display English and Chinese subtitles simultaneously
- ✅ **Multiple Format Support**: ASS, SRT and VTT subtitle formats
- ✅ **Real-time Synchronization**: Perfect sync with video playback
- ✅ **Custom Styling**: Font size, color, position, and transparency settings
- ✅ **Drag & Drop Upload**: Easy subtitle file management
- ✅ **Responsive Design**: Adapts to fullscreen and theater modes
- ✅ **Smart Background**: Individual background for each subtitle line
- ✅ **Modern UI Design**: Clean interface with enhanced spacing and interactions
- ✅ **Semantic Icons**: Meaningful visual elements that enhance usability
- ✅ **User-friendly Interface**: Intuitive popup interface with improved accessibility

## 📁 Project Structure

```
YouTube-SubtitlePlus/
├── extension/              # Chrome extension files (load this folder)
│   ├── manifest.json       # Extension configuration
│   ├── content.js          # Content script (injected into YouTube)
│   ├── background.js       # Background service worker
│   ├── popup.html          # Extension popup interface
│   ├── popup.js            # Popup logic
│   ├── popup.css           # Popup styles
│   ├── subtitle-overlay.css # Subtitle display styles
│   └── icons/              # Extension icons
│       ├── icon16.png      # 16x16 toolbar icon
│       ├── icon48.png      # 48x48 management icon
│       └── icon128.png     # 128x128 store icon
├── server/                 # Local subtitle server
│   ├── subtitle_server.py  # Flask server for auto-loading
│   ├── requirements.txt    # Python dependencies (pip fallback)
│   ├── pyproject.toml      # uv project configuration
│   └── README.md           # Server documentation
├── subtitles/              # Local subtitle files directory
│   └── TnhCX0KkPqs.ass     # Example subtitle file (bilingual)
├── docs/                   # Documentation
│   ├── README.md           # Detailed user guide
│   ├── INSTALL.md          # Installation guide
│   └── AUTO_LOAD_GUIDE.md  # Auto-load feature guide
├── examples/               # Example files
│   └── example-subtitle.srt # Sample subtitle file
├── start_server.sh         # Server start script (Unix/Linux/macOS)
└── stop_server.sh          # Server stop script (Unix/Linux/macOS)
```

## 🚀 Quick Start

### Installation

1. Open Chrome browser
2. Go to `chrome://extensions/`
3. Enable "Developer mode"
4. Click "Load unpacked extension"
5. **Select the `extension` folder** (Important: only select the extension folder)

### Usage

#### 🤖 Auto-load Subtitles (NEW!)
1. **Install uv** (if not already installed):
   ```bash
   curl -LsSf https://astral.sh/uv/install.sh | sh
   ```
2. **Start the local server**: 
   ```bash
   ./start_server.sh
   ```
3. **Add subtitle files**: Place files in `subtitles/` directory with naming format `<VideoID>.ass`
   - Example: `TnhCX0KkPqs.ass` for video `https://www.youtube.com/watch?v=TnhCX0KkPqs`
4. **Enable auto-load**: Open extension popup → Switch to "Auto Load" tab → Toggle "Enable Auto Load"
5. **Watch videos**: Subtitles will automatically load when you open YouTube videos
6. **Stop the server** (when needed):
   ```bash
   ./stop_server.sh
   ```

#### 📁 Manual Upload (Traditional)
1. Open any YouTube video
2. Click the extension icon in the toolbar
3. Choose upload mode:
   - **Bilingual ASS**: Upload one ASS file containing both languages
   - **Separate Files**: Upload SRT/VTT files separately
4. Toggle "Enable Subtitles" switch
5. Subtitles will sync with the video

## ⚙️ Customization

### Style Settings
- **Font Size**: 12px - 32px (default: 16px)
- **Font Color**: Fully customizable (default: white)
- **Background Opacity**: 0-100% (default: 60%)
- **Position**: Bottom/Top/Center alignment
- **Quick Presets**: Standard, Large, High Contrast, Theater modes

### Supported Formats
- **ASS**: Advanced SubStation Alpha (supports dual-language)
- **SRT**: SubRip subtitle format
- **VTT**: WebVTT subtitle format

## 💻 Technical Features

- **Auto-loading System**: Local HTTP server for automatic subtitle loading
- Built with Chrome Manifest V3
- Modern JavaScript ES6+ syntax
- Responsive CSS design
- High-performance subtitle parsing and sync algorithms
- Secure local data storage
- ResizeObserver and MutationObserver optimizations
- Flask-based subtitle server with REST API

## 📖 Documentation

- [Auto-load Feature Guide](./docs/AUTO_LOAD_GUIDE.md) - Complete guide for automatic subtitle loading
- [Installation Guide](./docs/INSTALL.md)
- [Server Documentation](./server/README.md) - Local subtitle server setup and API reference
- [User Manual](./docs/README.md)
- [中文文档](./README_zh.md)

## 🔧 Development

- **extension/**: Contains all required Chrome extension files
- **docs/**: User documentation and guides
- **examples/**: Sample files for testing

## 📄 License

This project is licensed under the MIT License.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📞 Support

If you encounter any issues or have suggestions:
- Open an issue on GitHub
- Check the documentation in the `docs/` folder

---

**Enjoy a better YouTube viewing experience!** 🎬