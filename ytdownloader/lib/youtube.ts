import youtubeDl from 'youtube-dl-exec';
import { Readable } from 'stream';
import { spawn } from 'child_process';

export interface VideoInfo {
  title: string;
  author: string;
  length: number;
  thumbnail: string;
  description: string;
}

export async function getVideoInfo(url: string): Promise<VideoInfo> {
  try {
    const info = await youtubeDl(url, {
      dumpSingleJson: true,
      noCheckCertificates: true,
      noWarnings: true,
      preferFreeFormats: true,
      addHeader: ['referer:youtube.com', 'user-agent:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36']
    }) as any;

    return {
      title: info.title || 'Unknown Title',
      author: info.uploader || info.channel || 'Unknown Author',
      length: info.duration || 0,
      thumbnail: info.thumbnail || '',
      description: info.description || '',
    };
  } catch (error) {
    console.error('YouTube info extraction error:', error);
    throw new Error('Failed to get video information. The video may be private, restricted, or the URL is invalid.');
  }
}

export async function downloadVideo(url: string): Promise<Readable> {
  try {
    const process = spawn('yt-dlp', [
      '--format', 'best[ext=mp4]',
      '--output', '-',
      '--quiet',
      '--no-warnings',
      url
    ]);

    return process.stdout as Readable;
  } catch (error) {
    console.error('YouTube video download error:', error);
    throw new Error('Failed to download video. The video may be private or restricted.');
  }
}

export async function downloadAudio(url: string): Promise<Readable> {
  try {
    const process = spawn('yt-dlp', [
      '--format', 'bestaudio',
      '--extract-audio',
      '--audio-format', 'mp3',
      '--output', '-',
      '--quiet',
      '--no-warnings',
      url
    ]);

    return process.stdout as Readable;
  } catch (error) {
    console.error('YouTube audio download error:', error);
    throw new Error('Failed to download audio. The video may be private or restricted.');
  }
}