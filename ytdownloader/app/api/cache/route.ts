import { NextRequest, NextResponse } from 'next/server';
import { listCachedTranscriptions, deleteCachedTranscription, cleanupOldCache } from '@/lib/cache';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    if (action === 'cleanup') {
      const maxAgeHours = parseInt(searchParams.get('maxAgeHours') || '168'); // Default 7 days
      const deletedCount = await cleanupOldCache(maxAgeHours);
      
      return NextResponse.json({
        success: true,
        deletedCount,
        message: `Cleaned up ${deletedCount} old cached transcriptions`
      });
    }

    // Default: list all cached transcriptions
    const cachedTranscriptions = await listCachedTranscriptions();
    
    return NextResponse.json({
      success: true,
      count: cachedTranscriptions.length,
      transcriptions: cachedTranscriptions
    });
  } catch (error) {
    console.error('Cache API error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to access cache' 
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const videoId = searchParams.get('videoId');

    if (!videoId) {
      return NextResponse.json(
        { success: false, error: 'videoId is required' }, 
        { status: 400 }
      );
    }

    const success = await deleteCachedTranscription(videoId);
    
    if (success) {
      return NextResponse.json({
        success: true,
        message: `Deleted cached transcription: ${videoId}`
      });
    } else {
      return NextResponse.json(
        { success: false, error: 'Failed to delete cached transcription' },
        { status: 404 }
      );
    }
  } catch (error) {
    console.error('Cache deletion error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to delete cached transcription' 
      },
      { status: 500 }
    );
  }
}