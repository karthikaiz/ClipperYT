// ClipperYT - YouTube SPA Navigation Test Script
// Paste this into browser console on any YouTube page to test navigation detection

console.log('🧪 ClipperYT SPA Navigation Test Started');

// Track navigation events
let navigationCount = 0;

// Override history methods to track navigation
const originalPushState = history.pushState;
const originalReplaceState = history.replaceState;

history.pushState = function(...args) {
  navigationCount++;
  console.log(`🔄 Navigation ${navigationCount}: pushState detected`);
  console.log('   URL:', window.location.href);
  console.log('   Args:', args);
  originalPushState.apply(history, args);
  checkPageState();
};

history.replaceState = function(...args) {
  navigationCount++;
  console.log(`🔄 Navigation ${navigationCount}: replaceState detected`);
  console.log('   URL:', window.location.href);
  console.log('   Args:', args);
  originalReplaceState.apply(history, args);
  checkPageState();
};

// Listen for popstate
window.addEventListener('popstate', () => {
  navigationCount++;
  console.log(`🔄 Navigation ${navigationCount}: popstate detected`);
  console.log('   URL:', window.location.href);
  checkPageState();
});

// Check current page state
function checkPageState() {
  console.log('📊 Page State Check:');
  console.log('   URL:', window.location.href);
  console.log('   Pathname:', window.location.pathname);
  console.log('   Search:', window.location.search);
  console.log('   Is video page:', isVideoPage());
  console.log('   Document ready:', document.readyState);
  
  // Check for video elements
  console.log('🎬 Video Elements:');
  console.log('   #movie_player:', !!document.querySelector('#movie_player'));
  console.log('   video tag:', !!document.querySelector('video'));
  console.log('   .ytp-chrome-bottom:', !!document.querySelector('.ytp-chrome-bottom'));
  console.log('   .ytp-right-controls:', !!document.querySelector('.ytp-right-controls'));
  console.log('   .ytp-clipper-button:', !!document.querySelector('.ytp-clipper-button'));
  
  console.log('---');
}

function isVideoPage() {
  return window.location.pathname === '/watch' && 
         window.location.search.includes('v=');
}

// Initial check
checkPageState();

// Set up DOM mutation observer
const observer = new MutationObserver((mutations) => {
  let hasVideoElements = false;
  
  mutations.forEach((mutation) => {
    if (mutation.addedNodes.length > 0) {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === 1) {
          const element = node;
          if (element.matches && (
            element.matches('#movie_player') ||
            element.matches('.ytp-chrome-controls') ||
            element.matches('[id^="movie_player"]')
          )) {
            hasVideoElements = true;
          }
        }
      });
    }
  });
  
  if (hasVideoElements) {
    console.log('🎬 DOM Mutation: Video elements added');
    setTimeout(checkPageState, 100);
  }
});

observer.observe(document.body, {
  childList: true,
  subtree: true
});

console.log('✅ Test setup complete. Navigate between YouTube videos to see logs.');
console.log('📝 To stop test: observer.disconnect()');

// Return test controls
window.clipperYTTest = {
  checkState: checkPageState,
  stop: () => {
    observer.disconnect();
    console.log('🛑 ClipperYT test stopped');
  },
  getNavigationCount: () => navigationCount
}; 