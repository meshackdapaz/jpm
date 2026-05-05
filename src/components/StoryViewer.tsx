'use client'

import React, { useEffect, useState, useRef } from 'react'
import { createPortal } from 'react-dom'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from './AuthProvider'
import Image from 'next/image'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { XMarkIcon, ChevronLeftIcon, ChevronRightIcon, EyeIcon, HeartIcon, PaperAirplaneIcon } from '@heroicons/react/24/outline'
import { HeartIcon as HeartIconSolid } from '@heroicons/react/24/solid'

function timeLeft(expiresAt: string) {
  const diff = Math.max(0, new Date(expiresAt).getTime() - Date.now())
  const h = Math.floor(diff / 3600000)
  const m = Math.floor((diff % 3600000) / 60000)
  if (h > 0) return `${h}h`
  return `${m}m`
}
export function StoryViewer({ stories, startIndex, onClose }: { stories: any[], startIndex: number, onClose: () => void }) {
  // Group stories by creator
  const groupedStories = stories.reduce((acc: any[], story: any) => {
    const lastGroup = acc[acc.length - 1]
    if (lastGroup && lastGroup.creator_id === story.creator_id) {
      lastGroup.items.push(story)
    } else {
      acc.push({
        creator_id: story.creator_id,
        profiles: story.profiles,
        items: [story]
      })
    }
    return acc
  }, [])

  // Find initial user and slide
  const initialUserIndex = groupedStories.findIndex((g: any) => 
    g.items.some((item: any) => item.id === stories[startIndex].id)
  )
  const initialSlideIndex = groupedStories[initialUserIndex]?.items.findIndex((item: any) => 
    item.id === stories[startIndex].id
  ) || 0

  const [userIndex, setUserIndex] = useState(initialUserIndex)
  const [slideIndex, setSlideIndex] = useState(initialSlideIndex)
  const [progress, setProgress] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const [isLiked, setIsLiked] = useState(false)
  const [reply, setReply] = useState('')
  const [showReactions, setShowReactions] = useState(false)

  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const progressRef = useRef<number>(0)
  const lastTickRef = useRef<number>(Date.now())
  const { user } = useAuth()
  const supabase = createClient()
  const DURATION = 5000

  const currentGroup = groupedStories[userIndex]
  const current = currentGroup?.items[slideIndex]

  const [localViews, setLocalViews] = useState<Record<string, number>>({})

  // Real-time View Count Subscription
  useEffect(() => {
    if (!current?.id) return

    const channel = supabase
      .channel(`story_views_${current.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'stories',
          filter: `id=eq.${current.id}`
        },
        (payload: any) => {
          if (payload.new && typeof payload.new.view_count === 'number') {
            setLocalViews((prev: Record<string, number>) => ({ ...prev, [current.id]: payload.new.view_count }))
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [current?.id, supabase])

  // Media Prefetching
  useEffect(() => {
    // Prefetch next slide in current group
    if (slideIndex < currentGroup.items.length - 1) {
      const next = currentGroup.items[slideIndex + 1]
      if (next.image_url) {
        const img = new (window as any).Image()
        img.src = next.image_url
      }
    }
    // Prefetch first slide of next user
    else if (userIndex < groupedStories.length - 1) {
      const nextUserFirst = groupedStories[userIndex + 1].items[0]
      if (nextUserFirst.image_url) {
        const img = new (window as any).Image()
        img.src = nextUserFirst.image_url
      }
    }
  }, [userIndex, slideIndex, currentGroup, groupedStories])

  useEffect(() => {
    if (!current || !user) return
    
    // Only count as view if not seen yet
    if (!current.is_seen) {
      current.is_seen = true // mark locally seen
      setLocalViews(prev => ({ ...prev, [current.id]: (current.view_count || 0) + 1 }))
      
      // Fire and forget view recording
      supabase.from('story_views').insert({ story_id: current.id, viewer_id: user.id }).then()
    }
  }, [current, user])
  useEffect(() => {
    // Check if liked
    const checkLike = async () => {
      if (!user || !current) return
      const { data } = await supabase
        .from('story_likes')
        .select('*')
        .eq('story_id', current.id)
        .eq('user_id', user.id)
        .maybeSingle()
      setIsLiked(!!data)
    }

    setProgress(0)
    progressRef.current = 0
    lastTickRef.current = Date.now()
    setIsPaused(false)
    setReply('')
    checkLike()
  }, [userIndex, slideIndex, user])

  useEffect(() => {
    if (isPaused) return

    lastTickRef.current = Date.now()
    
    intervalRef.current = setInterval(() => {
      const now = Date.now()
      const delta = now - lastTickRef.current
      lastTickRef.current = now

      progressRef.current += (delta / DURATION) * 100
      
      if (progressRef.current >= 100) {
        progressRef.current = 100
        setProgress(100)
        if (intervalRef.current) clearInterval(intervalRef.current)
        
        handleNext()
      } else {
        setProgress(progressRef.current)
      }
    }, 16)

    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [userIndex, slideIndex, isPaused])

  const handleNext = () => {
    if (slideIndex < currentGroup.items.length - 1) {
      setSlideIndex((s: number) => s + 1)
    } else if (userIndex < groupedStories.length - 1) {
      setUserIndex((u: number) => u + 1)
      setSlideIndex(0)
    } else {
      onClose()
    }
  }

  const handlePrev = () => {
    if (slideIndex > 0) {
      setSlideIndex((s: number) => s - 1)
    } else if (userIndex > 0) {
      const prevUserIndex = userIndex - 1
      setUserIndex(prevUserIndex)
      setSlideIndex(groupedStories[prevUserIndex].items.length - 1)
    } else {
      // First story of first user, restart or stay?
      setProgress(0)
      progressRef.current = 0
    }
  }

  const handleLike = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!user || !current) return
    
    const newLiked = !isLiked
    setIsLiked(newLiked) // Optimistic update

    if (newLiked) {
      await supabase.from('story_likes').insert({ story_id: current.id, user_id: user.id })
    } else {
      await supabase.from('story_likes').delete().eq('story_id', current.id).eq('user_id', user.id)
    }
  }

  const handleReply = async (e: React.FormEvent | React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!user || !current || !reply.trim()) return

    const content = reply.trim()
    setReply('')
    setIsPaused(false)

    // 1. Find or create conversation
    const { data: conv } = await supabase
      .from('conversations')
      .select('id')
      .contains('participants', [user.id, current.creator_id])
      .maybeSingle()

    let conversationId = conv?.id

    if (!conversationId) {
      const { data: newConv } = await supabase
        .from('conversations')
        .insert({ participants: [user.id, current.creator_id] })
        .select('id')
        .single()
      conversationId = newConv?.id
    }

    if (conversationId) {
      await supabase.from('messages').insert({
        conversation_id: conversationId,
        sender_id: user.id,
        content: `Replied to story: ${content}`,
        story_id: current.id
      })
    }
  }

  const handleReact = async (emoji: string) => {
    if (!user || !current) return
    setShowReactions(false)
    
    // 1. Send as message
    const { data: conv } = await supabase
      .from('conversations')
      .select('id')
      .contains('participants', [user.id, current.creator_id])
      .maybeSingle()

    let conversationId = conv?.id
    if (!conversationId) {
      const { data: newConv } = await supabase
        .from('conversations')
        .insert({ participants: [user.id, current.creator_id] })
        .select('id')
        .single()
      conversationId = newConv?.id
    }

    if (conversationId) {
      await supabase.from('messages').insert({
        conversation_id: conversationId,
        sender_id: user.id,
        content: emoji,
        story_id: current.id
      })
    }

    // 2. Add to story_likes (as a 'reaction')
    await supabase.from('story_likes').upsert({ 
      story_id: current.id, 
      user_id: user.id,
      reaction_type: emoji 
    })
    setIsLiked(true)
  }

  const goNext = (e?: React.MouseEvent) => {
    e?.stopPropagation()
    handleNext()
  }

  const goPrev = (e?: React.MouseEvent) => {
    e?.stopPropagation()
    handlePrev()
  }

  if (!current) return null

  const bgStyle = current.image_url ? {} : { background: current.bg_color || '#000000' }

  const content = (
    <AnimatePresence mode="wait">
      <motion.div
        className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/95 backdrop-blur-xl"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        {/* Desktop Navigation Arrows */}
        <div className="hidden md:block">
          {(userIndex > 0 || slideIndex > 0) && (
            <button
              onClick={goPrev}
              className="absolute left-6 top-1/2 -translate-y-1/2 z-[100] w-12 h-12 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white transition-all border border-white/20 shadow-xl group active:scale-90"
            >
              <ChevronLeftIcon className="w-7 h-7 group-hover:-translate-x-0.5 transition-transform" />
            </button>
          )}
          {(userIndex < groupedStories.length - 1 || slideIndex < currentGroup.items.length - 1) && (
            <button
              onClick={goNext}
              className="absolute right-6 top-1/2 -translate-y-1/2 z-[100] w-12 h-12 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white transition-all border border-white/20 shadow-xl group active:scale-90"
            >
              <ChevronRightIcon className="w-7 h-7 group-hover:translate-x-0.5 transition-transform" />
            </button>
          )}
        </div>

        <motion.div
          key={userIndex}
          initial={{ x: 300, opacity: 0, scale: 0.9 }}
          animate={{ x: 0, opacity: 1, scale: 1 }}
          exit={{ x: -300, opacity: 0, scale: 0.9 }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="relative w-full max-w-md h-[100dvh] sm:h-[92vh] sm:max-h-[850px] sm:rounded-[40px] overflow-hidden bg-zinc-950 shadow-[0_0_80px_rgba(0,0,0,0.8)]"
          onClick={e => e.stopPropagation()}
        >
          {/* Dynamic Blurred Background */}
          {current.image_url && (
            <div className="absolute inset-0 z-0">
              <Image 
                src={current.image_url} 
                alt="" 
                fill 
                className="object-cover blur-[80px] opacity-40 scale-150" 
                unoptimized 
              />
              <div className="absolute inset-0 bg-black/40" />
            </div>
          )}

          {/* Progress bars (Multi-segment) */}
          <div className="absolute top-0 left-0 right-0 z-50 flex gap-1.5 px-4 pt-[calc(1.5rem+env(safe-area-inset-top))]">
            {currentGroup.items.map((_: any, i: number) => (
              <div key={i} className="flex-1 h-[3px] bg-white/20 rounded-full overflow-hidden backdrop-blur-sm">
                <div
                  className="h-full bg-white rounded-full transition-all duration-100 ease-linear shadow-[0_0_12px_rgba(255,255,255,0.8)]"
                  style={{
                    width: i < slideIndex ? '100%' : i === slideIndex ? `${progress}%` : '0%',
                  }}
                />
              </div>
            ))}
          </div>

          {/* Media Content with Slide transition */}
          <AnimatePresence mode="wait">
            <motion.div
              key={`${userIndex}-${slideIndex}`}
              initial={{ opacity: 0, scale: 1.05 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.4, ease: [0.33, 1, 0.68, 1] }}
              className="absolute inset-0 z-10 flex items-center justify-center"
            >
              {current.image_url ? (
                <Image 
                  src={current.image_url} 
                  alt="Story" 
                  fill 
                  className="object-contain pointer-events-none select-none" 
                  unoptimized 
                  draggable={false} 
                />
              ) : (
                <div className="w-full h-full" style={{ background: current.bg_color || '#101010' }} />
              )}
              {/* Overlays */}
              <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/70 z-20 pointer-events-none" />
            </motion.div>
          </AnimatePresence>

          {/* Header row */}
          <div className="absolute top-[calc(3.5rem+env(safe-area-inset-top))] left-0 right-0 z-30 flex items-center gap-3 px-5">
            <Link 
              href={`/profile?id=${current.creator_id}`}
              className="flex items-center gap-3 group flex-grow min-w-0"
              onClick={() => onClose()}
            >
              <div className="w-10 h-10 rounded-full ring-2 ring-white/30 p-0.5 overflow-hidden flex-none transition-transform group-active:scale-90">
                {current.profiles?.avatar_url ? (
                  <Image src={current.profiles.avatar_url} alt="" width={36} height={36} className="object-cover w-full h-full rounded-full" unoptimized />
                ) : (
                  <div className="w-full h-full bg-zinc-800 rounded-full flex items-center justify-center text-white text-sm font-black">
                    {current.profiles?.full_name?.[0]?.toUpperCase() || 'U'}
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="text-white text-[15px] font-black leading-none truncate group-hover:underline decoration-white/30 underline-offset-2">
                    {current.profiles?.full_name || current.profiles?.username}
                  </p>
                  <p className="text-white/50 text-[13px] font-medium shrink-0">{timeLeft(current.expires_at)}</p>
                </div>
                {current.profiles?.username && <p className="text-white/40 text-[11px] font-medium">@{current.profiles.username}</p>}
              </div>
            </Link>

            <div className="flex items-center gap-1">
              <div className="flex items-center gap-1.5 text-white bg-white/10 backdrop-blur-xl px-3 py-1.5 rounded-full border border-white/10">
                <EyeIcon className="w-4 h-4 text-white/70" />
                <span className="text-[13px] font-black tabular-nums">{localViews[current.id] || current.view_count || 0}</span>
              </div>
              <button
                onClick={onClose}
                className="w-10 h-10 flex items-center justify-center text-white/70 hover:text-white transition-all active:scale-90"
              >
                <XMarkIcon className="w-8 h-8" />
              </button>
            </div>
          </div>

          {/* Text content overlay */}
          {current.text_content && (
            <div className="absolute inset-0 z-20 flex items-center justify-center px-12 pointer-events-none">
              <p
                className="text-[34px] font-black text-center leading-[1.1] tracking-tight drop-shadow-[0_4px_12px_rgba(0,0,0,0.5)]"
                style={{
                  color: current.bg_color === '#ffffff' ? '#000000' : '#ffffff',
                }}
              >
                {current.text_content}
              </p>
            </div>
          )}

          {/* Interaction Zones */}
          <div className="absolute inset-y-0 left-0 w-[20%] z-20 cursor-pointer" onClick={goPrev} />
          <div className="absolute inset-y-0 right-0 w-[20%] z-20 cursor-pointer" onClick={goNext} />
          <div 
            className="absolute inset-y-0 left-[20%] right-[20%] z-10 touch-none" 
            onPointerDown={() => setIsPaused(true)}
            onPointerUp={() => setIsPaused(false)}
            onPointerCancel={() => setIsPaused(false)}
            onPointerLeave={() => setIsPaused(false)}
          >
             {/* Hold Indicator */}
             <AnimatePresence>
               {isPaused && (
                 <motion.div 
                   initial={{ opacity: 0, scale: 0.8 }}
                   animate={{ opacity: 1, scale: 1 }}
                   exit={{ opacity: 0, scale: 0.8 }}
                   className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-black/20 backdrop-blur-md px-4 py-2 rounded-2xl flex items-center gap-2 border border-white/10"
                 >
                   <div className="flex gap-1">
                     <div className="w-1.5 h-4 bg-white rounded-full" />
                     <div className="w-1.5 h-4 bg-white rounded-full" />
                   </div>
                   <span className="text-white text-xs font-black uppercase tracking-widest">Paused</span>
                 </motion.div>
               )}
             </AnimatePresence>
          </div>

          {/* Bottom Action Bar */}
          <div className="absolute bottom-0 left-0 right-0 z-40 px-4 pb-[calc(1.75rem+env(safe-area-inset-bottom))] bg-gradient-to-t from-black/90 via-black/40 to-transparent pt-20">
            
            <AnimatePresence>
              {showReactions && (
                <motion.div 
                  initial={{ opacity: 0, y: 20, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 20, scale: 0.9 }}
                  className="absolute bottom-full left-4 right-4 mb-4 p-2.5 bg-black/40 backdrop-blur-2xl border border-white/15 rounded-[24px] flex items-center justify-around z-50 shadow-2xl"
                >
                  {['🔥', '❤️', '😂', '😮', '😢', '👏'].map(emoji => (
                    <button
                      key={emoji}
                      onClick={() => handleReact(emoji)}
                      className="text-3xl hover:scale-125 active:scale-75 transition-transform p-2 drop-shadow-lg"
                    >
                      {emoji}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex items-center gap-3">
              <form onSubmit={handleReply} className="flex-grow relative group">
                <input
                  type="text"
                  placeholder="Send message"
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  onFocus={() => {
                    setIsPaused(true)
                    setShowReactions(true)
                  }}
                  onBlur={() => {
                    setTimeout(() => {
                      setIsPaused(false)
                      setShowReactions(false)
                    }, 250)
                  }}
                  className="w-full bg-white/10 hover:bg-white/15 border border-white/20 rounded-full px-6 py-3 text-white placeholder-white/60 text-[15px] font-semibold outline-none focus:border-white/50 focus:bg-white/20 transition-all backdrop-blur-2xl ring-1 ring-white/5 shadow-inner"
                />
              </form>
              <div className="flex items-center gap-2">
                <button 
                  onClick={handleLike}
                  className="flex-none w-11 h-11 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 active:scale-75 transition-all backdrop-blur-2xl border border-white/20 shadow-lg"
                >
                  {isLiked ? (
                    <HeartIconSolid className="w-6 h-6 text-red-500 drop-shadow-[0_0_8px_rgba(239,68,68,0.5)]" />
                  ) : (
                    <HeartIcon className="w-6 h-6 text-white" />
                  )}
                </button>
                <button 
                  onClick={(e) => {
                    e.stopPropagation()
                  }}
                  className="flex-none w-11 h-11 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 active:scale-75 transition-all backdrop-blur-2xl border border-white/20 shadow-lg"
                >
                  <PaperAirplaneIcon className="w-6 h-6 text-white -rotate-45 -translate-y-0.5" />
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )

  if (typeof document === 'undefined') return null
  return createPortal(content, document.body)
}
