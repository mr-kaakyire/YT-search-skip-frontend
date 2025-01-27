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

  useEffect(() => {
    // Get current tab's URL when popup opens
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const currentUrl = tabs[0]?.url;
      if (currentUrl?.includes('youtube.com/watch')) {
        const urlObj = new URL(currentUrl);
        const newVideoId = urlObj.searchParams.get('v');
        
        // Only fetch transcript if video ID has changed
        if (newVideoId && newVideoId !== videoId) {
          setVideoUrl(currentUrl);
          setVideoId(newVideoId);
          fetchVideoData(currentUrl);
        }
      }
    });
  }, [videoId]); // Only re-run if videoId changes

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
      setAdSegments(data.adSegments || []);
      setTranscript(data.transcript || []); // Store transcript locally
    } catch (error) {
      console.error('Error analyzing video:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const searchTranscript = (e) => {
    e.preventDefault();
    const keyword = searchKeyword.trim();
    if (!keyword) return;
    
    try {
      setError(null);
      console.log('Searching locally for:', keyword);
      
      // Perform local search on transcript
      const matches = transcript.filter(item => 
        item.text.toLowerCase().includes(keyword.toLowerCase())
      );

      console.log('Found matches:', matches.length);
      setSearchResults(matches);
    } catch (error) {
      console.error('Error searching transcript:', error);
      setError(error.message);
    }
  };

  const skipToTimestamp = (timestamp) => {
    try {
      chrome.runtime.sendMessage(
        {
          action: 'skipToTime',
          time: timestamp
        },
        (response) => {
          if (chrome.runtime.lastError) {
            console.error('Error:', chrome.runtime.lastError);
            setError('Failed to communicate with YouTube page. Please refresh the page and try again.');
            return;
          }

          if (!response?.success) {
            setError(response?.error || 'Failed to skip to timestamp. Please try again.');
          }
        }
      );
    } catch (error) {
      console.error('Error skipping to timestamp:', error);
      setError('An error occurred while trying to skip. Please try again.');
    }
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
