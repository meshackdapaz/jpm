'use client'

import React, { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { 
  BanknotesIcon, 
  EyeIcon, 
  ArrowTrendingUpIcon,
  CurrencyDollarIcon
} from '@heroicons/react/24/outline'

export function CreatorEarnings({ userId }: { userId: string }) {
  const [stats, setStats] = useState({
    totalViews: 0,
    totalEarnings: 0,
    currentBalance: 0,
    pendingBalance: 0
  })
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    fetchStats()
  }, [userId])

  async function fetchStats() {
    setLoading(true)
    
    // Fetch unique views from user's posts
    const { data: uniqueViews, error: viewsErr } = await supabase.rpc('get_creator_unique_views', { 
      creator_uuid: userId,
      days_interval: 3650 // Get all time for total earnings
    })
    
    if (viewsErr) console.error('Error fetching unique views for earnings:', viewsErr)
    const views = Number(uniqueViews) || 0
    
    // Fetch profile for balance (stored in settings or a dedicated column)
    const { data: profile } = await supabase
      .from('profiles')
      .select('settings')
      .eq('id', userId)
      .single()
    
    const balance = profile?.settings?.balance || 0
    const platformRevenuePer1k = 1.00 // Assuming $1.00 per 1000 views total revenue
    const creatorShare = 0.30 // 30% for the creator
    const effectiveRPM = platformRevenuePer1k * creatorShare
    const earnings = (views / 1000) * effectiveRPM

    setStats({
      totalViews: views,
      totalEarnings: earnings,
      currentBalance: balance,
      pendingBalance: Math.max(0, earnings - balance)
    })
    
    setLoading(false)
  }

  if (loading) return <div className="h-40 bg-zinc-100 dark:bg-zinc-900 animate-pulse rounded-3xl" />

  return (
    <div className="flex flex-col gap-6 w-full animate-in fade-in duration-300">
      {/* Header Cards */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white dark:bg-black p-5 rounded-3xl border border-zinc-100 dark:border-zinc-800 shadow-sm overflow-hidden relative">
          <div className="absolute -right-4 -top-4 w-20 h-20 bg-blue-500/5 rounded-full blur-2xl" />
            <div className="flex items-center gap-2 mb-1">
              <span className="text-zinc-500 text-xs font-bold uppercase tracking-wider">Total Unique Views</span>
              <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            </div>
            <div className="text-3xl font-black">{stats.totalViews.toLocaleString()}</div>
            <div className="mt-2 text-[11px] text-zinc-400 font-medium">
              10M Unique Views milestone tracking
            </div>
          <div className="mt-2 flex items-center gap-1 text-[11px] text-green-500 font-bold">
            <ArrowTrendingUpIcon className="w-3 h-3" />
            +12.5% this month
          </div>
        </div>

        <div className="bg-white dark:bg-black p-5 rounded-3xl border border-zinc-100 dark:border-zinc-800 shadow-sm overflow-hidden relative">
          <div className="absolute -right-4 -top-4 w-20 h-20 bg-amber-500/5 rounded-full blur-2xl" />
          <div className="flex items-center gap-2 mb-3">
            <div className="p-2 bg-amber-50 dark:bg-amber-900/20 rounded-xl">
              <CurrencyDollarIcon className="w-5 h-5 text-amber-500" />
            </div>
            <span className="text-[13px] font-bold text-zinc-500">Total Earnings</span>
          </div>
          <p className="text-2xl font-black text-zinc-900 dark:text-white">
            ${stats.totalEarnings.toFixed(2)}
          </p>
          <p className="mt-2 text-[11px] text-zinc-400 font-medium">
            Based on $0.30 RPM (30% share)
          </p>
        </div>
      </div>

      {/* Wallet Section */}
      <div className="bg-zinc-900 dark:bg-white text-white dark:text-black p-6 rounded-[32px] shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-48 h-48 bg-violet-600/20 rounded-full blur-3xl -mr-20 -mt-20" />
        <div className="relative z-10 flex flex-col gap-6">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-zinc-400 dark:text-zinc-500 text-xs font-bold uppercase tracking-widest mb-1">Available Balance</p>
              <p className="text-4xl font-black">${stats.currentBalance.toFixed(2)}</p>
            </div>
            <div className="p-3 bg-white/10 dark:bg-black/5 rounded-2xl backdrop-blur-md border border-white/10">
              <BanknotesIcon className="w-6 h-6" />
            </div>
          </div>
          
          <div className="flex gap-3">
            <button className="flex-grow py-4 bg-white dark:bg-black text-black dark:text-white rounded-2xl font-black text-[15px] hover:opacity-90 active:scale-95 transition-all shadow-xl shadow-white/5">
              Withdraw Funds
            </button>
            <button className="flex-none aspect-square p-4 bg-zinc-800 dark:bg-zinc-100 rounded-2xl flex items-center justify-center hover:bg-zinc-700 dark:hover:bg-zinc-200 transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Transaction History (Mockup) */}
      <div className="flex flex-col gap-3">
        <h3 className="px-1 text-xs font-black text-zinc-400 uppercase tracking-wider">Recent Activity</h3>
        <div className="bg-white dark:bg-black rounded-3xl border border-zinc-100 dark:border-zinc-800 overflow-hidden">
          {[
            { id: 1, type: 'Ad Share', date: 'Today', amount: '+ $2.44', status: 'Pending' },
            { id: 2, type: 'Ad Share', date: 'Yesterday', amount: '+ $5.12', status: 'Cleared' },
          ].map((item, idx) => (
            <div key={item.id} className={`p-4 flex items-center justify-between ${idx !== 0 ? 'border-t border-zinc-50 dark:border-zinc-900' : ''}`}>
              <div className="flex flex-col">
                <span className="font-bold text-[15px]">{item.type}</span>
                <span className="text-[11px] text-zinc-400">{item.date}</span>
              </div>
              <div className="flex flex-col items-end">
                <span className="font-black text-green-500 text-[15px]">{item.amount}</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-bold ${item.status === 'Pending' ? 'bg-zinc-100 dark:bg-zinc-900 text-zinc-500' : 'bg-green-50 dark:bg-green-900/20 text-green-600'}`}>
                  {item.status}
                </span>
              </div>
            </div>
          ))}
          <button className="w-full py-4 text-[13px] font-bold text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors">
            View full history
          </button>
        </div>
      </div>
    </div>
  )
}
