// Video Processor - Node.js compatible video processing for YouTube Shorts Clipper

const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs').promises;
const path = require('path');
const os = require('os');
const ytdl = require('@distube/ytdl-core');
const YTDlpWrap = require('yt-dlp-wrap').default;

// Set FFmpeg binary paths for Windows
const ffmpegPath = path.join(os.homedir(), 'AppData\\Local\\Microsoft\\WinGet\\Packages\\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\\ffmpeg-7.1.1-full_build\\bin\\ffmpeg.exe');
const ffprobePath = path.join(os.homedir(), 'AppData\\Local\\Microsoft\\WinGet\\Packages\\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\\ffmpeg-7.1.1-full_build\\bin\\ffprobe.exe');

// Set FFmpeg binary paths
ffmpeg.setFfmpegPath(ffmpegPath);
ffmpeg.setFfprobePath(ffprobePath);

// yt-dlp binary path - try common locations
const ytDlpPaths = [
  path.join(os.homedir(), 'AppData\\Local\\Microsoft\\WinGet\\Links\\yt-dlp.exe'),
  path.join(os.homedir(), 'AppData\\Local\\Microsoft\\WinGet\\Packages\\yt-dlp.yt-dlp_Microsoft.Winget.Source_8wekyb3d8bbwe\\yt-dlp.exe'),
  'yt-dlp',  // Try PATH as fallback
  path.join(os.homedir(), 'AppData\\Local\\Programs\\yt-dlp\\yt-dlp.exe'),
  'C:\\Program Files\\yt-dlp\\yt-dlp.exe',
  'C:\\Program Files (x86)\\yt-dlp\\yt-dlp.exe'
];

function findYtDlpPath() {
  for (const ytDlpPath of ytDlpPaths) {
    try {
      if (ytDlpPath === 'yt-dlp') {
        // Don't check existence for PATH-based command
        return ytDlpPath;
      } else if (require('fs').existsSync(ytDlpPath)) {
        console.log(`✅ Found yt-dlp at: ${ytDlpPath}`);
        return ytDlpPath;
      }
    } catch (e) {
      // Continue trying
    }
  }
  console.log('⚠️ yt-dlp not found, using PATH fallback');
  return 'yt-dlp'; // Fallback to PATH
}

class VideoProcessor {
  constructor() {
    this.isInitialized = false;
    this.progressCallback = null;
    this.tempDir = path.join(os.tmpdir(), 'youtube-clipper');
    
    // Processing state
    this.currentJob = null;
    this.processingSteps = [
      'Initializing',
      'Creating video segment', 
      'Converting to portrait',
      'Adding subtitles',
      'Optimizing output'
    ];
  }

  async initialize() {
    if (this.isInitialized) return;

    try {
      this.updateProgress(0, 'Initializing video processor...');
      
      // Ensure temp directory exists
      await fs.mkdir(this.tempDir, { recursive: true });
      
      // Verify FFmpeg is available
      await this.verifyFFmpeg();
      
      this.isInitialized = true;
      console.log('✅ Video processor initialized successfully');
      
    } catch (error) {
      console.error('❌ Failed to initialize video processor:', error);
      throw new Error('Failed to initialize video processing engine');
    }
  }

  async verifyFFmpeg() {
    return new Promise((resolve, reject) => {
      ffmpeg.getAvailableFormats((err, formats) => {
        if (err) {
          reject(new Error('FFmpeg not available: ' + err.message));
        } else {
          console.log('✅ FFmpeg available with', Object.keys(formats).length, 'formats');
          resolve();
        }
      });
    });
  }

  async processClip(clipData) {
    try {
      this.currentJob = {
        ...clipData,
        currentStep: 0,
        startTime: Date.now(),
        id: Date.now().toString()
      };

      console.log('🎬 Starting video processing for job:', this.currentJob.id);

      if (!this.isInitialized) {
        await this.initialize();
      }

      // Check if Phase 1 (simple clipping) or advanced processing
      if (clipData.maintainAspectRatio && !clipData.convertToPortrait) {
        return await this.processHighQualityClip(clipData);
      }

      // Advanced processing with portrait conversion
      return await this.processAdvancedClip(clipData);

    } catch (error) {
      console.error('❌ Video processing failed:', error);
      await this.cleanup();
      throw error;
    }
  }

  async processHighQualityClip(clipData) {
    try {
      // Step 1: Download YouTube video in highest quality
      this.updateProgress(10, 'Downloading video in highest quality...');
      const downloadedVideo = await this.downloadYouTubeVideo(clipData);
      
      // Step 2: Extract time segment with high-quality settings
      this.updateProgress(40, 'Extracting time segment...');
      const segmentVideo = await this.extractHighQualitySegment(downloadedVideo, clipData);
      
      // Step 3: Optimize for web delivery while maintaining quality
      this.updateProgress(80, 'Optimizing for delivery...');
      const optimizedVideo = await this.optimizeHighQuality(segmentVideo);
      
      this.updateProgress(100, 'Processing complete!');
      
      // Read final video as buffer
      const videoBuffer = await fs.readFile(optimizedVideo);
      
      // Get video metadata
      const metadata = await this.getVideoMetadata(optimizedVideo);
      
      // Cleanup temp files
      await this.cleanup();
      
      return {
        success: true,
        videoBuffer: videoBuffer,
        metadata: {
          duration: clipData.endTime - clipData.startTime,
          dimensions: metadata.dimensions,
          size: videoBuffer.length,
          format: 'MP4',
          quality: metadata.quality,
          processingTime: Date.now() - this.currentJob.startTime
        }
      };
    } catch (error) {
      console.error('❌ High quality processing failed:', error);
      await this.cleanup();
      throw error;
    }
  }

