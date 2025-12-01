'use client'

import { useState, useRef, useCallback } from 'react'
import { useLocale } from 'next-intl'
import { Mic, MicOff, Loader2, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface VoiceOrderButtonProps {
  onTranscript: (text: string) => void
  onRecordingStart?: () => void
  onRecordingEnd?: () => void
  isProcessing?: boolean
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

export function VoiceOrderButton({
  onTranscript,
  onRecordingStart,
  onRecordingEnd,
  isProcessing = false,
  className = '',
  size = 'lg',
}: VoiceOrderButtonProps) {
  const locale = useLocale()
  const [isRecording, setIsRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const sizeClasses = {
    sm: 'w-12 h-12',
    md: 'w-16 h-16',
    lg: 'w-20 h-20',
  }

  const iconSizes = {
    sm: 'w-5 h-5',
    md: 'w-7 h-7',
    lg: 'w-9 h-9',
  }

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 16000,
        }
      })

      streamRef.current = stream
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus',
      })

      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        await sendAudioToAPI(audioBlob)
      }

      mediaRecorder.start(100) // Collect data every 100ms
      setIsRecording(true)
      setRecordingTime(0)
      onRecordingStart?.()

      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => {
          // Auto-stop after 30 seconds
          if (prev >= 30) {
            stopRecording()
            return prev
          }
          return prev + 1
        })
      }, 1000)
    } catch (error) {
      console.error('Error accessing microphone:', error)
      alert(locale === 'ar'
        ? 'لم نتمكن من الوصول للميكروفون. يرجى السماح بالوصول من إعدادات المتصفح.'
        : 'Could not access microphone. Please allow microphone access in your browser settings.'
      )
    }
  }, [locale, onRecordingStart])

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()

      // Stop all tracks
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
        streamRef.current = null
      }

      // Clear timer
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }

      setIsRecording(false)
      onRecordingEnd?.()
    }
  }, [isRecording, onRecordingEnd])

  const cancelRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      // Don't process the audio
      mediaRecorderRef.current.ondataavailable = null
      mediaRecorderRef.current.onstop = null
      mediaRecorderRef.current.stop()

      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
        streamRef.current = null
      }

      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }

      audioChunksRef.current = []
      setIsRecording(false)
      setRecordingTime(0)
      onRecordingEnd?.()
    }
  }, [isRecording, onRecordingEnd])

  const sendAudioToAPI = async (audioBlob: Blob) => {
    try {
      const formData = new FormData()
      formData.append('audio', audioBlob, 'recording.webm')
      formData.append('locale', locale)

      const response = await fetch('/api/voice-order/transcribe', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        throw new Error('Transcription failed')
      }

      const data = await response.json()
      if (data.transcript) {
        onTranscript(data.transcript)
      }
    } catch (error) {
      console.error('Error sending audio:', error)
      alert(locale === 'ar'
        ? 'حدث خطأ في معالجة الصوت. يرجى المحاولة مرة أخرى.'
        : 'Error processing audio. Please try again.'
      )
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const handleClick = () => {
    if (isProcessing) return

    if (isRecording) {
      stopRecording()
    } else {
      startRecording()
    }
  }

  return (
    <div className={cn('flex flex-col items-center gap-2', className)}>
      {/* Recording Timer */}
      {isRecording && (
        <div className="flex items-center gap-2 text-red-500 animate-pulse">
          <span className="w-2 h-2 bg-red-500 rounded-full" />
          <span className="text-sm font-medium">{formatTime(recordingTime)}</span>
        </div>
      )}

      {/* Main Button */}
      <div className="relative">
        <button
          onClick={handleClick}
          disabled={isProcessing}
          className={cn(
            'rounded-full flex items-center justify-center transition-all duration-300',
            sizeClasses[size],
            isRecording
              ? 'bg-red-500 hover:bg-red-600 shadow-lg shadow-red-500/30 scale-110'
              : isProcessing
                ? 'bg-slate-300 cursor-not-allowed'
                : 'bg-primary hover:bg-primary/90 shadow-lg shadow-primary/30 hover:scale-105',
            'text-white'
          )}
        >
          {isProcessing ? (
            <Loader2 className={cn(iconSizes[size], 'animate-spin')} />
          ) : isRecording ? (
            <MicOff className={iconSizes[size]} />
          ) : (
            <Mic className={iconSizes[size]} />
          )}
        </button>

        {/* Cancel Button - Show when recording */}
        {isRecording && (
          <button
            onClick={cancelRecording}
            className="absolute -top-1 -end-1 w-6 h-6 bg-slate-600 hover:bg-slate-700 rounded-full flex items-center justify-center text-white shadow-md"
          >
            <X className="w-3 h-3" />
          </button>
        )}

        {/* Pulse Animation when recording */}
        {isRecording && (
          <>
            <span className="absolute inset-0 rounded-full bg-red-500 animate-ping opacity-25" />
            <span className="absolute inset-0 rounded-full bg-red-500 animate-pulse opacity-20" />
          </>
        )}
      </div>

      {/* Helper Text */}
      <p className="text-xs text-slate-500 text-center max-w-[150px]">
        {isProcessing
          ? (locale === 'ar' ? 'جاري المعالجة...' : 'Processing...')
          : isRecording
            ? (locale === 'ar' ? 'اضغط للإيقاف' : 'Tap to stop')
            : (locale === 'ar' ? 'اضغط للتحدث' : 'Tap to speak')
        }
      </p>
    </div>
  )
}
