'use client'

import React, { useEffect, useState, useRef, useCallback, Suspense } from 'react'
import { AppLayout } from '@/components/AppLayout'
import { createClient } from '@/lib/supabase/client'
import { encryptMessage, decryptMessage, getSharedSecret } from '@/lib/crypto'
import { useSearchParams } from 'next/navigation'
import {
  ChevronLeftIcon,
  MagnifyingGlassIcon,
  PhoneIcon,
  PhoneArrowDownLeftIcon,
  PhoneXMarkIcon
} from '@heroicons/react/24/solid'
import {
  ChatBubbleLeftRightIcon,
  LockClosedIcon,
  MicrophoneIcon,
  VideoCameraIcon,
  PaperAirplaneIcon,
  FaceSmileIcon,
  EllipsisHorizontalIcon,
  XMarkIcon,
  CheckIcon,
  BellSlashIcon,
  NoSymbolIcon,
  HandRaisedIcon,
  ExclamationTriangleIcon,
  Square2StackIcon,
  Bars3Icon,
} from '@heroicons/react/24/outline'
import { useAuth } from '@/components/AuthProvider'
import { useCall } from '@/components/CallProvider'
import { VoiceNote } from '@/components/VoiceNote'
import Image from 'next/image'
import Link from 'next/link'
import { Haptics, ImpactStyle } from '@capacitor/haptics'
import { Capacitor } from '@capacitor/core'

const triggerHaptic = (style = ImpactStyle.Light) => {
  if (Capacitor.isNativePlatform()) {
    Haptics.impact({ style }).catch(() => {})
  }
}

const INSFORGE_PUSH_URL = `${process.env.NEXT_PUBLIC_INSFORGE_URL}/functions/send-push`
const INSFORGE_ANON_KEY  = process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY

