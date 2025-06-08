# YouTube Shorts Clipper - Backend API

This is the backend service for the YouTube Shorts Clipper Chrome Extension. It provides server-side video processing capabilities and can be deployed independently.

## 🚀 Features

- **RESTful API** for video processing
- **File Upload Support** for local video processing
- **Job Queue System** with progress tracking
- **YouTube Integration** for video and subtitle extraction
- **FFmpeg.wasm** for server-side video processing
- **Rate Limiting** and security middleware
- **CORS Support** for Chrome Extension integration

## 📋 API Endpoints

### Health Check
```
GET /health
```

### Video Information
```
POST /api/video/info
Body: { videoId: string, url?: string }
```

### Subtitle Extraction
```
POST /api/subtitles/extract
Body: { videoId: string, startTime?: number, endTime?: number }
```

### Start Processing
```
POST /api/clips/process
Body: { videoId: string, startTime: number, endTime: number, autoFocus: boolean, includeSubtitles: boolean }
```

### Job Status
```
GET /api/jobs/:jobId/status
```

### Download Processed Clip
```
GET /api/jobs/:jobId/download
```

### File Upload
```
POST /api/upload
Form Data: video file + processing options
```

### List Jobs
```
GET /api/jobs
```

## 🛠️ Installation & Setup

### Prerequisites
- Node.js 16+ and npm 8+
- 2GB+ RAM for video processing
- 1GB+ disk space

### Local Development

1. **Navigate to backend directory**
   ```bash
   cd backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Download FFmpeg.wasm**
   ```bash
   npm run build
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```

5. **Server will be available at:**
   - Health check: http://localhost:3001/health
   - API base: http://localhost:3001/api

## 🌐 Deployment Options

### Docker Deployment

1. **Create Dockerfile**
   ```dockerfile
   FROM node:18-alpine
   
   WORKDIR /app
   COPY package*.json ./
   RUN npm ci --only=production
   
   COPY . .
   RUN npm run build
   
   EXPOSE 3001
   CMD ["npm", "start"]
   ```

2. **Build and run**
   ```bash
   docker build -t youtube-shorts-clipper-backend .
   docker run -p 3001:3001 youtube-shorts-clipper-backend
   ```

### Heroku Deployment

1. **Create Procfile**
   ```
   web: npm start
   ```

2. **Deploy**
   ```bash
   heroku create your-app-name
   git push heroku main
   ```

### DigitalOcean/AWS/Google Cloud

1. **Create a new droplet/instance**
2. **Install Node.js and PM2**
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs
   npm install -g pm2
   ```

3. **Deploy your code**
   ```bash
   git clone your-repo
   cd backend
   npm install
   npm run build
   ```

4. **Start with PM2**
   ```bash
   pm2 start server.js --name youtube-clipper-backend
   pm2 save
   pm2 startup
   ```

### Vercel Deployment

1. **Install Vercel CLI**
   ```bash
   npm install -g vercel
   ```

2. **Deploy**
   ```bash
   vercel --prod
   ```

## ⚙️ Environment Variables

Create a `.env` file in the backend directory:

```env
# Server Configuration
PORT=3001
NODE_ENV=production

# CORS Origins (comma-separated)
ALLOWED_ORIGINS=chrome-extension://your-extension-id,https://yourdomain.com

# Rate Limiting
RATE_LIMIT_POINTS=10
RATE_LIMIT_DURATION=60

# Job Settings
JOB_CLEANUP_INTERVAL=3600000
JOB_TTL=86400000

# FFmpeg Settings
FFMPEG_THREADS=2
MAX_FILE_SIZE=524288000
```

## 🔧 Configuration

### Production Optimizations

1. **Enable compression**
   ```bash
   npm install compression
   ```

2. **Add to server.js**
   ```javascript
   const compression = require('compression');
   app.use(compression());
   ```

3. **Use Redis for job storage**
   ```bash
   npm install redis
   ```

4. **Configure Redis**
   ```javascript
   const redis = require('redis');
   const client = redis.createClient(process.env.REDIS_URL);
   ```

### Security Headers

The backend includes security middleware:
- Helmet.js for security headers
- CORS configuration
- Rate limiting
- File upload restrictions

### Performance Monitoring

Add monitoring with:
```bash
npm install newrelic
# or
npm install @sentry/node
```

## 📊 Resource Requirements

### Minimum Requirements
- **CPU**: 1 core
- **RAM**: 1GB
- **Storage**: 2GB
- **Bandwidth**: 100MB/month

### Recommended for Production
- **CPU**: 2+ cores
- **RAM**: 4GB+
- **Storage**: 10GB+
- **Bandwidth**: 1GB/month

## 🔍 Monitoring & Logging

### Health Checks
The `/health` endpoint provides:
- Server status
- Uptime
- Version information
- Memory usage

### Logging
- Request logging with timestamps
- Error logging with stack traces
- Job processing logs
- FFmpeg operation logs

### Metrics to Monitor
- Response times
- Error rates
- Memory usage
- CPU usage
- Active job count
- Queue depth

## 🧪 Testing

### Run Tests
```bash
npm test
```

### API Testing with curl
```bash
# Health check
curl http://localhost:3001/health

# Process a clip
curl -X POST http://localhost:3001/api/clips/process \
  -H "Content-Type: application/json" \
  -d '{"videoId":"dQw4w9WgXcQ","startTime":10,"endTime":30,"autoFocus":true,"includeSubtitles":true}'
```

## 🚨 Troubleshooting

### Common Issues

1. **FFmpeg.wasm not loading**
   - Run `npm run build` to download FFmpeg files
   - Check network connectivity

2. **Out of memory errors**
   - Increase server RAM
   - Reduce concurrent job limit

3. **CORS errors**
   - Check ALLOWED_ORIGINS environment variable
   - Verify Chrome extension ID

4. **Rate limiting**
   - Increase RATE_LIMIT_POINTS
   - Implement authentication for higher limits

### Debug Mode
```bash
DEBUG=* npm run dev
```

## 📚 API Documentation

For complete API documentation, visit `/api/docs` when the server is running, or check the OpenAPI specification in `/docs/api.yaml`.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make changes in the backend directory
4. Add tests for new functionality
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details. 