# YouTube Downloader & Transcriber

A simple NextJS application that allows users to download YouTube videos, extract audio, and generate AI-powered transcriptions using Deepgram.

## Features

- 🎥 Download YouTube videos in MP4 format
- 🎵 Extract audio in MP3 format
- 📝 Generate AI-powered transcriptions using Deepgram
- 💾 Export transcripts as Markdown or JSON
- 🎨 Clean, modern UI with animations
- 🐳 Docker support for easy deployment

## Prerequisites

- Node.js 20 or higher
- npm or yarn
- Deepgram API key
- Docker and Docker Compose (for containerized deployment)

## Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file with your Deepgram API key:
   ```
   DEEPGRAM_API_KEY=your_api_key_here
   ```

## Development

Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Production Deployment with Docker

Build and run using Docker Compose:

```bash
docker-compose up -d
```

The application will be available at [http://localhost:3000](http://localhost:3000).

To stop the application:

```bash
docker-compose down
```

## Usage

1. Paste a YouTube URL in the input field
2. Click "Process" to fetch video information and generate transcription
3. Download the video, audio, or transcript in your preferred format

## Tech Stack

- Next.js 14 with TypeScript
- React 18
- Tailwind CSS
- Framer Motion for animations
- ytdl-core for YouTube downloads
- Deepgram SDK for transcriptions
- Docker for containerization