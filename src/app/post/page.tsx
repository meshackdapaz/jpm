'use client'

import { useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

function PostRedirectContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const id = searchParams.get('id')

  useEffect(() => {
    if (id) {
      router.replace(`/p?id=${id}`)
    } else {
      router.replace('/')
    }
  }, [id, router])

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-pulse text-zinc-500 font-medium">Redirecting to post...</div>
    </div>
  )
}

export default function PostRedirect() {
  return (
    <Suspense fallback={null}>
      <PostRedirectContent />
    </Suspense>
  )
}
