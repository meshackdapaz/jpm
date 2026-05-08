'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from './AuthProvider'
import { VerifiedBadge } from './VerifiedBadge'
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline'
import { SidebarAd } from './SidebarAd'

type TrendingPost = {
  id: string
  title: string
  content: string | null
  image_url: string | null
  view_count: number
  creator_id: string
  profiles: {
    username: string | null
    full_name: string | null
    avatar_url: string | null
    is_verified: boolean | null
  } | null
}

type SuggestedUser = {
  id: string
  full_name: string | null
  username: string | null
  avatar_url: string | null
  is_verified: boolean | null
}

export function RightSidebar({ mobile = false }: { mobile?: boolean }) {
  const { user, loading: authLoading } = useAuth()
  const supabase = createClient()
  const [trending, setTrending] = useState<TrendingPost[]>([])
  const [suggested, setSuggested] = useState<SuggestedUser[]>([])
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set())
  const [popularAccounts, setPopularAccounts] = useState<any[]>([])
  const [searchHistory, setSearchHistory] = useState<string[]>([])

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

  // Inline Auth States (for logged-out)
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [username, setUsername] = useState('')
  const [authLoadingState, setAuthLoadingState] = useState(false)
  const [authError, setAuthError] = useState<string | null>(null)

  useEffect(() => {
    const fetchTrending = async () => {
      const { data } = await supabase
        .from('posts')
        .select('id, title, content, image_url, view_count, creator_id, profiles(username, full_name, avatar_url, is_verified)')
        .order('view_count', { ascending: false })
        .limit(10)
      if (data) setTrending(data as unknown as TrendingPost[])
    }
    fetchTrending()
  }, [])

  useEffect(() => {
    if (!user) return

    const fetchSuggested = async () => {
      // Get IDs already being followed
      const { data: followingData } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', user.id)

      const alreadyFollowing = new Set<string>((followingData || []).map((f: any) => f.following_id))
      alreadyFollowing.add(user.id) // Exclude self
      setFollowingIds(alreadyFollowing)

      // Fetch profiles not yet followed
      const excludeIds = Array.from(alreadyFollowing)
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name, username, avatar_url, is_verified')
        .not('id', 'in', `(${excludeIds.join(',')})`)
        .limit(10)

      if (data) setSuggested(data as SuggestedUser[])
    }
    fetchSuggested()
  }, [user])

  // ── Fetch Popular Accounts for Search Suggestions ────────────────────────
  useEffect(() => {
    const fetchPopular = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id, username, full_name, is_verified')
        .eq('is_verified', true)
        .limit(6)
      
      if (data) setPopularAccounts(data)
    }
    fetchPopular()
  }, [])

  const router = useRouter()

  const handleFollow = async (targetId: string) => {
    if (!user) return

    const { error } = await supabase
      .from('follows')
      .insert({ follower_id: user.id, following_id: targetId })

    if (!error) {
      // Send notification to the followed user
      await supabase.from('notifications').insert({
        user_id: targetId,
        actor_id: user.id,
        type: 'follow'
      })
      // Remove from suggestions
      setSuggested(prev => prev.filter(u => u.id !== targetId))
      setFollowingIds(prev => new Set([...prev, targetId]))
    }
  }

  const handleInlineAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setAuthLoadingState(true)
    setAuthError(null)

    if (mode === 'login') {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        setAuthError(error.message)
        setAuthLoadingState(false)
      } else {
        setAuthLoadingState(false)
        resetForm()
      }
    } else {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName, username: username.toLowerCase().replace(/\s/g, '') } }
      })

      if (signUpError) {
        setAuthError(signUpError.message)
        setAuthLoadingState(false)
        return
      }

      if (data?.user) {
        const { error: profileError } = await supabase.from('profiles').insert({
          id: data.user.id,
          full_name: fullName,
          username: username.toLowerCase().replace(/\s/g, ''),
          avatar_url: null,
          is_verified: false,
          settings: { isPrivate: false, theme: 'light', notifications: true }
        })

        if (profileError) {
          setAuthError(profileError.message)
        } else {
          resetForm()
        }
      }
      setAuthLoadingState(false)
    }
  }

  const resetForm = () => {
    setEmail('')
    setPassword('')
    setFullName('')
    setUsername('')
    setAuthError(null)
  }

  // ─── STABLE PLACEHOLDER (Loading) ───────────────────────────────────────
  if (authLoading) return (
    <aside className="hidden lg:flex flex-col gap-6 w-[300px] xl:w-[350px] flex-none pt-6 sticky top-0 px-2 opacity-50 pointer-events-none">
      <div className="h-10 bg-zinc-100 dark:bg-zinc-800 rounded-xl mb-4 animate-pulse" />
      <div className="h-64 bg-zinc-100 dark:bg-zinc-800 rounded-2xl mb-4 animate-pulse" />
      <div className="h-48 bg-zinc-100 dark:bg-zinc-800 rounded-2xl animate-pulse" />
    </aside>
  )

  // ─── LOGGED IN VIEW ───────────────────────────────────────────────────
  if (user) return (
    <aside className={mobile 
      ? "flex flex-col gap-4 w-full flex-none pb-6" 
      : "hidden lg:flex flex-col gap-5 w-[320px] flex-none pt-8 sticky top-0 pb-6 px-4"
    }>
      {/* Current User Summary */}
      <section className="flex items-center justify-between mb-4">
        <Link href={`/profile?id=${user.id}`} className="flex items-center gap-3 group">
          <div className="relative">
            {user.user_metadata?.avatar_url ? (
              <Image src={user.user_metadata.avatar_url} alt="User" width={44} height={44} className="rounded-full w-11 h-11 object-cover" unoptimized />
            ) : (
              <div className="w-11 h-11 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-sm font-bold text-zinc-500">
                {(user.user_metadata?.full_name || user.email || '?')[0].toUpperCase()}
              </div>
            )}
          </div>
          <div className="flex flex-col min-w-0">
            <span className="font-bold text-[14px] text-zinc-900 dark:text-zinc-100 group-hover:underline truncate">
              {user.user_metadata?.username || 'user'}
            </span>
            <span className="text-[14px] text-zinc-500 truncate">
              {user.user_metadata?.full_name || user.email}
            </span>
          </div>
        </Link>
        <button 
          onClick={() => supabase.auth.signOut()}
          className="text-[12px] font-bold text-sky-500 hover:text-zinc-900 dark:hover:text-white transition-colors"
        >
          Switch
        </button>
      </section>

      {/* Suggestions Section */}
      {suggested.length > 0 && (
        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between mb-1">
            <h2 className="font-bold text-[14px] text-zinc-500">Suggestions for you</h2>
            <Link href="/search" className="text-[12px] font-bold text-zinc-900 dark:text-zinc-100 hover:opacity-50">See All</Link>
          </div>
          
          <div className="flex flex-col gap-3">
            {suggested.slice(0, 5).map((profile: SuggestedUser) => (
              <div key={profile.id} className="flex items-center justify-between">
                <Link href={`/profile?id=${profile.id}`} className="flex items-center gap-3 min-w-0 group">
                  <div className="relative flex-none">
                    {profile.avatar_url ? (
                      <Image src={profile.avatar_url} alt="User" width={32} height={32} className="rounded-full w-8 h-8 object-cover" unoptimized />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-[10px] font-bold text-zinc-500">
                        {(profile.full_name || profile.username || '?')[0].toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="font-bold text-[14px] text-zinc-900 dark:text-zinc-100 group-hover:underline truncate">
                      {profile.username || 'user'}
                    </span>
                    <span className="text-[12px] text-zinc-500 truncate">
                      Suggested for you
                    </span>
                  </div>
                </Link>
                <button
                  onClick={() => handleFollow(profile.id)}
                  className="text-[12px] font-bold text-sky-500 hover:text-zinc-900 dark:hover:text-white transition-colors ml-2"
                >
                  Follow
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Advertisement */}
      <div className="mt-4">
        <div className="flex items-center justify-between mb-2 px-1">
          <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Sponsored</span>
        </div>
        <div className="w-full h-[200px] bg-zinc-50 dark:bg-zinc-900/50 rounded-xl overflow-hidden border border-zinc-100 dark:border-zinc-800 flex items-center justify-center p-4">
          <SidebarAd />
        </div>
      </div>

      {/* Footer */}
      <div className="mt-8 px-1">
        <div className="flex flex-wrap gap-x-2 gap-y-1 mb-4">
          {['About', 'Help', 'Press', 'API', 'Jobs', 'Privacy', 'Terms', 'Locations', 'Language', 'Meta Verified'].map(item => (
            <Link key={item} href={`/${item.toLowerCase()}`} className="text-zinc-400 text-[12px] hover:underline whitespace-nowrap">
              {item}
            </Link>
          ))}
        </div>
        <p className="text-zinc-400 text-[12px] uppercase font-medium">
          © {new Date().getFullYear()} JPM FROM LOCALHOST
        </p>
      </div>
    </aside>
  )

  // ─── LOGGED OUT VIEW ──────────────────────────────────────────────────
  return (
    <aside className={mobile 
      ? "flex flex-col gap-4 w-full flex-none pb-6"
      : "hidden lg:flex flex-col gap-4 w-[320px] flex-none pt-8 sticky top-0 pb-6 px-4"
    }>
      {/* Auth Card */}
      <div className="bg-white dark:bg-zinc-950 rounded-2xl border border-zinc-100 dark:border-zinc-900 p-6 space-y-5 shadow-sm">
        <div className="space-y-2">
          <div className="font-black text-[22px] tracking-tight text-black dark:text-white leading-tight">Join JPM today</div>
          <p className="text-zinc-500 text-[14px] leading-relaxed">
            {mode === 'login' ? "Log in to see what's happening right now." : "Join today. Share memes, connect with others."}
          </p>
        </div>

        <form onSubmit={handleInlineAuth} className="space-y-3">
          {authError && (
            <div className="bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 p-3 rounded-xl text-xs font-medium border border-red-100 dark:border-red-900">
              {authError}
            </div>
          )}
          <div className="space-y-2">
            {mode === 'signup' && (
              <>
                <input type="text" placeholder="Full Name" required className="w-full px-4 py-2 bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-lg outline-none text-sm focus:border-zinc-300 dark:focus:border-zinc-600 transition-all" value={fullName} onChange={(e) => setFullName(e.target.value)} />
                <input type="text" placeholder="Username" required className="w-full px-4 py-2 bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-lg outline-none text-sm focus:border-zinc-300 dark:focus:border-zinc-600 transition-all" value={username} onChange={(e) => setUsername(e.target.value)} />
              </>
            )}
            <input type="email" placeholder="Email" required className="w-full px-4 py-2 bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-lg outline-none text-sm focus:border-zinc-300 dark:focus:border-zinc-600 transition-all" value={email} onChange={(e) => setEmail(e.target.value)} />
            <input type="password" placeholder="Password" required className="w-full px-4 py-2 bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-lg outline-none text-sm focus:border-zinc-300 dark:focus:border-zinc-600 transition-all" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <button type="submit" disabled={authLoadingState} className="w-full bg-sky-500 hover:bg-sky-600 text-white py-2 rounded-lg font-bold text-[14px] transition-all active:scale-[0.98] disabled:opacity-50 mt-2 shadow-sm shadow-sky-500/20">
            {authLoadingState ? 'Processing...' : (mode === 'login' ? 'Log in' : 'Sign up')}
          </button>
        </form>

        <div className="pt-4 text-center border-t border-zinc-100 dark:border-zinc-900">
          <p className="text-zinc-500 text-xs">
            {mode === 'login' ? "New here?" : "Already have an account?"}{' '}
            <button onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setAuthError(null) }} className="text-sky-500 font-bold hover:underline ml-1">
              {mode === 'login' ? 'Sign up' : 'Log in'}
            </button>
          </p>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-6 px-1">
        <div className="flex flex-wrap gap-x-2 gap-y-1 mb-4">
          {['About', 'Help', 'Press', 'API', 'Jobs', 'Privacy', 'Terms', 'Locations', 'Language', 'Meta Verified'].map(item => (
            <Link key={item} href={`/${item.toLowerCase()}`} className="text-zinc-400 text-[12px] hover:underline whitespace-nowrap">
              {item}
            </Link>
          ))}
        </div>
        <p className="text-zinc-400 text-[12px] uppercase font-medium">
          © {new Date().getFullYear()} JPM FROM LOCALHOST
        </p>
      </div>
    </aside>
  )

}
