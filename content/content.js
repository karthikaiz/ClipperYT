// Content script for YouTube Shorts Clipper - Phase 1
// Simple time-based video clipping with original aspect ratio

console.log('YouTube Shorts Clipper Phase 1: Content script loaded');

class YouTubeClipperInjector {
  constructor() {
    this.currentVideoId = null;
    this.clipperButton = null;
    this.clipperOverlay = null;
    this.videoElement = null;
    this.isProcessing = false;
    this.videoProcessor = null;
    
    this.init();
  }

  async init() {
    console.log('🚀 ClipperYT: Content script loaded');
    console.log('📊 Document state:', document.readyState);
    console.log('🌐 Current URL:', window.location.href);
    
    // Wait for document to be ready
    if (document.readyState === 'loading') {
      console.log('⏳ Waiting for DOMContentLoaded...');
      document.addEventListener('DOMContentLoaded', () => {
        console.log('✅ DOMContentLoaded fired');
        this.setup();
      });
    } else {
      console.log('✅ Document already ready');
      this.setup();
    }
    
    // Also listen for full load as a fallback
    window.addEventListener('load', () => {
      console.log('✅ Window load event fired');
      setTimeout(() => {
        if (this.isVideoPage() && !this.clipperButton) {
          console.log('🔄 Post-load setup attempt...');
          this.setupVideoPage();
        }
      }, 500);
    });
  }

  setup() {
    console.log('🔧 ClipperYT: Setting up...');
    console.log('🌐 Current location:', window.location.href);
    console.log('📺 Is video page?', this.isVideoPage());
    
    // Handle YouTube's SPA navigation
    this.observeURLChanges();
    
    // Listen for DOM changes (YouTube dynamically loads content)
    this.observeDOMChanges();
    
    // Initial setup if we're on a video page
    if (this.isVideoPage()) {
      console.log('✅ On video page, setting up...');
      this.setupVideoPage();
    } else {
      console.log('⚠️ Not on video page, waiting for navigation...');
    }
    
    // Multiple fallback attempts with increasing delays
    this.scheduleRetryAttempts();
  }

  observeURLChanges() {
    // YouTube uses pushState for navigation
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;
    
    history.pushState = function(...args) {
      originalPushState.apply(history, args);
      console.log('🔄 History pushState detected');
      // Multiple timeouts to catch different loading stages
      setTimeout(() => this.handleURLChange(), 50);
      setTimeout(() => this.handleURLChange(), 200);
      setTimeout(() => this.handleURLChange(), 500);
      setTimeout(() => this.handleURLChange(), 1000);
    }.bind(this);
    
    history.replaceState = function(...args) {
      originalReplaceState.apply(history, args);
      console.log('🔄 History replaceState detected');
      setTimeout(() => this.handleURLChange(), 50);
      setTimeout(() => this.handleURLChange(), 200);
      setTimeout(() => this.handleURLChange(), 500);
    }.bind(this);
    
    // Listen for popstate (back/forward buttons)
    window.addEventListener('popstate', () => {
      console.log('🔄 Popstate detected');
      setTimeout(() => this.handleURLChange(), 100);
      setTimeout(() => this.handleURLChange(), 300);
    });
  }

  observeDOMChanges() {
    // Watch for changes in the page content (YouTube loads content dynamically)
    const observer = new MutationObserver((mutations) => {
      let shouldCheck = false;
      
      mutations.forEach((mutation) => {
        // Check if video player or controls were added/modified
        if (mutation.addedNodes.length > 0) {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === 1) { // Element node
              const element = node;
              if (element.matches && (
                element.matches('#movie_player') ||
                element.matches('.ytp-chrome-controls') ||
                element.matches('[id^="movie_player"]') ||
                element.querySelector && element.querySelector('#movie_player')
              )) {
                shouldCheck = true;
              }
            }
          });
        }
      });
      
