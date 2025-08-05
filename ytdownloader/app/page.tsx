'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, FileText, Music, Video, Loader2, AlertCircle, Clock, CheckCircle } from 'lucide-react';

interface ProcessingState {
  isProcessing: boolean;
  status: string;
  videoInfo: any;
  transcript: string;
  transcriptTimestamped: string;
  error: string | null;
  cached: boolean;
  processedAt?: string;
  videoId?: string;
}

export default function Home() {
  const [url, setUrl] = useState('');
  const [language, setLanguage] = useState('');
  const [transcriptView, setTranscriptView] = useState<'clean' | 'timestamped'>('clean');
  const [state, setState] = useState<ProcessingState>({
    isProcessing: false,
    status: '',
    videoInfo: null,
    transcript: '',
    transcriptTimestamped: '',
    error: null,
    cached: false,
  });

  const validateYouTubeUrl = (url: string): boolean => {
    const patterns = [
      /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)[\w-]+/,
      /^(https?:\/\/)?(www\.)?youtube\.com\/embed\/[\w-]+/,
    ];
    return patterns.some(pattern => pattern.test(url));
  };

  const handleProcess = async () => {
    if (!url.trim()) {
      setState(prev => ({ ...prev, error: 'Please enter a YouTube URL' }));
      return;
    }

    if (!validateYouTubeUrl(url)) {
      setState(prev => ({ ...prev, error: 'Please enter a valid YouTube URL' }));
      return;
    }

    setState({
      isProcessing: true,
      status: 'Checking cache and fetching video information...',
      videoInfo: null,
      transcript: '',
      transcriptTimestamped: '',
      error: null,
      cached: false,
    });

    try {
      const response = await fetch('/api/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, language }),
      });

      if (!response.ok) {
        throw new Error('Failed to process video');
      }

      const data = await response.json();
      setState(prev => ({
        ...prev,
        isProcessing: false,
        videoInfo: data.videoInfo,
        transcript: data.transcript,
        transcriptTimestamped: data.transcriptTimestamped || '',
        cached: data.cached || false,
        processedAt: data.processedAt,
        videoId: data.videoId,
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        isProcessing: false,
        error: error instanceof Error ? error.message : 'An error occurred',
      }));
    }
  };

  const handleDownload = async (type: 'video' | 'audio' | 'transcript-md' | 'transcript-json') => {
    try {
      const response = await fetch('/api/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, type }),
      });

      if (!response.ok) throw new Error('Download failed');

      const blob = await response.blob();
      const downloadUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      
      const filename = state.videoInfo?.title?.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'download';
      const extensions: Record<string, string> = {
        'video': 'mp4',
        'audio': 'mp3',
        'transcript-md': 'md',
        'transcript-json': 'json',
      };
      
      a.download = `${filename}.${extensions[type]}`;
      a.click();
      URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: 'Download failed. Please try again.',
      }));
    }
  };

  const handleTranscriptDownload = async (format: 'clean' | 'timestamped' | 'json') => {
    try {
      const params = new URLSearchParams({ url, format });
      const response = await fetch(`/api/transcript?${params}`);

      if (!response.ok) throw new Error('Transcript download failed');

      const blob = await response.blob();
      const downloadUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      
      const filename = state.videoInfo?.title?.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'transcript';
      const extensions = {
        'clean': 'txt',
        'timestamped': 'txt',
        'json': 'json'
      };
      
      a.download = `${filename}_${format}.${extensions[format]}`;
      a.click();
      URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: 'Transcript download failed. Please try again.',
      }));
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white">
      <div className="container mx-auto px-4 py-16 max-w-4xl">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-blue-400 to-purple-600 bg-clip-text text-transparent">
            YouTube Downloader & Transcriber
          </h1>
          <p className="text-gray-300 text-lg">
            Download videos, extract audio, and get AI-powered transcriptions
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-8 shadow-2xl"
        >
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium mb-2">YouTube URL</label>
              <div className="flex gap-3">
                <input
                  type="text"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=..."
                  className="flex-1 px-4 py-3 bg-gray-700/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  disabled={state.isProcessing}
                />
                <button
                  onClick={handleProcess}
                  disabled={state.isProcessing}
                  className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg font-medium hover:from-blue-600 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {state.isProcessing ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    'Process'
                  )}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Language (Optional)</label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="w-full px-4 py-3 bg-gray-700/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                disabled={state.isProcessing}
              >
                <option value="">Auto-detect</option>
                <option value="en">English</option>
                <option value="hu">Hungarian</option>
                <option value="es">Spanish</option>
                <option value="fr">French</option>
                <option value="de">German</option>
                <option value="it">Italian</option>
                <option value="pt">Portuguese</option>
                <option value="ru">Russian</option>
                <option value="ja">Japanese</option>
                <option value="ko">Korean</option>
                <option value="zh">Chinese</option>
                <option value="nl">Dutch</option>
                <option value="pl">Polish</option>
                <option value="cs">Czech</option>
                <option value="tr">Turkish</option>
                <option value="ar">Arabic</option>
                <option value="ro">Romanian</option>
                <option value="sv">Swedish</option>
                <option value="da">Danish</option>
                <option value="no">Norwegian</option>
                <option value="fi">Finnish</option>
                <option value="uk">Ukrainian</option>
                <option value="el">Greek</option>
                <option value="he">Hebrew</option>
                <option value="hi">Hindi</option>
                <option value="th">Thai</option>
                <option value="id">Indonesian</option>
                <option value="ms">Malay</option>
                <option value="vi">Vietnamese</option>
              </select>
            </div>

            <AnimatePresence>
              {state.error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="flex items-center gap-2 text-red-400 bg-red-900/20 p-3 rounded-lg"
                >
                  <AlertCircle className="w-5 h-5" />
                  <span>{state.error}</span>
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {state.isProcessing && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-center py-12"
                >
                  <div className="loading-gradient w-20 h-20 rounded-full mx-auto mb-4 animate-pulse-slow" />
                  <p className="text-gray-300">{state.status}</p>
                </motion.div>
              )}
            </AnimatePresence>

            {state.videoInfo && !state.isProcessing && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                <div className="bg-gray-700/30 rounded-lg p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-xl font-semibold mb-2">{state.videoInfo.title}</h3>
                      <p className="text-gray-300 mb-2">by {state.videoInfo.author}</p>
                      {state.cached && (
                        <div className="flex items-center gap-2 text-green-400 text-sm">
                          <CheckCircle className="w-4 h-4" />
                          <span>Loaded from cache</span>
                          {state.processedAt && (
                            <span className="text-gray-400">
                              • {new Date(state.processedAt).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      )}
                      {!state.cached && (
                        <div className="flex items-center gap-2 text-blue-400 text-sm">
                          <Clock className="w-4 h-4" />
                          <span>Freshly processed</span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-sm font-medium text-gray-300 mb-2">Media Downloads</h4>
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          onClick={() => handleDownload('video')}
                          className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                        >
                          <Video className="w-4 h-4" />
                          <span>Video</span>
                        </button>
                        <button
                          onClick={() => handleDownload('audio')}
                          className="flex items-center justify-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg transition-colors"
                        >
                          <Music className="w-4 h-4" />
                          <span>Audio</span>
                        </button>
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="text-sm font-medium text-gray-300 mb-2">Transcript Downloads</h4>
                      <div className="grid grid-cols-3 gap-3">
                        <button
                          onClick={() => handleTranscriptDownload('clean')}
                          className="flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors"
                        >
                          <FileText className="w-4 h-4" />
                          <span>Clean Text</span>
                        </button>
                        <button
                          onClick={() => handleTranscriptDownload('timestamped')}
                          className="flex items-center justify-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 rounded-lg transition-colors"
                        >
                          <Clock className="w-4 h-4" />
                          <span>Timestamped</span>
                        </button>
                        <button
                          onClick={() => handleTranscriptDownload('json')}
                          className="flex items-center justify-center gap-2 px-4 py-2 bg-yellow-600 hover:bg-yellow-700 rounded-lg transition-colors"
                        >
                          <FileText className="w-4 h-4" />
                          <span>Full JSON</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {state.transcript && (
                  <div className="bg-gray-700/30 rounded-lg p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-xl font-semibold flex items-center gap-2">
                        <FileText className="w-5 h-5" />
                        Transcript
                      </h3>
                      
                      <div className="flex bg-gray-600 rounded-lg p-1">
                        <button
                          onClick={() => setTranscriptView('clean')}
                          className={`px-3 py-1 rounded-md text-sm transition-colors ${
                            transcriptView === 'clean'
                              ? 'bg-purple-600 text-white'
                              : 'text-gray-300 hover:text-white'
                          }`}
                        >
                          Clean
                        </button>
                        <button
                          onClick={() => setTranscriptView('timestamped')}
                          className={`px-3 py-1 rounded-md text-sm transition-colors ${
                            transcriptView === 'timestamped'
                              ? 'bg-orange-600 text-white'
                              : 'text-gray-300 hover:text-white'
                          }`}
                          disabled={!state.transcriptTimestamped}
                        >
                          Timestamped
                        </button>
                      </div>
                    </div>
                    
                    <div className="bg-gray-800/50 rounded-lg p-4 max-h-96 overflow-y-auto">
                      <pre className="whitespace-pre-wrap text-gray-300 text-sm">
                        {transcriptView === 'clean' 
                          ? state.transcript 
                          : state.transcriptTimestamped || 'Timestamped transcript not available'
                        }
                      </pre>
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </div>
        </motion.div>
      </div>
    </main>
  );
}