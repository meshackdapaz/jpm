'use client'

import React, { useEffect, useState, Suspense } from 'react'
import Link from 'next/link'
import { AppLayout } from '@/components/AppLayout'
import { createClient } from '@/lib/supabase/client'
import { Post } from '@/components/Post'
import { useSearchParams, useRouter } from 'next/navigation'
import { useI18n } from '@/lib/i18n'
import Cropper from 'react-easy-crop'
import { getCroppedImg } from '@/lib/cropImage'
import { VerifiedBadge } from '@/components/VerifiedBadge'
import { useAuth } from '@/components/AuthProvider'
import { LockClosedIcon, Bars3Icon, ChartBarIcon, ChevronRightIcon, XMarkIcon, UserIcon, GlobeAltIcon, UserPlusIcon, BellIcon, BookmarkIcon, HeartIcon, ClockIcon, AdjustmentsVerticalIcon, UserCircleIcon, QuestionMarkCircleIcon, InformationCircleIcon, ChevronLeftIcon } from '@heroicons/react/24/outline'
import { Switch } from '@headlessui/react'

function ProfileContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const id = searchParams.get('id')
  
  const [profile, setProfile] = useState<any>(null)
  const [posts, setPosts] = useState<any[]>([])
  const [activeTab, setActiveTab] = useState<'posts' | 'reposts' | 'replies' | 'media' | 'likes' | 'archive'>('posts')
  const [loading, setLoading] = useState(true)

  const supabase = createClient()
  const { t } = useI18n()
  const [isEditing, setIsEditing] = useState(false)
  const [uploading, setUploading] = useState(false)
  
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null)

  const { user: currentUser } = useAuth()
  
  const [followers, setFollowers] = useState(0)
  const [following, setFollowing] = useState(0)
  const [isFollowing, setIsFollowing] = useState(false)
  
  const [currentUserProfile, setCurrentUserProfile] = useState<any>(null)
  const [editData, setEditData] = useState<any>({
    full_name: '',
    bio: '',
    interests: '',
    links: '',
    podcast: '',
    settings: {
      isPrivate: false,
      showOnlineStatus: true,
      mentions: 'Everyone',
      tags: 'Everyone'
    }
  })
  
  useEffect(() => {
    async function fetchCurrentUserProfile() {
      if (currentUser) {
        const { data } = await supabase.from('profiles').select('*').eq('id', currentUser.id).single()
        setCurrentUserProfile(data)
      } else {
        setCurrentUserProfile(null)
      }
    }
    fetchCurrentUserProfile()

    async function fetchProfile() {
      if (!id) return
      
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*, settings, last_seen')
        .eq('id', id)
        .single()
      
      if (profileData) {
        setProfile(profileData)
        setEditData({
          full_name: profileData.full_name || '',
          bio: profileData.bio || '',
          interests: profileData.settings?.interests || '',
          links: profileData.settings?.links || '',
          podcast: profileData.settings?.podcast || '',
          settings: {
            isPrivate: !!profileData.settings?.isPrivate,
            showOnlineStatus: profileData.settings?.showOnlineStatus !== false,
            mentions: profileData.settings?.mentions || 'Everyone',
            tags: profileData.settings?.tags || 'Everyone'
          }
        })
      }

      // Fetch follow counts
      const { count: followersCount } = await supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('following_id', id)
      
      const { count: followingCount } = await supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('follower_id', id)
      
      setFollowers(followersCount || 0)
      setFollowing(followingCount || 0)

      // Check if current user follows this profile
      if (currentUser && currentUser.id !== id) {
        const { data: followData } = await supabase
          .from('follows')
          .select('*')
          .eq('follower_id', currentUser.id)
          .eq('following_id', id)
          .maybeSingle()
        
        setIsFollowing(!!followData)
      }

      const { data: postData } = await supabase
        .from('posts')
        .select(`
          *,
          profiles:creator_id(id, full_name, username, avatar_url, is_verified, last_seen, settings),
          likes(count),
          comments(count),
          reposts(count)
        `)
        .eq('creator_id', id)
        .order('created_at', { ascending: false })

      const { data: repostsData } = await supabase
        .from('reposts')
        .select(`
          created_at,
          user_id,
          profiles:user_id(id, full_name, username, avatar_url, is_verified, last_seen, settings),
          post:posts(
            *,
            profiles:creator_id(id, full_name, username, avatar_url, is_verified, last_seen, settings),
            likes(count),
            comments(count),
            reposts(count)
          )
        `)
        .eq('user_id', id)
        .order('created_at', { ascending: false })

      const { data: likesRawData } = await supabase
        .from('likes')
        .select(`
          created_at,
          post:posts(
            *,
            profiles:creator_id(id, full_name, username, avatar_url, is_verified, last_seen, settings),
            likes(count),
            comments(count),
            reposts(count)
          )
        `)
        .eq('user_id', id)
        .order('created_at', { ascending: false })

      let combinedFeed: any[] = []

      if (postData) {
        combinedFeed = [...combinedFeed, ...postData.map((p: any) => ({
          ...p,
          is_repost: false,
          likes_count: p.likes?.[0]?.count || 0,
          comments_count: p.comments?.[0]?.count || 0,
          reposts_count: p.reposts?.[0]?.count || 0
        }))]
      }

      if (repostsData && repostsData.length > 0) {
        const formattedReposts = repostsData
          .map((r: any) => {
            const originalPost = Array.isArray(r.post) ? r.post[0] : r.post
            if (!originalPost) return null

            const reposterProfile = Array.isArray(r.profiles) ? r.profiles[0] : r.profiles

            return {
              ...originalPost,
              feed_created_at: r.created_at,
              is_repost: true,
              reposter_id: r.user_id,
              reposter_name: reposterProfile?.full_name || reposterProfile?.username || 'User',
              likes_count: originalPost.likes?.[0]?.count || 0,
              comments_count: originalPost.comments?.[0]?.count || 0,
              reposts_count: originalPost.reposts?.[0]?.count || 0
            }
          })
          .filter(Boolean)

        combinedFeed = [...combinedFeed, ...formattedReposts]
      }

      if (likesRawData && likesRawData.length > 0) {
        const formattedLikes = likesRawData
          .map((l: any) => {
            const originalPost = Array.isArray(l.post) ? l.post[0] : l.post
            if (!originalPost) return null
            return {
              ...originalPost,
              feed_created_at: l.created_at,
              is_liked_tab: true,
              likes_count: originalPost.likes?.[0]?.count || 0,
              comments_count: originalPost.comments?.[0]?.count || 0,
              reposts_count: originalPost.reposts?.[0]?.count || 0
            }
          })
          .filter(Boolean)

        combinedFeed = [...combinedFeed, ...formattedLikes]
      }

      // Sort by combined feed_created_at or created_at
      combinedFeed.sort((a: any, b: any) => {
        const dateA = new Date(a.feed_created_at || a.created_at).getTime()
        const dateB = new Date(b.feed_created_at || b.created_at).getTime()
        return dateB - dateA
      })

      const uniqueFeed = combinedFeed.filter((v: any, i: number, a: any[]) => a.findIndex(t => (t.id === v.id && t.is_repost === v.is_repost && t.is_liked_tab === v.is_liked_tab)) === i)

      setPosts(uniqueFeed)
      setLoading(false)
    }

    if (id) {
      fetchProfile()
      
      const channel = supabase
        .channel(`public:follows:${id}`)
        .on('postgres_changes', { 
          event: '*', 
          schema: 'public', 
          table: 'follows',
          filter: `following_id=eq.${id}`
        }, () => {
          supabase
            .from('follows')
            .select('*', { count: 'exact', head: true })
            .eq('following_id', id)
            .then(({ count }: { count: number | null }) => setFollowers(count || 0))
        })
        .subscribe()

      return () => {
        supabase.removeChannel(channel)
      }
    } else {
      setLoading(false)
    }
  }, [id, currentUser, supabase])

  const handleToggleVerify = async () => {
    if (!currentUserProfile?.is_admin || !id) return
    const newStatus = !profile.is_verified
    const { error } = await supabase.from('profiles').update({ is_verified: newStatus }).eq('id', id)
    if (!error) setProfile({ ...profile, is_verified: newStatus })
  }


  const handleFollow = async () => {
    if (!currentUser || !id) return
    if (isFollowing) {
      await supabase.from('follows').delete().eq('follower_id', currentUser.id).eq('following_id', id)
      setIsFollowing(false)
    } else {
      await supabase.from('follows').insert({ follower_id: currentUser.id, following_id: id })
      setIsFollowing(true)
      if (currentUser.id !== id) {
        await supabase.from('notifications').insert({ user_id: id, actor_id: currentUser.id, type: 'follow' })
      }
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedImage(URL.createObjectURL(e.target.files[0]))
    }
  }

  const saveCroppedImage = async () => {
    if (!selectedImage || !croppedAreaPixels || !id) return
    setUploading(true)
    try {
      const croppedImageBlob = await getCroppedImg(selectedImage, croppedAreaPixels)
      if (!croppedImageBlob) return
      const filePath = `${id}-${Math.random()}.jpeg`
      await supabase.storage.from('avatars').upload(filePath, croppedImageBlob)
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filePath)
      await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', id)
      setProfile({ ...profile, avatar_url: publicUrl })
      setSelectedImage(null)
    } finally {
      setUploading(false)
    }
  }

  if (!id) return <AppLayout><div className="p-8 text-center text-zinc-500">Profile not found</div></AppLayout>

  if (loading) return (
    <AppLayout>
      <div className="p-8 animate-pulse space-y-4">
        <div className="w-24 h-24 bg-zinc-200 dark:bg-zinc-800 rounded-full"></div>
        <div className="h-6 bg-zinc-200 dark:bg-zinc-800 w-1/4 rounded"></div>
      </div>
    </AppLayout>
  )

  const isOwner = currentUser?.id === id

  return (
    <AppLayout>
      {/* Image Cropper Modal */}
      {selectedImage && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-white dark:bg-zinc-900 rounded-xl w-full max-w-lg overflow-hidden flex flex-col h-[500px]">
            <div className="relative flex-grow bg-black">
              <Cropper
                image={selectedImage}
                crop={crop}
                zoom={zoom}
                aspect={1}
                onCropChange={setCrop}
                onCropComplete={(_, px: any) => setCroppedAreaPixels(px)}
                onZoomChange={setZoom}
              />
            </div>
            <div className="p-4 border-t border-zinc-200 dark:border-zinc-800">
              <div className="flex gap-4 items-center mb-4">
                <span className="text-sm font-bold w-12 text-zinc-500">Zoom</span>
                <input type="range" value={zoom} min={1} max={3} step={0.1} onChange={(e) => setZoom(Number(e.target.value))} className="w-full" />
              </div>
              <div className="flex gap-2 justify-end">
                <button onClick={() => setSelectedImage(null)} disabled={uploading} className="px-4 py-2 bg-zinc-200 dark:bg-zinc-800 rounded-full font-bold">Cancel</button>
                <button onClick={saveCroppedImage} disabled={uploading} className="px-6 py-2 bg-blue-500 text-white font-bold rounded-full">{uploading ? 'Saving...' : 'Save'}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Profile Header — Threads style */}
      <div className="sm:hidden sticky top-0 z-30 bg-white dark:bg-black border-b border-zinc-100 dark:border-zinc-900">
        <div className="flex items-center justify-between px-4 h-14">
          {/* Analytics / insights icon top-left - Only for owner */}
          {isOwner ? (
            <Link href="/insights" aria-label="Insights" className="w-10 h-10 flex items-center justify-start text-zinc-700 dark:text-zinc-300">
              <ChartBarIcon className="w-6 h-6" />
            </Link>
          ) : (
            <div className="w-10 h-10" />
          )}
          
          <div className="flex items-center gap-2">
            {/* Hamburger / more options top-right - Only for owner */}
            {isOwner ? (
              <button
                aria-label="Menu"
                onClick={() => router.push('/settings')}
                className="w-10 h-10 flex items-center justify-end text-zinc-700 dark:text-zinc-300"
              >
                <Bars3Icon className="w-6 h-6" />
              </button>
            ) : (
              <div className="w-10 h-10" />
            )}
          </div>
        </div>
      </div>

      {/* Desktop header */}
      <div className="hidden sm:flex sticky top-0 z-30 bg-white/95 dark:bg-black/95 backdrop-blur-xl border-b border-zinc-100 dark:border-zinc-900">
        <div className="flex items-center justify-between px-4 h-14 w-full">
          <div>
            <p className="font-black text-[17px] tracking-tight leading-none">{profile?.full_name || 'Profile'}</p>
            {profile?.username && <p className="text-zinc-400 text-[12px]">@{profile.username}</p>}
          </div>
          {isOwner ? (
            <button
              aria-label="Menu"
              onClick={() => router.push('/settings')}
              className="w-10 h-10 flex items-center justify-center text-zinc-500"
            >
              <Bars3Icon className="w-6 h-6" />
            </button>
          ) : (
            <div className="w-10 h-10" />
          )}
        </div>
      </div>

      <div className="px-4 pt-4">
        {/* Top row: display info left, avatar right */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-grow min-w-0 pr-4">
            {/* Fixed Name/Username Info */}
            <h1 className="text-[24px] font-black leading-tight flex items-center gap-1.5">
              {profile?.full_name}
              {profile?.is_verified && <VerifiedBadge className="w-5 h-5" />}
            </h1>
            <p className="text-zinc-500 text-[14px] mt-0.5">@{profile?.username}</p>
            {profile?.bio && <p className="mt-2.5 text-[14px] whitespace-pre-wrap text-zinc-800 dark:text-zinc-200 leading-snug">{profile.bio}</p>}
            
            {/* Display Interests/Links if they exist */}
            <div className="flex flex-wrap gap-2 mt-2">
              {profile?.settings?.links && (
                <a href={profile.settings.links} target="_blank" rel="noopener noreferrer" className="text-blue-500 text-[13px] hover:underline flex items-center gap-1">
                   {profile.settings.links.replace(/^https?:\/\/(www\.)?/, '')}
                </a>
              )}
            </div>

            {/* Follower count */}
            <button className="mt-3 flex items-center gap-1.5 text-zinc-500 text-[13px] hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors">
              <span className="font-bold text-zinc-900 dark:text-zinc-100">{followers}</span> followers
              <span className="text-zinc-300 dark:text-zinc-700 mx-0.5">·</span>
              <span className="font-bold text-zinc-900 dark:text-zinc-100">{following}</span> following
            </button>
          </div>

          {/* Avatar — top right with + button for owner */}
          <div className="relative flex-none">
            <div className="w-[72px] h-[72px] sm:w-24 sm:h-24 rounded-full bg-zinc-200 dark:bg-zinc-800 overflow-hidden ring-[1.5px] ring-zinc-200 dark:ring-zinc-700">
              {profile?.avatar_url
                ? <img src={profile.avatar_url} className="w-full h-full object-cover" alt={profile.full_name} />
                : <div className="w-full h-full flex items-center justify-center text-2xl font-bold text-zinc-500">{profile?.full_name?.[0] || 'U'}</div>}
            </div>
            {isOwner && (
              <label className="absolute -bottom-1 -right-1 w-7 h-7 bg-white dark:bg-zinc-950 border-2 border-zinc-200 dark:border-zinc-700 rounded-full flex items-center justify-center cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors shadow-sm">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 text-zinc-700 dark:text-zinc-200" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                <input type="file" accept="image/*" className="hidden" onChange={handleFileSelect} disabled={uploading} />
              </label>
            )}
          </div>
        </div>

        {/* Action buttons row */}
        {!isEditing && (
          <div className="flex gap-2 mb-1">
            {isOwner ? (
              <>
                <button
                  onClick={() => setIsEditing(true)}
                  className="flex-1 py-2 border border-zinc-200 dark:border-zinc-700 rounded-xl text-[14px] font-bold text-zinc-900 dark:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors"
                >
                  Edit profile
                </button>
                <button
                  className="flex-1 py-2 border border-zinc-200 dark:border-zinc-700 rounded-xl text-[14px] font-bold text-zinc-900 dark:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors"
                >
                  Share profile
                </button>
              </>
            ) : (
              <>
                {currentUserProfile?.is_admin && (
                  <button onClick={handleToggleVerify} className={`px-4 py-2 text-sm border rounded-xl font-bold ${
                    profile?.is_verified ? 'border-red-400 text-red-500' : 'bg-black text-white border-black'
                  }`}>
                    {profile?.is_verified ? 'Unverify' : 'Verify'}
                  </button>
                )}
                <button
                  onClick={handleFollow}
                  className={`flex-1 py-2 rounded-xl text-[14px] font-bold transition-all ${
                    isFollowing
                      ? 'border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300'
                      : 'bg-black dark:bg-white text-white dark:text-black'
                  }`}
                >
                  {isFollowing ? 'Following' : 'Follow'}
                </button>
                {currentUser && (
                  <Link
                    href={`/messages?userId=${id}`}
                    className="flex-1 py-2 border border-zinc-200 dark:border-zinc-700 rounded-xl text-[14px] font-bold text-center text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors"
                  >
                    Message
                  </Link>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* ── Professional Profile Settings Modal (Mockup Redesign) ── */}
      {isEditing && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white dark:bg-zinc-900 w-[92%] max-w-[400px] rounded-[32px] overflow-hidden flex flex-col shadow-2xl animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="relative px-6 py-6 border-b border-zinc-50 dark:border-zinc-800/50">
              <h2 className="text-[22px] font-bold text-zinc-900 dark:text-zinc-100">Profile Settings</h2>
              <button 
                onClick={() => setIsEditing(false)} 
                className="absolute right-6 top-7 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
              {/* Display Name Section */}
              <div className="space-y-2">
                <p className="text-[14px] font-bold text-zinc-900 dark:text-zinc-100 ml-1">Display Name</p>
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2">
                    <UserIcon className="w-5 h-5 text-zinc-400 group-focus-within:text-blue-500 transition-colors" />
                  </div>
                  <input 
                    type="text"
                    value={editData.full_name}
                    onChange={e => setEditData({...editData, full_name: e.target.value})}
                    className="w-full bg-white dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-2xl py-4 pl-12 pr-4 text-[16px] font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                    placeholder="Enter name"
                  />
                </div>
              </div>

              {/* Bio Section */}
              <div className="space-y-2">
                <p className="text-[14px] font-bold text-zinc-900 dark:text-zinc-100 ml-1">Bio</p>
                <textarea 
                  value={editData.bio} 
                  onChange={e => setEditData({...editData, bio: e.target.value})}
                  className="w-full bg-white dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-2xl p-4 text-[15px] font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all resize-none leading-relaxed min-h-[120px]"
                  placeholder="Tell us about yourself..."
                />
              </div>

              <div className="h-[1px] bg-zinc-100 dark:bg-zinc-800 w-full" />

              {/* Preferences Section */}
              <div className="space-y-5">
                <h3 className="text-[18px] font-bold text-zinc-900 dark:text-zinc-100">Preferences</h3>
                
                {/* Account Privacy - Segmented Control */}
                <div className="space-y-3">
                  <p className="text-[14px] font-bold text-zinc-900 dark:text-zinc-100 ml-1">Account Privacy</p>
                  <div className="flex gap-3">
                    <button 
                      onClick={() => setEditData({ ...editData, settings: { ...editData.settings, isPrivate: false }})}
                      className={`flex-1 py-3.5 rounded-2xl flex items-center justify-center gap-2 text-[15px] font-bold transition-all border-2 ${
                        !editData.settings.isPrivate 
                        ? 'bg-blue-50/50 border-blue-500 text-blue-600 dark:bg-blue-500/10 dark:border-blue-500 dark:text-blue-400' 
                        : 'bg-white border-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:border-zinc-700'
                      }`}
                    >
                      <GlobeAltIcon className="w-5 h-5" />
                      Public
                    </button>
                    <button 
                      onClick={() => setEditData({ ...editData, settings: { ...editData.settings, isPrivate: true }})}
                      className={`flex-1 py-3.5 rounded-2xl flex items-center justify-center gap-2 text-[15px] font-bold transition-all border-2 ${
                        editData.settings.isPrivate 
                        ? 'bg-blue-50/50 border-blue-500 text-blue-600 dark:bg-blue-500/10 dark:border-blue-500 dark:text-blue-400' 
                        : 'bg-white border-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:border-zinc-700'
                      }`}
                    >
                      <LockClosedIcon className="w-5 h-5" />
                      Private
                    </button>
                  </div>
                </div>

                {/* Show Online Status */}
                <div className="flex items-center justify-between py-2 group">
                  <div className="flex-1 pr-4">
                    <p className="text-[15px] font-bold text-zinc-900 dark:text-zinc-100">Show Online Status</p>
                    <p className="text-[13px] text-zinc-400 mt-1">Allow others to see when you're active</p>
                  </div>
                  <Switch
                    checked={editData.settings.showOnlineStatus}
                    onChange={(val: boolean) => setEditData({ ...editData, settings: { ...editData.settings, showOnlineStatus: val }})}
                    className={`${editData.settings.showOnlineStatus ? 'bg-blue-600' : 'bg-zinc-200 dark:bg-zinc-800'} relative inline-flex h-7 w-12 items-center rounded-full transition-colors focus:outline-none ring-2 ring-transparent group-active:ring-blue-500/20`}
                  >
                    <span className={`${editData.settings.showOnlineStatus ? 'translate-x-6' : 'translate-x-1'} inline-block h-5 w-5 transform rounded-full bg-white transition-transform shadow-sm`} />
                  </Switch>
                </div>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="p-6 pt-0 flex gap-4 mt-auto">
              <button 
                onClick={() => setIsEditing(false)} 
                className="flex-1 py-4 border border-zinc-200 dark:border-zinc-700 rounded-2xl text-[16px] font-bold text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={async () => {
                  setUploading(true)
                  const { error } = await supabase
                    .from('profiles')
                    .update({ 
                      full_name: editData.full_name,
                      bio: editData.bio,
                      settings: {
                        ...profile?.settings,
                        ...editData.settings
                      }
                    })
                    .eq('id', id)
                  
                  if (!error) {
                    setProfile({ 
                      ...profile, 
                      full_name: editData.full_name, 
                      bio: editData.bio,
                      settings: {
                        ...profile?.settings,
                        ...editData.settings
                      }
                    })
                    setIsEditing(false)
                  }
                  setUploading(false)
                }} 
                disabled={uploading}
                className="flex-1 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-[16px] font-bold shadow-lg shadow-blue-500/20 transition-all disabled:opacity-50"
              >
                {uploading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}


      {/* ── Content Tabs — Threads style ── */}
      <div className="border-t border-zinc-100 dark:border-zinc-900 mt-2">
        <div className="flex border-b border-zinc-100 dark:border-zinc-900 overflow-x-auto hide-scrollbar">
          {(isOwner 
            ? ['posts', 'replies', 'media', 'reposts', 'likes', 'archive'] as const
            : ['posts', 'replies', 'media', 'reposts', 'likes'] as const
          ).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`flex-1 py-3.5 text-[13px] font-semibold capitalize relative whitespace-nowrap min-w-0 transition-colors ${
                activeTab === tab
                  ? 'text-black dark:text-white'
                  : 'text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300'
              }`}
            >
              {tab === 'posts' ? 'Threads' : tab.charAt(0).toUpperCase() + tab.slice(1)}
              {activeTab === tab && (
                <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-10 h-[2px] bg-black dark:bg-white rounded-full" />
              )}
            </button>
          ))}
        </div>
        
        <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
          {(() => {
            const isPrivate = profile?.settings?.isPrivate
            const canSeeContent = !isPrivate || isFollowing || isOwner

            if (!canSeeContent) return (
              <div className="p-12 text-center text-zinc-500">
                <LockClosedIcon className="w-10 h-10 mx-auto mb-4 opacity-20" />
                <h3 className="text-xl font-bold">This account is private</h3>
              </div>
            )

            const filteredPosts = posts.filter((post: any) => {
              if (activeTab === 'reposts') return post.is_repost && !post.is_archived
              if (activeTab === 'likes')   return post.is_liked_tab && !post.is_archived
              if (activeTab === 'archive') return post.is_archived && !post.is_repost && !post.is_liked_tab
              if (activeTab === 'media')   return !post.is_repost && !post.is_liked_tab && !post.is_archived && (post.image_url || (post.image_urls && post.image_urls.length > 0))
              if (activeTab === 'replies') return !post.is_repost && !post.is_liked_tab && !post.is_archived && post.parent_id
              return !post.is_repost && !post.is_archived && !post.is_liked_tab // 'posts' (Threads) tab
            })

            return (
              <>
                {filteredPosts.map((post: any) => <Post key={`${post.id}-${post.is_repost}`} post={post} />)}
                {filteredPosts.length === 0 && <div className="p-8 text-center text-zinc-400 text-sm">No {activeTab === 'posts' ? 'threads' : activeTab} yet.</div>}
              </>
            )
          })()}
        </div>
      </div>
      {/* Bottom spacer for mobile nav */}
      <div className="h-28 sm:h-8" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }} />
    </AppLayout>
  )
}

export default function ProfilePage() {
  return (
    <Suspense fallback={<AppLayout><div className="p-8 text-center text-zinc-500 font-bold italic">Loading profile...</div></AppLayout>}>
      <ProfileContent />
    </Suspense>
  )
}