      if (shouldCheck && this.isVideoPage() && !this.clipperButton) {
        console.log('🔄 DOM change detected, checking for setup...');
        setTimeout(() => this.setupVideoPage(), 100);
      }
    });
    
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  scheduleRetryAttempts() {
    // Schedule multiple retry attempts with increasing delays
    const delays = [1000, 2000, 3000, 5000, 8000];
    
    delays.forEach((delay, index) => {
      setTimeout(() => {
        if (this.isVideoPage() && !this.clipperButton) {
          console.log(`🔄 Retry attempt ${index + 1}: Attempting setup after ${delay}ms...`);
          this.setupVideoPage();
        }
      }, delay);
    });
  }

  handleURLChange() {
    console.log('🔄 URL changed to:', window.location.href);
    console.log('📺 Is video page?', this.isVideoPage());
    
    if (this.isVideoPage()) {
      console.log('✅ Detected video page, setting up...');
      this.setupVideoPage();
    } else {
      console.log('🧹 Not video page, cleaning up...');
      this.cleanup();
    }
  }

  isVideoPage() {
    return window.location.pathname === '/watch' && 
           window.location.search.includes('v=');
  }

  async setupVideoPage() {
    const videoId = this.getVideoId();
    
    // Only setup if video changed
    if (videoId === this.currentVideoId) {
      return;
    }
    
    this.currentVideoId = videoId;
    this.cleanup();
    
    // Wait for video player to load
    await this.waitForVideoPlayer();
    
    // Inject clipper button
    this.injectClipperButton();
    
    // Get video element reference
    this.videoElement = document.querySelector('video');
    
    console.log('🎉 ClipperYT setup complete for video', videoId);
  }

  getVideoId() {
    // Extract video ID from URL
    const urlParams = new URLSearchParams(window.location.search);
    const videoId = urlParams.get('v');
    
    if (videoId) {
      console.log('✅ Video ID from URL:', videoId);
      return videoId;
    }
    
    // Fallback: extract from current URL
    const match = window.location.href.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
    if (match) {
      const fallbackId = match[1];
      console.log('✅ Video ID from regex:', fallbackId);
      return fallbackId;
    }
    
    console.error('❌ Could not extract video ID');
    return null;
  }

  async waitForVideoPlayer() {
    return new Promise((resolve, reject) => {
      let attempts = 0;
      const maxAttempts = 100; // 10 seconds total
      
      const checkPlayer = () => {
        attempts++;
        
        // Try multiple selectors for player and controls
        const player = document.querySelector('#movie_player') || 
                      document.querySelector('#player') ||
                      document.querySelector('.html5-video-player');
        
        const controls = document.querySelector('.ytp-chrome-bottom') || 
                        document.querySelector('.ytp-chrome-controls') ||
                        document.querySelector('.ytp-right-controls');
        
        const video = document.querySelector('video');
        
        if (player && controls && video) {
          console.log('✅ Video player ready after', attempts * 100, 'ms');
          resolve();
        } else if (attempts >= maxAttempts) {
          console.log('⚠️ Video player wait timeout, proceeding anyway...');
          resolve(); // Don't reject, just proceed
        } else {
          setTimeout(checkPlayer, 100);
        }
      };
      
      checkPlayer();
    });
  }

  injectClipperButton() {
    console.log('🔧 Injecting clipper button...');
    
    // Remove existing button if any
    if (this.clipperButton) {
      this.clipperButton.remove();
      this.clipperButton = null;
    }
    
    // Check if button already exists (in case of race conditions)
    const existingButton = document.querySelector('.ytp-clipper-button');
    if (existingButton) {
      console.log('✅ Clipper button already exists, reusing...');
      this.clipperButton = existingButton;
      return;
    }
    
    // Try multiple selectors for YouTube controls
    const selectors = [
      '.ytp-chrome-controls .ytp-right-controls',
      '.ytp-right-controls',
      '.ytp-chrome-controls',
      '.ytp-chrome-bottom .ytp-right-controls',
      '#movie_player .ytp-chrome-bottom .ytp-right-controls'
    ];
    
    let targetContainer = null;
    for (const selector of selectors) {
      targetContainer = document.querySelector(selector);
      if (targetContainer) {
        console.log('✅ Found controls container:', selector);
        break;
      }
    }
    
    if (!targetContainer) {
      console.error('❌ Could not find YouTube controls container');
      console.log('🔍 Available elements:');
      console.log('  - movie_player:', !!document.querySelector('#movie_player'));
      console.log('  - ytp-chrome-bottom:', !!document.querySelector('.ytp-chrome-bottom'));
      console.log('  - ytp-chrome-controls:', !!document.querySelector('.ytp-chrome-controls'));
      console.log('  - ytp-right-controls:', !!document.querySelector('.ytp-right-controls'));
      return;
    }

    // Create clipper button
    this.clipperButton = document.createElement('button');
    this.clipperButton.className = 'ytp-button ytp-clipper-button';
    this.clipperButton.title = 'Create Clip with ClipperYT';
    this.clipperButton.innerHTML = `
      <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
        <path d="M9.64 7.64c.23-.5.36-1.05.36-1.64 0-2.21-1.79-4-4-4S2 3.79 2 6s1.79 4 4 4c.59 0 1.14-.13 1.64-.36L10 12l-2.36 2.36C7.14 14.13 6.59 14 6 14c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4c0-.59-.13-1.14-.36-1.64L12 14l7 7h3v-1L9.64 7.64zM6 8c-1.1 0-2-.89-2-2s.9-2 2-2 2 .89 2 2-.9 2-2 2zm0 12c-1.1 0-2-.89-2-2s.9-2 2-2 2 .89 2 2-.9 2-2 2zm6-7.5c-.28 0-.5-.22-.5-.5s.22-.5.5-.5.5.22.5.5-.22.5-.5.5zM19 3l-6 6 2 2 7-7V3z"/>
      </svg>
    `;
    
    // Add click handler
    this.clipperButton.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.showClipperOverlay();
    });
    
    // Insert button (before fullscreen button if possible)
    const fullscreenBtn = targetContainer.querySelector('.ytp-fullscreen-button');
    if (fullscreenBtn) {
      targetContainer.insertBefore(this.clipperButton, fullscreenBtn);
    } else {
      targetContainer.appendChild(this.clipperButton);
    }
    
    console.log('✅ Clipper button injected successfully');
  }

  showClipperOverlay() {
    if (this.clipperOverlay) {
      this.clipperOverlay.style.display = 'flex';
      this.initializeTimeInputs();
      return;
    }

    this.createClipperOverlay();
  }

  createClipperOverlay() {
    // Create overlay
    this.clipperOverlay = document.createElement('div');
    this.clipperOverlay.className = 'clipper-overlay';
    this.clipperOverlay.innerHTML = `
      <div class="clipper-modal">
        <div class="clipper-header">
          <h2>ClipperYT</h2>
          <button class="close-btn" id="close-clipper">×</button>
        </div>
        
        <div class="clipper-content">
          
          <div class="time-controls">
            <div class="time-group">
              <label for="start-time">Start Time</label>
              <input type="text" id="start-time" placeholder="0:00" pattern="[0-9]*:?[0-9]*">
              <button class="use-current-time" data-input="start-time">Use Current</button>
            </div>
            
            <div class="time-group">
              <label for="end-time">End Time</label>
              <input type="text" id="end-time" placeholder="1:00" pattern="[0-9]*:?[0-9]*">
              <button class="use-current-time" data-input="end-time">Use Current</button>
            </div>
          </div>
          
          <div class="duration-info">
            <div class="duration-display">
              Duration: <span id="duration-text">1:00</span>
            </div>
            <div class="duration-limits">
              Min: 10 seconds • Max: 60 minutes
            </div>
          </div>
          
          <div class="quality-settings">
            <div class="setting-group">
              <label for="quality-select">Output Quality</label>
              <select id="quality-select">
                <option value="720p">720p (HD)</option>
                <option value="1080p" selected>1080p (Full HD)</option>
                <option value="highest">Highest Available</option>
              </select>
            </div>
          </div>
          
          </div>
          
        <div class="clipper-actions">
          <button class="secondary-button" id="cancel-clip">Cancel</button>
          <button class="primary-button" id="create-clip" disabled>Create Clip</button>
          </div>
          
        <div class="progress-section" id="progress-section" style="display: none;">
            <div class="progress-bar">
            <div class="progress-fill" id="progress-fill"></div>
            </div>
          <div class="progress-text" id="progress-text">Preparing...</div>
          </div>
        
        <div class="download-section" id="download-section" style="display: none;">
          <div class="success-message">
            <h3>✅ Clip Created Successfully!</h3>
            <div class="clip-info" id="clip-info"></div>
          </div>
          <div class="download-actions">
            <button class="primary-button" id="download-clip">Download MP4</button>
            <button class="secondary-button" id="create-another">Create Another Clip</button>
          </div>
        </div>
      </div>
    `;
    
    document.body.appendChild(this.clipperOverlay);
    this.setupOverlayEventListeners();
    this.initializeTimeInputs();
  }

  setupOverlayEventListeners() {
    // Close button
    this.clipperOverlay.querySelector('#close-clipper').addEventListener('click', () => {
      this.hideClipperOverlay();
    });
    
    // Cancel button
    this.clipperOverlay.querySelector('#cancel-clip').addEventListener('click', () => {
        this.hideClipperOverlay();
    });
    
    // Use current time buttons
    this.clipperOverlay.querySelectorAll('.use-current-time').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const inputId = e.target.dataset.input;
        const input = this.clipperOverlay.querySelector(`#${inputId}`);
        const currentTime = this.videoElement ? Math.floor(this.videoElement.currentTime) : 0;
        input.value = this.formatTime(currentTime);
        this.updateDuration();
      });
    });
    
    // Time input changes
    ['start-time', 'end-time'].forEach(id => {
      const input = this.clipperOverlay.querySelector(`#${id}`);
      input.addEventListener('input', () => this.updateDuration());
      input.addEventListener('blur', () => this.updateDuration());
    });
    
    // Create clip button
    this.clipperOverlay.querySelector('#create-clip').addEventListener('click', () => {
      this.startClipProcessing();
    });
    
    // Download button
    this.clipperOverlay.querySelector('#download-clip').addEventListener('click', () => {
      this.downloadClip();
    });
    
    // Create another button
    this.clipperOverlay.querySelector('#create-another').addEventListener('click', () => {
      this.resetOverlay();
    });
    
    // Close on overlay click
    this.clipperOverlay.addEventListener('click', (e) => {
      if (e.target === this.clipperOverlay) {
        this.hideClipperOverlay();
      }
    });
  }

  initializeTimeInputs() {
    const duration = this.videoElement ? Math.floor(this.videoElement.duration) : 60;
    const currentTime = this.videoElement ? Math.floor(this.videoElement.currentTime) : 0;
    
    // Set default values
    this.clipperOverlay.querySelector('#start-time').value = this.formatTime(currentTime);
    this.clipperOverlay.querySelector('#end-time').value = this.formatTime(Math.min(currentTime + 60, duration));
    
    this.updateDuration();
  }

  updateDuration() {
    const startTimeStr = this.clipperOverlay.querySelector('#start-time').value;
    const endTimeStr = this.clipperOverlay.querySelector('#end-time').value;
    
    const startTime = this.parseTime(startTimeStr);
    const endTime = this.parseTime(endTimeStr);
    const duration = endTime - startTime;
    
    const durationText = this.clipperOverlay.querySelector('#duration-text');
    const createBtn = this.clipperOverlay.querySelector('#create-clip');
    
    if (duration >= 10 && duration <= 3600) {
      durationText.textContent = this.formatTime(duration);
      durationText.style.color = '#10b981';
      createBtn.disabled = false;
      } else {
      if (duration < 10) {
        durationText.textContent = `${this.formatTime(duration)} (too short)`;
        durationText.style.color = '#ef4444';
    } else {
        durationText.textContent = `${this.formatTime(duration)} (too long for Phase 1)`;
        durationText.style.color = '#ef4444';
      }
      createBtn.disabled = true;
    }
  }

  async startClipProcessing() {
    if (this.isProcessing) return;
    
    this.isProcessing = true;
    
    // Get clip data
    const clipData = this.getClipData();
    
    // Show progress
    this.showProgress();
    
    try {
      // Process the clip using canvas recording method
      const result = await this.processClipLocally(clipData);
      
      // Show download ready
      this.showDownloadReady(result.videoBlob, result.metadata);
      
    } catch (error) {
      console.error('Clip processing failed:', error);
      this.showError(error.message || 'Failed to create clip');
    } finally {
      this.isProcessing = false;
    }
  }

  getClipData() {
    const startTimeStr = this.clipperOverlay.querySelector('#start-time').value;
    const endTimeStr = this.clipperOverlay.querySelector('#end-time').value;
    const quality = this.clipperOverlay.querySelector('#quality-select').value;
    
    return {
      videoId: this.currentVideoId,
      startTime: this.parseTime(startTimeStr),
      endTime: this.parseTime(endTimeStr),
      quality: quality,
      // Phase 1: No AI features
      maintainAspectRatio: true,
      outputFormat: 'mp4'
    };
  }

  showProgress() {
    this.clipperOverlay.querySelector('.clipper-content').style.display = 'none';
    this.clipperOverlay.querySelector('.clipper-actions').style.display = 'none';
    this.clipperOverlay.querySelector('#progress-section').style.display = 'block';
  }

  updateProgress(percentage, text) {
    const progressFill = this.clipperOverlay.querySelector('#progress-fill');
    const progressText = this.clipperOverlay.querySelector('#progress-text');
    
    progressFill.style.width = `${percentage}%`;
    progressText.textContent = text;
  }

  showDownloadReady(videoBlob, metadata) {
    // Store for download
    this.currentVideoBlob = videoBlob;
    this.currentMetadata = metadata;
    
    // Update UI
    this.clipperOverlay.querySelector('#progress-section').style.display = 'none';
    this.clipperOverlay.querySelector('#download-section').style.display = 'block';
    
    // Show clip info with safety checks
    const clipInfo = this.clipperOverlay.querySelector('#clip-info');
    const safeMetadata = {
      duration: metadata?.duration || 0,
      dimensions: metadata?.dimensions || { width: 1920, height: 1080 },
      size: metadata?.size || videoBlob?.size || 0,
      format: metadata?.format || 'MP4',
      aspectRatio: metadata?.aspectRatio || '16:9'
    };
    
    clipInfo.innerHTML = `
      <div class="info-row">
        <span>Duration:</span>
        <span>${this.formatTime(safeMetadata.duration)}</span>
      </div>
      <div class="info-row">
        <span>Resolution:</span>
        <span>${safeMetadata.dimensions.width}×${safeMetadata.dimensions.height}</span>
      </div>
      <div class="info-row">
        <span>Size:</span>
        <span>${this.formatBytes(safeMetadata.size)}</span>
      </div>
      <div class="info-row">
        <span>Format:</span>
        <span>${safeMetadata.format} (${safeMetadata.aspectRatio})</span>
      </div>
    `;
  }

  async processClipLocally(clipData) {
    try {
      this.updateProgress(5, 'Connecting to backend...');
      
      // Only use backend processing (no client-side fallback)
      const result = await this.processWithBackend(clipData);
      return result;
      
    } catch (error) {
      console.error('Backend processing failed:', error);
      this.showError(`Backend processing failed: ${error.message}`);
      throw error;
    }
  }

  async processWithBackend(clipData) {
    const backendUrls = [
      'http://localhost:3001'
      // Only use local backend - no fake URLs
    ];
    
    for (const baseUrl of backendUrls) {
      try {
        console.log(`🔗 Trying backend: ${baseUrl}`);
        
        // Step 1: Start processing job
        this.updateProgress(10, 'Starting backend processing...');
        
        const processResponse = await fetch(`${baseUrl}/api/process-clip`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...clipData,
            maintainAspectRatio: true,
            quality: 'highest'
          })
        });
        
        if (!processResponse.ok) {
          throw new Error(`Backend responded with ${processResponse.status}`);
        }
        
        const { jobId } = await processResponse.json();
        console.log(`✅ Backend job started: ${jobId}`);
        
        // Step 2: Poll for completion
        return await this.pollBackendJob(baseUrl, jobId);
      
    } catch (error) {
        console.log(`❌ Backend ${baseUrl} failed:`, error.message);
        continue;
      }
    }
    
    throw new Error('All backend services unavailable');
  }

  async pollBackendJob(baseUrl, jobId) {
    const maxAttempts = 600; // 10 minutes with 1s polling (matches backend timeout)
    let attempts = 0;
    
    while (attempts < maxAttempts) {
      try {
        const statusResponse = await fetch(`${baseUrl}/api/job-status/${jobId}`);
        
        if (!statusResponse.ok) {
          throw new Error(`Status check failed: ${statusResponse.status}`);
        }
        
        const status = await statusResponse.json();
        
        // Update progress
        this.updateProgress(status.progress || 0, status.message || 'Processing...');
        
        if (status.status === 'completed') {
          // Job completed successfully
          if (status.videoBlob || status.downloadUrl) {
            let videoBlob;
            
            if (status.videoBlob) {
              // Convert base64 to blob
              const binaryString = atob(status.videoBlob);
              const bytes = new Uint8Array(binaryString.length);
              for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
              }
              videoBlob = new Blob([bytes], { type: 'video/mp4' });
            } else if (status.downloadUrl) {
              // Download from URL
              const downloadResponse = await fetch(status.downloadUrl);
              videoBlob = await downloadResponse.blob();
            }
            
            return {
              success: true,
              videoBlob: videoBlob,
              metadata: {
                duration: status.clipData?.endTime - status.clipData?.startTime || 0,
                dimensions: status.metadata?.dimensions || { width: 1920, height: 1080 },
                size: videoBlob.size,
                format: 'MP4',
                quality: status.metadata?.quality || 'highest',
                aspectRatio: '16:9',
                backend: true
              }
            };
          }
        } else if (status.status === 'failed') {
          throw new Error(status.error || 'Backend processing failed');
        }
        
        // Wait before next poll
        await new Promise(resolve => setTimeout(resolve, 1000));
        attempts++;
      
    } catch (error) {
        console.error('Polling error:', error);
        throw error;
      }
    }
    
    throw new Error('Backend processing timeout');
  }

  // Client-side processing removed - backend only





  async loadFFmpeg() {
    try {
      // Load FFmpeg.wasm from lib directory
      if (!document.querySelector('script[src*="ffmpeg"]')) {
        const script = document.createElement('script');
        script.src = chrome.runtime.getURL('lib/ffmpeg.min.js');
        script.onload = () => {
          console.log('FFmpeg.wasm loaded');
        };
        document.head.appendChild(script);
        
        // Wait for script to load
        await new Promise((resolve) => {
          script.onload = resolve;
        });
      }
      } catch (error) {
      console.error('Failed to load FFmpeg:', error);
      throw new Error('FFmpeg not available. Please ensure FFmpeg.wasm is installed.');
    }
  }

  formatTime(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 1000);
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
  }

  downloadClip() {
    console.log('Download button clicked');
    console.log('Current video blob:', this.currentVideoBlob);
    
    if (!this.currentVideoBlob) {
      this.showError('No video clip available to download');
      return;
    }
    
    const clipData = this.getClipData();
    const fileName = `youtube-clip-${this.currentVideoId}-${clipData.startTime}s-to-${clipData.endTime}s.mp4`;
    
    console.log('Creating download for:', fileName);
    console.log('Blob size:', this.currentVideoBlob.size);
    
    try {
      // Create download link
      const downloadUrl = URL.createObjectURL(this.currentVideoBlob);
      const downloadLink = document.createElement('a');
      downloadLink.href = downloadUrl;
      downloadLink.download = fileName;
      downloadLink.style.display = 'none';
      
      console.log('Download URL created:', downloadUrl);
      
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
      
      console.log('Download initiated');
      
      // Clean up after a delay
      setTimeout(() => {
        URL.revokeObjectURL(downloadUrl);
      }, 1000);
      
      // Update stats
      this.updateStats();
      
      this.showSuccessMessage('Clip downloaded successfully!');
      
    } catch (error) {
      console.error('Download failed:', error);
      this.showError('Failed to download clip: ' + error.message);
    }
  }

  updateStats() {
    // Update extension statistics
    chrome.storage.local.get(['clipsCreated', 'totalDuration', 'filesDownloaded'], (result) => {
      const clipData = this.getClipData();
      const duration = clipData.endTime - clipData.startTime;
      
      chrome.storage.local.set({
        clipsCreated: (result.clipsCreated || 0) + 1,
        totalDuration: (result.totalDuration || 0) + duration,
        filesDownloaded: (result.filesDownloaded || 0) + 1
      });
    });
  }

  showSuccessMessage(message) {
    const successDiv = document.createElement('div');
    successDiv.className = 'success-toast';
    successDiv.textContent = message;
      successDiv.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #10b981;
        color: white;
      padding: 12px 24px;
      border-radius: 8px;
      z-index: 10001;
      font-size: 14px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    `;
    
    document.body.appendChild(successDiv);
    
    setTimeout(() => {
      successDiv.remove();
    }, 3000);
  }

  showError(message) {
    this.clipperOverlay.querySelector('#progress-section').style.display = 'none';
    this.clipperOverlay.querySelector('.clipper-content').style.display = 'block';
    this.clipperOverlay.querySelector('.clipper-actions').style.display = 'flex';
    
    const errorDiv = document.createElement('div');
      errorDiv.className = 'error-message';
    errorDiv.innerHTML = `
      <div style="background: #fee2e2; border: 1px solid #fecaca; border-radius: 8px; padding: 12px; margin: 16px 0; color: #dc2626;">
        <strong>Error:</strong> ${message}
      </div>
    `;
    
    const content = this.clipperOverlay.querySelector('.clipper-content');
    content.insertBefore(errorDiv, content.firstChild);
    
    setTimeout(() => {
      errorDiv.remove();
    }, 5000);
  }

  resetOverlay() {
    this.clipperOverlay.querySelector('#download-section').style.display = 'none';
    this.clipperOverlay.querySelector('.clipper-content').style.display = 'block';
    this.clipperOverlay.querySelector('.clipper-actions').style.display = 'flex';
    
    this.initializeTimeInputs();
    this.currentVideoBlob = null;
    this.currentMetadata = null;
  }

  hideClipperOverlay() {
    if (this.clipperOverlay) {
      this.clipperOverlay.style.display = 'none';
    }
  }

  // Utility functions
  formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }

  parseTime(timeString) {
    const parts = timeString.split(':');
    if (parts.length === 2) {
      return parseInt(parts[0]) * 60 + parseInt(parts[1]);
    }
    return parseInt(timeString) || 0;
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  cleanup() {
    if (this.clipperButton) {
      this.clipperButton.remove();
      this.clipperButton = null;
    }
    
    if (this.clipperOverlay) {
      this.clipperOverlay.remove();
      this.clipperOverlay = null;
    }
  }
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'OPEN_CLIPPER') {
    // Find the clipper instance and open it
    const clipperButton = document.querySelector('.ytp-clipper-button');
    if (clipperButton) {
      clipperButton.click();
    }
    sendResponse({ success: true });
  }
});

// Initialize when script loads
new YouTubeClipperInjector(); 