import { NextRequest, NextResponse } from 'next/server';
import { getVideoInfo } from '@/lib/youtube';

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    // Test just video info extraction
    const videoInfo = await getVideoInfo(url);

    return NextResponse.json({
      success: true,
      videoInfo: {
        ...videoInfo,
        url,
      },
    });
  } catch (error) {
    console.error('Test video error:', error);
    return NextResponse.json(
      { error: 'Failed to get video info', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}