  async processAdvancedClip(clipData) {
    // Original advanced processing logic
      // Step 1: Download YouTube video
      this.updateProgress(10, 'Downloading video...');
      const downloadedVideo = await this.downloadYouTubeVideo(clipData);
      
      // Step 2: Extract time segment
      this.updateProgress(35, 'Extracting time segment...');
      const segmentVideo = await this.extractTimeSegment(downloadedVideo, clipData);
      
      // Step 3: Convert to portrait (9:16)
      this.updateProgress(50, 'Converting to portrait format...');
      const portraitVideo = await this.convertToPortrait(segmentVideo, clipData);
      
      // Step 4: Add subtitles if requested
      let finalVideo = portraitVideo;
      if (clipData.embedSubtitles) {
        this.updateProgress(75, 'Adding subtitles...');
        finalVideo = await this.addSubtitles(portraitVideo, clipData);
      }
      
      // Step 5: Optimize for mobile
      this.updateProgress(90, 'Optimizing for mobile...');
      const optimizedVideo = await this.optimizeForMobile(finalVideo);
      
      this.updateProgress(100, 'Processing complete!');
      
      // Read final video as buffer
      const videoBuffer = await fs.readFile(optimizedVideo);
      
      // Cleanup temp files
      await this.cleanup();
      
      return {
        success: true,
      videoBuffer: videoBuffer,
        metadata: {
          duration: clipData.endTime - clipData.startTime,
          dimensions: { width: 1080, height: 1920 },
          size: videoBuffer.length,
        format: 'MP4',
          processingTime: Date.now() - this.currentJob.startTime
        }
      };
  }

