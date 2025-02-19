// Current video state
let currentVideoData = null;
let currentVideoId = null;

// Function to seek to time
function seekToTime(timeInSeconds) {
  console.log('Seeking to time:', timeInSeconds);
  const video = document.querySelector('video');
  if (!video) {
    console.error('Video element not found');
    return false;
  }

  try {
    video.currentTime = parseFloat(timeInSeconds);
    video.play();
    return true;
  } catch (error) {
    console.error('Error seeking to time:', error);
    return false;
  }
}

// Function to get current video ID
function getCurrentVideoId() {
  const url = new URL(window.location.href);
  return url.searchParams.get('v');
}

// Function to request video data
function requestVideoData(videoId, force = false) {
  const action = force ? 'forceRefresh' : 'getVideoData';
  chrome.runtime.sendMessage({
    action: action,
    videoId: videoId
  });
}

// Function to handle video data update
function handleVideoDataUpdate(data) {
  currentVideoData = data;
  
  if (data.adSegments) {
    highlightAdSegments(data.adSegments);
  }
  
  if (data.transcript) {
    // Update UI or store transcript for search
    updateSearchUI();
  }
}

// Function to update search UI
function updateSearchUI() {
  const searchContainer = document.querySelector('#yt-adskip-search');
  if (!searchContainer) {
    createSearchUI();
  }
}

// Function to search transcript
function searchTranscript(query) {
  console.log('Searching transcript for:', query);
  
  if (!currentVideoData?.transcript) {
    console.error('No transcript data available');
    return [];
  }

  const results = currentVideoData.transcript
    .filter(item => item.text.toLowerCase().includes(query.toLowerCase()))
    .map(item => ({
      text: item.text,
      timestamp: parseFloat(item.start),
      end: parseFloat(item.start) + parseFloat(item.duration)
    }));

  if (results.length > 0) {
    clearHighlights(); // Clear existing highlights
    highlightSearchResults(results); // Highlight new results
  }

  return results;
}

// Function to get video ID from URL
function getVideoId(url) {
  const urlParams = new URLSearchParams(new URL(url).search);
  return urlParams.get('v');
}

// Function to check if we're on a video page
function isVideoPage() {
  return window.location.pathname === '/watch' && getVideoId(window.location.href);
}

