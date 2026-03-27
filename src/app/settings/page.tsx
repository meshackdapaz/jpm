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
  PhotoIcon
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
  const [saving, setSaving]     = useState(false)
  const [error,  setError]      = useState<string | null>(null)
  const [success, setSuccess]   = useState(false)

  useEffect(() => {
    setFullName(profile?.full_name || '')
    setUsername(profile?.username || '')
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
      .from('profiles').update({ full_name: fullName.trim(), username: clean })
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
      <p className="text-zinc-500 text-[15px] mb-6 leading-relaxed">Update your display name and username. Usernames must be unique.</p>
      <form onSubmit={handleSave} className="space-y-4">
        {error   && <div className="bg-red-50   dark:bg-red-950/30   text-red-600   dark:text-red-400   p-3 rounded-xl text-sm border border-red-100   dark:border-red-900">{error}</div>}
        {success && <div className="bg-green-50 dark:bg-green-950/30 text-green-600 dark:text-green-400 p-3 rounded-xl text-sm border border-green-100 dark:border-green-900">✅ Profile saved!</div>}
        <div>
          <label className="block text-[13px] font-semibold text-zinc-500 mb-1.5">Full Name</label>
          <input type="text" value={fullName} onChange={e => setFullName(e.target.value)}
            className="w-full px-4 py-3 bg-zinc-100 dark:bg-zinc-900 rounded-xl outline-none text-[15px] focus:ring-1 focus:ring-zinc-300 dark:focus:ring-zinc-700 transition"
            placeholder="Your full name" />
        </div>
        <div>
          <label className="block text-[13px] font-semibold text-zinc-500 mb-1.5">Username</label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none">@</span>
            <input type="text" value={username}
              onChange={e => { setUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, '').toLowerCase()); setError(null) }}
              className="w-full pl-8 pr-4 py-3 bg-zinc-100 dark:bg-zinc-900 rounded-xl outline-none text-[15px] focus:ring-1 focus:ring-zinc-300 dark:focus:ring-zinc-700 transition"
              placeholder="username" />
          </div>
          <p className="text-xs text-zinc-400 mt-1.5">Only letters, numbers and underscores. Must be unique.</p>
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
        supabase.from('profiles').update({ settings: newSettings }).eq('id', user.id).then(({ error }: { error: any }) => {
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
    { id: 'account',     label: 'Account',          icon: InformationCircleIcon },
    { id: 'monetization',label: 'Monetization',    icon: BanknotesIcon },
    ...(currentProfile?.is_admin ? [{ id: 'ads', label: 'Ads Management', icon: MegaphoneIcon }] : []),
    { id: 'appearance',  label: 'Appearance',       icon: SunIcon },
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
                  <div className="bg-zinc-50 dark:bg-zinc-900/50 p-6 rounded-[24px] border border-zinc-100 dark:border-zinc-800">
                    <p className="text-zinc-500 text-sm font-bold mb-1">Estimated Revenue</p>
                    <h4 className="text-3xl font-black">${currentProfile?.monetization_earnings?.toFixed(2) || '0.00'}</h4>
                    <div className="mt-4 flex items-center gap-2 text-zinc-400 text-xs">
                      <ChartBarSquareIcon className="w-4 h-4" />
                      Updated every 24 hours
                    </div>
                  </div>
                  <div className="bg-zinc-50 dark:bg-zinc-900/50 p-6 rounded-[24px] border border-zinc-100 dark:border-zinc-800">
                    <p className="text-zinc-500 text-sm font-bold mb-1">Status</p>
                    <h4 className={`text-xl font-bold flex items-center gap-2 ${
                      applicationStatus === 'approved' ? 'text-green-600 dark:text-green-400' :
                      applicationStatus === 'pending' ? 'text-amber-600 dark:text-amber-500' :
                      applicationStatus === 'declined' ? 'text-red-500' :
                      'text-yellow-600 dark:text-yellow-500'
                    }`}>
                      {applicationStatus === 'approved' ? 'Active Creator' :
                       applicationStatus === 'pending' ? 'Pending Review' :
                       applicationStatus === 'declined' ? 'Declined' :
                       'Not Eligible'}
                    </h4>
                    <p className="mt-2 text-xs text-zinc-400">
                      {applicationStatus === 'approved' ? 'Congratulations! You are earning from your memes.' :
                       applicationStatus === 'pending' ? 'Our team is reviewing your application.' :
                       'Keep posting high-quality memes to unlock monetization!'}
                    </p>
                  </div>
                </div>

                <div className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-[28px] overflow-hidden">
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
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center ${item.done ? 'bg-green-100 dark:bg-green-900/40 text-green-600' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400'}`}>
                          {item.done ? '✓' : ''}
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {isEligible && !applicationStatus && (
                    <div className="p-6 bg-amber-50 dark:bg-amber-950/20 border-t border-amber-100 dark:border-amber-900/40">
                      <button 
                        onClick={handleApply}
                        disabled={applying}
                        className="w-full py-4 bg-amber-500 text-black font-black rounded-2xl hover:bg-amber-400 transition-all shadow-lg shadow-amber-500/20 active:scale-95 disabled:opacity-50"
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

            {/* ACCOUNT TAB / DELETE ACCOUNT */}
            {activeTab === 'account' && (
              <div className="p-4 sm:p-8 animate-in fade-in duration-200">
                <h3 className="font-bold text-[18px] mb-1">Account Settings</h3>
                <p className="text-zinc-500 text-[15px] mb-8 leading-relaxed">Manage your account information and privacy.</p>
                
                <div className="space-y-6">
                  <div className="p-6 bg-zinc-50 dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-zinc-800">
                    <h4 className="font-bold mb-2">Account Information</h4>
                    <div className="space-y-4 text-[15px]">
                      <div className="flex justify-between">
                        <span className="text-zinc-500">Email</span>
                        <span className="font-medium">{user?.email}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-500">Joined</span>
                        <span className="font-medium">{currentProfile?.date_joined || 'N/A'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-6 bg-red-50 dark:bg-red-950/20 rounded-2xl border border-red-100 dark:border-red-900/40">
                    <h4 className="font-bold text-red-600 dark:text-red-400 mb-2 flex items-center gap-2">
                       <ExclamationTriangleIcon className="w-5 h-5" />
                       Danger Zone
                    </h4>
                    <p className="text-zinc-600 dark:text-zinc-400 text-[14px] mb-6 leading-relaxed">
                      Deleting your account is permanent. All your posts, likes, followers, and earnings will be erased forever. This action cannot be undone.
                    </p>
                    <button 
                      onClick={async () => {
                        if (confirm('ARE YOU ABSOLUTELY SURE? \n\nThis will delete your account forever. This is non-reversible.')) {
                          if (confirm('FINAL WARNING: Do you really want to delete EVERYTHING?')) {
                             const { error } = await supabase.rpc('delete_user_permanently')
                             if (error) {
                               alert('Error deleting account: ' + error.message)
                             } else {
                               await supabase.auth.signOut()
                               window.location.href = '/'
                             }
                          }
                        }
                      }}
                      className="px-6 py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition-colors shadow-lg shadow-red-600/10 active:scale-95 text-[15px]"
                    >
                      Delete Account Forever
                    </button>
                  </div>
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
