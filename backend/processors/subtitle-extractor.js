// Subtitle Extractor - Extract and process YouTube captions

class SubtitleExtractor {
  constructor() {
    this.cache = new Map();
    this.supportedLanguages = ['en', 'en-US', 'en-GB'];
  }

  async extractSubtitles(videoId, startTime = 0, endTime = null) {
    try {
      // Check cache first
      const cacheKey = `${videoId}_${startTime}_${endTime}`;
      if (this.cache.has(cacheKey)) {
        return this.cache.get(cacheKey);
      }

      // Get available caption tracks
      const captionTracks = await this.getCaptionTracks(videoId);
      
      if (!captionTracks.length) {
        console.warn('No subtitles available for video:', videoId);
        return [];
      }

      // Find best caption track (prefer manual over auto-generated)
      const bestTrack = this.selectBestCaptionTrack(captionTracks);
      
      // Fetch and parse caption data
      const captionData = await this.fetchCaptionData(bestTrack.url);
      const parsedCaptions = this.parseCaptionData(captionData, bestTrack.format);
      
      // Filter by time range if specified
      let filteredCaptions = parsedCaptions;
      if (startTime > 0 || endTime !== null) {
        filteredCaptions = this.filterCaptionsByTime(parsedCaptions, startTime, endTime);
      }

      // Adjust timing to start from 0
      const adjustedCaptions = this.adjustCaptionTiming(filteredCaptions, startTime);
      
      // Cache the result
      this.cache.set(cacheKey, adjustedCaptions);
      
      return adjustedCaptions;

    } catch (error) {
      console.error('Failed to extract subtitles:', error);
      return [];
    }
  }

  async getCaptionTracks(videoId) {
    try {
      // Method 1: Try to extract from player config
      const playerConfig = await this.getPlayerConfig(videoId);
      if (playerConfig && playerConfig.captions) {
        return playerConfig.captions;
      }

      // Method 2: Try to extract from timedtext API
      const timedTextTracks = await this.getTimedTextTracks(videoId);
      if (timedTextTracks.length > 0) {
        return timedTextTracks;
      }

      // Method 3: Scrape from video page
      const pageTracks = await this.scrapeCaptionTracksFromPage(videoId);
      return pageTracks;

    } catch (error) {
      console.error('Failed to get caption tracks:', error);
      return [];
    }
  }

  async getPlayerConfig(videoId) {
    try {
      // This would extract caption info from YouTube's player config
      // In a real implementation, this would parse the video page HTML
      // or use YouTube's internal APIs
      
      // For now, return mock data
      return {
        captions: [
          {
            languageCode: 'en',
            languageName: 'English',
            url: `https://www.youtube.com/api/timedtext?v=${videoId}&lang=en`,
            format: 'xml',
            kind: 'asr', // auto-generated
            isTranslatable: true
          }
        ]
      };

    } catch (error) {
      console.error('Failed to get player config:', error);
      return null;
    }
  }

