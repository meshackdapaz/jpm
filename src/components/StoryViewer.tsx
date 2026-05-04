'use client'

import React, { useEffect, useState, useRef } from 'react'
import { createPortal } from 'react-dom'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from './AuthProvider'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { XMarkIcon, ChevronLeftIcon, ChevronRightIcon, EyeIcon } from '@heroicons/react/24/outline'

function timeLeft(expiresAt: string) {
  const diff = Math.max(0, new Date(expiresAt).getTime() - Date.now())
  const h = Math.floor(diff / 3600000)
  const m = Math.floor((diff % 3600000) / 60000)
  if (h > 0) return `${h}h left`
  return `${m}m left`
}

export function StoryViewer({ stories, startIndex = 0, onClose }: {
  stories: any[]
  startIndex?: number
  onClose: () => void
}) {
  const [currentIndex, setCurrentIndex] = useState(startIndex)
  const [progress, setProgress] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
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
            // Only update total count if insert succeeded (was actually a new view)
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

  const goNext = () => {
    if (currentIndex < stories.length - 1) setCurrentIndex(i => i + 1)
    else onClose()
  }
  const goPrev = () => {
    if (currentIndex > 0) setCurrentIndex(i => i - 1)
  }

  if (!current) return null

  const bgStyle = current.image_url ? {} : { background: current.bg_color || '#000000' }

  const content = (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[999999] flex items-center justify-center bg-black"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <div
          className="relative w-full max-w-sm h-[100dvh] max-h-[812px] sm:rounded-2xl overflow-hidden shadow-2xl"
          style={bgStyle}
          onClick={e => e.stopPropagation()}
          onPointerDown={() => setIsPaused(true)}
          onPointerUp={() => setIsPaused(false)}
          onPointerLeave={() => setIsPaused(false)}
          onPointerCancel={() => setIsPaused(false)}
        >
          {/* Background image */}
          {current.image_url && (
            <Image src={current.image_url} alt="Story" fill className="object-cover pointer-events-none select-none" unoptimized draggable={false} />
          )}

          {/* Top dim */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/50 z-10 pointer-events-none" />

          {/* Progress bars */}
          <div className="absolute top-0 left-0 right-0 z-30 flex gap-1 px-3 pt-3 pt-[calc(0.75rem+env(safe-area-inset-top))]">
            {stories.map((_, i) => (
              <div key={i} className="flex-1 h-[2px] bg-white/30 rounded-full overflow-hidden">
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
          <div className="absolute top-[calc(2.5rem+env(safe-area-inset-top))] left-0 right-0 z-30 flex items-center gap-3 px-4">
            <div className="w-8 h-8 rounded-full ring-1 ring-white/50 overflow-hidden flex-none">
              {current.profiles?.avatar_url ? (
                <Image src={current.profiles.avatar_url} alt="" width={32} height={32} className="object-cover" unoptimized />
              ) : (
                <div className="w-full h-full bg-zinc-700 flex items-center justify-center text-white text-xs font-black">
                  {current.profiles?.full_name?.[0]?.toUpperCase() || 'U'}
                </div>
              )}
            </div>
            <div className="flex-grow min-w-0">
              <p className="text-white text-sm font-black leading-none truncate">
                {current.profiles?.full_name || current.profiles?.username}
              </p>
              <p className="text-white/50 text-[11px] mt-0.5">{timeLeft(current.expires_at)}</p>
            </div>
            <div className="flex items-center gap-1 text-white/60 text-xs">
              <EyeIcon className="w-3.5 h-3.5" />
              <span>{localViews[current.id] || current.view_count || 0}</span>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center text-white/70 hover:text-white"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>

          {/* Text content overlay */}
          {current.text_content && (
            <div className="absolute inset-0 z-20 flex items-center justify-center px-8 pointer-events-none">
              <p
                className="text-3xl font-black text-center leading-snug tracking-tight"
                style={{
                  color: current.bg_color === '#ffffff' ? '#000000' : '#ffffff',
                  textShadow: '0 2px 16px rgba(0,0,0,0.4)',
                }}
              >
                {current.text_content}
              </p>
            </div>
          )}

          {/* Tap zones */}
          <div className="absolute inset-y-0 left-0 w-1/3 z-20" onClick={goPrev} />
          <div className="absolute inset-y-0 right-0 w-1/3 z-20" onClick={goNext} />

          {/* Arrow buttons */}
          {currentIndex > 0 && (
            <button
              onClick={goPrev}
              className="absolute left-2 top-1/2 -translate-y-1/2 z-30 w-8 h-8 bg-black/40 rounded-full flex items-center justify-center text-white"
            >
              <ChevronLeftIcon className="w-4 h-4" />
            </button>
          )}
          {currentIndex < stories.length - 1 && (
            <button
              onClick={goNext}
              className="absolute right-2 top-1/2 -translate-y-1/2 z-30 w-8 h-8 bg-black/40 rounded-full flex items-center justify-center text-white"
            >
              <ChevronRightIcon className="w-4 h-4" />
            </button>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  )

  if (typeof document === 'undefined') return null
  return createPortal(content, document.body)
}
