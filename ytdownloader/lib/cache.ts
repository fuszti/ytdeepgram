import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { TranscriptionResult } from './deepgram';

export interface CachedTranscription {
  videoId: string;
  url: string;
  title: string;
  author: string;
  duration: number;
  processedAt: string;
  transcriptClean: string;
  transcriptTimestamped: string;
  words: Array<{
    word: string;
    start: number;
    end: number;
    confidence: number;
    punctuated_word?: string;
  }>;
  metadata: {
    deepgramDuration: number;
    chunkCount?: number;
    language?: string;
    detectedLanguage?: string;
  };
}

const DOWNLOADS_DIR = path.join(process.cwd(), 'downloads');

export function generateVideoId(url: string): string {
  const hash = crypto.createHash('sha256');
  hash.update(url);
  return hash.digest('hex').substring(0, 16);
}

export function getCacheFilePath(videoId: string): string {
  return path.join(DOWNLOADS_DIR, `${videoId}.json`);
}

export async function ensureDownloadsDir(): Promise<void> {
  try {
    await fs.promises.mkdir(DOWNLOADS_DIR, { recursive: true });
  } catch (error) {
    console.error('Failed to create downloads directory:', error);
    throw new Error('Could not create downloads directory');
  }
}

export async function isCached(url: string): Promise<boolean> {
  const videoId = generateVideoId(url);
  const cachePath = getCacheFilePath(videoId);
  
  try {
    await fs.promises.access(cachePath, fs.constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

export async function getCachedTranscription(url: string): Promise<CachedTranscription | null> {
  const videoId = generateVideoId(url);
  const cachePath = getCacheFilePath(videoId);
  
  try {
    const data = await fs.promises.readFile(cachePath, 'utf-8');
    return JSON.parse(data) as CachedTranscription;
  } catch (error) {
    console.error('Failed to read cached transcription:', error);
    return null;
  }
}

export function formatTimestampedTranscript(words: Array<{
  word: string;
  start: number;
  end: number;
  confidence: number;
  punctuated_word?: string;
}>): string {
  if (!words || words.length === 0) {
    return '';
  }

  let result = '';
  let currentParagraphStart = 0;
  
  words.forEach((word, index) => {
    const timeDisplay = formatTimestamp(word.start);
    const wordText = word.punctuated_word || word.word;
    
    if (index === 0 || word.start - words[currentParagraphStart].start > 30) {
      if (index > 0) result += '\n\n';
      result += `[${timeDisplay}] `;
      currentParagraphStart = index;
    }
    
    result += wordText;
    
    if (index < words.length - 1) {
      result += ' ';
    }
  });
  
  return result;
}

export function formatTimestamp(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  } else {
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }
}

export async function saveTranscriptionToCache(
  url: string,
  videoInfo: any,
  transcriptionResult: TranscriptionResult,
  language?: string,
  chunkCount?: number
): Promise<string> {
  await ensureDownloadsDir();
  
  const videoId = generateVideoId(url);
  const cachePath = getCacheFilePath(videoId);
  
  const timestampedTranscript = formatTimestampedTranscript(transcriptionResult.words);
  
  const cachedData: CachedTranscription = {
    videoId,
    url,
    title: videoInfo.title,
    author: videoInfo.author,
    duration: videoInfo.length,
    processedAt: new Date().toISOString(),
    transcriptClean: transcriptionResult.transcript,
    transcriptTimestamped: timestampedTranscript,
    words: transcriptionResult.words,
    metadata: {
      deepgramDuration: transcriptionResult.duration,
      chunkCount,
      language,
      detectedLanguage: language
    }
  };
  
  try {
    await fs.promises.writeFile(cachePath, JSON.stringify(cachedData, null, 2), 'utf-8');
    console.log(`Transcription cached to: ${cachePath}`);
    return videoId;
  } catch (error) {
    console.error('Failed to save transcription to cache:', error);
    throw new Error('Could not save transcription to cache');
  }
}

export async function listCachedTranscriptions(): Promise<CachedTranscription[]> {
  await ensureDownloadsDir();
  
  try {
    const files = await fs.promises.readdir(DOWNLOADS_DIR);
    const jsonFiles = files.filter(file => file.endsWith('.json'));
    
    const transcriptions: CachedTranscription[] = [];
    
    for (const file of jsonFiles) {
      try {
        const filePath = path.join(DOWNLOADS_DIR, file);
        const data = await fs.promises.readFile(filePath, 'utf-8');
        const cached = JSON.parse(data) as CachedTranscription;
        transcriptions.push(cached);
      } catch (error) {
        console.warn(`Failed to read cached transcription ${file}:`, error);
      }
    }
    
    return transcriptions.sort((a, b) => 
      new Date(b.processedAt).getTime() - new Date(a.processedAt).getTime()
    );
  } catch (error) {
    console.error('Failed to list cached transcriptions:', error);
    return [];
  }
}

export async function deleteCachedTranscription(videoId: string): Promise<boolean> {
  const cachePath = getCacheFilePath(videoId);
  
  try {
    await fs.promises.unlink(cachePath);
    console.log(`Deleted cached transcription: ${videoId}`);
    return true;
  } catch (error) {
    console.error('Failed to delete cached transcription:', error);
    return false;
  }
}

export async function cleanupOldCache(maxAgeHours: number = 24 * 7): Promise<number> {
  const transcriptions = await listCachedTranscriptions();
  const cutoffTime = new Date(Date.now() - (maxAgeHours * 60 * 60 * 1000));
  
  let deletedCount = 0;
  
  for (const transcription of transcriptions) {
    const processedAt = new Date(transcription.processedAt);
    if (processedAt < cutoffTime) {
      const deleted = await deleteCachedTranscription(transcription.videoId);
      if (deleted) {
        deletedCount++;
      }
    }
  }
  
  console.log(`Cleaned up ${deletedCount} old cached transcriptions`);
  return deletedCount;
}