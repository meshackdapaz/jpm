'use client'

import React from 'react'
import { AppLayout } from '@/components/AppLayout'
import { CreatorEarnings } from '@/components/CreatorEarnings'
import { useAuth } from '@/components/AuthProvider'
import { SparklesIcon, InformationCircleIcon } from '@heroicons/react/24/solid'
import { WalletIcon, ChartBarSquareIcon, MegaphoneIcon } from '@heroicons/react/24/outline'

export default function MonetizationPage() {
  const { user, loading } = useAuth()

  if (loading) return <AppLayout><div className="p-8 text-center animate-pulse text-zinc-400 font-bold">Loading dashboard...</div></AppLayout>
  if (!user) return <AppLayout><div className="p-8 text-center text-zinc-500 font-bold">Please login to access monetization.</div></AppLayout>

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto px-4 pt-8 pb-32">
        {/* Hero Section */}
        <div className="bg-gradient-to-br from-violet-600 to-indigo-700 rounded-[40px] p-8 text-white mb-8 relative overflow-hidden shadow-2xl shadow-indigo-500/20">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-32 -mt-32" />
          <div className="relative z-10 flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-white/20 rounded-xl backdrop-blur-md">
                <SparklesIcon className="w-6 h-6" />
              </div>
              <span className="text-sm font-black uppercase tracking-[0.2em] opacity-80">Creator Program</span>
            </div>
            <h1 className="text-4xl font-black tracking-tight leading-none">Turn your memes <br/> into money.</h1>
            <p className="text-indigo-100 text-sm font-medium max-w-[280px] leading-relaxed opacity-90">
              Earn from every unique view on your posts through our direct ad revenue sharing.
            </p>
          </div>
        </div>

        {/* Features Row */}
        <div className="flex gap-4 mb-8 overflow-x-auto hide-scrollbar pb-2">
          {[
            { icon: <WalletIcon className="w-5 h-5"/>, label: 'Fast Payouts' },
            { icon: <ChartBarSquareIcon className="w-5 h-5"/>, label: 'Analytics' },
            { icon: <MegaphoneIcon className="w-5 h-5"/>, label: 'Ad Revenue' },
          ].map((item, i) => (
            <div key={i} className="flex-none flex items-center gap-2.5 px-5 py-3.5 bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-2xl shadow-sm">
              <div className="text-violet-500">{item.icon}</div>
              <span className="text-[13px] font-bold text-zinc-700 dark:text-zinc-300 whitespace-nowrap">{item.label}</span>
            </div>
          ))}
        </div>

        {/* Stats Component */}
        <CreatorEarnings userId={user.id} />

        {/* Info Section */}
        <div className="mt-10 p-6 bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800/30 rounded-3xl flex gap-4">
          <InformationCircleIcon className="w-6 h-6 text-blue-500 flex-none" />
          <div className="space-y-1.5">
            <p className="text-[14px] font-bold text-blue-900 dark:text-blue-300">How it works</p>
            <p className="text-[13px] text-blue-600 dark:text-blue-400/80 leading-relaxed font-medium">
              We share 30% of all ad revenue generated from views on your posts. Earnings are calculated automatically and updated daily. 
              Minimum withdrawal is $10.00.
            </p>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
