'use client'

import React, { useRef, useState, useEffect } from 'react'
import { PlayIcon, PauseIcon } from '@heroicons/react/24/solid'

interface VoiceNoteProps {
  url: string
  mine?: boolean
}

export function VoiceNote({ url, mine = false }: VoiceNoteProps) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [playing, setPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [duration, setDuration] = useState(0)
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState(false)

  useEffect(() => {
    const el = audioRef.current
    if (!el) return
    const onMeta = () => { setDuration(el.duration || 0); setLoaded(true); setError(false) }
    const onUpdate = () => setProgress(el.currentTime / (el.duration || 1))
    const onEnded = () => { setPlaying(false); setProgress(0) }
    const onError = () => { setError(true); setLoaded(false) }
    el.addEventListener('loadedmetadata', onMeta)
    el.addEventListener('timeupdate', onUpdate)
    el.addEventListener('ended', onEnded)
    el.addEventListener('error', onError)
    // Force load on iOS — preload alone can be ignored
    el.load()
    return () => {
      el.removeEventListener('loadedmetadata', onMeta)
      el.removeEventListener('timeupdate', onUpdate)
      el.removeEventListener('ended', onEnded)
      el.removeEventListener('error', onError)
    }
  }, [url])

  const toggle = async () => {
    const el = audioRef.current
    if (!el) return
    if (playing) {
      el.pause()
      setPlaying(false)
    } else {
      try {
        await el.play()
        setPlaying(true)
      } catch (err) {
        console.warn('[VoiceNote] play() failed:', err)
        setError(true)
      }
    }
  }

  const seek = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = audioRef.current
    if (!el) return
    const rect = e.currentTarget.getBoundingClientRect()
    const ratio = (e.clientX - rect.left) / rect.width
    el.currentTime = ratio * (el.duration || 0)
    setProgress(ratio)
  }

  const fmt = (s: number) => {
    if (!s || isNaN(s) || !isFinite(s)) return '0:00'
    const m = Math.floor(s / 60)
    const sec = Math.floor(s % 60).toString().padStart(2, '0')
    return `${m}:${sec}`
  }

  // 20 waveform bars with varied heights
  const bars = [0.3, 0.6, 0.9, 0.7, 0.5, 0.8, 0.4, 1.0, 0.6, 0.3,
                0.7, 0.5, 0.9, 0.4, 0.8, 0.6, 0.3, 0.7, 0.5, 0.4]

  return (
    <div className={`flex items-center gap-2.5 px-3 py-2.5 rounded-[20px] min-w-[200px] max-w-[260px] ${
      mine
        ? 'bg-blue-600 text-white'
        : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100'
    }`}>
      {/* Native audio element */}
      <audio ref={audioRef} src={url} preload="metadata" playsInline />

      {/* Play/Pause */}
      <button
        onClick={toggle}
        className={`w-9 h-9 flex-none rounded-full flex items-center justify-center shadow-sm ${
          mine
            ? 'bg-white/20 text-white'
            : 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-600'
        }`}
        aria-label={playing ? 'Pause' : 'Play'}
      >
        {error ? (
          <span className="text-[9px] font-bold opacity-70">ERR</span>
        ) : playing ? (
          <PauseIcon className="w-4 h-4" />
        ) : (
          <PlayIcon className="w-4 h-4 translate-x-[1px]" />
        )}
      </button>

      {/* Waveform + scrubber */}
      <div className="flex-1 flex flex-col gap-1.5">
        <div
          className="relative flex items-end gap-[2px] h-8 cursor-pointer"
          onClick={seek}
        >
          {bars.map((h, i) => {
            const isPlayed = i / bars.length < progress
            return (
              <div
                key={i}
                className={`flex-1 rounded-full transition-all duration-75 ${
                  playing ? 'animate-voice-bar' : ''
                } ${
                  isPlayed
                    ? mine ? 'bg-white' : 'bg-blue-500'
                    : mine ? 'bg-white/40' : 'bg-zinc-400 dark:bg-zinc-500'
                }`}
                style={{
                  height: `${h * 100}%`,
                  animationDelay: `${i * 40}ms`,
                }}
              />
            )
          })}
        </div>

        {/* Duration */}
        <p className={`text-[11px] font-semibold ${mine ? 'text-white/80' : 'text-zinc-500 dark:text-zinc-400'}`}>
          {error ? 'Cannot play' : loaded ? fmt(playing ? (audioRef.current?.currentTime ?? 0) : duration) : '…'}
        </p>
      </div>
    </div>
  )
}
