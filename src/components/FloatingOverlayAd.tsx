'use client'

import React, { useState } from 'react'
import { XMarkIcon, EllipsisHorizontalIcon } from '@heroicons/react/24/solid'
import { InArticleAd } from './InArticleAd'

export function FloatingOverlayAd() {
  const [isVisible, setIsVisible] = useState(true)

  if (!isVisible) return null

  return (
    <div className="fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom)+10px)] left-4 right-4 z-40 sm:bottom-6 sm:left-auto sm:right-6 sm:w-[340px] pointer-events-auto">
      <div className="relative overflow-hidden rounded-2xl bg-black/60 backdrop-blur-xl border border-white/10 shadow-2xl p-3 flex flex-col gap-2">
        {/* Ad Header/Controls */}
        <div className="absolute top-2 right-2 flex items-center gap-1 z-10">
          <button className="p-1.5 rounded-full bg-black/40 hover:bg-black/60 text-white/70 hover:text-white transition-colors">
            <EllipsisHorizontalIcon className="w-5 h-5" />
          </button>
          <button 
            onClick={() => setIsVisible(false)}
            className="p-1.5 rounded-full bg-black/40 hover:bg-black/60 text-white/70 hover:text-white transition-colors"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Ad Content Container */}
        <div className="w-full flex items-center">
           {/* 
             Here we inject the Google Ad. 
             We restrict its height so it stays looking like a sleek overlay. 
           */}
           <div className="w-full min-h-[50px] max-h-[120px] overflow-hidden rounded-xl bg-white/5 flex items-center justify-center">
             <InArticleAd />
           </div>
        </div>

        {/* Footer / Indicator */}
        <div className="flex items-center justify-between px-1">
          <span className="text-[11px] font-bold text-white/50 uppercase tracking-wider">Sponsored</span>
          <div className="flex items-center gap-1">
            <div className="w-1.5 h-1.5 rounded-full bg-white"></div>
            <div className="w-1.5 h-1.5 rounded-full bg-white/30"></div>
          </div>
        </div>
      </div>
    </div>
  )
}
