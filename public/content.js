(function() {
  // If script has already run, do nothing
  if (window.ytAdSkipContentLoaded) {
    console.log('YT AdSkip content script already loaded');
    return;
  }
  
  // Mark as loaded
  window.ytAdSkipContentLoaded = true;
  
  // Track auto-skip state (default to false, will be updated from storage)
  window.ytAdSkipAutoSkip = false;
  
  // Track current video ID
  let currentVideoId = getVideoIdFromURL(window.location.href);
  console.log('Initial video ID:', currentVideoId);
  
  // Helper function to get video ID from URL
  function getVideoIdFromURL(url) {
    try {
      const urlObj = new URL(url);
      return urlObj.searchParams.get('v');
    } catch (error) {
      console.error('Error parsing URL:', error);
      return null;
    }
  }
  
  // Clear all ad markers from the page
  function clearAdMarkers() {
    document.querySelectorAll('.yt-adskip-marker').forEach(marker => marker.remove());
    console.log('Ad markers cleared');
    
    // Also hide skip button if it exists
    const skipButton = document.querySelector('.yt-adskip-button');
    if (skipButton) {
      skipButton.style.display = 'none';
    }
  }

  // Load auto-skip setting from storage
  chrome.storage.sync.get(['autoSkipEnabled'], (result) => {
    if (result.autoSkipEnabled !== undefined) {
      window.ytAdSkipAutoSkip = !!result.autoSkipEnabled;
      console.log('Loaded auto-skip setting from storage:', window.ytAdSkipAutoSkip);
    }
  });
  
  // Store ad segments
  let adSegments = [];
  
  // Listen for messages from the extension popup
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'seekTo') {
      const video = document.querySelector('video');
      if (video) {
        video.currentTime = request.time;
        video.play();
      }
    } else if (request.action === 'setAutoSkip') {
      // Update auto-skip setting
      window.ytAdSkipAutoSkip = request.enabled;
      console.log('Auto-skip set to:', window.ytAdSkipAutoSkip);
      
      // Save to storage for persistence
      chrome.storage.sync.set({ autoSkipEnabled: window.ytAdSkipAutoSkip });
    } else if (request.action === 'setAdSegments') {
      // Update ad segments
      adSegments = request.segments || [];
      console.log('Ad segments updated:', adSegments);
    }
  });

  // Monitor URL changes to detect navigation between videos
  let lastCheckedPath = window.location.href;
  
  // Set up an interval to check for URL changes
  const urlCheckInterval = setInterval(() => {
    const currentPath = window.location.href;
    
    // If URL has changed
    if (currentPath !== lastCheckedPath) {
      lastCheckedPath = currentPath;
      const newVideoId = getVideoIdFromURL(currentPath);
      
      // If we've navigated to a different video
      if (newVideoId !== currentVideoId) {
        console.log('Video changed from', currentVideoId, 'to', newVideoId);
        currentVideoId = newVideoId;
        
        // Clear existing markers since they're for the previous video
        clearAdMarkers();
        
        // Reset ad segments for the new video
        adSegments = [];
      }
    }
  }, 1000); // Check every second
  
  // Set up a mutation observer for SPA navigation (YouTube doesn't always refresh the page)
  const videoChangeMutationObserver = new MutationObserver((mutations) => {
    // Check if the URL has changed (YouTube uses History API)
    const currentHref = window.location.href;
    if (currentHref !== lastCheckedPath) {
      lastCheckedPath = currentHref;
      const newVideoId = getVideoIdFromURL(currentHref);
      
      if (newVideoId !== currentVideoId) {
        console.log('Video changed via SPA navigation from', currentVideoId, 'to', newVideoId);
        currentVideoId = newVideoId;
        
        // Clear existing markers
        clearAdMarkers();
        
        // Reset ad segments for the new video
        adSegments = [];
      }
    }
  });
  
  // Start observing changes to the document body for YouTube's SPA navigation
  videoChangeMutationObserver.observe(document.body, { 
    childList: true, 
    subtree: true 
  });

  // Add custom styles for the timeline markers, skip button, and notification
  if (!document.querySelector('style[data-yt-adskip]')) {
    const styleEl = document.createElement('style');
    styleEl.setAttribute('data-yt-adskip', 'true');
    styleEl.textContent = `
      .yt-adskip-marker {
        position: absolute;
        background-color: rgba(255, 0, 0, 0.5);
        pointer-events: none;
        height: 100%;
      }

      .yt-adskip-marker:hover {
        background-color: rgba(255, 0, 0, 0.7);
      }

      .yt-adskip-button {
        position: absolute;
        bottom: 60px;
        right: 20px;
        background-color: rgba(0, 0, 0, 0.7);
        color: white;
        border: none;
        padding: 10px 20px;
        cursor: pointer;
        z-index: 2147483647;
        border-radius: 4px;
        font-family: "YouTube Noto", Roboto, Arial, Helvetica, sans-serif;
        font-size: 14px;
        transition: background-color 0.2s;
        display: none;
      }

      .yt-adskip-button:hover {
        background-color: rgba(0, 0, 0, 0.9);
      }
      
      .yt-adskip-notification {
        position: absolute;
        top: 60px;
        right: 20px;
        background-color: rgba(0, 0, 0, 0.7);
        color: white;
        padding: 10px 20px;
        border-radius: 4px;
        font-family: "YouTube Noto", Roboto, Arial, Helvetica, sans-serif;
        font-size: 14px;
        opacity: 0;
        transition: opacity 0.3s;
        z-index: 2147483647;
      }
      
      .yt-adskip-notification.show {
        opacity: 1;
      }
    `;
    document.head.appendChild(styleEl);
    console.log('YT AdSkip styles injected');
  }
  
  // Create a notification element for auto-skip
  const createNotification = () => {
    let notification = document.querySelector('.yt-adskip-notification');
    if (!notification) {
      notification = document.createElement('div');
      notification.className = 'yt-adskip-notification';
      notification.textContent = 'Ad segment skipped';
      
      const player = document.querySelector('.html5-video-player');
      if (player) {
        player.appendChild(notification);
      }
    }
    return notification;
  };
  
  // Show notification temporarily
  const showNotification = () => {
    const notification = createNotification();
    notification.classList.add('show');
    
    // Hide after 2 seconds
    setTimeout(() => {
      notification.classList.remove('show');
    }, 2000);
  };
  
  // Monitor video time to auto-skip ad segments when enabled
  const setupAutoSkip = () => {
    const video = document.querySelector('video');
    if (!video) return;
    
    // Track when we last skipped to avoid repeated skips
    let lastSkipTime = 0;
    
    // Listen for settings changes from the popup
    document.addEventListener('yt-adskip-settings-changed', (event) => {
      if (event.detail && typeof event.detail.autoSkip === 'boolean') {
        window.ytAdSkipAutoSkip = event.detail.autoSkip;
        console.log('Auto-skip setting updated:', window.ytAdSkipAutoSkip);
      }
    });
    
    // Set up a less intensive checking interval (once per second)
    const checkInterval = setInterval(() => {
      if (!video) {
        clearInterval(checkInterval);
        return;
      }
      
      const currentTime = video.currentTime;
      
      // Find if we're in an ad segment
      const activeSegment = adSegments.find(
        segment => currentTime >= segment.start && currentTime < segment.end
      );
      
      // If in ad segment and auto-skip is enabled
      if (activeSegment && window.ytAdSkipAutoSkip) {
        // Don't skip too frequently (once per 2 seconds)
        const now = Date.now();
        if (now - lastSkipTime > 2000) {
          lastSkipTime = now;
          
          // Skip to end of segment
          video.currentTime = activeSegment.end;
          
          // Show notification
          showNotification();
          
          console.log('Auto-skipped ad segment:', activeSegment);
        }
      }
    }, 1000);
    
    // Clean up on unload
    window.addEventListener('beforeunload', () => {
      clearInterval(checkInterval);
      clearInterval(urlCheckInterval);
    });
  };
  
  // Set up auto-skip when video is ready
  const videoSetupCheck = setInterval(() => {
    const video = document.querySelector('video');
    if (video) {
      clearInterval(videoSetupCheck);
      setupAutoSkip();
    }
  }, 1000);

  // Global cleanup on page unload
  window.addEventListener('beforeunload', () => {
    clearInterval(urlCheckInterval);
    clearInterval(videoSetupCheck);
    videoChangeMutationObserver.disconnect();
  });

  console.log('YT AdSkip content script loaded with auto-skip support');
})(); 