import { NextRequest, NextResponse } from 'next/server';
import { getVideoInfo, downloadAudio } from '@/lib/youtube';
import { transcribeAudio } from '@/lib/deepgram';

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    console.log('Starting video processing for URL:', url);

    // Get video information
    console.log('Step 1: Getting video information...');
    const videoInfo = await getVideoInfo(url);
    console.log('Step 1 completed: Video info retrieved');

    // Download audio for transcription
    console.log('Step 2: Downloading audio stream...');
    const audioStream = await downloadAudio(url);
    console.log('Step 2 completed: Audio stream created');

    // Transcribe the audio
    console.log('Step 3: Starting transcription with Deepgram...');
    const transcriptionResult = await transcribeAudio(audioStream);
    console.log('Step 3 completed: Transcription finished');

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