import { createClient } from '@deepgram/sdk';
import { Readable } from 'stream';

const deepgram = createClient(process.env.DEEPGRAM_API_KEY || '');

export interface TranscriptionResult {
  transcript: string;
  words: Array<{
    word: string;
    start: number;
    end: number;
    confidence: number;
  }>;
  duration: number;
}

export async function transcribeAudio(audioStream: Readable): Promise<TranscriptionResult> {
  try {
    const { result } = await deepgram.listen.prerecorded.transcribeFile(
      audioStream,
      {
        model: 'nova-2',
        smart_format: true,
        punctuate: true,
        utterances: true,
        language: 'en',
      }
    );

    if (!result || !result.results || !result.results.channels || result.results.channels.length === 0) {
      throw new Error('No transcription results returned from Deepgram');
    }

    const channel = result.results.channels[0];
    const alternative = channel.alternatives[0];

    if (!alternative) {
      throw new Error('No alternative transcription found');
    }

    return {
      transcript: alternative.transcript || '',
      words: alternative.words || [],
      duration: result.metadata?.duration || 0,
    };
  } catch (error) {
    console.error('Deepgram transcription error:', error);
    throw new Error('Failed to transcribe audio');
  }
}

export function formatTranscriptAsMarkdown(info: any, transcript: string): string {
  return `# ${info.title}

**Author:** ${info.author}  
**Duration:** ${Math.floor(info.length / 60)}:${(info.length % 60).toString().padStart(2, '0')}  
**URL:** ${info.url}

## Transcript

${transcript}

---
*Transcribed using Deepgram AI*
`;
}

export function formatTranscriptAsJSON(info: any, transcriptionResult: TranscriptionResult): object {
  return {
    video: {
      title: info.title,
      author: info.author,
      duration: info.length,
      url: info.url,
    },
    transcription: {
      text: transcriptionResult.transcript,
      words: transcriptionResult.words,
      duration: transcriptionResult.duration,
    },
    metadata: {
      transcribedAt: new Date().toISOString(),
      engine: 'Deepgram Nova-2',
    },
  };
}