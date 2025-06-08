# ClipperYT

A Chrome Extension that creates high-quality video clips from any YouTube video with precise timing controls and maximum quality downloads.

## 🚀 Features

- **🎯 Precise Time-based Clipping** - Select any segment from 10 seconds to 60 minutes
- **🔥 High-Quality Downloads** - Up to 1080p using yt-dlp technology  
- **🎬 Original Aspect Ratio** - Maintains YouTube's original 16:9 format
- **📱 MP4 Output** - Universal format compatible with all devices
- **⚡ Fast Processing** - Powered by yt-dlp and FFmpeg
- **🎵 Perfect Audio Sync** - Preserves audio quality and synchronization
- **🎮 Retro Tech UI** - Beautiful ClipperYT interface with neon styling
- **🔄 YouTube Integration** - Seamless clipper button in video controls

## 📱 Perfect For

- Content creators extracting highlights from long videos
- Educators creating focused learning segments  
- Social media managers repurposing content
- Anyone wanting high-quality video clips from YouTube

## 🛠️ Installation

### Chrome Extension

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/youtube-shorts-clipper.git
   cd youtube-shorts-clipper
   ```

2. **Install backend dependencies**
   ```bash
   cd backend
   npm install
   ```

3. **Install yt-dlp** (Required for high-quality downloads)
   ```bash
   # Windows (using winget)
   winget install yt-dlp
   
   # macOS (using Homebrew)
   brew install yt-dlp
   
   # Linux
   sudo apt install yt-dlp
   ```

4. **Start the backend server**
   ```bash
   npm start
   ```

5. **Load extension in Chrome**
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable "Developer mode" in the top right
   - Click "Load unpacked" and select the project directory
   - The ClipperYT icon should appear in your Chrome toolbar

## 🎯 Usage

### Quick Start
1. **Go to any YouTube video**
2. **Click the "Clip" button** in the YouTube video controls
3. **Set your timing**:
   - Enter start time (e.g., "1:30" or "90")
   - Enter end time (e.g., "3:45" or "225") 
   - Or use "Use Current" to grab current video time
4. **Choose quality**: 720p, 1080p, or Highest Available
5. **Click "Create Clip"** and wait for processing
6. **Download** starts automatically when complete

### Popup Interface
- **Plugin Information** - Overview of ClipperYT features
- **How to Use** - Step-by-step instructions
- **Status Indicator** - Shows if you're ready to clip
- **Smart Navigation** - Opens YouTube or focuses current tab

## ⚙️ Technical Details

### Architecture
- **Frontend**: Chrome Extension with retro tech UI
- **Backend**: Node.js + Express API server
- **Video Processing**: yt-dlp + FFmpeg pipeline
- **Quality**: Adaptive streams for maximum resolution

### Processing Pipeline
1. **Video Analysis** - yt-dlp extracts available formats
2. **Quality Selection** - Chooses best video ≤1080p + best audio
3. **Stream Download** - Downloads separate video/audio streams
4. **Merging** - FFmpeg combines streams with perfect sync
5. **Output** - High-quality MP4 ready for download

### File Structure
```
youtube-shorts-clipper/
├── manifest.json              # Extension manifest
├── background.js              # Service worker
├── content/
│   ├── content.js            # YouTube page integration
│   └── content.css           # ClipperYT retro styling
├── popup/
│   ├── popup.html            # Information popup
│   ├── popup.js              # Popup functionality  
│   └── popup.css             # Retro tech design
├── backend/
│   ├── server.js             # Express API server
│   ├── processors/
│   │   └── video-processor.js # yt-dlp + FFmpeg processing
│   └── package.json          # Backend dependencies
└── assets/
    └── icons/               # Extension icons
```

## 🎨 UI Design

### ClipperYT Retro Tech Theme
- **Colors**: Dark navy (`#1a1a2e`), neon green (`#00ff41`), cyan (`#00ffff`)
- **Fonts**: Monospace (Courier New) for authentic tech feel
- **Effects**: Glowing borders, scanning lines, shimmer animations
- **Style**: Terminal-inspired with blinking cursors and grid patterns

### Interface Components
- **Popup**: Informational hub with features and navigation
- **YouTube Overlay**: Full clipping interface with time controls
- **Progress Tracking**: Animated progress bars with neon effects
- **Button Integration**: Clean clipper button in YouTube controls

## 🔧 Configuration

### Quality Options
- **720p (HD)** - Good quality, smaller file size
- **1080p (Full HD)** - High quality, recommended
- **Highest Available** - Maximum quality from YouTube

### Timing Controls
- **Format Support**: "1:30", "90", "1:30:45" (HH:MM:SS, MM:SS, or seconds)
- **Duration Limits**: 10 seconds minimum, 60 minutes maximum
- **Current Time**: "Use Current" buttons grab video playback position

## 🚦 Browser Compatibility

- **Chrome 88+** (Manifest V3 requirement)
- **Edge Chromium** (same engine as Chrome)
- **Memory**: 500MB+ recommended for video processing
- **Dependencies**: Node.js 16+, yt-dlp, FFmpeg

## 🔒 Privacy & Security

- **Local Processing** - Videos processed on your backend server
- **No Data Collection** - ClipperYT doesn't track or store user data
- **Secure Downloads** - Direct from YouTube using yt-dlp
- **Manifest V3** - Latest Chrome extension security standards

## 🐛 Troubleshooting

### Common Issues

**Clipper button not appearing**
- Refresh the YouTube page
- Check console for "🚀 ClipperYT: Content script loaded" 
- Ensure you're on a video page (/watch?v=...)

**Processing failed**
- Verify backend server is running on port 3001
- Check that yt-dlp is installed and accessible
- Try a shorter clip duration
- Check browser console and server logs

**No audio in clips**
- Update to latest yt-dlp version
- Check server logs for FFmpeg errors
- Verify video has available audio streams

**Quality lower than expected**
- Try "Highest Available" quality setting
- Some videos may not have 1080p available
- Check video's original upload quality

### Debug Mode
Paste this in browser console for detailed navigation logs:
```javascript
// Use test-spa.js for SPA navigation debugging
```

## 🤝 Contributing

1. **Fork the repository**
2. **Create feature branch** (`git checkout -b feature/amazing-feature`)
3. **Make changes** to extension or backend
4. **Test thoroughly** with different YouTube videos
5. **Commit changes** (`git commit -m 'Add amazing feature'`)
6. **Push to branch** (`git push origin feature/amazing-feature`)
7. **Open Pull Request**

### Development Setup
```bash
# Backend development
cd backend
npm run dev

# Extension testing
# Load unpacked extension in Chrome
# Open YouTube and test clipping functionality
```

## 📈 Roadmap

### Current Version (v1.2.5)
- ✅ High-quality time-based clipping
- ✅ yt-dlp integration for maximum quality
- ✅ Retro tech UI design
- ✅ YouTube SPA navigation support
- ✅ Perfect audio synchronization

### Future Enhancements
- 🔄 Batch clipping multiple segments
- 🔄 Quality presets and custom settings
- 🔄 Clip library and management
- 🔄 Advanced timing controls
- 🔄 Export format options

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.


## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/your-username/youtube-shorts-clipper/issues)
- **Backend API**: See `backend/README.md` for server documentation
- **Extension**: Check browser console for debugging info

---

**ClipperYT v1.2.5** - *High-quality YouTube video clipping made simple* 🎬✨

*Extract the best moments from any YouTube video with professional quality and retro style!* 