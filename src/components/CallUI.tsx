'use client'

/**
 * CallUI — Fixed audio routing for Android WebView.
 *
 * THE KEY FIX FOR ANDROID AUDIO:
 * Android WebView does NOT reliably play audio through <audio> srcObject.
 * Using a <video> element with playsInline + muted=false correctly routes
 * WebRTC remote audio through the device speaker.
 * Additionally: AudioContext.createMediaStreamSource() is used as a secondary
 * route for browsers that support it.
 */

import React, { useEffect, useRef, useCallback } from 'react'
import Image from 'next/image'
import { useCall } from './CallProvider'
import { PhoneXMarkIcon, PhoneIcon, MicrophoneIcon } from '@heroicons/react/24/solid'
import { MicrophoneIcon as MicOffIcon } from '@heroicons/react/24/outline'

function formatDuration(secs: number) {
  const m = Math.floor(secs / 60).toString().padStart(2, '0')
  const s = (secs % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}

export function CallUI() {
  const { callState, callInfo, remoteStream, isMuted, callDuration, toggleMute, acceptCall, rejectCall, endCall } = useCall()
  // Use video element — works better than audio on Android WebView for WebRTC
  const videoRef = useRef<HTMLVideoElement>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null)

  useEffect(() => {
    const el = videoRef.current
    if (!el) return

    if (remoteStream) {
      // Primary: set srcObject on video element (most compatible with Android WebView)
      el.srcObject = remoteStream
      el.muted = false
      el.volume = 1.0
      el.play().catch(e => console.warn('[CallUI] Video play() failed:', e))

      // Secondary: AudioContext route for browsers that support it
      try {
        if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
          audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
        }
        const ctx = audioCtxRef.current
        if (sourceRef.current) { sourceRef.current.disconnect(); sourceRef.current = null }
        const src = ctx.createMediaStreamSource(remoteStream)
        const gain = ctx.createGain()
        gain.gain.value = 1.0
        src.connect(gain)
        gain.connect(ctx.destination)
        sourceRef.current = src
        if (ctx.state === 'suspended') ctx.resume().catch(() => {})
      } catch (e) {
        console.warn('[CallUI] AudioContext failed (video srcObject will handle audio):', e)
      }
    } else {
      el.srcObject = null
    }

    return () => {
      if (sourceRef.current) { sourceRef.current.disconnect(); sourceRef.current = null }
    }
  }, [remoteStream])

  // Manual recovery for blocked audio
  const retryAudio = useCallback(async () => {
    console.log('[CallUI] Retrying audio playback...')
    try {
      if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
        await audioCtxRef.current.resume()
      }
      if (videoRef.current) {
        await videoRef.current.play()
      }
    } catch (e) {
      console.error('[CallUI] Retry failed:', e)
    }
  }, [])

  // Resume AudioContext immediately on user gesture (Accept tap)
  const handleAccept = useCallback(async () => {
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
      }
      if (audioCtxRef.current.state === 'suspended') {
        await audioCtxRef.current.resume()
      }
    } catch (_) {}
    await acceptCall()
  }, [acceptCall])

  if (callState === 'idle' || !callInfo) return null

  const initials = (callInfo.remoteUserName || '?')[0].toUpperCase()

  return (
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center bg-black/90 backdrop-blur-xl animate-in fade-in duration-300">
      <div className="w-full sm:max-w-[360px] sm:rounded-3xl bg-zinc-950 text-white flex flex-col items-center py-14 px-8 gap-6 sm:shadow-2xl">

        {/* Avatar */}
        <div className="relative">
          <div className="w-28 h-28 rounded-full overflow-hidden bg-zinc-800 ring-4 ring-white/10">
            {callInfo.remoteAvatarUrl ? (
              <Image src={callInfo.remoteAvatarUrl} alt={callInfo.remoteUserName} fill className="object-cover" unoptimized />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-5xl font-black text-zinc-400">
                {initials}
              </div>
            )}
          </div>
          {(callState === 'ringing' || callState === 'calling') && (
            <div className="absolute inset-0 rounded-full animate-ping bg-white/10" />
          )}
        </div>

        {/* Name & status */}
        <div className="text-center">
          <p className="text-[22px] font-black">{callInfo.remoteUserName}</p>
          <p className="text-zinc-400 text-[14px] mt-1">
            {callState === 'calling' ? 'Calling...' :
             callState === 'ringing' ? '📞 Incoming call...' :
             callState === 'active'  ? `🔊 ${formatDuration(callDuration)}` : ''}
          </p>
          {callState === 'active' && (
            <button 
              onClick={retryAudio}
              className="mt-3 text-[11px] font-bold text-blue-500 bg-blue-500/10 px-3 py-1.5 rounded-full active:scale-95 transition-all"
            >
              No sound? Tap here
            </button>
          )}
        </div>

        {/* Buttons */}
        {callState === 'ringing' ? (
          <div className="flex items-center gap-12 mt-4">
            <div className="flex flex-col items-center gap-2">
              <button onClick={rejectCall}
                className="w-16 h-16 rounded-full bg-red-500 flex items-center justify-center hover:bg-red-600 active:scale-95 transition-all shadow-xl"
                aria-label="Reject call">
                <PhoneXMarkIcon className="w-7 h-7" />
              </button>
              <span className="text-zinc-400 text-xs">Decline</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <button onClick={handleAccept}
                className="w-16 h-16 rounded-full bg-green-500 flex items-center justify-center hover:bg-green-600 active:scale-95 transition-all shadow-xl"
                aria-label="Accept call">
                <PhoneIcon className="w-7 h-7" />
              </button>
              <span className="text-zinc-400 text-xs">Accept</span>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-10 mt-4">
            <div className="flex flex-col items-center gap-2">
              <button onClick={toggleMute}
                className={`w-14 h-14 rounded-full flex items-center justify-center active:scale-95 transition-all shadow-md ${isMuted ? 'bg-white text-black' : 'bg-zinc-800 text-white'}`}
                aria-label={isMuted ? 'Unmute' : 'Mute'}>
                {isMuted ? <MicOffIcon className="w-6 h-6" /> : <MicrophoneIcon className="w-6 h-6" />}
              </button>
              <span className="text-zinc-400 text-xs">{isMuted ? 'Unmute' : 'Mute'}</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <button onClick={endCall}
                className="w-16 h-16 rounded-full bg-red-500 flex items-center justify-center hover:bg-red-600 active:scale-95 transition-all shadow-xl"
                aria-label="End call">
                <PhoneXMarkIcon className="w-7 h-7" />
              </button>
              <span className="text-zinc-400 text-xs">End</span>
            </div>
          </div>
        )}
      </div>

      {/*
        VIDEO element (not audio!) – This is the key fix:
        Android WebView correctly outputs WebRTC remote audio through a video element.
        An audio element often fails silently on Android WebView due to audio focus policies.
        autoPlay + playsInline + muted=false is the magic combination.
      */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={false}
        style={{ position: 'absolute', width: '1px', height: '1px', opacity: 0, pointerEvents: 'none', bottom: 0 }}
      />
    </div>
  )
}
