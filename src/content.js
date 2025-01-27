// Function to find and control YouTube video player
const findVideoPlayer = () => {
  // Try different selectors that might contain the video player
  const selectors = [
    'video.html5-main-video',
    'video.video-stream',
    'video#movie_player',
    'video'
  ];

  for (const selector of selectors) {
    const video = document.querySelector(selector);
    if (video) return video;
  }
  return null;
};

// Function to seek to specific time
const seekToTime = (time) => {
  const video = findVideoPlayer();
  if (!video) {
    console.error('YouTube video player not found');
    return false;
  }

  try {
    // Ensure time is a valid number
    const seekTime = parseFloat(time);
    if (isNaN(seekTime)) {
      console.error('Invalid time value:', time);
      return false;
    }

    // Ensure time is within video bounds
    if (seekTime < 0 || seekTime > video.duration) {
      console.error('Time out of bounds:', seekTime);
      return false;
    }

    // Set the current time
    video.currentTime = seekTime;
    return true;
  } catch (error) {
    console.error('Error seeking to time:', error);
    return false;
  }
};

// Listen for messages from the extension popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Received message:', request);

  if (request.action === 'getVideoInfo') {
    const videoUrl = window.location.href;
    sendResponse({ videoUrl });
  } 
  else if (request.action === 'skipToTime') {
    const success = seekToTime(request.time);
    sendResponse({ success });
  }
  
  // Return true to indicate we'll send a response asynchronously
  return true;
});
