# YouTube Shorts Clipper - High Quality Backend Setup

## 🎯 Overview

This setup provides **highest quality video clipping** using a Node.js backend service with **ytdl-core** and **FFmpeg**. The system automatically tries the backend first and falls back to client-side processing if unavailable.

## 🔧 Quick Setup

### 1. **One-Command Setup**
```bash
npm run setup
```

### 2. **Start Backend Service**
```bash
npm run backend
```

### 3. **Load Chrome Extension**
1. Open Chrome → Extensions → Developer Mode
2. Click "Load Unpacked" → Select this project folder
3. Navigate to any YouTube video
4. Click the clipper button

## 📋 Manual Setup (Alternative)

### Prerequisites
- **Node.js 16+** and **npm 8+**
- **2GB+ RAM** for video processing
- **Python 3.7+** (for ytdl-core dependencies)

### Step-by-Step Installation

1. **Install Main Dependencies**
   ```bash
   npm install
   ```

2. **Install Backend Dependencies**
   ```bash
   cd backend
   npm install
   cd ..
   ```

3. **Download FFmpeg (Optional - already included)**
   ```bash
   npm run download-ffmpeg
   ```

4. **Start Backend Server**
   ```bash
   npm run backend
   # OR
   node start-backend.js
   # OR manually
   cd backend && npm start
   ```

## 🎬 How It Works

### Intelligent Processing Pipeline

1. **Backend First (Highest Quality)**
   - Uses **ytdl-core** to download original YouTube video
   - **FFmpeg** extracts exact time segment
   - **High-quality encoding**: CRF 18, 8Mbps bitrate
   - **Original aspect ratio** maintained
   - **MP4 output** with web optimization

2. **Client-Side Fallback**
   - If backend unavailable, uses canvas recording
   - Still provides good quality but not optimal
   - No server setup required

### Quality Comparison

| Method | Quality | Speed | Setup Required |
|--------|---------|-------|----------------|
| **Backend** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ✅ Simple |
| **Client-Side** | ⭐⭐⭐ | ⭐⭐ | ❌ None |

## 🚀 Usage

### Via Extension
1. Navigate to any YouTube video
2. Click the **clipper button** in the video player
3. Set **start and end times**
4. Click **"Create Clip"**
5. Extension automatically:
   - Tries backend (high quality)
   - Falls back to client-side if needed
   - Downloads MP4 file

### Processing Options

The backend supports multiple processing modes:

```javascript
// Phase 1: High-quality time clipping (16:9)
{
  videoId: "dQw4w9WgXcQ",
  startTime: 10,
  endTime: 70,
  maintainAspectRatio: true,  // Keep original 16:9
  quality: "highest"
}

// Phase 2: Advanced processing (9:16 portrait)
{
  videoId: "dQw4w9WgXcQ", 
  startTime: 10,
  endTime: 70,
  convertToPortrait: true,    // Convert to 9:16
  embedSubtitles: true,       // Add subtitles
  autoFocus: true            // AI focusing (future)
}
```

## 🔧 Configuration

### Backend URLs
The extension tries these backend services in order:

1. `http://localhost:3001` (Local development)
2. `https://your-backend.herokuapp.com` (Heroku deployment)
3. `https://your-backend.railway.app` (Railway deployment)

### Environment Variables

Create `backend/.env`:

```env
# Server Configuration  
PORT=3001
NODE_ENV=development

# CORS Origins
ALLOWED_ORIGINS=chrome-extension://your-extension-id

# Processing Limits
MAX_CLIP_DURATION=120
MAX_FILE_SIZE=524288000

# Quality Settings
DEFAULT_CRF=18
MAX_BITRATE=8M
```

## 🌐 Deployment Options

### Local Development (Recommended)
```bash
npm run backend:dev
# Backend runs on http://localhost:3001
```

### Production Deployment

#### Option 1: Heroku
```bash
cd backend
heroku create your-clipper-backend
git push heroku main
```

#### Option 2: Railway
1. Connect GitHub repository to Railway
2. Deploy backend directory
3. Auto-deploys on push

#### Option 3: DigitalOcean/AWS/GCP
```bash
# On your server
git clone your-repo
cd youtube-shorts-clipper
npm run setup
npm install -g pm2
pm2 start backend/server.js --name clipper-backend
```

## 📊 Backend API Endpoints

### Health Check
```bash
GET http://localhost:3001/health
```

### Start Video Processing
```bash
POST http://localhost:3001/api/process-clip
Content-Type: application/json

{
  "videoId": "dQw4w9WgXcQ",
  "startTime": 10,
  "endTime": 70,
  "maintainAspectRatio": true,
  "quality": "highest"
}

Response: { "jobId": "uuid-here" }
```

### Check Job Status
```bash
GET http://localhost:3001/api/job-status/{jobId}

Response: {
  "status": "completed",
  "progress": 100, 
  "videoBlob": "base64-encoded-video",
  "metadata": { ... }
}
```

## 🛠️ Troubleshooting

### Common Issues

#### "Backend unavailable" message
- **Solution**: Start the backend with `npm run backend`
- **Check**: Backend running on http://localhost:3001/health

#### "ytdl-core" download fails
- **Cause**: YouTube changes download URLs frequently
- **Solution**: Update ytdl-core: `cd backend && npm update @distube/ytdl-core`

#### FFmpeg not found
- **Solution**: Backend includes ffmpeg-static, should work automatically
- **Manual fix**: Install FFmpeg system-wide

#### CORS errors
- **Solution**: Backend is configured to allow Chrome extensions
- **Check**: Extension origin matches allowed origins

### Debug Mode

Start backend with debug logging:
```bash
cd backend
DEBUG=* npm start
```

### Performance Optimization

For better performance:

1. **Increase memory limit**:
   ```bash
   node --max-old-space-size=4096 server.js
   ```

2. **Use SSD storage** for temp files

3. **Enable compression** (already included)

## ⚡ Performance Metrics

### Typical Processing Times
- **30-second clip**: ~45 seconds
- **2-minute clip**: ~3 minutes  
- **Download speed**: Depends on YouTube and connection

### Quality Output
- **Video codec**: H.264 High Profile
- **Audio codec**: AAC 48kHz
- **Bitrate**: Up to 8Mbps (1080p)
- **CRF**: 18 (excellent quality)
- **Format**: MP4 with web optimization

## 🔄 Updates

### Updating ytdl-core
```bash
cd backend
npm update @distube/ytdl-core
```

### Updating FFmpeg
```bash
cd backend  
npm update ffmpeg-static fluent-ffmpeg
```

## 📝 Logs

Backend logs show:
- Download progress
- Processing steps
- Quality settings used
- File sizes
- Processing times

Example log output:
```
🎬 Processing clip request: { videoId: 'dQw4w9WgXcQ', startTime: 10, endTime: 70 }
📥 Downloading YouTube video: dQw4w9WgXcQ
📺 Video title: Rick Astley - Never Gonna Give You Up
🎯 Selected format: 1080p - mp4
✂️ Extracting HIGH QUALITY segment: 10s to 70s (60s)
🎯 Optimizing high quality video for web delivery
✅ Job abc-123 completed - Video size: 45672843 bytes
```

## 🤝 Support

If you encounter issues:
1. Check the troubleshooting section above
2. Look at backend logs for error details
3. Verify all dependencies are installed
4. Test with `npm run backend:dev` for detailed logging

The system is designed to be robust - even if the backend fails, the extension will fall back to client-side processing to ensure functionality. 