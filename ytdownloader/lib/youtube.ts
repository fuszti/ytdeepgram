import ytdl from 'ytdl-core';
import { Readable } from 'stream';

export interface VideoInfo {
  title: string;
  author: string;
  length: number;
  thumbnail: string;
  description: string;
}

export async function getVideoInfo(url: string): Promise<VideoInfo> {
  const info = await ytdl.getInfo(url);
  return {
    title: info.videoDetails.title,
    author: info.videoDetails.author.name,
    length: parseInt(info.videoDetails.lengthSeconds),
    thumbnail: info.videoDetails.thumbnails[info.videoDetails.thumbnails.length - 1].url,
    description: info.videoDetails.description || '',
  };
}

export async function downloadVideo(url: string): Promise<Readable> {
  return ytdl(url, { 
    quality: 'highest',
    filter: 'audioandvideo' 
  });
}

export async function downloadAudio(url: string): Promise<Readable> {
  return ytdl(url, { 
    quality: 'highestaudio',
    filter: 'audioonly' 
  });
}