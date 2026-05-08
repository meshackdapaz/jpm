'use client'

import React, { useEffect } from 'react'
import { SidebarAd } from './SidebarAd'
import { DirectAdCard } from './DirectAdCard'
import { createClient } from '@/lib/supabase/client'

export function LeftSidebarAd() {
  const [directAds, setDirectAds] = React.useState<any[]>([])
  const supabase = createClient()

  useEffect(() => {
    supabase.from('direct_ads')
      .select('*')
      .eq('is_active', true)
      .limit(2)
      .then(({ data, error }: { data: any, error: any }) => {
        if (data) setDirectAds(data)
      })
  }, [])

  if (directAds.length === 0) return null

  return (
    <aside className="hidden xl:flex flex-col gap-4 w-[260px] flex-none pt-6 sticky top-0 pb-6 pr-4 opacity-100 transition-opacity">
      {directAds.map((ad, i) => (
        <div key={ad.id} className="bg-white dark:bg-[#0a0a0a] rounded-[24px] border border-zinc-100 dark:border-zinc-800/80 overflow-hidden shadow-sm flex flex-col">
          <div className="flex items-center justify-between mt-3 px-4">
            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Sponsored</span>
          </div>
          <DirectAdCard ad={ad} />
        </div>
      ))}
      
      {/* Fallback box if only one ad exists */}
      {directAds.length === 1 && (
        <div className="bg-zinc-50 dark:bg-zinc-900/30 rounded-[24px] border border-dashed border-zinc-200 dark:border-zinc-800 p-8 flex flex-col items-center justify-center text-center">
          <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-tighter">Your Ad Here</p>
          <p className="text-[11px] text-zinc-500 mt-1">Advertise with us</p>
        </div>
      )}
    </aside>
  )
}
