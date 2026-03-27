'use client'

import React, { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    // Check if we actually have a session (should be set by auth/callback)
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        // If no session, they shouldn't be here (or link expired)
        router.push('/login?error=Invalid or expired reset link')
      }
    }
    checkSession()
  }, [router, supabase.auth])

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirmPassword) {
      setError("Passwords don't match")
      return
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters")
      return
    }

    setLoading(true)
    setError(null)

    const { error: resetError } = await supabase.auth.updateUser({
      password: password,
    })

    if (resetError) {
      setError(resetError.message)
      setLoading(false)
    } else {
      setSuccess(true)
      setLoading(false)
      setTimeout(() => {
        router.push('/login?message=Password updated successfully')
      }, 3000)
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
          JPM
        </div>
      </div>

      <div className="w-full max-w-[380px] space-y-8 p-6 relative z-10">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-black tracking-tight text-black dark:text-white">
            New Password
          </h1>
          <p className="text-zinc-500 text-[14px]">
            Please enter a new password for your account.
          </p>
        </div>

        {success ? (
          <div className="bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 p-8 rounded-[32px] text-center space-y-4 animate-in fade-in zoom-in duration-500">
             <div className="w-16 h-16 bg-black dark:bg-white rounded-full flex items-center justify-center mx-auto mb-2">
              <svg className="w-8 h-8 text-white dark:text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-xl font-bold">Password Updated</h2>
            <p className="text-zinc-500 text-sm">
              Your password has been reset successfully. Redirecting you to login...
            </p>
          </div>
        ) : (
          <form className="space-y-4" onSubmit={handleReset}>
            {error && (
              <div className="bg-red-50 dark:bg-red-950/30 text-red-600 p-4 rounded-2xl text-xs font-medium border border-red-100 dark:border-red-900/50">
                {error}
              </div>
            )}

            <div className="space-y-3">
              <input
                type="password"
                required
                placeholder="New password"
                className="w-full p-4 bg-zinc-100 dark:bg-zinc-900/50 border border-transparent dark:border-zinc-800 rounded-2xl focus:bg-white dark:focus:bg-zinc-900 focus:ring-1 focus:ring-zinc-300 dark:focus:ring-zinc-700 outline-none transition-all placeholder-zinc-400 dark:placeholder-zinc-600 text-[15px]"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <input
                type="password"
                required
                placeholder="Confirm new password"
                className="w-full p-4 bg-zinc-100 dark:bg-zinc-900/50 border border-transparent dark:border-zinc-800 rounded-2xl focus:bg-white dark:focus:bg-zinc-900 focus:ring-1 focus:ring-zinc-300 dark:focus:ring-zinc-700 outline-none transition-all placeholder-zinc-400 dark:placeholder-zinc-600 text-[15px]"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-black dark:bg-white text-white dark:text-black p-4 rounded-2xl font-bold transition-all active:scale-[0.98] disabled:opacity-50 text-[15px] shadow-lg shadow-black/5 dark:shadow-white/5 hover:opacity-90"
            >
              {loading ? 'Updating...' : 'Update password'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
