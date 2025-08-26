# YouTube-SubtitlePlus

[中文版本](./README_zh.md) | [English](./README.md)

A modern Chrome extension that displays local subtitle files on YouTube videos with advanced bilingual support, automatic loading, and comprehensive style customization.

## ✨ Key Features

### 🎯 Core Functionality
- **Smart Auto-Loading**: Automatically loads subtitle files based on YouTube video ID
- **Bilingual Support**: Simultaneous display of English and Chinese subtitles
- **Multi-Format Support**: ASS, SRT, and VTT subtitle formats with intelligent parsing
- **Real-Time Synchronization**: Perfect synchronization with video playback
- **Responsive Design**: Seamlessly adapts to fullscreen, theater, and mini player modes

### 🎨 Advanced Customization
- **Typography Control**: Font size (12-32px), color, and weight customization
- **Background Settings**: Adjustable transparency (0-100%) and color options  
- **Positioning System**: Bottom, top, or center alignment with smart auto-adjustment
- **Layout Engine**: Modern Flexbox-based dual subtitle layout with optimized spacing
- **Style Presets**: Quick-apply standard, large, high contrast, and theater mode presets

### 🚀 Modern Architecture
- **Chrome Manifest V3**: Built with the latest extension standards
- **Local HTTP Server**: Flask-based auto-loading server with REST API
- **Smart Parsing**: Intelligent ASS format parsing with style-based language detection
- **Performance Optimized**: Efficient DOM operations and memory management
- **Developer Friendly**: Comprehensive debugging tools and extensible codebase

## 📁 Project Architecture

```
YouTube-SubtitlePlus/
├── extension/                  # Chrome Extension Core
│   ├── manifest.json          # Extension configuration (Manifest V3)
│   ├── content.js             # Main content script for YouTube integration
│   ├── background.js          # Service worker for extension lifecycle
│   ├── popup.html/js/css      # User interface and styling
│   ├── subtitle-overlay.css   # Advanced subtitle display styles
│   └── icons/                 # Extension iconset (16px, 48px, 128px)
├── server/                    # Auto-Loading Server
│   ├── subtitle_server.py     # Flask-based HTTP server
│   ├── pyproject.toml         # Modern Python project configuration (uv)
│   ├── requirements.txt       # Fallback pip dependencies
│   └── README.md              # Server documentation and API reference
├── subtitles/                 # Local Subtitle Storage
│   └── [VideoID].ass         # Subtitle files named by YouTube video ID
├── docs/                      # Documentation Suite
│   ├── AUTO_LOAD_GUIDE.md     # Comprehensive auto-loading guide
│   ├── INSTALL.md             # Installation instructions
│   └── README.md              # User manual
├── examples/                  # Sample Files
│   └── example-subtitle.srt   # Example subtitle for testing
├── start_server.sh           # Intelligent server startup script
└── stop_server.sh            # Graceful server shutdown script
```

## 🚀 Quick Installation & Setup

### Method 1: Chrome Extension Installation

1. **Download or Clone** this repository
2. **Open Chrome** and navigate to `chrome://extensions/`
3. **Enable Developer Mode** (toggle in top-right corner)
4. **Load Unpacked Extension** → Select the `extension/` folder
5. **Verify Installation** → Extension icon should appear in toolbar

### Method 2: Auto-Loading Server Setup (Recommended)

#### Prerequisites
Install **uv** (modern Python package manager):
```bash
# macOS/Linux
curl -LsSf https://astral.sh/uv/install.sh | sh

#### Server Setup
```bash
# 1. Start the auto-loading server
./start_server.sh

# 2. Add subtitle files to subtitles/ directory
# Format: [YouTube-Video-ID].[extension]
# Example: TnhCX0KkPqs.ass for https://youtube.com/watch?v=TnhCX0KkPqs

# 3. Enable auto-loading in extension popup
# Open extension → "Auto Load" tab → Toggle "Enable Auto Load"

