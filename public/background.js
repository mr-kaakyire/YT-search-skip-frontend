// Store current video data in memory
let currentVideoData = null;
let lastVideoId = null;

// Cache management functions
async function getCachedVideoData(videoId) {
  try {
    const data = await chrome.storage.local.get(videoId);
    if (!data[videoId]) return null;

    // Check if cache is expired (24 hours)
    const cacheEntry = data[videoId];
    const now = Date.now();
    if (now - cacheEntry.timestamp > 24 * 60 * 60 * 1000) {
      // Cache expired, remove it
      await chrome.storage.local.remove(videoId);
      return null;
    }
    
    return cacheEntry.data;
  } catch (error) {
    console.error('Error reading from cache:', error);
    return null;
  }
}

async function cacheVideoData(videoId, data) {
  try {
    const cacheEntry = {
      timestamp: Date.now(),
      data: data
    };
    await chrome.storage.local.set({ [videoId]: cacheEntry });
  } catch (error) {
    console.error('Error writing to cache:', error);
  }
}

// Clean up old cache entries periodically (every hour)
setInterval(async () => {
  try {
    const storage = await chrome.storage.local.get(null);
    const now = Date.now();
    const keysToRemove = Object.keys(storage).filter(key => {
      const entry = storage[key];
      return now - entry.timestamp > 24 * 60 * 60 * 1000;
    });
    if (keysToRemove.length > 0) {
      await chrome.storage.local.remove(keysToRemove);
    }
  } catch (error) {
    console.error('Error cleaning cache:', error);
  }
}, 60 * 60 * 1000);

// Function to fetch video data
async function fetchVideoData(videoId, force = false) {
  try {
    // If we already have data for this video and not forcing refresh, return it
    if (!force && videoId === lastVideoId && currentVideoData) {
      console.log('Using in-memory data for video:', videoId);
      return currentVideoData;
    }

    // First check cache
    const cachedData = await getCachedVideoData(videoId);
    if (cachedData) {
      console.log('Cache hit for video:', videoId);
      currentVideoData = cachedData;
      lastVideoId = videoId;
      return cachedData;
    }

    // If not in cache, fetch from server
    console.log('Cache miss for video:', videoId);
    const response = await fetch('http://localhost:3000/analyze-video', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        videoUrl: `https://www.youtube.com/watch?v=${videoId}` 
      })
    });

    if (!response.ok) throw new Error('Failed to fetch video data');
    
    const data = await response.json();
    
    // Cache the response
    await cacheVideoData(videoId, data);
    
    // Update memory cache
    currentVideoData = data;
    lastVideoId = videoId;

    return data;
  } catch (error) {
    console.error('Error fetching video data:', error);
    return null;
  }
}

// Function to send data to content script
async function sendDataToContentScript(tabId, data) {
  try {
    await chrome.tabs.sendMessage(tabId, {
      action: 'updateVideoData',
      videoData: data
    });
  } catch (error) {
    console.error('Error sending data to content script:', error);
  }
}

// Listen for tab updates
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url?.includes('youtube.com/watch')) {
    const videoId = new URL(tab.url).searchParams.get('v');
    if (!videoId) return;

    const data = await fetchVideoData(videoId);
    if (data) {
      await sendDataToContentScript(tabId, data);
    }
  }
});

// Listen for messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Background script received message:', request);

  if (request.action === 'getVideoData') {
    const videoId = request.videoId;
    
    // First check cache
    getCachedVideoData(videoId).then(cachedData => {
      if (cachedData) {
        console.log('Cache hit for video:', videoId);
        sendResponse(cachedData);
        return;
      }
      
      // If not in cache, fetch from server
      console.log('Cache miss for video:', videoId);
      fetchVideoData(videoId).then(data => {
        if (data) {
          sendResponse(data);
        }
      });
    });
    
    return true; // Required for async response
  }

  if (request.action === 'forceRefresh') {
    const videoId = request.videoId;
    fetchVideoData(videoId, true).then(data => {
      if (data && sender.tab?.id) {
        sendDataToContentScript(sender.tab.id, data);
      }
    });
    return true;
  }

  if (request.action === 'toggleSearch') {
    chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
      if (!tabs[0]?.id) return;
      
      try {
        await chrome.tabs.sendMessage(tabs[0].id, {
          action: 'toggleSearch',
          videoData: currentVideoData
        });
      } catch (error) {
        console.error('Failed to toggle search:', error);
      }
    });
    return true;
  }

  if (request.action === 'skipToTime') {
    chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
      if (!tabs[0]?.id) {
        sendResponse({ success: false, error: 'No active tab found' });
        return;
      }

      try {
        // Forward the message to content script
        const response = await chrome.tabs.sendMessage(tabs[0].id, {
          action: 'seekToTime',
          time: request.time
        });
        sendResponse({ success: true });
      } catch (error) {
        console.error('Error in skip handler:', error);
        sendResponse({ success: false, error: error.message });
      }
    });
    return true; // Required for async sendResponse
  }
});

// Service Worker setup
self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...');
  event.waitUntil(clients.claim());
});
