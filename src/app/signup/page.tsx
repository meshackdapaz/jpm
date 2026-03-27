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
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [username, setUsername] = useState('')
  const [gender, setGender] = useState('')
  
  // Birthday state
  const [birthDay, setBirthDay] = useState('')
  const [birthMonth, setBirthMonth] = useState('')
  const [birthYear, setBirthYear] = useState('')

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

    // 1 ─ Validate Age (18+)
    if (!birthDay || !birthMonth || !birthYear) {
      setError('Please provide your complete birthday.')
      setLoading(false); return
    }

    const birthDate = new Date(parseInt(birthYear), parseInt(birthMonth) - 1, parseInt(birthDay))
    const today = new Date()
    let age = today.getFullYear() - birthDate.getFullYear()
    const m = today.getMonth() - birthDate.getMonth()
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--
    }

    if (age < 18) {
      setError('You must be at least 18 years old to join.')
      setLoading(false); return
    }

    // 2 ─ Check if username is already taken
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
      setError(`@${cleanUsername} is already taken.`)
      setLoading(false); return
    }

    // 3 ─ Create auth user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: `${firstName.trim()} ${lastName.trim()}`,
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          username: cleanUsername,
          birthday: birthDate.toISOString().split('T')[0],
          gender,
        },
      },
    })

    if (authError) {
      setError(authError.message)
      setLoading(false)
      return
    }

    const newUser = authData?.user;

    // 4 ─ Upload avatar if provided
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

    // 5 ─ Update profile
    if (newUser) {
      await supabase
        .from('profiles')
        .update({ 
          avatar_url,
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          birthday: birthDate.toISOString().split('T')[0],
          gender,
          full_name: `${firstName.trim()} ${lastName.trim()}`
        })
        .eq('id', newUser.id)
    }

    // 6 ─ Auto-login
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

  const days = Array.from({ length: 31 }, (_, i) => i + 1)
  const months = [
    { value: '1', label: 'Jan' }, { value: '2', label: 'Feb' }, { value: '3', label: 'Mar' },
    { value: '4', label: 'Apr' }, { value: '5', label: 'May' }, { value: '6', label: 'Jun' },
    { value: '7', label: 'Jul' }, { value: '8', label: 'Aug' }, { value: '9', label: 'Sep' },
    { value: '10', label: 'Oct' }, { value: '11', label: 'Nov' }, { value: '12', label: 'Dec' }
  ]
  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 120 }, (_, i) => currentYear - i)

  return (
    <div className="min-h-screen flex items-center justify-center bg-white dark:bg-black overflow-y-auto py-12 px-4 relative">
      {/* Decorative Rings */}
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

      <div className="w-full max-w-[380px] space-y-6 relative z-10 px-4 sm:px-0">
        {/* Logo & Header */}
        <div className="text-center space-y-2">
          <div className="flex justify-center pb-1">
            <span className="text-3xl font-black tracking-tighter text-black dark:text-white">JPM</span>
          </div>
          <h1 className="text-[17px] font-bold tracking-tight text-zinc-900 dark:text-white">
            Create your account
          </h1>
        </div>

        {/* Avatar Picker */}
        <div className="flex justify-center">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="relative group focus:outline-none"
          >
            <div className="w-24 h-24 rounded-full bg-zinc-100 dark:bg-zinc-900 border-2 border-dashed border-zinc-300 dark:border-zinc-700 group-hover:border-zinc-50 transition-all overflow-hidden flex items-center justify-center">
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
        <form onSubmit={handleSignup} className="space-y-3">
          {error && (
            <div className="bg-red-50 dark:bg-red-950/30 text-red-600 p-3 rounded-2xl text-[13px] font-medium border border-red-100 dark:border-red-900">
              {error}
            </div>
          )}

          <div className="space-y-2">
            {/* Name Grid */}
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                placeholder="First name"
                required
                className="w-full p-4 bg-zinc-100 dark:bg-zinc-900/50 border border-transparent dark:border-zinc-800 rounded-2xl focus:bg-white dark:focus:bg-zinc-900 focus:ring-1 focus:ring-zinc-300 dark:focus:ring-zinc-700 outline-none transition-all placeholder-zinc-400 dark:placeholder-zinc-600 text-[15px] text-black dark:text-white"
                value={firstName}
                onChange={e => setFirstName(e.target.value)}
              />
              <input
                type="text"
                placeholder="Last name"
                required
                className="w-full p-4 bg-zinc-100 dark:bg-zinc-900/50 border border-transparent dark:border-zinc-800 rounded-2xl focus:bg-white dark:focus:bg-zinc-900 focus:ring-1 focus:ring-zinc-300 dark:focus:ring-zinc-700 outline-none transition-all placeholder-zinc-400 dark:placeholder-zinc-600 text-[15px] text-black dark:text-white"
                value={lastName}
                onChange={e => setLastName(e.target.value)}
              />
            </div>

            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 text-[15px]">@</span>
              <input
                type="text"
                placeholder="username"
                required
                className="w-full pl-8 pr-4 py-4 bg-zinc-100 dark:bg-zinc-900/50 border border-transparent dark:border-zinc-800 rounded-2xl focus:bg-white dark:focus:bg-zinc-900 focus:ring-1 focus:ring-zinc-300 dark:focus:ring-zinc-700 outline-none transition-all placeholder-zinc-400 dark:placeholder-zinc-600 text-[15px] text-black dark:text-white"
                value={username}
                onChange={e => setUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, '').toLowerCase())}
              />
            </div>

            <input
              type="email"
              placeholder="Email address"
              required
              className="w-full p-4 bg-zinc-100 dark:bg-zinc-900/50 border border-transparent dark:border-zinc-800 rounded-2xl focus:bg-white dark:focus:bg-zinc-900 focus:ring-1 focus:ring-zinc-300 dark:focus:ring-zinc-700 outline-none transition-all placeholder-zinc-400 dark:placeholder-zinc-600 text-[15px] text-black dark:text-white"
              value={email}
              onChange={e => setEmail(e.target.value)}
            />

            <input
              type="password"
              placeholder="New password"
              required
              className="w-full p-4 bg-zinc-100 dark:bg-zinc-900/50 border border-transparent dark:border-zinc-800 rounded-2xl focus:bg-white dark:focus:bg-zinc-900 focus:ring-1 focus:ring-zinc-300 dark:focus:ring-zinc-700 outline-none transition-all placeholder-zinc-400 dark:placeholder-zinc-600 text-[15px] text-black dark:text-white"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />

            {/* Birthday */}
            <div className="p-4 bg-zinc-100 dark:bg-zinc-900/50 border border-transparent dark:border-zinc-800 rounded-2xl space-y-2">
              <label className="text-[12px] text-zinc-500 font-semibold px-1 uppercase tracking-wider">Birthday</label>
              <div className="grid grid-cols-3 gap-2">
                <select
                  required
                  className="bg-zinc-200 dark:bg-zinc-800 border-none rounded-xl p-2 text-[14px] outline-none text-black dark:text-white cursor-pointer"
                  value={birthMonth}
                  onChange={e => setBirthMonth(e.target.value)}
                >
                  <option value="">Month</option>
                  {months.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
                <select
                  required
                  className="bg-zinc-200 dark:bg-zinc-800 border-none rounded-xl p-2 text-[14px] outline-none text-black dark:text-white cursor-pointer"
                  value={birthDay}
                  onChange={e => setBirthDay(e.target.value)}
                >
                  <option value="">Day</option>
                  {days.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
                <select
                  required
                  className="bg-zinc-200 dark:bg-zinc-800 border-none rounded-xl p-2 text-[14px] outline-none text-black dark:text-white cursor-pointer"
                  value={birthYear}
                  onChange={e => setBirthYear(e.target.value)}
                >
                  <option value="">Year</option>
                  {years.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
            </div>

            {/* Gender */}
            <div className="p-4 bg-zinc-100 dark:bg-zinc-900/50 border border-transparent dark:border-zinc-800 rounded-2xl space-y-2">
              <label className="text-[12px] text-zinc-500 font-semibold px-1 uppercase tracking-wider">Gender</label>
              <div className="grid grid-cols-2 gap-2">
                {['Female', 'Male'].map(g => (
                  <label key={g} className="flex items-center gap-3 p-3 bg-zinc-200 dark:bg-zinc-800 rounded-xl cursor-pointer hover:bg-zinc-300 dark:hover:bg-zinc-700/50 transition-colors">
                    <input
                      type="radio"
                      name="gender"
                      required
                      value={g}
                      className="w-4 h-4 accent-black dark:accent-white"
                      onChange={e => setGender(e.target.value)}
                    />
                    <span className="text-[15px] text-zinc-900 dark:text-white">{g}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          <p className="text-[11px] text-zinc-500 text-center leading-relaxed py-2 px-1">
            By clicking Create account, you agree to our <Link href="/terms" className="text-black dark:text-white font-semibold cursor-pointer hover:underline">Terms</Link> and <Link href="/privacy" className="text-black dark:text-white font-semibold cursor-pointer hover:underline">Privacy Policy</Link>.
          </p>

          <button
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

        <div className="text-center pt-2">
          <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800">
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
