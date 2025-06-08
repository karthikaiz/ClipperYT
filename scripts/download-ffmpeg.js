// Script to download FFmpeg.wasm files for the Chrome extension

const https = require('https');
const fs = require('fs');
const path = require('path');

// Create lib directory if it doesn't exist
const libDir = path.join(__dirname, '..', 'lib');
if (!fs.existsSync(libDir)) {
  fs.mkdirSync(libDir, { recursive: true });
}

// FFmpeg.wasm files to download
const files = [
  {
    url: 'https://unpkg.com/@ffmpeg/ffmpeg@0.12.6/dist/umd/ffmpeg.js',
    filename: 'ffmpeg.min.js'
  },
  {
    url: 'https://unpkg.com/@ffmpeg/core@0.12.4/dist/umd/ffmpeg-core.js',
    filename: 'ffmpeg-core.js'  
  },
  {
    url: 'https://unpkg.com/@ffmpeg/core@0.12.4/dist/umd/ffmpeg-core.wasm',
    filename: 'ffmpeg-core.wasm'
  },
  {
    url: 'https://unpkg.com/@ffmpeg/core-mt@0.12.4/dist/umd/ffmpeg-core.js',
    filename: 'ffmpeg-core-mt.js'
  },
  {
    url: 'https://unpkg.com/@ffmpeg/core-mt@0.12.4/dist/umd/ffmpeg-core.wasm',
    filename: 'ffmpeg-core-mt.wasm'
  }
];

function downloadFile(url, filepath) {
  return new Promise((resolve, reject) => {
    console.log(`Downloading ${url}...`);
    
    const file = fs.createWriteStream(filepath);
    
    https.get(url, (response) => {
      if (response.statusCode === 200) {
        response.pipe(file);
        
        file.on('finish', () => {
          file.close();
          console.log(`✓ Downloaded ${path.basename(filepath)}`);
          resolve();
        });
        
        file.on('error', (err) => {
          fs.unlink(filepath, () => {}); // Delete partial file
          reject(err);
        });
      } else if (response.statusCode === 302 || response.statusCode === 301) {
        // Follow redirect
        downloadFile(response.headers.location, filepath)
          .then(resolve)
          .catch(reject);
      } else {
        reject(new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`));
      }
    }).on('error', reject);
  });
}

async function downloadFFmpeg() {
  console.log('📦 Downloading FFmpeg.wasm files...\n');
  
  try {
    for (const file of files) {
      const filepath = path.join(libDir, file.filename);
      
      // Skip if file already exists
      if (fs.existsSync(filepath)) {
        console.log(`⏭️  ${file.filename} already exists, skipping`);
        continue;
      }
      
      await downloadFile(file.url, filepath);
    }
    
    console.log('\n✅ FFmpeg.wasm download complete!');
    console.log(`📁 Files saved to: ${libDir}`);
    
    // List downloaded files
    const downloadedFiles = fs.readdirSync(libDir);
    console.log('\n📋 Downloaded files:');
    downloadedFiles.forEach(file => {
      const filepath = path.join(libDir, file);
      const stats = fs.statSync(filepath);
      const sizeInMB = (stats.size / 1024 / 1024).toFixed(2);
      console.log(`   ${file} (${sizeInMB} MB)`);
    });
    
  } catch (error) {
    console.error('❌ Error downloading FFmpeg.wasm:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  downloadFFmpeg();
}

module.exports = { downloadFFmpeg }; 