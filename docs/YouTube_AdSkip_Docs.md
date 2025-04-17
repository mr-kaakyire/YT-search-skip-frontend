# YouTube Ad Skip Extension: Technical Documentation

## Table of Contents

1. [Overview](#overview)
2. [Technical Architecture](#technical-architecture)
3. [Extension Anatomy](#extension-anatomy)
4. [Frontend Implementation](#frontend-implementation)
5. [Backend Implementation](#backend-implementation)
6. [Ad Detection Logic](#ad-detection-logic)
7. [Testing & Debugging](#testing-debugging)
8. [Packaging & Deployment](#packaging-deployment)
9. [Optimization Techniques](#optimization-techniques)
10. [Future Enhancements](#future-enhancements)

## 1. Overview <a name="overview"></a>

### Purpose and Features

The YouTube Ad Skip extension provides a seamless way for users to enhance their YouTube viewing experience by automatically detecting and skipping sponsored segments within videos. The extension works by analyzing video transcripts to identify promotional content and offers a rich set of features:

- **Transcript Search**: Search through video transcripts to find specific moments or topics
- **Ad Segment Detection**: AI-powered identification of sponsored segments in videos
- **Visual Timeline Markers**: Red markers on YouTube's progress bar showing ad segments
- **Manual Skip Controls**: One-click buttons to jump past sponsored content
- **Auto-Skip Toggle**: Option to automatically skip detected ad segments
- **Collapsible UI Panels**: User-friendly interface with collapsible sections
- **Theme Integration**: Adapts to YouTube's light/dark mode for seamless integration
- **Keyboard Shortcut**: Quick access via Ctrl+Q (or Cmd+Q on Mac)
- **Persistent Settings**: User preferences saved between sessions

### Technology Stack

| Component | Technologies |
|-----------|--------------|
| **Frontend** | React, TypeScript, Material UI |
| **Browser Extension** | Chrome Extension API (Manifest V3) |
| **Backend** | Node.js, Express.js |
| **AI/ML** | Google Gemini 2.0 Flash (for ad detection) |
| **APIs** | YouTube Transcript API |
| **State Management** | React Hooks |
| **Styling** | Material UI, CSS-in-JS |
| **Build Tools** | Webpack, Create React App |
| **Storage** | Chrome Storage API, In-memory cache |

## 2. Technical Architecture <a name="technical-architecture"></a>

### High-Level System Design

The YouTube Ad Skip extension follows a client-server architecture with clear separation of concerns:

```
┌─────────────────────────────────────────┐     ┌────────────────────────────┐
│          Browser Extension              │     │         Backend Server      │
│                                         │     │                            │
│  ┌─────────────┐      ┌──────────────┐  │     │  ┌─────────────────────┐  │
│  │   Popup UI  │──────│  Extension   │  │     │  │                     │  │
│  │  (React App)│      │   Storage    │  │     │  │    Express.js API   │  │
│  └─────────────┘      └──────────────┘  │     │  │                     │  │
│         │                               │     │            │              │
│         │                               │     │            │              │
│         ▼                               │     │            ▼              │
│  ┌─────────────┐      ┌──────────────┐  │     │            ▼              │
│  │   Content   │◄─────│  Chrome API  │  │     │  ┌─────────────────────┐  │
│  │   Scripts   │─────►│  Messaging   │  │     │  │   YouTube Transcript│  │
│  └─────────────┘      └──────────────┘  │     │  │        API          │  │
│         │                    ▲          │     │  └─────────────────────┘  │
│         ▼                    │          │     │            │              │
│  ┌─────────────┐             │          │ API │            ▼              │
│  │  YouTube    │             │          │ Call│  ┌─────────────────────┐  │
│  │  DOM        │◄────────────┘          │◄────┼─►│   Google Gemini AI  │  │
│  │  Manipulation│                        │     │  │       API           │  │
│  └─────────────┘                        │     │  └─────────────────────┘  │
└─────────────────────────────────────────┘     └────────────────────────────┘
```

### Data Flow Sequence

1. **Extension Activation**:
   - User opens YouTube and navigates to a video
   - User activates extension via the popup icon or Ctrl+Q shortcut

2. **Data Retrieval**:
   - Extension extracts current video ID from URL
   - Extension checks local cache for existing data
   - If not cached, extension makes API call to backend

3. **Backend Processing**:
   - Backend fetches video transcript using YouTube Transcript API
   - Transcript is analyzed with Google Gemini AI to detect ad segments
   - Results are formatted and returned to extension

4. **User Interface Rendering**:
   - Extension displays transcript and detected ad segments
   - Timeline markers are injected into YouTube's progress bar
   - Content script monitors video playback

5. **Ad Skipping Logic**:
   - If auto-skip is enabled, content script monitors current playback time
   - When an ad segment is detected, video is advanced to end of segment
   - Notification shown to user when ad is skipped
   - If auto-skip is disabled, skip button is displayed for manual action

6. **Persistence**:
   - User preferences (e.g., auto-skip setting) saved to Chrome storage
   - Analyzed video data cached for quick retrieval on subsequent visits

### Component Interaction

| Component | Communicates With | Method |
|-----------|-------------------|--------|
| Popup UI | Content Script | Chrome Messaging API |
| Popup UI | Backend Server | Fetch API (HTTP Requests) |
| Content Script | YouTube DOM | DOM Manipulation |
| Content Script | Extension Storage | Chrome Storage API |
| Background Service | Popup UI | Chrome Messaging API |
| Background Service | Content Script | Chrome Messaging API |

## 3. Extension Anatomy <a name="extension-anatomy"></a>

### Manifest Structure

The extension uses **Manifest V3**, the latest manifest version for Chrome extensions. This choice provides improved security, better performance, and follows Google's recommended practices.

```json
{
  "manifest_version": 3,
  "name": "YouTube Transcript Search & Ad Skip",
  "version": "1.0.0",
  "description": "Search through YouTube video transcripts and skip ads with ease",
  "permissions": [
    "activeTab",
    "scripting",
    "storage",
    "commands"
  ],
  "host_permissions": [
    "https://www.youtube.com/*"
  ],
  "action": {
    "default_popup": "index.html",
    "default_icon": "icon16.png"
  },
  "commands": {
    "_execute_action": {
      "suggested_key": {
        "windows": "Ctrl+Q",
        "mac": "Command+Q",
        "chromeos": "Ctrl+Q",
        "linux": "Ctrl+Q"
      },
      "description": "Open YT Ad Skip"
    }
  },
  "content_scripts": [
    {
      "matches": ["https://www.youtube.com/*"],
      "js": ["content.js"]
    }
  ],
  "icons": {
    "16": "icon16.png"
  }
}
```

Key elements in the manifest:

- **permissions**:
  - `activeTab`: Access the current tab without broad host permissions
  - `scripting`: Inject and execute scripts in web pages
  - `storage`: Store user preferences and cache data
  - `commands`: Register keyboard shortcuts

- **host_permissions**: Restricts the extension to only work on YouTube domains

- **action**: Defines the popup UI entry point

- **commands**: Sets up keyboard shortcuts for fast access

- **content_scripts**: Specifies scripts that run directly in the YouTube page context

### File Structure

The extension follows a modular organization pattern:

```
YT-adskip-extension/
├── public/
│   ├── manifest.json     # Extension manifest
│   ├── content.js        # Content script injected into YouTube
│   ├── icon16.png        # Extension icon
│   └── index.html        # HTML entry point
├── src/
│   ├── components/       # React UI components
│   │   ├── AdMarker.tsx      # Ad segments display component
│   │   ├── SearchBar.tsx     # Search input component
│   │   ├── SearchResults.tsx # Search results display
│   │   └── TimelineMarker.tsx # Timeline marker utilities
│   ├── utils/            # Utility functions
│   │   ├── cache.ts          # Caching implementation
│   │   ├── debounce.ts       # Debouncing utility
│   │   ├── formatTime.ts     # Time formatting helper
│   │   ├── useThemeDetector.ts # YouTube theme detection
│   │   └── useVideoData.ts   # Data fetching hook
│   ├── App.tsx           # Main application component
│   └── index.tsx         # React entry point
├── build/                # Compiled extension files
└── package.json          # Dependencies and scripts
```

### Key Components Explained

1. **Popup Interface (`App.tsx`)**:
   - The main React application that loads when users click the extension icon
   - Handles data fetching, UI rendering, and communication with content scripts
   - Manages state for search queries, auto-skip toggle, and theme detection

2. **Content Script (`content.js`)**:
   - Runs in the context of YouTube web pages
   - Injects UI elements like timeline markers and skip buttons
   - Monitors video playback and handles ad skipping logic
   - Communicates with the popup through Chrome messaging API

3. **Ad Detection Components**:
   - `AdMarker.tsx`: Displays detected ad segments with timestamps
   - `TimelineMarker.tsx`: Helper for visual timeline markers

4. **Search Components**:
   - `SearchBar.tsx`: Input field for searching through video transcripts
   - `SearchResults.tsx`: Displays search matches with context and timestamps

5. **Utility Modules**:
   - `useVideoData.ts`: Custom React hook for fetching and managing video data
   - `cache.ts`: Caching mechanism to avoid redundant API calls
   - `useThemeDetector.ts`: Detects YouTube's current theme for UI adaptation

### Permissions Rationale

| Permission | Usage | Justification |
|------------|-------|---------------|
| `activeTab` | Access current tab URL and content | Needed to get video ID and inject UI elements |
| `scripting` | Execute scripts in YouTube pages | Required for timeline markers and skip button functionality |
| `storage` | Save user preferences | Persists auto-skip setting between sessions |
| `commands` | Register keyboard shortcuts | Provides quick access via Ctrl+Q |
| Host permissions (YouTube only) | Restrict extension scope | Security best practice - limits access to only YouTube |

## 4. Frontend Implementation <a name="frontend-implementation"></a>

### React Application Structure

The extension's frontend is built using React with TypeScript, providing type safety and better developer experience. Material UI is used for consistent styling that adapts to YouTube's theming.

#### Core Components Breakdown

**1. Main App Component (`App.tsx`)**

This is the entry point of the React application that orchestrates all functionality:

```typescript
const App: React.FC = () => {
  const [videoId, setVideoId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [autoSkip, setAutoSkip] = useState<boolean>(false);
  const isYouTubeDark = useThemeDetector();
  
  // Theme creation based on YouTube's current theme
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

  // Data fetching hook
  const { data, loading, error, fetchData } = useVideoData();

  // Extract video ID from URL and fetch data
  useEffect(() => {
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

  // Load and save auto-skip setting
  useEffect(() => {
    chrome.storage.sync.get(['autoSkipEnabled'], (result) => {
      if (result.autoSkipEnabled !== undefined) {
        setAutoSkip(!!result.autoSkipEnabled);
      }
    });
  }, []);

  useEffect(() => {
    chrome.storage.sync.set({ autoSkipEnabled: autoSkip });
  }, [autoSkip]);

  // ... other effects and handlers ...

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ width: 400, minHeight: 500, p: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
        <SearchBar onSearch={handleSearch} disabled={loading || !videoId} />
        
        {loading && <CircularProgress />}
        {error && <Alert severity="error">{error}</Alert>}
        
        {data && (
          <>
            {data.adSegments && data.adSegments.length > 0 && (
              <>
                <FormControlLabel
                  control={<Switch checked={autoSkip} onChange={handleAutoSkipChange} color="error" />}
                  label="Auto-skip ad segments"
                />
                <AdMarker adSegments={data.adSegments} onTimestampClick={handleTimestampClick} />
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
```

**2. AdMarker Component (`AdMarker.tsx`)**

Displays detected ad segments in a collapsible UI:

```typescript
export const AdMarker: React.FC<AdMarkerProps> = ({ adSegments, onTimestampClick }) => {
  const [expanded, setExpanded] = useState(true);
  
  // Calculate total ad time
  const totalAdTime = useMemo(() => {
    return adSegments.reduce((total, segment) => {
      return total + (segment.end - segment.start);
    }, 0);
  }, [adSegments]);

  // Format total time as MM:SS
  const formattedTotalTime = formatTime(totalAdTime);
  
  return (
    <Paper elevation={0} sx={{...}}>
      <Box 
        sx={{...}} 
        onClick={() => setExpanded(!expanded)}
      >
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Typography variant="subtitle2" sx={{ mr: 1 }}>
            Ad Segments
          </Typography>
          <Badge 
            badgeContent={adSegments.length} 
            color="error"
          />
        </Box>
        <Tooltip title={`Total ad time: ${formattedTotalTime}`}>
          <Typography variant="caption" color="text.secondary">
            {formattedTotalTime}
          </Typography>
        </Tooltip>
        {expanded ? 
          <KeyboardArrowUpIcon fontSize="small" color="action" /> : 
          <KeyboardArrowDownIcon fontSize="small" color="action" />
        }
      </Box>
      
      <Collapse in={expanded} timeout="auto">
        <Divider />
        <List disablePadding>
          {adSegments.map((segment, index) => (
            <ListItem 
              key={index}
              divider={index !== adSegments.length - 1}
            >
              <ListItemText
                primary={segment.text}
                primaryTypographyProps={{
                  variant: 'body2',
                  noWrap: true,
                  style: { maxWidth: '230px' }
                }}
              />
              <Button
                size="small"
                variant="outlined"
                onClick={() => onTimestampClick(segment.start)}
                sx={{ mr: 1 }}
              >
                {formatTime(segment.start)}
              </Button>
              <Button
                size="small"
                variant="contained"
                color="error"
                onClick={() => onTimestampClick(segment.end)}
              >
                Skip
              </Button>
            </ListItem>
          ))}
        </List>
      </Collapse>
    </Paper>
  );
};
```

**3. SearchResults Component (`SearchResults.tsx`)**

Provides transcript search functionality with context highlighting:

```typescript
export const SearchResults: React.FC<SearchResultsProps> = ({
  transcript,
  searchQuery,
  onTimestampClick,
}) => {
  const [expanded, setExpanded] = useState(true);
  
  // Filter transcript segments based on search query
  const filteredResults = useMemo(() => {
    if (!searchQuery) return [];

    const query = searchQuery.toLowerCase();
    const results = [];
    const contextSize = 2; // Number of segments before and after for context

    transcript.forEach((segment, index) => {
      if (segment.text.toLowerCase().includes(query)) {
        // Get surrounding segments for context
        const start = Math.max(0, index - contextSize);
        const end = Math.min(transcript.length - 1, index + contextSize);
        
        const contextSegments = transcript.slice(start, end + 1);
        const context = contextSegments.map(s => s.text).join(' ');

        results.push({
          ...segment,
          context
        });
      }
    });

    return results;
  }, [transcript, searchQuery]);

  // Render search results with highlighting
  return (
    <Paper elevation={0} sx={{...}}>
      <Box onClick={() => setExpanded(!expanded)}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Typography variant="subtitle2" sx={{ mr: 1 }}>
            Search Results
          </Typography>
          <Badge badgeContent={filteredResults.length} color="primary" />
        </Box>
        {expanded ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
      </Box>
      
      <Collapse in={expanded} timeout="auto">
        <List>
          {filteredResults.map((result, index) => {
            const highlightedText = result.context.replace(
              new RegExp(searchQuery, 'gi'),
              match => `<mark>${match}</mark>`
            );

            return (
              <ListItem key={index}>
                <ListItemText
                  primary={<div dangerouslySetInnerHTML={{ __html: highlightedText }} />}
                  primaryTypographyProps={{
                    variant: 'body2',
                    sx: {
                      '& mark': {
                        bgcolor: 'warning.light',
                        color: 'warning.contrastText',
                      },
                    },
                  }}
                />
                <Button
                  size="small"
                  variant="text"
                  onClick={() => onTimestampClick(result.offset)}
                >
                  Jump to {formatTime(result.offset)}
                </Button>
              </ListItem>
            );
          })}
        </List>
        <Box sx={{...}}>
          <KeyboardIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
          <Typography variant="caption" color="text.secondary">
            Press <Box component="span" sx={{ fontWeight: 'bold' }}>Ctrl+Q</Box> to open extension
          </Typography>
        </Box>
      </Collapse>
    </Paper>
  );
};
```

### Custom Hooks

The extension uses several custom React hooks to encapsulate logic:

**1. useVideoData Hook (`useVideoData.ts`)**

Handles fetching video data from the backend API with built-in caching:

```typescript
export const useVideoData = (): UseVideoDataReturn => {
  const [data, setData] = useState<VideoData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async (videoId: string) => {
    try {
      // Check cache first
      const cachedData = cacheService.get(videoId);
      if (cachedData) {
        setData(cachedData);
        return;
      }

      setLoading(true);
      setError(null);

      const response = await fetch(`${API_URL}/analyze-video`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          videoUrl: `https://www.youtube.com/watch?v=${videoId}`,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch video data');
      }

      const result = await response.json();
      
      // Cache the result
      cacheService.set(videoId, result);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  return { data, loading, error, fetchData };
};
```

**2. useThemeDetector Hook (`useThemeDetector.ts`)**

Detects YouTube's current theme for consistent styling:

```typescript
export const useThemeDetector = (): boolean => {
  const [isDarkTheme, setIsDarkTheme] = useState(false);

  useEffect(() => {
    // Function to detect YouTube's theme from the parent page
    const detectTheme = () => {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        chrome.scripting.executeScript({
          target: { tabId: tabs[0].id },
          func: () => {
            // Check for dark theme by looking at YouTube's class or CSS variables
            return document.documentElement.getAttribute('dark') === 'true' || 
                   document.documentElement.classList.contains('dark-theme');
          }
        }, (results) => {
          if (results && results[0] && results[0].result !== undefined) {
            setIsDarkTheme(results[0].result);
          }
        });
      });
    };

    detectTheme();
  }, []);

  return isDarkTheme;
};
```

### Material UI Theming

The extension integrates with YouTube's theme for a native look and feel:

```typescript
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
```

### Caching Implementation

The extension uses a simple but effective in-memory cache to avoid redundant API calls:

```typescript
// cache.ts
type CacheEntry<T> = {
  data: T;
  timestamp: number;
};

class CacheService {
  private cache: Record<string, CacheEntry<any>> = {};
  private readonly TTL: number = 30 * 60 * 1000; // 30 minutes in milliseconds

  public get<T>(key: string): T | null {
    const entry = this.cache[key];
    
    if (!entry) {
      return null;
    }
    
    // Check if entry has expired
    if (Date.now() - entry.timestamp > this.TTL) {
      delete this.cache[key];
      return null;
    }
    
    return entry.data;
  }

  public set<T>(key: string, data: T): void {
    this.cache[key] = {
      data,
      timestamp: Date.now(),
    };
  }

  public clear(): void {
    this.cache = {};
  }
}

export const cacheService = new CacheService();
```

## 5. Backend Implementation <a name="backend-implementation"></a>

### Server Architecture

The backend is built with Node.js and Express.js, providing a lightweight API service that handles transcript retrieval and AI-powered ad detection. The server acts as a bridge between the extension and the external services (YouTube Transcript API and Google Gemini AI).

```
┌─────────────────────────────────────────────────────────────┐
│                     Backend Server                          │
│                                                             │
│  ┌─────────────┐   ┌────────────────┐   ┌────────────────┐  │
│  │  Express.js │   │ Route Handlers │   │   Middleware   │  │
│  │    Server   │──►│ & Controllers  │◄──│   (CORS, etc)  │  │
│  └─────────────┘   └────────────────┘   └────────────────┘  │
│          │                 │                                 │
│          │                 │                                 │
│          ▼                 ▼                                 │
│  ┌─────────────┐   ┌────────────────┐                       │
│  │  YouTube    │   │   Google       │                       │
│  │  Transcript │   │   Gemini AI    │                       │
│  │  API Client │   │   API Client   │                       │
│  └─────────────┘   └────────────────┘                       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Key Components

**1. Express Server Setup**

```javascript
import express from 'express';
import cors from 'cors';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { YoutubeTranscript } from 'youtube-transcript';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize Gemini AI with environment variable
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Configure CORS - important for browser extension security
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['chrome-extension://*'] 
    : '*',
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type']
}));

app.use(express.json());

// ... routes and other functionality ...

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

**2. Main API Endpoint**

The primary endpoint that processes YouTube videos and finds ad segments:

```javascript
// Get transcript and analyze for ads
app.post('/analyze-video', async (req, res) => {
  try {
    const { videoUrl } = req.body;
    if (!videoUrl) {
      return res.status(400).json({ 
        error: 'Video URL is required',
        transcript: [],
        adSegments: []
      });
    }

    console.log('Analyzing video:', videoUrl);
    
    const videoId = getVideoId(videoUrl);
    
    if (!videoId) {
      return res.status(400).json({ 
        error: 'Invalid YouTube URL',
        transcript: [],
        adSegments: []
      });
    }

    // Get transcript with error handling
    let transcript;
    try {
      transcript = await YoutubeTranscript.fetchTranscript(videoId);
    } catch (error) {
      console.error('Error fetching transcript:', error);
      return res.status(404).json({ 
        error: 'Could not fetch video transcript. The video might not have captions available.',
        transcript: [],
        adSegments: []
      });
    }

    if (!transcript || transcript.length === 0) {
      return res.status(404).json({ 
        error: 'No transcript available for this video',
        transcript: [],
        adSegments: []
      });
    }

    // Prepare transcript for analysis
    const transcriptText = transcript.map(t => `[${t.offset}s]: ${t.text}`).join('\n');
    
    // Initialize Gemini model
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    // Analyze for ad segments
    const prompt = `You are an AI trained to analyze YouTube video transcripts and identify sponsored segments or advertisements.

Task: Analyze the following transcript and identify any sponsored segments or advertisements.

Instructions:
1. Look for phrases like:
   - "this video is sponsored by"
   - "thanks to our sponsor"
   - "special thanks to"
   - "check out"
   - "use code"
   - "discount code"
   - "affiliate link"
2. For each ad segment found, note:
   - The start timestamp (as a number in seconds, without "s" suffix)
   - The end timestamp (as a number in seconds, without "s" suffix)
   - The relevant text mentioning the sponsorship

Format your response as ONLY a JSON object with this exact structure:
{
  "adSegments": [
    {
      "start": 295.32,    // seconds as a number, no "s" suffix
      "end": 359.16,      // seconds as a number, no "s" suffix
      "text": "string"    // the sponsorship text
    }
  ]
}

Transcript:
${transcriptText}`;
    
    const result = await model.generateContent(prompt);
    const response = result.response;
    const analysisText = response.text();
    
    // Parse the JSON response
    const analysis = extractJSON(analysisText);

    // Send the response
    const responseToSend = {
      transcript,
      adSegments: analysis.adSegments
    };
    
    res.json(responseToSend);
  } catch (error) {
    console.error('Error in analyze-video:', error);
    res.status(500).json({ 
      error: 'An unexpected error occurred while analyzing the video',
      transcript: [],
      adSegments: []
    });
  }
});
```

**3. Helper Functions**

Several helper functions are used to process data:

```javascript
// Function to get video ID from URL
const getVideoId = (url) => {
  try {
    const urlObj = new URL(url);
    return urlObj.searchParams.get('v');
  } catch (error) {
    console.error('Error parsing URL:', error);
    return null;
  }
};

// Function to extract JSON from Gemini's response
const extractJSON = (text) => {
  try {
    // Clean up the text to handle potential formatting issues
    let cleanText = text.trim();
    
    // If the text starts with a backtick or code block marker, remove it
    cleanText = cleanText.replace(/^```json\s*/, '');
    cleanText = cleanText.replace(/^```\s*/, '');
    cleanText = cleanText.replace(/\s*```$/, '');
    
    // Try to find JSON-like structure in the text
    const jsonMatch = cleanText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.warn('No JSON structure found in response');
      return { adSegments: [] };
    }

    let jsonStr = jsonMatch[0];
    
    // Clean up timestamp values by removing 'ms' suffix
    jsonStr = jsonStr.replace(/"start":\s*(\d+\.?\d*)ms/g, '"start": $1');
    jsonStr = jsonStr.replace(/"end":\s*(\d+\.?\d*)ms/g, '"end": $1');
    
    // Clean up HTML entities in text
    jsonStr = jsonStr.replace(/&amp;#39;/g, "'");
    jsonStr = jsonStr.replace(/&amp;quot;/g, '"');
    jsonStr = jsonStr.replace(/&amp;/g, '&');
    
    const parsed = JSON.parse(jsonStr);
    
    // Validate the structure
    if (!Array.isArray(parsed.adSegments)) {
      console.warn('Invalid adSegments structure:', parsed);
      return { adSegments: [] };
    }

    // Validate and clean each segment
    parsed.adSegments = parsed.adSegments.filter(segment => {
      // Convert string numbers to actual numbers if needed
      if (typeof segment.start === 'string') {
        segment.start = parseFloat(segment.start);
      }
      if (typeof segment.end === 'string') {
        segment.end = parseFloat(segment.end);
      }

      const isValid = 
        !isNaN(segment.start) &&
        !isNaN(segment.end) &&
        typeof segment.text === 'string' &&
        segment.start >= 0 &&
        segment.end > segment.start;

      if (!isValid) {
        console.warn('Invalid segment found:', segment);
      }
      return isValid;
    });

    return parsed;
  } catch (error) {
    console.error('Error parsing JSON from AI response:', error);
    return { adSegments: [] };
  }
};
```

### AI Integration Details

The backend leverages Google's Gemini 2.0 Flash model for ad detection. The implementation focuses on:

1. **Prompt Engineering**: The prompt is carefully designed to:
   - Define the task clearly
   - Provide examples of phrases that indicate sponsorship
   - Specify the exact output format required
   - Include the full transcript with timestamps

2. **Response Parsing**: The `extractJSON` function handles various edge cases:
   - Cleaning code block markers from the AI response
   - Handling potential formatting issues
   - Converting string timestamps to numeric values
   - Validating data structure and segment boundaries

3. **Error Handling**: Comprehensive error handling ensures robust operation:
   - Validation of input data
   - Try-catch blocks around external API calls
   - Data structure validation
   - Consistent error response format

### API Endpoints

| Endpoint | Method | Purpose | Request Body | Response |
|----------|--------|---------|-------------|----------|
| `/analyze-video` | POST | Analyze YouTube video transcript for ads | `{ videoUrl: string }` | `{ transcript: Array<{text: string, offset: number}>, adSegments: Array<{start: number, end: number, text: string}> }` |

### Environment Variables

The backend requires the following environment variables:

```
GEMINI_API_KEY=<your_gemini_api_key>
PORT=3000  # Optional, defaults to 3000
```

### Extension-Backend Communication

The extension communicates with the backend through standard HTTP requests:

1. **Request Flow**:
   - Extension extracts video ID from YouTube URL
   - Extension makes POST request to `/analyze-video` endpoint
   - Backend processes the request and returns transcript and ad segments
   - Extension displays results and injects markers into the YouTube player

2. **Security Considerations**:
   - CORS is configured to restrict access to the extension only
   - API key is kept securely on the server side
   - Request validation ensures proper data format

3. **Data Format**:
   ```javascript
   // Example response from backend
   {
     "transcript": [
       { "text": "welcome to this video", "offset": 0.5 },
       { "text": "today we're going to talk about", "offset": 2.1 },
       // ... more transcript segments ...
     ],
     "adSegments": [
       { 
         "start": 120.5, 
         "end": 150.2, 
         "text": "this video is sponsored by Example Corp" 
       },
       // ... more ad segments ...
     ]
   }
   ```

## 6. Ad Detection Logic <a name="ad-detection-logic"></a>

The ad detection and skipping logic is at the core of the extension's functionality. This section details how the extension identifies, marks, and skips ad segments in YouTube videos.

### Content Script Implementation

The primary ad detection and skipping logic is implemented in the content script (`content.js`), which runs directly in the context of the YouTube page:

```javascript
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
      // Handle seeking to specific timestamp
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

  // Add custom styles for timeline markers, skip button, and notifications
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
  }
  
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
    
    // Check for ad segments periodically
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
    });
  };
  
  // Initialize auto-skip when video is ready
  const videoSetupCheck = setInterval(() => {
    const video = document.querySelector('video');
    if (video) {
      clearInterval(videoSetupCheck);
      setupAutoSkip();
    }
  }, 1000);
})();
```

### Timeline Marker Injection

The extension injects visual markers into YouTube's progress bar using the following approach:

```javascript
// Function to inject markers - implemented in App.tsx, injected via chrome.scripting.executeScript
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
  segments.forEach((segment) => {
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
```

### Skip Button Logic

For manual ad skipping, the extension adds a "Skip Ad Section" button:

```javascript
// Setup skip button (injected via chrome.scripting.executeScript)
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
  let timeoutId = null;
  
  const checkAdSegment = () => {
    const currentTime = video.currentTime;
    const activeSegment = segments.find(
      (segment) => currentTime >= segment.start && currentTime < segment.end
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
  
  // Return cleanup function
  return () => {
    if (timeoutId) window.clearTimeout(timeoutId);
    if (skipButton) skipButton.remove();
  };
};
```

### Auto-Skip Notification

When auto-skip is enabled, the extension shows a brief notification:

```javascript
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
```

### Observer Pattern for YouTube Player Changes

The extension uses MutationObserver to efficiently track changes to the YouTube player:

```javascript
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
```

### Performance Considerations

Several optimizations are implemented to ensure smooth performance:

1. **Debouncing and Throttling**:
   - Ad segment checks use setTimeout with a 1-second interval
   - MutationObserver updates are debounced with a 200ms delay
   - Auto-skip has a 2-second cooldown to prevent rapid-fire triggering

2. **DOM Update Efficiency**:
   - Uses DocumentFragment for batch DOM updates
   - Cleans up old markers before adding new ones
   - Minimizes style recalculations

3. **Scoped Observers**:
   - MutationObserver only watches specific attributes
   - Only relevant DOM elements are queried
   - Cleanup handlers for proper garbage collection

4. **Resource Management**:
   - Single-instance pattern for notification elements
   - Cleanup handlers for timers and observers
   - Before-unload event listener to clean up resources

### Ad Detection Flow Diagram

```
┌─────────────────┐     ┌────────────────┐     ┌───────────────────┐
│ User loads      │     │ Extension      │     │ Backend analyzes  │
│ YouTube video   │────►│ detects video  │────►│ transcript with   │
│                 │     │ ID & requests  │     │ Google Gemini AI  │
└─────────────────┘     │ analysis       │     └───────────────────┘
                        └────────────────┘               │
                                ▲                        │
                                │                        ▼
┌─────────────────┐     ┌────────────────┐     ┌───────────────────┐
│ User experience:│     │ Content script │     │ Ad segments       │
│ - Red markers   │◄────│ injects UI     │◄────│ returned to       │
│ - Skip buttons  │     └────────────────┘     └───────────────────┘
│ - Auto-skip     │     │ Continuous     │
│ advances past   │◄────│ monitoring of  │
│ ad segment      │     │ video position │
└─────────────────┘     └────────────────┘
```

## 7. Testing & Debugging <a name="testing-debugging"></a>

Proper testing and debugging are crucial for browser extensions due to their complex integration with web pages. This section outlines the testing methodology and debugging techniques used for the YouTube Ad Skip extension.

### Local Development Setup

**Prerequisites:**
- Node.js and npm installed
- Chrome or compatible browser
- Code editor (VS Code recommended for TypeScript support)

**Project Setup:**
```bash
# Clone the repository
git clone https://github.com/your-username/yt-adskip.git

# Install dependencies for frontend (extension)
cd YT-adskip-extension
npm install

# Install dependencies for backend
cd ../YT-search-skip-backend
npm install
```

**Development Environment:**
1. **Extension Development:**
   ```bash
   # In YT-adskip-extension directory
   npm start
   ```
   This starts the React development server and watches for changes.

2. **Backend Development:**
   ```bash
   # In YT-search-skip-backend directory
   npm run dev
   ```
   This runs the Express server with nodemon for auto-reloading.

### Loading the Extension in Chrome

During development, you'll need to load the extension in Chrome's developer mode:

1. Build the extension:
   ```bash
   # In YT-adskip-extension directory
   npm run build
   ```

2. Open Chrome and navigate to `chrome://extensions/`

3. Enable "Developer mode" using the toggle in the top-right corner

4. Click "Load unpacked" and select the `build` folder from the project directory

5. The extension should now appear in your browser toolbar

6. Navigate to a YouTube video to test the functionality

### Testing Strategies

**1. Manual Testing Checklist**

| Feature | Test Cases | Expected Behavior |
|---------|------------|-------------------|
| Video Detection | Open different YouTube videos | Extension correctly identifies video ID |
| Transcript Loading | Test videos with and without captions | Shows error for videos without captions |
| Ad Detection | Test known videos with sponsor segments | Correctly identifies ad segments |
| Timeline Markers | Check various video durations | Markers appear at correct positions |
| Auto-Skip | Enable auto-skip and play video | Video automatically skips ad segments |
| Manual Skip | Click skip buttons in extension | Video jumps to end of ad segment |
| Search Function | Search for terms in transcript | Displays matching segments with context |
| UI Themes | Test in YouTube dark and light modes | Extension adapts to match YouTube's theme |
| Keyboard Shortcut | Press Ctrl+Q (or Cmd+Q on Mac) | Extension popup opens |
| Settings Persistence | Change settings, reload page | Auto-skip preference persists |

**2. Component Testing**

For React components, use Jest and React Testing Library:

```javascript
// Example test for SearchBar component
import { render, fireEvent, screen } from '@testing-library/react';
import { SearchBar } from '../components/SearchBar';

test('calls onSearch when form is submitted', () => {
  const mockSearch = jest.fn();
  render(<SearchBar onSearch={mockSearch} disabled={false} />);
  
  const input = screen.getByRole('textbox');
  fireEvent.change(input, { target: { value: 'test query' } });
  
  const form = screen.getByRole('form');
  fireEvent.submit(form);
  
  expect(mockSearch).toHaveBeenCalledWith('test query');
});
```

**3. API Testing**

For backend API, use tools like Postman or write Node.js tests with Supertest:

```javascript
// Example test for /analyze-video endpoint
const request = require('supertest');
const app = require('../server');

describe('API Endpoints', () => {
  test('POST /analyze-video returns transcript and ad segments', async () => {
    const response = await request(app)
      .post('/analyze-video')
      .send({ videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' })
      .set('Accept', 'application/json');
    
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('transcript');
    expect(response.body).toHaveProperty('adSegments');
    expect(Array.isArray(response.body.transcript)).toBe(true);
    expect(Array.isArray(response.body.adSegments)).toBe(true);
  });
});
```

### Debugging Techniques

**1. Console Logging**

Strategic console logging is added throughout the codebase to track execution flow:

```javascript
// Example from content.js
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Content script received message:', request);
  // ... handle message ...
});
```

**2. Chrome DevTools Extension Debugging**

1. Open the Extensions page: `chrome://extensions/`
2. Find your extension and click "background page" under "Inspect views"
3. Use the standard Chrome DevTools to debug the extension

**3. Content Script Debugging**

1. Open a YouTube video page
2. Open Chrome DevTools (F12 or Ctrl+Shift+I)
3. Go to the "Console" tab
4. Filter console by "YT AdSkip" to see extension logs
5. Set breakpoints in content script code via the "Sources" tab

**4. React Component Debugging**

1. Install React Developer Tools Chrome extension
2. Open the extension popup
3. Right-click and select "Inspect"
4. Use React DevTools to inspect component hierarchy and state

### Common Issues and Solutions

| Issue | Potential Cause | Solution |
|-------|----------------|----------|
| Extension doesn't load | Build error or manifest issue | Check manifest.json and rebuild extension |
| No ad segments detected | Video has no transcript or no ads | Try a different video with known sponsorships |
| Timeline markers don't appear | YouTube player structure changed | Update DOM element selectors in content script |
| Extension popup blank | React app error | Check console errors in popup inspector |
| Auto-skip doesn't work | Content script communication issue | Verify message handling in content.js |
| API errors | Backend connection issues | Check backend logs and CORS configuration |
| Performance issues | Inefficient DOM operations | Optimize DOM queries and use debouncing |

## 8. Packaging & Deployment <a name="packaging-deployment"></a>

This section covers how to prepare the YouTube Ad Skip extension for production use, including building the extension package and deploying the backend service.

### Extension Packaging

#### 1. Preparing for Production Build

Before building for production, ensure:

1. Update version number in `manifest.json`
2. Set production API URL in `.env` file
3. Update any development-only code (e.g., console logs)

```
# .env example
REACT_APP_API_URL=https://your-production-api.com
```

#### 2. Building the Extension

Build the production-ready extension with optimized assets:

```bash
# In YT-adskip-extension directory
npm run build
```

This creates a `build` directory with the following structure:

```
build/
├── asset-manifest.json
├── content.js
├── icon16.png
├── index.html
├── manifest.json
└── static/
    ├── css/
    │   └── main.[hash].css
    └── js/
        └── main.[hash].js
```

#### 3. Creating the Chrome Web Store Package

1. Zip the contents of the `build` directory:

```bash
# Windows (PowerShell)
Compress-Archive -Path .\build\* -DestinationPath yt-adskip.zip

# macOS/Linux
cd build && zip -r ../yt-adskip.zip *
```

2. This zip file is what you'll upload to the Chrome Web Store

### Backend Deployment

#### 1. Preparing the Backend

1. Create a production `.env` file:

```
GEMINI_API_KEY=<your_production_api_key>
PORT=3000
NODE_ENV=production
```

2. Install production dependencies:

```bash
# In YT-search-skip-backend directory
npm ci --production
```

#### 2. Deployment Options

**Option 1: Traditional Hosting (VPS/Dedicated Server)**

1. Set up a Node.js environment on your server
2. Copy server files and install dependencies
3. Use a process manager like PM2 to keep the server running

```bash
# Install PM2 (on the server)
npm install -g pm2

# Start the server with PM2
pm2 start server.js --name yt-adskip-backend

# Make sure it starts on system reboot
pm2 startup
pm2 save
```

**Option 2: Containerized Deployment (Docker)**

1. Create a Dockerfile:

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --production

COPY . .

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

CMD ["node", "server.js"]
```

2. Build and deploy the Docker image:

```bash
# Build the image
docker build -t yt-adskip-backend .

# Run the container
docker run -d -p 3000:3000 --name yt-adskip-api \
  -e GEMINI_API_KEY=<your_key> \
  yt-adskip-backend
```

**Option 3: Serverless Deployment**

For services like AWS Lambda, Google Cloud Functions, or Vercel:

1. Adapt the Express app for serverless environments
2. Use the platform's deployment tools 

For example, with Vercel:

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel
```

#### 3. Setting Up a Domain and HTTPS

1. Register a domain for your API
2. Configure DNS to point to your server
3. Set up HTTPS with Let's Encrypt or your hosting provider's SSL

#### 4. CORS Configuration for Production

Update the CORS settings to only allow requests from your extension:

```javascript
app.use(cors({
  origin: ['chrome-extension://your-extension-id'],
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type']
}));
```

### Chrome Web Store Submission

1. **Create a Developer Account**:
   - Go to the [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)
   - Pay the one-time developer registration fee ($5)

2. **Prepare Store Assets**:
   - Icon: 128x128 PNG
   - Screenshots: At least 1280x800 or 640x400
   - Promotional images (optional)
   - Detailed description

3. **Upload and Submit**:
   - Click "New Item" in the developer dashboard
   - Upload the zip file created earlier
   - Fill in all required fields
   - Set distribution options (public or private)
   - Submit for review

4. **Review Process**:
   - Chrome Web Store review typically takes 1-3 business days
   - Address any policy violations if flagged
   - Once approved, your extension will be published

### Update Management

For future updates:

1. Increment the version number in `manifest.json`
2. Make your code changes
3. Build and zip the updated extension
4. Upload to the Chrome Web Store as an update

### Analytics and Monitoring

Consider implementing:

1. **Error Tracking**:
   - Set up Sentry or similar service for frontend and backend
   - Add appropriate error reporting hooks

2. **Usage Analytics**:
   - Implement privacy-friendly analytics
   - Track feature usage and performance metrics

3. **Server Monitoring**:
   - Set up uptime monitoring for the backend
   - Configure alerts for system issues

4. **API Request Limiting**:
   - Implement rate limiting to prevent abuse

## 9. Optimization Techniques <a name="optimization-techniques"></a>

Performance optimization is crucial for browser extensions, especially those that interact with video content. This section details the techniques used to ensure the YouTube Ad Skip extension runs efficiently.

### Frontend Performance Optimizations

#### React Component Optimizations

1. **Memoization with useMemo and React.memo**

```javascript
// Example from SearchResults.tsx
const filteredResults = useMemo(() => {
  if (!searchQuery) return [];

  const query = searchQuery.toLowerCase();
  const results = [];
  // ... filtering logic ...
  
  return results;
}, [transcript, searchQuery]);
```

2. **Conditional Rendering**

Conditionally rendering components only when needed:

```javascript
{data && (
  <>
    {data.adSegments && data.adSegments.length > 0 && (
      <>
        <FormControlLabel
          control={<Switch checked={autoSkip} onChange={handleChange} />}
          label="Auto-skip ad segments"
        />
        <AdMarker adSegments={data.adSegments} onTimestampClick={handleTimestampClick} />
      </>
    )}
    
    <SearchResults 
      transcript={data.transcript}
      searchQuery={searchQuery}
      onTimestampClick={handleTimestampClick}
    />
  </>
)}
```

3. **UseEffect Dependency Optimization**

Using precise dependencies in useEffect hooks:

```javascript
useEffect(() => {
  // This effect only runs when data.adSegments or autoSkip changes
  // ... content script injection logic ...
}, [data?.adSegments, autoSkip]);
```

#### DOM Manipulation Optimizations

1. **Batch DOM Updates**

Using DocumentFragment to minimize reflows:

```javascript
const injectMarkers = () => {
  // ... existing code ...
  
  // Create markers efficiently with document fragment
  const fragment = document.createDocumentFragment();
  
  // Create markers
  segments.forEach((segment) => {
    const marker = document.createElement('div');
    // ... configure marker ...
    fragment.appendChild(marker);
  });
  
  // Single DOM operation to add all markers
  markersContainer.appendChild(fragment);
};
```

2. **Efficient Event Handling**

Using debouncing to limit function execution frequency:

```javascript
// Implementation of debounce utility
export const debounce = <F extends (...args: any[]) => any>(
  func: F,
  waitFor: number
) => {
  let timeout: ReturnType<typeof setTimeout> | null = null;

  return (...args: Parameters<F>): void => {
    if (timeout !== null) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(() => func(...args), waitFor);
  };
};

// Usage in code
const debouncedSearch = debounce((query: string) => {
  performSearch(query);
}, 300);
```

3. **Minimal DOM Queries**

Caching DOM references to avoid repeated queries:

```javascript
// Instead of this:
function checkElementStyles() {
  document.querySelector('.ytp-progress-bar').style.backgroundColor = 'red';
  document.querySelector('.ytp-progress-bar').style.height = '5px';
}

// Do this:
function checkElementStyles() {
  const progressBar = document.querySelector('.ytp-progress-bar');
  if (progressBar) {
    progressBar.style.backgroundColor = 'red';
    progressBar.style.height = '5px';
  }
}
```

### Content Script Optimizations

1. **Limited Processing Frequency**

Using setInterval with reasonable timing:

```javascript
// Check for ad segments once per second rather than continuously
const checkInterval = setInterval(() => {
  // ... ad segment checking logic ...
}, 1000);
```

2. **Targeted MutationObserver**

Limiting the scope of observation:

```javascript
// Only observe the progress bar's specific attributes
window.adSkipObserver.observe(progressBar, {
  attributes: true,
  attributeFilter: ['aria-valuemax', 'aria-valuenow']
});
```

3. **Cleanup Resources**

Properly removing observers and intervals:

```javascript
// Return cleanup function from setup
const setup = () => {
  const intervalId = setInterval(checkFunction, 1000);
  const handleEvent = () => { /* ... */ };
  document.addEventListener('event', handleEvent);
  
  // Return cleanup function
  return () => {
    clearInterval(intervalId);
    document.removeEventListener('event', handleEvent);
  };
};

// Use the cleanup function when needed
const cleanup = setup();
// Later...
if (cleanup) cleanup();
```

### Data Management Optimizations

1. **Client-Side Caching**

Implementing a caching layer to reduce API calls:

```javascript
const fetchData = async (videoId: string) => {
  try {
    // Check cache first
    const cachedData = cacheService.get(videoId);
    if (cachedData) {
      setData(cachedData);
      return;
    }

    // ... fetch from API ...
    
    // Cache the result
    cacheService.set(videoId, result);
  } catch (err) {
    // ... error handling ...
  }
};
```

2. **Data Transfer Minimization**

Only sending necessary data between components:

```javascript
// Instead of passing the entire data object
<AdMarker data={data} onTimestampClick={handleTimestampClick} />

// Pass only what's needed
<AdMarker 
  adSegments={data.adSegments} 
  onTimestampClick={handleTimestampClick} 
/>
```

### Backend Optimizations

1. **Response Caching**

Adding caching headers:

```javascript
app.post('/analyze-video', async (req, res) => {
  // ... processing ...
  
  // Add cache headers
  res.set('Cache-Control', 'public, max-age=3600'); // 1 hour
  res.json(responseToSend);
});
```

2. **Efficient JSON Parsing**

The backend uses regex-based extraction to efficiently handle AI responses:

```javascript
// Try to find JSON-like structure in the text
const jsonMatch = cleanText.match(/\{[\s\S]*\}/);
if (jsonMatch) {
  let jsonStr = jsonMatch[0];
  // ... further processing ...
}
```

3. **Error Resilience**

Comprehensive error handling ensures the API remains responsive:

```javascript
try {
  // ... main processing logic ...
} catch (error) {
  console.error('Error in analyze-video:', error);
  res.status(500).json({ 
    error: 'An unexpected error occurred',
    transcript: [],
    adSegments: []
  });
}
```

### YouTube-Specific Optimizations

1. **Avoiding Anti-Adblock Detection**

The extension uses native DOM APIs rather than blocking network requests:

```javascript
// Using DOM manipulation instead of network interception
video.currentTime = segment.end; // Skip to end of segment
```

2. **Adapting to YouTube's Structure**

The extension is designed to work with YouTube's dynamic interface:

```javascript
// Find elements that may not be immediately available
const videoSetupCheck = setInterval(() => {
  const video = document.querySelector('video');
  const progressBar = document.querySelector('.ytp-progress-bar');
  
  if (video && progressBar) {
    clearInterval(videoSetupCheck);
    setupFunctionality(video, progressBar);
  }
}, 1000);
```

### Memory Management

1. **Avoiding Memory Leaks**

Proper cleanup of event listeners and intervals:

```javascript
// Return cleanup function from setup
const setup = () => {
  const intervalId = setInterval(checkFunction, 1000);
  const handleEvent = () => { /* ... */ };
  document.addEventListener('event', handleEvent);
  
  // Return cleanup function
  return () => {
    clearInterval(intervalId);
    document.removeEventListener('event', handleEvent);
  };
};

// Use the cleanup function when needed
const cleanup = setup();
// Later...
if (cleanup) cleanup();
```

2. **Limiting State**

Keeping minimal state in memory:

```javascript
// Only store what's needed
const [activeSegment, setActiveSegment] = useState(null);

// Instead of
const [allSegments, setAllSegments] = useState([]);
const [currentSegmentIndex, setCurrentSegmentIndex] = useState(0);
```

## 10. Future Enhancements <a name="future-enhancements"></a>

The YouTube Ad Skip extension provides a solid foundation that can be expanded with additional features and improvements. This section outlines potential future enhancements.

### Feature Enhancements

#### 1. Enhanced Ad Detection

**Community-Contributed Ad Segments**
- Implement a crowdsourced database of ad segments
- Allow users to mark segments as ads or confirm AI-detected segments
- Sync with services like SponsorBlock API for broader coverage

**Multi-Model AI Detection**
- Add support for multiple AI models for comparison
- Implement a voting system between different AI detections
- Fine-tune ad detection prompts based on user feedback

#### 2. User Interface Improvements

**Customizable UI**
- Allow users to customize the extension's appearance
- Implement themes beyond YouTube's default light/dark modes
- Add options for marker colors and notification styles

**Advanced Timeline Controls**
- Add hover tooltip information over timeline markers
- Implement click-to-skip directly on timeline markers
- Add category labels for different types of sponsored content

**Picture-in-Picture Support**
- Ensure ad skipping works in Picture-in-Picture mode
- Add minimalist controls for PiP windows

#### 3. Expanded Functionality

**Offline Mode**
- Cache video analysis for offline viewing
- Implement local AI processing for privacy-conscious users
- Support downloaded YouTube videos via the extension

**Multiple Video Support**
- Add playlist scanning to pre-process upcoming videos
- Implement batch processing of favorite channels
- Create a dashboard view for recent videos with ad statistics

**Content Categories**
- Expand beyond just ad detection to identify other content types:
  - Intros and outros
  - Self-promotion segments
  - Non-music portions of music videos
  - Off-topic tangents

#### 4. Personalization

**User Preferences**
- Allow users to set preferences for certain sponsors
- Create allowlists for sponsors the user wants to see
- Implement per-channel settings

**Smart Learning**
- Track user manual skips to improve auto-detection
- Learn user viewing patterns to predict preferences
- Adapt to user feedback on false positives/negatives

### Technical Improvements

#### 1. Cross-Browser Support

**Firefox Extension**
- Adapt the extension for Firefox's WebExtensions API
- Create Firefox-specific manifest adjustments
- Implement browser detection for platform-specific features

**Safari Extension**
- Create a Safari Web Extension version
- Adapt to Safari's unique extension requirements
- Support macOS and iOS platforms

#### 2. Performance Enhancements

**Worker-Based Processing**
- Move intensive operations to Web Workers
- Implement background processing for large transcripts
- Reduce main thread blocking during analysis

**Streaming API Support**
- Implement streaming response handling for faster initial results
- Process transcript segments as they arrive rather than waiting for complete data
- Show progressive UI updates during analysis

#### 3. Integration Possibilities

**Voice Commands**
- Add voice control for hands-free operation
- Implement commands like "skip ads in this video"
- Integrate with browser voice recognition APIs

**Smart TV Support**
- Explore possibilities for ad skipping on smart TV YouTube apps
- Create companion apps for major platforms
- Implement QR code pairing between extension and TV apps

**YouTube Premium Integration**
- Detect Premium users and offer different functionality
- Focus on transcript search rather than ad skipping for Premium users
- Provide complementary features not covered by Premium

### Backend Enhancements

#### 1. Multi-Model Infrastructure

**Model Redundancy**
- Implement fallback models if primary AI service is unavailable
- Add support for local models like Llama or similar open-source options
- Create a model evaluation framework to select the best model for each video

**Self-Hosted Option**
- Provide documentation for self-hosting the backend
- Create Docker compose setup for easy deployment
- Implement API key management for self-hosted instances

#### 2. Advanced Transcript Analysis

**Multi-Language Support**
- Expand beyond English to support global YouTube content
- Implement language detection and model selection
- Add translation capabilities for cross-language searches

**Semantic Search**
- Implement vector-based semantic search for transcripts
- Allow users to find concepts rather than just keywords
- Create topic summaries from transcript sections

#### 3. Analytics and Insights

**User Dashboard**
- Create an analytics page showing time saved by skipping ads
- Display statistics on most common sponsors
- Track search patterns and popular topics

**Creator Tools**
- Build tools for content creators to see how their content is perceived
- Provide insights on which sponsored segments viewers skip most
- Offer suggestions for better integration of sponsored content

### Community and Open Source

#### 1. Developer API

**Public API**
- Create a documented API for developers to build upon
- Implement proper rate limiting and authentication
- Provide SDKs for common languages

**Plugin System**
- Design a plugin architecture for the extension
- Allow community-developed features to be installed
- Create a plugin repository for sharing extensions

#### 2. Open Data Initiative

**Research Dataset**
- Create anonymized datasets for researchers
- Provide insights into sponsorship patterns on YouTube
- Collaborate with academic institutions

**Transparency Reports**
- Publish regular reports on sponsorship trends
- Share effectiveness rates of different detection methods
- Create open benchmarks for ad detection algorithms

### Conclusion

The YouTube Ad Skip extension demonstrates the power of combining browser extension technology with AI capabilities to enhance the user experience. By following the technical implementations detailed in this documentation, developers can understand how to build similar extensions or contribute to the improvement of this project.

The extension's architecture provides a solid foundation for future development, with clear separation of concerns between the frontend, content scripts, and backend services. The optimization techniques ensure good performance, while the extensive testing and debugging strategies help maintain reliability.

With the potential enhancements outlined above, the extension could evolve into an even more powerful tool for YouTube users, offering not just ad skipping but a comprehensive suite of features to improve video consumption. 

## Frontend Documentation

### Overview
The YouTube AdSkip extension is designed to enhance the viewing experience by allowing users to skip ads in YouTube videos. It integrates seamlessly with YouTube's interface and provides a user-friendly way to manage ad skipping.

### Main Components
- **App.tsx**: The main application component that integrates various features such as theme detection, video data fetching, and ad marker management.
- **SearchBar.tsx**: Provides a search interface for users to search within the video transcript.
- **SearchResults.tsx**: Displays the results of transcript searches, highlighting relevant sections.
- **AdMarker.tsx**: Manages the display of ad markers on the video timeline, allowing users to see where ads are located.

### Utilities
- **useVideoData.ts**: A custom React hook that fetches video data and manages caching to improve performance.
- **useThemeDetector.ts**: Detects YouTube's current theme (dark or light) to ensure consistent styling.
- **cache.ts**: Provides in-memory caching functionality to reduce redundant API calls.
- **formatTime.ts**: Utility function for formatting time values in a user-friendly manner.
- **debounce.ts**: Utility function to debounce rapid function calls, improving performance.

### Styling and Theming
The extension uses Material UI for consistent theming across components. It dynamically switches themes based on YouTube's current theme, ensuring a seamless user experience.

### Chrome Extension Integration
The frontend leverages Chrome APIs to manage tabs and storage, enabling communication between the extension and content scripts. This integration allows for real-time updates and settings management.

## Backend Documentation

### Overview
The backend server processes video data and detects ad segments using AI models. It is built with Node.js and Express.js, providing a robust and scalable solution for handling video analysis requests.

### Server Setup
The server is configured using environment variables stored in a `.env` file. It requires a `GEMINI_API_KEY` for AI integration and optionally a `PORT` for server configuration.

### API Endpoints
- **/analyze-video**: The primary endpoint for analyzing video transcripts and detecting ad segments. It accepts a POST request with a YouTube video URL and returns the transcript along with identified ad segments.

### AI Integration
The backend leverages Google's Gemini 2.0 Flash model for ad detection. The AI model is prompted to identify common sponsorship phrases and returns structured JSON data with ad segments.

### Helper Functions
- **getVideoId**: Extracts the video ID from YouTube URLs to facilitate API requests.
- **extractJSON**: Processes and validates AI responses, ensuring accurate extraction of ad segments.

### Error Handling and Security
The server includes comprehensive error handling strategies to manage API errors and malformed data. CORS is configured to ensure secure communication between the extension and the backend.

### Environment Variables
The backend requires the following environment variables:
- `GEMINI_API_KEY`: API key for accessing the Gemini AI model.
- `PORT`: Optional port configuration for the server, defaulting to 3000 if not specified.

### Extension-Backend Communication

The extension communicates with the backend through standard HTTP requests:

1. **Request Flow**:
   - Extension extracts video ID from YouTube URL
   - Extension makes POST request to `/analyze-video` endpoint
   - Backend processes the request and returns transcript and ad segments
   - Extension displays results and injects markers into the YouTube player

2. **Security Considerations**:
   - CORS is configured to restrict access to the extension only
   - API key is kept securely on the server side
   - Request validation ensures proper data format

3. **Data Format**:
   ```javascript
   // Example response from backend
   {
     "transcript": [
       { "text": "welcome to this video", "offset": 0.5 },
       { "text": "today we're going to talk about", "offset": 2.1 },
       // ... more transcript segments ...
     ],
     "adSegments": [
       { 
         "start": 120.5, 
         "end": 150.2, 
         "text": "this video is sponsored by Example Corp" 
       },
       // ... more ad segments ...
     ]
   }
   ``` 