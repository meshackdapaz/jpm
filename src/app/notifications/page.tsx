'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { AppLayout } from '@/components/AppLayout'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/components/AuthProvider'
import Image from 'next/image'
import Link from 'next/link'
import { BellIcon, UserPlusIcon } from '@heroicons/react/24/solid'
import { createClient as supabaseClient } from '@/lib/supabase/client'

// ── Helpers ───────────────────────────────────────────────────────────────────

function timeAgo(dateStr: string) {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`
  if (diff < 604800) return `${Math.floor(diff / 86400)}d`
  return new Date(dateStr).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

// ── Avatar ───────────────────────────────────────────────────────────────────

function Avatar({ actor }: { actor: any }) {
  if (actor?.avatar_url) {
    return (
      <Image src={actor.avatar_url} alt={actor.full_name || 'User'} width={44} height={44}
        className="w-11 h-11 rounded-full object-cover flex-none" unoptimized />
    )
  }
  return (
    <div className="w-11 h-11 rounded-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center font-bold text-zinc-500 text-base flex-none">
      {(actor?.full_name || actor?.username || 'U')[0].toUpperCase()}
    </div>
  )
}

function Skeleton() {
  return (
    <div className="flex items-center gap-3 px-4 py-4 animate-pulse">
      <div className="w-11 h-11 rounded-full bg-zinc-100 dark:bg-zinc-800 flex-none" />
      <div className="flex-grow space-y-2">
        <div className="h-3.5 bg-zinc-100 dark:bg-zinc-800 rounded-full w-2/3" />
        <div className="h-3 bg-zinc-100 dark:bg-zinc-800 rounded-full w-1/3" />
      </div>
    </div>
  )
}

// ── Notification type helpers ─────────────────────────────────────────────────

function getAction(type: string) {
  switch (type) {
    case 'like':    return 'liked your post'
    case 'comment': return 'commented on your post'
    case 'follow':  return 'followed you'
    case 'mention': return 'mentioned you'
    case 'message': return 'sent you a message'
    default:        return 'interacted with you'
  }
}

// Threads-style filter tabs: All | Follows | Conversations
const FILTERS = ['All', 'Follows', 'Conversations'] as const
type Filter = typeof FILTERS[number]

// ── Page ─────────────────────────────────────────────────────────────────────

export default function NotificationsPage() {
  const { user, loading: authLoading } = useAuth()
  const [notifications, setNotifications] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<Filter>('All')
  const [followStates, setFollowStates] = useState<Record<string, boolean>>({})
  const supabase = createClient()

  const fetchNotifications = useCallback(async () => {
    if (!user) return
    setLoading(true)
    const { data } = await supabase
      .from('notifications')
      .select(`*, actor:profiles!notifications_actor_id_profiles_fkey(id, full_name, username, avatar_url)`)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(80)
    if (data) setNotifications(data)
    setLoading(false)
  }, [user])

  // Check follow-back state for each actor
  const checkFollowStates = useCallback(async (notifs: any[]) => {
    if (!user) return
    const actorIds = [...new Set(notifs.filter(n => n.type === 'follow').map(n => n.actor_id))]
    if (!actorIds.length) return
    const { data } = await supabase
      .from('follows')
      .select('following_id')
      .eq('follower_id', user.id)
      .in('following_id', actorIds)
    const followedIds = new Set((data || []).map((f: any) => f.following_id))
    const states: Record<string, boolean> = {}
    actorIds.forEach(id => { states[id] = followedIds.has(id) })
    setFollowStates(states)
  }, [user])

  const toggleFollow = async (actorId: string) => {
    if (!user) return
    const isFollowing = followStates[actorId]
    setFollowStates(prev => ({ ...prev, [actorId]: !isFollowing }))
    if (isFollowing) {
      await supabase.from('follows').delete().eq('follower_id', user.id).eq('following_id', actorId)
    } else {
      await supabase.from('follows').insert({ follower_id: user.id, following_id: actorId })
    }
  }

  const markAllRead = useCallback(async () => {
    if (!user) return
    await supabase.from('notifications').update({ read: true }).eq('user_id', user.id).eq('read', false)
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
  }, [user])

  useEffect(() => {
    if (authLoading) return
    if (!user) { setLoading(false); return }
    fetchNotifications().then(() => {})
    const t = setTimeout(markAllRead, 1800)
    const ch = supabase
      .channel(`notifs:${user.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
        () => fetchNotifications())
      .subscribe()
    return () => { clearTimeout(t); supabase.removeChannel(ch) }
  }, [user, authLoading])

  useEffect(() => {
    if (notifications.length) checkFollowStates(notifications)
  }, [notifications])

  // Apply filter
  const visible = (() => {
    if (filter === 'Follows') return notifications.filter(n => n.type === 'follow')
    if (filter === 'Conversations') return notifications.filter(n => n.type === 'message' || n.type === 'comment')
    return notifications
  })()

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto">

        {/* ── Header — Threads "Activity" style ── */}
        <div className="sticky top-0 z-30 bg-white dark:bg-black border-b border-zinc-100 dark:border-zinc-900">
          <div className="px-4 pt-3 pb-3">
            <h1 className="text-[28px] font-black tracking-tight text-black dark:text-white">Activity</h1>
          </div>

          {/* Filter pills — All | Follows | Conversations */}
          <div className="flex items-center gap-2 px-4 pb-3 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
            {FILTERS.map(f => {
              const active = filter === f
              return (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`flex-none px-4 py-1.5 rounded-full text-[14px] font-semibold border transition-all ${
                    active
                      ? 'bg-black dark:bg-white text-white dark:text-black border-black dark:border-white'
                      : 'bg-transparent text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700 hover:border-zinc-400'
                  }`}
                >
                  {f}
                </button>
              )
            })}
          </div>
        </div>

        {/* ── Loading ── */}
        {(authLoading || loading) && (
          <div>{[1, 2, 3, 4, 5].map(i => <Skeleton key={i} />)}</div>
        )}

        {/* ── Empty state ── */}
        {!loading && !authLoading && visible.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 gap-4 px-8 text-center">
            <div className="w-20 h-20 rounded-full bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center">
              <BellIcon className="w-9 h-9 text-zinc-300 dark:text-zinc-700" />
            </div>
            <div>
              <p className="font-bold text-base text-zinc-600 dark:text-zinc-400 mb-1">No activity yet</p>
              <p className="text-sm text-zinc-400">
                {filter === 'All'
                  ? 'When people interact with you, you\'ll see it here.'
                  : `No ${filter.toLowerCase()} activity yet.`}
              </p>
            </div>
          </div>
        )}

        {/* ── Notification rows ── */}
        {!loading && !authLoading && visible.map(notif => {
          const actorName = notif.actor?.username || notif.actor?.full_name || 'Someone'
          const isFollow = notif.type === 'follow'
          const isFollowingBack = followStates[notif.actor_id]

          return (
            <div
              key={notif.id}
              className="flex items-center gap-3 px-4 py-3.5 border-b border-zinc-50 dark:border-zinc-900/50 hover:bg-zinc-50/50 dark:hover:bg-zinc-950/40 transition-colors"
            >
              {/* Avatar */}
              <Link href={`/profile?id=${notif.actor_id}`} className="flex-none relative">
                <Avatar actor={notif.actor} />
                {/* Tiny verified indicator for follow notifs */}
                {isFollow && (
                  <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-blue-500 rounded-full border-2 border-white dark:border-black flex items-center justify-center">
                    <UserPlusIcon className="w-2 h-2 text-white" />
                  </span>
                )}
              </Link>

              {/* Text */}
              <div className="flex-grow min-w-0">
                <p className="text-[14px] leading-snug text-zinc-900 dark:text-zinc-100 break-words">
                  <Link href={`/profile?id=${notif.actor_id}`} className="font-bold hover:underline">
                    {actorName}
                  </Link>
                  {' '}
                  <span className="text-zinc-500 dark:text-zinc-400 font-normal">
                    {notif.type === 'follow' ? 'followed you' : getAction(notif.type)}
                  </span>
                </p>
                <p className="text-[12px] text-zinc-400 mt-0.5">{timeAgo(notif.created_at)}</p>
              </div>

              {/* Follow action button — only for follow notifications */}
              {isFollow && notif.actor_id !== user?.id && (
                <button
                  onClick={() => toggleFollow(notif.actor_id)}
                  className={`flex-none px-4 py-1.5 rounded-xl text-[13px] font-bold transition-all ${
                    isFollowingBack
                      ? 'border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 bg-transparent'
                      : 'bg-black dark:bg-white text-white dark:text-black'
                  }`}
                >
                  {isFollowingBack ? 'Following' : 'Follow back'}
                </button>
              )}

              {/* Unread dot */}
              {!notif.read && (
                <div className="flex-none w-2 h-2 rounded-full bg-zinc-900 dark:bg-white ml-1" />
              )}
            </div>
          )
        })}

        {/* Bottom spacer */}
        <div className="h-28 sm:h-8" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }} />
      </div>
    </AppLayout>
  )
}
