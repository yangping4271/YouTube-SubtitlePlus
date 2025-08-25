# Youtube-Translator

[中文版本](./README_zh.md) | [English](./README.md)

A Chrome extension that displays local subtitle files on YouTube videos, supporting both single and bilingual subtitles with real-time style customization.

## 🌟 Features

- ✅ **Bilingual Subtitle Support**: Display English and Chinese subtitles simultaneously
- ✅ **Multiple Format Support**: SRT and VTT subtitle formats
- ✅ **Real-time Synchronization**: Perfect sync with video playback
- ✅ **Custom Styling**: Font size, color, position, and transparency settings
- ✅ **Drag & Drop Upload**: Easy subtitle file management
- ✅ **Responsive Design**: Adapts to fullscreen and theater modes
- ✅ **Smart Background**: Individual background for each subtitle line
- ✅ **User-friendly Interface**: Intuitive popup interface

## 📁 Project Structure

```
Youtube-Translator/
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
├── docs/                   # Documentation
│   ├── README.md           # Detailed user guide
│   └── INSTALL.md          # Installation guide
└── examples/               # Example files
    └── example-subtitle.srt # Sample subtitle file
```

## 🚀 Quick Start

### Installation

1. Open Chrome browser
2. Go to `chrome://extensions/`
3. Enable "Developer mode"
4. Click "Load unpacked extension"
5. **Select the `extension` folder** (Important: only select the extension folder)

### Usage

#### Single Language Subtitles
1. Open any YouTube video
2. Click the extension icon in the toolbar
3. Upload an SRT or VTT subtitle file
4. Toggle "Enable Subtitles" switch
5. Subtitles will automatically sync with the video

#### Bilingual Subtitles
1. Open any YouTube video
2. Click the extension icon
3. Upload both English and Chinese subtitle files (SRT/VTT format)
4. Toggle "Enable Subtitles" switch  
5. English subtitles will appear above, Chinese subtitles below

## ⚙️ Customization

### Style Settings
- **Font Size**: 12px - 32px (default: 16px)
- **Font Color**: Fully customizable (default: white)
- **Background Opacity**: 0-100% (default: 60%)
- **Position**: Bottom/Top/Center alignment
- **Quick Presets**: Standard, Large, High Contrast, Theater modes

### Supported Formats
- **SRT**: SubRip subtitle format
- **VTT**: WebVTT subtitle format

## 💻 Technical Features

- Built with Chrome Manifest V3
- Modern JavaScript ES6+ syntax
- Responsive CSS design
- High-performance subtitle parsing and sync algorithms
- Secure local data storage
- ResizeObserver and MutationObserver optimizations

## 📖 Documentation

- [Installation Guide](./docs/INSTALL.md)
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