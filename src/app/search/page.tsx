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
  const [popularAccounts, setPopularAccounts] = useState<any[]>([])
  const [searchHistory, setSearchHistory] = useState<string[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const { user: currentUser } = useAuth()
  const supabase = createClient()

  // Load history on mount
  useEffect(() => {
    const saved = localStorage.getItem('search_history')
    if (saved) {
      try {
        setSearchHistory(JSON.parse(saved))
      } catch (e) {
        setSearchHistory([])
      }
    }
  }, [])

  const saveToHistory = (query: string) => {
    if (!query.trim() || query.length < 2) return
    const q = query.trim()
    const updated = [q, ...searchHistory.filter(h => h !== q)].slice(0, 8)
    setSearchHistory(updated)
    localStorage.setItem('search_history', JSON.stringify(updated))
  }

  useEffect(() => {
    async function fetchSuggestions(user: any) {
      setLoading(true)
      let followingIds: string[] = []
      if (user) {
        const { data: followingData } = await supabase
          .from('follows')
          .select('following_id')
          .eq('follower_id', user.id)
        followingIds = followingData?.map((f: any) => f.following_id) || []
      }

      // Fetch more profiles to have a better pool for "engagement" filtering
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('*')
        .order('is_verified', { ascending: false })
        .limit(100)

      if (profilesData) {
        // Filter out current user and already followed
        const filtered = profilesData.filter((p: any) => p.id !== user?.id && !followingIds.includes(p.id))
        
        // Prioritize verified accounts and then shuffle slightly
        const prioritized = filtered.sort((a: any, b: any) => {
          if (a.is_verified && !b.is_verified) return -1
          if (!a.is_verified && b.is_verified) return 1
          return Math.random() - 0.5
        })
        
        const topProfiles = prioritized.slice(0, 15)
        const profileIds = topProfiles.map((p: any) => p.id)
        
        // Fetch follower counts for these profiles to show "engagement"
        const { data: followsData } = await supabase
          .from('follows')
          .select('following_id')
          .in('following_id', profileIds)

        const countsMap: Record<string, number> = {}
        followsData?.forEach((f: any) => {
          countsMap[f.following_id] = (countsMap[f.following_id] || 0) + 1
        })

        const suggested = topProfiles.map((p: any) => ({
          ...p,
          follower_count: countsMap[p.id] || 0
        }))

        // Final sort by follower count for "high engagement" feel
        suggested.sort((a: any, b: any) => b.follower_count - a.follower_count)
        
        setSuggestedUsers(suggested.slice(0, 10))
      }
      setLoading(false)
    }
    fetchSuggestions(currentUser)

    const fetchPopular = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id, username, full_name, is_verified')
        .eq('is_verified', true)
        .limit(6)
      if (data) setPopularAccounts(data)
    }
    fetchPopular()
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
        saveToHistory(searchQuery)
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
      <div className="w-full max-w-full overflow-x-hidden flex flex-col min-h-[80vh]">
        {/* Sticky header: title + search bar + history chips — all in one block */}
        <div className="sticky top-0 z-30 bg-white dark:bg-black border-b border-zinc-100 dark:border-zinc-900 pt-[env(safe-area-inset-top)] w-full">
          <div className="px-4 pt-3 pb-2 flex items-center gap-2">
            <button onClick={() => window.history.back()} className="p-1 -ml-1 text-black dark:text-white">
              <ChevronLeftIcon className="w-6 h-6" strokeWidth={2.5} />
            </button>
            <h1 className="text-[28px] font-black tracking-tight text-black dark:text-white">Search</h1>
          </div>
          <div className="px-4 pb-2">
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
                className="block w-full bg-zinc-100 dark:bg-[#1c1c1e] border-none rounded-[10px] py-2 pl-[38px] pr-4 text-[16px] focus:outline-none transition-all m-0 appearance-none text-black dark:text-white placeholder-zinc-500"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {/* Search History / Popular Accounts — inside the sticky block */}
          {!isSearchMode && (
            <div className="px-4 pb-3 w-full">
              <div className="flex gap-2 overflow-x-auto no-scrollbar">
                {/* Real Search History */}
                {searchHistory.map((h, i) => (
                  <button
                    key={`hist-${i}`}
                    onClick={() => {
                      triggerHaptic(ImpactStyle.Light)
                      setSearchQuery(h)
                    }}
                    className="h-8 px-4 bg-zinc-100 dark:bg-zinc-800/60 rounded-[10px] flex-shrink-0 flex items-center justify-center text-[13px] font-bold text-zinc-900 dark:text-zinc-100 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
                  >
                    {h}
                  </button>
                ))}

                {/* Popular Accounts */}
                {popularAccounts.map((acc) => (
                  <button
                    key={acc.id}
                    onClick={() => {
                      triggerHaptic(ImpactStyle.Light)
                      window.location.href = `/profile?id=${acc.id}`
                    }}
                    className="h-8 px-4 bg-zinc-100 dark:bg-zinc-800/60 rounded-[10px] flex-shrink-0 flex items-center justify-center text-[13px] font-bold text-zinc-900 dark:text-zinc-100 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors border border-zinc-200/50 dark:border-zinc-700/50"
                  >
                    @{acc.username}
                  </button>
                ))}

                {searchHistory.length === 0 && popularAccounts.length === 0 && (
                  <>
                    <div className="h-8 w-24 bg-zinc-100 dark:bg-zinc-800/60 rounded-[10px] flex-shrink-0 animate-pulse" />
                    <div className="h-8 w-28 bg-zinc-100 dark:bg-zinc-800/60 rounded-[10px] flex-shrink-0 animate-pulse" />
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="px-4 py-4">
          <h2 className="text-black dark:text-zinc-500 font-bold text-[16px] mb-4">
            {isSearchMode ? 'Search results' : 'Follow suggestions'}
          </h2>

          <div className="space-y-1 min-h-[400px] flex flex-col">
            {loading ? (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4">
                <div className="w-12 h-12 border-4 border-zinc-200 dark:border-zinc-800 border-t-black dark:border-t-white rounded-full animate-spin" />
                <p className="text-zinc-500 font-medium animate-pulse">Loading {isSearchMode ? 'results' : 'suggestions'}...</p>
                
                {/* Skeleton UI */}
                {!isSearchMode && (
                  <div className="w-full space-y-4 mt-8 opacity-50">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="flex items-center gap-3 py-2">
                        <div className="w-12 h-12 rounded-full bg-zinc-100 dark:bg-zinc-900 animate-pulse" />
                        <div className="flex-1 space-y-2">
                          <div className="h-4 w-32 bg-zinc-100 dark:bg-zinc-900 rounded animate-pulse" />
                          <div className="h-3 w-48 bg-zinc-100 dark:bg-zinc-900 rounded animate-pulse" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : displayUsers.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center p-12 text-center mt-4">
                <div className="w-20 h-20 bg-zinc-100 dark:bg-zinc-900/40 rounded-3xl flex items-center justify-center mb-6 shadow-xl shadow-black/5">
                  <MagnifyingGlassIcon className="w-10 h-10 text-zinc-300 dark:text-zinc-600" />
                </div>
                <h3 className="text-[17px] font-bold text-black dark:text-white mb-1">
                  {isSearchMode ? 'User no found' : 'No suggestions'}
                </h3>
                <p className="text-zinc-500 text-sm max-w-[200px]">
                  {isSearchMode ? "We couldn't find anyone matching your search." : "Try checking back later for more recommendations."}
                </p>
              </div>
            ) : (
              displayUsers.map(user => (
                <div key={user.id} className="py-3 flex items-center gap-3">
                  {/* Avatar + info — fixed width to prevent clipping */}
                  <Link href={`/profile?id=${user.id}`} className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-12 h-12 rounded-full overflow-hidden relative border border-zinc-100 dark:border-zinc-800 flex-shrink-0">
                      {user.avatar_url ? (
                        <img src={user.avatar_url} alt={user.username || 'user'} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-zinc-200 dark:bg-zinc-800 font-bold text-zinc-500">
                          {user.full_name?.[0] || 'U'}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-[15px] truncate flex items-center gap-1 text-black dark:text-white">
                        <span className="truncate">{user.username}</span>
                        {user.is_verified && <VerifiedBadge className="w-4 h-4 flex-shrink-0" />}
                      </div>
                      <div className="text-zinc-500 text-[13px] truncate">
                        {user.full_name || user.username}
                      </div>
                      <div className="text-zinc-400 text-[12px] mt-0.5">
                        {user.follower_count >= 1000
                          ? `${(user.follower_count / 1000).toFixed(1)}K`
                          : user.follower_count} followers
                      </div>
                    </div>
                  </Link>

                  {/* Follow button — right edge aligned with chips above */}
                  <div className="flex-shrink-0 pr-4">
                    {!user.isFollowedLocally && currentUser?.id !== user.id && (
                      <button
                        onClick={(e) => handleFollow(e, user.id)}
                        className="bg-black dark:bg-white text-white dark:text-black hover:opacity-90 text-[14px] font-bold py-1.5 px-5 rounded-[10px] transition-all whitespace-nowrap"
                      >
                        Follow
                      </button>
                    )}
                    {user.isFollowedLocally && (
                      <button disabled className="bg-transparent border border-zinc-200 dark:border-zinc-700 text-zinc-500 text-[14px] font-bold py-1.5 px-5 rounded-[10px] whitespace-nowrap">
                        Following
                      </button>
                    )}
                  </div>
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
