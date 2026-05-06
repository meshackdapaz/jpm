'use client'

import React, { useEffect } from 'react'
import { SidebarAd } from './SidebarAd'

export function LeftSidebarAd() {
  return (
    <aside className="hidden 2xl:flex flex-col gap-6 w-[300px] flex-none pt-6 sticky top-0 pb-6 pr-4 opacity-100 transition-opacity">
      <div style={{ minHeight: '300px' }} className="bg-white dark:bg-[#0a0a0a] rounded-[24px] border border-zinc-100 dark:border-zinc-800/80 overflow-hidden shadow-sm p-4 flex flex-col">
        <div className="flex items-center justify-between mb-3 px-1">
          <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Sponsored</span>
        </div>
        <div className="w-full flex-1 bg-zinc-50 dark:bg-zinc-900/50 rounded-xl overflow-hidden flex items-center justify-center">
          <SidebarAd />
        </div>
      </div>
      
      {/* Optional: Add a second ad or other content if the screen is very tall */}
      <div style={{ minHeight: '600px' }} className="bg-white dark:bg-[#0a0a0a] rounded-[24px] border border-zinc-100 dark:border-zinc-800/80 overflow-hidden shadow-sm p-4 mt-4 hidden 2xl:flex flex-col">
        <div className="flex items-center justify-between mb-3 px-1">
          <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Advertisement</span>
        </div>
        <div className="w-full flex-1 bg-zinc-50 dark:bg-zinc-900/50 rounded-xl overflow-hidden flex items-center justify-center">
           {/* Replace this with a skyscraper ad unit if you have one, or just standard in-article ad */}
          <SidebarAd />
        </div>
      </div>
    </aside>
  )
}
