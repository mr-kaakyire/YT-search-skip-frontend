// Store video data
let currentVideoData = {
  videoId: null,
  transcript: null,
  adSegments: null
};

// Function that will be injected to highlight ad segments
const highlightAdSegments = (adSegments) => {
  // Find the progress bar
  const progressBar = document.querySelector('.ytp-progress-bar');
  if (!progressBar) return false;

  // Get video duration
  const video = document.querySelector('video');
  if (!video) return false;

  const duration = video.duration;
  if (!duration) return false;

  // Remove existing highlights
  const existingHighlights = document.querySelectorAll('.ad-segment-highlight');
  existingHighlights.forEach(el => el.remove());

  // Create highlights for each ad segment
  adSegments.forEach(segment => {
    const startPercent = (segment.start / duration) * 100;
    const endPercent = (segment.end / duration) * 100;
    
    const highlight = document.createElement('div');
    highlight.className = 'ad-segment-highlight';
    highlight.style.cssText = `
      position: absolute;
      height: 100%;
      background-color: rgba(255, 255, 0, 0.5);
      pointer-events: none;
      z-index: 1;
      left: ${startPercent}%;
      width: ${endPercent - startPercent}%;
    `;
    
    progressBar.appendChild(highlight);
  });

  return true;
};

// Function to seek to specific time
const skipToTimeFunction = (time) => {
  const video = document.querySelector('video');
  if (!video) return false;

  try {
    video.currentTime = time;
    return true;
  } catch (error) {
    console.error('Error seeking to time:', error);
    return false;
  }
};

// Function to fetch video data
async function fetchVideoData(videoId) {
  try {
    console.log('Fetching data for video:', videoId);
    const response = await fetch('http://localhost:3000/analyze-video', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        videoUrl: `https://www.youtube.com/watch?v=${videoId}` 
      })
    });

    if (!response.ok) throw new Error('Failed to fetch video data');
    
    const data = await response.json();
    console.log('Received from backend:', {
      firstTranscriptItem: data.transcript[0],
      transcriptLength: data.transcript.length,
      adSegments: data.adSegments
    });
    
    currentVideoData = {
      videoId,
      transcript: data.transcript,
      adSegments: data.adSegments
    };

    console.log('Stored in currentVideoData:', {
      firstTranscriptItem: currentVideoData.transcript[0],
      transcriptLength: currentVideoData.transcript.length,
      adSegments: currentVideoData.adSegments
    });

    // Send message to content script to highlight ad segments
    chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
      if (!tabs[0]?.id) return;
      
      try {
        console.log('Sending to content script:', currentVideoData);
        await chrome.tabs.sendMessage(tabs[0].id, {
          action: 'toggleSearch',
          videoData: currentVideoData
        });
      } catch (error) {
        console.error('Failed to send data to content script:', error);
      }
    });

    return data;
  } catch (error) {
    console.error('Error fetching video data:', error);
    return null;
  }
}

// Function to extract video ID from URL
function getVideoId(url) {
  try {
    const urlObj = new URL(url);
    return urlObj.searchParams.get('v');
  } catch {
    return null;
  }
}

// Listen for installation
chrome.runtime.onInstalled.addListener(() => {
  console.log('Extension installed');
});

// Listen for tab updates
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url?.includes('youtube.com/watch')) {
    const videoId = getVideoId(tab.url);
    if (videoId && videoId !== currentVideoData.videoId) {
      fetchVideoData(videoId);
    }
  }
});

// Listen for messages
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Background received message:', request);

  if (request.action === 'getVideoData') {
    sendResponse(currentVideoData);
    return false;
  }
  
  if (request.action === 'initializeVideo') {
    const videoId = request.videoId;
    if (videoId && videoId !== currentVideoData.videoId) {
      console.log('Initializing video:', videoId);
      fetchVideoData(videoId);
    }
    return false;
  }
  
  if (request.action === 'skipToTime') {
    chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
      if (!tabs[0]?.id) {
        sendResponse({ success: false, error: 'No active tab found' });
        return;
      }

      try {
        const results = await chrome.scripting.executeScript({
          target: { tabId: tabs[0].id },
          func: skipToTimeFunction,
          args: [request.time]
        });

        sendResponse({ success: results[0]?.result || false });
      } catch (error) {
        console.error('Script execution error:', error);
        sendResponse({ 
          success: false, 
          error: error.message || 'Failed to execute script'
        });
      }
    });
    return true;
  }
});

// Listen for keyboard shortcuts
chrome.commands.onCommand.addListener((command) => {
  if (command === 'toggle_search') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs[0]?.id) return;
      
      chrome.tabs.sendMessage(tabs[0].id, {
        action: 'toggleSearch',
        videoData: currentVideoData
      });
    });
  }
});
