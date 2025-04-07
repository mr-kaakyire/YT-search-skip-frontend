import React, { useState, useEffect } from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import FormControlLabel from '@mui/material/FormControlLabel';
import Switch from '@mui/material/Switch';
import { SearchResults } from './components/SearchResults';
import { SearchBar } from './components/SearchBar';
import { AdMarker } from './components/AdMarker';
import { useVideoData } from './utils/useVideoData';
import { useThemeDetector } from './utils/useThemeDetector';
import { AdSegment } from './utils/useVideoData';

// Add global declarations
declare global {
  interface Window {
    adSkipObserver?: MutationObserver;
    ytAdSkipSetup?: boolean;
    ytAdSkipContentLoaded?: boolean;
    ytAdSkipAutoSkip?: boolean;
  }
}

// Custom event interface for type safety
interface RefreshEvent extends CustomEvent {
  detail: any;
}

const App: React.FC = () => {
  const [videoId, setVideoId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [autoSkip, setAutoSkip] = useState<boolean>(false);
  const isYouTubeDark = useThemeDetector();
  
  const theme = createTheme({
    palette: {
      mode: isYouTubeDark ? 'dark' : 'light',
      primary: {
        main: '#ff0000', // YouTube red
      },
      background: {
        default: isYouTubeDark ? '#0f0f0f' : '#ffffff',
        paper: isYouTubeDark ? '#272727' : '#ffffff',
      },
    },
  });

  const {
    data,
    loading,
    error,
    fetchData
  } = useVideoData();

  useEffect(() => {
    // Get current tab's URL to extract video ID
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const url = tabs[0]?.url || '';
      const urlParams = new URLSearchParams(new URL(url).search);
      const id = urlParams.get('v');
      if (id) {
        setVideoId(id);
        fetchData(id);
      }
    });
  }, [fetchData]);

  // Load saved auto-skip setting on component mount
  useEffect(() => {
    chrome.storage.sync.get(['autoSkipEnabled'], (result) => {
      if (result.autoSkipEnabled !== undefined) {
        setAutoSkip(!!result.autoSkipEnabled);
      }
    });
  }, []);

  // Save auto-skip setting when it changes
  useEffect(() => {
    chrome.storage.sync.set({ autoSkipEnabled: autoSkip });
  }, [autoSkip]);

  // Update auto-skip setting in content script when changed
  useEffect(() => {
    if (videoId) {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const tabId = tabs[0]?.id;
        if (tabId) {
          chrome.scripting.executeScript({
            target: { tabId },
            func: (shouldAutoSkip: boolean) => {
              window.ytAdSkipAutoSkip = shouldAutoSkip;
              
              // Dispatch an event to notify any existing listeners
              const event = new CustomEvent('yt-adskip-settings-changed', { 
                detail: { autoSkip: shouldAutoSkip } 
              });
              document.dispatchEvent(event);
            },
            args: [autoSkip]
          });
        }
      });
    }
  }, [autoSkip, videoId]);

  useEffect(() => {
    if (videoId) {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const tabId = tabs[0]?.id;
        if (tabId) {
          // First inject the content script
          chrome.scripting.executeScript({
            target: { tabId },
            files: ['content.js']
          }).then(() => {
            // Then send the auto-skip setting to the content script
            chrome.tabs.sendMessage(tabId, {
              action: 'setAutoSkip',
              enabled: autoSkip
            });
          });
        }
      });
    }
  }, [autoSkip, videoId]);

  useEffect(() => {
    if (data?.adSegments && data.adSegments.length > 0) {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const tabId = tabs[0]?.id;
        if (tabId) {
          // First inject the content script
          chrome.scripting.executeScript({
            target: { tabId },
            files: ['content.js']
          }).then(() => {
            // Send ad segments to content script
            chrome.tabs.sendMessage(tabId, {
              action: 'setAdSegments',
              segments: data.adSegments
            });
            
            // Then inject the markers script with the ad segments data
            chrome.scripting.executeScript({
              target: { tabId },
              func: (segments: AdSegment[], shouldAutoSkip: boolean) => {
                // Set auto-skip setting
                window.ytAdSkipAutoSkip = shouldAutoSkip;
                
                // Function to inject markers - keep it super lightweight
                const injectMarkers = () => {
                  // Only run when needed elements are available
                  const markersContainer = document.querySelector('.ytp-timed-markers-container');
                  const progressBar = document.querySelector('.ytp-progress-bar');
                  if (!markersContainer || !progressBar) return;
                  
                  // Clean up existing markers
                  document.querySelectorAll('.yt-adskip-marker').forEach(m => m.remove());
                  
                  // Get video duration
                  const duration = Number(progressBar.getAttribute('aria-valuemax')) || 0;
                  if (!duration) return;
                  
                  // Create markers efficiently with document fragment
                  const fragment = document.createDocumentFragment();
                  
                  // Create markers
                  segments.forEach((segment: AdSegment) => {
                    const marker = document.createElement('div');
                    marker.className = 'yt-adskip-marker';
                    
                    // Calculate position
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
                      pointerEvents: 'none'
                    });
                    
                    fragment.appendChild(marker);
                  });
                  
                  // Add all markers at once
                  markersContainer.appendChild(fragment);
                };
                
                // Setup skip button (only once)
                const setupSkipButton = () => {
                  // Skip if already exists
                  if (document.querySelector('.yt-adskip-button')) return null;
                  
                  const skipButton = document.createElement('button');
                  skipButton.className = 'yt-adskip-button ytp-button';
                  skipButton.textContent = 'Skip Ad Section';
                  
                  // Add to player
                  const player = document.querySelector('.html5-video-player');
                  if (!player) return null;
                  player.appendChild(skipButton);
                  
                  // Lightweight check function that runs infrequently
                  const video = document.querySelector('video');
                  if (!video) return null;
                  
                  // Using a much less frequent approach to reduce CPU usage
                  let timeoutId: number | null = null;
                  
                  const checkAdSegment = () => {
                    const currentTime = video.currentTime;
                    const activeSegment = segments.find(
                      (segment: AdSegment) => currentTime >= segment.start && currentTime < segment.end
                    );

                    if (activeSegment) {
                      // Get the latest auto-skip setting
                      const currentAutoSkip = window.ytAdSkipAutoSkip;
                      
                      // If auto-skip is enabled, skip immediately
                      if (currentAutoSkip) {
                        video.currentTime = activeSegment.end;
                        skipButton.style.display = 'none';
                      } else {
                        skipButton.style.display = 'block';
                        skipButton.onclick = () => {
                          video.currentTime = activeSegment.end;
                          skipButton.style.display = 'none';
                        };
                      }
                    } else {
                      skipButton.style.display = 'none';
                    }
                    
                    // Check again after 1 second
                    timeoutId = window.setTimeout(checkAdSegment, 1000);
                  };
                  
                  // Start checking
                  timeoutId = window.setTimeout(checkAdSegment, 1000);
                  
                  // Listen for setting changes
                  document.addEventListener('yt-adskip-settings-changed', () => {
                    // Force immediate check after settings change
                    if (timeoutId) {
                      window.clearTimeout(timeoutId);
                      timeoutId = window.setTimeout(checkAdSegment, 0);
                    }
                  });
                  
                  // Return cleanup function
                  return () => {
                    if (timeoutId) window.clearTimeout(timeoutId);
                    if (skipButton) skipButton.remove();
                  };
                };
                
                // Initial one-time setup
                injectMarkers();
                const cleanup = setupSkipButton();
                
                // Light observer - only observes relevant elements 
                const setupObserver = () => {
                  if (window.adSkipObserver) return;
                  
                  // Find containers
                  const progressBar = document.querySelector('.ytp-progress-bar');
                  if (!progressBar) return;
                  
                  // Only observe the progress bar
                  window.adSkipObserver = new MutationObserver(() => {
                    // Avoid excessive redraws by using setTimeout
                    window.setTimeout(injectMarkers, 200);
                  });
                  
                  // Very limited observer scope
                  window.adSkipObserver.observe(progressBar, {
                    attributes: true,
                    attributeFilter: ['aria-valuemax', 'aria-valuenow']
                  });
                };
                
                // Setup observer
                setupObserver();
                
                // Clean up when page unloads
                window.addEventListener('beforeunload', () => {
                  if (window.adSkipObserver) {
                    window.adSkipObserver.disconnect();
                    window.adSkipObserver = undefined;
                  }
                  if (cleanup) cleanup();
                });
              },
              args: [data.adSegments, autoSkip]
            });
          });
        }
      });
    }
  }, [data?.adSegments, autoSkip]);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  const handleTimestampClick = (timestamp: number) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tabId = tabs[0]?.id;
      if (tabId) {
        chrome.scripting.executeScript({
          target: { tabId },
          func: (time) => {
            const video = document.querySelector('video');
            if (video) {
              video.currentTime = time;
              video.play();
            }
          },
          args: [timestamp]
        });
      }
    });
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ 
        width: 400, 
        minHeight: 500,
        p: 2,
        display: 'flex',
        flexDirection: 'column',
        gap: 2
      }}>
        <SearchBar 
          onSearch={handleSearch}
          disabled={loading || !videoId}
        />
        
        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        )}

        {error && (
          <Alert severity="error">
            {error}
          </Alert>
        )}

        {data && (
          <>
            {data.adSegments && data.adSegments.length > 0 && (
              <>
                <FormControlLabel
                  control={
                    <Switch 
                      checked={autoSkip}
                      onChange={(e) => {
                        const newValue = e.target.checked;
                        setAutoSkip(newValue);
                        
                        // Immediately notify content script about the change
                        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                          const tabId = tabs[0]?.id;
                          if (tabId) {
                            chrome.tabs.sendMessage(tabId, {
                              action: 'setAutoSkip',
                              enabled: newValue
                            });
                          }
                        });
                      }}
                      color="error"
                    />
                  }
                  label="Auto-skip ad segments"
                  sx={{ 
                    mb: 1,
                    '& .MuiFormControlLabel-label': {
                      fontSize: '0.875rem'
                    }
                  }}
                />
                <AdMarker 
                  adSegments={data.adSegments}
                  onTimestampClick={handleTimestampClick}
                />
              </>
            )}
            
            <SearchResults 
              transcript={data.transcript}
              searchQuery={searchQuery}
              onTimestampClick={handleTimestampClick}
            />
          </>
        )}
      </Box>
    </ThemeProvider>
  );
};

export default App; 