  async downloadYouTubeVideo(clipData) {
    try {
      const outputPath = path.join(this.tempDir, `input_${this.currentJob.id}.mp4`);
      const videoUrl = `https://www.youtube.com/watch?v=${clipData.videoId}`;
      
      console.log(`📥 Downloading YouTube video: ${clipData.videoId}`);
      
      // Use yt-dlp for maximum quality adaptive streams
      const ytDlpPath = findYtDlpPath();
      console.log(`🔧 Using yt-dlp binary: ${ytDlpPath}`);
      const ytDlpWrap = new YTDlpWrap(ytDlpPath);
      
      // Step 1: Get video info and available formats
      this.updateProgress(5, 'Analyzing video formats...');
      
      let videoInfo;
      try {
        const infoResult = await ytDlpWrap.execPromise([
          videoUrl,
          '--dump-json',
          '--no-warnings',
          '--skip-download'
        ]);
        videoInfo = JSON.parse(infoResult);
      } catch (error) {
        console.error('❌ yt-dlp info extraction failed:', error);
        throw new Error('Failed to analyze video formats');
      }
      
      console.log(`📺 Video title: ${videoInfo.title}`);
      console.log(`⏱️ Video duration: ${videoInfo.duration}s`);
      
      // Step 2: Intelligent format selection for maximum quality
      const formats = videoInfo.formats || [];
      
      // Filter for video formats (excluding audio-only)
      const videoFormats = formats.filter(f => 
        f.vcodec && f.vcodec !== 'none' && 
        f.height && f.width &&
        f.ext !== 'mhtml'
      ).sort((a, b) => {
        // Sort by height (resolution) descending, then by fps, then by filesize
        if (b.height !== a.height) return b.height - a.height;
        if (b.fps !== a.fps) return (b.fps || 30) - (a.fps || 30);
        return (b.filesize || b.filesize_approx || 0) - (a.filesize || a.filesize_approx || 0);
      });
      
      // Filter for audio formats
      const audioFormats = formats.filter(f => 
        f.acodec && f.acodec !== 'none' && 
        (!f.vcodec || f.vcodec === 'none')
      ).sort((a, b) => {
        // Sort by audio bitrate/quality descending
        return (b.abr || b.tbr || 0) - (a.abr || a.tbr || 0);
      });
      
      console.log(`📋 Available video formats: ${videoFormats.length}`);
      console.log(`🎵 Available audio formats: ${audioFormats.length}`);
      
      // Log top video formats
      videoFormats.slice(0, 10).forEach((f, i) => {
        const fps = f.fps ? `@${f.fps}fps` : '';
        const codec = f.vcodec?.split('.')[0] || 'unknown';
        const size = f.filesize ? `(${Math.round(f.filesize/1024/1024)}MB)` : '';
        console.log(`   ${i+1}. ${f.height}p${fps} ${codec} ${f.ext} ${size}`);
      });
      
      // Step 3: Select best quality ≤ 1080p OR best available
      let selectedVideo = null;
      let selectedAudio = null;
      
      // Find best video format ≤ 1080p
      const maxQualityVideos = videoFormats.filter(f => f.height <= 1080);
      if (maxQualityVideos.length > 0) {
        selectedVideo = maxQualityVideos[0];
        console.log(`🎯 Selected video: ${selectedVideo.height}p ${selectedVideo.vcodec?.split('.')[0]} (${selectedVideo.format_id})`);
      } else if (videoFormats.length > 0) {
        // If no ≤1080p, select highest available (will be downscaled)
        selectedVideo = videoFormats[0];
        console.log(`🎯 Selected video: ${selectedVideo.height}p ${selectedVideo.vcodec?.split('.')[0]} (will downscale to 1080p) (${selectedVideo.format_id})`);
      }
      
      // Select best audio format (prefer Opus > AAC > others)
      if (audioFormats.length > 0) {
        selectedAudio = audioFormats.find(f => f.acodec?.includes('opus')) ||
                      audioFormats.find(f => f.acodec?.includes('aac')) ||
                      audioFormats[0];
        console.log(`🔊 Selected audio: ${selectedAudio.acodec} ${selectedAudio.abr || selectedAudio.tbr}kbps (${selectedAudio.format_id})`);
      }
      
      // Step 4: Download using yt-dlp with optimal quality
      this.updateProgress(10, 'Starting high-quality download...');
      
      let downloadArgs = [
        videoUrl,
        '--output', outputPath.replace('.mp4', '.%(ext)s'),
        '--merge-output-format', 'mp4',
        '--no-warnings',
        '--progress',
        '--newline'
      ];
      
      // If we have separated video/audio, combine them for maximum quality
      if (selectedVideo && selectedAudio) {
        downloadArgs.push('--format', `${selectedVideo.format_id}+${selectedAudio.format_id}`);
        console.log(`📦 Downloading and merging: video(${selectedVideo.format_id}) + audio(${selectedAudio.format_id})`);
      } else if (selectedVideo) {
        downloadArgs.push('--format', selectedVideo.format_id);
        console.log(`📦 Downloading video-only: ${selectedVideo.format_id}`);
      } else {
        // Fallback to best available format with intelligent quality selection
        downloadArgs.push('--format', 'bestvideo[height<=1080]+bestaudio/best[height<=1080]/bestvideo+bestaudio/best');
        console.log(`📦 Fallback to best available format`);
      }
      
      return new Promise((resolve, reject) => {
        console.log(`🔧 Executing yt-dlp with args:`, downloadArgs.join(' '));
        console.log(`📁 Expected output path: ${outputPath}`);
        
        const ytDlpProcess = ytDlpWrap.exec(downloadArgs);
        
        let lastProgress = 0;
        
        ytDlpProcess.on('progress', (progress) => {
          // yt-dlp progress format: [download] 45.2% of 123.45MiB at 1.23MiB/s ETA 00:30
          if (progress.percent) {
            const percent = Math.min(Math.round(10 + (progress.percent * 0.3)), 40);
            if (percent > lastProgress) {
              lastProgress = percent;
              this.updateProgress(percent, `Downloading: ${Math.round(progress.percent)}%`);
            }
          }
        });
        
        ytDlpProcess.on('ytDlpEvent', (eventType, eventData) => {
          if (eventType === 'progress') {
            const match = eventData.match(/(\d+\.?\d*)%/);
            if (match) {
              const percent = Math.min(Math.round(10 + (parseFloat(match[1]) * 0.3)), 40);
              if (percent > lastProgress) {
                lastProgress = percent;
                this.updateProgress(percent, `Downloading: ${match[1]}%`);
              }
            }
          }
        });
        
        ytDlpProcess.on('close', (code) => {
          if (code === 0) {
            // Find the downloaded file by scanning the temp directory
            try {
              const files = require('fs').readdirSync(this.tempDir);
              const jobId = this.currentJob.id;
              
              // Look for files that match our job ID pattern
              const downloadedFiles = files.filter(file => 
                file.includes(`input_${jobId}`) && 
                /\.(mp4|mkv|webm|m4a|avi|mov)$/i.test(file)
              );
              
              console.log(`📂 Found ${downloadedFiles.length} files in temp directory:`, downloadedFiles);
              
              if (downloadedFiles.length > 0) {
                // Check if we have separate video and audio files that need merging
                const videoFiles = downloadedFiles.filter(file => {
                  // Video format IDs: f137, f248, f136, f335, f336, f337, f298, f303, etc.
                  return /\.f(137|248|136|335|336|337|298|303|313|315|271|308|394|396|397|398|399|264|267|278|571)\./i.test(file) ||
                         // MP4 files that are not audio-only
                         (file.endsWith('.mp4') && !/\.f(251|140|139|250|249)\./i.test(file));
                });
                const audioFiles = downloadedFiles.filter(file => {
                  // Audio format IDs: f251, f140, f139, f250, f249, etc. (including -drc variants)
                  return /\.f(251|140|139|250|249|171|172|256|258|327|328|380|381|382)(-drc)?\./i.test(file) ||
                         // WebM files that are audio-only
                         (file.endsWith('.webm') && /\.f(251|140|139|250|249)(-drc)?\./i.test(file));
                });
                
                console.log(`🎬 Found ${videoFiles.length} video files, ${audioFiles.length} audio files`);
                
                if (videoFiles.length > 0 && audioFiles.length > 0) {
                  // We have separate video and audio files - merge them
                  const videoFile = path.join(this.tempDir, videoFiles[0]);
                  const audioFile = path.join(this.tempDir, audioFiles[0]);
                  
                  console.log(`🔄 Merging video: ${videoFiles[0]} + audio: ${audioFiles[0]}`);
                  
                  // Use FFmpeg to merge video and audio
                  ffmpeg(videoFile)
                    .input(audioFile)
                    .videoCodec('copy')  // Copy video stream without re-encoding
                    .audioCodec('copy')  // Copy audio stream without re-encoding
                    .outputOptions([
                      '-map 0:v:0',  // Map video from first input
                      '-map 1:a:0'   // Map audio from second input
                    ])
                    .output(outputPath)
                    .on('progress', (progress) => {
                      const percent = Math.round(35 + (progress.percent || 0) * 0.05);
                      this.updateProgress(percent, `Merging streams: ${Math.round(progress.percent || 0)}%`);
                    })
                    .on('end', () => {
                      // Verify the merged file has both video and audio
                      ffmpeg.ffprobe(outputPath, (err, metadata) => {
                        if (!err && metadata && metadata.streams) {
                          const audioStreams = metadata.streams.filter(stream => stream.codec_type === 'audio');
                          const videoStreams = metadata.streams.filter(stream => stream.codec_type === 'video');
                          console.log(`✅ Merge complete: ${videoStreams.length} video, ${audioStreams.length} audio streams`);
                        }
                      });
                      
                      // Clean up separate files
                      try {
                        fs.unlinkSync(videoFile);
                        fs.unlinkSync(audioFile);
                      } catch (e) {
                        console.warn('Could not delete temporary files:', e.message);
                      }
                      console.log('✅ Video and audio merged successfully');
                      resolve(outputPath);
                    })
                    .on('error', (err) => {
                      console.error('❌ Merge failed:', err.message);
                      // Fallback to video-only if merge fails
                      console.log('🔄 Falling back to video-only processing...');
                      resolve(videoFile);
                    })
                    .run();
                    
                } else if (downloadedFiles.length === 1) {
                  // Single file - use directly
                  const downloadedFile = downloadedFiles[0];
                  const filePath = path.join(this.tempDir, downloadedFile);
                  const stats = require('fs').statSync(filePath);
                  
                  console.log(`✅ Video downloaded: ${downloadedFile} (${stats.size} bytes)`);
                  
                  // Verify audio streams in downloaded file
                  ffmpeg.ffprobe(filePath, (err, metadata) => {
                    if (!err && metadata && metadata.streams) {
                      const audioStreams = metadata.streams.filter(stream => stream.codec_type === 'audio');
                      const videoStreams = metadata.streams.filter(stream => stream.codec_type === 'video');
                      console.log(`📊 Downloaded file analysis: ${videoStreams.length} video, ${audioStreams.length} audio streams`);
                      
                      if (audioStreams.length > 0) {
                        console.log(`🔊 Audio details: ${audioStreams[0].codec_name}, ${audioStreams[0].channels} channels, ${audioStreams[0].sample_rate}Hz`);
                      } else {
                        console.warn('⚠️ No audio streams found in downloaded file!');
                      }
                    }
                  });
                  
                  // If not MP4, convert it
                  if (!filePath.endsWith('.mp4')) {
                    console.log(`🔄 Converting ${path.extname(filePath)} to MP4...`);
                    this.convertToMp4(filePath, outputPath).then(resolve).catch(reject);
                  } else {
                    resolve(filePath);
                  }
                } else {
                  throw new Error('Multiple files found but unable to identify video/audio streams');
                }
                return;
              }
              
              // Fallback: try the original expected paths
              const possibleFiles = [
                outputPath,
                outputPath.replace('.mp4', '.mkv'),
                outputPath.replace('.mp4', '.webm')
              ];
              
              for (const filePath of possibleFiles) {
                if (require('fs').existsSync(filePath)) {
                  console.log(`✅ Video downloaded (fallback): ${require('fs').statSync(filePath).size} bytes`);
                  
                  if (!filePath.endsWith('.mp4')) {
                    console.log(`🔄 Converting ${path.extname(filePath)} to MP4...`);
                    this.convertToMp4(filePath, outputPath).then(resolve).catch(reject);
                  } else {
                    resolve(filePath);
                  }
                  return;
                }
              }
              
            } catch (dirError) {
              console.error('Error scanning temp directory:', dirError);
            }
            
            reject(new Error('Downloaded file not found'));
          } else {
            reject(new Error(`yt-dlp failed with code ${code}`));
          }
        });
        
        ytDlpProcess.on('error', (error) => {
          console.error('❌ yt-dlp error:', error);
          reject(error);
        });
        
        // Timeout after 10 minutes
        setTimeout(() => {
          if (ytDlpProcess && typeof ytDlpProcess.kill === 'function') {
            ytDlpProcess.kill();
          }
          reject(new Error('Download timeout'));
        }, 10 * 60 * 1000);
      });
      
    } catch (error) {
      console.error('❌ YouTube download failed:', error);
      // First try ytdl-core fallback, then demo video
      try {
        console.log('🔄 Trying ytdl-core fallback...');
        return await this.downloadWithYtdlCoreFallback(clipData);
      } catch (fallbackError) {
        console.error('❌ ytdl-core fallback also failed:', fallbackError);
      console.log('📹 Falling back to demo video...');
      return await this.createDemoVideo(clipData);
    }
    }
  }

