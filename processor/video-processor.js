// Video Processor - Phase 1: Simple time-based clipping for YouTube Shorts Clipper

class VideoProcessor {
  constructor() {
    this.ffmpeg = null;
    this.isInitialized = false;
    this.progressCallback = null;
    
    // Processing state
    this.currentJob = null;
    this.processingSteps = [
      'Initializing FFmpeg',
      'Extracting video segment',
      'Optimizing video',
      'Finalizing output'
    ];
  }

  async initialize() {
    if (this.isInitialized) return;

    try {
      this.updateProgress(0, 'Loading FFmpeg...');
      
      // Dynamically import FFmpeg
      const { FFmpeg } = await import('@ffmpeg/ffmpeg');
      const { fetchFile, toBlobURL } = await import('@ffmpeg/util');
      
      this.ffmpeg = new FFmpeg();
      this.fetchFile = fetchFile;
      this.toBlobURL = toBlobURL;

      // Setup logging
      this.ffmpeg.on('log', ({ message }) => {
        console.log('FFmpeg:', message);
      });

      this.ffmpeg.on('progress', ({ progress, time }) => {
        // FFmpeg progress is for current operation
        const currentStep = this.getCurrentStep();
        const stepProgress = Math.min(progress * 100, 100);
        this.updateProgress(this.getOverallProgress(stepProgress), 
                          `${currentStep}: ${stepProgress.toFixed(0)}%`);
      });

      // Load FFmpeg core
      const baseURL = chrome.runtime.getURL('lib');
      await this.ffmpeg.load({
        coreURL: await this.toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
        wasmURL: await this.toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm')
      });

      this.isInitialized = true;
      console.log('FFmpeg initialized successfully');
      
    } catch (error) {
      console.error('Failed to initialize FFmpeg:', error);
      throw new Error('Failed to initialize video processing engine');
    }
  }

  async processClip(clipData) {
    try {
      this.currentJob = {
        ...clipData,
        currentStep: 0,
        startTime: Date.now()
      };

      if (!this.isInitialized) {
        await this.initialize();
      }

      // Validate clip duration
      const duration = clipData.endTime - clipData.startTime;
      if (duration < 10) {
        throw new Error('Clip duration must be at least 10 seconds');
      }
      if (duration > 3600) {
        throw new Error('Clip duration cannot exceed 60 minutes in Phase 1');
      }

      this.updateProgress(10, 'Extracting video segment...');
      
      // Step 1: Extract video segment
      const videoSegment = await this.extractVideoSegment(clipData);
      
      this.updateProgress(70, 'Optimizing video for download...');
      
      // Step 2: Optimize video (maintain original aspect ratio and quality)
      const optimizedVideo = await this.optimizeVideo(videoSegment, clipData);
      
      this.updateProgress(100, 'Complete!');
      
      return {
        success: true,
        videoBlob: optimizedVideo,
        metadata: {
          duration: duration,
          dimensions: videoSegment.dimensions,
          size: optimizedVideo.size,
          processingTime: Date.now() - this.currentJob.startTime,
          format: 'MP4',
          aspectRatio: '16:9'
        }
      };

    } catch (error) {
      console.error('Video processing failed:', error);
      throw error;
    } finally {
      this.currentJob = null;
    }
  }

  async extractVideoSegment(clipData) {
    try {
      // Get video URL from YouTube  
      const videoUrl = await this.getVideoStreamUrl(clipData.videoId, clipData.quality);
      
      // Fetch video data
      const videoData = await this.fetchFile(videoUrl);
      await this.ffmpeg.writeFile('input.mp4', videoData);
      
      // Extract segment with FFmpeg - maintain original quality
      const startTime = this.formatTime(clipData.startTime);
      const duration = this.formatTime(clipData.endTime - clipData.startTime);
      
      await this.ffmpeg.exec([
        '-i', 'input.mp4',
        '-ss', startTime,
        '-t', duration,
        '-c', 'copy', // Copy streams without re-encoding to maintain quality
        '-avoid_negative_ts', 'make_zero',
        'segment.mp4'
      ]);
      
      // Get segment metadata
      const segmentData = await this.ffmpeg.readFile('segment.mp4');
      const metadata = await this.getVideoMetadata('segment.mp4');
      
      return {
        data: segmentData,
        dimensions: {
          width: metadata.width,
          height: metadata.height
        },
        duration: clipData.endTime - clipData.startTime
      };
      
    } catch (error) {
      console.error('Failed to extract video segment:', error);
      throw new Error('Failed to extract video segment');
    }
  }

  async getVideoStreamUrl(videoId, quality = 'highest') {
    // Phase 1: Simplified approach
    // In a real implementation, you would:
    // 1. Use yt-dlp or similar to extract stream URLs
    // 2. Select the appropriate quality stream
    // 3. Handle YouTube's authentication requirements
    
    // For now, this is a placeholder that should be implemented
    // based on your preferred YouTube video extraction method
    
    try {
      // This would typically involve:
      // - Making requests to YouTube's API or parsing the page
      // - Extracting available video streams
      // - Selecting the highest quality stream that matches requirements
      
      const streamUrl = await this.extractYouTubeStream(videoId, quality);
      return streamUrl;
    } catch (error) {
      throw new Error(`Failed to get video stream for ${videoId}: ${error.message}`);
    }
  }

