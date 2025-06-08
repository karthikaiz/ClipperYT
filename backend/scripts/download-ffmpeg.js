// Script to download FFmpeg.wasm files for the backend

const fs = require('fs');
const path = require('path');
const https = require('https');

const FFMPEG_VERSION = '0.12.6';
const LIB_DIR = path.join(__dirname, '..', 'lib');

// Ensure lib directory exists
if (!fs.existsSync(LIB_DIR)) {
  fs.mkdirSync(LIB_DIR, { recursive: true });
}

// FFmpeg files to download
const files = [
  {
    name: 'ffmpeg-core.js',
    url: `https://unpkg.com/@ffmpeg/core@${FFMPEG_VERSION}/dist/esm/ffmpeg-core.js`
  },
  {
    name: 'ffmpeg-core.wasm',
    url: `https://unpkg.com/@ffmpeg/core@${FFMPEG_VERSION}/dist/esm/ffmpeg-core.wasm`
  }
];

async function downloadFile(url, filename) {
  return new Promise((resolve, reject) => {
    const filePath = path.join(LIB_DIR, filename);
    const file = fs.createWriteStream(filePath);
    
    console.log(`Downloading ${filename}...`);
    
    https.get(url, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download ${filename}: ${response.statusCode}`));
        return;
      }
      
      response.pipe(file);
      
      file.on('finish', () => {
        file.close();
        console.log(`✅ Downloaded ${filename}`);
        resolve();
      });
    }).on('error', (error) => {
      fs.unlink(filePath, () => {}); // Delete the file on error
      reject(error);
    });
  });
}

async function downloadAllFiles() {
  try {
    console.log('🚀 Setting up FFmpeg.wasm for Backend...\n');
    
    for (const file of files) {
      await downloadFile(file.url, file.name);
    }
    
    console.log('\n✅ All FFmpeg files downloaded successfully!');
    console.log('📁 Files saved to:', LIB_DIR);
    console.log('\n🎯 Next steps:');
    console.log('1. Install dependencies: npm install');
    console.log('2. Start the backend server: npm start');
    console.log('3. Backend will be available at http://localhost:3001');
    
  } catch (error) {
    console.error('❌ Error downloading FFmpeg files:', error.message);
    process.exit(1);
  }
}

// Check if we're in a Node.js environment
if (typeof require !== 'undefined' && require.main === module) {
  downloadAllFiles();
}

module.exports = { downloadAllFiles }; 