import React, { useState, useEffect } from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import { SearchResults } from './components/SearchResults';
import { SearchBar } from './components/SearchBar';
import { AdMarker } from './components/AdMarker';
import { TimelineMarker } from './components/TimelineMarker';
import { useVideoData } from './utils/useVideoData';
import { useThemeDetector } from './utils/useThemeDetector';

const App: React.FC = () => {
  const [videoId, setVideoId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
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
  }, []);

  useEffect(() => {
    if (data?.adSegments) {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const tabId = tabs[0]?.id;
        if (tabId) {
          chrome.scripting.executeScript({
            target: { tabId },
            files: ['content.js']
          });
        }
      });
    }
  }, [data?.adSegments]);

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
                <TimelineMarker adSegments={data.adSegments} />
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