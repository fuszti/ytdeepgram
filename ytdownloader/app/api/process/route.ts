import { NextRequest, NextResponse } from 'next/server';
import { getVideoInfo, downloadAudio } from '@/lib/youtube';
import { transcribeAudio } from '@/lib/deepgram';

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    // Get video information
    const videoInfo = await getVideoInfo(url);

    // Download audio for transcription
    const audioStream = await downloadAudio(url);

    // Transcribe the audio
    const transcriptionResult = await transcribeAudio(audioStream);

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
    return NextResponse.json(
      { error: 'Failed to process video' },
      { status: 500 }
    );
  }
}