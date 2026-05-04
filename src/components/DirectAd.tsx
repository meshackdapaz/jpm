'use client'

import React, { useEffect } from 'react'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'

interface DirectAdProps {
  ad: {
    id: string
    title: string
    description: string
    image_url: string
    video_url?: string | null
    target_url: string
  }
}

export function DirectAd({ ad }: DirectAdProps) {
  const supabase = createClient()

  const [hasTracked, setHasTracked] = React.useState(false)
  const adRef = React.useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (hasTracked || !adRef.current) return

    const observer = new IntersectionObserver(
      async (entries) => {
        if (entries[0].isIntersecting) {
          setHasTracked(true)
          observer.disconnect()
          
          // Increment impression count
          const { error } = await supabase.rpc('increment_ad_impression', { ad_id: ad.id })
          if (error) console.error('Failed to record ad impression:', error)
        }
      },
      { threshold: 0.5 } // Requires at least 50% of the ad to be visible
    )

    observer.observe(adRef.current)
    return () => observer.disconnect()
  }, [ad.id, hasTracked, supabase])

  const handleClick = () => {
    supabase.rpc('increment_ad_click', { ad_id: ad.id })
    window.open(ad.target_url, '_blank')
  }

  return (
    <div 
      ref={adRef}
      onClick={handleClick}
      className="w-full bg-white dark:bg-black border-b border-zinc-100 dark:border-zinc-900 cursor-pointer overflow-hidden group"
    >
      <div className="px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-[10px] font-bold text-zinc-500">Ad</div>
          <span className="text-sm font-bold text-zinc-900 dark:text-white">{ad.title}</span>
        </div>
        <span className="text-[10px] font-bold text-violet-500 uppercase tracking-widest">Sponsored</span>
      </div>
      
      <div className="relative w-full aspect-[16/9] bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
        {ad.video_url ? (
          <video
            src={ad.video_url}
            poster={ad.image_url}
            autoPlay
            muted
            loop
            playsInline
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
        ) : (
          <Image 
            src={ad.image_url} 
            alt={ad.title} 
            fill 
            className="object-cover transition-transform duration-700 group-hover:scale-105"
            unoptimized 
          />
        )}
      </div>
      
      <div className="p-4">
        <p className="text-[14px] text-zinc-600 dark:text-zinc-400 line-clamp-2 leading-snug">
          {ad.description}
        </p>
        <div className="mt-3 flex items-center justify-between">
          <span className="text-[11px] text-zinc-400 font-medium truncate max-w-[200px]">
            {new URL(ad.target_url).hostname}
          </span>
          <button className="px-4 py-1.5 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-black text-xs font-bold rounded-full">
            Learn More
          </button>
        </div>
      </div>
    </div>
  )
}
