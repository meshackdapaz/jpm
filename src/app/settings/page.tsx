'use client'

import React, { useState, useEffect, Suspense } from 'react'
import { AppLayout } from '@/components/AppLayout'
import { 
  LockClosedIcon, 
  UserIcon, 
  QuestionMarkCircleIcon,
  InformationCircleIcon,
  BanknotesIcon,
  MegaphoneIcon,
  PlusIcon,
  ChartBarSquareIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/solid'
import { 
  ChevronRightIcon,
  ChevronLeftIcon,
  SunIcon,
  PhotoIcon,
  GlobeAltIcon,
  EyeIcon,
  EyeSlashIcon
} from '@heroicons/react/24/outline'

import { useI18n } from '@/lib/i18n'
import { useAuth } from '@/components/AuthProvider'
import { createClient } from '@/lib/supabase/client'
import Image from 'next/image'
import { useTheme } from 'next-themes'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { AdminAdManager } from '@/components/AdminAdManager'

// ─── Account Profile Editor ────────────────────────────────────────────────────
function AccountEditor({ profile, userId, supabase, onSaved }: { profile: any; userId?: string; supabase: any; onSaved: (p: any) => void }) {
  const [fullName, setFullName] = useState(profile?.full_name || '')
  const [username, setUsername] = useState(profile?.username || '')
  const [bio, setBio]           = useState(profile?.bio || '')
  const [tiktokUrl, setTiktokUrl] = useState(profile?.tiktok_url || '')
  const [instagramUrl, setInstagramUrl] = useState(profile?.instagram_url || '')
  const [facebookUrl, setFacebookUrl] = useState(profile?.facebook_url || '')
  const [websiteUrl, setWebsiteUrl] = useState(profile?.website_url || '')
  const [isPrivate, setIsPrivate]   = useState(profile?.is_private || false)
  const [saving, setSaving]     = useState(false)
  const [error,  setError]      = useState<string | null>(null)
  const [success, setSuccess]   = useState(false)
  const [mounted, setMounted] = useState(false)

  // 14-day name/username change restriction
  const daysSinceCreation = profile?.created_at
    ? Math.floor((Date.now() - new Date(profile.created_at).getTime()) / (1000 * 60 * 60 * 24))
    : 999
  const canChangeName = daysSinceCreation >= 14
  const daysRemaining = Math.max(0, 14 - daysSinceCreation)
  


  useEffect(() => {
    setFullName(profile?.full_name || '')
    setUsername(profile?.username || '')
    setBio(profile?.bio || '')
    setTiktokUrl(profile?.tiktok_url || '')
    setInstagramUrl(profile?.instagram_url || '')
    setFacebookUrl(profile?.facebook_url || '')
    setWebsiteUrl(profile?.website_url || '')
    setIsPrivate(profile?.is_private || false)
  }, [profile])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!userId) return
    setSaving(true); setError(null); setSuccess(false)

    const clean = username.trim().toLowerCase().replace(/[^a-z0-9_]/g, '')
    if (clean.length < 3) {
      setError('Username must be at least 3 characters (letters, numbers, _).')
      setSaving(false); return
    }

    // Check uniqueness — exclude current user
    const { data: existing } = await supabase
      .from('profiles').select('id').eq('username', clean).neq('id', userId).maybeSingle()

    if (existing) {
      setError(`@${clean} is already taken. Choose a different username.`)
      setSaving(false); return
    }

    const { data: updated, error: saveErr } = await supabase
      .from('profiles').update({ 
        full_name: fullName.trim(), 
        username: clean,
        bio: bio.trim(),
        tiktok_url: tiktokUrl.trim(),
        instagram_url: instagramUrl.trim(),
        facebook_url: facebookUrl.trim(),
        website_url: websiteUrl.trim(),
        is_private: isPrivate
      })
      .eq('id', userId).select().single()

    if (saveErr) { setError(saveErr.message) } else {
      // Sync with Auth Metadata
      await supabase.auth.updateUser({
        data: { full_name: fullName.trim(), username: clean }
      })
      setSuccess(true); onSaved(updated)
      setTimeout(() => setSuccess(false), 3000)
    }
    setSaving(false)
  }

  return (
    <div className="p-4 sm:p-8 animate-in fade-in duration-200 max-w-xl">
      <h3 className="font-bold text-[18px] mb-1">Edit Profile</h3>
      <p className="text-zinc-500 text-[15px] mb-6 leading-relaxed">Update your display name and username. <b>Note:</b> To prevent abuse, names and usernames can only be changed after your account has been active for 14 days. Usernames must be unique.</p>
      <form onSubmit={handleSave} className="space-y-4">
        {error   && <div className="bg-red-50   dark:bg-red-950/30   text-red-600   dark:text-red-400   p-3 rounded-xl text-sm border border-red-100   dark:border-red-900">{error}</div>}
        {success && <div className="bg-green-50 dark:bg-green-950/30 text-green-600 dark:text-green-400 p-3 rounded-xl text-sm border border-green-100 dark:border-green-900">✅ Profile saved!</div>}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-[13px] font-semibold text-zinc-500">Full Name</label>
            {!canChangeName && (
              <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                🔒 Locked · {daysRemaining}d remaining
              </span>
            )}
          </div>
          <input type="text" value={fullName} onChange={e => setFullName(e.target.value)}
            disabled={!canChangeName}
            className="w-full px-4 py-3 bg-zinc-100 dark:bg-zinc-900 rounded-xl outline-none text-[15px] focus:ring-1 focus:ring-zinc-300 dark:focus:ring-zinc-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            placeholder="Your full name" />
          {!canChangeName && <p className="text-[12px] text-zinc-400 mt-1.5">You can change your name after {daysRemaining} more day{daysRemaining !== 1 ? 's' : ''}.</p>}
        </div>
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-[13px] font-semibold text-zinc-500">Username</label>
            {!canChangeName && (
              <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30 px-2 py-0.5 rounded-full">🔒 Locked</span>
            )}
          </div>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none">@</span>
            <input type="text" value={username}
              onChange={e => { if (canChangeName) { setUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, '').toLowerCase()); setError(null) } }}
              disabled={!canChangeName}
              className="w-full pl-8 pr-4 py-3 bg-zinc-100 dark:bg-zinc-900 rounded-xl outline-none text-[15px] focus:ring-1 focus:ring-zinc-300 dark:focus:ring-zinc-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              placeholder="username" />
          </div>
          <p className="text-xs text-zinc-400 mt-1.5">Only letters, numbers and underscores. Must be unique.</p>
        </div>
        <div>
          <label className="block text-[13px] font-semibold text-zinc-500 mb-1.5">Bio</label>
          <textarea value={bio} onChange={e => setBio(e.target.value)}
            className="w-full px-4 py-3 bg-zinc-100 dark:bg-zinc-900 rounded-xl outline-none text-[15px] focus:ring-1 focus:ring-zinc-300 dark:focus:ring-zinc-700 transition resize-none"
            placeholder="Tell us about yourself..." rows={3} />
        </div>
        <div className="pt-2">
          <h4 className="text-[14px] font-bold mb-4">Social Links</h4>
          <div className="space-y-4">
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
                <svg className="w-5 h-5 text-zinc-400 fill-current" viewBox="0 0 24 24"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1.04-.1z"/></svg>
              </div>
              <input type="url" value={tiktokUrl} onChange={e => setTiktokUrl(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-zinc-100 dark:bg-zinc-900 rounded-xl outline-none text-[15px] focus:ring-1 focus:ring-zinc-300 dark:focus:ring-zinc-700 transition"
                placeholder="https://tiktok.com/@username" />
            </div>
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
                <svg className="w-5 h-5 text-zinc-400 fill-current" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.981 1.28.058 1.688.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.058-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
              </div>
              <input type="url" value={instagramUrl} onChange={e => setInstagramUrl(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-zinc-100 dark:bg-zinc-900 rounded-xl outline-none text-[15px] focus:ring-1 focus:ring-zinc-300 dark:focus:ring-zinc-700 transition"
                placeholder="https://instagram.com/username" />
            </div>
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
                <svg className="w-5 h-5 text-zinc-400 fill-current" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
              </div>
              <input type="url" value={facebookUrl} onChange={e => setFacebookUrl(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-zinc-100 dark:bg-zinc-900 rounded-xl outline-none text-[15px] focus:ring-1 focus:ring-zinc-300 dark:focus:ring-zinc-700 transition"
                placeholder="https://facebook.com/username" />
            </div>
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
                <GlobeAltIcon className="w-5 h-5 text-zinc-400" />
              </div>
              <input type="url" value={websiteUrl} onChange={e => setWebsiteUrl(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-zinc-100 dark:bg-zinc-900 rounded-xl outline-none text-[15px] focus:ring-1 focus:ring-zinc-300 dark:focus:ring-zinc-700 transition"
                placeholder="https://yourwebsite.com" />
            </div>
          </div>
        </div>
        <div className="flex items-center justify-between py-2 border-b border-zinc-50 dark:border-zinc-900 pb-4">
          <div>
            <p className="text-[14px] font-bold">Private Account</p>
            <p className="text-[12px] text-zinc-500">When your account is private, only people you approve can see your photos and videos.</p>
          </div>
          <button 
            type="button"
            onClick={() => setIsPrivate(!isPrivate)}
            className={`w-11 h-6 rounded-full relative transition-colors duration-200 ${isPrivate ? 'bg-blue-600' : 'bg-zinc-200 dark:bg-zinc-800'}`}
          >
            <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform duration-200 ${isPrivate ? 'translate-x-5' : ''}`} />
          </button>
        </div>

        <button type="submit" disabled={saving}
          className="w-full bg-black dark:bg-white text-white dark:text-black py-3 rounded-xl font-bold text-[15px] hover:opacity-90 active:scale-[0.98] disabled:opacity-50 transition-all mt-2">
          {saving ? 'Saving...' : 'Save changes'}
        </button>
      </form>
    </div>
  )
}

function SettingsContent() {
  const { t } = useI18n()
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const tabParam = searchParams.get('tab')
  const supabase = createClient()
  const [currentProfile, setCurrentProfile] = useState<any>(null)

  useEffect(() => {
    if (!authLoading && !user) router.replace('/login')
  }, [user, authLoading, router])

  const [activeTab, setActiveTab] = useState(tabParam || 'privacy')

  useEffect(() => {
    if (tabParam) setActiveTab(tabParam)
  }, [tabParam])
  const [privacySubTab, setPrivacySubTab] = useState<string | null>(null)
  
  const [settings, setSettings] = useState({
    isPrivate: false,
    mentions: 'Everyone',
    tags: 'Everyone',
    online: 'Anyone',
    dataSaver: false
  })

  const [totalViews, setTotalViews] = useState(0)
  const [followerCount, setFollowerCount] = useState(0)
  const [isEligible, setIsEligible] = useState(false)
  const [applicationStatus, setApplicationStatus] = useState<string | null>(null)
  const [applying, setApplying] = useState(false)

  // Security Tab state
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [isChangingPassword, setIsChangingPassword] = useState(false)

  useEffect(() => {
    if (user) {
      supabase.from('profiles').select('*').eq('id', user.id).single().then(async ({ data }: { data: any }) => {
        if (data) {
          setCurrentProfile(data)
          if (data.settings) {
            setSettings(prev => ({ ...prev, ...data.settings }))
            setApplicationStatus(data.settings.creator_application_status || null)
          }

          // Fetch real metrics
          const [{ data: postsData }, { count: followers }] = await Promise.all([
            supabase.from('posts').select('view_count').eq('creator_id', user.id),
            supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', user.id)
          ])

          const views = postsData?.reduce((acc: number, p: any) => acc + (p.view_count || 0), 0) || 0
          const fCount = followers || 0
          
          setTotalViews(views)
          setFollowerCount(fCount)
          
          // Eligibility: 10k followers & 10M views (using 1k/10k for testing if needed, but sticking to 10k/10M as per code)
          const eligible = fCount >= 10000 && views >= 10000000
          setIsEligible(eligible)
        }
      })
    }
  }, [user])

  const handleApply = async () => {
    if (!user || applying) return
    setApplying(true)
    
    const newSettings = { ...settings, creator_application_status: 'pending' }
    const { error } = await supabase.from('profiles').update({ settings: newSettings }).eq('id', user.id)
    
    if (!error) {
      setApplicationStatus('pending')
      alert('Application submitted successfully!')
    }
    setApplying(false)
  }

  const updateSetting = async (key: string, value: any) => {
    if (key === 'dataSaver' && typeof window !== 'undefined') {
      localStorage.setItem('echo_data_saver', value.toString())
    }
    setSettings(prev => {
      const newSettings = { ...prev, [key]: value }
      if (user) {
        const updateData: any = { settings: newSettings }
        if (key === 'isPrivate') {
          updateData.is_private = value
        }
        supabase.from('profiles').update(updateData).eq('id', user.id).then(({ error }: { error: any }) => {
          if (error) console.error('Error updating setting:', error)
        })
      }
      return newSettings
    })
  }

  const { theme, setTheme } = useTheme()

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId)
    setPrivacySubTab(null)
  }

  const leftMenu = [
    { id: 'privacy',     label: 'Privacy',         icon: LockClosedIcon },
    { id: 'status',      label: 'Edit Profile',     icon: UserIcon },
    { id: 'account',     label: 'Account Info',    icon: InformationCircleIcon },
    { id: 'monetization',label: 'Monetization',    icon: BanknotesIcon },
    ...(currentProfile?.is_admin ? [{ id: 'ads', label: 'Ads Management', icon: MegaphoneIcon }] : []),
    { id: 'appearance',  label: 'Appearance',       icon: SunIcon },
    { id: 'security',    label: 'Security',         icon: LockClosedIcon },
    { id: 'help',        label: 'Help',             icon: QuestionMarkCircleIcon },
    { id: 'about',       label: 'About App',        icon: InformationCircleIcon },
  ]

  return (
    <AppLayout wide={activeTab === 'monetization'} hideSidebar={true}>
      <div className="flex justify-center w-full min-h-screen pt-4 sm:pt-8">
        <div className={`flex w-full ${activeTab === 'monetization' ? 'max-w-6xl' : 'max-w-4xl'} overflow-hidden min-h-[600px]`}>
          
          {/* Left Menu / Mobile Top Bar */}
          <div className={`w-full sm:w-1/3 sm:min-w-[220px] sm:max-w-[280px] border-r border-zinc-200 dark:border-zinc-800 p-4 ${activeTab !== 'settings_menu_mobile_placeholder' ? 'hidden sm:block' : 'block sm:hidden'}`}>
            <h1 className="font-bold text-2xl mb-6 px-4 pt-2">Settings</h1>
            <nav className="space-y-1">
              {leftMenu.map((item: any) => {
                const Icon = item.icon
                const isActive = activeTab === item.id || (activeTab === 'settings_menu_mobile_placeholder' && item.id === 'privacy') // Default highlight if needed, or don't highlight on mobile menu
                return (
                  <button
                    key={item.id}
                    onClick={() => handleTabChange(item.id)}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-colors font-medium text-[15px]
                      ${activeTab === item.id && activeTab !== 'settings_menu_mobile_placeholder'
                        ? 'bg-zinc-100 dark:bg-zinc-800 text-black dark:text-white font-bold border border-zinc-200 dark:border-zinc-700' 
                        : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-900'
                      }`}
                  >
                    <div className="flex items-center gap-4">
                      <Icon className="w-6 h-6" />
                      {item.label}
                    </div>
                    <ChevronRightIcon className="w-5 h-5 sm:hidden" />
                  </button>
                )
              })}
            </nav>
            <div className="mt-8 px-4">
               <button 
                 onClick={async () => {
                   const supabase = createClient()
                   await supabase.auth.signOut()
                   window.location.href = '/'
                 }}
                 className="text-red-500 hover:text-red-600 font-bold text-[15px] select-none transition-colors"
               >
                 Log out
               </button>
             </div>
          </div>

          {/* Right Content */}
          <div className={`flex-1 overflow-y-auto ${activeTab === 'settings_menu_mobile_placeholder' ? 'hidden sm:block' : 'block'}`}>
            <div className="sm:hidden px-4 py-3 flex items-center border-b border-zinc-100 dark:border-zinc-800">
              <button onClick={() => handleTabChange('settings_menu_mobile_placeholder')} className="mr-3 p-1 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800">
                <ChevronLeftIcon className="w-6 h-6" />
              </button>
              <h2 className="font-bold text-lg capitalize">
                {activeTab === 'status' ? 'Edit Profile' : 
                 activeTab === 'monetization' ? 'Monetization' :
                 activeTab === 'ads' ? 'Ads Management' : 
                 activeTab}
              </h2>
            </div>
            
            {/* PRIVACY TAB */}
            {activeTab === 'privacy' && (
              <>
                {privacySubTab === null && (
                  <div className="p-4 sm:p-8">
                    <div className="flex items-start justify-between border-b border-zinc-100 dark:border-zinc-800/50 pb-6 mb-2">
                      <div className="flex flex-col gap-1 pr-6">
                        <span className="font-bold text-[16px]">Private profile</span>
                        <p className="text-zinc-500 leading-relaxed text-[15px]">
                          When your account is private, only followers can see and interact with your threads.
                        </p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer flex-shrink-0 mt-1">
                        <input type="checkbox" checked={settings.isPrivate} onChange={(e) => updateSetting('isPrivate', e.target.checked)} className="sr-only peer" />
                        <div className="w-12 h-7 bg-zinc-200 peer-focus:outline-none rounded-full peer dark:bg-zinc-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all dark:border-zinc-600 peer-checked:bg-black dark:peer-checked:bg-white"></div>
                      </label>
                    </div>

                    <div className="space-y-1 mt-4">
                      <button onClick={() => setPrivacySubTab('mentions')} className="w-full flex items-center justify-between py-4 hover:opacity-75 transition-opacity px-2">
                        <span className="font-medium text-[16px]">Tags and mentions</span>
                        <ChevronRightIcon className="w-5 h-5 text-zinc-400" />
                      </button>
                      <div className="h-px bg-zinc-100 dark:bg-zinc-800/50 mx-2" />
                      <button onClick={() => setPrivacySubTab('online')} className="w-full flex items-center justify-between py-4 hover:opacity-75 transition-opacity px-2">
                        <span className="font-medium text-[16px]">Online status</span>
                        <ChevronRightIcon className="w-5 h-5 text-zinc-400" />
                      </button>
                      <div className="h-px bg-zinc-100 dark:bg-zinc-800/50 mx-2" />
                      <div className="w-full flex items-center justify-between py-4 px-2">
                        <div className="flex flex-col gap-0.5">
                          <span className="font-medium text-[16px]">Data Saver</span>
                          <p className="text-[12px] text-zinc-500">Reduce data usage by loading smaller images</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                          <input type="checkbox" checked={settings.dataSaver} onChange={(e) => updateSetting('dataSaver', e.target.checked)} className="sr-only peer" />
                          <div className="w-11 h-6 bg-zinc-200 peer-focus:outline-none rounded-full peer dark:bg-zinc-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-zinc-600 peer-checked:bg-black dark:peer-checked:bg-white"></div>
                        </label>
                      </div>
                    </div>
                  </div>
                )}

                {privacySubTab === 'mentions' && (
                  <div className="p-4 sm:p-8 animate-in slide-in-from-right-4 fade-in duration-200">
                    <button onClick={() => setPrivacySubTab(null)} className="flex items-center gap-2 text-zinc-500 hover:text-black dark:hover:text-white font-medium mb-8 transition-colors -ml-2 p-2 w-max">
                      <ChevronLeftIcon className="w-5 h-5 stroke-[2.5]" />
                      Back
                    </button>
                    <div>
                      <h3 className="font-bold text-[16px] mb-1">Allow @mentions from</h3>
                      <p className="text-zinc-500 text-[15px] mb-6 leading-relaxed">Choose who can @mention you.</p>
                      <div className="space-y-6">
                        {['Everyone', 'Profiles you follow', 'No one'].map((opt: string) => (
                          <label key={opt} className="flex items-center justify-between cursor-pointer group">
                            <span className="text-[16px]">{opt}</span>
                            <div className="relative flex items-center justify-center w-6 h-6 border-2 border-zinc-300 dark:border-zinc-700 rounded-full group-hover:border-black dark:group-hover:border-white transition-colors">
                              <input type="radio" name="mentions" value={opt} checked={settings.mentions === opt} onChange={() => updateSetting('mentions', opt)} className="peer opacity-0 absolute inset-0 cursor-pointer" />
                              <div className="w-3 h-3 bg-black dark:bg-white rounded-full bg-current opacity-0 peer-checked:opacity-100 transition-opacity"></div>
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {privacySubTab === 'online' && (
                  <div className="p-4 sm:p-8 animate-in slide-in-from-right-4 fade-in duration-200">
                    <button onClick={() => setPrivacySubTab(null)} className="flex items-center gap-2 text-zinc-500 hover:text-black dark:hover:text-white font-medium mb-8 transition-colors -ml-2 p-2 w-max">
                      <ChevronLeftIcon className="w-5 h-5 stroke-[2.5]" />
                      Back
                    </button>
                    <div>
                      <h3 className="font-bold text-[16px] mb-1">Who can see you're online</h3>
                      <p className="text-zinc-500 text-[15px] mb-6 leading-relaxed">When this is turned off, you won't be able to see others' online status.</p>
                      <div className="space-y-6">
                        {['Anyone', 'Followers', 'Followers you follow back', 'No one'].map((opt: string) => (
                          <label key={opt} className="flex items-center justify-between cursor-pointer group">
                            <span className="text-[16px]">{opt}</span>
                            <div className="relative flex items-center justify-center w-6 h-6 border-2 border-zinc-300 dark:border-zinc-700 rounded-full group-hover:border-black dark:group-hover:border-white transition-colors">
                              <input type="radio" name="online" value={opt} checked={settings.online === opt} onChange={() => updateSetting('online', opt)} className="peer opacity-0 absolute inset-0 cursor-pointer" />
                              <div className="w-3 h-3 bg-black dark:bg-white rounded-full bg-current opacity-0 peer-checked:opacity-100 transition-opacity"></div>
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* MONETIZATION TAB */}
            {activeTab === 'monetization' && (
              <div className="p-4 sm:p-8 animate-in fade-in duration-300 space-y-8">
                <div>
                  <h3 className="text-2xl font-black mb-1">Monetization</h3>
                  <p className="text-zinc-500 text-[15px]">Track your earnings and eligibility status.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-zinc-50 dark:bg-zinc-900 p-6 rounded-[24px] border border-zinc-100 dark:border-zinc-800">
                    <p className="text-zinc-500 text-sm font-bold mb-1">Estimated Revenue</p>
                    <h4 className="text-3xl font-black">${currentProfile?.monetization_earnings?.toFixed(2) || '0.00'}</h4>
                    <div className="mt-4 flex items-center gap-2 text-zinc-400 text-xs">
                      <ChartBarSquareIcon className="w-4 h-4" />
                      Updated every 24 hours
                    </div>
                  </div>
                  <div className="bg-zinc-50 dark:bg-zinc-900 p-6 rounded-[24px] border border-zinc-100 dark:border-zinc-800">
                    <p className="text-zinc-500 text-sm font-bold mb-1">Status</p>
                    <h4 className={`text-xl font-bold flex items-center gap-2 ${
                      applicationStatus === 'approved' ? 'text-black dark:text-white' :
                      applicationStatus === 'pending' ? 'text-zinc-500' :
                      applicationStatus === 'declined' ? 'text-zinc-400 line-through' :
                      'text-zinc-400'
                    }`}>
                      {applicationStatus === 'approved' ? 'Active Creator' :
                       applicationStatus === 'pending' ? 'Pending Review' :
                       applicationStatus === 'declined' ? 'Declined' :
                       'Not Eligible'}
                    </h4>
                    <p className="mt-2 text-xs text-zinc-500">
                      {applicationStatus === 'approved' ? 'Congratulations! You are earning from your memes.' :
                       applicationStatus === 'pending' ? 'Our team is reviewing your application.' :
                       'Keep posting high-quality memes to unlock monetization!'}
                    </p>
                    {applicationStatus === 'approved' && (
                      <Link href="/monetization" className="mt-4 inline-flex items-center gap-2 text-black dark:text-white font-bold text-sm hover:underline">
                        View Detailed Earnings <ChevronRightIcon className="w-4 h-4" />
                      </Link>
                    )}
                  </div>
                </div>

                <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-[28px] overflow-hidden">
                  <div className="p-6 border-b border-zinc-100 dark:border-zinc-800">
                    <h4 className="font-bold">Eligibility Checklist</h4>
                  </div>
                  <div className="p-6 space-y-4">
                    {[
                      { label: '10,000 Followers', current: followerCount, required: 10000, done: followerCount >= 10000 },
                      { label: '10 Million Views', current: totalViews, required: 10000000, done: totalViews >= 10000000 },
                      { label: 'Active in the last 30 days', done: true },
                      { label: 'Verified Account', done: currentProfile?.is_verified }
                    ].map((item, i) => (
                      <div key={i} className="flex items-center justify-between">
                        <div className="flex flex-col">
                          <span className="text-zinc-700 dark:text-zinc-300 font-medium">{item.label}</span>
                          {item.required && (
                            <span className="text-[11px] text-zinc-400">{item.current.toLocaleString()} / {item.required.toLocaleString()}</span>
                          )}
                        </div>
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-sm ${item.done ? 'bg-black dark:bg-white text-white dark:text-black' : 'bg-zinc-100 dark:bg-zinc-900 text-zinc-300 dark:text-zinc-700'}`}>
                          {item.done ? '✓' : ''}
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {isEligible && !applicationStatus && (
                    <div className="p-6 bg-zinc-50 dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800">
                      <button 
                        onClick={handleApply}
                        disabled={applying}
                        className="w-full py-4 bg-black dark:bg-white text-white dark:text-black font-black rounded-2xl transition-all active:scale-95 disabled:opacity-50"
                      >
                        {applying ? 'Submitting...' : 'Apply for Creator Program'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ADS MANAGEMENT (ADMIN ONLY) */}
            {activeTab === 'ads' && currentProfile?.is_admin && (
              <div className="p-4 sm:p-8 animate-in fade-in duration-300">
                <AdminAdManager />
              </div>
            )}

            {/* EDIT PROFILE TAB */}
            {activeTab === 'status' && (
              <AccountEditor profile={currentProfile} userId={user?.id} supabase={supabase} onSaved={(p: any) => setCurrentProfile(p)} />
            )}

            {/* ACCOUNT TAB */}
            {activeTab === 'account' && (
              <div className="p-4 sm:p-8 animate-in fade-in duration-200">
                <h3 className="font-bold text-[22px] mb-1">Account Details</h3>
                <p className="text-zinc-500 text-[15px] mb-8 leading-relaxed">Here are your private account details.</p>
                
                <div className="space-y-6">
                  <div className="p-6 bg-zinc-50 dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-zinc-800">
                    <h4 className="font-bold mb-4">Account Information</h4>
                    <div className="space-y-4">
                      <div className="flex flex-col gap-1">
                        <span className="text-[12px] font-bold text-zinc-400 uppercase tracking-wider">Email Address</span>
                        <span className="text-[16px] font-medium">{user?.email}</span>
                      </div>
                      <div className="h-px bg-zinc-100 dark:bg-zinc-800" />
                      <div className="flex flex-col gap-1">
                        <span className="text-[12px] font-bold text-zinc-400 uppercase tracking-wider">Username</span>
                        <span className="text-[16px] font-medium">@{currentProfile?.username}</span>
                      </div>
                      <div className="h-px bg-zinc-100 dark:bg-zinc-800" />
                      <div className="flex flex-col gap-1">
                        <span className="text-[12px] font-bold text-zinc-400 uppercase tracking-wider">Member Since</span>
                        <span className="text-[16px] font-medium">{currentProfile?.created_at ? new Date(currentProfile.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : 'N/A'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* SECURITY TAB */}
            {activeTab === 'security' && (
              <div className="p-4 sm:p-8 animate-in fade-in duration-200 space-y-6">
                <h3 className="font-bold text-[22px] mb-1">Security</h3>
                <p className="text-zinc-500 text-[15px] mb-8">Manage your password and account protection.</p>
                
                <div className="bg-zinc-50 dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-100 dark:border-zinc-800">
                  <h4 className="font-bold mb-2">Change Password</h4>
                  <p className="text-sm text-zinc-500 mb-6">Update your account password.</p>
                  
                  <div className="space-y-4 mb-6">
                    <div className="relative">
                      <input 
                        type={showCurrentPassword ? "text" : "password"}
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        placeholder="Current password (not required if logged in via OAuth)"
                        className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 pr-12 outline-none focus:border-black dark:focus:border-white transition-colors"
                      />
                      <button 
                        type="button"
                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                      >
                        {showCurrentPassword ? <EyeSlashIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
                      </button>
                    </div>
                    
                    <div className="relative">
                      <input 
                        type={showNewPassword ? "text" : "password"}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="New password"
                        className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 pr-12 outline-none focus:border-black dark:focus:border-white transition-colors"
                      />
                      <button 
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                      >
                        {showNewPassword ? <EyeSlashIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3">
                    <button 
                      onClick={async () => {
                        if (!newPassword) return alert('Please enter a new password.')
                        setIsChangingPassword(true)
                        const { error } = await supabase.auth.updateUser({ password: newPassword })
                        setIsChangingPassword(false)
                        if (error) {
                          alert(error.message)
                        } else {
                          alert('Password updated successfully!')
                          setCurrentPassword('')
                          setNewPassword('')
                        }
                      }}
                      disabled={isChangingPassword || !newPassword}
                      className="px-6 py-3 bg-black dark:bg-white text-white dark:text-black font-bold rounded-xl hover:opacity-90 transition-all active:scale-95 disabled:opacity-50"
                    >
                      {isChangingPassword ? 'Updating...' : 'Update Password'}
                    </button>
                    
                    <button 
                      onClick={async () => {
                        if (user?.email) {
                          const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
                            redirectTo: `${window.location.origin}/reset-password`,
                          })
                          if (error) alert(error.message)
                          else alert('Password reset link sent to ' + user.email)
                        }
                      }}
                      className="px-6 py-3 bg-white dark:bg-zinc-800 text-black dark:text-white border border-zinc-200 dark:border-zinc-700 font-bold rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-all active:scale-95"
                    >
                      Send Reset Link
                    </button>
                  </div>
                </div>

                <div className="p-6 bg-zinc-50 dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800">
                  <h4 className="font-bold text-black dark:text-white mb-2 flex items-center gap-2">
                     <ExclamationTriangleIcon className="w-5 h-5" />
                     Danger Zone
                  </h4>
                  <p className="text-zinc-600 dark:text-zinc-400 text-[14px] mb-6 leading-relaxed">
                    Deleting your account is permanent. This cannot be undone.
                  </p>
                  <button 
                    onClick={async () => {
                      if (confirm('ARE YOU ABSOLUTELY SURE? \n\nThis will delete your account forever.')) {
                         const { error } = await supabase.rpc('delete_user_permanently')
                         if (error) alert('Error: ' + error.message)
                         else {
                           await supabase.auth.signOut()
                           window.location.href = '/'
                         }
                      }
                    }}
                    className="px-6 py-3 bg-black dark:bg-white text-white dark:text-black font-bold rounded-xl hover:opacity-90 transition-opacity active:scale-95 text-[15px]"
                  >
                    Delete Account
                  </button>
                </div>
              </div>
            )}

            {/* APPEARANCE TAB */}
            {activeTab === 'appearance' && (
              <div className="p-4 sm:p-8 animate-in fade-in duration-200">
                <h3 className="font-bold text-[18px] mb-1">Appearance</h3>
                <p className="text-zinc-500 text-[15px] mb-6 leading-relaxed">Choose how the app looks for you.</p>
                <div className="space-y-6">
                  {[
                    { id: 'system', label: 'System setting' },
                    { id: 'light',  label: 'Light' },
                    { id: 'dark',   label: 'Dark' }
                  ].map((opt: any) => (
                    <label key={opt.id} className="flex items-center justify-between cursor-pointer group">
                      <span className="text-[16px]">{opt.label}</span>
                      <div className="relative flex items-center justify-center w-6 h-6 border-2 border-zinc-300 dark:border-zinc-700 rounded-full group-hover:border-black dark:group-hover:border-white transition-colors">
                        <input type="radio" name="themeMode" value={opt.id} checked={theme === opt.id} onChange={() => setTheme(opt.id)} className="peer opacity-0 absolute inset-0 cursor-pointer" />
                        <div className="w-3 h-3 bg-black dark:bg-white rounded-full bg-current opacity-0 peer-checked:opacity-100 transition-opacity"></div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* HELP TAB */}
            {activeTab === 'help' && (
              <div className="p-4 sm:p-8 animate-in fade-in duration-200">
                <h2 className="font-bold text-2xl mb-4">Help Center</h2>
                <p className="text-zinc-500 mb-6">Contact support or view our FAQ.</p>
                <div className="space-y-4 text-[16px]">
                  <p><strong>Support Email:</strong> meshackurassa2@gmail.com</p>
                </div>
              </div>
            )}

            {/* ABOUT TAB */}
            {activeTab === 'about' && (
              <div className="p-4 sm:p-8 animate-in fade-in duration-200">
                <h2 className="font-bold text-2xl mb-6">About App</h2>
                <div className="space-y-4 text-[16px] bg-zinc-50 dark:bg-zinc-900 rounded-xl p-6 border border-zinc-100 dark:border-zinc-800">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-black dark:bg-white flex items-center justify-center text-white dark:text-black font-bold">
                      D
                    </div>
                    <div>
                      <p className="font-bold text-zinc-900 dark:text-white">Builders</p>
                      <p className="text-zinc-500">dapazcm 2026</p>
                    </div>
                  </div>
                  <div className="h-px bg-zinc-200 dark:bg-zinc-800 my-4" />
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-blue-600 dark:text-blue-400">
                      @
                    </div>
                    <div>
                      <p className="font-bold text-zinc-900 dark:text-white">Help & Support System</p>
                      <a href="mailto:meshackurassa2@gmail.com" className="text-blue-500 hover:underline">meshackurassa2@gmail.com</a>
                    </div>
                  </div>
                  <div className="h-px bg-zinc-200 dark:bg-zinc-800 my-4" />
                  <div className="flex flex-col gap-3 font-medium text-[15px] sm:flex-row sm:justify-center">
                    <Link href="/terms" className="text-zinc-500 hover:text-black dark:hover:text-white hover:underline underline-offset-4">Terms of Service</Link>
                    <span className="hidden sm:inline text-zinc-300">|</span>
                    <Link href="/privacy" className="text-zinc-500 hover:text-black dark:hover:text-white hover:underline underline-offset-4">Privacy Policy</Link>
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </AppLayout>
  )
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<AppLayout><div className="flex justify-center p-8"><div className="w-6 h-6 border-2 border-zinc-200 border-t-black dark:border-t-white rounded-full animate-spin" /></div></AppLayout>}>
      <SettingsContent />
    </Suspense>
  )
}