  async getTimedTextTracks(videoId) {
    try {
      // Try YouTube's timedtext API endpoint
      const response = await fetch(`https://www.youtube.com/api/timedtext?type=list&v=${videoId}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch caption track list');
      }

      const xmlText = await response.text();
      return this.parseTrackListXML(xmlText);

    } catch (error) {
      console.error('Failed to get timedtext tracks:', error);
      return [];
    }
  }

  parseTrackListXML(xmlText) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlText, 'text/xml');
    const tracks = doc.querySelectorAll('track');
    
    return Array.from(tracks).map(track => ({
      languageCode: track.getAttribute('lang_code'),
      languageName: track.getAttribute('lang_translated'),
      url: track.getAttribute('name') ? 
           `https://www.youtube.com/api/timedtext?${track.getAttribute('name')}` :
           null,
      format: 'xml',
      kind: track.getAttribute('kind') || 'captions',
      isTranslatable: track.getAttribute('lang_original') !== track.getAttribute('lang_code')
    })).filter(track => track.url);
  }

  async scrapeCaptionTracksFromPage(videoId) {
    try {
      // This would scrape caption info from the video page
      // In practice, this would require parsing the page HTML
      // For now, return empty array
      return [];

    } catch (error) {
      console.error('Failed to scrape caption tracks:', error);
      return [];
    }
  }

  selectBestCaptionTrack(tracks) {
    // Prefer manual captions over auto-generated
    const manualTracks = tracks.filter(track => track.kind !== 'asr');
    const autoTracks = tracks.filter(track => track.kind === 'asr');
    
    // Prefer supported languages
    const priorityTracks = [
      ...manualTracks.filter(track => this.supportedLanguages.includes(track.languageCode)),
      ...autoTracks.filter(track => this.supportedLanguages.includes(track.languageCode)),
      ...manualTracks,
      ...autoTracks
    ];

    return priorityTracks[0] || tracks[0];
  }

  async fetchCaptionData(url) {
    try {
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch caption data: ${response.status}`);
      }

      return await response.text();

    } catch (error) {
      console.error('Failed to fetch caption data:', error);
      throw error;
    }
  }

  parseCaptionData(data, format) {
    switch (format.toLowerCase()) {
      case 'xml':
        return this.parseXMLCaptions(data);
      case 'vtt':
        return this.parseVTTCaptions(data);
      case 'srt':
        return this.parseSRTCaptions(data);
      default:
        console.warn('Unknown caption format:', format);
        return this.parseXMLCaptions(data); // Default to XML
    }
  }

  parseXMLCaptions(xmlText) {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(xmlText, 'text/xml');
      const textElements = doc.querySelectorAll('text');
      
      return Array.from(textElements).map(element => {
        const start = parseFloat(element.getAttribute('start')) || 0;
        const duration = parseFloat(element.getAttribute('dur')) || 0;
        const text = this.cleanCaptionText(element.textContent);
        
        return {
          start: start,
          end: start + duration,
          duration: duration,
          text: text
        };
      }).filter(caption => caption.text.trim().length > 0);

    } catch (error) {
      console.error('Failed to parse XML captions:', error);
      return [];
    }
  }

  parseVTTCaptions(vttText) {
    try {
      const lines = vttText.split('\n');
      const captions = [];
      let currentCaption = null;
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        // Skip WebVTT header and empty lines
        if (!line || line === 'WEBVTT' || line.startsWith('NOTE')) {
          continue;
        }
        
        // Time line format: "00:00:01.000 --> 00:00:04.000"
        const timeMatch = line.match(/^(\d{2}:\d{2}:\d{2}\.\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2}\.\d{3})/);
        
        if (timeMatch) {
          if (currentCaption) {
            captions.push(currentCaption);
          }
          
          currentCaption = {
            start: this.parseVTTTime(timeMatch[1]),
            end: this.parseVTTTime(timeMatch[2]),
            text: ''
          };
        } else if (currentCaption && line) {
          // Caption text line
          currentCaption.text += (currentCaption.text ? ' ' : '') + this.cleanCaptionText(line);
        }
      }
      
      if (currentCaption) {
        captions.push(currentCaption);
      }
      
      return captions.filter(caption => caption.text.trim().length > 0);

    } catch (error) {
      console.error('Failed to parse VTT captions:', error);
      return [];
    }
  }

  parseSRTCaptions(srtText) {
    try {
      const blocks = srtText.split('\n\n').filter(block => block.trim());
      
      return blocks.map(block => {
        const lines = block.split('\n');
        
        if (lines.length < 3) return null;
        
        // Line 0: sequence number
        // Line 1: time range
        // Line 2+: caption text
        
        const timeMatch = lines[1].match(/^(\d{2}:\d{2}:\d{2},\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2},\d{3})/);
        
        if (!timeMatch) return null;
        
        const text = lines.slice(2).join(' ');
        
        return {
          start: this.parseSRTTime(timeMatch[1]),
          end: this.parseSRTTime(timeMatch[2]),
          text: this.cleanCaptionText(text)
        };
      }).filter(caption => caption && caption.text.trim().length > 0);

    } catch (error) {
      console.error('Failed to parse SRT captions:', error);
      return [];
    }
  }

  parseVTTTime(timeStr) {
    const [hours, minutes, seconds] = timeStr.split(':');
    return parseInt(hours) * 3600 + parseInt(minutes) * 60 + parseFloat(seconds);
  }

  parseSRTTime(timeStr) {
    const [time, ms] = timeStr.split(',');
    const [hours, minutes, seconds] = time.split(':');
    return parseInt(hours) * 3600 + parseInt(minutes) * 60 + parseInt(seconds) + parseInt(ms) / 1000;
  }

  cleanCaptionText(text) {
    return text
      // Remove HTML tags
      .replace(/<[^>]*>/g, '')
      // Remove speaker labels like "[Music]" or "(applause)"
      .replace(/[\[\(][^\]\)]*[\]\)]/g, '')
      // Clean up whitespace
      .replace(/\s+/g, ' ')
      .trim();
  }

  filterCaptionsByTime(captions, startTime, endTime) {
    return captions.filter(caption => {
      // Include caption if it overlaps with the specified time range
      const captionStart = caption.start;
      const captionEnd = caption.end;
      
      // Caption starts before clip ends and ends after clip starts
      return captionStart < (endTime || Infinity) && captionEnd > startTime;
    });
  }

  adjustCaptionTiming(captions, offsetTime) {
    return captions.map(caption => ({
      ...caption,
      start: Math.max(0, caption.start - offsetTime),
      end: Math.max(0, caption.end - offsetTime)
    }));
  }

  // Format captions for different output formats
  formatAsVTT(captions) {
    let vtt = 'WEBVTT\n\n';
    
    captions.forEach((caption, index) => {
      const start = this.formatVTTTime(caption.start);
      const end = this.formatVTTTime(caption.end);
      
      vtt += `${index + 1}\n`;
      vtt += `${start} --> ${end}\n`;
      vtt += `${caption.text}\n\n`;
    });
    
    return vtt;
  }

  formatAsSRT(captions) {
    return captions.map((caption, index) => {
      const start = this.formatSRTTime(caption.start);
      const end = this.formatSRTTime(caption.end);
      
      return `${index + 1}\n${start} --> ${end}\n${caption.text}\n`;
    }).join('\n');
  }

  formatVTTTime(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 1000);
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
  }

  formatSRTTime(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 1000);
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')},${ms.toString().padStart(3, '0')}`;
  }

  // Clear cache
  clearCache() {
    this.cache.clear();
  }

  // Get cache statistics
  getCacheStats() {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SubtitleExtractor;
} else {
  window.SubtitleExtractor = SubtitleExtractor;
} 