// ClipperYT - Popup Script for Informational Interface

class ClipperYTPopup {
  constructor() {
    this.statusDot = document.getElementById('status-dot');
    this.statusText = document.getElementById('status-text');
    this.openYouTubeBtn = document.getElementById('open-youtube-btn');
    
    this.init();
  }

  init() {
    this.setupEventListeners();
    this.checkYouTubeStatus();
  }

  setupEventListeners() {
    // Open YouTube button
    this.openYouTubeBtn.addEventListener('click', () => {
      this.openYouTube();
    });
  }

  async checkYouTubeStatus() {
    try {
      // Check if we're on a YouTube tab
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      const currentTab = tabs[0];
      
      if (currentTab && currentTab.url) {
        if (currentTab.url.includes('youtube.com/watch')) {
          this.setStatus('ready', 'Ready to clip');
          this.openYouTubeBtn.textContent = 'Start Clipping';
          this.openYouTubeBtn.onclick = () => this.focusYouTubeTab();
        } else if (currentTab.url.includes('youtube.com')) {
          this.setStatus('ready', 'On YouTube - Find a video');
          this.openYouTubeBtn.textContent = 'Find Video';
          this.openYouTubeBtn.onclick = () => this.focusYouTubeTab();
        } else {
          this.setStatus('ready', 'Ready to clip');
          this.openYouTubeBtn.textContent = 'Open YouTube';
          this.openYouTubeBtn.onclick = () => this.openYouTube();
        }
      }
    } catch (error) {
      console.error('Error checking YouTube status:', error);
      this.setStatus('ready', 'Ready to clip');
    }
  }

  setStatus(type, message) {
    // Remove all status classes
    this.statusDot.className = 'status-dot';
    
    // Add the new status class
    this.statusDot.classList.add(type);
    
    // Update status text
    this.statusText.textContent = message;
  }

  async openYouTube() {
    try {
      await chrome.tabs.create({ url: 'https://www.youtube.com' });
      window.close(); // Close the popup
    } catch (error) {
      console.error('Error opening YouTube:', error);
      this.setStatus('error', 'Failed to open YouTube');
    }
  }

  async focusYouTubeTab() {
    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      const currentTab = tabs[0];
      
      if (currentTab) {
        await chrome.tabs.update(currentTab.id, { active: true });
        window.close(); // Close the popup
      }
    } catch (error) {
      console.error('Error focusing YouTube tab:', error);
    }
  }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new ClipperYTPopup();
}); 