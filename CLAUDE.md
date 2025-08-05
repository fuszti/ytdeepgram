# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a YouTube video transcription application that downloads YouTube videos and generates AI-powered transcriptions using Deepgram API. The application is built with Next.js 14 and TypeScript, featuring a modern UI with Tailwind CSS and Framer Motion animations.

## Common Development Commands

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run linter
npm run lint

# Docker deployment
docker-compose up -d
docker-compose down
```

## Architecture

### Tech Stack
- **Next.js 14** with App Router and TypeScript
- **React 18** for UI components
- **Tailwind CSS** for styling
- **Framer Motion** for animations
- **yt-dlp** for YouTube downloads (system dependency)
- **Deepgram SDK** for AI transcriptions
- **ffmpeg** for audio processing (system dependency)

### Project Structure
- `/ytdownloader/` - Main application directory
  - `/app/` - Next.js app router structure
    - `/api/` - API routes for backend functionality
      - `/download/` - Video download endpoint
      - `/process/` - Main processing endpoint (info + transcription)
      - `/test-audio/` - Audio download testing
      - `/test-video/` - Video download testing
      - `/health/` - Health check endpoint
    - `page.tsx` - Main UI component
  - `/lib/` - Core business logic
    - `youtube.ts` - YouTube video/audio download using yt-dlp
    - `deepgram.ts` - Deepgram transcription integration

### Key Architectural Decisions

1. **Chunked Processing for Long Videos**: Videos longer than 10 minutes are automatically split into 9-minute chunks to handle Deepgram's processing limits. The chunks are transcribed sequentially and merged.

2. **External Dependencies**: The application relies on system-installed `yt-dlp` and `ffmpeg` binaries rather than npm packages for better reliability and feature support.

3. **Stream Processing**: Audio is processed as streams where possible to minimize memory usage and temporary file creation.

4. **Environment Configuration**: Requires `DEEPGRAM_API_KEY` environment variable for transcription functionality.

### API Flow

1. **Process Endpoint** (`/api/process/`):
   - Accepts YouTube URL and optional language parameter
   - Fetches video metadata using yt-dlp
   - For videos >10 minutes: Downloads audio in chunks, transcribes each chunk, merges results
   - For videos ≤10 minutes: Downloads full audio, transcribes as single stream
   - Returns video info and complete transcription

2. **Download Endpoints**:
   - `/api/download/` - Returns video/audio files based on format parameter
   - Uses appropriate yt-dlp flags for format selection

### Error Handling

- Comprehensive error logging at each processing step
- Graceful handling of private/restricted videos
- Cleanup of temporary chunk files after processing
- User-friendly error messages returned to frontend

### Docker Support

The application includes Docker configuration for containerized deployment:
- Dockerfile with multi-stage build
- docker-compose.yml for easy deployment
- Automatic installation of system dependencies (yt-dlp, ffmpeg)

## Important Notes

- Always check for the presence of `DEEPGRAM_API_KEY` when working with transcription features
- The application uses Next.js App Router - ensure compatibility when adding new routes
- Temporary audio chunks are stored in system temp directory and cleaned up after processing
- The frontend expects specific response formats from API endpoints - maintain consistency