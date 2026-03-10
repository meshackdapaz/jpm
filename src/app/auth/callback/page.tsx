'use client'

import { useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

function AuthCallbackContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  useEffect(() => {
    const handleAuth = async () => {
      const code = searchParams.get('code')
      const next = searchParams.get('next') ?? '/'

      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code)
        if (!error) {
          router.push(next)
          return
        }
      }

      // If there's an error or no code, redirect to error page or home
      router.push('/auth/auth-code-error')
    }

    handleAuth()
  }, [searchParams, router, supabase.auth])

  return (
    <div className="flex items-center justify-center min-h-screen bg-white dark:bg-[#101010]">
      <div className="flex flex-col items-center gap-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black dark:border-white"></div>
        <p className="text-zinc-500 font-medium">Authenticating...</p>
      </div>
    </div>
  )
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen bg-white dark:bg-[#101010]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black dark:border-white"></div>
      </div>
    }>
      <AuthCallbackContent />
    </Suspense>
  )
}
