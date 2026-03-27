'use client'

import React, { useEffect, useState } from 'react'
import { AppLayout } from '@/components/AppLayout'
import { useI18n } from '@/lib/i18n'
import { createClient } from '@/lib/supabase/client'
import { Post } from '@/components/Post'

export default function TrendingPage() {
  const { t } = useI18n()
  const [posts, setPosts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function fetchTrending() {
      // Fetch posts with their interaction counts, sorted by view_count
      const { data, error } = await supabase
        .from('posts')
        .select(`
          *,
          profiles(*),
          likes(count),
          comments(count),
          reposts(count)
        `)
        .order('view_count', { ascending: false })
        .limit(20)

      if (data) {
        // Map the data to include pre-calculated counts
        const enrichedPosts = data.map((p: any) => ({
          ...p,
          likes_count: p.likes?.[0]?.count || 0,
          comments_count: p.comments?.[0]?.count || 0,
          reposts_count: p.reposts?.[0]?.count || 0
        }))
        setPosts(enrichedPosts)
      }
      setLoading(false)
    }

    fetchTrending()
  }, [])

  return (
    <AppLayout>
      <div className="p-4 border-b border-zinc-200 dark:border-zinc-800">
        <h1 className="text-xl font-bold">{t('trending')}</h1>
      </div>
      
      {loading ? (
        <div className="p-8 text-center text-zinc-500 italic">
          Finding what's happening...
        </div>
      ) : posts.length === 0 ? (
        <div className="p-8 text-center text-zinc-500 italic">
          No trending threads yet today.
        </div>
      ) : (
        <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
          {posts.map((post: any) => (
            <Post key={post.id} post={post} />
          ))}
        </div>
      )}
    </AppLayout>
  )
}
