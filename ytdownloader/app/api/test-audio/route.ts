import { NextRequest, NextResponse } from 'next/server';
import { downloadAudio } from '@/lib/youtube';

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    // Test audio download
    const audioStream = await downloadAudio(url);
    
    // Just check if we got a stream
    const hasData = audioStream && typeof audioStream.pipe === 'function';

    return NextResponse.json({
      success: true,
      audioStreamValid: hasData,
      message: 'Audio stream created successfully'
    });
  } catch (error) {
    console.error('Test audio error:', error);
    return NextResponse.json(
      { error: 'Failed to download audio', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}