import { NextRequest, NextResponse } from 'next/server';
import { getVideoInfo, downloadVideo, downloadAudio } from '@/lib/youtube';
import { transcribeAudio, formatTranscriptAsMarkdown, formatTranscriptAsJSON } from '@/lib/deepgram';
import { Readable } from 'stream';

async function streamToBuffer(stream: Readable): Promise<Buffer> {
  const chunks: Buffer[] = [];
  return new Promise((resolve, reject) => {
    stream.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
    stream.on('error', (err) => reject(err));
    stream.on('end', () => resolve(Buffer.concat(chunks)));
  });
}

export async function POST(request: NextRequest) {
  try {
    const { url, type } = await request.json();

    if (!url || !type) {
      return NextResponse.json({ error: 'URL and type are required' }, { status: 400 });
    }

    const videoInfo = await getVideoInfo(url);

    switch (type) {
      case 'video': {
        const videoStream = await downloadVideo(url);
        const buffer = await streamToBuffer(videoStream);
        return new NextResponse(buffer as unknown as BodyInit, {
          headers: {
            'Content-Type': 'video/mp4',
            'Content-Disposition': `attachment; filename="${videoInfo.title.replace(/[^a-z0-9]/gi, '_')}.mp4"`,
          },
        });
      }

      case 'audio': {
        const audioStream = await downloadAudio(url);
        const buffer = await streamToBuffer(audioStream);
        return new NextResponse(buffer as unknown as BodyInit, {
          headers: {
            'Content-Type': 'audio/mpeg',
            'Content-Disposition': `attachment; filename="${videoInfo.title.replace(/[^a-z0-9]/gi, '_')}.mp3"`,
          },
        });
      }

      case 'transcript-md': {
        const audioStream = await downloadAudio(url);
        const transcriptionResult = await transcribeAudio(audioStream);
        const markdown = formatTranscriptAsMarkdown(
          { ...videoInfo, url },
          transcriptionResult.transcript
        );
        return new NextResponse(markdown, {
          headers: {
            'Content-Type': 'text/markdown',
            'Content-Disposition': `attachment; filename="${videoInfo.title.replace(/[^a-z0-9]/gi, '_')}_transcript.md"`,
          },
        });
      }

      case 'transcript-json': {
        const audioStream = await downloadAudio(url);
        const transcriptionResult = await transcribeAudio(audioStream);
        const json = formatTranscriptAsJSON(
          { ...videoInfo, url },
          transcriptionResult
        );
        return new NextResponse(JSON.stringify(json, null, 2), {
          headers: {
            'Content-Type': 'application/json',
            'Content-Disposition': `attachment; filename="${videoInfo.title.replace(/[^a-z0-9]/gi, '_')}_transcript.json"`,
          },
        });
      }

      default:
        return NextResponse.json({ error: 'Invalid download type' }, { status: 400 });
    }
  } catch (error) {
    console.error('Download error:', error);
    return NextResponse.json(
      { error: 'Failed to download' },
      { status: 500 }
    );
  }
}