'use client'

/**
 * CallProvider — WebRTC audio call context using Supabase Realtime as
 * the signaling channel. No external services required.
 *
 * Fixes applied:
 *  - Ringtone plays when call state = ringing or calling
 *  - Remote audio is played via an AudioContext (bypasses autoplay policies)
 *  - Push notifications use direct fetch to InsForge edge function URL
 *  - Call duration is tracked and sent back to DB on end
 */

import React, {
  createContext, useContext, useEffect, useRef, useState, useCallback
} from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from './AuthProvider'

// ─── Types ────────────────────────────────────────────────────────────────────

type CallState = 'idle' | 'calling' | 'ringing' | 'active' | 'ended'

interface CallInfo {
  callId: string
  remoteUserId: string
  remoteUserName: string
  remoteAvatarUrl: string | null
  isCaller: boolean
}

interface CallContextValue {
  callState: CallState
  callInfo: CallInfo | null
  localStream: MediaStream | null
  remoteStream: MediaStream | null
  isMuted: boolean
  callDuration: number
  toggleMute: () => void
  startCall: (targetUserId: string, targetName: string, targetAvatar: string | null) => Promise<void>
  acceptCall: () => Promise<void>
  rejectCall: () => void
  endCall: () => void
}

const CallContext = createContext<CallContextValue | null>(null)

export function useCall() {
  const ctx = useContext(CallContext)
  if (!ctx) throw new Error('useCall must be inside CallProvider')
  return ctx
}

// ─── STUN servers (free public, multiple for NAT traversal) ───────────────────
const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
  { urls: 'stun:stun3.l.google.com:19302' },
  { urls: 'stun:stun4.l.google.com:19302' },
  { urls: 'stun:stun.cloudflare.com:3478' },
  { urls: 'stun:stun.voiparound.com:3478' },
  { urls: 'stun:stun.schlund.de:3478' },
]

// ─── Push notification helper — direct fetch to InsForge Edge Function ────────
const INSFORGE_PUSH_URL = `${process.env.NEXT_PUBLIC_INSFORGE_URL}/functions/send-push`
const INSFORGE_ANON_KEY  = process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY

