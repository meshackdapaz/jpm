'use client'

import React, { useEffect, useState, Suspense } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { AppLayout } from '@/components/AppLayout'
import { createClient } from '@/lib/supabase/client'
import { Post } from '@/components/Post'
import { InlineFeedAd } from '@/components/InlineFeedAd'
import { useSearchParams, useRouter } from 'next/navigation'
import { useI18n } from '@/lib/i18n'
import Cropper from 'react-easy-crop'
import { getCroppedImg } from '@/lib/cropImage'
import { VerifiedBadge } from '@/components/VerifiedBadge'
import { useAuth } from '@/components/AuthProvider'
import { LockClosedIcon, Bars3Icon, ChartBarIcon, ChevronRightIcon, XMarkIcon, UserIcon, GlobeAltIcon, UserPlusIcon, BellIcon, BookmarkIcon, HeartIcon, ClockIcon, AdjustmentsVerticalIcon, UserCircleIcon, QuestionMarkCircleIcon, InformationCircleIcon, ChevronLeftIcon, QrCodeIcon } from '@heroicons/react/24/outline'
import { QRCodeSVG } from 'qrcode.react'
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
  const [showSocialLinks, setShowSocialLinks] = useState(false)
  const [socialData, setSocialData] = useState({ tiktok_url: '', instagram_url: '', facebook_url: '', website_url: '' })
  const [savingSocial, setSavingSocial] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [showQRCode, setShowQRCode] = useState(false)
  
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
    tiktok_url: '',
    instagram_url: '',
    facebook_url: '',
    website_url: '',
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
      
      const postSel = '*, quoted_post:quoted_post_id(id, content, profiles:creator_id(id, username, full_name, avatar_url)), profiles:creator_id(id, full_name, username, avatar_url, is_verified, last_seen, settings), likes(count), comments(count), reposts(count)'

      // Phase 1: Everything in Parallel
      const [profileRes, followersRes, followingRes, followCheckRes, postsRes, repostsRes, likesRes, bookmarksRes] = await Promise.all([
        supabase.from('profiles').select('*, settings, last_seen').eq('id', id).single(),
        supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', id),
        supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', id),
        currentUser && currentUser.id !== id 
          ? supabase.from('follows').select('*').eq('follower_id', currentUser.id).eq('following_id', id).maybeSingle()
          : Promise.resolve({ data: null }),
        supabase.from('posts').select(postSel).eq('creator_id', id).order('is_pinned', { ascending: false }).order('created_at', { ascending: false }).limit(20),
        supabase.from('reposts').select(`created_at, user_id, profiles:user_id(id, full_name, username, avatar_url, is_verified, last_seen, settings), post:posts(${postSel})`).eq('user_id', id).order('created_at', { ascending: false }).limit(20),
        supabase.from('likes').select(`created_at, post:posts(${postSel})`).eq('user_id', id).order('created_at', { ascending: false }).limit(20),
        supabase.from('bookmarks').select(`created_at, post:posts(${postSel})`).eq('user_id', id).order('created_at', { ascending: false }).limit(20)
      ])
      
      if (profileRes.data) {
        const pd = profileRes.data
        setProfile(pd)
        setEditData({
          full_name: pd.full_name || '',
          bio: pd.bio || '',
          tiktok_url: pd.tiktok_url || '',
          instagram_url: pd.instagram_url || '',
          facebook_url: pd.facebook_url || '',
          website_url: pd.website_url || '',
          settings: {
            isPrivate: !!pd.settings?.isPrivate,
            showOnlineStatus: pd.settings?.showOnlineStatus !== false,
            mentions: pd.settings?.mentions || 'Everyone',
            tags: pd.settings?.tags || 'Everyone'
          }
        })
      }
      setFollowers(followersRes.count || 0)
      setFollowing(followingRes.count || 0)
      setIsFollowing(!!followCheckRes.data)

      let combinedFeed: any[] = []

      if (postsRes.data) {
        combinedFeed = [...combinedFeed, ...postsRes.data.map((p: any) => ({
          ...p,
          is_repost: false,
          likes_count: p.likes?.[0]?.count || 0,
          comments_count: p.comments?.[0]?.count || 0,
          reposts_count: p.reposts?.[0]?.count || 0
        }))]
      }

      if (repostsRes.data) {
        const formattedReposts = repostsRes.data
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

      if (likesRes.data) {
        const formattedLikes = likesRes.data
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

      if (bookmarksRes.data) {
        const formattedBookmarks = bookmarksRes.data
          .map((b: any) => {
            const originalPost = Array.isArray(b.post) ? b.post[0] : b.post
            if (!originalPost) return null
            return {
              ...originalPost,
              feed_created_at: b.created_at,
              is_bookmarked_tab: true,
              likes_count: originalPost.likes?.[0]?.count || 0,
              comments_count: originalPost.comments?.[0]?.count || 0,
              reposts_count: originalPost.reposts?.[0]?.count || 0
            }
          })
          .filter(Boolean)
        combinedFeed = [...combinedFeed, ...formattedBookmarks]
      }

      combinedFeed.sort((a: any, b: any) => {
        const dateA = new Date(a.feed_created_at || a.created_at).getTime()
        const dateB = new Date(b.feed_created_at || b.created_at).getTime()
        return dateB - dateA
      })

      const uniqueFeed = combinedFeed.filter((v: any, i: number, a: any[]) => a.findIndex(t => (t.id === v.id && t.is_repost === v.is_repost && t.is_liked_tab === v.is_liked_tab && t.is_bookmarked_tab === v.is_bookmarked_tab)) === i)

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

      // Use a fixed path per user so the same URL is always reused (no orphan files)
      const filePath = `${id}/avatar.jpeg`
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, croppedImageBlob, {
          contentType: 'image/jpeg',
          upsert: true,     // overwrite if already exists
          cacheControl: '0', // tell storage not to cache
        })

      if (uploadError) {
        console.error('[Avatar] Upload error:', uploadError)
        return
      }

      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filePath)
      // Append a cache-buster so the browser fetches the new image
      const avatarUrl = `${publicUrl}?t=${Date.now()}`
      await supabase.from('profiles').update({ avatar_url: avatarUrl }).eq('id', id)
      setProfile({ ...profile, avatar_url: avatarUrl })
      setSelectedImage(null)
    } finally {
      setUploading(false)
    }
  }

  if (!id) return <AppLayout isPublic><div className="p-8 text-center text-zinc-500">Profile not found</div></AppLayout>

  if (loading) return (
    <AppLayout isPublic>
      <div className="px-4 pt-8 animate-pulse">
        {/* Skeleton Header: Info Left, Avatar Right */}
        <div className="flex items-start justify-between mb-8">
          <div className="flex-grow space-y-4 pr-6">
            <div className="h-8 bg-zinc-200 dark:bg-zinc-800 rounded-xl w-3/4"></div>
            <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded-lg w-1/4"></div>
            <div className="space-y-2 pt-2">
              <div className="h-3.5 bg-zinc-100 dark:bg-zinc-900 rounded-lg w-full"></div>
              <div className="h-3.5 bg-zinc-100 dark:bg-zinc-900 rounded-lg w-5/6"></div>
            </div>
            <div className="h-4 bg-zinc-100 dark:bg-zinc-900 rounded-full w-1/3 mt-6"></div>
          </div>
          <div className="w-20 h-20 sm:w-24 sm:h-24 bg-zinc-200 dark:bg-zinc-800 rounded-full flex-none"></div>
        </div>
        
        {/* Skeleton Tabs */}
        <div className="flex border-b border-zinc-100 dark:border-zinc-900 mb-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="flex-1 py-4 flex justify-center">
              <div className="h-3 bg-zinc-100 dark:bg-zinc-900 rounded-full w-12"></div>
            </div>
          ))}
        </div>

        {/* Skeleton Posts */}
        <div className="space-y-6 pt-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="flex gap-4">
              <div className="w-10 h-10 rounded-full bg-zinc-100 dark:bg-zinc-900 flex-none"></div>
              <div className="flex-grow space-y-3">
                <div className="h-3.5 bg-zinc-100 dark:bg-zinc-900 rounded-lg w-1/3"></div>
                <div className="h-32 bg-zinc-50 dark:bg-zinc-900/40 rounded-2xl w-full"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppLayout>
  )

  const isOwner = currentUser?.id === id

  return (
    <AppLayout isPublic>
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

      {/* Mobile Profile Header — Echo style */}
      <div className="sm:hidden sticky top-0 z-30 bg-white dark:bg-black border-b border-zinc-100 dark:border-zinc-900 pt-[env(safe-area-inset-top)]">
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
            {profile?.bio && <p className="mt-2 text-[14px] whitespace-pre-wrap text-zinc-800 dark:text-zinc-200 leading-snug">{profile.bio}</p>}
            
            {/* Social Icons Row */}
            <div className="flex items-center gap-4 mt-4 min-h-[40px]">
              {(profile?.tiktok_url || profile?.instagram_url || profile?.facebook_url || profile?.website_url) ? (
                <>
              {profile?.tiktok_url && (
                <a href={profile.tiktok_url} target="_blank" rel="noopener noreferrer"
                  className="text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors" title="TikTok">
                  <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1.04-.1z"/></svg>
                </a>
              )}
              {profile?.instagram_url && (
                <a href={profile.instagram_url} target="_blank" rel="noopener noreferrer"
                  className="text-zinc-500 dark:text-zinc-400 hover:text-pink-600 transition-colors" title="Instagram">
                  <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.981 1.28.058 1.688.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.058-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
                </a>
              )}
              {profile?.facebook_url && (
                <a href={profile.facebook_url} target="_blank" rel="noopener noreferrer"
                  className="text-zinc-500 dark:text-zinc-400 hover:text-blue-600 transition-colors" title="Facebook">
                  <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                </a>
              )}
                  {profile?.website_url && (
                    <a href={profile.website_url} target="_blank" rel="noopener noreferrer"
                      className="text-zinc-500 dark:text-zinc-400 hover:text-blue-400 transition-colors" title="Website">
                      <GlobeAltIcon className="w-5 h-5" />
                    </a>
                  )}
                </>
              ) : null}
              {isOwner && (
                <button 
                  onClick={() => {
                    setSocialData({
                      tiktok_url: profile?.tiktok_url || '',
                      instagram_url: profile?.instagram_url || '',
                      facebook_url: profile?.facebook_url || '',
                      website_url: profile?.website_url || ''
                    })
                    setShowSocialLinks(true)
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-50 dark:bg-zinc-900 text-zinc-500 text-[12px] font-bold border border-dashed border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 transition-all"
                >
                  <UserPlusIcon className="w-4 h-4" />
                  Add social links
                </button>
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
        <div className="flex gap-2 mb-1">
            {isOwner ? (
              <>
                <button
                  onClick={() => router.push('/settings?tab=status')}
                  className="flex-1 py-2 border border-zinc-200 dark:border-zinc-700 rounded-xl text-[14px] font-bold text-zinc-900 dark:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors"
                >
                  Edit profile
                </button>
                <button
                  onClick={() => setShowQRCode(true)}
                  className="px-3 py-2 border border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors"
                  title="Show QR Code"
                >
                  <QrCodeIcon className="w-5 h-5" />
                </button>
                <button
                  onClick={async () => {
                    const siteUrl = 'https://jpmtz.online';
                    const url = `${siteUrl}/profile?id=${profile.id}`;
                    if (navigator.share) {
                      await navigator.share({
                        title: `${profile.full_name}'s Profile`,
                        text: `Check out @${profile.username} on JPM`,
                        url
                      });
                    } else {
                      await navigator.clipboard.writeText(url);
                      alert('Link copied to clipboard!');
                    }
                  }}
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
                  onClick={() => setShowQRCode(true)}
                  className="px-3 py-2 border border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors"
                  title="Show QR Code"
                >
                  <QrCodeIcon className="w-5 h-5" />
                </button>
                <button
                  onClick={() => {
                    if (!currentUser) {
                      window.dispatchEvent(new CustomEvent('show-login-prompt', { detail: { message: `Join JPM to follow ${profile?.full_name}` } }))
                      return
                    }
                    handleFollow()
                  }}
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
        </div>

      {/* ── Social Links Modal ── */}
      {showSocialLinks && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-zinc-900 w-[92%] max-w-[400px] rounded-[28px] overflow-hidden flex flex-col shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="relative px-6 py-5 border-b border-zinc-100 dark:border-zinc-800">
              <h2 className="text-[20px] font-bold">Social Links</h2>
              <button onClick={() => setShowSocialLinks(false)} className="absolute right-5 top-5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"><XMarkIcon className="w-6 h-6" /></button>
            </div>
            <div className="px-6 py-5 space-y-4">
              {/* TikTok */}
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
                  <svg className="w-5 h-5 text-zinc-400 fill-current" viewBox="0 0 24 24"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1.04-.1z"/></svg>
                </div>
                <input type="url" value={socialData.tiktok_url} onChange={e => setSocialData({...socialData, tiktok_url: e.target.value})}
                  className="w-full pl-12 pr-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-2xl outline-none text-[15px] focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  placeholder="https://tiktok.com/@username" />
              </div>
              {/* Instagram */}
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
                  <svg className="w-5 h-5 text-zinc-400 fill-current" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.981 1.28.058 1.688.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.058-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
                </div>
                <input type="url" value={socialData.instagram_url} onChange={e => setSocialData({...socialData, instagram_url: e.target.value})}
                  className="w-full pl-12 pr-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-2xl outline-none text-[15px] focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  placeholder="https://instagram.com/username" />
              </div>
              {/* Facebook */}
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
                  <svg className="w-5 h-5 text-zinc-400 fill-current" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                </div>
                <input type="url" value={socialData.facebook_url} onChange={e => setSocialData({...socialData, facebook_url: e.target.value})}
                  className="w-full pl-12 pr-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-2xl outline-none text-[15px] focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  placeholder="https://facebook.com/username" />
              </div>
              {/* Website */}
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
                  <GlobeAltIcon className="w-5 h-5 text-zinc-400" />
                </div>
                <input type="url" value={socialData.website_url} onChange={e => setSocialData({...socialData, website_url: e.target.value})}
                  className="w-full pl-12 pr-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-2xl outline-none text-[15px] focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  placeholder="https://yourwebsite.com" />
              </div>
            </div>
            <div className="px-6 pb-6 flex gap-3">
              <button onClick={() => setShowSocialLinks(false)} className="flex-1 py-3.5 border border-zinc-200 dark:border-zinc-700 rounded-2xl text-[15px] font-bold text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors">Cancel</button>
              <button
                disabled={savingSocial}
                onClick={async () => {
                  if (!id) return
                  setSavingSocial(true)
                  const { error } = await supabase.from('profiles').update({
                    tiktok_url: socialData.tiktok_url.trim(),
                    instagram_url: socialData.instagram_url.trim(),
                    facebook_url: socialData.facebook_url.trim(),
                    website_url: socialData.website_url.trim()
                  }).eq('id', id)
                  if (!error) {
                    setProfile({ ...profile, ...socialData })
                    setShowSocialLinks(false)
                  }
                  setSavingSocial(false)
                }}
                className="flex-1 py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-[15px] font-bold shadow-lg shadow-blue-500/20 transition-all disabled:opacity-50"
              >
                {savingSocial ? 'Saving...' : 'Save Links'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Profile editing moved to Settings page */}


      {/* ── Content Tabs — Echo style ── */}
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
              if (activeTab === 'archive') return post.is_bookmarked_tab
              if (activeTab === 'media')   return !post.is_repost && !post.is_liked_tab && !post.is_bookmarked_tab && !post.is_archived && (post.image_url || (post.image_urls && post.image_urls.length > 0))
              if (activeTab === 'replies') return !post.is_repost && !post.is_liked_tab && !post.is_bookmarked_tab && !post.is_archived && post.parent_id
              return !post.is_repost && !post.is_archived && !post.is_liked_tab && !post.is_bookmarked_tab // 'posts' (Echo) tab
            })

            return (
              <>
                {filteredPosts.map((post: any, index: number) => {
                  const showAd = index > 0 && index % 3 === 2;
                  return (
                    <div key={`${post.id}-${post.is_repost}`}>
                      <Post post={post} />
                      {showAd && <InlineFeedAd adId="ca-app-pub-8166782428171770/3966636178" />}
                    </div>
                  )
                })}
                {filteredPosts.length === 0 && <div className="p-8 text-center text-zinc-400 text-sm">No {activeTab === 'posts' ? 'thread' : activeTab} yet.</div>}
              </>
            )
          })()}
        </div>
      </div>
      {/* Bottom spacer for mobile nav */}
      <div className="h-28 sm:h-8" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }} />
      {/* QR Code Modal */}
      {(() => {
        // QR code points to Play Store so scanning downloads the app
        const playStoreUrl = 'https://play.google.com/store/apps/details?id=com.jpm.app';
        const profileUrl = `https://jpmtz.online/profile?id=${profile.id}`;
        const qrValue = playStoreUrl; // Scan = download the app
        
        if (!showQRCode || typeof document === 'undefined') return null;
        
        return createPortal(
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setShowQRCode(false)}>
            <div 
              className="bg-white dark:bg-zinc-900 w-full max-w-sm rounded-[32px] overflow-hidden shadow-2xl border border-zinc-100 dark:border-zinc-800 animate-in zoom-in-95 duration-200"
              onClick={e => e.stopPropagation()}
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-black tracking-tight">Profile QR Code</h3>
                  <button 
                    onClick={() => setShowQRCode(false)}
                    className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors"
                  >
                    <XMarkIcon className="w-6 h-6" />
                  </button>
                </div>

                <div className="flex flex-col items-center">
                  <div className="p-6 bg-white rounded-[24px] shadow-inner mb-6 ring-1 ring-zinc-100">
                    <QRCodeSVG 
                      value={qrValue}
                      size={200}
                      level="H"
                      includeMargin={false}
                      imageSettings={profile?.avatar_url ? {
                        src: profile.avatar_url,
                        x: undefined,
                        y: undefined,
                        height: 40,
                        width: 40,
                        excavate: true,
                      } : undefined}
                    />
                  </div>
                  
                  <div className="text-center mb-8">
                    <p className="font-bold text-lg">@{profile?.username}</p>
                    <p className="text-zinc-500 text-sm">Scan to download JPM app</p>
                  </div>

                  <div className="grid grid-cols-2 gap-3 w-full">
                    <button
                      onClick={() => {
                        const svg = document.querySelector('svg');
                        if (svg) {
                          const svgData = new XMLSerializer().serializeToString(svg);
                          const canvas = document.createElement('canvas');
                          const ctx = canvas.getContext('2d');
                          const img = new Image();
                          img.onload = () => {
                            canvas.width = img.width;
                            canvas.height = img.height;
                            ctx?.drawImage(img, 0, 0);
                            const pngFile = canvas.toDataURL('image/png');
                            const downloadLink = document.createElement('a');
                            downloadLink.download = `qr-code-${profile.username}.png`;
                            downloadLink.href = pngFile;
                            downloadLink.click();
                          };
                          img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
                        }
                      }}
                      className="flex items-center justify-center gap-2 py-3 bg-zinc-100 dark:bg-zinc-800 rounded-2xl font-bold text-sm hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-all active:scale-95"
                    >
                      Download
                    </button>
                    <button
                      onClick={async () => {
                        if (navigator.share) {
                          await navigator.share({
                            title: 'Download JPM App',
                            text: 'Download the JPM app on Google Play',
                            url: playStoreUrl
                          });
                        } else {
                          await navigator.clipboard.writeText(playStoreUrl);
                          alert('Play Store link copied!');
                        }
                      }}
                      className="flex items-center justify-center gap-2 py-3 bg-black dark:bg-white text-white dark:text-black rounded-2xl font-bold text-sm hover:opacity-90 transition-all active:scale-95"
                    >
                      Share App
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>,
          document.body
        );
      })()}
    </AppLayout>
  )
}

export default function ProfilePage() {
  return (
    <Suspense fallback={<AppLayout isPublic><div className="p-8 text-center text-zinc-500 font-bold italic">Loading profile...</div></AppLayout>}>
      <ProfileContent />
    </Suspense>
  )
}
