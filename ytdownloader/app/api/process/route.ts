import { NextRequest, NextResponse } from 'next/server';
import { getVideoInfo, downloadAudio, downloadAudioInChunks } from '@/lib/youtube';
import { transcribeAudio, transcribeAudioChunks } from '@/lib/deepgram';
import { isCached, getCachedTranscription, saveTranscriptionToCache } from '@/lib/cache';

export async function POST(request: NextRequest) {
  try {
    const { url, language } = await request.json();

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    console.log('Starting video processing for URL:', url);

    // Check if transcription is already cached
    console.log('Checking cache for existing transcription...');
    const cached = await isCached(url);
    
    if (cached) {
      console.log('Found cached transcription, returning from cache');
      const cachedTranscription = await getCachedTranscription(url);
      
      if (cachedTranscription) {
        return NextResponse.json({
          videoInfo: {
            title: cachedTranscription.title,
            author: cachedTranscription.author,
            length: cachedTranscription.duration,
            url: cachedTranscription.url,
          },
          transcript: cachedTranscription.transcriptClean,
          transcriptTimestamped: cachedTranscription.transcriptTimestamped,
          transcriptionData: {
            transcript: cachedTranscription.transcriptClean,
            words: cachedTranscription.words,
            duration: cachedTranscription.metadata.deepgramDuration,
          },
          cached: true,
          processedAt: cachedTranscription.processedAt,
        });
      }
    }

    console.log('No cached transcription found, processing video...');

    // Get video information
    console.log('Step 1: Getting video information...');
    const videoInfo = await getVideoInfo(url);
    console.log('Step 1 completed: Video info retrieved');
    console.log(`Video duration: ${videoInfo.length} seconds (${Math.floor(videoInfo.length / 60)} minutes)`);

    let transcriptionResult;
    let chunkCount: number | undefined;
    
    // Check if video is longer than 10 minutes
    if (videoInfo.length > 600) { // 600 seconds = 10 minutes
      console.log('Video is longer than 10 minutes, using chunked processing...');
      
      // Download and transcribe in chunks
      console.log('Step 2: Downloading audio in chunks...');
      const chunks = await downloadAudioInChunks(url);
      console.log(`Step 2 completed: Downloaded ${chunks.length} audio chunks`);
      chunkCount = chunks.length;
      
      // Transcribe chunks
      console.log('Step 3: Starting chunked transcription with Deepgram...');
      transcriptionResult = await transcribeAudioChunks(chunks, language);
      console.log('Step 3 completed: All chunks transcribed and merged');
    } else {
      // Use original single-file approach for short videos
      console.log('Step 2: Downloading audio stream...');
      const audioStream = await downloadAudio(url);
      console.log('Step 2 completed: Audio stream created');

      // Transcribe the audio
      console.log('Step 3: Starting transcription with Deepgram...');
      transcriptionResult = await transcribeAudio(audioStream, language);
      console.log('Step 3 completed: Transcription finished');
      chunkCount = 1;
    }

    // Save transcription to cache
    console.log('Step 4: Saving transcription to cache...');
    const videoId = await saveTranscriptionToCache(url, videoInfo, transcriptionResult, language, chunkCount);
    console.log('Step 4 completed: Transcription cached');

    // Get the cached version to ensure we have the timestamped transcript
    const savedTranscription = await getCachedTranscription(url);

    return NextResponse.json({
      videoInfo: {
        ...videoInfo,
        url,
      },
      transcript: transcriptionResult.transcript,
      transcriptTimestamped: savedTranscription?.transcriptTimestamped || '',
      transcriptionData: transcriptionResult,
      cached: false,
      videoId,
    });
  } catch (error) {
    console.error('Process error:', error);
    let errorMessage = 'Failed to process video';
    
    if (error instanceof Error) {
      console.error('Error details:', error.message);
      errorMessage += ': ' + error.message;
    }
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}