'use client'

import React, { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Post } from '@/components/Post'
import { useAuth } from './AuthProvider'
import Link from 'next/link'
import { UserPlusIcon, ArrowUpIcon } from '@heroicons/react/24/outline'
import { StoriesBar } from './StoriesBar'
import { SparklesIcon } from '@heroicons/react/24/solid'
import Image from 'next/image'
import { Virtuoso, VirtuosoHandle } from 'react-virtuoso'
import { RightSidebar } from './RightSidebar'
import { InlineFeedAd } from './InlineFeedAd'
import { DirectAd } from './DirectAd'
import { NativeFeedAd } from './NativeFeedAd'
import { motion } from 'framer-motion'
import { useFeedTelemetry } from '@/hooks/useFeedTelemetry'
import { Capacitor } from '@capacitor/core'

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

function EmptyGhost() {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-8 text-center gap-5">
      <div className="w-20 h-20 rounded-full bg-amber-100 dark:bg-amber-950/40 flex items-center justify-center">
        <svg className="w-9 h-9 text-amber-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
          <circle cx="9" cy="9" r="1.5" /><circle cx="15" cy="9" r="1.5" />
          <path d="M8 13c0 .5.5 1 1 1s1-.5 1-1m4 0c0 .5.5 1 1 1s1-.5 1-1" />
        </svg>
      </div>
      <div>
        <p className="font-black text-lg text-zinc-700 dark:text-zinc-300">No active ghosts</p>
        <p className="text-sm text-zinc-400 mt-1 max-w-xs">Anonymous posts appear here for 24 hours.</p>
      </div>
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

const POST_SEL = `id, content, image_url, image_urls, video_url, title, created_at, creator_id, view_count, hide_counts, is_archived, settings, quoted_post_id, is_ghost, expires_at, quoted_post:quoted_post_id(id, content, profiles:creator_id(id, username, full_name, avatar_url)), profiles:creator_id(id, full_name, username, avatar_url, is_verified, last_seen, settings, fcm_token), likes(count), comments(count), reposts(count)`

// Use simple join (no FK alias) to avoid PostgREST join resolution errors
const REPOST_SEL = `created_at, user_id, profiles:user_id(id, full_name, username, avatar_url, is_verified), post:posts(id, content, image_url, image_urls, video_url, title, created_at, creator_id, view_count, hide_counts, is_archived, settings, quoted_post_id, is_ghost, expires_at, quoted_post:quoted_post_id(id, content, profiles:creator_id(id, username, full_name, avatar_url)), profiles:creator_id(id, full_name, username, avatar_url, is_verified, last_seen, settings), likes(count), comments(count), reposts(count))`

// ── Main Feed ─────────────────────────────────────────────────────────────────

export function Feed() {
  const [posts, setPosts] = useState<any[]>([])
  const [initialLoad, setInitialLoad] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [cursor, setCursor] = useState<string | null>(null)
  const [newPostCount, setNewPostCount] = useState(0)
  const PAGE_SIZE = 20
  const [activeTab, setActiveTab] = useState<'for_you' | 'following'>('for_you')
  const [profileData, setProfileData] = useState<any>(null)
  const [directAds, setDirectAds] = useState<any[]>([])
  const { user, loading: authLoading } = useAuth()
  const supabase = createClient()
  const { observePost } = useFeedTelemetry(user)
  const virtuosoRef = useRef<VirtuosoHandle>(null)
  const refreshKey = useRef(0)  // increment to trigger re-fetch


  useEffect(() => {
    if (user) {
      supabase.from('profiles').select('full_name, avatar_url, username').eq('id', user.id).single()
        .then(({ data }: { data: any }) => setProfileData(data))
    }
    
    // Fetch active Direct Ads
    supabase.from('direct_ads').select('*').eq('is_active', true).then(({ data, error }: { data: any, error: any }) => {
      if (error) console.error('Error fetching direct ads:', error)
      if (data && data.length > 0) setDirectAds(data)
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
    window.addEventListener('post-created', handler)
    const feedHandler = (e: any) => {
      if (e.detail?.tab) switchTab(e.detail.tab)
    }
    window.addEventListener('feed-change', feedHandler)
    return () => {
      window.removeEventListener('ptr-refresh', handler)
      window.removeEventListener('post-created', handler)
      window.removeEventListener('feed-change', feedHandler)
    }
  }, [activeTab])

  const observerTarget = useRef<HTMLDivElement>(null)

  const fetchFeed = async (isLoadMore = false) => {
    const currentUser = userRef.current
    const currentCursor = isLoadMore ? cursor : null
    
    if (!isLoadMore) {
      setInitialLoad(true)
      setHasMore(true)
    } else {
      if (!hasMore || loadingMore) return
      setLoadingMore(true)
    }

    // ── FOLLOWING TAB ─────────────────────────────────────────────────
    if (activeTab === 'following') {
      if (!currentUser) {
        setPosts([])
        setInitialLoad(false)
        setLoadingMore(false)
        setHasMore(false)
        return
      }

      const { data: followData } = await supabase
        .from('follows').select('following_id').eq('follower_id', currentUser.id)

      const ids = followData?.map((f: any) => f.following_id) || []

      if (ids.length === 0) {
        setPosts([])
        setInitialLoad(false)
        setLoadingMore(false)
        setHasMore(false)
        return
      }

      let postsQuery = supabase.from('posts')
        .select(POST_SEL)
        .in('creator_id', ids)
        .or('expires_at.is.null,expires_at.gt.now()')
        .order('created_at', { ascending: false })
        .limit(PAGE_SIZE)

      let repostsQuery = supabase.from('reposts')
        .select(REPOST_SEL)
        .in('user_id', ids)
        .order('created_at', { ascending: false })
        .limit(PAGE_SIZE)

      if (currentCursor) {
        postsQuery = postsQuery.lt('created_at', currentCursor)
        repostsQuery = repostsQuery.lt('created_at', currentCursor)
      }

      const [{ data: pd }, { data: rd }, { data: md }, { data: ld }] = await Promise.all([
        postsQuery,
        repostsQuery,
        supabase.from('reposts').select('post_id').eq('user_id', currentUser.id),
        supabase.from('likes').select('post_id, reaction_type').eq('user_id', currentUser.id),
      ])

      const myReposts = (md || []).map((r: any) => r.post_id)
      const myLikes = ld || []
      const newFeed = buildFeed(pd, rd, myReposts, myLikes)
      
      const updatedPosts = isLoadMore 
        ? [...posts, ...newFeed].filter((v, i, a) => a.findIndex(t => (t.id === v.id && t.is_repost === v.is_repost)) === i)
        : newFeed

      setPosts(updatedPosts)
      
      const lastItem = updatedPosts[updatedPosts.length - 1]
      setCursor(lastItem?.feed_created_at || lastItem?.created_at || null)
      
      setHasMore((pd?.length === PAGE_SIZE) || (rd?.length === PAGE_SIZE))
      setInitialLoad(false)
      setLoadingMore(false)
      return
    }

    if (activeTab === 'for_you') {
      const currentUserId = currentUser?.id
      
      let postsQuery = supabase.from('posts')
        .select(POST_SEL)
        .or('expires_at.is.null,expires_at.gt.now()')
        .order('created_at', { ascending: false })
        .limit(PAGE_SIZE)

      if (currentCursor) {
        postsQuery = postsQuery.lt('created_at', currentCursor)
      }

      const [{ data: pd }, { data: md }, { data: ld }] = await Promise.all([
        postsQuery,
        currentUserId
          ? supabase.from('reposts').select('post_id').eq('user_id', currentUserId)
          : Promise.resolve({ data: [] }),
        currentUserId
          ? supabase.from('likes').select('post_id, reaction_type').eq('user_id', currentUserId)
          : Promise.resolve({ data: [] })
      ])

      const myReposts = (md || []).map((r: any) => r.post_id)
      const myLikes = ld || []
      const newFeed = buildRecommendedFeed(pd, myReposts, myLikes)
      
      const updatedPosts = isLoadMore 
        ? [...posts, ...newFeed].filter((v, i, a) => a.findIndex(t => t.id === v.id) === i)
        : newFeed

      setPosts(updatedPosts)
      
      const lastItem = updatedPosts[updatedPosts.length - 1]
      setCursor(lastItem?.created_at || null)
      
      setHasMore(pd?.length === PAGE_SIZE)
      setInitialLoad(false)
      setLoadingMore(false)
    }
  }

  // Effect to load initial feed
  useEffect(() => {
    if (authLoading) return
    fetchFeed(false)
    doRefresh.current = () => {
      setNewPostCount(0)
      return fetchFeed(false)
    }
    
    // X-style: Listen for new posts, but only increment the pill, do not auto-reload
    const ch1 = supabase.channel(`feed:p:${activeTab}:${Date.now()}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'posts' }, () => {
        setNewPostCount(prev => prev + 1)
      })
      .subscribe()
      
    return () => { supabase.removeChannel(ch1) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, authLoading, user?.id])

  // Switch tab helper: clear posts + reset loading only on tab switch
  function switchTab(tab: 'for_you' | 'following') {
    if (tab === activeTab) return
    setPosts([])
    setCursor(null)
    setHasMore(true)
    setNewPostCount(0)
    setInitialLoad(true)
    setActiveTab(tab)
  }

  // ── Tab bar ───────────────────────────────────────────────────────────────

  function TabBar() {
    return (
      <div className="sticky top-[calc(3.5rem+env(safe-area-inset-top))] sm:top-0 z-30 flex bg-white/80 dark:bg-black/80 backdrop-blur-md border-b border-zinc-100 dark:border-zinc-900">

        {(['for_you', 'following'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => {
              setActiveTab(tab)
              window.scrollTo({ top: 0, behavior: 'smooth' })
            }}
            className="flex-1 py-4 relative"
          >
            <span className={`text-[15px] font-bold transition-colors ${activeTab === tab ? 'text-[#101010] dark:text-[#f3f5f7]' : 'text-zinc-400'}`}>
              {tab === 'for_you' ? 'For you' : tab === 'following' ? 'Following' : 'Ghost Threads'}
            </span>
            {activeTab === tab && (
              <motion.div 
                layoutId="tab-underline" 
                className="absolute bottom-0 left-0 right-0 h-[2px] bg-black dark:bg-white mx-auto w-12" 
                transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
              />
            )}
          </button>
        ))}
      </div>
    )
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col w-full">
      <StoriesBar />
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
      <div className="flex-1 relative">
        {newPostCount > 0 && (
          <div className="absolute top-4 left-0 right-0 z-20 flex justify-center animate-slide-up pointer-events-none">
            <button
              onClick={() => {
                window.scrollTo({ top: 0, behavior: 'smooth' })
                setNewPostCount(0)
                setInitialLoad(true)
                doRefresh.current()
              }}
              className="pointer-events-auto bg-blue-500 hover:bg-blue-600 text-white shadow-lg shadow-blue-500/20 px-5 py-2.5 rounded-full font-bold text-[14px] flex items-center gap-2 btn-press transition-all hover:scale-105"
            >
              <ArrowUpIcon className="w-4 h-4 text-white" strokeWidth={3} />
              {newPostCount} new post{newPostCount > 1 ? 's' : ''}
            </button>
          </div>
        )}

        {initialLoad ? (
          <div className="w-full"><PostSkeleton /><PostSkeleton /><PostSkeleton /></div>
        ) : posts.length === 0 ? (
          <div className="flex w-full">
            {activeTab === 'following' && <EmptyFollowing />}
            {activeTab === 'for_you' && <EmptyForYou />}
          </div>
        ) : (
          <div className="pb-20 sm:pb-0 w-full">
            <Virtuoso
              useWindowScroll
              data={posts}
              ref={virtuosoRef}
              increaseViewportBy={1000}
              endReached={() => {
                if (hasMore && !loadingMore) fetchFeed(true)
              }}
              itemContent={(index, post) => {
                const adIndex = Math.floor(index / 3)
                const showAd = index > 0 && index % 3 === 2
                const directAd = directAds.length > 0 ? directAds[adIndex % directAds.length] : null

                return (
                  <div key={post.is_repost ? `repost-${post.feed_created_at}-${post.id}` : `post-${post.id}`}>
                    <Post post={post} onObserve={observePost} />
                    {showAd && (
                      directAd ? (
                        <DirectAd ad={directAd} />
                      ) : (
                        // If no direct ad is available, use Native AdMob on native platform
                        Capacitor.isNativePlatform() ? (
                          <NativeFeedAd adUnitId="ca-app-pub-8166782428171770/3141151608" />
                        ) : (
                          // Fallback to AdSense on web
                          <InlineFeedAd adId="ca-app-pub-8166782428171770/3966636178" />
                        )
                      )
                    )}
                  </div>
                )
              }}
              components={{
                Footer: () => (
                  <div className="w-full">
                    {loadingMore && (
                      <div className="py-6 flex justify-center items-center gap-2 text-zinc-400 font-medium">
                        <div className="w-5 h-5 border-2 border-zinc-300 dark:border-zinc-700 border-t-zinc-900 dark:border-t-zinc-100 rounded-full animate-spin" />
                        Loading more...
                      </div>
                    )}
                    
                    {!hasMore && posts.length > 0 && (
                      <div className="py-12 pb-24 text-center text-zinc-400 text-[15px] font-bold">
                        You're all caught up ✨
                      </div>
                    )}
                  </div>
                )
              }}
            />
          </div>
        )}
      </div>
    </div>
  )
}
