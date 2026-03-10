'use client'

import React, { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { CameraIcon } from '@heroicons/react/24/solid'

export default function SignupPage() {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [username, setUsername] = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState<string | null>(null)

  // Avatar state
  const [avatarFile, setAvatarFile]       = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const router  = useRouter()
  const supabase = createClient()

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setAvatarFile(file)
    setAvatarPreview(URL.createObjectURL(file))
  }

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    // 1 ─ Check if username is already taken in the profiles table
    const cleanUsername = username.trim().toLowerCase().replace(/[^a-z0-9_]/g, '')
    if (cleanUsername.length < 3) {
      setError('Username must be at least 3 characters.')
      setLoading(false); return
    }

    const { data: existingUser } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', cleanUsername)
      .maybeSingle()

    if (existingUser) {
      setError(`@${cleanUsername} is already taken. Please choose another one.`)
      setLoading(false); return
    }

    // 2 ─ Create auth user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName.trim(),
          username: cleanUsername,
        },
      },
    })

    if (authError) {
      setError(authError.message)
      setLoading(false)
      return
    }

    const newUser = authData?.user;

    // 2 ─ Upload avatar if provided
    let avatar_url: string | null = null
    if (avatarFile && newUser) {
      const ext  = avatarFile.name.split('.').pop()
      const path = `${newUser.id}/avatar.${ext}`
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, avatarFile, { upsert: true })

      if (!uploadError && uploadData) {
        const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path)
        avatar_url = urlData?.publicUrl ?? null
      }
    }

    // 3 ─ Insert / update profile with avatar_url
    if (newUser && avatar_url) {
      await supabase
        .from('profiles')
        .update({ avatar_url })
        .eq('id', newUser.id)
    }

    // 4 ─ Auto-login
    if (authData?.session) {
      router.replace('/')
      return
    }
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
    if (signInError) {
      router.replace('/login')
    } else {
      router.replace('/')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-white dark:bg-black overflow-hidden relative">
      {/* Decorative Rings */}
      <div className="absolute inset-0 z-0 pointer-events-none select-none overflow-hidden">
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

      <div className="w-full max-w-[380px] space-y-6 p-6 relative z-10">
        {/* Logo */}
        <div className="text-center space-y-2">
          <div className="flex justify-center pb-1">
            <span className="text-3xl font-black tracking-tighter text-black dark:text-white">JPM</span>
          </div>
          <h1 className="text-[17px] font-bold tracking-tight text-zinc-900 dark:text-white">
            Create your JPM account
          </h1>
        </div>

        {/* Avatar Picker */}
        <div className="flex justify-center">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="relative group"
            aria-label="Choose profile photo"
          >
            <div className="w-24 h-24 rounded-full bg-zinc-100 dark:bg-zinc-900 border-2 border-dashed border-zinc-300 dark:border-zinc-700 group-hover:border-zinc-500 transition-colors overflow-hidden flex items-center justify-center">
              {avatarPreview ? (
                <Image src={avatarPreview} alt="Preview" fill className="object-cover" />
              ) : (
                <CameraIcon className="w-8 h-8 text-zinc-400" />
              )}
            </div>
            <div className="absolute bottom-0 right-0 w-7 h-7 bg-black dark:bg-white text-white dark:text-black rounded-full flex items-center justify-center shadow-md">
              <CameraIcon className="w-4 h-4" />
            </div>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleAvatarChange}
          />
        </div>
        <p className="text-center text-xs text-zinc-400 -mt-3">Tap to add a profile photo</p>

        {/* Form */}
        <form className="space-y-3" onSubmit={handleSignup}>
          {error && (
            <div className="bg-red-50 dark:bg-red-950/30 text-red-600 p-3 rounded-xl text-xs font-medium border border-red-100 dark:border-red-900">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <input
              id="signup-fullname"
              type="text"
              required
              autoComplete="name"
              placeholder="Full Name"
              className="w-full p-4 bg-zinc-100 dark:bg-zinc-900/50 border border-transparent dark:border-zinc-800 rounded-2xl focus:bg-white dark:focus:bg-zinc-900 focus:ring-1 focus:ring-zinc-300 dark:focus:ring-zinc-700 outline-none transition-all placeholder-zinc-400 dark:placeholder-zinc-600 text-[15px]"
              value={fullName}
              onChange={e => setFullName(e.target.value)}
            />
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 text-[15px] pointer-events-none">@</span>
              <input
                id="signup-username"
                type="text"
                required
                autoComplete="username"
                placeholder="username"
                className="w-full pl-8 pr-4 py-4 bg-zinc-100 dark:bg-zinc-900/50 border border-transparent dark:border-zinc-800 rounded-2xl focus:bg-white dark:focus:bg-zinc-900 focus:ring-1 focus:ring-zinc-300 dark:focus:ring-zinc-700 outline-none transition-all placeholder-zinc-400 dark:placeholder-zinc-600 text-[15px]"
                value={username}
                onChange={e => setUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, '').toLowerCase())}
              />
            </div>
            <input
              id="signup-email"
              type="email"
              required
              autoComplete="email"
              placeholder="Email address"
              className="w-full p-4 bg-zinc-100 dark:bg-zinc-900/50 border border-transparent dark:border-zinc-800 rounded-2xl focus:bg-white dark:focus:bg-zinc-900 focus:ring-1 focus:ring-zinc-300 dark:focus:ring-zinc-700 outline-none transition-all placeholder-zinc-400 dark:placeholder-zinc-600 text-[15px]"
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
            <input
              id="signup-password"
              type="password"
              required
              autoComplete="new-password"
              placeholder="Password (min 6 characters)"
              className="w-full p-4 bg-zinc-100 dark:bg-zinc-900/50 border border-transparent dark:border-zinc-800 rounded-2xl focus:bg-white dark:focus:bg-zinc-900 focus:ring-1 focus:ring-zinc-300 dark:focus:ring-zinc-700 outline-none transition-all placeholder-zinc-400 dark:placeholder-zinc-600 text-[15px]"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
          </div>

          <button
            id="signup-submit"
            type="submit"
            disabled={loading}
            className="w-full bg-black dark:bg-white text-white dark:text-black p-4 rounded-2xl font-bold transition-all active:scale-[0.98] disabled:opacity-50 mt-2 text-[15px] shadow-lg shadow-black/5 dark:shadow-white/5 hover:opacity-90"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-zinc-400 border-t-current rounded-full animate-spin" />
                Creating account...
              </span>
            ) : (
              'Create account'
            )}
          </button>
        </form>

        {/* Footer */}
        <div className="text-center pt-2">
          <div className="pt-4 border-t border-zinc-100 dark:border-zinc-900">
            <p className="text-zinc-500 text-sm">
              Already have an account?{' '}
              <Link href="/login" className="text-black dark:text-white font-bold hover:underline underline-offset-4">
                Log in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
