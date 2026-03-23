'use client'

import React, { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Post } from '@/components/Post'
import { useAuth } from './AuthProvider'
import Link from 'next/link'
import { UserPlusIcon } from '@heroicons/react/24/outline'
import { SparklesIcon } from '@heroicons/react/24/solid'
import Image from 'next/image'
import { RightSidebar } from './RightSidebar'
import { InlineFeedAd } from './InlineFeedAd'
import { DirectAd } from './DirectAd'

// ── Skeleton ──────────────────────────────────────────────────────────────────

export function PostSkeleton() {
  return (
    <div className="px-4 py-4 border-b border-zinc-100 dark:border-zinc-900 animate-pulse">
      <div className="flex gap-3">
        <div className="w-10 h-10 rounded-full bg-zinc-200 dark:bg-zinc-800 flex-none" />
        <div className="flex-grow space-y-2.5">
          <div className="flex gap-2">
            <div className="h-3.5 bg-zinc-200 dark:bg-zinc-800 rounded-full w-24" />
            <div className="h-3 bg-zinc-200 dark:bg-zinc-800 rounded-full w-16" />
          </div>
          <div className="h-3.5 bg-zinc-200 dark:bg-zinc-800 rounded-full w-full" />
          <div className="h-40 bg-zinc-200 dark:bg-zinc-800 rounded-xl w-full" />
        </div>
      </div>
    </div>
  )
}

function EmptyForYou() {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-8 text-center gap-4">
      <div className="w-20 h-20 rounded-full bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center">
        <SparklesIcon className="w-9 h-9 text-zinc-300 dark:text-zinc-700" />
      </div>
      <p className="font-black text-lg text-zinc-700 dark:text-zinc-300">Nothing here yet</p>
      <p className="text-sm text-zinc-400">Be the first to share something!</p>
    </div>
  )
}

function EmptyFollowing() {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-8 text-center gap-5">
      <div className="w-20 h-20 rounded-full bg-violet-100 dark:bg-violet-950/40 flex items-center justify-center">
        <UserPlusIcon className="w-9 h-9 text-violet-500" />
      </div>
      <div>
        <p className="font-black text-lg text-zinc-700 dark:text-zinc-300">Follow people to see their posts</p>
        <p className="text-sm text-zinc-400 mt-1 max-w-xs">When you follow someone, their posts appear here.</p>
      </div>
      <Link href="/search" className="px-6 py-2.5 bg-black dark:bg-white text-white dark:text-black text-sm font-bold rounded-full hover:opacity-80 transition-all">
        Find people to follow
      </Link>
    </div>
  )
}

// ── Feed builder ──────────────────────────────────────────────────────────────

function buildFeed(postsData: any[] | null, repostsData: any[] | null, myReposts: string[], myLikes: { post_id: string, reaction_type: string }[]): any[] {
  let feed: any[] = []

  const likedPostIds = myLikes.map(l => l.post_id)
  const getReaction = (id: string) => myLikes.find(l => l.post_id === id)?.reaction_type || 'like'

  if (postsData) {
    feed = postsData.map((p: any) => ({
      ...p,
      is_repost: false,
      likes_count: p.likes?.[0]?.count || 0,
      comments_count: p.comments?.[0]?.count || 0,
      reposts_count: p.reposts?.[0]?.count || 0,
      is_reposted_by_me: myReposts.includes(p.id),
      is_liked_by_me: likedPostIds.includes(p.id),
      my_reaction: getReaction(p.id)
    }))
  }

  if (repostsData) {
    const formatted = repostsData
      .filter((r: any) => r.post)
      .map((r: any) => {
        const orig = Array.isArray(r.post) ? r.post[0] : r.post
        if (!orig) return null
        // profiles alias may come as array or single object
        const reposter = Array.isArray(r.profiles) ? r.profiles[0] : r.profiles
        return {
          ...orig,
          feed_created_at: r.created_at,
          is_repost: true,
          reposter_name: reposter?.full_name || 'Someone',
          reposter_id: r.user_id,
          likes_count: orig.likes?.[0]?.count || 0,
          comments_count: orig.comments?.[0]?.count || 0,
          reposts_count: orig.reposts?.[0]?.count || 0,
          is_reposted_by_me: myReposts.includes(orig.id),
          is_liked_by_me: likedPostIds.includes(orig.id),
          my_reaction: getReaction(orig.id)
        }
      })
      .filter(Boolean)
    feed = [...feed, ...formatted]
  }

  feed.sort((a, b) =>
    new Date(b.feed_created_at || b.created_at).getTime() -
    new Date(a.feed_created_at || a.created_at).getTime()
  )

  return feed.filter((v, i, a) =>
    a.findIndex(t => t.id === v.id && t.is_repost === v.is_repost) === i
  )
}

