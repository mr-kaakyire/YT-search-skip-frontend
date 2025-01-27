// Function to seek to time
function seekToTime(timeInSeconds) {
  console.log('Seeking to time:', timeInSeconds);
  const video = document.querySelector('video');
  if (!video) {
    console.error('Video element not found');
    return false;
  }

  try {
    video.currentTime = timeInSeconds;
    video.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return true;
  } catch (error) {
    console.error('Error seeking to time:', error);
    return false;
  }
}

// Function to search transcript
function searchTranscript(query) {
  console.log('Searching transcript for:', query);
  
  if (!currentVideoData?.transcript) {
    console.warn('No transcript available');
    searchUI.results.innerHTML = '<div class="no-results">No transcript available</div>';
    return;
  }

  const results = currentVideoData.transcript.filter(item => 
    item.text.toLowerCase().includes(query.toLowerCase())
  );

  console.log('Raw transcript items:', results);

  if (results.length === 0) {
    searchUI.results.innerHTML = '<div class="no-results">No results found</div>';
    return;
  }

  searchUI.results.innerHTML = results.map(item => {
    const timestamp = item.start || item.offset;
    console.log('Item timestamp:', { start: item.start, offset: item.offset, final: timestamp });
    
    return `
    <div class="result-item" style="
      padding: 12px;
      border-bottom: 1px solid #eee;
      cursor: pointer;
      transition: background-color 0.2s;
      display: flex;
      align-items: center;
      gap: 12px;
    " onclick="window.postMessage({ type: 'SEEK_TO_TIME', timeSeconds: ${timestamp} }, '*')" 
      onmouseover="this.style.backgroundColor='#f5f5f5'" 
      onmouseout="this.style.backgroundColor='transparent'">
      <div style="
        background: #065fd4;
        color: white;
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 12px;
        min-width: 60px;
        text-align: center;
      ">${formatTime(timestamp)}</div>
      <div style="flex: 1;">${item.text}</div>
    </div>
  `}).join('');
}

// Handle messages from background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Content script received message:', request);

  if (request.action === 'toggleSearch') {
    console.log('Raw transcript data:', JSON.stringify(request.videoData.transcript, null, 2));
    currentVideoData = request.videoData;
    toggleSearch();
  }
  else if (request.action === 'highlightAdSegments') {
    console.log('Highlighting ad segments:', request.adSegments);
    highlightAdSegments(request.adSegments);
  }
});

