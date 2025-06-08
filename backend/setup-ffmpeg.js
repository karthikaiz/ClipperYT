const path = require('path');
const fs = require('fs');
const os = require('os');
const { spawn } = require('child_process');

console.log('🎬 YouTube Shorts Clipper - FFmpeg Setup');
console.log('========================================\n');

// WinGet FFmpeg paths
const ffmpegPath = path.join(os.homedir(), 'AppData\\Local\\Microsoft\\WinGet\\Packages\\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\\ffmpeg-7.1.1-full_build\\bin\\ffmpeg.exe');
const ffprobePath = path.join(os.homedir(), 'AppData\\Local\\Microsoft\\WinGet\\Packages\\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\\ffmpeg-7.1.1-full_build\\bin\\ffprobe.exe');

async function checkFFmpeg() {
  return new Promise((resolve) => {
    // First try system PATH
    const systemCheck = spawn('ffmpeg', ['-version'], { shell: true });
    
    systemCheck.on('close', (code) => {
      if (code === 0) {
        resolve({ found: true, location: 'system PATH' });
        return;
      }
      
      // Then try WinGet installation
      if (fs.existsSync(ffmpegPath)) {
        const wingetCheck = spawn(ffmpegPath, ['-version']);
        wingetCheck.on('close', (code2) => {
          resolve({ found: code2 === 0, location: 'WinGet package' });
        });
        wingetCheck.on('error', () => {
          resolve({ found: false, location: 'not found' });
        });
      } else {
        resolve({ found: false, location: 'not found' });
      }
    });
    
    systemCheck.on('error', () => {
      // Try WinGet installation
      if (fs.existsSync(ffmpegPath)) {
        const wingetCheck = spawn(ffmpegPath, ['-version']);
        wingetCheck.on('close', (code) => {
          resolve({ found: code === 0, location: 'WinGet package' });
        });
        wingetCheck.on('error', () => {
          resolve({ found: false, location: 'not found' });
        });
      } else {
        resolve({ found: false, location: 'not found' });
      }
    });
  });
}

async function checkFFprobe() {
  return new Promise((resolve) => {
    // First try system PATH
    const systemCheck = spawn('ffprobe', ['-version'], { shell: true });
    
    systemCheck.on('close', (code) => {
      if (code === 0) {
        resolve({ found: true, location: 'system PATH' });
        return;
      }
      
      // Then try WinGet installation
      if (fs.existsSync(ffprobePath)) {
        const wingetCheck = spawn(ffprobePath, ['-version']);
        wingetCheck.on('close', (code2) => {
          resolve({ found: code2 === 0, location: 'WinGet package' });
        });
        wingetCheck.on('error', () => {
          resolve({ found: false, location: 'not found' });
        });
      } else {
        resolve({ found: false, location: 'not found' });
      }
    });
    
    systemCheck.on('error', () => {
      // Try WinGet installation
      if (fs.existsSync(ffprobePath)) {
        const wingetCheck = spawn(ffprobePath, ['-version']);
        wingetCheck.on('close', (code) => {
          resolve({ found: code === 0, location: 'WinGet package' });
        });
        wingetCheck.on('error', () => {
          resolve({ found: false, location: 'not found' });
        });
      } else {
        resolve({ found: false, location: 'not found' });
      }
    });
  });
}

async function main() {
  console.log('🔍 Checking FFmpeg installation...\n');
  
  const ffmpegResult = await checkFFmpeg();
  const ffprobeResult = await checkFFprobe();
  
  console.log(`FFmpeg: ${ffmpegResult.found ? '✅' : '❌'} (${ffmpegResult.location})`);
  console.log(`FFprobe: ${ffprobeResult.found ? '✅' : '❌'} (${ffprobeResult.location})\n`);
  
  if (ffmpegResult.found && ffprobeResult.found) {
    console.log('✅ FFmpeg and FFprobe are available!');
    console.log('✅ Backend is ready to process videos.\n');
    
    if (ffmpegResult.location === 'WinGet package' || ffprobeResult.location === 'WinGet package') {
      console.log('📝 Note: Using WinGet package installation');
      console.log(`   FFmpeg: ${ffmpegPath}`);
      console.log(`   FFprobe: ${ffprobePath}\n`);
    }
    
    console.log('🚀 Next steps:');
    console.log('1. Start the backend: npm start');
    console.log('2. Load the extension in Chrome');
    console.log('3. Visit any YouTube video and start clipping!\n');
    return;
  }
  
  console.log('❌ FFmpeg is not properly installed\n');
  
  console.log('📋 Installation Instructions:');
  console.log('=============================\n');
  
  console.log('Option 1 - Using winget (Recommended):');
  console.log('1. Run: winget install FFmpeg');
  console.log('2. Restart your terminal and run this check again\n');
  
  console.log('Option 2 - Using Chocolatey:');
  console.log('1. Install Chocolatey: https://chocolatey.org/install');
  console.log('2. Run: choco install ffmpeg');
  console.log('3. Restart your terminal\n');
  
  console.log('Option 3 - Manual Download:');
  console.log('1. Download FFmpeg from: https://ffmpeg.org/download.html#build-windows');
  console.log('2. Extract to C:\\ffmpeg\\');
  console.log('3. Add C:\\ffmpeg\\bin to your PATH environment variable');
  console.log('4. Restart your terminal\n');
  
  console.log('⚠️  After installation, run this script again to verify.');
  
  process.exit(1);
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { checkFFmpeg, checkFFprobe }; 