function buildRecommendedFeed(postsData: any[] | null, myReposts: string[], myLikes: { post_id: string, reaction_type: string }[]): any[] {
  if (!postsData) return []

  const likedPostIds = myLikes.map(l => l.post_id)
  const getReaction = (id: string) => myLikes.find(l => l.post_id === id)?.reaction_type || 'like'

  const now = new Date().getTime()

  const scoredFeed = postsData.map((p: any) => {
    const likes = p.likes?.[0]?.count || 0
    const comments = p.comments?.[0]?.count || 0
    const reposts = p.reposts?.[0]?.count || 0
    const isVerified = p.profiles?.is_verified || false
    const createdAt = new Date(p.created_at).getTime()
    const hoursOld = (now - createdAt) / (1000 * 60 * 60)

    // Scoring algorithm
    let score = (likes * 10) + (comments * 20) + (reposts * 30)
    if (isVerified) score += 50
    
    // Recency boost: newer posts get a boost that decays over time
    // Roughly +100 for brand new, decaying to 0 over 48 hours
    const recencyBoost = Math.max(0, 100 - (hoursOld * 2))
    score += recencyBoost

    // Add a bit of randomness so the feed isn't perfectly static
    score += Math.random() * 20

    return {
      ...p,
      is_repost: false,
      likes_count: likes,
      comments_count: comments,
      reposts_count: reposts,
      is_reposted_by_me: myReposts.includes(p.id),
      is_liked_by_me: likedPostIds.includes(p.id),
      my_reaction: getReaction(p.id),
      _score: score
    }
  })

  return scoredFeed.sort((a, b) => (b._score || 0) - (a._score || 0))
}

// ── Select strings — only existing columns ────────────────────────────────────

const POST_SEL = `id, content, image_url, image_urls, title, created_at, creator_id, view_count, hide_counts, is_archived, profiles:creator_id(id, full_name, username, avatar_url, is_verified, last_seen, settings), likes(count), comments(count), reposts(count)`

// Use simple join (no FK alias) to avoid PostgREST join resolution errors
const REPOST_SEL = `created_at, user_id, profiles:user_id(id, full_name, username, avatar_url, is_verified), post:posts(id, content, image_url, image_urls, title, created_at, creator_id, view_count, hide_counts, is_archived, profiles:creator_id(id, full_name, username, avatar_url, is_verified, last_seen, settings), likes(count), comments(count), reposts(count))`

// ── Main Feed ─────────────────────────────────────────────────────────────────

