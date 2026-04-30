'use client'

import React from 'react'
import { AppLayout } from '@/components/AppLayout'
import { CreatorEarnings } from '@/components/CreatorEarnings'
import { useAuth } from '@/components/AuthProvider'
import { SparklesIcon, InformationCircleIcon } from '@heroicons/react/24/solid'
import { WalletIcon, ChartBarSquareIcon, MegaphoneIcon } from '@heroicons/react/24/outline'

export default function MonetizationPage() {
  const { user, loading } = useAuth()

  if (loading) return (
    <AppLayout>
      <div className="p-8 text-center animate-pulse text-zinc-400 font-bold">Loading dashboard...</div>
    </AppLayout>
  )
  if (!user) return (
    <AppLayout>
      <div className="p-8 text-center text-zinc-500 font-bold">Please login to access monetization.</div>
    </AppLayout>
  )

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto px-4 pt-8 pb-32">

        {/* Hero — black card */}
        <div className="bg-black text-white rounded-[32px] p-8 mb-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none" />
          <div className="relative z-10 flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-white/10 rounded-xl">
                <SparklesIcon className="w-5 h-5 text-white" />
              </div>
              <span className="text-xs font-black uppercase tracking-[0.2em] text-white/60">Creator Program</span>
            </div>
            <h1 className="text-4xl font-black tracking-tight leading-none">
              Turn your memes<br />into money.
            </h1>
            <p className="text-white/60 text-sm font-medium max-w-[280px] leading-relaxed">
              Earn from every unique view on your posts through direct ad revenue sharing.
            </p>
          </div>
        </div>

        {/* Feature pills — zinc */}
        <div className="flex gap-3 mb-8 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
          {[
            { icon: <WalletIcon className="w-4 h-4" />, label: 'Fast Payouts' },
            { icon: <ChartBarSquareIcon className="w-4 h-4" />, label: 'Analytics' },
            { icon: <MegaphoneIcon className="w-4 h-4" />, label: 'Ad Revenue' },
          ].map((item, i) => (
            <div key={i} className="flex-none flex items-center gap-2 px-4 py-2.5 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl">
              <div className="text-zinc-600 dark:text-zinc-400">{item.icon}</div>
              <span className="text-[13px] font-bold text-zinc-700 dark:text-zinc-300 whitespace-nowrap">{item.label}</span>
            </div>
          ))}
        </div>

        {/* Stats / dashboard */}
        <CreatorEarnings userId={user.id} />


      </div>
    </AppLayout>
  )
}
