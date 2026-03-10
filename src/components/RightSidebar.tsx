'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from './AuthProvider'
import { VerifiedBadge } from './VerifiedBadge'

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
        .limit(5)
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
        .limit(5)

      if (data) setSuggested(data as SuggestedUser[])
    }
    fetchSuggested()
  }, [user])

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

  if (authLoading) return null

  // ─── LOGGED IN VIEW ───────────────────────────────────────────────────
  if (user) return (
    <aside className={mobile 
      ? "flex flex-col gap-4 w-full flex-none pb-6" 
      : "hidden lg:flex flex-col gap-4 w-[300px] xl:w-[340px] flex-none pt-6 sticky top-0 max-h-screen overflow-y-auto pb-6 scroll-smooth"
    }>

      {/* What's Going On */}
      <div className="rounded-2xl overflow-hidden border border-zinc-100 dark:border-zinc-800/80 bg-white dark:bg-[#111] shadow-sm">
        <div className="px-5 pt-4 pb-3 border-b border-zinc-100 dark:border-zinc-800/60">
          <h2 className="font-black text-[15px] tracking-tight">What&apos;s going on</h2>
        </div>
        {trending.length === 0 && (
          <div className="px-5 py-6 text-center text-zinc-400 text-sm">No trending posts yet</div>
        )}
        <div className="divide-y divide-zinc-50 dark:divide-zinc-800/40">
          {trending.map((post: TrendingPost, i: number) => (
            <div key={post.id} className="flex gap-3 px-5 py-3.5 hover:bg-zinc-50/80 dark:hover:bg-zinc-800/30 transition-colors cursor-pointer">
              <span className="flex-none text-[11px] font-black text-zinc-300 dark:text-zinc-700 w-4 pt-0.5">{i + 1}</span>
              <Link href={`/profile?id=${post.creator_id}`} className="flex-none hover:opacity-80 transition-opacity">
                {post.profiles?.avatar_url ? (
                  <Image src={post.profiles.avatar_url} alt="User" width={32} height={32} className="rounded-full object-cover w-8 h-8" unoptimized />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center text-xs font-bold text-zinc-500">
                    {(post.profiles?.full_name || '?')[0].toUpperCase()}
                  </div>
                )}
              </Link>
              <div className="flex-1 min-w-0">
                <Link href={`/profile?id=${post.creator_id}`} className="font-semibold text-[13px] text-zinc-900 dark:text-zinc-100 truncate hover:underline block">
                  {post.profiles?.full_name || post.profiles?.username || 'User'}
                </Link>
                <p className="text-zinc-500 dark:text-zinc-400 text-[12px] leading-snug line-clamp-2 mt-0.5">{post.content || post.title}</p>
                <p className="text-zinc-400 text-[11px] mt-1 font-medium">{(post.view_count ?? 0).toLocaleString()} views</p>
              </div>
              {post.image_url && (
                <Link href={`/#post-${post.id}`} className="flex-none w-11 h-11 rounded-xl overflow-hidden bg-zinc-100 dark:bg-zinc-800 hover:opacity-90 transition-opacity">
                  <Image src={post.image_url} alt="Thumb" width={44} height={44} className="w-full h-full object-cover" unoptimized />
                </Link>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Who to Follow */}
      {suggested.length > 0 && (
        <div className="rounded-2xl overflow-hidden border border-zinc-100 dark:border-zinc-800/80 bg-white dark:bg-[#111] shadow-sm">
          <div className="px-5 pt-4 pb-3 border-b border-zinc-100 dark:border-zinc-800/60">
            <h2 className="font-black text-[15px] tracking-tight">Who to follow</h2>
          </div>
          <div className="divide-y divide-zinc-50 dark:divide-zinc-800/40">
            {suggested.map((profile: SuggestedUser) => (
              <div key={profile.id} className="flex items-center gap-3 px-5 py-3.5 hover:bg-zinc-50/80 dark:hover:bg-zinc-800/30 transition-colors">
                <Link href={`/profile?id=${profile.id}`} className="flex-none hover:opacity-85 transition-opacity">
                  {profile.avatar_url ? (
                    <Image src={profile.avatar_url} alt="User" width={36} height={36} className="rounded-full w-9 h-9 object-cover ring-2 ring-transparent hover:ring-zinc-300 dark:hover:ring-zinc-600 transition-all" unoptimized />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center text-sm font-black text-zinc-500">
                      {(profile.full_name || profile.username || '?')[0].toUpperCase()}
                    </div>
                  )}
                </Link>
                <div className="flex-1 min-w-0">
                  <Link href={`/profile?id=${profile.id}`} className="font-semibold text-[13px] text-zinc-900 dark:text-zinc-100 hover:underline flex items-center gap-1 truncate">
                    {profile.full_name || profile.username || 'User'}
                    {profile.is_verified && <VerifiedBadge className="w-3.5 h-3.5 flex-none" />}
                  </Link>
                  <p className="text-zinc-400 text-[12px] truncate">@{profile.username}</p>
                </div>
                <button
                  onClick={() => handleFollow(profile.id)}
                  className="flex-none px-3.5 py-1.5 bg-black dark:bg-white text-white dark:text-black text-[12px] font-bold rounded-full hover:opacity-80 transition-all btn-press"
                >Follow</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="px-1">
        <p className="text-zinc-400 text-[11px] leading-relaxed">
          © {new Date().getFullYear()} <span className="font-black text-zinc-600 dark:text-zinc-400">dapazcm</span> ·{' '}
          <Link href="/settings" className="hover:underline hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors">Privacy</Link> ·{' '}
          <Link href="/settings" className="hover:underline hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors">Terms</Link>
        </p>
      </div>
    </aside>
  )

  // ─── LOGGED OUT VIEW ──────────────────────────────────────────────────
  return (
    <aside className={mobile 
      ? "flex flex-col gap-4 w-full flex-none pb-6"
      : "hidden lg:flex flex-col gap-4 w-[300px] xl:w-[340px] flex-none pt-6 sticky top-0 max-h-screen overflow-y-auto pb-6 scroll-smooth"
    }>

      {/* Auth Card */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5 space-y-4 shadow-sm">
        <div className="space-y-1">
          <div className="font-black text-2xl tracking-tighter text-black dark:text-white">JPM</div>
          <p className="text-zinc-500 text-sm leading-relaxed">
            {mode === 'login' ? "Log in to JPM to see what's happening right now." : "Join JPM today. Share memes, connect with others."}
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
                <input type="text" placeholder="Full Name" required className="w-full px-4 py-2.5 bg-zinc-100 dark:bg-zinc-800 rounded-xl outline-none text-sm focus:ring-1 focus:ring-zinc-300 dark:focus:ring-zinc-600 transition-all" value={fullName} onChange={(e) => setFullName(e.target.value)} />
                <input type="text" placeholder="Username" required className="w-full px-4 py-2.5 bg-zinc-100 dark:bg-zinc-800 rounded-xl outline-none text-sm focus:ring-1 focus:ring-zinc-300 dark:focus:ring-zinc-600 transition-all" value={username} onChange={(e) => setUsername(e.target.value)} />
              </>
            )}
            <input type="email" placeholder="Email" required className="w-full px-4 py-2.5 bg-zinc-100 dark:bg-zinc-800 rounded-xl outline-none text-sm focus:ring-1 focus:ring-zinc-300 dark:focus:ring-zinc-600 transition-all" value={email} onChange={(e) => setEmail(e.target.value)} />
            <input type="password" placeholder="Password" required className="w-full px-4 py-2.5 bg-zinc-100 dark:bg-zinc-800 rounded-xl outline-none text-sm focus:ring-1 focus:ring-zinc-300 dark:focus:ring-zinc-600 transition-all" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <button type="submit" disabled={authLoadingState} className="w-full bg-black dark:bg-white text-white dark:text-black py-2.5 rounded-xl font-bold text-sm hover:opacity-90 transition-all active:scale-[0.98] disabled:opacity-50">
            {authLoadingState ? 'Processing...' : (mode === 'login' ? 'Log in' : 'Sign up')}
          </button>
        </form>

        <div className="pt-2 text-center border-t border-zinc-100 dark:border-zinc-800">
          <p className="text-zinc-500 text-xs">
            {mode === 'login' ? "New to JPM?" : "Already have an account?"}{' '}
            <button onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setAuthError(null) }} className="text-black dark:text-white font-bold hover:underline ml-1">
              {mode === 'login' ? 'Sign up' : 'Log in'}
            </button>
          </p>
        </div>
      </div>

      {/* Trending for logged-out users too */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
        <div className="px-5 py-4 border-b border-zinc-100 dark:border-zinc-800">
          <h2 className="font-bold text-[15px]">What&apos;s going on</h2>
        </div>
        <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
          {trending.length === 0 && (
            <div className="px-5 py-6 text-center text-zinc-400 text-sm">No trending posts yet</div>
          )}
          {trending.map((post: TrendingPost) => (
            <div key={post.id} className="flex flex-col px-5 py-3.5 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
              <div className="flex gap-3">
                <Link href={`/profile?id=${post.creator_id}`} className="flex-none hover:opacity-80">
                  {post.profiles?.avatar_url ? (
                    <Image src={post.profiles.avatar_url} alt={post.profiles.username || 'User'} width={36} height={36} className="rounded-full object-cover w-9 h-9" unoptimized />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center text-sm font-bold text-zinc-500">
                      {(post.profiles?.full_name || post.profiles?.username || '?')[0].toUpperCase()}
                    </div>
                  )}
                </Link>
                <div className="flex-1 min-w-0">
                  <Link href={`/profile?id=${post.creator_id}`} className="font-semibold text-sm text-zinc-900 dark:text-white truncate hover:underline block">
                    {post.profiles?.full_name || post.profiles?.username || 'User'}
                  </Link>
                  <p className="text-zinc-600 dark:text-zinc-400 text-xs leading-snug line-clamp-2">{post.content || post.title}</p>
                  <p className="text-zinc-400 text-[11px] mt-1">{post.view_count ?? 0} views</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="px-1">
        <p className="text-zinc-400 text-[11px] leading-relaxed">
          © {new Date().getFullYear()} dapazcm ·{' '}
          <Link href="/login" className="hover:underline">Privacy</Link> ·{' '}
          <Link href="/login" className="hover:underline">Terms</Link>
        </p>
      </div>
    </aside>
  )
}
