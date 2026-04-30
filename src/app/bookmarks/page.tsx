'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { AppLayout } from '@/components/AppLayout'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/components/AuthProvider'
import { Post } from '@/components/Post'
import { ArchiveBoxIcon as BookmarkIcon } from '@heroicons/react/24/outline'
import { ArchiveBoxIcon as BookmarkSolid } from '@heroicons/react/24/solid'

function PostSkeleton() {
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
          <div className="h-32 bg-zinc-200 dark:bg-zinc-800 rounded-xl w-full" />
        </div>
      </div>
    </div>
  )
}

const POST_SEL = `id, content, image_url, image_urls, video_url, title, created_at, creator_id, view_count, hide_counts, is_archived, settings, quoted_post_id, is_ghost, expires_at, quoted_post:quoted_post_id(id, content, profiles:creator_id(id, username, full_name, avatar_url)), profiles:creator_id(id, full_name, username, avatar_url, is_verified, last_seen, settings, fcm_token), likes(count), comments(count), reposts(count)`

export default function BookmarksPage() {
  const { user, loading: authLoading } = useAuth()
  const supabase = createClient()
  const [posts, setPosts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const fetchBookmarks = useCallback(async () => {
    if (!user) return
    setLoading(true)

    const { data: bookmarkData } = await supabase
      .from('bookmarks')
      .select(`post:post_id(${POST_SEL})`)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (bookmarkData) {
      const [{ data: myLikes }, { data: myReposts }] = await Promise.all([
        supabase.from('likes').select('post_id, reaction_type').eq('user_id', user.id),
        supabase.from('reposts').select('post_id').eq('user_id', user.id),
      ])

      const likedIds = new Set((myLikes || []).map((l: any) => l.post_id))
      const repostedIds = new Set((myReposts || []).map((r: any) => r.post_id))
      const getReaction = (id: string) => (myLikes || []).find((l: any) => l.post_id === id)?.reaction_type || 'like'

      const formatted = bookmarkData
        .map((b: any) => {
          const p = Array.isArray(b.post) ? b.post[0] : b.post
          if (!p) return null
          return {
            ...p,
            is_repost: false,
            likes_count: p.likes?.[0]?.count || 0,
            comments_count: p.comments?.[0]?.count || 0,
            reposts_count: p.reposts?.[0]?.count || 0,
            is_liked_by_me: likedIds.has(p.id),
            is_reposted_by_me: repostedIds.has(p.id),
            my_reaction: getReaction(p.id),
          }
        })
        .filter(Boolean)

      setPosts(formatted)
    }
    setLoading(false)
  }, [user])

  useEffect(() => {
    if (!authLoading) fetchBookmarks()
  }, [authLoading, fetchBookmarks])

  return (
    <AppLayout>
      <div className="max-w-xl mx-auto">
        {/* Header */}
        <div className="sticky top-0 z-30 bg-white/80 dark:bg-black/80 backdrop-blur-md border-b border-zinc-100 dark:border-zinc-900 px-4 py-4 flex items-center gap-3">
          <BookmarkSolid className="w-6 h-6 text-zinc-900 dark:text-white" />
          <h1 className="text-[22px] font-black tracking-tight">Archive</h1>
          <span className="ml-auto text-sm text-zinc-400 font-semibold">{posts.length} saved</span>
        </div>

        {/* Loading */}
        {(loading || authLoading) && (
          <div>{[1, 2, 3].map(i => <PostSkeleton key={i} />)}</div>
        )}

        {/* Empty */}
        {!loading && !authLoading && posts.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 gap-5 px-8 text-center">
            <div className="w-20 h-20 rounded-full bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center">
              <BookmarkIcon className="w-9 h-9 text-zinc-300 dark:text-zinc-700" />
            </div>
            <div>
              <p className="font-black text-lg text-zinc-700 dark:text-zinc-300">No archived posts yet</p>
              <p className="text-sm text-zinc-400 mt-1 max-w-xs">
                Tap the archive icon on any post to save it here for later.
              </p>
            </div>
          </div>
        )}

        {/* Posts */}
        {!loading && posts.map(post => (
          <Post key={post.id} post={post} />
        ))}

        <div className="h-28 sm:h-8" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }} />
      </div>
    </AppLayout>
  )
}