async function sendPush(fcm_token: string, title: string, body: string) {
  try {
    await fetch(INSFORGE_PUSH_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${INSFORGE_ANON_KEY}`,
      },
      body: JSON.stringify({ fcm_token, title, body, type: 'message', data: { url: '/messages' } }),
    })
  } catch (err) {
    console.error('[Push] Failed:', err)
  }
}

// ── Small helpers ─────────────────────────────────────────────────────────────

function timeAgo(d: string) {
  const s = Math.floor((Date.now() - +new Date(d)) / 1000)
  if (s < 60) return 'now'
  if (s < 3600) return `${Math.floor(s / 60)}m`
  if (s < 86400) return `${Math.floor(s / 3600)}h`
  if (s < 604800) return `${Math.floor(s / 86400)}d`
  return new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}
function msgTime(d: string) {
  return new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}
function online(p: any) {
  return p?.last_seen && Date.now() - +new Date(p.last_seen) < 5 * 60 * 1000
}

// ── Avatar ────────────────────────────────────────────────────────────────────

function Avatar({ profile, size = 44 }: { profile: any; size?: number }) {
  const s = { width: size, height: size } as React.CSSProperties
  if (profile?.avatar_url) {
    return <Image src={profile.avatar_url} alt={profile.full_name || 'User'} width={size} height={size} className="rounded-full object-cover flex-none" style={s} unoptimized />
  }
  return (
    <div className="rounded-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center font-bold text-zinc-500 flex-none select-none" style={{ ...s, fontSize: Math.max(11, size * 0.38) }}>
      {(profile?.full_name || profile?.username || 'U')[0].toUpperCase()}
    </div>
  )
}

// ── Main content ──────────────────────────────────────────────────────────────

type ActiveTab = 'Inbox' | 'Requests'

function MessagesContent() {
  const searchParams = useSearchParams()
  const { user, loading: authLoading } = useAuth()
  const { startCall, callState } = useCall()
  const supabase = createClient()

  const [convos, setConvos] = useState<any[]>([])
  const [inboundRequests, setInboundRequests] = useState<any[]>([])
  const [activeTab, setActiveTab] = useState<ActiveTab>('Inbox')
  const [selected, setSelected] = useState<any>(null)
  const [messages, setMessages] = useState<any[]>([])
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [loadingConvos, setLoadingConvos] = useState(true)
  const [input, setInput] = useState('')
  const [search, setSearch] = useState('')
  const [sending, setSending] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Message request state for the currently selected conversation
  const [requestStatus, setRequestStatus] = useState<
    'allowed' | 'pending_sent' | 'pending_received' | 'declined' | null
  >(null)
  const [checkingRequest, setCheckingRequest] = useState(false)

  // Track conversations we have opened in this session to enforce badge clearing
  const localSeenRefs = useRef<Set<string>>(new Set())

  // Voice recording state
  const [recording, setRecording] = useState(false)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const [showOptions, setShowOptions] = useState(false)
  const [selectedFollowers, setSelectedFollowers] = useState(0)

  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef  = useRef<HTMLInputElement>(null)

  // Auto-scroll
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  // ── Fetch conversation list ───────────────────────────────────────────────

  const fetchConvos = useCallback(async () => {
    if (!user) return
    const { data: msgs } = await supabase
      .from('messages')
      .select('sender_id, receiver_id, content, created_at, is_read')
      .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
      .order('created_at', { ascending: false })

    if (!msgs) return

    const seen = new Set<string>()
    const lastMsg = new Map<string, any>()
    const unread  = new Map<string, number>()

    for (const m of msgs) {
      const other = m.sender_id === user.id ? m.receiver_id : m.sender_id
      if (!seen.has(other)) { seen.add(other); lastMsg.set(other, m) }
      if (m.receiver_id === user.id && !m.is_read && !localSeenRefs.current.has(other))
        unread.set(other, (unread.get(other) || 0) + 1)
    }
    if (!seen.size) { setConvos([]); setLoadingConvos(false); return }

    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, username, avatar_url, last_seen, fcm_token')
      .in('id', [...seen])

    const list = (profiles || []).map((p: any) => ({
      profile: p,
      lastMsg: lastMsg.get(p.id),
      unread:  unread.get(p.id) || 0,
    }))

    // Decrypt previews
    await Promise.all(list.map(async (c: any) => {
      if (c.lastMsg && c.lastMsg.content) {
        c.lastMsg.content = await decryptMessage(c.lastMsg.content, getSharedSecret(user.id, c.profile.id))
      }
    }))

    list.sort((a: any, b: any) =>
      +new Date(b.lastMsg?.created_at || 0) - +new Date(a.lastMsg?.created_at || 0))
    setConvos(list)
    setLoadingConvos(false)
  }, [user])

  // ── Fetch inbound pending message requests ─────────────────────────────────
  const fetchInboundRequests = useCallback(async () => {
    if (!user) return
    const { data } = await supabase
      .from('message_requests')
      .select('*, sender:sender_id(id, full_name, username, avatar_url, last_seen, fcm_token)')
      .eq('receiver_id', user.id)
      .eq('status', 'pending')
    setInboundRequests(data || [])
  }, [user])

  // ── Check request status for selected conversation ─────────────────────────
  const checkRequestStatus = useCallback(async (otherId: string) => {
    if (!user) return
    setCheckingRequest(true)

    // Check if they already have message history (= already allowed)
    const { count } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .or(
        `and(sender_id.eq.${user.id},receiver_id.eq.${otherId}),` +
        `and(sender_id.eq.${otherId},receiver_id.eq.${user.id})`
      )

    if ((count || 0) > 0) {
      setRequestStatus('allowed')
      setCheckingRequest(false)
      return
    }

    // Check request table
    const { data: req } = await supabase
      .from('message_requests')
      .select('*')
      .or(`and(sender_id.eq.${user.id},receiver_id.eq.${otherId}),and(sender_id.eq.${otherId},receiver_id.eq.${user.id})`)
      .maybeSingle()

    if (!req) {
      setRequestStatus(null) // no relationship
    } else if (req.status === 'accepted') {
      setRequestStatus('allowed')
    } else if (req.status === 'pending') {
      if (req.sender_id === user.id) setRequestStatus('pending_sent')
      else setRequestStatus('pending_received')
    } else if (req.status === 'declined') {
      setRequestStatus('declined')
    }

    setCheckingRequest(false)
  }, [user])

  // ── Fetch messages for selected convo ─────────────────────────────────────

  const fetchMessages = useCallback(async () => {
    if (!user || !selected) return
    setLoadingMessages(true)

    // First, mark all unread messages from this sender as read in DB IMMEDIATELY
    // so the badge clears permanently (even if the user closes the app)
    await supabase.from('messages').update({ is_read: true })
      .eq('receiver_id', user.id)
      .eq('sender_id', selected.id)
      .eq('is_read', false)

    // Also mark all received messages as delivered if they aren't
    await supabase.from('messages').update({ is_delivered: true })
      .eq('receiver_id', user.id)
      .eq('sender_id', selected.id)
      .eq('is_delivered', false)

    // Always notify badge to refresh (even if nothing was unread)
    window.dispatchEvent(new CustomEvent('messages-read'))
    setConvos(prev => prev.map(c => c.profile.id === selected.id ? { ...c, unread: 0 } : c))

    const { data } = await supabase
      .from('messages')
      .select('*')
      .or(
        `and(sender_id.eq.${user.id},receiver_id.eq.${selected.id}),` +
        `and(sender_id.eq.${selected.id},receiver_id.eq.${user.id})`
      )
      .order('created_at', { ascending: true })

    if (!data) { setLoadingMessages(false); return }
    
    const secret = getSharedSecret(user.id, selected.id)
    const decryptedData = await Promise.all(data.map(async (m: any) => {
      if (m.content) {
        m.content = await decryptMessage(m.content, secret)
      }
      return m
    }))
    
    const timeline = decryptedData.map((m: any) => ({ ...m, _type: 'message' }))

    // Load call history
    const { data: calls } = await supabase
      .from('calls')
      .select('*')
      .or(
        `and(caller_id.eq.${user.id},callee_id.eq.${selected.id}),` +
        `and(caller_id.eq.${selected.id},callee_id.eq.${user.id})`
      )
      .order('created_at', { ascending: true })

    const callItems = (calls || []).map((c: any) => ({ ...c, _type: 'call' }))

    // Merge & sort by time
    const combined = [...timeline, ...callItems].sort((a, b) =>
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    )
    setMessages(combined)
    setLoadingMessages(false)
  }, [user, selected])

  // ── Boot + URL param ──────────────────────────────────────────────────────

  useEffect(() => {
    if (!user) return
    fetchConvos()
    fetchInboundRequests()
    const tid = searchParams.get('userId')
    if (tid && tid !== user.id) {
      supabase.from('profiles').select('*').eq('id', tid).single()
        .then(({ data }: { data: any }) => { if (data) setSelected(data) })
    }
  }, [user])

  useEffect(() => {
    if (selected && user) {
      setMessages([]) // Clear old messages so skeleton is obvious
      fetchMessages()
      checkRequestStatus(selected.id)
      
      // Fetch follower count (excluding people YOU follow, per user request)
      supabase
        .from('follows')
        .select('follower_id')
        .eq('following_id', selected.id)
        .then(async ({ data: followersData }) => {
          if (!followersData) { setSelectedFollowers(0); return }
          
          // Get IDs of people I follow
          const { data: myFollows } = await supabase
            .from('follows')
            .select('following_id')
            .eq('follower_id', user.id)
          
          const myFollowedIds = new Set(myFollows?.map(f => f.following_id) || [])
          const filteredCount = followersData.filter(f => !myFollowedIds.has(f.follower_id)).length
          setSelectedFollowers(filteredCount)
        })
    }
  }, [selected, user])

  // ── Real-time subscription ────────────────────────────────────────────────

  useEffect(() => {
    if (!selected || !user) return
    const channelId = `chat:${[user.id, selected.id].sort().join(':')}`
    
    // Message sync channel
    const ch = supabase
      .channel(channelId)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' },
        async (payload: any) => {
          const m = payload.new
          const rel = (m.sender_id === user.id && m.receiver_id === selected.id) ||
                      (m.sender_id === selected.id && m.receiver_id === user.id)
          if (!rel) return
          
          if (m.content) {
            const secret = getSharedSecret(user.id, selected.id)
            m.content = await decryptMessage(m.content, secret)
          }
          
          setMessages(prev => [...prev, { ...m }])
          if (m.sender_id === selected.id) {
             // mark as read instantly if we are actively in this chat
             await supabase.from('messages').update({ is_read: true, is_delivered: true }).eq('id', m.id)
             setMessages(prev => prev.map(msg => msg.id === m.id ? { ...msg, is_read: true, is_delivered: true } : msg))
             window.dispatchEvent(new CustomEvent('messages-read'))
          }
          // If messaging was previously restricted, a message means it's now allowed
          if (m.sender_id === selected.id && requestStatus !== 'allowed') {
            setRequestStatus('allowed')
          }
        })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages' },
        async (payload: any) => {
          const updated = payload.new
          // Accept any update relevant to this conversation (for Seen to work)
          const rel = (updated.sender_id === user.id && updated.receiver_id === selected.id) ||
                      (updated.sender_id === selected.id && updated.receiver_id === user.id)
          if (!rel) return
          if (updated.content) {
            const secret = getSharedSecret(user.id, selected.id)
            updated.content = await decryptMessage(updated.content, secret)
          }
          setMessages(prev => prev.map(m => m.id === updated.id ? { ...m, ...updated } : m))
        })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'messages' },
        (payload: any) => setMessages(prev => prev.filter(m => m.id !== payload.old.id)))
      .subscribe()

    // Typing presence channel
    const typingCh = supabase.channel(`typing:${channelId}`)
    typingCh
      .on('presence', { event: 'sync' }, () => {
        const state = typingCh.presenceState()
        const otherIsTyping = Object.values(state).some((presences: any) => 
          presences.some((p: any) => p.user !== user.id && p.typing)
        )
        setIsTyping(otherIsTyping)
      })
      .subscribe(async (status: string) => {
        if (status === 'SUBSCRIBED') await typingCh.track({ user: user.id, typing: false })
      })

    ;(window as any).typingChannel = typingCh

    return () => { supabase.removeChannel(ch); supabase.removeChannel(typingCh) }
  }, [selected, user])

  // ── Actions ───────────────────────────────────────────────────────────────

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || !selected || !user || sending) return
    if (requestStatus !== 'allowed') return // guard
    setSending(true)
    const text = input.trim()
    setInput('')
    inputRef.current?.focus()
    triggerHaptic(ImpactStyle.Light)
    
    if ((window as any).typingChannel) {
      void (window as any).typingChannel.track({ user: user.id, typing: false })
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
    }

    const secret = getSharedSecret(user.id, selected.id)
    const encryptedContent = await encryptMessage(text, secret)
    const { error } = await supabase.from('messages').insert({ sender_id: user.id, receiver_id: selected.id, content: encryptedContent })
    supabase.from('notifications').insert({ user_id: selected.id, actor_id: user.id, type: 'message', read: false })
    
    // ── Send Background Push Notification ──
    if (selected.fcm_token) {
      const senderName = user.user_metadata?.full_name || 'Someone'
      sendPush(selected.fcm_token, `💬 ${senderName}`, text.length > 100 ? text.slice(0, 100) + '...' : text)
    }

    setSending(false)
    fetchConvos()
  }

  const sendMessageRequest = async () => {
    if (!user || !selected) return
    const { error } = await supabase.from('message_requests').insert({
      sender_id: user.id,
      receiver_id: selected.id,
      status: 'pending',
    })
    if (!error) {
      setRequestStatus('pending_sent')
      // Notify the receiver
      if (selected.fcm_token) {
        const senderName = user.user_metadata?.full_name || user.user_metadata?.username || 'Someone'
        sendPush(selected.fcm_token, '💬 Message Request', `${senderName} wants to send you a message`)
      }
    }
  }

  const acceptRequest = async (senderId: string) => {
    await supabase.from('message_requests')
      .update({ status: 'accepted' })
      .eq('sender_id', senderId)
      .eq('receiver_id', user!.id)
    fetchInboundRequests()
    fetchConvos()
    if (selected?.id === senderId) setRequestStatus('allowed')
  }

  const declineRequest = async (senderId: string) => {
    await supabase.from('message_requests')
      .update({ status: 'declined' })
      .eq('sender_id', senderId)
      .eq('receiver_id', user!.id)
    fetchInboundRequests()
    if (selected?.id === senderId) setRequestStatus('declined')
  }

  const handleTyping = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value)
    if (!user || !(window as any).typingChannel) return
    void (window as any).typingChannel.track({ user: user.id, typing: true })
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
    typingTimeoutRef.current = setTimeout(() => {
      void (window as any).typingChannel.track({ user: user.id, typing: false })
    }, 2000)
  }

  const deleteMsg = async (id: string, content?: string) => {
    if (content?.startsWith('voice:')) {
      const url = content.slice(6)
      try {
        const pathMatch = url.match(/voice-notes\/(.+)$/)
        if (pathMatch) {
          await supabase.storage.from('voice-notes').remove([pathMatch[1]])
        }
      } catch (e) {
        console.warn('[Voice] Could not delete storage file:', e)
      }
    }
    await supabase.from('messages').delete().eq('id', id)
    setMessages(prev => prev.filter(m => m.id !== id))
    fetchConvos()
  }

  // ── Voice note recording ─────────────────────────────────────────────────
  const startRecording = async () => {
    if (recording) {
      stopAndSendVoiceNote()
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mr = new MediaRecorder(stream, { mimeType: MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4' })
      audioChunksRef.current = []
      mr.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data) }
      mr.start(100)
      mediaRecorderRef.current = mr
      setRecording(true)
      triggerHaptic(ImpactStyle.Medium)
    } catch (e) {
      console.error('[Voice] Mic access denied:', e)
    }
  }

  const stopAndSendVoiceNote = async () => {
    const mr = mediaRecorderRef.current
    if (!mr || !selected || !user) return
    if (requestStatus !== 'allowed') return // guard
    setRecording(false)
    mr.stop()
    mr.stream.getTracks().forEach(t => t.stop())

    await new Promise<void>(res => { mr.onstop = () => res() })

    const blob = new Blob(audioChunksRef.current, { type: mr.mimeType })
    if (blob.size < 1000) return

    const ext = mr.mimeType.includes('webm') ? 'webm' : 'm4a'
    const path = `${user.id}/${Date.now()}.${ext}`
    const { data: uploaded, error } = await supabase.storage.from('voice-notes').upload(path, blob, { contentType: mr.mimeType })
    if (error || !uploaded) { console.error('[Voice] Upload failed:', error); return }

    const { data: urlData } = supabase.storage.from('voice-notes').getPublicUrl(path)
    const voiceUrl = urlData?.publicUrl
    if (!voiceUrl) return

    await supabase.from('messages').insert({ sender_id: user.id, receiver_id: selected.id, content: `voice:${voiceUrl}` })
    if (selected.fcm_token) {
      const senderName = user.user_metadata?.full_name || 'Someone'
      sendPush(selected.fcm_token, `🎤 Voice message from ${senderName}`, 'Tap to listen')
    }
    fetchConvos()
  }

  const openConvo = (profile: any) => {
    setSelected(profile)
    setMessages([])
    setLoadingMessages(true)
    setCheckingRequest(true)
    setRequestStatus(null)
    localSeenRefs.current.add(profile.id)
    setConvos(prev => prev.map(c => c.profile.id === profile.id ? { ...c, unread: 0 } : c))
    // Dispatch event so AppLayout immediately refreshes its unread badge
    window.dispatchEvent(new CustomEvent('messages-read'))
  }

  const filtered = convos.filter(c =>
    (c.profile.full_name || '').toLowerCase().includes(search.toLowerCase()) ||
    (c.profile.username  || '').toLowerCase().includes(search.toLowerCase())
  )

  // ── Auth guards ───────────────────────────────────────────────────────────

  if (authLoading) return (
    <AppLayout fullBleed><div className="flex items-center justify-center h-[60vh]">
      <div className="w-6 h-6 border-2 border-zinc-200 border-t-black dark:border-t-white rounded-full animate-spin" />
    </div></AppLayout>
  )
  if (!user) return (
    <AppLayout fullBleed><div className="flex flex-col items-center justify-center h-[60vh] gap-4 text-center px-8">
      <ChatBubbleLeftRightIcon className="w-16 h-16 text-zinc-300 dark:text-zinc-700" />
      <p className="font-bold text-lg">Sign in to message</p>
      <Link href="/login" className="bg-black dark:bg-white text-white dark:text-black px-6 py-3 rounded-full font-bold text-sm">Sign in</Link>
    </div></AppLayout>
  )

  // ══════════════════════════════════════════════════════════════════════════
  //  LAYOUT
  // ══════════════════════════════════════════════════════════════════════════

  return (
    <AppLayout fullBleed>
      {selected && (
        <style dangerouslySetInnerHTML={{ __html: `
          nav.sm\\:hidden.fixed.bottom-0 { display: none !important; }
          main { padding-bottom: 0px !important; }
        `}} />
      )}
      <div className="flex h-[calc(100dvh-var(--nav-height,3.5rem))] md:h-screen overflow-hidden bg-zinc-50 dark:bg-black" style={{ touchAction: 'pan-y' }}>

        {/* ── SIDEBAR ───────────────────────────────────────────────── */}
        <div className={`
          w-full sm:w-[320px] sm:min-w-[320px] sm:max-w-[320px]
          border-r border-zinc-100 dark:border-zinc-900
          overflow-y-auto flex-none flex flex-col
          ${selected ? 'hidden sm:flex' : 'flex'}
        `}>
          {/* Header */}
          <div className="sticky top-0 z-10 bg-white dark:bg-black px-4 pb-3 border-b border-zinc-100 dark:border-zinc-900" style={{ paddingTop: 'calc(1.25rem + env(safe-area-inset-top))' }}>
            <h1 className="text-[28px] font-black tracking-tight mb-3 text-black dark:text-white">Messages</h1>
            {/* Search bar */}
            <div className="relative mb-3">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
              <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search"
                className="w-full pl-9 pr-4 py-2.5 bg-zinc-100 dark:bg-zinc-900 rounded-full text-[16px] placeholder-zinc-400 outline-none transition" />
            </div>
            {/* Inbox / Requests tabs */}
            <div className="flex items-center gap-2">
              {(['Inbox', 'Requests'] as const).map(tab => {
                const isActive = tab === activeTab
                const badge = tab === 'Requests' ? inboundRequests.length : 0
                return (
                  <button key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`relative px-5 py-1.5 rounded-full text-[14px] font-bold border transition-all ${
                      isActive
                        ? 'bg-transparent border-zinc-900 dark:border-zinc-100 text-zinc-900 dark:text-zinc-100'
                        : 'bg-transparent border-zinc-200 dark:border-zinc-700 text-zinc-400'
                    }`}
                  >
                    {tab}
                    {badge > 0 && (
                      <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-black rounded-full flex items-center justify-center">
                        {badge}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {/* ── REQUESTS TAB ── */}
          {activeTab === 'Requests' && (
            <>
              {inboundRequests.length === 0 ? (
                <div className="flex flex-col items-center justify-center flex-grow gap-3 px-8 py-16 text-center">
                  <div className="w-14 h-14 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                    <span className="text-2xl">📩</span>
                  </div>
                  <p className="font-bold text-zinc-700 dark:text-zinc-300">No pending requests</p>
                  <p className="text-[13px] text-zinc-400">When someone wants to message you, it'll appear here.</p>
                </div>
              ) : (
                inboundRequests.map((req: any) => {
                  const p = req.sender
                  return (
                    <div key={req.id}
                      className="flex items-center gap-3 px-4 py-3.5 border-b border-zinc-50 dark:border-zinc-900">
                      <button onClick={() => { openConvo(p); setActiveTab('Inbox') }} className="flex-none">
                        <Avatar profile={p} size={48} />
                      </button>
                      <div className="flex-1 min-w-0">
                        <p className="text-[14px] font-bold truncate">{p.full_name}</p>
                        <p className="text-[12px] text-zinc-400">@{p.username} · wants to message you</p>
                      </div>
                      <div className="flex gap-2 flex-none">
                        <button
                          onClick={() => declineRequest(p.id)}
                          className="px-3 py-1.5 rounded-full border border-zinc-200 dark:border-zinc-700 text-[12px] font-bold text-zinc-500 hover:border-red-400 hover:text-red-500 transition-colors"
                        >
                          Decline
                        </button>
                        <button
                          onClick={() => acceptRequest(p.id)}
                          className="px-3 py-1.5 rounded-full bg-black dark:bg-white text-white dark:text-black text-[12px] font-bold hover:opacity-80 transition-opacity"
                        >
                          Accept
                        </button>
                      </div>
                    </div>
                  )
                })
              )}
            </>
          )}

          {/* ── INBOX TAB ── */}
          {activeTab === 'Inbox' && (
            <>
              {loadingConvos ? (
                <div className="flex flex-col gap-4 px-4 py-6">
                  {[1, 2, 3, 4, 5].map(i => (
                    <div key={i} className="flex items-center gap-3 animate-pulse">
                      <div className="w-[52px] h-[52px] rounded-full bg-zinc-200 dark:bg-zinc-800 flex-none" />
                      <div className="flex-1 space-y-2">
                        <div className="h-3.5 bg-zinc-200 dark:bg-zinc-800 rounded w-1/3" />
                        <div className="h-3 bg-zinc-200 dark:bg-zinc-800 rounded w-2/3" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : filtered.length === 0 && (
                <div className="flex flex-col items-center justify-center flex-grow gap-4 px-8 py-16 text-center">
                  <div className="w-16 h-16 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mb-1">
                    <ChatBubbleLeftRightIcon className="w-8 h-8 text-zinc-400" />
                  </div>
                  <div>
                    <p className="font-black text-[18px] text-black dark:text-white mb-1">
                      {search ? 'No matches' : 'Keep it real in…'}
                    </p>
                    <p className="text-[14px] text-zinc-400 leading-relaxed max-w-[220px] mx-auto">
                      {search
                        ? 'Try a different name'
                        : 'Find someone in Search and send them a message.'}
                    </p>
                  </div>
                </div>
              )}

              {filtered.map((c: any) => {
                const isSelected = selected?.id === c.profile.id
                const isOnline   = online(c.profile)
                const enc = c.lastMsg?.content?.startsWith('encrypted:') || c.lastMsg?.content?.includes('U2F')
                const isVoice = c.lastMsg?.content?.startsWith('voice:')
                const preview = isVoice ? '🎤 Voice note' : enc ? '🔒 Encrypted message' : (c.lastMsg?.content || 'Say hi!')
                const displayUnread = localSeenRefs.current.has(c.profile.id) ? 0 : c.unread

                return (
                  <button key={c.profile.id} onClick={() => openConvo(c.profile)}
                    className={`w-full flex items-center gap-3 px-4 py-3.5 text-left transition-colors ${isSelected ? 'bg-zinc-100 dark:bg-zinc-900' : 'hover:bg-zinc-50 dark:hover:bg-zinc-950'}`}>
                    <div className="relative flex-none">
                      <Avatar profile={c.profile} size={52} />
                      {isOnline && <div className="absolute bottom-0.5 right-0.5 w-3.5 h-3.5 bg-green-500 border-2 border-white dark:border-black rounded-full" />}
                    </div>
                    <div className="flex-grow min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-0.5">
                        <span className={`text-[14px] truncate ${c.unread > 0 ? 'font-bold' : 'font-semibold'}`}>{c.profile.full_name}</span>
                        <span className="text-[11px] text-zinc-400 flex-none">{c.lastMsg ? timeAgo(c.lastMsg.created_at) : ''}</span>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <p className={`text-[12.5px] truncate ${displayUnread > 0 ? 'text-zinc-800 dark:text-zinc-100 font-semibold' : 'text-zinc-400'}`}>
                          {preview}
                        </p>
                        {displayUnread > 0 && (
                          <span className="flex-none min-w-[20px] h-5 px-1 bg-black dark:bg-white text-white dark:text-black text-[10px] font-black rounded-full flex items-center justify-center">
                            {displayUnread > 9 ? '9+' : displayUnread}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                )
              })}
            </>
          )}
        </div>

        {/* ── CHAT PANEL ────────────────────────────────────────────── */}
        <div className={`flex-1 flex flex-col min-w-0 ${selected ? 'flex' : 'hidden sm:flex'}`}>

          {selected ? (
            <>
              {/* Chat header */}
              <div className="flex-none flex items-center gap-3 px-3 pb-2 min-h-[64px] border-b border-zinc-100 dark:border-zinc-900 bg-white/80 dark:bg-black/80 backdrop-blur-md sticky top-0 z-20" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 0.25rem)' }}>
                <button onClick={() => setSelected(null)} className="sm:hidden w-9 h-9 flex items-center justify-center rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors flex-none">
                  <ChevronLeftIcon className="w-5 h-5" />
                </button>
                <Link href={`/profile?id=${selected.id}`} className="flex items-center gap-3 group flex-grow min-w-0 py-1">
                  <div className="relative flex-none">
                    <Avatar profile={selected} size={40} />
                    {online(selected) && <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-white dark:border-black rounded-full" />}
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-[15px] leading-tight truncate">{selected.full_name}</p>
                    <p className={`text-[12px] leading-none mt-0.5 font-medium ${online(selected) ? 'text-green-500' : 'text-zinc-400'}`}>
                      {online(selected) ? 'Active now' : (isTyping ? 'typing...' : `@${selected.username}`)}
                    </p>
                  </div>
                </Link>
                {/* Audio call button — only show when messaging is allowed */}
                {requestStatus === 'allowed' && (
                  <div className="flex items-center gap-1.5 flex-none">
                    <button
                      onClick={() => startCall(selected.id, selected.full_name, selected.avatar_url || null)}
                      disabled={callState !== 'idle'}
                      className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors disabled:opacity-40"
                      aria-label="Start audio call"
                    >
                      <PhoneIcon className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => setShowOptions(true)}
                      className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors"
                      aria-label="Options"
                    >
                      <Bars3Icon className="w-6 h-6" />
                    </button>
                  </div>
                )}
              </div>

              {/* Messages area */}
              <div className="flex-1 overflow-y-auto px-3 py-4">

                {/* ── Loading skeleton ── */}
                {loadingMessages && (
                  <div className="flex flex-col gap-3 px-1 py-2 animate-pulse">
                    {/* Other person bubble */}
                    <div className="flex items-end gap-2">
                      <div className="w-7 h-7 rounded-full bg-zinc-200 dark:bg-zinc-800 flex-none" />
                      <div className="h-10 w-48 bg-zinc-100 dark:bg-zinc-800 rounded-[22px] rounded-bl-md" />
                    </div>
                    {/* Mine bubble */}
                    <div className="flex flex-row-reverse items-end gap-2">
                      <div className="h-10 w-36 bg-zinc-200 dark:bg-zinc-700 rounded-[22px] rounded-br-md" />
                    </div>
                    {/* Other person bubble */}
                    <div className="flex items-end gap-2">
                      <div className="w-7 h-7 rounded-full bg-zinc-200 dark:bg-zinc-800 flex-none" />
                      <div className="h-14 w-56 bg-zinc-100 dark:bg-zinc-800 rounded-[22px] rounded-bl-md" />
                    </div>
                    {/* Mine bubble */}
                    <div className="flex flex-row-reverse items-end gap-2">
                      <div className="h-10 w-44 bg-zinc-200 dark:bg-zinc-700 rounded-[22px] rounded-br-md" />
                    </div>
                    <div className="flex flex-row-reverse items-end gap-2">
                      <div className="h-8 w-28 bg-zinc-200 dark:bg-zinc-700 rounded-[22px] rounded-br-md" />
                    </div>
                    <div className="flex items-end gap-2">
                      <div className="w-7 h-7 rounded-full bg-zinc-200 dark:bg-zinc-800 flex-none" />
                      <div className="h-10 w-40 bg-zinc-100 dark:bg-zinc-800 rounded-[22px] rounded-bl-md" />
                    </div>
                  </div>
                )}

                {/* ── Empty state (only after loading is done) ── */}
                {!loadingMessages && messages.length === 0 && !checkingRequest && (
                  <div className="flex flex-col items-center justify-center h-full gap-4 text-zinc-400 pb-12">
                    <div className="w-20 h-20 rounded-full bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center overflow-hidden">
                      <Avatar profile={selected} size={80} />
                    </div>
                    <div className="text-center">
                      <p className="font-bold text-zinc-700 dark:text-zinc-300 text-[16px]">{selected.full_name}</p>
                      <p className="text-[13px] text-zinc-400 mt-1">@{selected.username}</p>
                    </div>
                    <p className="text-[13px] text-center max-w-[240px] text-zinc-400 leading-relaxed">
                      🔒 End-to-end encrypted. Only you two can read these.
                    </p>
                  </div>
                )}

                {/* ── Chat Profile Header (Visible when messages exist or while loading) ── */}
                {!loadingMessages && messages.length > 0 && (
                  <div className="flex flex-col items-center justify-center py-10 px-6 border-b border-zinc-50 dark:border-zinc-900/40 mb-2">
                    <Link href={`/profile?id=${selected.id}`} className="block relative mb-4 active:scale-95 transition-transform">
                      <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-zinc-100 dark:border-zinc-800">
                        <Avatar profile={selected} size={96} />
                      </div>
                    </Link>
                    <div className="text-center">
                      <h2 className="text-[20px] font-black">{selected.full_name}</h2>
                      <p className="text-[13px] text-zinc-400 mb-2">@{selected.username}</p>
                      <p className="text-[13px] text-zinc-500 font-medium">
                        <span className="font-bold text-zinc-700 dark:text-zinc-300">{selectedFollowers}</span> followers
                      </p>
                      <p className="text-[12px] text-zinc-400 mt-4 leading-relaxed">
                        You're both on JPM
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex flex-col gap-0.5 justify-end min-h-full">
                  {messages.map((m: any, i: number) => {
                    if (m._type === 'call') {
                      const isMissed = m.status === 'rejected' || (m.status === 'ringing' && !m.ended_at)
                      const isMine = m.caller_id === user.id
                      let durationLabel = ''
                      if (m.duration_seconds && m.duration_seconds > 0) {
                        const mins = Math.floor(m.duration_seconds / 60)
                        const secs = m.duration_seconds % 60
                        durationLabel = mins > 0 ? `${mins} min${mins > 1 ? 's' : ''}` : `${secs}s`
                      }
                      return (
                        <div key={m.id} className="flex items-center justify-center my-2">
                          <div className={`flex items-center gap-2 px-4 py-2 rounded-full text-[12.5px] font-semibold ${
                            isMissed ? 'bg-red-50 dark:bg-red-950/40 text-red-500' : 'bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400'
                          }`}>
                            {isMissed
                              ? <PhoneXMarkIcon className="w-3.5 h-3.5 flex-none" />
                              : <PhoneArrowDownLeftIcon className="w-3.5 h-3.5 flex-none" />
                            }
                            <span>
                              {isMissed
                                ? (isMine ? 'Call not answered' : 'Missed call')
                                : `${isMine ? 'Outgoing' : 'Incoming'} call${durationLabel ? ` · ${durationLabel}` : ''}`
                              }
                            </span>
                            <span className="text-zinc-400 font-normal">· {msgTime(m.created_at)}</span>
                          </div>
                        </div>
                      )
                    }

                    const mine = m.sender_id === user.id
                    const next = messages[i + 1]
                    const prev = messages[i - 1]
                    const sameAsPrev = prev && prev._type === 'message' && prev.sender_id === m.sender_id
                    const sameAsNext = next && next._type === 'message' && next.sender_id === m.sender_id
                    const showTime   = !next || +new Date(next.created_at) - +new Date(m.created_at) > 5 * 60 * 1000

                    const mineRound   = `rounded-[22px] ${!sameAsPrev ? '' : 'rounded-tr-md'} ${!sameAsNext ? '' : 'rounded-br-md'}`
                    const othersRound = `rounded-[22px] ${!sameAsPrev ? '' : 'rounded-tl-md'} ${!sameAsNext ? '' : 'rounded-bl-md'}`

                    const lastSentMsgId = [...messages].reverse().find(m => m._type === 'message' && m.sender_id === user.id)?.id
                    const showSeen = mine && m.id === lastSentMsgId && m.is_read
                    const topGap = !sameAsPrev ? 'mt-3' : 'mt-[3px]'

                    return (
                      <div key={m.id} className={`flex ${mine ? 'flex-row-reverse' : 'flex-row'} items-end gap-1.5 ${topGap}`}>
                        {!mine && (
                          <div className="flex-none w-[28px] self-end mb-0.5">
                            {!sameAsNext ? <Avatar profile={selected} size={28} /> : <div className="w-7" />}
                          </div>
                        )}

                        <div className={`flex flex-col max-w-[72%] ${mine ? 'items-end' : 'items-start'}`}>
                          <div className="relative group/bbl">
                            {mine && (
                              <button onClick={() => deleteMsg(m.id, m.content)}
                                className="absolute -top-8 right-0 z-20 opacity-0 group-hover/bbl:opacity-100 px-3 py-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-full text-[11px] font-semibold text-zinc-500 hover:text-red-500 shadow-sm transition-all whitespace-nowrap select-none">
                                Unsend
                              </button>
                            )}
                            {m.content.startsWith('voice:') ? (
                              <VoiceNote url={m.content.slice(6)} mine={mine} />
                            ) : (
                              <div className={`px-[14px] py-[10px] text-[14.5px] leading-relaxed break-words whitespace-pre-wrap select-text ${
                                mine
                                  ? `bg-blue-600 text-white ${mineRound}`
                                  : `bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-800 shadow-sm ${othersRound}`
                              }`}>
                                {m.content}
                              </div>
                            )}
                          </div>
                          {mine && (
                            <div className="flex justify-end mt-1 px-1">
                              <div className="flex items-center">
                                {m.is_read ? (
                                  <div className="flex -space-x-1.5">
                                    <CheckIcon className="w-3.5 h-3.5 text-blue-500 stroke-[3]" />
                                    <CheckIcon className="w-3.5 h-3.5 text-blue-500 stroke-[3]" />
                                  </div>
                                ) : m.is_delivered ? (
                                  <div className="flex -space-x-1.5">
                                    <CheckIcon className="w-3.5 h-3.5 text-zinc-400 stroke-[3]" />
                                    <CheckIcon className="w-3.5 h-3.5 text-zinc-400 stroke-[3]" />
                                  </div>
                                ) : (
                                  <CheckIcon className="w-3.5 h-3.5 text-zinc-400 stroke-[3]" />
                                )}
                                <span className="text-[10px] text-zinc-400 ml-1.5">{msgTime(m.created_at)}</span>
                              </div>
                            </div>
                          )}
                          {!mine && showTime && (
                             <p className="text-[10.5px] text-zinc-400 mt-1 px-1">{msgTime(m.created_at)}</p>
                          )}
                        </div>
                      </div>
                    )
                  })}

                  {isTyping && (
                    <div className="flex flex-row items-end gap-1.5 mt-3">
                      <div className="flex-none w-[28px] self-end mb-0.5">
                        <Avatar profile={selected} size={28} />
                      </div>
                      <div className="bg-zinc-100 dark:bg-zinc-900 rounded-[22px] rounded-bl-md px-4 py-3 flex items-center gap-1.5 h-[40px]">
                        <span className="w-2 h-2 bg-zinc-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
                        <span className="w-2 h-2 bg-zinc-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
                        <span className="w-2 h-2 bg-zinc-400 rounded-full animate-bounce" />
                      </div>
                    </div>
                  )}
                  <div ref={bottomRef} className="h-2" />
                </div>
              </div>

              {/* ── Input bar / Request bar ── */}
              {checkingRequest ? (
                <div className="flex-none flex items-center justify-center h-[64px] border-t border-zinc-100 dark:border-zinc-900">
                  <div className="w-5 h-5 border-2 border-zinc-300 border-t-black dark:border-t-white rounded-full animate-spin" />
                </div>
              ) : requestStatus === 'allowed' ? (
                // Normal message input
                <form onSubmit={sendMessage}
                  className="flex-none flex items-end gap-2 px-3 py-3 bg-zinc-50 dark:bg-black"
                  style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}>

                  <div className="flex-1 bg-white dark:bg-zinc-900 rounded-[24px] px-2 py-1 flex items-center min-h-[44px] shadow-sm border border-zinc-200 dark:border-zinc-800" style={{ touchAction: 'pan-x pan-y' }}>
                    
                    <input
                      ref={inputRef}
                      type="text"
                      value={input}
                      onChange={handleTyping}
                      onKeyDown={e => {
                        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(e as any) }
                      }}
                      placeholder={recording ? '🔴 Recording…' : 'Type a message...'}
                      autoComplete="off"
                      disabled={recording}
                      className="flex-1 bg-transparent text-[15px] px-3 outline-none placeholder-zinc-400 text-zinc-900 dark:text-zinc-100 disabled:cursor-not-allowed"
                    />

                    <button type="button" className="p-2 text-zinc-400 dark:text-zinc-500 hover:text-blue-600 transition-colors">
                      <FaceSmileIcon className="w-6 h-6" />
                    </button>

                    {!input.trim() && (
                      <button
                        type="button"
                        onClick={startRecording}
                        className={`p-2 transition-colors ${
                          recording
                            ? 'text-red-500 animate-record'
                            : 'text-zinc-400 dark:text-zinc-500 hover:text-blue-600'
                        }`}
                        aria-label="Tap to record voice note"
                      >
                        <MicrophoneIcon className="w-6 h-6" />
                      </button>
                    )}
                  </div>

                  {(input.trim() || sending) && (
                    <button
                      type="submit"
                      disabled={!input.trim() || sending}
                      className="flex-none w-[44px] h-[44px] rounded-full bg-blue-600 text-white flex items-center justify-center disabled:opacity-40 active:scale-95 transition-all shadow-md ml-1"
                      aria-label="Send"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 -ml-0.5">
                        <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
                      </svg>
                    </button>
                  )}
                </form>
              ) : requestStatus === 'pending_sent' ? (
                // Request already sent — waiting
                <div className="flex-none px-4 py-4 border-t border-zinc-100 dark:border-zinc-900 bg-white dark:bg-black flex flex-col items-center gap-2"
                  style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
                  <p className="text-[13px] font-semibold text-zinc-500">Message request sent</p>
                  <p className="text-[12px] text-zinc-400 text-center">You can message {selected.full_name} once they accept your request.</p>
                </div>
              ) : requestStatus === 'pending_received' ? (
                // They sent us a request — show accept/decline
                <div className="flex-none px-4 py-4 border-t border-zinc-100 dark:border-zinc-900 bg-white dark:bg-black flex flex-col items-center gap-3"
                  style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
                  <p className="text-[13px] text-zinc-500 text-center">{selected.full_name} wants to send you messages.</p>
                  <div className="flex gap-3">
                    <button
                      onClick={() => declineRequest(selected.id)}
                      className="px-6 py-2.5 rounded-full border border-zinc-200 dark:border-zinc-700 text-[14px] font-bold text-zinc-600 hover:border-red-400 hover:text-red-500 transition-colors"
                    >
                      Decline
                    </button>
                    <button
                      onClick={() => acceptRequest(selected.id)}
                      className="px-6 py-2.5 rounded-full bg-black dark:bg-white text-white dark:text-black text-[14px] font-bold hover:opacity-80 transition-opacity"
                    >
                      Accept
                    </button>
                  </div>
                </div>
              ) : requestStatus === 'declined' ? (
                <div className="flex-none px-4 py-4 border-t border-zinc-100 dark:border-zinc-900 bg-white dark:bg-black flex items-center justify-center"
                  style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
                  <p className="text-[13px] text-zinc-400">This request was declined.</p>
                </div>
              ) : (
                // No relationship — show send request button
                <div className="flex-none px-4 py-4 border-t border-zinc-100 dark:border-zinc-900 bg-white dark:bg-black flex flex-col items-center gap-3"
                  style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
                  <p className="text-[13px] text-zinc-400 text-center">
                    To start a conversation, send a message request to {selected.full_name}.
                  </p>
                  <button
                    onClick={sendMessageRequest}
                    className="px-8 py-3 bg-black dark:bg-white text-white dark:text-black font-bold rounded-xl text-[15px] hover:opacity-80 active:scale-95 transition-all"
                  >
                    Send Message Request
                  </button>
                </div>
              )}
            </>
          ) : (
            /* Desktop placeholder when no convo selected */
            <div className="flex-1 flex flex-col items-center justify-center gap-5 text-zinc-400 text-center px-8">
              <div className="w-24 h-24 rounded-full bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center">
                <ChatBubbleLeftRightIcon className="w-10 h-10" />
              </div>
              <div>
                <p className="font-black text-lg text-zinc-700 dark:text-zinc-300">Your Messages</p>
                <p className="text-sm mt-1 leading-relaxed max-w-xs text-zinc-400">Select a conversation or open a profile and tap Message</p>
              </div>
            </div>
          )}

          {/* Options Popup (Bottom Sheet) */}
          {showOptions && selected && (
            <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
              <div 
                className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
                onClick={() => setShowOptions(false)}
              />
              <div className="relative w-full max-w-sm bg-white dark:bg-zinc-900 rounded-t-[24px] sm:rounded-[24px] shadow-2xl overflow-hidden animate-in slide-in-from-bottom-full duration-300">
                {/* Handle for mobile */}
                <div className="sm:hidden flex justify-center py-3">
                  <div className="w-10 h-1 bg-zinc-200 dark:bg-zinc-800 rounded-full" />
                </div>
                
                <div className="px-4 pb-4 sm:pt-4">
                  <div className="flex flex-col gap-1 mb-4 sm:mb-6">
                    <div className="flex justify-center mb-2">
                      <Avatar profile={selected} size={56} />
                    </div>
                    <p className="text-center font-bold text-[17px]">{selected.full_name}</p>
                    <p className="text-center text-[13px] text-zinc-400">@{selected.username}</p>
                  </div>

                  <div className="space-y-1">
                    <button className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors text-left group">
                      <div className="p-2 bg-zinc-100 dark:bg-zinc-800 rounded-lg group-hover:bg-white dark:group-hover:bg-zinc-700 transition-colors">
                        <Square2StackIcon className="w-5 h-5" />
                      </div>
                      <span className="font-semibold text-[15px]">Shared content</span>
                    </button>
                    
                    <button className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors text-left group">
                      <div className="p-2 bg-zinc-100 dark:bg-zinc-800 rounded-lg group-hover:bg-white dark:group-hover:bg-zinc-700 transition-colors">
                        <BellSlashIcon className="w-5 h-5" />
                      </div>
                      <span className="font-semibold text-[15px]">Mute</span>
                    </button>

                    <button className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors text-left group">
                      <div className="p-2 bg-zinc-100 dark:bg-zinc-800 rounded-lg group-hover:bg-white dark:group-hover:bg-zinc-700 transition-colors">
                        <NoSymbolIcon className="w-5 h-5" />
                      </div>
                      <span className="font-semibold text-[15px]">Restrict</span>
                    </button>

                    <div className="h-[1px] bg-zinc-100 dark:bg-zinc-800 my-2" />

                    <button className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors text-left group text-red-500">
                      <div className="p-2 bg-red-50 dark:bg-red-900/20 rounded-lg group-hover:bg-white dark:group-hover:bg-red-900/30 transition-colors">
                        <HandRaisedIcon className="w-5 h-5" />
                      </div>
                      <span className="font-bold text-[15px]">Block</span>
                    </button>

                    <button className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors text-left group text-red-500">
                      <div className="p-2 bg-red-50 dark:bg-red-900/20 rounded-lg group-hover:bg-white dark:group-hover:bg-red-900/30 transition-colors">
                        <ExclamationTriangleIcon className="w-5 h-5" />
                      </div>
                      <span className="font-bold text-[15px]">Report</span>
                    </button>
                  </div>

                  <button 
                    onClick={() => setShowOptions(false)}
                    className="w-full mt-4 py-3.5 bg-zinc-100 dark:bg-zinc-800 rounded-xl font-bold text-[15px] active:scale-[0.98] transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>


      </div>
    </AppLayout>
  )
}

export default function MessagesPage() {
  return (
    <Suspense fallback={
      <AppLayout>
        <div className="flex items-center justify-center h-[60vh]">
          <div className="w-6 h-6 border-2 border-zinc-200 border-t-black dark:border-t-white rounded-full animate-spin" />
        </div>
      </AppLayout>
    }>
      <MessagesContent />
    </Suspense>
  )
}