// Function to highlight ad segments
function highlightAdSegments(adSegments) {
  console.log('Highlighting ad segments:', adSegments);
  
  if (!adSegments || adSegments.length === 0) {
    console.warn('No ad segments to highlight');
    return;
  }

  const progressBar = findProgressBar();
  if (!progressBar) return;

  // Remove existing highlights
  document.querySelectorAll('.ad-segment-highlight').forEach(el => el.remove());

  // Get video duration
  const video = document.querySelector('video');
  if (!video || !video.duration) {
    console.warn('Video element or duration not found');
    return;
  }

  // Create container for highlights if it doesn't exist
  let highlightContainer = document.querySelector('.ad-segments-container');
  if (!highlightContainer) {
    highlightContainer = document.createElement('div');
    highlightContainer.className = 'ad-segments-container';
    highlightContainer.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 25;
    `;
    progressBar.appendChild(highlightContainer);
  }

  // Add highlights for each ad segment
  adSegments.forEach((segment, index) => {
    const startPercent = (segment.start / video.duration) * 100;
    const endPercent = (segment.end / video.duration) * 100;
    const width = endPercent - startPercent;

    console.log(`Adding highlight ${index + 1}:`, { start: segment.start, end: segment.end, startPercent, endPercent });

    const highlight = document.createElement('div');
    highlight.className = 'ad-segment-highlight';
    highlight.style.cssText = `
      position: absolute;
      left: ${startPercent}%;
      width: ${width}%;
      height: 100%;
      background-color: yellow;
      opacity: 0.5;
      pointer-events: none;
    `;

    highlightContainer.appendChild(highlight);
  });
}

// Listen for messages
window.addEventListener('message', (event) => {
  if (event.source !== window) return;
  
  if (event.data.type === 'SEEK_TO_TIME' && event.data.timeSeconds !== undefined) {
    const timestamp = event.data.timeSeconds;
    console.log('Seeking to timestamp:', timestamp);
    seekToTime(timestamp);
  }
});

// Function to find YouTube progress bar
function findProgressBar() {
  const selectors = [
    '.ytp-progress-bar-container',
    '.ytp-progress-bar',
    '#movie_player .ytp-progress-bar',
    '.html5-video-player .ytp-progress-bar'
  ];
  
  for (const selector of selectors) {
    const element = document.querySelector(selector);
    if (element) {
      console.log('Found progress bar with selector:', selector);
      return element;
    }
  }
  console.warn('Progress bar not found');
  return null;
}

// Function to format time
function formatTime(seconds) {
  const totalSeconds = Math.floor(seconds);
  const minutes = Math.floor(totalSeconds / 60);
  const remainingSeconds = totalSeconds % 60;
  const hours = Math.floor(minutes / 60);
  
  if (hours > 0) {
    return `${hours}:${String(minutes % 60).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
  }
  return `${minutes}:${String(remainingSeconds).padStart(2, '0')}`;
}

// Create and inject search UI
function createSearchUI() {
  console.log('Creating search UI');
  const existingUI = document.getElementById('yt-transcript-search');
  if (existingUI) existingUI.remove();

  const container = document.createElement('div');
  container.id = 'yt-transcript-search';
  container.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 400px;
    background: white;
    border-radius: 8px;
    box-shadow: 0 4px 20px rgba(0,0,0,0.2);
    z-index: 9999;
    padding: 20px;
    display: none;
  `;

  const header = document.createElement('div');
  header.style.cssText = `
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
  `;

  const title = document.createElement('h2');
  title.textContent = 'Search Transcript';
  title.style.cssText = `
    margin: 0;
    font-size: 18px;
    color: #030303;
  `;

  const closeButton = document.createElement('button');
  closeButton.innerHTML = '&times;';
  closeButton.style.cssText = `
    background: none;
    border: none;
    font-size: 24px;
    cursor: pointer;
    padding: 0;
    color: #606060;
  `;
  closeButton.onclick = () => {
    container.style.display = 'none';
  };

  header.appendChild(title);
  header.appendChild(closeButton);

  const input = document.createElement('input');
  input.type = 'text';
  input.placeholder = 'Type to search...';
  input.style.cssText = `
    width: 100%;
    padding: 12px;
    border: 1px solid #ccc;
    border-radius: 4px;
    margin-bottom: 16px;
    font-size: 14px;
    box-sizing: border-box;
  `;

  const results = document.createElement('div');
  results.style.cssText = `
    max-height: 400px;
    overflow-y: auto;
    border-radius: 4px;
    background: #f9f9f9;
  `;

  container.appendChild(header);
  container.appendChild(input);
  container.appendChild(results);
  document.body.appendChild(container);

  // Add keyboard shortcut listener
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'q') {
      e.preventDefault();
      toggleSearch();
    }
  });

  return { container, input, results };
}

// Initialize search UI elements
const searchUI = createSearchUI();
let currentVideoData = null;

// Function to toggle search
function toggleSearch() {
  console.log('Toggling search');
  if (!currentVideoData) {
    // Request video data if we don't have it
    const videoId = new URLSearchParams(window.location.search).get('v');
    if (videoId) {
      chrome.runtime.sendMessage({ 
        action: 'initializeVideo',
        videoId: videoId
      });
    }
  }
  
  searchUI.container.style.display = 
    searchUI.container.style.display === 'none' ? 'block' : 'none';
  
  if (searchUI.container.style.display === 'block') {
    searchUI.input.focus();
  }
}

// Inject script to handle browser localStorage
function injectStorageScript() {
  const script = document.createElement('script');
  script.textContent = `
    // Cache management functions
    const CACHE_PREFIX = 'yt_transcript_';
    const CACHE_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours

    window.YTTranscriptCache = {
      saveToCache(videoId, data) {
        try {
          const cacheData = {
            timestamp: Date.now(),
            data: data
          };
          console.log('Saving to browser cache:', { videoId, data });
          localStorage.setItem(CACHE_PREFIX + videoId, JSON.stringify(cacheData));
          console.log('Successfully saved to browser cache');
          window.postMessage({ type: 'CACHE_SAVED', videoId }, '*');
        } catch (error) {
          console.error('Error saving to browser cache:', error);
        }
      },

      getFromCache(videoId) {
        try {
          console.log('Getting from browser cache:', videoId);
          const cacheItem = localStorage.getItem(CACHE_PREFIX + videoId);
          if (!cacheItem) {
            console.log('No cache found for:', videoId);
            return null;
          }

          const { timestamp, data } = JSON.parse(cacheItem);
          console.log('Found cache data:', { timestamp, dataSize: JSON.stringify(data).length });
          
          if (Date.now() - timestamp > CACHE_EXPIRY) {
            console.log('Cache expired for:', videoId);
            localStorage.removeItem(CACHE_PREFIX + videoId);
            return null;
          }

          console.log('Returning valid cache data');
          return data;
        } catch (error) {
          console.error('Error reading from browser cache:', error);
          return null;
        }
      },

      clearExpiredCache() {
        try {
          console.log('Clearing expired cache entries');
          Object.keys(localStorage).forEach(key => {
            if (key.startsWith(CACHE_PREFIX)) {
              const cacheItem = localStorage.getItem(key);
              const { timestamp } = JSON.parse(cacheItem);
              if (Date.now() - timestamp > CACHE_EXPIRY) {
                console.log('Removing expired cache:', key);
                localStorage.removeItem(key);
              }
            }
          });
        } catch (error) {
          console.error('Error clearing expired cache:', error);
        }
      }
    };

    // Listen for cache requests from content script
    window.addEventListener('message', (event) => {
      if (event.source !== window) return;
      
      console.log('Browser cache received message:', event.data);
      
      if (event.data.type === 'GET_CACHE') {
        const data = window.YTTranscriptCache.getFromCache(event.data.videoId);
        window.postMessage({ 
          type: 'CACHE_RESPONSE',
          videoId: event.data.videoId,
          data: data
        }, '*');
      } else if (event.data.type === 'SAVE_CACHE') {
        window.YTTranscriptCache.saveToCache(event.data.videoId, event.data.data);
      } else if (event.data.type === 'CLEAR_EXPIRED') {
        window.YTTranscriptCache.clearExpiredCache();
      }
    });

    console.log('YTTranscriptCache initialized');
  `;
  
  // Remove any existing script
  const existingScript = document.getElementById('yt-transcript-cache');
  if (existingScript) {
    existingScript.remove();
  }
  
  script.id = 'yt-transcript-cache';
  (document.head || document.documentElement).appendChild(script);
  console.log('Cache script injected');
}

// Function to get data from browser cache
async function getFromBrowserCache(videoId) {
  console.log('Requesting data from browser cache:', videoId);
  return new Promise((resolve) => {
    const handler = (event) => {
      if (event.data.type === 'CACHE_RESPONSE' && event.data.videoId === videoId) {
        console.log('Received cache response:', event.data);
        window.removeEventListener('message', handler);
        resolve(event.data.data);
      }
    };
    window.addEventListener('message', handler);
    window.postMessage({ type: 'GET_CACHE', videoId }, '*');
  });
}

// Function to save data to browser cache
function saveToBrowserCache(videoId, data) {
  console.log('Saving to browser cache:', { videoId, dataSize: JSON.stringify(data).length });
  window.postMessage({ 
    type: 'SAVE_CACHE',
    videoId: videoId,
    data: data
  }, '*');
}

// Function to clear expired cache
function clearExpiredBrowserCache() {
  window.postMessage({ type: 'CLEAR_EXPIRED' }, '*');
}

// Initialize extension
async function initializeExtension() {
  console.log('Initializing extension');
  
  // Inject the storage script
  injectStorageScript();
  
  const videoId = new URLSearchParams(window.location.search).get('v');
  if (!videoId) {
    console.warn('No video ID found in URL');
    return;
  }

  console.log('Found video ID:', videoId);
  
  // Check browser cache first
  const cachedData = await getFromBrowserCache(videoId);
  if (cachedData) {
    console.log('Using cached data from browser');
    currentVideoData = cachedData;
    if (cachedData.adSegments) {
      highlightAdSegments(cachedData.adSegments);
    }
  } else {
    console.log('Fetching fresh data');
    chrome.runtime.sendMessage({ 
      action: 'initializeVideo',
      videoId: videoId
    });
  }

  setupVideoPlayerMonitor();
  clearExpiredBrowserCache();
}

// Handle messages from background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Content script received message:', request);

  if (request.action === 'toggleSearch') {
    console.log('Raw transcript data:', JSON.stringify(request.videoData.transcript, null, 2));
    currentVideoData = request.videoData;
    toggleSearch();
  }
  else if (request.action === 'highlightAdSegments') {
    console.log('Highlighting ad segments:', request.adSegments);
    highlightAdSegments(request.adSegments);
  }
});

// Monitor for video player and changes
function setupVideoPlayerMonitor() {
  console.log('Setting up video player monitor');
  const observer = new MutationObserver((mutations) => {
    const video = document.querySelector('video');
    if (video) {
      console.log('Video element found via observer');
      setupVideoEventListeners(video);
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });

  const video = document.querySelector('video');
  if (video) {
    console.log('Video element found immediately');
    setupVideoEventListeners(video);
  }
}

// Setup video event listeners
function setupVideoEventListeners(video) {
  console.log('Setting up video event listeners');
  video.addEventListener('loadedmetadata', () => {
    console.log('Video metadata loaded');
    chrome.runtime.sendMessage({ action: 'getVideoData' }, (response) => {
      if (response?.adSegments) {
        console.log('Received video data:', response);
        highlightAdSegments(response.adSegments);
      } else {
        console.warn('No ad segments in response:', response);
      }
    });
  });

  const progressBarObserver = new MutationObserver((mutations) => {
    const progressBar = findProgressBar();
    if (progressBar) {
      console.log('Progress bar found via observer');
      chrome.runtime.sendMessage({ action: 'getVideoData' }, (response) => {
        if (response?.adSegments) {
          highlightAdSegments(response.adSegments);
        }
      });
    }
  });

  progressBarObserver.observe(document.body, {
    childList: true,
    subtree: true
  });
}

// Start initialization
console.log('Content script loaded');
initializeExtension();

// Handle URL changes (for single-page app navigation)
let lastUrl = location.href;
new MutationObserver(() => {
  const url = location.href;
  if (url !== lastUrl) {
    console.log('URL changed:', url);
    lastUrl = url;
    initializeExtension();
  }
}).observe(document, { subtree: true, childList: true });

// Listen for search input
searchUI.input.addEventListener('input', (e) => {
  searchTranscript(e.target.value);
});
