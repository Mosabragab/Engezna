'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useLocale } from 'next-intl';
import { cn } from '@/lib/utils';
import {
  Mic,
  Square,
  Play,
  Pause,
  Trash2,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Loader2,
  WifiOff,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { useVoiceCache, generateVoiceId, getAudioDuration } from '@/lib/offline/voice-cache';
import type { VoiceOrderInputProps } from '@/types/custom-order';
import { MAX_VOICE_DURATION_SECONDS } from '@/types/custom-order';

interface ExtendedVoiceOrderInputProps extends VoiceOrderInputProps {
  className?: string;
  providerId: string;
}

type RecordingState = 'idle' | 'recording' | 'recorded' | 'playing' | 'uploading' | 'error';

export function VoiceOrderInput({
  onRecordingComplete,
  onError,
  maxDuration = MAX_VOICE_DURATION_SECONDS,
  disabled = false,
  className,
  providerId,
}: ExtendedVoiceOrderInputProps) {
  const locale = useLocale();
  const isRTL = locale === 'ar';

  // Recording state
  const [state, setState] = useState<RecordingState>('idle');
  const [duration, setDuration] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  // Refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const analyzerRef = useRef<AnalyserNode | null>(null);
  const animationRef = useRef<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Voice cache for offline support
  const { storeRecording, isReady: cacheReady } = useVoiceCache();

  // Online/offline status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  // Draw visualizer
  const drawVisualizer = useCallback(() => {
    const canvas = canvasRef.current;
    const analyzer = analyzerRef.current;

    if (!canvas || !analyzer) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const draw = () => {
      if (state !== 'recording') return;

      animationRef.current = requestAnimationFrame(draw);

      const bufferLength = analyzer.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      analyzer.getByteFrequencyData(dataArray);

      ctx.fillStyle = '#f1f5f9';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const barWidth = (canvas.width / bufferLength) * 2.5;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const barHeight = (dataArray[i] / 255) * canvas.height * 0.8;

        // Gradient from primary to primary-light
        const gradient = ctx.createLinearGradient(0, canvas.height - barHeight, 0, canvas.height);
        gradient.addColorStop(0, '#2563eb');
        gradient.addColorStop(1, '#60a5fa');
        ctx.fillStyle = gradient;

        ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
        x += barWidth + 1;
      }
    };

    draw();
  }, [state]);

  // Start recording
  const startRecording = async () => {
    try {
      setErrorMessage(null);
      audioChunksRef.current = [];

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Setup analyzer for visualizer
      const audioContext = new AudioContext();
      const source = audioContext.createMediaStreamSource(stream);
      const analyzer = audioContext.createAnalyser();
      analyzer.fftSize = 256;
      source.connect(analyzer);
      analyzerRef.current = analyzer;

      // Setup MediaRecorder
      const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4';

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const blob = new Blob(audioChunksRef.current, { type: mimeType });
        setAudioBlob(blob);

        const url = URL.createObjectURL(blob);
        setAudioUrl(url);

        // Get duration
        try {
          const audioDuration = await getAudioDuration(blob);
          setDuration(Math.round(audioDuration));
        } catch {
          // Use timer duration as fallback
        }

        // Stop all tracks
        stream.getTracks().forEach((track) => track.stop());

        // Close audio context
        audioContext.close();

        setState('recorded');
      };

      // Start recording
      mediaRecorder.start(100); // Collect data every 100ms
      setState('recording');
      setDuration(0);

      // Start timer
      timerRef.current = setInterval(() => {
        setDuration((d) => {
          const newDuration = d + 1;
          if (newDuration >= maxDuration) {
            stopRecording();
          }
          return newDuration;
        });
      }, 1000);

      // Start visualizer
      drawVisualizer();
    } catch (error) {
      console.error('Error starting recording:', error);
      const message = isRTL
        ? 'لم نتمكن من الوصول للميكروفون. تأكد من إعطاء الإذن.'
        : 'Could not access microphone. Please grant permission.';
      setErrorMessage(message);
      onError(message);
      setState('error');
    }
  };

  // Stop recording
  const stopRecording = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
  };

  // Play/pause recorded audio
  const togglePlayback = () => {
    if (!audioRef.current || !audioUrl) return;

    if (state === 'playing') {
      audioRef.current.pause();
      setState('recorded');
    } else {
      audioRef.current.play();
      setState('playing');
    }
  };

  // Delete recording
  const deleteRecording = () => {
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
    setAudioBlob(null);
    setAudioUrl(null);
    setDuration(0);
    setState('idle');
  };

  // Confirm and submit recording
  const confirmRecording = async () => {
    if (!audioBlob) return;

    setState('uploading');

    try {
      // Cache the recording for offline support
      if (cacheReady) {
        const voiceId = generateVoiceId();
        await storeRecording(voiceId, audioBlob, providerId);
      }

      // Pass to parent
      onRecordingComplete(audioBlob);
    } catch (error) {
      console.error('Error saving recording:', error);
      const message = isRTL ? 'حدث خطأ أثناء حفظ التسجيل' : 'Error saving recording';
      setErrorMessage(message);
      onError(message);
      setState('error');
    }
  };

  // Format duration
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Progress percentage
  const progressPercent = (duration / maxDuration) * 100;

  return (
    <div className={cn('flex flex-col gap-4', className)}>
      {/* Offline Warning */}
      <AnimatePresence>
        {!isOnline && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl p-3"
          >
            <WifiOff className="w-4 h-4 text-amber-600" />
            <span className="text-sm text-amber-700">
              {isRTL
                ? 'أنت غير متصل بالإنترنت. سيتم حفظ التسجيل ورفعه لاحقاً.'
                : 'You are offline. Recording will be saved and uploaded later.'}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Recording Area */}
      <div
        className={cn(
          'relative bg-white rounded-2xl border-2 p-6 transition-all duration-200',
          state === 'recording'
            ? 'border-red-400 shadow-lg shadow-red-100'
            : state === 'recorded' || state === 'playing'
              ? 'border-primary shadow-lg shadow-primary/10'
              : 'border-slate-200',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
      >
        {/* Visualizer */}
        <div className="mb-4 h-20 bg-slate-50 rounded-xl overflow-hidden">
          {state === 'recording' ? (
            <canvas ref={canvasRef} width={300} height={80} className="w-full h-full" />
          ) : state === 'recorded' || state === 'playing' ? (
            <div className="w-full h-full flex items-center justify-center gap-1">
              {Array.from({ length: 30 }).map((_, i) => {
                // Pre-compute random values to avoid impure function calls during render
                const randomHeight = 8 + ((i * 1.2) % 32);
                const animatedHeight = [8, 20 + ((i * 1.5) % 40), 8];
                return (
                  <motion.div
                    key={i}
                    className="w-1.5 bg-primary rounded-full"
                    animate={{
                      height: state === 'playing' ? animatedHeight : randomHeight,
                    }}
                    transition={{
                      duration: state === 'playing' ? 0.3 : 0,
                      repeat: state === 'playing' ? Infinity : 0,
                      ease: 'easeInOut',
                    }}
                  />
                );
              })}
            </div>
          ) : (
            <div className="w-full h-full flex items-center justify-center text-slate-400">
              <Mic className="w-8 h-8" />
            </div>
          )}
        </div>

        {/* Duration & Progress */}
        <div className="flex items-center justify-between mb-4">
          <span className="text-2xl font-mono font-bold text-slate-800">
            {formatDuration(duration)}
          </span>
          <span className="text-sm text-slate-400">
            {isRTL ? 'الحد الأقصى' : 'Max'}: {formatDuration(maxDuration)}
          </span>
        </div>

        {/* Progress Bar */}
        {state === 'recording' && (
          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden mb-4">
            <motion.div
              className={cn(
                'h-full rounded-full',
                progressPercent > 80 ? 'bg-red-500' : 'bg-primary'
              )}
              initial={{ width: 0 }}
              animate={{ width: `${progressPercent}%` }}
            />
          </div>
        )}

        {/* Controls */}
        <div className="flex items-center justify-center gap-4">
          {state === 'idle' && (
            <Button
              size="lg"
              onClick={startRecording}
              disabled={disabled}
              className="h-16 w-16 rounded-full bg-red-500 hover:bg-red-600 shadow-lg shadow-red-200"
            >
              <Mic className="w-7 h-7" />
            </Button>
          )}

          {state === 'recording' && (
            <Button
              size="lg"
              onClick={stopRecording}
              className="h-16 w-16 rounded-full bg-red-500 hover:bg-red-600 animate-pulse"
            >
              <Square className="w-6 h-6 fill-white" />
            </Button>
          )}

          {(state === 'recorded' || state === 'playing') && (
            <>
              {/* Delete */}
              <Button
                size="icon"
                variant="outline"
                onClick={deleteRecording}
                className="h-12 w-12 rounded-full border-red-200 text-red-500 hover:bg-red-50"
              >
                <Trash2 className="w-5 h-5" />
              </Button>

              {/* Play/Pause */}
              <Button size="lg" onClick={togglePlayback} className="h-16 w-16 rounded-full">
                {state === 'playing' ? (
                  <Pause className="w-7 h-7" />
                ) : (
                  <Play className="w-7 h-7 ms-1" />
                )}
              </Button>

              {/* Confirm */}
              <Button
                size="icon"
                onClick={confirmRecording}
                className="h-12 w-12 rounded-full bg-emerald-500 hover:bg-emerald-600"
              >
                <CheckCircle className="w-5 h-5" />
              </Button>
            </>
          )}

          {state === 'uploading' && (
            <Button size="lg" disabled className="h-16 w-16 rounded-full">
              <Loader2 className="w-7 h-7 animate-spin" />
            </Button>
          )}

          {state === 'error' && (
            <Button
              size="lg"
              onClick={() => setState('idle')}
              variant="outline"
              className="h-16 w-16 rounded-full border-red-200 text-red-500"
            >
              <RefreshCw className="w-6 h-6" />
            </Button>
          )}
        </div>

        {/* Hidden Audio Element */}
        {audioUrl && <audio ref={audioRef} src={audioUrl} onEnded={() => setState('recorded')} />}
      </div>

      {/* Error Message */}
      <AnimatePresence>
        {errorMessage && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl p-3"
          >
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span className="text-sm text-red-700">{errorMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Instructions */}
      {state === 'idle' && (
        <p className="text-center text-sm text-slate-500">
          {isRTL
            ? 'اضغط على زر الميكروفون لبدء التسجيل الصوتي'
            : 'Press the microphone button to start recording'}
        </p>
      )}

      {state === 'recording' && (
        <p className="text-center text-sm text-red-500 font-medium animate-pulse">
          {isRTL ? '🔴 جارٍ التسجيل...' : '🔴 Recording...'}
        </p>
      )}

      {state === 'recorded' && (
        <p className="text-center text-sm text-slate-500">
          {isRTL ? 'استمع للتسجيل أو أعد التسجيل أو أكد' : 'Listen, re-record, or confirm'}
        </p>
      )}
    </div>
  );
}
