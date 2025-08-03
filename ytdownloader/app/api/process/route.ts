import { NextRequest, NextResponse } from 'next/server';
import { getVideoInfo, downloadAudio, downloadAudioInChunks } from '@/lib/youtube';
import { transcribeAudio, transcribeAudioChunks } from '@/lib/deepgram';

export async function POST(request: NextRequest) {
  try {
    const { url, language } = await request.json();

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    console.log('Starting video processing for URL:', url);

    // Get video information
    console.log('Step 1: Getting video information...');
    const videoInfo = await getVideoInfo(url);
    console.log('Step 1 completed: Video info retrieved');
    console.log(`Video duration: ${videoInfo.length} seconds (${Math.floor(videoInfo.length / 60)} minutes)`);

    let transcriptionResult;
    
    // Check if video is longer than 10 minutes
    if (videoInfo.length > 600) { // 600 seconds = 10 minutes
      console.log('Video is longer than 10 minutes, using chunked processing...');
      
      // Download and transcribe in chunks
      console.log('Step 2: Downloading audio in chunks...');
      const chunks = await downloadAudioInChunks(url);
      console.log(`Step 2 completed: Downloaded ${chunks.length} audio chunks`);
      
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
    }

    return NextResponse.json({
      videoInfo: {
        ...videoInfo,
        url,
      },
      transcript: transcriptionResult.transcript,
      transcriptionData: transcriptionResult,
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