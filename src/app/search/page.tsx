'use client'

import React, { useEffect, useState } from 'react'
import { AppLayout } from '@/components/AppLayout'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/components/AuthProvider'
import { MagnifyingGlassIcon, ChevronLeftIcon } from '@heroicons/react/24/outline'
import { VerifiedBadge } from '@/components/VerifiedBadge'
import Image from 'next/image'
import Link from 'next/link'
import { Haptics, ImpactStyle } from '@capacitor/haptics'
import { Capacitor } from '@capacitor/core'
import { Post } from '@/components/Post'
import { PostSkeleton } from '@/components/Feed'

const POST_SEL = `id, content, image_url, image_urls, title, created_at, creator_id, view_count, hide_counts, is_archived, profiles:creator_id(id, full_name, username, avatar_url, is_verified, last_seen, settings), likes(count), comments(count), reposts(count)`

const triggerHaptic = (style = ImpactStyle.Light) => {
  if (Capacitor.isNativePlatform()) {
    Haptics.impact({ style }).catch(() => {})
  }
}
export default function SearchPage() {
  const [explorePosts, setExplorePosts] = useState<any[]>([])
  const [postsLoading, setPostsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const { user: currentUser } = useAuth()
  const supabase = createClient()

  useEffect(() => {
    async function fetchExplorePosts() {
      const currentUserId = currentUser?.id

      const [{ data: pd, error }, { data: md }, { data: ld }] = await Promise.all([
        supabase.from('posts').select(POST_SEL).order('created_at', { ascending: false }).limit(20),
        currentUserId
          ? supabase.from('reposts').select('post_id').eq('user_id', currentUserId)
          : Promise.resolve({ data: [] }),
        currentUserId
          ? supabase.from('likes').select('post_id, reaction_type').eq('user_id', currentUserId)
          : Promise.resolve({ data: [] }),
      ])
      
      if (error) {
        console.error("Explore feed fetch error:", error)
      }

      const myReposts = new Set((md || []).map((r: any) => r.post_id))
      const myLikes = ld || []

      if (pd) {
        const enhanced = pd.map((post: any) => {
          const likeObj = myLikes.find((l: any) => l.post_id === post.id)
          return {
            ...post,
            is_liked_by_me: !!likeObj,
            my_reaction: likeObj ? likeObj.reaction_type : null,
            is_reposted_by_me: myReposts.has(post.id)
          }
        })
        setExplorePosts(enhanced)
      }
      setPostsLoading(false)
    }
    fetchExplorePosts()
  }, [currentUser])

  useEffect(() => {
    async function performSearch() {
      if (searchQuery.trim().length < 2) {
        setSearchResults([])
        setLoading(false)
        return
      }
      setLoading(true)

      const { data } = await supabase
        .from('profiles')
        .select('*')
        .or(`username.ilike.%${searchQuery}%,full_name.ilike.%${searchQuery}%`)
        .limit(15)

      if (data) {
        const profileIds = data.map((u: any) => u.id)
        const { data: followsData } = await supabase
          .from('follows')
          .select('following_id')
          .in('following_id', profileIds)

        const countsMap: Record<string, number> = {}
        followsData?.forEach((f: any) => {
          countsMap[f.following_id] = (countsMap[f.following_id] || 0) + 1
        })

        setSearchResults(data.map((u: any) => ({
          ...u,
          follower_count: countsMap[u.id] || 0
        })))
      }
      setLoading(false)
    }

    const timer = setTimeout(performSearch, 300)
    return () => clearTimeout(timer)
  }, [searchQuery])

  const handleFollow = async (e: React.MouseEvent, targetId: string) => {
    e.preventDefault()
    if (!currentUser) return alert('Please login to follow')
    triggerHaptic(ImpactStyle.Medium)
    
    const { error } = await supabase.from('follows').insert({ follower_id: currentUser.id, following_id: targetId })
    if (!error) {
      setSearchResults(prev => prev.map(u => 
        u.id === targetId ? { ...u, isFollowedLocally: true } : u
      ))
    }
  }

  const isSearchMode = searchQuery.length >= 2

  return (
    <AppLayout>
      <div className="w-full max-w-[100vw] overflow-x-hidden">
        <div className="max-w-2xl mx-auto min-h-[100dvh] pb-20 sm:pb-0">
          <div className="sticky top-0 sm:top-16 z-40 bg-white/90 dark:bg-black/90 backdrop-blur-md px-4 pb-4 pt-[calc(1.25rem+env(safe-area-inset-top))] w-full overflow-x-hidden">
            <div className="flex items-center gap-2 mb-4">
              <button onClick={() => window.history.back()} className="p-1 -ml-1 text-black dark:text-white">
                <ChevronLeftIcon className="w-6 h-6" strokeWidth={2.5} />
              </button>
              <h1 className="text-[28px] font-black tracking-tight text-black dark:text-white">Search</h1>
            </div>
            <div className="relative group w-full">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <MagnifyingGlassIcon className="h-5 w-5 text-zinc-500 transition-colors" />
              </div>
              <input
                type="text"
                placeholder="Search"
                className="block w-full bg-zinc-100 dark:bg-[#1c1c1e] border-none rounded-[10px] py-2 pl-[38px] pr-4 text-[16px] focus:outline-none transition-all m-0 appearance-none text-black dark:text-white placeholder-zinc-500"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </div>

        {isSearchMode ? (
          <div className="px-4 py-4">
            <h2 className="text-black dark:text-zinc-500 font-bold text-[16px] mb-4">
              Search results
            </h2>
            <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {loading ? (
                <div className="p-8 text-center text-zinc-500">Searching...</div>
              ) : searchResults.length === 0 ? (
                <div className="p-8 text-center text-zinc-500">No users found.</div>
              ) : (
                searchResults.map(user => (
                  <div key={user.id} className="py-4 flex items-start justify-between group">
                    <Link href={`/profile?id=${user.id}`} className="flex items-start gap-4 overflow-hidden flex-grow">
                      <div className="w-12 h-12 rounded-full overflow-hidden relative border border-zinc-100 dark:border-zinc-800 flex-shrink-0">
                        {user.avatar_url ? (
                          <Image src={user.avatar_url} alt={user.username} fill className="object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-zinc-200 dark:bg-zinc-800 font-bold text-zinc-500">
                            {user.full_name?.[0] || 'U'}
                          </div>
                        )}
                      </div>
                      <div className="flex-grow min-w-0 pr-4">
                        <div className="font-bold text-[16px] truncate flex items-center gap-1 group-hover:underline text-black dark:text-white">
                          {user.username}
                          {user.is_verified && <VerifiedBadge className="w-4 h-4" />}
                        </div>
                        <div className="text-zinc-500 text-[15px] truncate mb-0.5 mt-[-2px]">
                          {user.full_name || user.username}
                        </div>
                        <div className="text-black dark:text-white font-medium text-[14px] mt-1.5">
                          {user.follower_count >= 1000 
                            ? `${(user.follower_count / 1000).toFixed(1)}K` 
                            : user.follower_count} followers
                        </div>
                      </div>
                    </Link>

                    {!user.isFollowedLocally && currentUser?.id !== user.id && (
                      <button
                        onClick={(e) => handleFollow(e, user.id)}
                        className="bg-black dark:bg-white text-white dark:text-black hover:bg-zinc-800 dark:hover:bg-zinc-200 text-[15px] font-bold py-1.5 px-6 rounded-[10px] transition-colors flex-shrink-0"
                      >
                        Follow
                      </button>
                    )}
                    {user.isFollowedLocally && (
                      <button disabled className="bg-transparent border border-zinc-200 dark:border-zinc-800 text-zinc-500 text-sm font-bold py-1.5 px-6 rounded-xl flex-shrink-0">
                        Following
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        ) : (
          <div className="w-full">
            {postsLoading ? (
              <div className="flex-1 w-full pt-4">
                <PostSkeleton />
                <PostSkeleton />
                <PostSkeleton />
              </div>
            ) : explorePosts.length === 0 ? (
              <div className="p-8 text-center text-zinc-500">No recent posts found.</div>
            ) : (
              <div className="pb-20 sm:pb-0 w-full pt-2">
                {explorePosts.map((post: any) => (
                  <Post key={post.id} post={post} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  )
}
