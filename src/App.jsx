import { useState, useEffect } from 'react'
import './App.css'

function App() {
  const [videoUrl, setVideoUrl] = useState('');
  const [videoId, setVideoId] = useState('');
  const [adSegments, setAdSegments] = useState([]);
  const [transcript, setTranscript] = useState([]);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Function to highlight segments on the timeline
  const highlightSegments = (segments, color) => {
    console.log('Highlighting segments:', segments);
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs[0]?.id) {
        console.error('No active tab found');
        return;
      }
      
      chrome.tabs.sendMessage(
        tabs[0].id,
        { 
          action: 'highlightTimeline',
          data: { segments, color }
        },
        (response) => {
          if (chrome.runtime.lastError) {
            console.error('Error highlighting timeline:', chrome.runtime.lastError);
          } else {
            console.log('Highlight response:', response);
          }
        }
      );
    });
  };

  // Function to check cache and load data
  const loadFromCache = async (videoId) => {
    try {
      const result = await chrome.storage.local.get(videoId);
      if (result[videoId]) {
        const cachedData = result[videoId];
        const cacheAge = Date.now() - cachedData.timestamp;
        
        // Cache is valid for 24 hours
        if (cacheAge < 24 * 60 * 60 * 1000) {
          console.log('Using cached data for video:', videoId);
          setAdSegments(cachedData.data.adSegments || []);
          setTranscript(cachedData.data.transcript || []);
          return true;
        } else {
          console.log('Cache expired for video:', videoId);
          await chrome.storage.local.remove(videoId);
        }
      }
    } catch (error) {
      console.error('Error loading from cache:', error);
    }
    return false;
  };

  // Effect to initialize extension and load data
  useEffect(() => {
    const initializeExtension = async () => {
      try {
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        const currentUrl = tabs[0]?.url;
        
        if (currentUrl?.includes('youtube.com/watch')) {
          const urlObj = new URL(currentUrl);
          const newVideoId = urlObj.searchParams.get('v');
          
          if (newVideoId) {
            setVideoUrl(currentUrl);
            setVideoId(newVideoId);
            
            // Try to load from cache first
            const hasCachedData = await loadFromCache(newVideoId);
            
            // If no cache or expired, fetch new data
            if (!hasCachedData) {
              console.log('Fetching new data for video:', newVideoId);
              fetchVideoData(currentUrl);
            }
          }
        }
      } catch (error) {
        console.error('Error initializing extension:', error);
        setError('Failed to initialize extension');
      }
    };

    initializeExtension();
  }, []); // Only run when extension opens

  const fetchVideoData = async (url) => {
    try {
      setLoading(true);
      setError(null);
      console.log('Fetching video data:', url);
      
      const response = await fetch('http://localhost:3000/analyze-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoUrl: url })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to analyze video');
      }

      const data = await response.json();
      console.log('Analysis result:', data);
      
      // Cache the data
      const videoId = new URL(url).searchParams.get('v');
      await chrome.storage.local.set({
        [videoId]: {
          timestamp: Date.now(),
          data: data
        }
      });
      console.log('Cached data for video:', videoId);
      
      setAdSegments(data.adSegments || []);
      setTranscript(data.transcript || []);

      // Highlight ad segments in yellow immediately after fetching
      if (data.adSegments?.length > 0) {
        const formattedSegments = data.adSegments.map(segment => ({
          start: Number(segment.start),
          end: Number(segment.end)
        }));
        highlightSegments(formattedSegments, 'yellow');
      }
    } catch (error) {
      console.error('Error analyzing video:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const searchTranscript = (e) => {
    e.preventDefault();
    const keyword = searchKeyword.trim().toLowerCase();
    if (!keyword) return;
    
    try {
      setError(null);
      console.log('Searching locally for:', keyword);
      
      // Clear existing highlights first
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]?.id) {
          chrome.tabs.sendMessage(tabs[0].id, { action: 'clearHighlights' });
        }
      });
      
      // Perform local search on transcript
      const matches = transcript.filter(item => 
        item.text.toLowerCase().includes(keyword)
      );

      console.log('Found matches:', matches.length);
      setSearchResults(matches);

      // First highlight ad segments in yellow
      if (adSegments.length > 0) {
        const adHighlights = adSegments.map(segment => ({
          start: Number(segment.start),
          end: Number(segment.end)
        }));
        highlightSegments(adHighlights, 'yellow');
      }

      // Then highlight search results in purple
      if (matches.length > 0) {
        const searchSegments = matches.map(match => ({
          start: Number(match.offset),
          end: Number(match.offset + match.duration)
        }));
        highlightSegments(searchSegments, '#8A2BE2'); // Purple color
      }
    } catch (error) {
      console.error('Error searching transcript:', error);
      setError(error.message);
    }
  };

  const skipToTimestamp = (timestamp) => {
    console.log('Attempting to skip to timestamp:', timestamp);
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs[0]?.id) {
        console.error('No active tab found');
        setError('No active YouTube tab found');
        return;
      }

      chrome.tabs.sendMessage(
        tabs[0].id,
        { action: 'seekToTime', time: timestamp },
        (response) => {
          if (chrome.runtime.lastError) {
            console.error('Runtime error:', chrome.runtime.lastError);
            setError('Failed to communicate with YouTube page. Please refresh the page and try again.');
            return;
          }

          if (!response?.success) {
            console.error('Seek failed');
            setError('Failed to skip to timestamp. Please try again.');
          }
        }
      );
    });
  };

  return (
    <div className="container">
      <h2>YouTube Ad Skip & Search</h2>
      
      {loading && <div className="loading">Loading...</div>}
      {error && <div className="error">{error}</div>}
      
      {adSegments.length > 0 && (
        <div className="section">
          <h3>Ad Segments</h3>
          <ul>
            {adSegments.map((segment, index) => (
              <li key={index}>
                <button onClick={() => skipToTimestamp(segment.start)}>
                  Skip to {segment.start.toFixed(1)}s
                </button>
                <span>{segment.text}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      
      <div className="section">
        <h3>Search in Video</h3>
        <form onSubmit={searchTranscript} className="search-box">
          <input
            type="text"
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            placeholder="Enter keyword to search"
          />
          <button type="submit">Search</button>
        </form>
        
        {searchResults.length > 0 && (
          <ul>
            {searchResults.map((result, index) => (
              <li key={index}>
                <button onClick={() => skipToTimestamp(result.offset)}>
                  Skip to {result.offset.toFixed(1)}s
                </button>
                <span>{result.text}</span>
              </li>
            ))}
          </ul>
        )}

        {searchKeyword && searchResults.length === 0 && (
          <div className="no-results">No matches found for "{searchKeyword}"</div>
        )}
      </div>
    </div>
  );
}

export default App
