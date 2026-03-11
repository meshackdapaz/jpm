'use client'

import React, { useEffect, useState } from 'react'
import { AppLayout } from '@/components/AppLayout'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/components/AuthProvider'
import { MagnifyingGlassIcon, ChevronLeftIcon } from '@heroicons/react/24/outline'
import { VerifiedBadge } from '@/components/VerifiedBadge'
import Link from 'next/link'
import { Haptics, ImpactStyle } from '@capacitor/haptics'
import { Capacitor } from '@capacitor/core'

const triggerHaptic = (style = ImpactStyle.Light) => {
  if (Capacitor.isNativePlatform()) {
    Haptics.impact({ style }).catch(() => {})
  }
}
export default function SearchPage() {
  const [suggestedUsers, setSuggestedUsers] = useState<any[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const { user: currentUser } = useAuth()
  const supabase = createClient()

  useEffect(() => {
    async function fetchSuggestions(user: any) {
      let followingIds: string[] = []
      if (user) {
        const { data: followingData } = await supabase
          .from('follows')
          .select('following_id')
          .eq('follower_id', user.id)
        followingIds = followingData?.map((f: any) => f.following_id) || []
      }

      const { data: profilesData } = await supabase
        .from('profiles')
        .select('*')
        .limit(50)

      if (profilesData) {
        // Filter out current user and already followed
        const filtered = profilesData.filter((p: any) => p.id !== user?.id && !followingIds.includes(p.id))
        
        // Shuffle for variety
        const shuffled = [...filtered].sort(() => Math.random() - 0.5)
        
        // Prioritize verified accounts
        const prioritized = shuffled.sort((a, b) => (b.is_verified ? 1 : 0) - (a.is_verified ? 1 : 0))
        
        const profileIds = prioritized.map((p: any) => p.id).slice(0, 10)
        
        // Fetch follower counts for these profiles
        const { data: followsData } = await supabase
          .from('follows')
          .select('following_id')
          .in('following_id', profileIds)

        const countsMap: Record<string, number> = {}
        followsData?.forEach((f: any) => {
          countsMap[f.following_id] = (countsMap[f.following_id] || 0) + 1
        })

        const suggested = prioritized
          .slice(0, 10)
          .map(p => ({
            ...p,
            follower_count: countsMap[p.id] || 0
          }))
        setSuggestedUsers(suggested)
      }
      setLoading(false)
    }
    fetchSuggestions(currentUser)
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
      setSuggestedUsers(prev => prev.filter(u => u.id !== targetId))
      setSearchResults(prev => prev.map(u => 
        u.id === targetId ? { ...u, isFollowedLocally: true } : u
      ))
    }
  }

  const displayUsers = searchQuery.length >= 2 ? searchResults : suggestedUsers
  const isSearchMode = searchQuery.length >= 2

  return (
    <AppLayout>
      <div className="w-full max-w-full overflow-x-hidden">
        <div 
          className="sticky top-0 z-30 bg-white dark:bg-black border-b border-zinc-100 dark:border-zinc-900 pt-[env(safe-area-inset-top)] w-full"
        >
          <div className="px-4 pt-3 pb-3 flex items-center gap-2">
              <button onClick={() => window.history.back()} className="p-1 -ml-1 text-black dark:text-white">
                <ChevronLeftIcon className="w-6 h-6" strokeWidth={2.5} />
              </button>
              <h1 className="text-[28px] font-black tracking-tight text-black dark:text-white">Search</h1>
            </div>
            <div className="px-4 pb-3">
              <div className="relative group w-full">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <MagnifyingGlassIcon className={`h-5 w-5 text-zinc-500 transition-colors ${loading && isSearchMode ? 'opacity-0' : 'opacity-100'}`} />
                </div>
                {loading && isSearchMode && (
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <div className="h-4 w-4 border-2 border-zinc-500 border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
                <input
                  type="text"
                  placeholder="Search"
                  className="block w-full bg-zinc-100 dark:bg-[#1c1c1e] border-none rounded-[10px] py-1.5 pl-[38px] pr-4 text-[16px] focus:outline-none transition-all m-0 appearance-none text-black dark:text-white placeholder-zinc-500"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
          </div>

        {/* Search History Skeleton (Visible when not actively searching) */}
        {!isSearchMode && (
          <div className="px-4 pb-6 w-full -mt-2">
            <div className="flex gap-2 overflow-x-auto no-scrollbar">
              <div className="h-8 w-24 bg-zinc-200 dark:bg-zinc-800/60 rounded-[10px] flex-shrink-0 animate-pulse" />
              <div className="h-8 w-28 bg-zinc-200 dark:bg-zinc-800/60 rounded-[10px] flex-shrink-0 animate-pulse" />
              <div className="h-8 w-20 bg-zinc-200 dark:bg-zinc-800/60 rounded-[10px] flex-shrink-0 animate-pulse" />
              <div className="h-8 w-32 bg-zinc-200 dark:bg-zinc-800/60 rounded-[10px] flex-shrink-0 animate-pulse" />
            </div>
            <div className="flex gap-2 mt-2 overflow-x-auto no-scrollbar">
              <div className="h-8 w-16 bg-zinc-200 dark:bg-zinc-800/60 rounded-[10px] flex-shrink-0 animate-pulse" />
              <div className="h-8 w-24 bg-zinc-200 dark:bg-zinc-800/60 rounded-[10px] flex-shrink-0 animate-pulse" />
              <div className="h-8 w-20 bg-zinc-200 dark:bg-zinc-800/60 rounded-[10px] flex-shrink-0 animate-pulse" />
              <div className="h-8 w-24 bg-zinc-200 dark:bg-zinc-800/60 rounded-[10px] flex-shrink-0 animate-pulse" />
            </div>
          </div>
        )}


        <div className="px-4 py-4">
          <h2 className="text-black dark:text-zinc-500 font-bold text-[16px] mb-4">
            {isSearchMode ? 'Search results' : 'Follow suggestions'}
          </h2>

          <div className="space-y-1">
            {loading && !isSearchMode ? (
              <div className="p-8 text-center text-zinc-500">Loading suggestions...</div>
            ) : displayUsers.length === 0 ? (
              !isSearchMode && <div className="p-8 text-center text-zinc-500">No users found.</div>
            ) : (
              displayUsers.map(user => (
                <div key={user.id} className="py-4 flex items-center justify-between group">
                  <Link href={`/profile?id=${user.id}`} className="flex items-center gap-4 overflow-hidden flex-grow px-0">
                    <div className="w-12 h-12 rounded-full overflow-hidden relative border border-zinc-100 dark:border-zinc-800 flex-shrink-0">
                      {user.avatar_url ? (
                        <img src={user.avatar_url} alt={user.username || 'user'} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-zinc-200 dark:bg-zinc-800 font-bold text-zinc-500">
                          {user.full_name?.[0] || 'U'}
                        </div>
                      )}
                    </div>
                    <div className="flex-grow min-w-0 pr-2">
                      <div className="font-bold text-[16px] truncate flex items-center gap-1 text-black dark:text-white">
                        {user.username}
                        {user.is_verified && <VerifiedBadge className="w-4 h-4" />}
                      </div>
                      <div className="text-zinc-500 text-[15px] truncate mt-[-1px]">
                        {user.full_name || user.username}
                      </div>
                      <div className="text-black dark:text-[#f3f5f7] text-[14px] mt-1">
                        {user.follower_count >= 1000 
                          ? `${(user.follower_count / 1000).toFixed(1)}K` 
                          : user.follower_count} followers
                      </div>
                    </div>
                  </Link>

                  {!user.isFollowedLocally && currentUser?.id !== user.id && (
                    <button
                      onClick={(e) => handleFollow(e, user.id)}
                      className="bg-black dark:bg-white text-white dark:text-black hover:opacity-90 text-[15px] font-bold py-1.5 px-6 rounded-[10px] transition-all flex-shrink-0 ml-2"
                    >
                      Follow
                    </button>
                  )}
                  {user.isFollowedLocally && (
                    <button disabled className="bg-transparent border border-zinc-200 dark:border-zinc-800 text-zinc-500 text-sm font-bold py-1.5 px-6 rounded-xl flex-shrink-0 ml-2">
                      Following
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Bottom spacer for mobile nav */}
        <div className="h-28 sm:h-8" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }} />
      </div>
    </AppLayout>
  )
}