  async extractYouTubeStream(videoId, quality) {
    // Placeholder for YouTube stream extraction
    // You'll need to implement this based on your preferred method:
    // - yt-dlp integration
    // - youtube-dl
    // - Direct YouTube API calls
    // - Third-party services
    
    console.warn('YouTube stream extraction not implemented. This is a Phase 1 placeholder.');
    throw new Error('YouTube stream extraction not implemented in this Phase 1 version');
  }

  async optimizeVideo(videoSegment, clipData) {
    try {
      await this.ffmpeg.writeFile('input_segment.mp4', videoSegment.data);
      
      // Phase 1: Keep original aspect ratio (16:9), optimize for file size and compatibility
      const outputArgs = [
        '-i', 'input_segment.mp4',
        '-c:v', 'libx264',           // Use H.264 for compatibility
        '-crf', '18',                 // High quality (lower number = higher quality)
        '-preset', 'medium',          // Balanced encoding speed vs compression
        '-c:a', 'aac',               // AAC audio for compatibility
        '-b:a', '128k',              // Good audio quality
        '-movflags', '+faststart',    // Optimize for web streaming
        '-pix_fmt', 'yuv420p',       // Ensure compatibility
        'output.mp4'
      ];

      // Apply quality-specific settings
      if (clipData.quality === '720p') {
        outputArgs.splice(-1, 0, '-vf', 'scale=-2:720'); // Maintain aspect ratio, scale to 720p
      } else if (clipData.quality === '1080p') {
        outputArgs.splice(-1, 0, '-vf', 'scale=-2:1080'); // Maintain aspect ratio, scale to 1080p
      }
      // For 'highest', use original resolution

      await this.ffmpeg.exec(outputArgs);
      
      const outputData = await this.ffmpeg.readFile('output.mp4');
      return new Blob([outputData.buffer], { type: 'video/mp4' });
      
    } catch (error) {
      console.error('Failed to optimize video:', error);
      throw new Error('Failed to optimize video');
    }
  }

  async getVideoMetadata(filename) {
    try {
      // Use ffprobe to get video metadata
      await this.ffmpeg.exec([
        '-i', filename,
        '-v', 'quiet',
        '-print_format', 'json',
        '-show_format',
        '-show_streams',
        filename + '.json'
      ]);
      
      const metadataFile = await this.ffmpeg.readFile(filename + '.json');
      const metadataText = new TextDecoder().decode(metadataFile);
      const metadata = JSON.parse(metadataText);
      
      const videoStream = metadata.streams.find(stream => stream.codec_type === 'video');
      
      return {
        width: videoStream.width,
        height: videoStream.height,
        duration: parseFloat(metadata.format.duration),
        bitrate: parseInt(metadata.format.bit_rate)
      };
    } catch (error) {
      // Fallback to default values if metadata extraction fails
      console.warn('Could not extract video metadata, using defaults');
      return {
        width: 1920,
        height: 1080,
        duration: 0,
        bitrate: 0
      };
    }
  }

  formatTime(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    } else {
      return `${minutes}:${secs.toString().padStart(2, '0')}`;
    }
  }

  getCurrentStep() {
    if (!this.currentJob) return 'Idle';
    return this.processingSteps[this.currentJob.currentStep] || 'Processing';
  }

  getOverallProgress(stepProgress) {
    if (!this.currentJob) return 0;
    
    const stepWeight = 100 / this.processingSteps.length;
    const completedSteps = this.currentJob.currentStep * stepWeight;
    const currentStepProgress = (stepProgress / 100) * stepWeight;
    
    return Math.min(completedSteps + currentStepProgress, 100);
  }

  updateProgress(percentage, message) {
    if (this.progressCallback) {
      this.progressCallback({
        percentage: Math.round(percentage),
        message: message,
        phase: 'Phase 1'
      });
    }
    console.log(`Progress: ${percentage.toFixed(1)}% - ${message}`);
  }

  setProgressCallback(callback) {
    this.progressCallback = callback;
  }

  async cleanup() {
    try {
      if (this.ffmpeg && this.isInitialized) {
        // Clean up temporary files
        const tempFiles = ['input.mp4', 'segment.mp4', 'input_segment.mp4', 'output.mp4'];
        for (const file of tempFiles) {
          try {
            await this.ffmpeg.deleteFile(file);
          } catch (e) {
            // Ignore errors for files that don't exist
          }
        }
      }
    } catch (error) {
      console.warn('Cleanup warning:', error);
    }
  }
}

// Export for use in content script
if (typeof module !== 'undefined' && module.exports) {
  module.exports = VideoProcessor;
} else if (typeof window !== 'undefined') {
  window.VideoProcessor = VideoProcessor;
} 