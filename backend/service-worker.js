// Background service worker for YouTube Shorts Clipper

// Extension installation and updates
chrome.runtime.onInstalled.addListener((details) => {
  console.log('YouTube Shorts Clipper installed/updated');
  
  // Initialize default settings
  chrome.storage.sync.set({
    autoFocus: true,
    includeSubtitles: true,
    maxDuration: 120, // 2 minutes in seconds
    subtitleStyle: 'default',
    downloadQuality: 'high'
  });
});

// Handle messages from content scripts and popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {
    case 'GET_VIDEO_INFO':
      handleGetVideoInfo(message.data, sendResponse);
      break;
    
    case 'PROCESS_CLIP':
      handleProcessClip(message.data, sendResponse);
      break;
    
    case 'DOWNLOAD_CLIP':
      handleDownloadClip(message.data, sendResponse);
      break;
    
    case 'GET_SETTINGS':
      handleGetSettings(sendResponse);
      break;
    
    case 'UPDATE_SETTINGS':
      handleUpdateSettings(message.data, sendResponse);
      break;
    
    default:
      console.warn('Unknown message type:', message.type);
      sendResponse({ error: 'Unknown message type' });
  }
  
  // Keep message channel open for async responses
  return true;
});

// Get video information from YouTube page
async function handleGetVideoInfo(data, sendResponse) {
  try {
    const videoInfo = {
      videoId: data.videoId,
      title: data.title,
      duration: data.duration,
      hasSubtitles: data.hasSubtitles,
      url: data.url
    };
    
    sendResponse({ success: true, data: videoInfo });
  } catch (error) {
    console.error('Error getting video info:', error);
    sendResponse({ error: error.message });
  }
}

// Handle clip processing request
async function handleProcessClip(clipData, sendResponse) {
  try {
    // Validate clip data
    const errors = validateClipData(clipData);
    if (errors.length > 0) {
      sendResponse({ error: errors.join(', ') });
      return;
    }
    
    // Store clip processing job
    const jobId = generateJobId();
    await chrome.storage.local.set({
      [`job_${jobId}`]: {
        ...clipData,
        status: 'queued',
        createdAt: Date.now()
      }
    });
    
    sendResponse({ success: true, jobId });
    
    // Notify content script to start processing
    chrome.tabs.sendMessage(clipData.tabId, {
      type: 'START_PROCESSING',
      jobId,
      clipData
    });
    
  } catch (error) {
    console.error('Error processing clip:', error);
    sendResponse({ error: error.message });
  }
}

// Handle clip download
async function handleDownloadClip(downloadData, sendResponse) {
  try {
    const downloadId = await chrome.downloads.download({
      url: downloadData.url,
      filename: downloadData.filename,
      saveAs: false
    });
    
    sendResponse({ success: true, downloadId });
  } catch (error) {
    console.error('Error downloading clip:', error);
    sendResponse({ error: error.message });
  }
}

// Get user settings
async function handleGetSettings(sendResponse) {
  try {
    const settings = await chrome.storage.sync.get([
      'autoFocus',
      'includeSubtitles',
      'maxDuration',
      'subtitleStyle',
      'downloadQuality'
    ]);
    
    sendResponse({ success: true, data: settings });
  } catch (error) {
    console.error('Error getting settings:', error);
    sendResponse({ error: error.message });
  }
}

// Update user settings
async function handleUpdateSettings(newSettings, sendResponse) {
  try {
    await chrome.storage.sync.set(newSettings);
    sendResponse({ success: true });
  } catch (error) {
    console.error('Error updating settings:', error);
    sendResponse({ error: error.message });
  }
}

// Utility functions
function validateClipData(clipData) {
  const errors = [];
  
  if (!clipData.videoId) {
    errors.push('Video ID is required');
  }
  
  if (!clipData.startTime || clipData.startTime < 0) {
    errors.push('Valid start time is required');
  }
  
  if (!clipData.endTime || clipData.endTime <= clipData.startTime) {
    errors.push('End time must be greater than start time');
  }
  
  const duration = clipData.endTime - clipData.startTime;
  if (duration > 120) { // 2 minutes max
    errors.push('Clip duration cannot exceed 2 minutes');
  }
  
  return errors;
}

function generateJobId() {
  return `clip_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Clean up old processing jobs (run periodically)
chrome.alarms.create('cleanup-jobs', { periodInMinutes: 60 });

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'cleanup-jobs') {
    const storage = await chrome.storage.local.get();
    const cutoffTime = Date.now() - (24 * 60 * 60 * 1000); // 24 hours ago
    
    for (const [key, value] of Object.entries(storage)) {
      if (key.startsWith('job_') && value.createdAt < cutoffTime) {
        chrome.storage.local.remove(key);
      }
    }
  }
}); 