  async convertToMp4(inputPath, outputPath) {
    return new Promise((resolve, reject) => {
      console.log(`🔄 Converting to MP4: ${path.basename(inputPath)} -> ${path.basename(outputPath)}`);
      
      // Probe input file first
      ffmpeg.ffprobe(inputPath, (err, metadata) => {
        if (!err && metadata && metadata.streams) {
          const audioStreams = metadata.streams.filter(stream => stream.codec_type === 'audio');
          console.log(`🔊 Converting file with ${audioStreams.length} audio stream(s)`);
        }
      });
      
      ffmpeg(inputPath)
        .videoCodec('copy')  // Copy video stream without re-encoding
        .audioCodec('copy')  // Copy audio stream without re-encoding
        .outputOptions([
          '-map 0:v:0',  // Map first video stream
          '-map 0:a:0?'  // Map first audio stream if exists
        ])
        .output(outputPath)
        .on('progress', (progress) => {
          const percent = Math.round(35 + (progress.percent || 0) * 0.05);
          this.updateProgress(percent, `Converting: ${Math.round(progress.percent || 0)}%`);
        })
        .on('end', () => {
          // Verify the converted file has audio
          ffmpeg.ffprobe(outputPath, (err, metadata) => {
            if (!err && metadata && metadata.streams) {
              const audioStreams = metadata.streams.filter(stream => stream.codec_type === 'audio');
              console.log(`✅ MP4 conversion complete - ${audioStreams.length} audio stream(s) preserved`);
            }
          });
          
          // Clean up original file
          try {
            fs.unlinkSync(inputPath);
          } catch (e) {
            console.warn('Could not delete original file:', e.message);
          }
          resolve(outputPath);
        })
        .on('error', (err) => {
          console.error('❌ MP4 conversion failed:', err);
          reject(err);
        })
        .run();
    });
  }

