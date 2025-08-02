import { Readable } from 'stream';
import { spawn } from 'child_process';
import { promisify } from 'util';
import { exec } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const execAsync = promisify(exec);

export interface VideoInfo {
  title: string;
  author: string;
  length: number;
  thumbnail: string;
  description: string;
}

export async function getVideoInfo(url: string): Promise<VideoInfo> {
  try {
    // Use updated yt-dlp path
    const { stdout, stderr } = await execAsync(`/usr/local/bin/yt-dlp --dump-json --no-warnings "${url}"`);
    
    if (stderr) {
      console.warn('yt-dlp stderr:', stderr);
    }
    
    if (!stdout || !stdout.trim()) {
      throw new Error('No output from yt-dlp');
    }
    
    const info = JSON.parse(stdout.trim());

    return {
      title: info.title || 'Unknown Title',
      author: info.uploader || info.channel || 'Unknown Author',
      length: info.duration || 0,
      thumbnail: info.thumbnail || '',
      description: info.description || '',
    };
  } catch (error) {
    console.error('YouTube info extraction error:', error);
    if (error instanceof Error) {
      console.error('Error details:', error.message);
    }
    throw new Error('Failed to get video information. The video may be private, restricted, or the URL is invalid.');
  }
}

export async function downloadVideo(url: string): Promise<Readable> {
  try {
    const process = spawn('/usr/local/bin/yt-dlp', [
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
    // Create a temporary file for the audio
    const tempDir = os.tmpdir();
    const tempFile = path.join(tempDir, `yt-audio-${Date.now()}.%(ext)s`);
    
    console.log('Downloading audio to temporary file...');
    
    // Download audio to temporary file with updated path
    await execAsync(`/usr/local/bin/yt-dlp --format "bestaudio/best" --extract-audio --audio-format mp3 --output "${tempFile}" --no-warnings "${url}"`);
    
    // Find the actual file (yt-dlp will replace %(ext)s with mp3)
    const actualFile = tempFile.replace('.%(ext)s', '.mp3');
    
    console.log('Audio downloaded to:', actualFile);
    
    // Return a readable stream from the file
    return fs.createReadStream(actualFile);
  } catch (error) {
    console.error('YouTube audio download error:', error);
    throw new Error('Failed to download audio. The video may be private or restricted.');
  }
}