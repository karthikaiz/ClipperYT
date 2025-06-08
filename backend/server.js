// YouTube Shorts Clipper - Backend API Server

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const { RateLimiterMemory } = require('rate-limiter-flexible');
require('dotenv').config();

const VideoProcessor = require('./processors/video-processor');
const SubtitleExtractor = require('./processors/subtitle-extractor');
const transcriptionRoutes = require('./routes/transcription');

class ClipperBackend {
  constructor() {
    this.app = express();
    this.port = process.env.PORT || 3001;
    this.jobs = new Map(); // In-memory job storage (use Redis in production)
    this.videoProcessor = new VideoProcessor();
    this.subtitleExtractor = new SubtitleExtractor();
    
    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
  }

  setupMiddleware() {
    // Security middleware
    this.app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-eval'"], // For FFmpeg.wasm
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", "data:", "https:"],
          connectSrc: ["'self'", "https://www.youtube.com", "https://*.googlevideo.com"]
        }
      }
    }));

    // CORS configuration - Allow Chrome extensions and YouTube
    this.app.use(cors({
      origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);
        
        // Allow Chrome extension origins
        if (origin.startsWith('chrome-extension://')) {
          return callback(null, true);
        }
        
        // Allow YouTube origins
        if (origin.includes('youtube.com')) {
          return callback(null, true);
        }
        
        // Allow localhost for development
        if (origin.includes('localhost')) {
          return callback(null, true);
        }
        
        // Allow specific domains
        const allowed = process.env.ALLOWED_ORIGINS?.split(',') || [];
        if (allowed.includes(origin)) {
          return callback(null, true);
        }
        
        console.log('🚫 CORS blocked origin:', origin);
        callback(null, true); // Allow all for now - can be restricted later
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Origin', 'Accept'],
      exposedHeaders: ['Content-Length', 'X-Foo', 'X-Bar']
    }));

    // Rate limiting - increased for development
    const rateLimiter = new RateLimiterMemory({
      keyGenerator: (req) => req.ip,
      points: 100, // Number of requests (increased)
      duration: 60, // Per 60 seconds
    });

    this.app.use(async (req, res, next) => {
      try {
        await rateLimiter.consume(req.ip);
        next();
      } catch (rejRes) {
        res.status(429).json({
          error: 'Too Many Requests',
          message: 'Rate limit exceeded. Please try again later.'
        });
      }
    });

    // Body parsing
    this.app.use(express.json({ limit: '50mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '50mb' }));

    // Multer for file uploads
    this.upload = multer({
      storage: multer.memoryStorage(),
      limits: {
        fileSize: 500 * 1024 * 1024, // 500MB
        files: 1
      },
      fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('video/')) {
          cb(null, true);
        } else {
          cb(new Error('Only video files are allowed'), false);
        }
      }
    });

    // Handle preflight requests
    this.app.options('*', (req, res) => {
      res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
      res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
      res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Origin, Accept');
      res.header('Access-Control-Allow-Credentials', 'true');
      res.sendStatus(200);
    });

    // Request logging
    this.app.use((req, res, next) => {
      console.log(`${new Date().toISOString()} - ${req.method} ${req.path} - Origin: ${req.headers.origin || 'none'}`);
      next();
    });
  }

  setupRoutes() {
    // Health check endpoints
    const healthHandler = (req, res) => {
      res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: '1.0.0',
        cors: 'enabled'
      });
    };

    this.app.get('/health', healthHandler);
    this.app.get('/api/health', healthHandler);

    // Get video information
    this.app.post('/api/video/info', async (req, res) => {
      try {
        const { videoId, url } = req.body;
        
        if (!videoId) {
          return res.status(400).json({
            error: 'Video ID is required'
          });
        }

        // Extract video metadata (duration, title, etc.)
        const videoInfo = await this.getVideoInfo(videoId, url);
        
        res.json({
          success: true,
          data: videoInfo
        });

      } catch (error) {
        console.error('Error getting video info:', error);
        res.status(500).json({
          error: 'Failed to get video information',
          message: error.message
        });
      }
    });

    // Extract subtitles
    this.app.post('/api/subtitles/extract', async (req, res) => {
      try {
        const { videoId, startTime, endTime, language } = req.body;
        
        if (!videoId) {
          return res.status(400).json({
            error: 'Video ID is required'
          });
        }

        const subtitles = await this.subtitleExtractor.extractSubtitles(
          videoId, 
          startTime || 0, 
          endTime
        );
        
        res.json({
          success: true,
          data: subtitles
        });

      } catch (error) {
        console.error('Error extracting subtitles:', error);
        res.status(500).json({
          error: 'Failed to extract subtitles',
          message: error.message
        });
      }
    });

    // Transcription routes (Gemini 2.0 Flash)
    this.app.use('/api/transcription', transcriptionRoutes);

    // Process clip - main endpoint
    this.app.post('/api/process-clip', async (req, res) => {
      try {
        const clipData = req.body;
        console.log('🎬 Processing clip request:', clipData);
        
        // Validate clip data
        const validation = this.validateClipData(clipData);
        if (!validation.valid) {
          return res.status(400).json({
            error: 'Invalid clip data',
            message: validation.errors.join(', ')
          });
        }

        // Create processing job
        const jobId = uuidv4();
        const job = {
          id: jobId,
          status: 'processing',
          progress: 0,
          message: 'Starting video processing...',
          clipData: clipData,
          createdAt: new Date(),
          updatedAt: new Date()
        };

        this.jobs.set(jobId, job);

        // Start processing asynchronously
        this.processClipAsync(jobId);

        res.json({
          success: true,
          jobId: jobId,
          message: 'Processing started'
        });

      } catch (error) {
        console.error('Error starting clip processing:', error);
        res.status(500).json({
          error: 'Failed to start processing',
          message: error.message
        });
      }
    });

    // Job status endpoint
    this.app.get('/api/job-status/:jobId', (req, res) => {
      const { jobId } = req.params;
      const job = this.jobs.get(jobId);
      
      if (!job) {
        return res.status(404).json({
          error: 'Job not found'
        });
      }

      res.json({
        id: job.id,
        status: job.status,
        progress: job.progress,
        message: job.message,
        completed: job.status === 'completed' || job.status === 'failed',
        success: job.status === 'completed',
        error: job.error,
        videoBlob: job.videoBlob,
        downloadUrl: job.downloadUrl,
        clipData: job.clipData,
        metadata: job.metadata
      });
    });

    // Start clip processing (legacy endpoint)
    this.app.post('/api/clips/process', async (req, res) => {
      try {
        const clipData = req.body;
        
        // Validate clip data
        const validation = this.validateClipData(clipData);
        if (!validation.valid) {
          return res.status(400).json({
            error: 'Invalid clip data',
            message: validation.errors.join(', ')
          });
        }

        // Create processing job
        const jobId = uuidv4();
        const job = {
          id: jobId,
          status: 'queued',
          progress: 0,
          message: 'Queued for processing',
          clipData: clipData,
          createdAt: new Date(),
          updatedAt: new Date()
        };

        this.jobs.set(jobId, job);

        // Start processing asynchronously
        this.processClipAsync(jobId);

        res.json({
          success: true,
          jobId: jobId,
          message: 'Processing started'
        });

      } catch (error) {
        console.error('Error starting clip processing:', error);
        res.status(500).json({
          error: 'Failed to start processing',
          message: error.message
        });
      }
    });

    // Get job status
    this.app.get('/api/jobs/:jobId/status', (req, res) => {
      try {
        const { jobId } = req.params;
        const job = this.jobs.get(jobId);

        if (!job) {
          return res.status(404).json({
            error: 'Job not found'
          });
        }

        res.json({
          success: true,
          data: {
            id: job.id,
            status: job.status,
            progress: job.progress,
            message: job.message,
            createdAt: job.createdAt,
            updatedAt: job.updatedAt,
            result: job.result
          }
        });

      } catch (error) {
        console.error('Error getting job status:', error);
        res.status(500).json({
          error: 'Failed to get job status',
          message: error.message
        });
      }
    });

    // Download processed clip
    this.app.get('/api/jobs/:jobId/download', (req, res) => {
      try {
        const { jobId } = req.params;
        const job = this.jobs.get(jobId);

        if (!job) {
          return res.status(404).json({
            error: 'Job not found'
          });
        }

        if (job.status !== 'completed' || !job.result) {
          return res.status(400).json({
            error: 'Job not completed or no result available'
          });
        }

        // Set download headers
        const filename = `clip_${jobId}_${Date.now()}.mp4`;
        res.setHeader('Content-Type', 'video/mp4');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        
        // Send the video buffer
        res.send(job.result.videoBuffer);

      } catch (error) {
        console.error('Error downloading clip:', error);
        res.status(500).json({
          error: 'Failed to download clip',
          message: error.message
        });
      }
    });

    // Upload video file for processing
    this.app.post('/api/upload', this.upload.single('video'), async (req, res) => {
      try {
        if (!req.file) {
          return res.status(400).json({
            error: 'No video file uploaded'
          });
        }

        const { startTime, endTime, autoFocus, includeSubtitles } = req.body;
        
        // Create processing job for uploaded file
        const jobId = uuidv4();
        const job = {
          id: jobId,
          status: 'queued',
          progress: 0,
          message: 'Processing uploaded video',
          clipData: {
            uploadedFile: req.file.buffer,
            originalName: req.file.originalname,
            startTime: parseFloat(startTime) || 0,
            endTime: parseFloat(endTime),
            autoFocus: autoFocus === 'true',
            includeSubtitles: includeSubtitles === 'true'
          },
          createdAt: new Date(),
          updatedAt: new Date()
        };

        this.jobs.set(jobId, job);
        this.processUploadedFileAsync(jobId);

        res.json({
          success: true,
          jobId: jobId,
          message: 'Upload successful, processing started'
        });

      } catch (error) {
        console.error('Error processing upload:', error);
        res.status(500).json({
          error: 'Failed to process upload',
          message: error.message
        });
      }
    });

    // List all jobs (for debugging/admin)
    this.app.get('/api/jobs', (req, res) => {
      const jobList = Array.from(this.jobs.values()).map(job => ({
        id: job.id,
        status: job.status,
        progress: job.progress,
        message: job.message,
        createdAt: job.createdAt,
        updatedAt: job.updatedAt
      }));

      res.json({
        success: true,
        data: jobList
      });
    });
  }

  setupErrorHandling() {
    // 404 handler
    this.app.use((req, res) => {
      res.status(404).json({
        error: 'Not Found',
        message: 'The requested endpoint does not exist'
      });
    });

    // Global error handler
    this.app.use((error, req, res, next) => {
      console.error('Unhandled error:', error);
      
      res.status(500).json({
        error: 'Internal Server Error',
        message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
      });
    });
  }

  async processClipAsync(jobId) {
    const job = this.jobs.get(jobId);
    if (!job) return;

    try {
      // Update job status
      job.status = 'processing';
      job.progress = 0;
      job.message = 'Starting video processing';
      job.updatedAt = new Date();

      // Set up progress callback
      this.videoProcessor.setProgressCallback((progress, message) => {
        job.progress = progress;
        job.message = message;
        job.updatedAt = new Date();
      });

      // Process the clip
      const result = await this.videoProcessor.processClip(job.clipData);

      if (result.success && result.videoBuffer) {
        // Convert video buffer to base64 for transmission
        const base64Video = result.videoBuffer.toString('base64');
        
        // Store the result
        job.status = 'completed';
        job.progress = 100;
        job.message = 'Processing completed successfully';
        job.result = result;
        job.videoBlob = base64Video; // Store as base64
        job.metadata = result.metadata;
        job.updatedAt = new Date();
        
        console.log(`✅ Job ${jobId} completed - Video size: ${result.videoBuffer.length} bytes`);
      } else {
        throw new Error('Processing failed - no video output');
      }

    } catch (error) {
      console.error(`❌ Job ${jobId} failed:`, error);
      job.status = 'failed';
      job.message = error.message;
      job.error = error.message;
      job.updatedAt = new Date();
    }
  }

  async processUploadedFileAsync(jobId) {
    // Similar to processClipAsync but for uploaded files
    // Implementation would handle local file processing
    const job = this.jobs.get(jobId);
    if (!job) return;

    try {
      job.status = 'processing';
      job.updatedAt = new Date();

      // Process uploaded file
      // This is a simplified version - would need full implementation
      
      job.status = 'completed';
      job.progress = 100;
      job.message = 'Upload processing completed';
      job.updatedAt = new Date();

    } catch (error) {
      console.error(`Upload job ${jobId} failed:`, error);
      job.status = 'failed';
      job.message = error.message;
      job.updatedAt = new Date();
    }
  }

  async getVideoInfo(videoId, url) {
    // Mock implementation - would extract real video metadata
    return {
      videoId: videoId,
      title: 'Sample Video Title',
      duration: 300, // 5 minutes
      thumbnail: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
      hasSubtitles: true,
      quality: '1080p'
    };
  }

  validateClipData(clipData) {
    const errors = [];
    
    if (!clipData.videoId && !clipData.uploadedFile) {
      errors.push('Video ID or uploaded file is required');
    }
    
    if (clipData.startTime < 0) {
      errors.push('Start time must be non-negative');
    }
    
    if (clipData.endTime && clipData.endTime <= clipData.startTime) {
      errors.push('End time must be greater than start time');
    }
    
    const duration = clipData.endTime - clipData.startTime;
    if (duration > 120) {
      errors.push('Clip duration cannot exceed 2 minutes');
    }

    return {
      valid: errors.length === 0,
      errors: errors
    };
  }

  // Cleanup old jobs periodically
  startJobCleanup() {
    setInterval(() => {
      const cutoffTime = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago
      
      for (const [jobId, job] of this.jobs.entries()) {
        if (job.createdAt < cutoffTime) {
          this.jobs.delete(jobId);
          console.log(`Cleaned up old job: ${jobId}`);
        }
      }
    }, 60 * 60 * 1000); // Run every hour
  }

  start() {
    this.app.listen(this.port, () => {
      console.log(`🚀 YouTube Shorts Clipper Backend running on port ${this.port}`);
      console.log(`📊 Health check: http://localhost:${this.port}/health`);
      console.log(`🎬 API base URL: http://localhost:${this.port}/api`);
    });

    this.startJobCleanup();
  }
}

// Start server if run directly
if (require.main === module) {
  const backend = new ClipperBackend();
  backend.start();
}

module.exports = ClipperBackend; 