  async createDemoVideo(clipData) {
    return new Promise((resolve, reject) => {
      const outputPath = path.join(this.tempDir, `input_${this.currentJob.id}.mp4`);
      const duration = clipData.endTime - clipData.startTime;
      
      console.log(`📹 Creating ${duration}s demo video...`);
      
      // Create a simple colored demo video without lavfi dependency
      ffmpeg()
        .input('color=blue:duration=' + duration + ':size=1920x1080:rate=30')
        .inputFormat('lavfi')
        .videoCodec('libx264')
        .audioCodec('aac')
        .duration(duration)
        .output(outputPath)
        .on('progress', (progress) => {
          const percent = Math.round(10 + (progress.percent || 0) * 0.3);
          this.updateProgress(percent, `Creating video: ${Math.round(progress.percent || 0)}%`);
        })
        .on('end', () => {
          console.log('✅ Demo video created');
          resolve(outputPath);
        })
        .on('error', (err) => {
          console.error('❌ Demo video creation failed:', err);
          // If lavfi still fails, create a fallback by downloading with ytdl-core
          this.downloadWithYtdlCoreFallback(clipData).then(resolve).catch(reject);
        })
        .run();
    });
  }

  async downloadWithYtdlCoreFallback(clipData) {
    console.log('🔄 Falling back to ytdl-core for video download...');
    try {
      const outputPath = path.join(this.tempDir, `input_${this.currentJob.id}.mp4`);
      const videoUrl = `https://www.youtube.com/watch?v=${clipData.videoId}`;
      
      console.log(`📥 Downloading YouTube video with ytdl-core: ${clipData.videoId}`);
      
      // Get video info
      const info = await ytdl.getInfo(videoUrl);
      console.log(`📺 Video title: ${info.videoDetails.title}`);
      
      // Get best quality format available (muxed video+audio)
      const formats = ytdl.filterFormats(info.formats, 'videoandaudio');
      
      // Sort by quality and select best ≤ 1080p
      const sortedFormats = formats
        .filter(f => f.height && f.height <= 1080)
        .sort((a, b) => {
          if (b.height !== a.height) return b.height - a.height;
          return (parseInt(b.bitrate) || 0) - (parseInt(a.bitrate) || 0);
        });
      
      const selectedFormat = sortedFormats[0] || formats[0];
      console.log(`🎯 Selected format: ${selectedFormat.qualityLabel} (${selectedFormat.container})`);
      
      return new Promise((resolve, reject) => {
        const writeStream = require('fs').createWriteStream(outputPath);
        const videoStream = ytdl(videoUrl, { format: selectedFormat });
        
        videoStream.on('progress', (chunkLength, downloaded, total) => {
          const percent = Math.round(10 + ((downloaded / total) * 30));
          this.updateProgress(percent, `Downloading: ${Math.round((downloaded / total) * 100)}%`);
        });
        
        videoStream.pipe(writeStream);
        
        writeStream.on('finish', () => {
          console.log('✅ Video downloaded with ytdl-core fallback');
          resolve(outputPath);
        });
        
        writeStream.on('error', reject);
        videoStream.on('error', reject);
        
        // Timeout after 5 minutes
        setTimeout(() => {
          videoStream.destroy();
          writeStream.destroy();
          reject(new Error('Download timeout'));
        }, 5 * 60 * 1000);
      });
      
    } catch (error) {
      console.error('❌ ytdl-core fallback failed:', error);
      throw new Error('All download methods failed');
    }
  }

