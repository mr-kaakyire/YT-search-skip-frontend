# YouTube Ad Skip & Search Extension

A Chrome extension that helps you skip ads and search through YouTube video content.

## Features

- Automatically detects ad segments in YouTube videos
- Highlights ad segments on the video timeline
- Allows you to skip directly to specific timestamps
- Search for keywords within the video transcript
- Jump to any moment where a keyword is mentioned

## Setup

### Backend

1. Navigate to the backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Start the server:
```bash
npm run dev
```

The backend server will run on http://localhost:3000

### Frontend

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Build the extension:
```bash
npm run build
```

## Installing the Extension in Chrome

1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode" in the top right
3. Click "Load unpacked"
4. Select the `frontend/dist` directory

## Usage

1. Go to any YouTube video
2. Click the extension icon in your Chrome toolbar
3. The extension will automatically analyze the video for ad segments
4. Use the search box to find specific moments in the video
5. Click the timestamp buttons to skip to specific moments

## Technologies Used

- Frontend: React + Vite
- Backend: Express.js
- AI: Google Gemini
- YouTube Transcript API
