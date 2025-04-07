# YouTube Transcript Search & Ad Skip Extension

A Chrome extension that allows you to search through YouTube video transcripts and easily skip sponsored segments.

## Features

- 🔍 Search through video transcripts
- ⏭️ Skip sponsored segments automatically
- 🎯 Jump to specific timestamps
- 🌓 Adapts to YouTube's light/dark theme
- 🎨 Modern Material UI design

## Development Setup

1. Install dependencies:
```bash
npm install
```

2. Create a `.env` file in the root directory with your API configuration:
```
REACT_APP_API_URL=http://localhost:3000
```

3. Start the development server:
```bash
npm start
```

4. Build the extension:
```bash
npm run build
```

5. Load the extension in Chrome:
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `build` folder

## Usage

1. Navigate to any YouTube video
2. Click the extension icon in your browser toolbar
3. The extension will automatically fetch the video transcript
4. Use the search bar to find specific moments in the video
5. Click on timestamps to jump to specific points
6. Use the "Skip" buttons to bypass sponsored segments

## API Integration

The extension requires a backend server running at the specified `REACT_APP_API_URL`. The backend should provide:

- POST `/analyze-video`
  - Request: `{ videoUrl: string }`
  - Response: `{ transcript: Array<{text: string, offset: number}>, adSegments: Array<{start: number, end: number, text: string}> }`

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License. 