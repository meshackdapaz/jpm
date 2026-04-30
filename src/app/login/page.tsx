'use client'

import React, { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
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
        </div>
      </div>

      <div className="w-full max-w-[380px] space-y-8 p-6 relative z-10">
        {/* Logo */}
        <div className="text-center space-y-4">
          <div className="flex justify-center pb-2">
            <svg className="w-12 h-12 text-black dark:text-white" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
              <path d="M12.001 2C6.475 2 2 6.476 2 12s4.475 10 10.001 10C17.522 22 22 17.524 22 12S17.522 2 12.001 2zM12 20c-4.41 0-8-3.589-8-8s3.59-8 8-8 8 3.589 8 8-3.59 8-8 8zm4.5-8c0 2.485-2.015 4.5-4.5 4.5S7.5 14.485 7.5 12s2.015-4.5 4.5-4.5 4.5 2.015 4.5 4.5zm1.5 0c0-3.313-2.687-6-6-6S6 8.687 6 12s2.687 6 6 6c1.293 0 2.49-.409 3.471-1.103l-.985-1.459A4.468 4.468 0 0112 16.5c-2.485 0-4.5-2.015-4.5-4.5S9.515 7.5 12 7.5s4.5 2.015 4.5 4.5v1.125c0 .621-.503 1.125-1.125 1.125S14.25 13.746 14.25 13.125V12c0-1.24-1.01-2.25-2.25-2.25S9.75 10.76 9.75 12s1.01 2.25 2.25 2.25c.655 0 1.24-.28 1.657-.726A2.614 2.614 0 0016.5 13.125V12z"/>
            </svg>
          </div>
          <h1 className="text-[17px] font-bold tracking-tight text-zinc-900 dark:text-white">
            Log in to your account
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
            <div className="relative">
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                required
                autoComplete="current-password"
                placeholder="Password"
                className="w-full p-4 bg-zinc-100 dark:bg-zinc-900/50 border border-transparent dark:border-zinc-800 rounded-2xl focus:bg-white dark:focus:bg-zinc-900 focus:ring-1 focus:ring-zinc-300 dark:focus:ring-zinc-700 outline-none transition-all placeholder-zinc-400 dark:placeholder-zinc-600 text-[15px]"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors"
              >
                {showPassword ? <EyeSlashIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
              </button>
            </div>
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
