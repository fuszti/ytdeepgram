import { createClient } from '@deepgram/sdk';
import { Readable } from 'stream';
import * as fs from 'fs';

const deepgram = createClient(process.env.DEEPGRAM_API_KEY || '');

export interface TranscriptionResult {
  transcript: string;
  words: Array<{
    word: string;
    start: number;
    end: number;
    confidence: number;
    punctuated_word?: string;
  }>;
  duration: number;
}

export async function transcribeAudio(audioStream: Readable, language?: string): Promise<TranscriptionResult> {
  try {
    const options: any = {
      model: 'base',
      smart_format: true,
      punctuate: true,
      utterances: true,
      detect_language: true,
    };

    // If a specific language is requested, use it
    if (language) {
      options.language = language;
      // Don't use detect_language if we specify a language
      delete options.detect_language;
    }

    console.log('Deepgram options:', options);

    const { result } = await deepgram.listen.prerecorded.transcribeFile(
      audioStream,
      options
    );

    if (!result || !result.results || !result.results.channels || result.results.channels.length === 0) {
      throw new Error('No transcription results returned from Deepgram');
    }

    const channel = result.results.channels[0];
    const alternative = channel.alternatives[0];

    if (!alternative) {
      throw new Error('No alternative transcription found');
    }

    // Log detected language and confidence
    console.log('Detected language:', channel?.detected_language);
    console.log('Language confidence:', channel?.language_confidence);
    console.log('Model info:', result.metadata?.model_info);
    console.log('Transcript length:', alternative.transcript?.length);
    console.log('Words count:', alternative.words?.length);

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

export interface ChunkTranscription {
  chunk: {
    path: string;
    startTime: number;
    duration: number;
  };
  transcription: TranscriptionResult;
}

export async function transcribeAudioChunks(
  chunks: Array<{ path: string; startTime: number; duration: number }>, 
  language?: string
): Promise<TranscriptionResult> {
  try {
    const chunkTranscriptions: ChunkTranscription[] = [];
    
    console.log(`Transcribing ${chunks.length} audio chunks...`);
    
    // Process each chunk sequentially to avoid hitting concurrent request limits
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      console.log(`Transcribing chunk ${i + 1}/${chunks.length}...`);
      
      // Create a stream from the chunk file
      const audioStream = fs.createReadStream(chunk.path);
      
      // Transcribe the chunk
      const transcription = await transcribeAudio(audioStream, language);
      
      // Adjust word timestamps to account for chunk offset
      if (transcription.words) {
        transcription.words = transcription.words.map(word => ({
          ...word,
          start: word.start + chunk.startTime,
          end: word.end + chunk.startTime
        }));
      }
      
      chunkTranscriptions.push({
        chunk,
        transcription
      });
      
      // Clean up the chunk file after transcription
      try {
        await fs.promises.unlink(chunk.path);
      } catch (error) {
        console.warn(`Failed to delete chunk file ${chunk.path}:`, error);
      }
    }
    
    // Merge all transcriptions
    const mergedTranscript = chunkTranscriptions
      .map(ct => ct.transcription.transcript)
      .join(' ');
    
    const mergedWords = chunkTranscriptions
      .flatMap(ct => ct.transcription.words || []);
    
    const totalDuration = chunks.reduce((sum, chunk) => sum + chunk.duration, 0);
    
    console.log('All chunks transcribed and merged successfully');
    
    return {
      transcript: mergedTranscript,
      words: mergedWords,
      duration: totalDuration
    };
  } catch (error) {
    console.error('Error transcribing audio chunks:', error);
    throw new Error('Failed to transcribe audio chunks');
  }
}