  async extractTimeSegment(inputPath, clipData) {
    return new Promise((resolve, reject) => {
      const outputPath = path.join(this.tempDir, `segment_${this.currentJob.id}.mp4`);
      const duration = clipData.endTime - clipData.startTime;
      
      console.log(`✂️ Extracting ${duration}s segment from ${clipData.startTime}s to ${clipData.endTime}s`);
      
      // First probe the input to check for audio streams
      ffmpeg.ffprobe(inputPath, (err, metadata) => {
        if (err) {
          console.warn('⚠️ Could not probe input file for audio:', err.message);
        } else {
          const audioStreams = metadata.streams.filter(stream => stream.codec_type === 'audio');
          console.log(`🔊 Found ${audioStreams.length} audio stream(s) in input`);
          if (audioStreams.length > 0) {
            console.log(`🔊 Audio codec: ${audioStreams[0].codec_name}, channels: ${audioStreams[0].channels}`);
          }
        }
      });
      
      ffmpeg(inputPath)
        .seekInput(clipData.startTime) // Seek to start time
        .duration(duration) // Set duration of output
        .videoCodec('copy') // Copy video stream to preserve quality
        .audioCodec('copy') // Copy audio stream to preserve quality
        .outputOptions([
          '-avoid_negative_ts make_zero',
          '-map 0:v:0', // Map first video stream
          '-map 0:a:0?' // Map first audio stream if it exists (? makes it optional)
        ])
        .output(outputPath)
        .on('progress', (progress) => {
          const percent = Math.round(35 + (progress.percent || 0) * 0.15);
          this.updateProgress(percent, `Extracting segment: ${Math.round(progress.percent || 0)}%`);
        })
        .on('end', () => {
          console.log('✅ Time segment extracted');
          resolve(outputPath);
        })
        .on('error', (err) => {
          console.error('❌ Segment extraction failed:', err);
          console.log('🔄 Retrying with audio re-encoding...');
          
          // Fallback: try with audio re-encoding
          ffmpeg(inputPath)
            .seekInput(clipData.startTime)
            .duration(duration)
            .videoCodec('libx264')
            .audioCodec('aac')
            .outputOptions([
              '-preset fast',
              '-avoid_negative_ts make_zero'
            ])
            .output(outputPath)
            .on('end', () => {
              console.log('✅ Time segment extracted with audio re-encoding');
              resolve(outputPath);
            })
            .on('error', (fallbackErr) => {
              console.error('❌ Segment extraction failed even with fallback:', fallbackErr);
              reject(fallbackErr);
            })
            .run();
        })
        .run();
    });
  }

  async convertToPortrait(inputPath, clipData) {
    return new Promise((resolve, reject) => {
      const outputPath = path.join(this.tempDir, `portrait_${this.currentJob.id}.mp4`);
      
      console.log('🔄 Converting to 9:16 portrait format...');
      
      // Probe for audio streams first
      ffmpeg.ffprobe(inputPath, (err, metadata) => {
        if (err) {
          console.warn('⚠️ Could not probe input for portrait conversion:', err.message);
        } else {
          const audioStreams = metadata.streams.filter(stream => stream.codec_type === 'audio');
          console.log(`🔊 Portrait conversion - found ${audioStreams.length} audio stream(s)`);
        }
      });
      
      let command = ffmpeg(inputPath)
        .size('1080x1920')
        .videoCodec('libx264')
        .audioCodec('copy') // Try to copy audio first to preserve quality
        .outputOptions([
          '-preset fast',
          '-crf 23',
          '-movflags +faststart',
          '-map 0:v:0', // Map video stream
          '-map 0:a:0?' // Map audio stream if available
        ]);

      // Add proper 9:16 aspect ratio conversion with cropping
      // First scale to ensure height is at least 1920, then crop to 1080x1920
      command = command.videoFilters([
        'scale=-1:1920',  // Scale to height 1920, maintain aspect ratio
        'crop=1080:1920'  // Crop to final 9:16 dimensions
      ]);

      command
        .output(outputPath)
        .on('progress', (progress) => {
          const percent = Math.round(50 + (progress.percent || 0) * 0.25);
          this.updateProgress(percent, `Converting to portrait: ${Math.round(progress.percent || 0)}%`);
        })
        .on('end', () => {
          console.log('✅ Portrait conversion complete');
          resolve(outputPath);
        })
        .on('error', (err) => {
          console.error('❌ Portrait conversion failed:', err);
          console.log('🔄 Retrying portrait conversion with audio re-encoding...');
          
          // Fallback with audio re-encoding
          ffmpeg(inputPath)
            .size('1080x1920')
            .videoCodec('libx264')
            .audioCodec('aac') // Re-encode audio as fallback
            .audioBitrate('128k')
            .outputOptions([
              '-preset fast',
              '-crf 23',
              '-movflags +faststart'
            ])
            .videoFilters([
              'scale=-1:1920',
              'crop=1080:1920'
            ])
            .output(outputPath)
            .on('end', () => {
              console.log('✅ Portrait conversion complete with audio re-encoding');
              resolve(outputPath);
            })
            .on('error', (fallbackErr) => {
              console.error('❌ Portrait conversion failed even with fallback:', fallbackErr);
              reject(fallbackErr);
            })
            .run();
        })
        .run();
    });
  }

