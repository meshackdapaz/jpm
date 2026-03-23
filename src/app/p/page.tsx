'use client'

import React, { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { AppLayout } from '@/components/AppLayout'
import { Post } from '@/components/Post'
import { RightSidebar } from '@/components/RightSidebar'
import { ChevronLeftIcon } from '@heroicons/react/24/outline'
import { useRouter } from 'next/navigation'

function PostDetailContent() {
  const searchParams = useSearchParams()
  const id = searchParams.get('id')
  const router = useRouter()
  const [post, setPost] = React.useState<any>(null)
  const [loading, setLoading] = React.useState(true)
  const supabase = createClient()

  React.useEffect(() => {
    if (id) {
      fetchPost()
    }
  }, [id])

  async function fetchPost() {
    setLoading(true)
    const { data, error } = await supabase
      .from('posts')
      .select('*, profiles:creator_id(*)')
      .eq('id', id)
      .single()

    if (!error && data) {
      setPost(data)
    }
    setLoading(false)
  }

  return (
    <div className="flex w-full max-w-[1400px] mx-auto min-h-screen bg-white dark:bg-black">
      {/* Main Content */}
      <div className="flex-1 min-w-0 border-r border-zinc-100 dark:border-zinc-900">
        {/* Header */}
        <div className="sticky top-0 z-20 bg-white/80 dark:bg-black/80 backdrop-blur-md border-b border-zinc-100 dark:border-zinc-900 px-4 py-3 flex items-center gap-4">
          <button 
            onClick={() => router.back()}
            className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors"
          >
            <ChevronLeftIcon className="w-5 h-5 stroke-[2.5]" />
          </button>
          <h1 className="font-black text-xl tracking-tight">Post</h1>
        </div>

        <div className="p-4">
          {loading ? (
            <div className="space-y-4">
              <div className="h-12 w-12 bg-zinc-100 dark:bg-zinc-800 rounded-full animate-pulse" />
              <div className="h-4 w-3/4 bg-zinc-100 dark:bg-zinc-800 rounded animate-pulse" />
              <div className="h-64 w-full bg-zinc-100 dark:bg-zinc-800 rounded-3xl animate-pulse" />
            </div>
          ) : post ? (
            <Post post={post} />
          ) : (
            <div className="py-20 text-center">
              <p className="text-zinc-500 font-bold">This post is no longer available.</p>
              <button 
                onClick={() => router.push('/')}
                className="mt-4 text-blue-500 font-bold hover:underline"
              >
                Back to Home
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Right Sidebar */}
      <div className="hidden lg:block w-[340px] xl:w-[380px] p-6 sticky top-0 h-screen">
        <RightSidebar />
      </div>
    </div>
  )
}

export default function PostPage() {
  return (
    <AppLayout>
      <Suspense fallback={<div className="p-8 text-center">Loading...</div>}>
        <PostDetailContent />
      </Suspense>
    </AppLayout>
  )
}
