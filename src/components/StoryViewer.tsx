'use client'

import React, { useEffect, useState, useRef } from 'react'
import { createPortal } from 'react-dom'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from './AuthProvider'
import Image from 'next/image'
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

export function StoryViewer({ stories, startIndex = 0, onClose }: {
  stories: any[]
  startIndex?: number
  onClose: () => void
}) {
  const [currentIndex, setCurrentIndex] = useState(startIndex)
  const [progress, setProgress] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const [isLiked, setIsLiked] = useState(false)
  const [reply, setReply] = useState('')
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const progressRef = useRef<number>(0)
  const lastTickRef = useRef<number>(Date.now())
  const { user } = useAuth()
  const supabase = createClient()
  const DURATION = 5000

  const current = stories[currentIndex]

  const [localViews, setLocalViews] = useState<Record<string, number>>({})

  useEffect(() => {
    if (!current || !user) return
    
    // Only count as view if not seen yet
    if (!current.is_seen) {
      current.is_seen = true // mark locally seen
      setLocalViews(prev => ({ ...prev, [current.id]: (current.view_count || 0) + 1 }))
      
      // Fire and forget view recording
      supabase.from('story_views').insert({ story_id: current.id, viewer_id: user.id })
        .then(({ error }: { error: any }) => {
          if (!error) {
            supabase.rpc('increment_story_view', { p_story_id: current.id })
              .then()
          }
        })
    }
  }, [current, user])

  useEffect(() => {
    setProgress(0)
    progressRef.current = 0
    lastTickRef.current = Date.now()
    setIsPaused(false)
    setIsLiked(false)
    setReply('')
  }, [currentIndex])

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
        
        if (currentIndex < stories.length - 1) {
          setCurrentIndex(i => i + 1)
        } else {
          onClose()
        }
      } else {
        setProgress(progressRef.current)
      }
    }, 16) // ~60fps for smooth progress

    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [currentIndex, isPaused, stories.length, onClose])

  const goNext = (e?: React.MouseEvent) => {
    e?.stopPropagation()
    if (currentIndex < stories.length - 1) setCurrentIndex(i => i + 1)
    else onClose()
  }
  const goPrev = (e?: React.MouseEvent) => {
    e?.stopPropagation()
    if (currentIndex > 0) setCurrentIndex(i => i - 1)
  }

  if (!current) return null

  const bgStyle = current.image_url ? {} : { background: current.bg_color || '#000000' }

  const content = (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[999999] flex items-center justify-center bg-black sm:bg-black/95 backdrop-blur-md"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <div
          className="relative w-full max-w-md h-[100dvh] sm:h-[90vh] sm:max-h-[850px] sm:rounded-[32px] overflow-hidden bg-zinc-950 shadow-2xl"
          style={bgStyle}
          onClick={e => e.stopPropagation()}
        >
          {/* Background image */}
          {current.image_url && (
            <Image src={current.image_url} alt="Story" fill className="object-cover pointer-events-none select-none" unoptimized draggable={false} />
          )}

          {/* Overlays */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-transparent to-black/80 z-10 pointer-events-none" />

          {/* Progress bars */}
          <div className="absolute top-0 left-0 right-0 z-30 flex gap-1.5 px-4 pt-4 pt-[calc(1rem+env(safe-area-inset-top))]">
            {stories.map((_, i) => (
              <div key={i} className="flex-1 h-[2px] bg-white/20 rounded-full overflow-hidden">
                <div
                  className="h-full bg-white rounded-full"
                  style={{
                    width: i < currentIndex ? '100%' : i === currentIndex ? `${progress}%` : '0%',
                    transition: i === currentIndex ? 'width 0.05s linear' : 'none',
                  }}
                />
              </div>
            ))}
          </div>

          {/* Header row */}
          <div className="absolute top-[calc(3rem+env(safe-area-inset-top))] left-0 right-0 z-30 flex items-center gap-3 px-5">
            <div className="w-9 h-9 rounded-full ring-2 ring-white/20 overflow-hidden flex-none">
              {current.profiles?.avatar_url ? (
                <Image src={current.profiles.avatar_url} alt="" width={36} height={36} className="object-cover w-full h-full" unoptimized />
              ) : (
                <div className="w-full h-full bg-zinc-800 flex items-center justify-center text-white text-sm font-black">
                  {current.profiles?.full_name?.[0]?.toUpperCase() || 'U'}
                </div>
              )}
            </div>
            <div className="flex-grow min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-white text-[15px] font-bold leading-none truncate">
                  {current.profiles?.full_name || current.profiles?.username}
                </p>
                <span className="text-white/40 text-[13px]">•</span>
                <p className="text-white/60 text-[13px] font-medium">{timeLeft(current.expires_at)}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 text-white/80 bg-black/20 backdrop-blur-md px-2.5 py-1 rounded-full">
                <EyeIcon className="w-4 h-4" />
                <span className="text-[13px] font-bold">{localViews[current.id] || current.view_count || 0}</span>
              </div>
              <button
                onClick={onClose}
                className="w-10 h-10 flex items-center justify-center text-white/80 hover:text-white transition-colors"
              >
                <XMarkIcon className="w-7 h-7" />
              </button>
            </div>
          </div>

          {/* Text content overlay */}
          {current.text_content && (
            <div className="absolute inset-0 z-20 flex items-center justify-center px-10 pointer-events-none">
              <p
                className="text-[32px] font-black text-center leading-[1.2] tracking-tight"
                style={{
                  color: current.bg_color === '#ffffff' ? '#000000' : '#ffffff',
                  textShadow: '0 4px 24px rgba(0,0,0,0.5)',
                }}
              >
                {current.text_content}
              </p>
            </div>
          )}

          {/* Interaction Zones */}
          <div className="absolute inset-y-0 left-0 w-1/4 z-20 cursor-pointer" onClick={goPrev} />
          <div className="absolute inset-y-0 right-0 w-1/4 z-20 cursor-pointer" onClick={goNext} />
          <div 
            className="absolute inset-y-0 left-1/4 right-1/4 z-10" 
            onPointerDown={() => setIsPaused(true)}
            onPointerUp={() => setIsPaused(false)}
            onPointerLeave={() => setIsPaused(false)}
          />

          {/* Bottom Action Bar */}
          <div className="absolute bottom-0 left-0 right-0 z-40 px-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
            <div className="flex items-center gap-4">
              <div className="flex-grow relative group">
                <input
                  type="text"
                  placeholder="Send message"
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  onFocus={() => setIsPaused(true)}
                  onBlur={() => setIsPaused(false)}
                  className="w-full bg-transparent border border-white/30 rounded-full px-5 py-3 text-white placeholder-white/60 text-[15px] font-medium outline-none focus:border-white/60 transition-all backdrop-blur-md"
                />
              </div>
              <button 
                onClick={(e) => {
                  e.stopPropagation()
                  setIsLiked(!isLiked)
                }}
                className="flex-none p-1 transition-transform active:scale-75"
              >
                {isLiked ? (
                  <HeartIconSolid className="w-7 h-7 text-red-500" />
                ) : (
                  <HeartIcon className="w-7 h-7 text-white" />
                )}
              </button>
              <button 
                onClick={(e) => {
                  e.stopPropagation()
                }}
                className="flex-none p-1 transition-transform active:scale-75"
              >
                <PaperAirplaneIcon className="w-7 h-7 text-white -rotate-45 -translate-y-0.5" />
              </button>
            </div>
          </div>

          {/* Desktop Navigation Arrows */}
          <div className="hidden sm:block">
            {currentIndex > 0 && (
              <button
                onClick={goPrev}
                className="absolute left-4 top-1/2 -translate-y-1/2 z-50 w-11 h-11 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white transition-all border border-white/10"
              >
                <ChevronLeftIcon className="w-6 h-6" />
              </button>
            )}
            {currentIndex < stories.length - 1 && (
              <button
                onClick={goNext}
                className="absolute right-4 top-1/2 -translate-y-1/2 z-50 w-11 h-11 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white transition-all border border-white/10"
              >
                <ChevronRightIcon className="w-6 h-6" />
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  )

  if (typeof document === 'undefined') return null
  return createPortal(content, document.body)
}