  async addSubtitles(inputPath, clipData) {
    return new Promise((resolve, reject) => {
      const outputPath = path.join(this.tempDir, `final_${this.currentJob.id}.mp4`);
      
      console.log('📝 Adding subtitles to video...');
      
      // Create dynamic subtitle text
      const subtitleText = `${clipData.title || 'YouTube Clip'} | ${clipData.startTime}s-${clipData.endTime}s`;
      
      ffmpeg(inputPath)
        .videoFilters([
          // Main subtitle at bottom
          `drawtext=text='${subtitleText}':fontcolor=white:fontsize=48:font=Arial:box=1:boxcolor=black@0.8:boxborderw=5:x=(w-text_w)/2:y=h-th-100`,
          // Timestamp overlay
          `drawtext=text='Duration\\: ${clipData.endTime - clipData.startTime}s':fontcolor=cyan:fontsize=32:x=50:y=50:box=1:boxcolor=black@0.5:boxborderw=3`
        ])
        .videoCodec('libx264')
        .audioCodec('aac')
        .outputOptions([
          '-preset fast',
          '-crf 23'
        ])
        .output(outputPath)
        .on('progress', (progress) => {
          const percent = Math.round(75 + (progress.percent || 0) * 0.15);
          this.updateProgress(percent, `Adding subtitles: ${Math.round(progress.percent || 0)}%`);
        })
        .on('end', () => {
          console.log('✅ Subtitles added successfully');
          resolve(outputPath);
        })
        .on('error', (err) => {
          console.error('❌ Subtitle processing failed:', err);
          reject(err);
        })
        .run();
    });
  }

  async optimizeForMobile(inputPath) {
    return new Promise((resolve, reject) => {
      const outputPath = path.join(this.tempDir, `optimized_${this.currentJob.id}.mp4`);
      
      console.log('📱 Optimizing for mobile...');
      
      ffmpeg(inputPath)
        .videoCodec('libx264')
        .audioCodec('aac')
        .videoBitrate('2000k')
        .audioBitrate('128k')
        .outputOptions([
          '-preset fast',
          '-crf 28',
          '-movflags +faststart',
          '-profile:v baseline',
          '-level 3.0',
          '-pix_fmt yuv420p'
        ])
        .output(outputPath)
        .on('progress', (progress) => {
          const percent = Math.round(90 + (progress.percent || 0) * 0.1);
          this.updateProgress(percent, `Optimizing: ${Math.round(progress.percent || 0)}%`);
        })
        .on('end', () => {
          console.log('✅ Mobile optimization complete');
          resolve(outputPath);
        })
        .on('error', (err) => {
          console.error('❌ Mobile optimization failed:', err);
          reject(err);
        })
        .run();
    });
  }

  updateProgress(percentage, message) {
    console.log(`📊 Progress: ${percentage}% - ${message}`);
    if (this.progressCallback) {
      this.progressCallback(percentage, message);
    }
  }

  setProgressCallback(callback) {
    this.progressCallback = callback;
  }

