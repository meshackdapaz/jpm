'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronRightIcon, ChevronLeftIcon, InformationCircleIcon } from '@heroicons/react/24/outline'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/components/AuthProvider'
import { Post } from '@/components/Post'

const TIME_RANGES = [
  { label: '7 days', value: 7 },
  { label: '30 days', value: 30 },
  { label: '90 days', value: 90 },
]

export default function InsightsPage() {
  const router = useRouter()
  const { user } = useAuth()
  const supabase = createClient()

  const [days, setDays] = useState(30)
  const [showRangeMenu, setShowRangeMenu] = useState(false)
  
  const [views, setViews] = useState(0)
  const [interactions, setInteractions] = useState(0)
  const [followers, setFollowers] = useState(0)
  const [loading, setLoading] = useState(true)
  const [topPosts, setTopPosts] = useState<any[]>([])

  const fetchData = useCallback(async () => {
    if (!user) return
    setLoading(true)
    
    // Calculate start date
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()

    // 1. Fetch Views (Sum of view_count on posts created within date range)
    const { data: viewsData } = await supabase
      .from('posts')
      .select('*, profiles:creator_id(id, full_name, username, avatar_url, is_verified, last_seen, settings), likes(count), comments(count), reposts(count)')
      .eq('creator_id', user.id)
      .gte('created_at', startDate)
      .order('view_count', { ascending: false })
    
    const posts = viewsData?.map((p: any) => ({
      ...p,
      is_repost: false,
      likes_count: p.likes?.[0]?.count || 0,
      comments_count: p.comments?.[0]?.count || 0,
      reposts_count: p.reposts?.[0]?.count || 0
    })) || []
    
    const totalViews = posts.reduce((acc: number, post: any) => acc + (post.view_count || 0), 0) || 0
    setViews(totalViews)
    setTopPosts(posts.slice(0, 5))

    // 2. Fetch Interactions (Likes + Comments + Reposts on user's posts within date range)
    // First get user's post IDs (even those created before, because interactions might happen now)
    // But usually "Insights for 30 days" means interactions THAT OCCURRED in the last 30 days.
    
    const { data: userPosts } = await supabase.from('posts').select('id').eq('creator_id', user.id)
    const postIds = userPosts?.map((p: { id: string }) => p.id) || []

    if (postIds.length > 0) {
      const [likes, comments, reposts] = await Promise.all([
        supabase.from('likes')
          .select('id', { count: 'exact', head: true })
          .gte('created_at', startDate)
          .in('post_id', postIds),
        supabase.from('comments')
          .select('id', { count: 'exact', head: true })
          .gte('created_at', startDate)
          .in('post_id', postIds),
        supabase.from('reposts')
          .select('id', { count: 'exact', head: true })
          .gte('created_at', startDate)
          .in('post_id', postIds)
      ])
      
      setInteractions((likes.count || 0) + (comments.count || 0) + (reposts.count || 0))
    } else {
      setInteractions(0)
    }

    // 3. Fetch Followers gained in this period
    const { count: followerCount } = await supabase
      .from('follows')
      .select('*', { count: 'exact', head: true })
      .eq('following_id', user.id)
      .gte('created_at', startDate)
    
    setFollowers(followerCount || 0)
    setLoading(false)
  }, [user, supabase, days])

  useEffect(() => {
    fetchData()

    if (!user) return

    // Real-time subscriptions (refresh on any change for now, simpler)
    const channel = supabase.channel('insights-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'posts', filter: `creator_id=eq.${user.id}` }, fetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'likes' }, fetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'comments' }, fetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reposts' }, fetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'follows', filter: `following_id=eq.${user.id}` }, fetchData)
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user, supabase, fetchData])

  return (
    <div className="min-h-screen bg-[#f3f5f7] dark:bg-black text-black dark:text-white font-sans">
      {/* ── Top Bar ── */}
      <header className="sticky top-0 z-50 bg-white dark:bg-zinc-950 px-4 pt-[env(safe-area-inset-top)] h-[calc(3.5rem+env(safe-area-inset-top))] flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800">
        <button 
          onClick={() => router.back()} 
          className="flex items-center gap-1 text-[17px] font-medium text-zinc-900 dark:text-zinc-100"
        >
          <ChevronLeftIcon className="w-5 h-5 stroke-[2.5]" />
          Back
        </button>
        <h1 className="text-[17px] font-bold">Insights</h1>
        <button 
          onClick={() => router.back()} 
          className="text-[17px] font-bold text-zinc-900 dark:text-zinc-100"
        >
          Done
        </button>
      </header>

      <main className="px-4 py-6 space-y-6">
        {/* ── Summary Header ── */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <h2 className="text-[22px] font-black">Summary</h2>
            <InformationCircleIcon className="w-5 h-5 text-zinc-400" />
          </div>
          <div className="relative">
            <button 
              onClick={() => setShowRangeMenu(!showRangeMenu)}
              className="bg-white dark:bg-zinc-900 px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 flex items-center gap-2 text-[14px] font-bold shadow-sm"
            >
              {TIME_RANGES.find(r => r.value === days)?.label}
              <ChevronRightIcon className={`w-4 h-4 transition-transform ${showRangeMenu ? '-rotate-90' : 'rotate-90'} text-zinc-400`} />
            </button>
            
            {showRangeMenu && (
              <div className="absolute right-0 mt-2 w-32 bg-white dark:bg-zinc-900 rounded-2xl shadow-xl border border-zinc-100 dark:border-zinc-800 z-50 overflow-hidden py-1 animate-in fade-in zoom-in-95 duration-100">
                {TIME_RANGES.map((range) => (
                  <button
                    key={range.value}
                    onClick={() => {
                      setDays(range.value)
                      setShowRangeMenu(false)
                    }}
                    className={`w-full text-left px-4 py-2.5 text-sm font-bold hover:bg-zinc-50 dark:hover:bg-zinc-800/50 ${
                      days === range.value ? 'text-black dark:text-white' : 'text-zinc-400'
                    }`}
                  >
                    {range.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Views Card ── */}
        <div className={`bg-white dark:bg-zinc-900 rounded-3xl p-5 border border-zinc-100 dark:border-zinc-800 shadow-sm relative overflow-hidden group transition-opacity ${loading ? 'opacity-60' : 'opacity-100'}`}>
          <div className="flex justify-between items-start mb-2">
            <div>
              <p className="text-[14px] font-bold text-zinc-900 dark:text-zinc-100">Views</p>
              <h3 className="text-4xl font-black mt-2">{views}</h3>
            </div>
            <ChevronRightIcon className="w-5 h-5 text-zinc-300 group-hover:text-zinc-500 transition-colors" />
          </div>

          <div className="mt-8 h-48 flex items-end justify-center relative border-b border-zinc-100 dark:border-zinc-800">
             {/* Grid Lines */}
             <div className="absolute inset-0 flex flex-col justify-between py-2 pointer-events-none opacity-20">
               {[2, 1.5, 1, 0.5, 0].map(val => (
                 <div key={val} className="flex items-center gap-2">
                   <span className="text-[11px] text-zinc-400 w-4 text-right">{val}</span>
                   <div className="flex-1 border-t border-dashed border-zinc-300 dark:border-zinc-600" />
                 </div>
               ))}
             </div>

             <div className="flex gap-16 items-end pb-8">
               <div className="flex flex-col items-center">
                 <div className="w-24 h-0 bg-transparent rounded-t-2xl" />
                 <span className="text-[11px] text-zinc-400 mt-2 uppercase tracking-wide">Previous</span>
               </div>
               <div className="flex flex-col items-center">
                 <div 
                   className="w-24 bg-black dark:bg-white rounded-t-2xl animate-in fade-in slide-in-from-bottom-5 duration-700 transition-all" 
                   style={{ height: `${Math.min(views * 20, 160)}px` }} 
                 />
                 <span className="text-[11px] text-zinc-400 mt-2 uppercase tracking-wide font-bold">Latest {days}d</span>
               </div>
             </div>
          </div>
        </div>

        {/* ── Small Stats Grid ── */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white dark:bg-zinc-900 rounded-3xl p-5 border border-zinc-100 dark:border-zinc-800 shadow-sm group">
            <div className="flex justify-between items-start">
               <p className="text-[14px] font-bold text-zinc-900 dark:text-zinc-100">Interactions</p>
               <ChevronRightIcon className="w-4 h-4 text-zinc-300 group-hover:text-zinc-500" />
            </div>
            <h3 className="text-3xl font-black mt-2">{interactions}</h3>
          </div>
          <div className="bg-white dark:bg-zinc-900 rounded-3xl p-5 border border-zinc-100 dark:border-zinc-800 shadow-sm group">
            <div className="flex justify-between items-start">
               <p className="text-[14px] font-bold text-zinc-900 dark:text-zinc-100">Followers</p>
               <ChevronRightIcon className="w-4 h-4 text-zinc-300 group-hover:text-zinc-500" />
            </div>
            <h3 className="text-3xl font-black mt-2">{followers}</h3>
          </div>
        </div>

        {/* ── Top Content ── */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-[20px] font-black">Top content</h2>
            <ChevronRightIcon className="w-5 h-5 text-zinc-400" />
          </div>
          
          <div className="divide-y divide-zinc-200 dark:divide-zinc-800 border-t border-zinc-200 dark:border-zinc-800">
            {topPosts.length === 0 ? (
              <div className="bg-white dark:bg-zinc-900/50 rounded-2xl py-6 px-4 text-center border border-zinc-200/50 dark:border-zinc-800/50 mt-4">
                <p className="text-zinc-400 text-sm font-medium">No posts in this period</p>
              </div>
            ) : (
              topPosts.map(post => <Post key={`insight-${post.id}`} post={post} />)
            )}
          </div>
        </div>
      </main>

      <div className="h-24" />
    </div>
  )
}