# 4. Stop server when finished
./stop_server.sh
```

## 💡 Usage Guide

### 🤖 Auto-Loading Mode (Smart & Efficient)

1. **Prepare Subtitles**: Place subtitle files in `subtitles/` directory
   - Naming format: `[VideoID].ass` (e.g., `TnhCX0KkPqs.ass`)
   - Supported formats: ASS (bilingual), SRT, VTT

2. **Start Server**: Run `./start_server.sh`

3. **Enable Auto-Loading**: 
   - Click extension icon → "Auto Load" tab
   - Toggle "Enable Auto Load" switch

4. **Watch Videos**: Subtitles automatically load when opening YouTube videos

### 📁 Manual Upload Mode (Traditional)

1. **Open YouTube Video**: Navigate to any YouTube video
2. **Access Extension**: Click the extension icon in toolbar
3. **Choose Upload Method**:
   - **🤖 Auto Load**: For bilingual ASS files with automatic language detection
   - **📑 Manual Upload**: For separate SRT/VTT file uploads

4. **Configure Display**: Toggle "Enable Subtitles" and customize appearance

## ⚙️ Advanced Configuration

### Style Customization Options

| Setting | Range | Default | Description |
|---------|--------|---------|-------------|
| **Font Size** | 12-32px | 16px | Subtitle text size |
| **Font Color** | Full spectrum | White | Text color picker |
| **Background Opacity** | 0-100% | 60% | Subtitle background transparency |
| **Position** | Bottom/Top/Center | Bottom | Vertical alignment |
| **Spacing** | Auto-optimized | 2px | Inter-subtitle spacing |

### Quick Style Presets

- **Standard**: 16px, white text, 60% background
- **Large**: 24px, enhanced readability
- **High Contrast**: Bold text, opaque background
- **Theater**: Optimized for fullscreen viewing

## 🔧 Technical Implementation

### Subtitle Format Support

#### ASS (Advanced SubStation Alpha)
- **Bilingual Parsing**: Automatic English/Chinese detection via style analysis
- **Style Recognition**: `Default` style → English, `Secondary` style → Chinese  
- **Rich Formatting**: Font styling, positioning, and effects support
- **Performance**: Handles 1000+ subtitle entries efficiently

#### SRT/VTT (Standard Formats)
- **Universal Compatibility**: Standard timestamp and text parsing
- **Manual Language Assignment**: User-controlled language selection
- **Lightweight Processing**: Optimized for quick loading

### Architecture Highlights

#### Modern Extension Framework
- **Manifest V3 Compliance**: Future-proof Chrome extension architecture
- **Service Worker Integration**: Efficient background processing
- **Content Script Optimization**: Minimal YouTube page impact

#### Advanced Display Engine
- **Flexbox Layout System**: Perfect dual-subtitle alignment and spacing
- **Adaptive Positioning**: Real-time adjustment to video player changes
- **Performance Monitoring**: Smart DOM updates and memory management
- **Multi-Mode Support**: Fullscreen, theater, picture-in-picture compatibility

#### Local Server Architecture
- **Flask REST API**: Clean HTTP endpoint design
- **CORS Configuration**: Secure cross-origin requests
- **Process Management**: Graceful startup/shutdown with PID tracking
- **Modern Python Tooling**: uv package management with fallback support

## 📖 Documentation

- **[Installation Guide](./docs/INSTALL.md)**: Detailed setup instructions
- **[Auto-Loading Guide](./docs/AUTO_LOAD_GUIDE.md)**: Complete auto-loading tutorial
- **[Server Documentation](./server/README.md)**: API reference and troubleshooting
- **[User Manual](./docs/README.md)**: Feature guide and best practices
- **[Chinese Documentation](./README_zh.md)**: 中文版完整文档

## 🛠️ Development

### Development Setup
```bash
# Clone repository
git clone https://github.com/username/YouTube-SubtitlePlus.git
cd YouTube-SubtitlePlus

# Load extension in Chrome
# Navigate to chrome://extensions/ → Enable Developer Mode → Load Unpacked → Select extension/

# Start development server
./start_server.sh
```

### Code Architecture
- **Frontend**: Vanilla JavaScript (ES6+), modern CSS3 with Flexbox
- **Backend**: Python Flask with uv package management
- **Extension APIs**: Chrome storage, runtime messaging, tabs management
- **Build Tools**: No build process required - direct development workflow

### Testing & Quality Assurance
- **Manual Testing**: Comprehensive test cases for all subtitle formats
- **Performance Testing**: Memory usage and DOM impact monitoring  
- **Compatibility Testing**: Multi-browser and YouTube layout validation
- **Debug Tools**: Console logging and error tracking integration

## 🤝 Contributing

1. **Fork Repository** → Create feature branch
2. **Follow Code Standards** → ES6+ JavaScript, semantic commits
3. **Test Thoroughly** → All subtitle formats and YouTube modes
4. **Submit Pull Request** → Include detailed change description

### Code Style Guidelines
- Modern JavaScript (ES6+) with clear variable naming
- Modular CSS with BEM methodology where applicable
- Comprehensive error handling and logging
- Performance-first DOM manipulation

## 📄 License

This project is licensed under the **MIT License**. See LICENSE file for details.

## 🌟 Acknowledgments

- **Chrome Extensions API**: For robust extension framework
- **YouTube**: For providing the platform integration opportunities
- **Open Source Community**: For inspiration and technical guidance
- **uv Project**: For modern Python dependency management

---

**Transform Your YouTube Experience with Professional Subtitle Support!** 🎬✨