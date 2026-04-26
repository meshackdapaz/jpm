'use client'

import React, { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { ChevronLeftIcon } from '@heroicons/react/24/outline'
import { APP_NAME } from '@/lib/constants'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const supabase = createClient()

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://jpmjpm-official.vercel.app'
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${siteUrl}/auth/callback?next=/reset-password`,
    })

    if (resetError) {
      setError(resetError.message)
      setLoading(false)
    } else {
      setSuccess(true)
      setLoading(false)
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
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[40vh] font-black text-black dark:text-white opacity-[0.02] select-none pointer-events-none uppercase tracking-tighter">
          {APP_NAME}
        </div>
      </div>

      <div className="w-full max-w-[380px] space-y-8 p-6 relative z-10">
        <div className="flex flex-col items-center space-y-4">
           <Link href="/login" className="self-start flex items-center gap-2 text-zinc-500 hover:text-black dark:hover:text-white transition-colors mb-4 group font-medium text-sm">
            <ChevronLeftIcon className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            Back to login
          </Link>
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-black tracking-tight text-black dark:text-white">
              Reset Password
            </h1>
            <p className="text-zinc-500 text-[14px]">
              Enter your email and we'll send you a link to reset your password.
            </p>
          </div>
        </div>

        {success ? (
          <div className="bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 p-8 rounded-[32px] text-center space-y-4 animate-in fade-in zoom-in duration-500">
             <div className="w-16 h-16 bg-black dark:bg-white rounded-full flex items-center justify-center mx-auto mb-2">
              <svg className="w-8 h-8 text-white dark:text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-xl font-bold">Check your email</h2>
            <p className="text-zinc-500 text-sm leading-relaxed">
              We've sent a password reset link to <span className="font-bold text-black dark:text-white">{email}</span>.
            </p>
            <Link 
              href="/login"
              className="block w-full bg-zinc-100 dark:bg-zinc-800 text-black dark:text-white p-4 rounded-2xl font-bold transition-all hover:bg-zinc-200 dark:hover:bg-zinc-700"
            >
              Done
            </Link>
          </div>
        ) : (
          <form className="space-y-4" onSubmit={handleReset}>
            {error && (
              <div className="bg-red-50 dark:bg-red-950/30 text-red-600 p-4 rounded-2xl text-xs font-medium border border-red-100 dark:border-red-900/50">
                {error}
              </div>
            )}

            <input
              type="email"
              required
              placeholder="Email address"
              className="w-full p-4 bg-zinc-100 dark:bg-zinc-900/50 border border-transparent dark:border-zinc-800 rounded-2xl focus:bg-white dark:focus:bg-zinc-900 focus:ring-1 focus:ring-zinc-300 dark:focus:ring-zinc-700 outline-none transition-all placeholder-zinc-400 dark:placeholder-zinc-600 text-[15px]"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-black dark:bg-white text-white dark:text-black p-4 rounded-2xl font-bold transition-all active:scale-[0.98] disabled:opacity-50 text-[15px] shadow-lg shadow-black/5 dark:shadow-white/5 hover:opacity-90"
            >
              {loading ? 'Sending...' : 'Send reset link'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
