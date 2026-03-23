'use client'

import React, { useEffect } from 'react'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'

interface DirectAd {
  id: string
  title: string
  description: string
  image_url: string
  target_url: string
}

export function DirectAdCard({ ad }: { ad: DirectAd }) {
  const supabase = createClient()

  const adRef = React.useRef<HTMLDivElement>(null)
  const tracked = React.useRef(false)

  useEffect(() => {
    if (!adRef.current || tracked.current) return

    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && !tracked.current) {
        tracked.current = true
        supabase.rpc('increment_ad_impressions', { ad_id: ad.id })
        observer.disconnect()
      }
    }, { threshold: 0.5 })

    observer.observe(adRef.current)
    return () => observer.disconnect()
  }, [ad.id, supabase])

  const handleClick = async () => {
    await supabase.rpc('increment_ad_clicks', { ad_id: ad.id })
    window.open(ad.target_url, '_blank')
  }

  return (
    <div 
      ref={adRef}
      onClick={handleClick}
      className="px-4 py-4 border-b border-zinc-100 dark:border-zinc-900 cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors"
    >
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-[10px] font-bold text-zinc-400">
            AD
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100">{ad.title}</span>
            <span className="text-[10px] uppercase tracking-wider font-bold text-violet-500">Sponsored</span>
          </div>
        </div>
        
        {ad.description && (
          <p className="text-[14px] text-zinc-600 dark:text-zinc-400 leading-normal">
            {ad.description}
          </p>
        )}

        <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-zinc-100 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-800">
          <Image 
            src={ad.image_url} 
            alt={ad.title} 
            fill 
            className="object-cover"
            unoptimized
          />
        </div>

        <div className="flex items-center justify-between">
          <span className="text-xs text-zinc-400 truncate max-w-[200px]">{new URL(ad.target_url).hostname}</span>
          <button className="px-4 py-1.5 bg-zinc-900 dark:bg-white text-white dark:text-black text-xs font-bold rounded-full">
            Learn More
          </button>
        </div>
      </div>
    </div>
  )
}
