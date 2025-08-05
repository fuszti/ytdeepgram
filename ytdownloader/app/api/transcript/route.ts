import { NextRequest, NextResponse } from 'next/server';
import { getCachedTranscription, generateVideoId } from '@/lib/cache';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const url = searchParams.get('url');
    const videoId = searchParams.get('videoId');
    const format = searchParams.get('format') || 'clean'; // 'clean', 'timestamped', or 'json'

    if (!url && !videoId) {
      return NextResponse.json(
        { error: 'Either url or videoId is required' }, 
        { status: 400 }
      );
    }

    let transcription;
    
    if (url) {
      transcription = await getCachedTranscription(url);
    } else if (videoId) {
      // Find transcription by videoId
      const cachedUrl = `video://${videoId}`; // Placeholder - in real implementation you'd need to store URL mapping
      transcription = await getCachedTranscription(cachedUrl);
    }

    if (!transcription) {
      return NextResponse.json(
        { error: 'Transcription not found in cache' }, 
        { status: 404 }
      );
    }

    // Return different formats based on request
    switch (format) {
      case 'timestamped':
        return new NextResponse(transcription.transcriptTimestamped, {
          headers: {
            'Content-Type': 'text/plain',
            'Content-Disposition': `attachment; filename="${transcription.title}_timestamped.txt"`
          }
        });
      
      case 'json':
        return new NextResponse(JSON.stringify({
          video: {
            title: transcription.title,
            author: transcription.author,
            duration: transcription.duration,
            url: transcription.url
          },
          transcription: {
            clean: transcription.transcriptClean,
            timestamped: transcription.transcriptTimestamped,
            words: transcription.words
          },
          metadata: transcription.metadata,
          processedAt: transcription.processedAt
        }, null, 2), {
          headers: {
            'Content-Type': 'application/json',
            'Content-Disposition': `attachment; filename="${transcription.title}_full.json"`
          }
        });
      
      case 'clean':
      default:
        return new NextResponse(transcription.transcriptClean, {
          headers: {
            'Content-Type': 'text/plain',
            'Content-Disposition': `attachment; filename="${transcription.title}_clean.txt"`
          }
        });
    }
  } catch (error) {
    console.error('Transcript download error:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to download transcript' 
      },
      { status: 500 }
    );
  }
}