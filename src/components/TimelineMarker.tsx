import { useEffect } from 'react';
import { AdSegment } from '../utils/useVideoData';

interface TimelineMarkerProps {
  adSegments: AdSegment[];
}

export const TimelineMarker = ({ adSegments }: TimelineMarkerProps) => {
  useEffect(() => {
    const injectTimelineMarkers = () => {
      // Find the YouTube timeline container
      const timeline = document.querySelector('.ytp-timed-markers-container');
      if (!timeline) return;

      // Clear any existing markers
      const existingMarkers = document.querySelectorAll('.yt-adskip-marker');
      existingMarkers.forEach(marker => marker.remove());

      // Get video duration
      const video = document.querySelector('video');
      if (!video) return;
      const duration = video.duration;

      // Create markers for each ad segment
      adSegments.forEach(segment => {
        const marker = document.createElement('div');
        marker.className = 'yt-adskip-marker';
        
        // Calculate position and width
        const startPercent = (segment.start / duration) * 100;
        const endPercent = (segment.end / duration) * 100;
        const width = endPercent - startPercent;
        
        // Style the marker
        Object.assign(marker.style, {
          position: 'absolute',
          left: `${startPercent}%`,
          width: `${width}%`,
          height: '100%',
          backgroundColor: 'rgba(255, 0, 0, 0.5)',
          pointerEvents: 'none',
          zIndex: '1'
        });
        
        timeline.appendChild(marker);
      });
    };

    const setupSkipButton = () => {
      // Remove any existing skip buttons
      const existingButton = document.querySelector('.yt-adskip-button');
      if (existingButton) existingButton.remove();

      // Create skip button (hidden by default)
      const skipButton = document.createElement('button');
      skipButton.className = 'yt-adskip-button ytp-button';
      skipButton.textContent = 'Skip Ad Section';
      skipButton.style.display = 'none';
      
      // Style the button
      Object.assign(skipButton.style, {
        position: 'absolute',
        bottom: '60px',
        right: '20px',
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        color: 'white',
        border: 'none',
        padding: '10px 20px',
        cursor: 'pointer',
        zIndex: '2147483647',
        borderRadius: '4px'
      });

      // Add to player
      const player = document.querySelector('.html5-video-player');
      if (player) player.appendChild(skipButton);

      // Monitor video time and show/hide skip button
      const video = document.querySelector('video');
      if (!video) return;

      const checkAdSegment = () => {
        const currentTime = video.currentTime;
        const activeSegment = adSegments.find(
          segment => currentTime >= segment.start && currentTime < segment.end
        );

        if (activeSegment) {
          skipButton.style.display = 'block';
          skipButton.onclick = () => {
            video.currentTime = activeSegment.end;
            skipButton.style.display = 'none';
          };
        } else {
          skipButton.style.display = 'none';
        }
      };

      video.addEventListener('timeupdate', checkAdSegment);
    };

    // Initial setup
    injectTimelineMarkers();
    setupSkipButton();

    // Re-run setup when navigating to a new video
    const observer = new MutationObserver(() => {
      injectTimelineMarkers();
      setupSkipButton();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    return () => {
      observer.disconnect();
      const video = document.querySelector('video');
      if (video) {
        video.removeEventListener('timeupdate', () => {});
      }
    };
  }, [adSegments]);

  return null;
}; 