// Function to highlight ad segments on the progress bar
function highlightAdSegments(adSegments) {
  if (!adSegments || adSegments.length === 0) return;

  // Find the progress bar container
  const progressBar = document.querySelector('.ytp-timed-markers-container');
  if (!progressBar) {
    console.warn('Progress bar not found');
    return;
  }

  // Get video duration
  const video = document.querySelector('video');
  if (!video || !video.duration) {
    console.warn('Video element or duration not found');
    return;
  }

  // Remove any existing highlights
  document.querySelectorAll('.ad-segment-highlight').forEach(el => el.remove());

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
  adSegments.forEach(segment => {
    const startPercent = (segment.start / video.duration) * 100;
    const endPercent = (segment.end / video.duration) * 100;
    const width = endPercent - startPercent;

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
      z-index: 26;
    `;

    highlightContainer.appendChild(highlight);
  });
}

// Function to create tooltip element
function createTooltip() {
    const tooltip = document.createElement('div');
    tooltip.style.position = 'absolute';
    tooltip.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
    tooltip.style.color = 'white';
    tooltip.style.padding = '8px';
    tooltip.style.borderRadius = '4px';
    tooltip.style.fontSize = '12px';
    tooltip.style.zIndex = '9999';
    tooltip.style.pointerEvents = 'none';
    tooltip.style.display = 'none';
    document.body.appendChild(tooltip);
    return tooltip;
}

// Function to format time in MM:SS format
function formatTimeForTooltip(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

// Function to highlight segments on YouTube progress bar
function highlightYouTubeProgress(startTime, endTime, color = "yellow") {
    console.log('Highlighting segment:', { startTime, endTime, color });
    
    const progressBar = document.querySelector(".ytp-progress-bar");
    if (!progressBar) {
        console.error("YouTube progress bar not found");
        return false;
    }

    const video = document.querySelector("video");
    if (!video) {
        console.error("Video element not found");
        return false;
    }

    const duration = video.duration;
    if (!duration) {
        console.error("Video duration not available");
        return false;
    }

    // Calculate positions
    const startPercent = (startTime / duration) * 100;
    const endPercent = (endTime / duration) * 100;
    const widthPercent = endPercent - startPercent;

    // Create highlight element
    const highlight = document.createElement("div");
    highlight.className = 'yt-adskip-highlight';
    highlight.style.cssText = `
        position: absolute;
        left: ${startPercent}%;
        width: ${widthPercent}%;
        height: 100%;
        background-color: ${color};
        opacity: 0.5;
        pointer-events: none;
        z-index: 41;
    `;

    // Add highlight to progress bar
    progressBar.appendChild(highlight);
    return true;
}

// Function to clear existing highlights
function clearHighlights() {
    const highlights = document.querySelectorAll('.yt-adskip-highlight');
    highlights.forEach(highlight => highlight.remove());
}

// Function to highlight ad segments
function highlightAdSegments(adSegments) {
    clearHighlights(); // Clear existing highlights
    if (!adSegments || !Array.isArray(adSegments)) return;
    
    adSegments.forEach(segment => {
        if (segment.start && segment.end) {
            const startFormatted = formatTimeForTooltip(segment.start);
            const endFormatted = formatTimeForTooltip(segment.end);
            const tooltipText = `Ad Segment: ${startFormatted} - ${endFormatted}`;
            highlightYouTubeProgress(segment.start, segment.end, "yellow", tooltipText);
        }
    });
}

// Function to highlight search results
function highlightSearchResults(results) {
    if (!results || !Array.isArray(results)) return;
    
    results.forEach(result => {
        if (result.timestamp || result.start) {
            const startTime = result.timestamp || result.start;
            const endTime = result.end || (startTime + 5); // Default 5 second highlight if no end time
            const tooltipText = `Found: "${result.text}"`;
            highlightYouTubeProgress(startTime, endTime, "yellow", tooltipText);
        }
    });
}

// Cache management
function getCachedVideoData(videoId) {
  try {
    const cached = localStorage.getItem(`yt-adskip-${videoId}`);
    if (!cached) return null;

    const { data, timestamp } = JSON.parse(cached);
    // Cache expires after 24 hours
    if (Date.now() - timestamp > 24 * 60 * 60 * 1000) {
      localStorage.removeItem(`yt-adskip-${videoId}`);
      return null;
    }
    return data;
  } catch (error) {
    console.error('Error reading from cache:', error);
    return null;
  }
}

function cacheVideoData(videoId, data) {
  try {
    const cacheData = {
      timestamp: Date.now(),
      data: data
    };
    localStorage.setItem(`yt-adskip-${videoId}`, JSON.stringify(cacheData));
  } catch (error) {
    console.error('Error writing to cache:', error);
  }
}

// Clean up old cache entries
function cleanupCache() {
  try {
    const keys = Object.keys(localStorage);
    const now = Date.now();
    keys.forEach(key => {
      if (key.startsWith('yt-adskip-')) {
        try {
          const cached = JSON.parse(localStorage.getItem(key));
          if (now - cached.timestamp > 24 * 60 * 60 * 1000) {
            localStorage.removeItem(key);
          }
        } catch (error) {
          // If the item is invalid JSON, remove it
          localStorage.removeItem(key);
        }
      }
    });
  } catch (error) {
    console.error('Error cleaning cache:', error);
  }
}

// Function to handle video page load
async function handleVideoLoad() {
  const videoId = getCurrentVideoId();
  if (!videoId) return;

  if (videoId !== currentVideoId) {
    currentVideoId = videoId;
    requestVideoData(videoId);
  }
}

// Listen for messages from background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Content script received message:', request);

  if (request.action === 'seekToTime' || request.action === 'skipToTime') {
    console.log('Attempting to seek to time:', request.time);
    const success = seekToTime(request.time);
    console.log('Seek result:', success);
    sendResponse({ success });
    return true; // Keep the message channel open for async response
  }

  if (request.action === 'toggleSearch') {
    currentVideoData = request.videoData;
    if (request.videoData.adSegments) {
      highlightAdSegments(request.videoData.adSegments);
    }
    toggleSearch();
  }
});

// Listen for page navigation
let lastUrl = location.href;
new MutationObserver(() => {
  if (location.href !== lastUrl) {
    lastUrl = location.href;
    if (isVideoPage()) {
      console.log('New video page detected');
      handleVideoLoad();
    }
  }
}).observe(document, { subtree: true, childList: true });

// Initial load check
if (isVideoPage()) {
  console.log('Video page detected on initial load');
  handleVideoLoad();
}

// Handle window messages
window.addEventListener('message', (event) => {
  if (event.source !== window) return;
  
  if (event.data.type === 'SEEK_TO_TIME' && event.data.timeSeconds !== undefined) {
    seekToTime(event.data.timeSeconds);
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

// Function to handle video page load
async function handleVideoLoad() {
  const videoId = getCurrentVideoId();
  if (!videoId) return;

  if (videoId !== currentVideoId) {
    currentVideoId = videoId;
    requestVideoData(videoId);
  }
}

// Listen for messages from background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Content script received message:', request);

  if (request.action === 'toggleSearch') {
    currentVideoData = request.videoData;
    if (request.videoData.adSegments) {
      highlightAdSegments(request.videoData.adSegments);
    }
    toggleSearch();
  }
  else if (request.action === 'seekToTime' && request.time) {
    seekToTime(request.time);
  }
});

// Handle window messages
window.addEventListener('message', (event) => {
  if (event.source !== window) return;
  
  if (event.data.type === 'SEEK_TO_TIME') {
    seekToTime(event.data.timeSeconds);
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

// Initialize
function initialize() {
  cleanupCache();
  if (isVideoPage()) {
    console.log('Video page detected on initial load');
    handleVideoLoad();
  }
}

initialize();

// Handle URL changes (for single-page app navigation)
lastUrl = location.href;
new MutationObserver(() => {
  if (location.href !== lastUrl) {
    console.log('URL changed:', location.href);
    lastUrl = location.href;
    initialize();
  }
}).observe(document, { subtree: true, childList: true });

// Listen for search input
searchUI.input.addEventListener('input', (e) => {
  searchTranscript(e.target.value);
});

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Content script received message:', request);

  if (request.action === 'seekToTime') {
    console.log('Seeking to time:', request.time);
    const success = seekToTime(request.time);
    sendResponse({ success });
    return true;
  }

  if (request.action === 'highlightTimeline') {
    try {
      const { segments, color } = request.data;
      
      // Ensure segments are properly formatted
      const validSegments = segments
        .map(segment => ({
          start: Number(segment.start),
          end: Number(segment.end)
        }))
        .filter(segment => !isNaN(segment.start) && !isNaN(segment.end));

      console.log('Highlighting segments:', validSegments);
      
      const results = validSegments.map(segment => 
        highlightYouTubeProgress(segment.start, segment.end, color)
      );

      sendResponse({ success: results.some(result => result) });
    } catch (error) {
      console.error('Error highlighting timeline:', error);
      sendResponse({ success: false, error: error.message });
    }
    return true;
  }

  if (request.action === 'clearHighlights') {
    try {
      clearHighlights();
      sendResponse({ success: true });
    } catch (error) {
      console.error('Error clearing highlights:', error);
      sendResponse({ success: false, error: error.message });
    }
    return true;
  }
});

// Re-apply highlights when video player updates
const observer = new MutationObserver((mutations) => {
  for (const mutation of mutations) {
    if (mutation.type === 'childList' && mutation.target.classList.contains('ytp-progress-bar-container')) {
      console.log('Progress bar updated, re-applying highlights');
      // TODO: Store and re-apply current highlights
    }
  }
});

// Start observing the progress bar for changes
function startObserving() {
  const progressBar = document.querySelector('.ytp-progress-bar-container');
  if (progressBar) {
    observer.observe(progressBar, {
      childList: true,
      subtree: true
    });
    console.log('Started observing progress bar');
  }
}

// Initialize when page loads
startObserving();
