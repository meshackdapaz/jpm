'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { BanknotesIcon, ArrowTrendingUpIcon, EyeIcon, ClockIcon, CheckBadgeIcon } from '@heroicons/react/24/outline'
import { motion, AnimatePresence } from 'framer-motion'

const RPM = 0.30 // $0.30 per 1K views (30% creator share)
const MIN_WITHDRAW = 10

function getTier(views: number) {
  if (views >= 1_000_000) return { name: 'Diamond', label: 'DIAMOND', next: 10_000_000, nextName: 'Legend' }
  if (views >= 100_000)   return { name: 'Gold',    label: 'GOLD',    next: 1_000_000,  nextName: 'Diamond' }
  if (views >= 10_000)    return { name: 'Silver',  label: 'SILVER',  next: 100_000,    nextName: 'Gold' }
  if (views >= 1_000)     return { name: 'Bronze',  label: 'BRONZE',  next: 10_000,     nextName: 'Silver' }
  return                         { name: 'Starter', label: 'STARTER', next: 1_000,      nextName: 'Bronze' }
}

function fmtViews(v: number) {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(2)}M`
  if (v >= 1_000)     return `${(v / 1_000).toFixed(1)}K`
  return String(v)
}

function StatCard({ label, value, sub, mono = false }: { label: string; value: string; sub?: string; mono?: boolean }) {
  return (
    <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-zinc-100 dark:border-zinc-800">
      <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2">{label}</p>
      <p className={`font-black ${mono ? 'font-mono' : ''} text-2xl leading-none`}>{value}</p>
      {sub && <p className="text-[11px] text-zinc-400 mt-2 font-medium">{sub}</p>}
    </div>
  )
}

export function CreatorEarnings({ userId }: { userId: string }) {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({ totalViews: 0, totalEarnings: 0, balance: 0, pendingEarnings: 0 })
  const [topPosts, setTopPosts] = useState<any[]>([])
  const [weeklyData, setWeeklyData] = useState<{ day: string; views: number }[]>([])
  const [withdrawals, setWithdrawals] = useState<any[]>([])
  const [withdrawOpen, setWithdrawOpen] = useState(false)
  const [wAmount, setWAmount] = useState('')
  const [wPhone, setWPhone] = useState('')
  const [wSubmitting, setWSubmitting] = useState(false)
  const [wSuccess, setWSuccess] = useState(false)
  const [isMonetized, setIsMonetized] = useState<boolean | null>(null)

  const fetchAll = useCallback(async () => {
    setLoading(true)

    // Profile balance and monetization check
    const { data: profile } = await supabase.from('profiles').select('settings, monetization_enabled').eq('id', userId).single()
    const isUserMonetized = !!profile?.monetization_enabled
    setIsMonetized(isUserMonetized)

    if (!isUserMonetized) {
      setLoading(false)
      return
    }

    const balance = profile?.settings?.balance || 0

    // Total views
    const { data: viewsData } = await supabase.rpc('get_creator_unique_views', {
      creator_uuid: userId,
      days_interval: 3650,
    })
    const totalViews = Number(viewsData) || 0
    const totalEarnings = (totalViews / 1000) * RPM

    // Top posts
    const { data: posts } = await supabase
      .from('posts')
      .select('id, content, view_count, image_url, created_at')
      .eq('creator_id', userId)
      .order('view_count', { ascending: false })
      .limit(5)
    setTopPosts(posts || [])

    // Last 7 days
    const days: { day: string; views: number }[] = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      days.push({ day: d.toLocaleDateString('en', { weekday: 'short' }), views: 0 })
    }
    const { data: recentPosts } = await supabase
      .from('posts')
      .select('view_count, created_at')
      .eq('creator_id', userId)
      .gte('created_at', new Date(Date.now() - 7 * 86400000).toISOString())
    recentPosts?.forEach((p: any) => {
      const label = new Date(p.created_at).toLocaleDateString('en', { weekday: 'short' })
      const idx = days.findIndex(d => d.day === label)
      if (idx >= 0) days[idx].views += p.view_count || 0
    })
    setWeeklyData(days)

    // Withdrawal history
    const { data: wds } = await supabase
      .from('withdrawal_requests')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(5)
    setWithdrawals(wds || [])

    setStats({ totalViews, totalEarnings, balance, pendingEarnings: Math.max(0, totalEarnings - balance) })
    setLoading(false)
  }, [userId])

  useEffect(() => { fetchAll() }, [fetchAll])

  const handleWithdraw = async () => {
    const amount = parseFloat(wAmount)
    if (!amount || amount < MIN_WITHDRAW) return alert(`Minimum withdrawal is $${MIN_WITHDRAW}.00`)
    if (!wPhone.trim()) return alert('Please enter your M-Pesa phone number')
    setWSubmitting(true)
    await supabase.from('withdrawal_requests').insert({
      user_id: userId, amount, payment_method: 'mpesa', phone_number: wPhone.trim(), status: 'pending',
    })
    setWSubmitting(false)
    setWithdrawOpen(false)
    setWAmount('')
    setWPhone('')
    setWSuccess(true)
    setTimeout(() => setWSuccess(false), 5000)
    fetchAll()
  }

  if (loading) return (
    <div className="flex flex-col gap-4">
      {[1,2,3,4].map(i => <div key={i} className="h-24 bg-zinc-100 dark:bg-zinc-900 animate-pulse rounded-2xl" />)}
    </div>
  )

  if (isMonetized === false) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-zinc-50 dark:bg-zinc-900/50 rounded-[32px] border border-zinc-100 dark:border-zinc-800 text-center">
        <div className="w-16 h-16 bg-white dark:bg-black rounded-full flex items-center justify-center mb-5 shadow-sm">
          <BanknotesIcon className="w-8 h-8 text-zinc-400" />
        </div>
        <h3 className="text-2xl font-black text-zinc-900 dark:text-white mb-2">Not Monetized Yet</h3>
        <p className="text-zinc-500 text-[15px] max-w-sm leading-relaxed mb-8">
          You need to be a part of the Creator Program to start earning from your memes. Keep posting high-quality content to reach the requirements.
        </p>
        <a href="/settings" className="px-8 py-4 bg-black dark:bg-white text-white dark:text-black font-black rounded-2xl text-sm hover:opacity-90 active:scale-95 transition-all">
          Check Eligibility in Settings
        </a>
      </div>
    )
  }

  const tier = getTier(stats.totalViews)
  const tierPct = Math.min(100, (stats.totalViews / tier.next) * 100)
  const maxViews = Math.max(...weeklyData.map(d => d.views), 1)
  const weekTotal = weeklyData.reduce((s, d) => s + d.views, 0)

  return (
    <div className="flex flex-col gap-5">

      {/* Success toast */}
      <AnimatePresence>
        {wSuccess && (
          <motion.div
            key="toast"
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="flex items-center gap-3 px-4 py-3 bg-black dark:bg-white text-white dark:text-black rounded-2xl text-sm font-bold"
          >
            <CheckBadgeIcon className="w-5 h-5 flex-none" />
            Withdrawal request submitted! We'll process it within 24h.
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Balance card (prominent) ── */}
      <div className="bg-black dark:bg-zinc-950 text-white rounded-2xl p-6 relative overflow-hidden border border-zinc-800">
        <div className="absolute inset-0 opacity-[0.03]"
          style={{ backgroundImage: 'repeating-linear-gradient(45deg,#fff 0,#fff 1px,transparent 0,transparent 50%)', backgroundSize: '8px 8px' }} />
        <div className="relative z-10">
          <p className="text-zinc-500 text-[10px] font-black uppercase tracking-[0.2em] mb-1">Available Balance</p>
          <p className="text-5xl font-black font-mono mb-5">${stats.balance.toFixed(2)}</p>

          {!withdrawOpen ? (
            <button
              onClick={() => setWithdrawOpen(true)}
              disabled={stats.balance < MIN_WITHDRAW}
              className="w-full py-3.5 bg-white text-black rounded-xl font-black text-sm disabled:opacity-30 hover:opacity-90 active:scale-[0.98] transition-all"
            >
              {stats.balance < MIN_WITHDRAW
                ? `Need $${(MIN_WITHDRAW - stats.balance).toFixed(2)} more to withdraw`
                : 'Withdraw via M-Pesa'}
            </button>
          ) : (
            <div className="flex flex-col gap-2.5">
              <input
                type="number"
                placeholder={`Amount (min $${MIN_WITHDRAW})`}
                value={wAmount}
                onChange={e => setWAmount(e.target.value)}
                className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/40 outline-none text-sm font-medium"
              />
              <input
                type="tel"
                placeholder="M-Pesa number e.g. 0712345678"
                value={wPhone}
                onChange={e => setWPhone(e.target.value)}
                className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/40 outline-none text-sm font-medium"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => setWithdrawOpen(false)}
                  className="flex-1 py-3 border border-white/20 rounded-xl font-bold text-sm text-white/50"
                >Cancel</button>
                <button
                  onClick={handleWithdraw}
                  disabled={wSubmitting}
                  className="flex-1 py-3 bg-white text-black rounded-xl font-black text-sm disabled:opacity-50"
                >{wSubmitting ? 'Submitting…' : 'Confirm'}</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── 4 mini stats ── */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard
          label="Total Views"
          value={fmtViews(stats.totalViews)}
          sub="Lifetime unique views"
        />
        <StatCard
          label="Total Earned"
          value={`$${stats.totalEarnings.toFixed(2)}`}
          sub="@ $0.30 per 1K views"
        />
        <StatCard
          label="This Week"
          value={fmtViews(weekTotal)}
          sub={`$${((weekTotal / 1000) * RPM).toFixed(4)} earned`}
        />
        <StatCard
          label="Pending"
          value={`$${stats.pendingEarnings.toFixed(2)}`}
          sub="Processing"
        />
      </div>

      {/* ── Creator tier ── */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-zinc-800 p-5">
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">Creator Tier</p>
            <p className="text-xl font-black">{tier.name}</p>
            <p className="text-xs text-zinc-400 mt-0.5">
              {fmtViews(stats.totalViews)} / {fmtViews(tier.next)} views → {tier.nextName}
            </p>
          </div>
          <div className="px-3 py-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-lg">
            <span className="text-[10px] font-black text-zinc-500 dark:text-zinc-400 tracking-widest">{tier.label}</span>
          </div>
        </div>
        {/* Progress bar */}
        <div className="w-full bg-zinc-100 dark:bg-zinc-800 rounded-full h-1.5 overflow-hidden">
          <motion.div
            className="h-full bg-black dark:bg-white rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${tierPct}%` }}
            transition={{ duration: 1.2, ease: 'easeOut' }}
          />
        </div>
        <div className="flex justify-between mt-1.5 text-[10px] text-zinc-400 font-semibold">
          <span>{tierPct.toFixed(1)}% complete</span>
          <span>{fmtViews(tier.next - stats.totalViews)} views to go</span>
        </div>
      </div>

      {/* ── Weekly bar chart ── */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-zinc-800 p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-0.5">Views</p>
            <p className="font-black text-sm">Last 7 Days</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-zinc-400">Total</p>
            <p className="font-black text-sm">{fmtViews(weekTotal)}</p>
          </div>
        </div>

        <div className="flex items-end gap-2 h-[72px]">
          {weeklyData.map((d, i) => {
            const pct = maxViews > 0 ? (d.views / maxViews) * 100 : 0
            const isToday = i === weeklyData.length - 1
            return (
              <div key={d.day} className="flex flex-col items-center gap-1 flex-1 h-full">
                <div className="flex items-end flex-1 w-full">
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: `${Math.max(pct, 3)}%` }}
                    transition={{ duration: 0.7, delay: i * 0.05, ease: 'easeOut' }}
                    className={`w-full rounded-t-sm ${isToday ? 'bg-black dark:bg-white' : 'bg-zinc-200 dark:bg-zinc-700'}`}
                    style={{ minHeight: 3 }}
                  />
                </div>
                <span className={`text-[9px] font-black uppercase ${isToday ? 'text-black dark:text-white' : 'text-zinc-400'}`}>
                  {d.day}
                </span>
              </div>
            )
          })}
        </div>

        {/* Earnings row below chart */}
        <div className="mt-4 pt-4 border-t border-zinc-100 dark:border-zinc-800 flex justify-between text-xs">
          <span className="text-zinc-400">Est. earnings this week</span>
          <span className="font-black">${((weekTotal / 1000) * RPM).toFixed(4)}</span>
        </div>
      </div>

      {/* ── Top posts ── */}
      {topPosts.length > 0 && (
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-zinc-800 overflow-hidden">
          <div className="px-5 py-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
            <p className="font-black text-sm">Top Posts by Views</p>
            <EyeIcon className="w-4 h-4 text-zinc-400" />
          </div>
          {topPosts.map((p, i) => {
            const earned = ((p.view_count || 0) / 1000) * RPM
            return (
              <div
                key={p.id}
                className={`flex items-center gap-3 px-5 py-3.5 ${i > 0 ? 'border-t border-zinc-50 dark:border-zinc-800/60' : ''}`}
              >
                {/* Rank */}
                <span className="text-xs font-black text-zinc-300 dark:text-zinc-600 w-4 text-center flex-none">
                  {i + 1}
                </span>
                {/* Thumbnail */}
                {p.image_url ? (
                  <img src={p.image_url} alt="" className="w-10 h-10 rounded-lg object-cover flex-none" />
                ) : (
                  <div className="w-10 h-10 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center flex-none">
                    <span className="text-[10px] font-black text-zinc-400">TXT</span>
                  </div>
                )}
                {/* Info */}
                <div className="flex-grow min-w-0">
                  <p className="text-sm font-semibold truncate leading-tight">
                    {p.content?.slice(0, 42) || 'No caption'}
                  </p>
                  <p className="text-xs text-zinc-400 mt-0.5">{fmtViews(p.view_count || 0)} views</p>
                </div>
                {/* Earned */}
                <div className="text-right flex-none">
                  <p className="text-xs font-black">${earned.toFixed(4)}</p>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── RPM info ── */}
      <div className="rounded-2xl border border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 p-4 flex gap-3 text-[12px] text-zinc-500 dark:text-zinc-400 leading-relaxed">
        <ArrowTrendingUpIcon className="w-4 h-4 flex-none mt-0.5 text-zinc-400" />
        <p>
          <strong className="text-zinc-900 dark:text-white">How earnings work:</strong>{' '}
          You earn $0.30 per 1,000 unique views (30% of $1.00 RPM). Minimum withdrawal is ${MIN_WITHDRAW}. Payments processed within 24 hours via M-Pesa.
        </p>
      </div>

      {/* ── Withdrawal history ── */}
      {withdrawals.length > 0 && (
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-zinc-800 overflow-hidden">
          <div className="px-5 py-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center gap-2">
            <ClockIcon className="w-4 h-4 text-zinc-400" />
            <p className="font-black text-sm">Withdrawal History</p>
          </div>
          {withdrawals.map((w, i) => (
            <div
              key={w.id}
              className={`flex items-center justify-between px-5 py-4 ${i > 0 ? 'border-t border-zinc-50 dark:border-zinc-800/60' : ''}`}
            >
              <div>
                <p className="font-bold text-sm">M-Pesa · {w.phone_number}</p>
                <p className="text-xs text-zinc-400 mt-0.5">{new Date(w.created_at).toLocaleDateString('en', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
              </div>
              <div className="text-right">
                <p className="font-black text-sm">-${parseFloat(w.amount).toFixed(2)}</p>
                <span className={`inline-block mt-0.5 text-[10px] px-2 py-0.5 rounded-full font-black ${
                  w.status === 'paid'
                    ? 'bg-black dark:bg-white text-white dark:text-black'
                    : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400'
                }`}>
                  {w.status.toUpperCase()}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
