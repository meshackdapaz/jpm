'use client'

import React, { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (authError) {
      setError(authError.message)
      setLoading(false)
    } else {
      router.push('/')
      router.refresh()
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center pt-[15vh] pb-24 bg-white dark:bg-black relative">
      {/* Decorative Background Rings */}
      <div className="absolute inset-0 z-0 pointer-events-none select-none overflow-hidden fixed">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] border-[1.5px] border-black/10 dark:border-white/10 rounded-full">
          <div className="absolute inset-[10%] border-[1.5px] border-black/10 dark:border-white/10 rounded-full" />
        </div>
        <div className="absolute bottom-[-15%] right-[-5%] w-[50%] h-[50%] border-[1.5px] border-black/10 dark:border-white/10 rounded-full">
          <div className="absolute inset-[15%] border-[1.5px] border-black/10 dark:border-white/10 rounded-full" />
        </div>
        <div className="absolute top-[20%] right-[-10%] w-[30%] h-[30%] border-[1.5px] border-black/10 dark:border-white/10 rounded-full opacity-50" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[40vh] font-black text-black dark:text-white opacity-[0.02] select-none pointer-events-none uppercase tracking-tighter">
          JPM
        </div>
      </div>

      <div className="w-full max-w-[380px] space-y-8 p-6 relative z-10">
        {/* Logo */}
        <div className="text-center space-y-4">
          <div className="flex justify-center pb-2">
            <span className="text-3xl font-black tracking-tighter text-black dark:text-white hover:scale-105 transition-transform duration-500 cursor-default">
              JPM
            </span>
          </div>
          <h1 className="text-[17px] font-bold tracking-tight text-zinc-900 dark:text-white">
            Log in with your JPM account
          </h1>
        </div>

        {/* Form */}
        <form className="space-y-3" onSubmit={handleLogin}>
          {error && (
            <div className="bg-red-50 dark:bg-red-950/30 text-red-600 p-3 rounded-xl text-xs font-medium border border-red-100 dark:border-red-900">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <input
              id="login-email"
              type="email"
              required
              autoComplete="email"
              placeholder="Email address"
              className="w-full p-4 bg-zinc-100 dark:bg-zinc-900/50 border border-transparent dark:border-zinc-800 rounded-2xl focus:bg-white dark:focus:bg-zinc-900 focus:ring-1 focus:ring-zinc-300 dark:focus:ring-zinc-700 outline-none transition-all placeholder-zinc-400 dark:placeholder-zinc-600 text-[15px]"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <input
              id="login-password"
              type="password"
              required
              autoComplete="current-password"
              placeholder="Password"
              className="w-full p-4 bg-zinc-100 dark:bg-zinc-900/50 border border-transparent dark:border-zinc-800 rounded-2xl focus:bg-white dark:focus:bg-zinc-900 focus:ring-1 focus:ring-zinc-300 dark:focus:ring-zinc-700 outline-none transition-all placeholder-zinc-400 dark:placeholder-zinc-600 text-[15px]"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <div className="flex justify-end px-1">
              <Link
                href="/forgot-password"
                className="text-[13px] font-medium text-zinc-500 hover:text-black dark:hover:text-white transition-colors"
              >
                Forgot your password?
              </Link>
            </div>
          </div>

          <button
            id="login-submit"
            type="submit"
            disabled={loading}
            className="w-full bg-black dark:bg-white text-white dark:text-black p-4 rounded-2xl font-bold transition-all active:scale-[0.98] disabled:opacity-50 mt-2 text-[15px] shadow-lg shadow-black/5 dark:shadow-white/5 hover:opacity-90"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-zinc-400 border-t-current rounded-full animate-spin" />
                Logging in...
              </span>
            ) : (
              'Log in'
            )}
          </button>
        </form>

        {/* Footer Links */}
        <div className="text-center space-y-4 pt-2">
          <Link
            href="/forgot-password"
            className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 text-xs transition-colors"
          >
            Forgotten password?
          </Link>

          <div className="pt-6 border-t border-zinc-100 dark:border-zinc-900">
            <p className="text-zinc-500 text-sm">
              Don&apos;t have an account?{' '}
              <Link href="/signup" className="text-black dark:text-white font-bold hover:underline underline-offset-4">
                Sign up
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