export function Feed() {
  const [posts, setPosts] = useState<any[]>([])
  const [initialLoad, setInitialLoad] = useState(true)
  const [refreshing, setRefreshing] = useState(false)   // PTR background refresh
  const [activeTab, setActiveTab] = useState<'for_you' | 'following'>('for_you')
  const [profileData, setProfileData] = useState<any>(null)
  const [directAds, setDirectAds] = useState<any[]>([])
  const { user, loading: authLoading } = useAuth()
  const supabase = createClient()
  const refreshKey = useRef(0)  // increment to trigger re-fetch

  useEffect(() => {
    if (user) {
      supabase.from('profiles').select('full_name, avatar_url, username').eq('id', user.id).single()
        .then(({ data }: { data: any }) => setProfileData(data))
    }
    
    // Fetch active Direct Ads
    supabase.from('direct_ads').select('*').eq('active', true).then(({ data }: { data: any }) => {
      if (data) setDirectAds(data)
    })
  }, [user])

  const userRef = useRef(user)
  useEffect(() => { userRef.current = user }, [user])

  // Cancellation ref
  const runRef = useRef(0)

  // ── Listen for pull-to-refresh event from AppLayout ──────────────────────
  const doRefresh = useRef<() => void>(() => {})
  useEffect(() => {
    const handler = async () => {
      setRefreshing(true)
      await doRefresh.current()
      setRefreshing(false)
    }
    window.addEventListener('ptr-refresh', handler)
    const feedHandler = (e: any) => {
      if (e.detail?.tab) switchTab(e.detail.tab)
    }
    window.addEventListener('feed-change', feedHandler)
    return () => {
      window.removeEventListener('ptr-refresh', handler)
      window.removeEventListener('feed-change', feedHandler)
    }
  }, [activeTab])

  useEffect(() => {
    // Wait for auth to resolve before doing anything — avoids double fetch
    if (authLoading) return

    const supabase = createClient()
    const runId = ++runRef.current
    const alive = () => runId === runRef.current

    async function fetchFeed() {
      const currentUser = userRef.current

      // ── FOLLOWING TAB ─────────────────────────────────────────────────
      if (activeTab === 'following') {
        if (!currentUser) {
          if (alive()) { setPosts([]); setInitialLoad(false) }
          return
        }

        const { data: followData } = await supabase
          .from('follows').select('following_id').eq('follower_id', currentUser.id)

        if (!alive()) return
        const ids = followData?.map((f: any) => f.following_id) || []

        if (ids.length === 0) {
          if (alive()) { setPosts([]); setInitialLoad(false) }
          return
        }

        const [{ data: pd }, { data: rd }, { data: md }, { data: ld }] = await Promise.all([
          supabase.from('posts').select(POST_SEL).in('creator_id', ids).order('created_at', { ascending: false }).limit(30),
          supabase.from('reposts').select(REPOST_SEL).in('user_id', ids).order('created_at', { ascending: false }).limit(30),
          supabase.from('reposts').select('post_id').eq('user_id', currentUser.id),
          supabase.from('likes').select('post_id, reaction_type').eq('user_id', currentUser.id),
        ])

        if (!alive()) return
        const myReposts = (md || []).map((r: any) => r.post_id)
        const myLikes = ld || []
        setPosts(buildFeed(pd, rd, myReposts, myLikes))
        setInitialLoad(false)
        return
      }

      // ── FOR YOU TAB ───────────────────────────────────────────────────
      const currentUserId = currentUser?.id
      const [{ data: pd }, { data: md }, { data: ld }] = await Promise.all([
        supabase.from('posts').select(POST_SEL).order('created_at', { ascending: false }).limit(60),
        currentUserId
          ? supabase.from('reposts').select('post_id').eq('user_id', currentUserId)
          : Promise.resolve({ data: [] }),
        currentUserId
          ? supabase.from('likes').select('post_id, reaction_type').eq('user_id', currentUserId)
          : Promise.resolve({ data: [] }),
      ])

      if (!alive()) return
      const myReposts = (md || []).map((r: any) => r.post_id)
      const myLikes = ld || []
      setPosts(buildRecommendedFeed(pd, myReposts, myLikes))
      setInitialLoad(false)
    }

    fetchFeed()
    // Expose fetchFeed so the PTR event can call it
    doRefresh.current = fetchFeed

    const ch1 = supabase.channel(`feed:p:${activeTab}:${Date.now()}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, () => { if (alive()) fetchFeed() })
      .subscribe()
    const ch2 = supabase.channel(`feed:r:${activeTab}:${Date.now()}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reposts' }, () => { if (alive()) fetchFeed() })
      .subscribe()

    return () => { supabase.removeChannel(ch1); supabase.removeChannel(ch2) }

  }, [activeTab, authLoading, user?.id])  // re-run fetch when user logs in/out

  // Switch tab helper: clear posts + reset loading only on tab switch
  function switchTab(tab: 'for_you' | 'following') {
    if (tab === activeTab) return
    setPosts([])
    setInitialLoad(true)
    setActiveTab(tab)
  }

  // ── Tab bar ───────────────────────────────────────────────────────────────

  function TabBar() {
    return (
      <div className="flex border-b border-zinc-100 dark:border-zinc-900">
        {(['for_you', 'following'] as const).map(tab => (
          <button key={tab} onClick={() => switchTab(tab)}
            className={`flex-1 py-3.5 text-[14px] font-bold transition-all relative ${
              activeTab === tab ? 'text-black dark:text-white' : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300'
            }`}
          >
            {tab === 'for_you' ? 'For you' : 'Following'}
            {activeTab === tab && (
              <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-[3px] bg-black dark:bg-white rounded-full" />
            )}
          </button>
        ))}
      </div>
    )
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col w-full">
      <TabBar />

      {/* "What's new?" User Bar (Mobile Only) */}
      <div className="sm:hidden px-4 py-4 border-b border-zinc-100 dark:border-zinc-900 flex items-center gap-3">
        {user ? (
          <Link href={`/profile?id=${user.id}`} className="flex-none">
            {profileData?.avatar_url ? (
              <Image src={profileData.avatar_url} alt="You" width={40} height={40} className="rounded-full w-10 h-10 object-cover" unoptimized />
            ) : (
              <div className="w-10 h-10 bg-zinc-100 dark:bg-zinc-900 rounded-full flex items-center justify-center text-zinc-400 font-bold">
                {(profileData?.full_name || user.email || 'U')[0].toUpperCase()}
              </div>
            )}
          </Link>
        ) : (
          <div className="w-10 h-10 bg-zinc-100 dark:bg-zinc-900 rounded-full" />
        )}
        <button 
          onClick={() => window.dispatchEvent(new CustomEvent('open-post-modal'))}
          className="flex-grow text-left text-zinc-400 dark:text-zinc-500 font-medium"
        >
          What's new?
        </button>
      </div>

      {/* Content */}
      <div className="flex-1">
        {initialLoad ? (
          <div className="w-full"><PostSkeleton /><PostSkeleton /><PostSkeleton /></div>
        ) : posts.length === 0 ? (
          <div className="flex w-full">
            {activeTab === 'for_you' ? <EmptyForYou /> : <EmptyFollowing />}
          </div>
        ) : (
          <div className="pb-20 sm:pb-0 w-full">
            {posts.map((post, index) => {
              const adIndex = Math.floor(index / 10)
              const showAd = index > 0 && index % 10 === 4
              const directAd = directAds[adIndex % directAds.length]

              return (
                <React.Fragment key={post.is_repost ? `repost-${post.feed_created_at}-${post.id}` : `post-${post.id}`}>
                  <Post post={post} />
                  {showAd && (
                    directAd ? (
                      <DirectAd ad={directAd} />
                    ) : (
                      <InlineFeedAd adId="ca-app-pub-8166782428171770/3966636178" />
                    )
                  )}
                </React.Fragment>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
