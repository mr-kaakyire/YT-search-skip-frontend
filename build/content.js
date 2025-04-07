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