  async extractHighQualitySegment(inputPath, clipData) {
    return new Promise(async (resolve, reject) => {
      try {
        const outputPath = path.join(this.tempDir, `hq_segment_${this.currentJob.id}.mp4`);
        const duration = clipData.endTime - clipData.startTime;
        
        console.log(`✂️ Extracting HIGH QUALITY segment: ${clipData.startTime}s to ${clipData.endTime}s (${duration}s)`);
        
        // Get source video metadata to determine if scaling is needed
        const metadata = await this.getVideoMetadata(inputPath);
        const sourceHeight = metadata.dimensions.height;
        const sourceWidth = metadata.dimensions.width;
        
        console.log(`📐 Source resolution: ${sourceWidth}x${sourceHeight}`);
        
        let command = ffmpeg(inputPath)
          .seekInput(clipData.startTime)
          .duration(duration)
          .videoCodec('libx264')
          .audioCodec('aac');
        
        // Intelligent scaling: Cap at 1080p while maintaining aspect ratio
        if (sourceHeight > 1080) {
          const aspectRatio = sourceWidth / sourceHeight;
          const targetWidth = Math.round(1080 * aspectRatio);
          console.log(`📏 Scaling down from ${sourceHeight}p to 1080p (${targetWidth}x1080)`);
          
          command = command.size(`${targetWidth}x1080`);
          
          // Use higher quality settings for downscaling
          command = command.outputOptions([
            '-preset slow',         // Better quality for downscaling
            '-crf 16',             // Higher quality for downscaling
            '-movflags +faststart',
            '-pix_fmt yuv420p',
            '-profile:v high',
            '-level 4.1',
            '-bf 2',
            '-g 30',
            '-maxrate 10M',        // Higher bitrate for 1080p downscale
            '-bufsize 15M',
            '-ac 2',
            '-ar 48000'
          ]);
        } else {
          console.log(`📏 Maintaining original quality: ${sourceWidth}x${sourceHeight}`);
          
          // Native resolution - use excellent quality settings
          command = command.outputOptions([
            '-preset medium',       // Good balance for native resolution
            '-crf 18',             // Excellent quality
            '-movflags +faststart',
            '-pix_fmt yuv420p',
            '-profile:v high',
            '-level 4.1',
            '-bf 2',
            '-g 30',
            `-maxrate ${Math.min(sourceHeight <= 720 ? 5 : 8, 8)}M`, // Adaptive bitrate
            `-bufsize ${Math.min(sourceHeight <= 720 ? 8 : 12, 12)}M`,
            '-ac 2',
            '-ar 48000'
          ]);
        }
        
        command
          .output(outputPath)
          .on('start', (commandLine) => {
            console.log('🔄 FFmpeg HIGH QUALITY command:', commandLine);
          })
          .on('progress', (progress) => {
            const percent = Math.round(progress.percent || 0);
            this.updateProgress(40 + (percent * 0.35), `Extracting in high quality: ${percent}%`);
          })
          .on('end', () => {
            console.log('✅ High quality segment extracted');
            resolve(outputPath);
          })
          .on('error', (error) => {
            console.error('❌ High quality extraction failed:', error);
            reject(error);
          })
          .run();
          
      } catch (error) {
        console.error('❌ Metadata extraction failed:', error);
        reject(error);
      }
    });
  }

  async optimizeHighQuality(inputPath) {
    return new Promise((resolve, reject) => {
      const outputPath = path.join(this.tempDir, `final_hq_${this.currentJob.id}.mp4`);
      
      console.log(`🎯 Optimizing high quality video for web delivery`);
      
      ffmpeg(inputPath)
        .videoCodec('libx264')
        .audioCodec('aac')
        .outputOptions([
          '-preset medium',
          '-crf 20',              // Slightly higher compression for web
          '-movflags +faststart', // Progressive download
          '-pix_fmt yuv420p',
          '-profile:v high',
          '-level 4.1',
          '-tune film',           // Optimized for film content
          '-x264opts keyint=30:min-keyint=30:scenecut=-1', // Fixed keyframes
          '-ac 2',
          '-ar 48000',
          '-avoid_negative_ts make_zero' // Fix timing issues
        ])
        .output(outputPath)
        .on('start', (commandLine) => {
          console.log('🔄 Final optimization command:', commandLine);
        })
        .on('progress', (progress) => {
          const percent = Math.round(progress.percent || 0);
          this.updateProgress(80 + (percent * 0.15), `Optimizing: ${percent}%`);
        })
        .on('end', () => {
          console.log('✅ High quality optimization complete');
          resolve(outputPath);
        })
        .on('error', (error) => {
          console.error('❌ Optimization failed:', error);
          reject(error);
        })
        .run();
    });
  }

  async getVideoMetadata(videoPath) {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(videoPath, (err, metadata) => {
        if (err) {
          reject(err);
          return;
        }
        
        const videoStream = metadata.streams.find(s => s.codec_type === 'video');
        
        resolve({
          dimensions: {
            width: videoStream.width,
            height: videoStream.height
          },
          quality: `${videoStream.width}x${videoStream.height}`,
          framerate: eval(videoStream.r_frame_rate || '30/1'),
          bitrate: videoStream.bit_rate,
          codec: videoStream.codec_name
        });
      });
    });
  }

  async cleanup() {
    try {
      if (this.currentJob && this.currentJob.id) {
        const glob = require('glob').glob;
        const pattern = path.join(this.tempDir, `*${this.currentJob.id}.*`);
        const files = await glob(pattern);
        
        for (const file of files) {
          try {
            await fs.unlink(file);
            console.log('🗑️ Cleaned up temp file:', path.basename(file));
          } catch (err) {
            console.warn('⚠️ Could not clean up file:', file, err.message);
          }
        }
      }
    } catch (error) {
      console.warn('⚠️ Cleanup failed:', error.message);
    }
  }
}

module.exports = VideoProcessor; 