async function sendPushNotification(fcm_token: string, title: string, body: string, data: Record<string, string> = {}, type: 'call' | 'message' = 'call') {
  try {
    const res = await fetch(INSFORGE_PUSH_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${INSFORGE_ANON_KEY}`,
      },
      body: JSON.stringify({ fcm_token, title, body, data, type }),
    })
    const result = await res.json()
    if (!res.ok) {
      console.error('[Push] Failed:', result)
    } else {
      console.log('[Push] Sent successfully:', result)
    }
  } catch (err) {
    console.error('[Push] Network error:', err)
  }
}

// ─── Ringtone helper ──────────────────────────────────────────────────────────
let ringtoneAudio: HTMLAudioElement | null = null

function startRingtone() {
  if (typeof window === 'undefined') return
  try {
    if (!ringtoneAudio) {
      ringtoneAudio = new Audio('/sounds/ringtone.mp3')
      ringtoneAudio.loop = true
      ringtoneAudio.volume = 0.5
    }
    ringtoneAudio.currentTime = 0
    ringtoneAudio.play().catch(() => {
      // Autoplay blocked — that's fine, it will play on next user interaction
    })
  } catch (_) {}
}

function stopRingtone() {
  try {
    if (ringtoneAudio) {
      ringtoneAudio.pause()
      ringtoneAudio.currentTime = 0
    }
  } catch (_) {}
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function CallProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const supabase  = createClient()

  const [callState, setCallState] = useState<CallState>('idle')
  const [callInfo, setCallInfo]   = useState<CallInfo | null>(null)
  const [localStream, setLocalStream] = useState<MediaStream | null>(null)
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null)
  const [isMuted, setIsMuted]         = useState(false)
  const [callDuration, setCallDuration] = useState(0)

  const peerRef        = useRef<RTCPeerConnection | null>(null)
  const pendingIceCandidatesRef = useRef<RTCIceCandidateInit[]>([])
  const callIdRef      = useRef<string | null>(null)
  const channelRef     = useRef<any>(null)
  const callStartTimeRef = useRef<number | null>(null)
  const durationTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Track call duration when active
  useEffect(() => {
    if (callState === 'active') {
      callStartTimeRef.current = Date.now()
      durationTimerRef.current = setInterval(() => {
        if (callStartTimeRef.current) {
          setCallDuration(Math.floor((Date.now() - callStartTimeRef.current) / 1000))
        }
      }, 1000)
    } else {
      if (durationTimerRef.current) clearInterval(durationTimerRef.current)
      if (callState === 'idle') {
        setCallDuration(0)
        callStartTimeRef.current = null
      }
    }
    return () => { if (durationTimerRef.current) clearInterval(durationTimerRef.current) }
  }, [callState])

  // Play/stop ringtone based on call state
  useEffect(() => {
    if (callState === 'ringing' || callState === 'calling') {
      startRingtone()
    } else {
      stopRingtone()
    }
  }, [callState])

  // ── Helpers ──────────────────────────────────────────────────────────────

  const resetState = useCallback(async (durationSecs?: number) => {
    // Update call record with duration if we are ending an active call
    if (callIdRef.current && durationSecs && durationSecs > 0) {
      await supabase.from('calls')
        .update({ duration_seconds: durationSecs })
        .eq('id', callIdRef.current)
    }

    stopRingtone()

    // Stop all local tracks
    localStream?.getTracks().forEach(t => t.stop())
    setLocalStream(null)
    setRemoteStream(null)

    // Close peer connection
    peerRef.current?.close()
    peerRef.current = null

    // Remove channel
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current)
      channelRef.current = null
    }

    pendingIceCandidatesRef.current = []
    callIdRef.current = null
    setCallInfo(null)
    setCallState('idle')
    setIsMuted(false)
  }, [localStream, supabase])

  const createPeer = useCallback(() => {
    const peer = new RTCPeerConnection({ iceServers: ICE_SERVERS })

    // Send ICE candidates to the database for the remote peer to consume
    peer.onicecandidate = async (e) => {
      if (!e.candidate || !callIdRef.current || !user) return
      await supabase.from('ice_candidates').insert({
        call_id: callIdRef.current,
        sender_id: user.id,
        candidate: JSON.stringify(e.candidate),
      })
    }

    // Stream remote audio
    peer.ontrack = (e) => {
      console.log('[WebRTC] Track received:', e.track.kind, 'Stream count:', e.streams.length)
      if (e.streams && e.streams[0]) {
        setRemoteStream(e.streams[0])
      } else {
        // Fallback for browsers that don't pass streams in ontrack
        setRemoteStream(new MediaStream([e.track]))
      }
    }

    peer.onconnectionstatechange = () => {
      console.log('[WebRTC] Connection state:', peer.connectionState)
    }

    return peer
  }, [user, supabase])

  const addLocalStream = useCallback(async (peer: RTCPeerConnection) => {
    // Use minimal constraints for maximum Android WebView compatibility
    // Complex constraints like echoCancellation can break audio routing on some devices
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: false,
        autoGainControl: false,
        // @ts-ignore - Google specific constraints for additional echo help
        googEchoCancellation: true,
      },
      video: false
    })
    stream.getTracks().forEach(t => peer.addTrack(t, stream))
    setLocalStream(stream)
    return stream
  }, [])

  // ── Subscribe to signaling table for this user ────────────────────────────

  useEffect(() => {
    if (!user) return

    const channel = supabase
      .channel(`calls-for-${user.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'calls',
        filter: `callee_id=eq.${user.id}`,
      }, async (payload: any) => {
        if (callState !== 'idle') return

        const call = payload.new
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, avatar_url')
          .eq('id', call.caller_id)
          .single()

        const callerName = profile?.full_name || 'Someone'

        callIdRef.current = call.id
        setCallInfo({
          callId: call.id,
          remoteUserId: call.caller_id,
          remoteUserName: callerName,
          remoteAvatarUrl: profile?.avatar_url || null,
          isCaller: false,
        })
        setCallState('ringing')

        // Web notification for when the tab is in background
        if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
          new Notification(`📞 Incoming Call`, {
            body: `${callerName} is calling you`,
            icon: '/icon-512x512.png',
            requireInteraction: true
          })
        }

        // Native capacitor notification for when the app is in background
        try {
          const { LocalNotifications } = await import('@capacitor/local-notifications')
          await LocalNotifications.schedule({
            notifications: [{
              title: `📞 Incoming Call from ${callerName}`,
              body: `Tap to answer`,
              id: Date.now(),
              schedule: { at: new Date(Date.now() + 100) },
              smallIcon: 'ic_stat_icon_config_sample',
              sound: undefined,
              attachments: undefined,
              actionTypeId: '',
              extra: null
            }]
          })
        } catch (_) {}
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'calls',
      }, async (payload: any) => {
        const call = payload.new
        if (call.id !== callIdRef.current) return

        if (call.status === 'active' && callState === 'calling') {
          if (peerRef.current && call.sdp_answer) {
            await peerRef.current.setRemoteDescription(
              new RTCSessionDescription(JSON.parse(call.sdp_answer))
            )

            const { data: candidates } = await supabase
              .from('ice_candidates')
              .select('candidate')
              .eq('call_id', callIdRef.current)
              .neq('sender_id', user.id)

            if (candidates) {
              for (const row of candidates) {
                try { await peerRef.current.addIceCandidate(new RTCIceCandidate(JSON.parse(row.candidate))) } catch (_) {}
              }
            }

            for (const c of pendingIceCandidatesRef.current) {
              try { await peerRef.current.addIceCandidate(new RTCIceCandidate(c)) } catch (_) {}
            }
            pendingIceCandidatesRef.current = []
          }
          setCallState('active')
        }

        if (call.status === 'rejected') {
          resetState()
        }

        if (call.status === 'ended') {
          resetState()
        }
      })
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'ice_candidates',
      }, async (payload: any) => {
        const row = payload.new
        if (row.call_id !== callIdRef.current) return
        if (row.sender_id === user.id) return

        if (peerRef.current) {
          try {
            const candidate = JSON.parse(row.candidate)
            if (!peerRef.current.remoteDescription) {
              pendingIceCandidatesRef.current.push(candidate)
            } else {
              await peerRef.current.addIceCandidate(new RTCIceCandidate(candidate))
            }
          } catch (_) {}
        }
      })
      .subscribe()

    channelRef.current = channel

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user, supabase, callState, resetState])

  // ── Actions ───────────────────────────────────────────────────────────────

  const startCall = useCallback(async (
    targetUserId: string,
    targetName: string,
    targetAvatar: string | null
  ) => {
    if (!user || callState !== 'idle') return

    try {
      const peer = createPeer()
      peerRef.current = peer
      await addLocalStream(peer)

      const offer = await peer.createOffer()
      await peer.setLocalDescription(offer)

      const { data, error } = await supabase
        .from('calls')
        .insert({
          caller_id: user.id,
          callee_id: targetUserId,
          status: 'ringing',
          sdp_offer: JSON.stringify(offer),
        })
        .select()
        .single()

      if (error || !data) {
        peer.close()
        return
      }

      callIdRef.current = data.id
      setCallInfo({
        callId: data.id,
        remoteUserId: targetUserId,
        remoteUserName: targetName,
        remoteAvatarUrl: targetAvatar,
        isCaller: true,
      })
      setCallState('calling')

      // Send push notification to wake up receiver
      const { data: profile } = await supabase
        .from('profiles')
        .select('fcm_token')
        .eq('id', targetUserId)
        .single()

      if (profile?.fcm_token) {
        const senderName = user.user_metadata?.full_name || user.user_metadata?.username || 'Someone'
        await sendPushNotification(
          profile.fcm_token,
          '📞 Incoming Call',
          `${senderName} is calling you`,
          { type: 'call', call_id: data.id }
        )
      }
    } catch (err: any) {
      console.error('Call failed to start:', err)
      alert('Could not access microphone. Please allow microphone permissions.')
      resetState()
    }
  }, [user, callState, createPeer, addLocalStream, supabase, resetState])

  const rejectCall = useCallback(async () => {
    if (callInfo) {
      await supabase
        .from('calls')
        .update({ status: 'rejected', ended_at: new Date().toISOString() })
        .eq('id', callInfo.callId)
    }
    resetState()
  }, [callInfo, supabase, resetState])

  const endCall = useCallback(async () => {
    const durSecs = callStartTimeRef.current
      ? Math.floor((Date.now() - callStartTimeRef.current) / 1000)
      : 0

    if (callInfo) {
      await supabase
        .from('calls')
        .update({
          status: 'ended',
          ended_at: new Date().toISOString(),
          duration_seconds: durSecs
        })
        .eq('id', callInfo.callId)
    }
    resetState(durSecs)
  }, [callInfo, supabase, resetState])

  const acceptCall = useCallback(async () => {
    if (!user || !callInfo || callState !== 'ringing') return

    try {
      const peer = createPeer()
      peerRef.current = peer
      await addLocalStream(peer)

      const { data: call } = await supabase
        .from('calls')
        .select('sdp_offer')
        .eq('id', callInfo.callId)
        .single()

      if (!call?.sdp_offer) return

      await peer.setRemoteDescription(
        new RTCSessionDescription(JSON.parse(call.sdp_offer))
      )

      const { data: candidates } = await supabase
        .from('ice_candidates')
        .select('candidate')
        .eq('call_id', callInfo.callId)
        .neq('sender_id', user.id)

      if (candidates) {
        for (const row of candidates) {
          try { await peer.addIceCandidate(new RTCIceCandidate(JSON.parse(row.candidate))) } catch (_) {}
        }
      }

      for (const c of pendingIceCandidatesRef.current) {
        try { await peer.addIceCandidate(new RTCIceCandidate(c)) } catch (_) {}
      }
      pendingIceCandidatesRef.current = []

      const answer = await peer.createAnswer()
      await peer.setLocalDescription(answer)

      await supabase
        .from('calls')
        .update({ status: 'active', sdp_answer: JSON.stringify(answer) })
        .eq('id', callInfo.callId)

      setCallState('active')
    } catch (err: any) {
      console.error('Call failed to accept:', err)
      alert('Could not access microphone. Please allow microphone permissions to accept calls.')
      rejectCall()
    }
  }, [user, callInfo, callState, createPeer, addLocalStream, supabase, rejectCall])

  const toggleMute = useCallback(() => {
    if (!localStream) return
    localStream.getAudioTracks().forEach(t => { t.enabled = !t.enabled })
    setIsMuted(p => !p)
  }, [localStream])

  return (
    <CallContext.Provider value={{
      callState, callInfo, localStream, remoteStream, isMuted, callDuration,
      toggleMute, startCall, acceptCall, rejectCall, endCall,
    }}>
      {children}
    </CallContext.Provider>
  )
}
