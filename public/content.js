(function() {
  // If script has already run, do nothing
  if (window.ytAdSkipContentLoaded) {
    console.log('YT AdSkip content script already loaded');
    return;
  }
  
  // Mark as loaded
  window.ytAdSkipContentLoaded = true;
  
  // Listen for messages from the extension popup
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'seekTo') {
      const video = document.querySelector('video');
      if (video) {
        video.currentTime = request.time;
        video.play();
      }
    }
  });

  // Add custom styles for the timeline markers and skip button - only if not already present
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
    `;
    document.head.appendChild(styleEl);
    console.log('YT AdSkip styles injected');
  }

  console.log('YT AdSkip content script loaded');
})(); 