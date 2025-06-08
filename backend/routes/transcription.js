const express = require('express');
const multer = require('multer');
const FormData = require('form-data');
const router = express.Router();

// Dynamic import for node-fetch (ES module)
let fetch;
(async () => {
  const nodeFetch = await import('node-fetch');
  fetch = nodeFetch.default;
})();

// Configure multer for audio file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit for audio files
  }
});

/**
 * POST /transcribe
 * Transcribe audio using Gemini 2.0 Flash
 */
router.post('/transcribe', upload.single('audio'), async (req, res) => {
  try {
    console.log('🤖 Starting Gemini 2.0 Flash transcription...');
    
    if (!fetch) {
      return res.status(500).json({ error: 'Server still initializing, please try again' });
    }
    
    if (!req.file) {
      return res.status(400).json({ error: 'No audio file provided' });
    }
    
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'Gemini API key not configured' });
    }
    
    const { duration } = req.body;
    const audioBuffer = req.file.buffer;
    
    console.log('📁 Audio file received:', req.file.size, 'bytes');
    
    // Convert audio buffer to base64
    const audioBase64 = audioBuffer.toString('base64');
    
    // Prepare Gemini 2.0 Flash API request
    const geminiRequest = {
      contents: [{
        parts: [{
          text: `Please transcribe this audio and provide accurate timestamps. Format the response as a JSON array with this exact structure: [{"start_time": 0.5, "end_time": 3.2, "text": "Hello world"}]. Keep segments short (2-4 words each) for mobile subtitle display. The total duration is approximately ${duration} seconds.`
        }, {
          inline_data: {
            mime_type: req.file.mimetype || "audio/webm",
            data: audioBase64
          }
        }]
      }],
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 4096,
        topP: 0.8,
        topK: 10
      }
    };
    
    console.log('🚀 Sending to Gemini 2.0 Flash...');
    
    // Call Gemini 2.0 Flash API
    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey
      },
      body: JSON.stringify(geminiRequest)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Gemini API error:', response.status, errorText);
      return res.status(response.status).json({ 
        error: `Gemini API error: ${response.status}`,
        details: errorText
      });
    }
    
    const result = await response.json();
    
    if (!result.candidates || !result.candidates[0] || !result.candidates[0].content) {
      console.error('❌ Invalid Gemini response structure:', result);
      return res.status(500).json({ error: 'Invalid response from Gemini API' });
    }
    
    const transcriptionText = result.candidates[0].content.parts[0].text;
    console.log('📝 Gemini transcription received:', transcriptionText.substring(0, 200) + '...');
    
    // Parse JSON response
    let subtitles;
    try {
      // Extract JSON from the response (in case it has extra text)
      const jsonMatch = transcriptionText.match(/\[.*\]/s);
      const jsonText = jsonMatch ? jsonMatch[0] : transcriptionText;
      
      subtitles = JSON.parse(jsonText);
      
      // Validate subtitle format
      if (!Array.isArray(subtitles)) {
        throw new Error('Response is not an array');
      }
      
      // Ensure each subtitle has required fields
      subtitles = subtitles.filter(sub => 
        sub && typeof sub.start_time === 'number' && 
        typeof sub.end_time === 'number' && 
        typeof sub.text === 'string'
      );
      
      console.log('✅ Parsed subtitles:', subtitles.length, 'segments');
      
    } catch (parseError) {
      console.warn('⚠️ JSON parsing failed, creating fallback subtitles:', parseError.message);
      
      // Fallback: create simple time-based subtitles
      subtitles = createFallbackSubtitles(transcriptionText, duration);
    }
    
    res.json({
      success: true,
      subtitles: subtitles,
      originalText: transcriptionText
    });
    
  } catch (error) {
    console.error('❌ Transcription error:', error);
    res.status(500).json({ 
      error: 'Transcription failed',
      details: error.message
    });
  }
});

/**
 * Create fallback subtitles when JSON parsing fails
 */
function createFallbackSubtitles(text, duration) {
  const words = text.split(/\s+/).filter(word => word.length > 0);
  const wordsPerSegment = 3;
  const segmentDuration = duration / Math.ceil(words.length / wordsPerSegment);
  
  const subtitles = [];
  for (let i = 0; i < words.length; i += wordsPerSegment) {
    const segmentWords = words.slice(i, i + wordsPerSegment);
    const startTime = (i / wordsPerSegment) * segmentDuration;
    const endTime = Math.min(startTime + segmentDuration, duration);
    
    subtitles.push({
      start_time: parseFloat(startTime.toFixed(2)),
      end_time: parseFloat(endTime.toFixed(2)),
      text: segmentWords.join(' ')
    });
  }
  
  return subtitles;
}

module.exports = router; 