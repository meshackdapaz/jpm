'use client'

import React from 'react'
import { 
  ChatBubbleLeftIcon, 
  HeartIcon, 
  ArrowPathRoundedSquareIcon,
  EllipsisHorizontalIcon,
  EyeSlashIcon,
  ArchiveBoxIcon,
  TrashIcon,
} from '@heroicons/react/24/outline'
import { useI18n } from '@/lib/i18n'
import Image from 'next/image'
import Link from 'next/link'
import { VerifiedBadge } from './VerifiedBadge'
import { motion, AnimatePresence } from 'framer-motion'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from './AuthProvider'
import { Haptics, ImpactStyle } from '@capacitor/haptics'
import { Capacitor } from '@capacitor/core'

const triggerHaptic = (style = ImpactStyle.Light) => {
  if (Capacitor.isNativePlatform()) {
    Haptics.impact({ style }).catch(() => {})
  }
}

function formatRelativeTime(dateString: string) {
  const now = new Date()
  const date = new Date(dateString)
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

  if (diffInSeconds < 60) return 'now'
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m`
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h`
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d`
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export function Post({ post }: { post: any }) {
  const { t } = useI18n()
  const [likes, setLikes] = useState(post.likes_count || 0)
  const [isLiked, setIsLiked] = useState(post.is_liked_by_me || false)
  const [comments, setComments] = useState(post.comments_count || 0)
  const [reposts, setReposts] = useState(post.reposts_count || 0)
  const [isReposted, setIsReposted] = useState(post.is_reposted_by_me || false)
  const [views, setViews] = useState(post.view_count || 0)
  const [showAnalytics, setShowAnalytics] = useState(false)
  const [showReactions, setShowReactions] = useState(false)
  const [activeReaction, setActiveReaction] = useState<string | null>(post.my_reaction || null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isDeletedLocally, setIsDeletedLocally] = useState(false)
  const [showOptions, setShowOptions] = useState(false)
  const [hideCounts, setHideCounts] = useState(post.hide_counts || false)
  const [isArchived, setIsArchived] = useState(post.is_archived || false)
  const supabase = createClient()
  
  const profile = Array.isArray(post.profiles) ? post.profiles[0] : (post.profiles || { full_name: 'Anonymous', avatar_url: null, username: 'anon' })
  const { user: currentUser } = useAuth()

  const [imageIndex, setImageIndex] = useState(0)
  const images = post.image_urls && post.image_urls.length > 0 
    ? post.image_urls 
    : (post.image_url ? [post.image_url] : [])

  const handleNextImage = (e: React.MouseEvent) => {
    e.stopPropagation()
    triggerHaptic(ImpactStyle.Light)
    setImageIndex((prev) => (prev + 1) % images.length)
  }

  const handlePrevImage = (e: React.MouseEvent) => {
    e.stopPropagation()
    triggerHaptic(ImpactStyle.Light)
    setImageIndex((prev) => (prev - 1 + images.length) % images.length)
  }

  useEffect(() => {
    async function checkUserInteractions() {
      if (currentUser) {
        // Handle Interactions (Like and Repost) if missing
        if (post.is_liked_by_me === undefined || post.is_reposted_by_me === undefined) {
          try {
            const { data: myLike } = await supabase
              .from('likes')
              .select('*')
              .eq('post_id', post.id)
              .eq('user_id', currentUser.id)
              .maybeSingle()
            
            if (myLike) {
              setIsLiked(true)
              setActiveReaction(myLike.reaction_type || 'like')
            }

            const { data: myRepost } = await supabase
              .from('reposts')
              .select('*')
              .eq('post_id', post.id)
              .eq('user_id', currentUser.id)
              .maybeSingle()
            
            setIsReposted(!!myRepost)
          } catch (error) {
            console.error('Error checking interactions:', error)
          }
        }

        // View Increment Logic (Logged in users only, once per device)
        const viewKey = `viewed_${post.id}`
        if (!localStorage.getItem(viewKey)) {
          try {
            await supabase.rpc('increment_view_count', { post_id: post.id })
            localStorage.setItem(viewKey, '1')
            setViews((prev: number) => prev + 1)
          } catch (e) {}
        }
      }
    }

    checkUserInteractions()
  }, [post.id, currentUser])

  const handleReaction = async (type: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation()
    if (!currentUser) return alert('Please login to react')

    if (isLiked && activeReaction === type) {
      await supabase.from('likes').delete().eq('post_id', post.id).eq('user_id', currentUser.id)
      setLikes((prev: number) => prev - 1)
      setIsLiked(false)
      setActiveReaction(null)
    } else {
      const { error } = await supabase.from('likes').upsert({ 
        post_id: post.id, 
        user_id: currentUser.id, 
        reaction_type: type 
      }, { onConflict: 'post_id,user_id' })

      if (!error) {
        if (!isLiked) {
          setLikes((prev: number) => prev + 1)
          if (currentUser.id !== post.creator_id) {
            await supabase.from('notifications').insert({
              user_id: post.creator_id,
              actor_id: currentUser.id,
              type: 'like',
              post_id: post.id
            })
          }
        }
        setIsLiked(true)
        setActiveReaction(type)
      }
    }
    setShowReactions(false)
  }

  const handleLike = async (e: React.MouseEvent) => {
    e.stopPropagation()
    triggerHaptic(isLiked ? ImpactStyle.Light : ImpactStyle.Medium)
    handleReaction('like')
  }

  const getReactionEmoji = (type: string | null) => {
    switch(type) {
      case 'laugh': return '😂'
      case 'fire': return '🔥'
      case 'like': return <HeartIcon className="w-5 h-5 fill-current" />
      default: return <HeartIcon className="w-5 h-5" />
    }
  }

  const handleRepost = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!currentUser) return alert('Please login to repost')
    triggerHaptic(isReposted ? ImpactStyle.Light : ImpactStyle.Medium)

    try {
      if (isReposted) {
        setReposts((prev: number) => Math.max(0, prev - 1))
        setIsReposted(false)
        
        const { error } = await supabase
          .from('reposts')
          .delete()
          .eq('post_id', post.id)
          .eq('user_id', currentUser.id)
        
        if (error) throw error
      } else {
        setReposts((prev: number) => prev + 1)
        setIsReposted(true)

        const { error } = await supabase
          .from('reposts')
          .insert({ post_id: post.id, user_id: currentUser.id })
        
        if (error) {
          if (error.code === '23505') {
            setIsReposted(true)
            return
          }
          throw error
        }
      }
    } catch (error: any) {
      console.error('Repost error:', error)
      setReposts(post.reposts_count || 0)
      setIsReposted(post.is_reposted_by_me || false)
      alert('Could not update repost. Please try again.')
    }
  }

  const toggleHideCounts = async () => {
    const newVal = !hideCounts
    setHideCounts(newVal)
    setShowOptions(false)
    await supabase.from('posts').update({ hide_counts: newVal }).eq('id', post.id)
  }

  const toggleArchive = async () => {
    const newVal = !isArchived
    setIsArchived(newVal)
    setShowOptions(false)
    await supabase.from('posts').update({ is_archived: newVal }).eq('id', post.id)
  }

  const handleDelete = async () => {
    setShowOptions(false)
    setIsDeleting(true)

    try {
      const { error } = await supabase.from('posts').delete().eq('id', post.id)
      
      if (error) {
        console.error('Database deletion failed:', error)
        alert('Failed to delete post: ' + error.message)
        setIsDeleting(false)
        return
      }

      setIsDeletedLocally(true)

      if (images.length > 0) {
        try {
          const fileNames = images.map((url: string) => {
            const parts = url.split('/')
            return parts[parts.length - 1].split('?')[0]
          })
          await supabase.storage.from('memes').remove(fileNames)
        } catch (urlErr) {
          console.error('Storage deletion error:', urlErr)
        }
      }
    } catch (err: any) {
      console.error('Exception:', err.message)
      alert('Failed to delete post.')
      setIsDeleting(false)
    }
  }

  const [showComments, setShowComments] = useState(false)
  const [commentList, setCommentList] = useState<any[]>([])
  const [newComment, setNewComment] = useState('')
  const [isSubmittingComment, setIsSubmittingComment] = useState(false)

  const fetchComments = async () => {
    const { data } = await supabase
      .from('comments')
      .select('*, profiles(*), comment_likes(*)')
      .eq('post_id', post.id)
      .order('created_at', { ascending: true })
      
    if (data) {
      const commentMap = new Map()
      const roots: any[] = []
      data.forEach((c: any) => {
        c.replies = []
        commentMap.set(c.id, c)
      })
      data.forEach((c: any) => {
        if (c.parent_id && commentMap.has(c.parent_id)) {
          commentMap.get(c.parent_id).replies.push(c)
        } else {
          roots.push(c)
        }
      })
      setCommentList(roots)
    }
  }

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newComment.trim()) return

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return alert('Please login to reply')

    setIsSubmittingComment(true)
    const { error, data: commentData } = await supabase.from('comments').insert({
      post_id: post.id,
      user_id: user.id,
      content: newComment
    }).select()

    if (!error) {
      if (user.id !== post.creator_id) {
        await supabase.from('notifications').insert({
          user_id: post.creator_id,
          actor_id: user.id,
          type: 'comment',
          post_id: post.id,
          comment_id: commentData[0].id
        })
      }
      setNewComment('')
      setComments((prev: number) => prev + 1)
      fetchComments()
    } else {
      alert('Error posting reply: ' + error.message)
    }
    setIsSubmittingComment(false)
  }

  useEffect(() => {
    if (showComments) fetchComments()
  }, [showComments])

  if (isDeletedLocally) return null

  return (
    <div className={`border-b border-zinc-200 dark:border-zinc-800 relative ${isArchived ? 'opacity-50 grayscale-[0.5]' : ''}`}>
      {/* Options Bottom Sheet */}
      <AnimatePresence>
        {showOptions && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowOptions(false)}
              className="fixed inset-0 bg-black/40 z-[150] backdrop-blur-[2px]"
            />
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed bottom-0 left-0 right-0 z-[160] bg-white dark:bg-[#181818] rounded-t-[32px] p-4 flex flex-col items-center shadow-2xl safe-area-bottom"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Handle bar */}
              <div className="w-10 h-1 bg-zinc-200 dark:bg-zinc-800 rounded-full mb-6 mt-1" />
              
              <div className="w-full max-w-sm flex flex-col gap-2">
                {/* Main options container */}
                <div className="bg-zinc-50 dark:bg-zinc-900/50 rounded-2xl overflow-hidden text-zinc-900 dark:text-zinc-100">
                  <button 
                    onClick={toggleArchive}
                    className="w-full px-5 py-4 flex items-center justify-between hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                  >
                    <span className="font-bold text-[16px]">{isArchived ? 'Unarchive' : 'Archive'}</span>
                    <ArchiveBoxIcon className="w-6 h-6" />
                  </button>
                </div>

                {/* Delete container */}
                <div className="bg-zinc-50 dark:bg-zinc-900/50 rounded-2xl overflow-hidden mt-1">
                  <button 
                    onClick={handleDelete}
                    className="w-full px-5 py-4 flex items-center justify-between hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 transition-colors"
                  >
                    <span className="font-black text-[16px]">Delete</span>
                    <TrashIcon className="w-6 h-6" />
                  </button>
                </div>

                {/* Cancel button */}
                <button 
                  onClick={() => setShowOptions(false)}
                  className="w-full py-4 mt-2 font-bold text-zinc-500"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Repost ribbon */}
      {post.is_repost && (
        <div className="px-12 pt-3 pb-1 text-sm text-zinc-500 font-bold flex items-center gap-2">
          <ArrowPathRoundedSquareIcon className="w-4 h-4" />
          {post.reposter_name} reposted
        </div>
      )}

      {/* ──────────────────────────────────────
          Main clickable / post body
      ────────────────────────────────────── */}
      <div
        onClick={() => setShowComments(!showComments)}
        className="px-4 py-4 flex flex-col gap-2 transition-colors cursor-pointer group/post"
      >
        {/* Row 1: Avatar + author info + caption */}
        <div className="flex gap-3">
          {/* Avatar */}
          <div className="flex-none" onClick={(e) => e.stopPropagation()}>
            <div className="relative">
              <Link href={`/profile?id=${profile.id}`}>
                {profile.avatar_url ? (
                  <Image
                    src={profile.avatar_url}
                    alt={profile.full_name}
                    width={44}
                    height={44}
                    className="rounded-full w-11 h-11 object-cover hover:opacity-80 transition-opacity"
                  />
                ) : (
                  <div className="w-11 h-11 bg-zinc-200 dark:bg-zinc-800 rounded-full flex items-center justify-center text-zinc-500 font-bold hover:bg-zinc-300 dark:hover:bg-zinc-700 transition-colors">
                    {profile.full_name?.[0]?.toUpperCase() || 'A'}
                  </div>
                )}
              </Link>
              {(() => {
                const lastSeen = profile.last_seen ? new Date(profile.last_seen) : null
                const isOnline = lastSeen && (new Date().getTime() - lastSeen.getTime() < 5 * 60 * 1000)
                const onlinePref = profile.settings?.online || 'Anyone'
                const shouldShow = isOnline && (onlinePref === 'Anyone' || profile.id === currentUser?.id)
                if (!shouldShow) return null
                return <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white dark:border-[#101010] rounded-full" />
              })()}
            </div>
          </div>

          {/* Author info + caption */}
          <div className="flex-grow min-w-0">
            <div className="flex items-center justify-between mb-0.5">
              <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                <Link
                  href={`/profile?id=${profile.id}`}
                  className="flex items-center gap-1 group/author"
                  onClick={(e) => e.stopPropagation()}
                >
                  <span className="font-bold text-[15px] leading-snug group-hover/author:underline truncate max-w-[130px] sm:max-w-none">{profile.full_name}</span>
                  {profile.is_verified && <VerifiedBadge className="w-4 h-4 flex-none" />}
                </Link>
                <span className="text-zinc-400 dark:text-zinc-500 text-sm truncate max-w-[100px] sm:max-w-none">@{profile.username}</span>
                <span className="text-zinc-400 text-sm">·</span>
                <span className="text-zinc-400 text-sm flex-none" title={new Date(post.created_at).toLocaleString()}>{formatRelativeTime(post.created_at)}</span>
              </div>

              {/* Three dots - Red Spot */}
              {currentUser?.id === post.creator_id && (
                <button 
                  onClick={(e) => { e.stopPropagation(); setShowOptions(true) }}
                  className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors flex-none -mr-2"
                >
                  <EllipsisHorizontalIcon className="w-5 h-5 text-zinc-400" />
                </button>
              )}
            </div>
            <p className="text-[15px] leading-relaxed text-zinc-900 dark:text-zinc-100 whitespace-pre-wrap break-words">
              {post.content}
            </p>
          </div>
        </div>

        {/* Row 2: Full-width image — outside the avatar row so it spans 100% and centers */}
        {images.length > 0 && (
          <div
            className="w-full relative rounded-2xl overflow-hidden group/carousel"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Image — flex+justify-center ensures perfect horizontal center */}
            <div className="flex items-center justify-center w-full bg-zinc-100 dark:bg-zinc-900 rounded-2xl overflow-hidden">
              <Image
                src={images[imageIndex]}
                alt={post.title || `Post image ${imageIndex + 1}`}
                width={1200}
                height={1200}
                className="w-full h-auto max-h-[560px] object-contain"
                unoptimized
              />
            </div>

            {/* Carousel controls (multi-image only) */}
            {images.length > 1 && (
              <>
                <button
                  onClick={handlePrevImage}
                  className="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 text-white opacity-0 group-hover/carousel:opacity-100 transition-opacity hover:bg-black/70 z-10 active:scale-95"
                  aria-label="Previous image"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <button
                  onClick={handleNextImage}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 text-white opacity-0 group-hover/carousel:opacity-100 transition-opacity hover:bg-black/70 z-10 active:scale-95"
                  aria-label="Next image"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
                {/* Dot indicators */}
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 px-2 py-1 rounded-full bg-black/30 backdrop-blur-sm z-10">
                  {images.map((_: any, i: number) => (
                    <div
                      key={i}
                      className={`h-1.5 rounded-full transition-all duration-300 ${i === imageIndex ? 'w-3 bg-white' : 'w-1.5 bg-white/50'}`}
                    />
                  ))}
                </div>
                {/* Counter badge */}
                <div className="absolute top-3 right-3 bg-black/50 text-white text-[10px] font-bold px-2 py-0.5 rounded-full backdrop-blur-sm z-10">
                  {imageIndex + 1}/{images.length}
                </div>
              </>
            )}
          </div>
        )}

        {/* Row 3: Action buttons */}
        <div className="flex items-center justify-between w-full text-zinc-500 pt-0.5">
          <div className="flex items-center gap-4 sm:gap-6 flex-grow">
            {/* Comments */}
            <button className="flex items-center gap-1 group hover:text-blue-500 transition-colors">
              <div className={`p-2 rounded-full group-hover:bg-blue-50 dark:group-hover:bg-blue-950/30 ${showComments ? 'bg-blue-50 dark:bg-blue-950/30 text-blue-500' : ''}`}>
                <ChatBubbleLeftIcon className="w-[18px] h-[18px]" />
              </div>
              <span className="text-sm">{comments || ''}</span>
            </button>

            {/* Repost */}
            <button
              onClick={handleRepost}
              className={`flex items-center gap-1 group transition-colors ${isReposted ? 'text-green-500' : 'hover:text-green-500'}`}
            >
              <div className={`p-2 rounded-full group-hover:bg-green-50 dark:group-hover:bg-green-950/30 ${isReposted ? 'bg-green-50 dark:bg-green-950/30' : ''}`}>
                <ArrowPathRoundedSquareIcon className="w-[18px] h-[18px]" />
              </div>
              <span className="text-sm">{reposts || ''}</span>
            </button>

            {/* Like / Reaction */}
            <div className="relative" onMouseEnter={() => setShowReactions(true)} onMouseLeave={() => setShowReactions(false)}>
              <div
                onClick={handleLike}
                className={`flex items-center gap-1 group transition-colors cursor-pointer ${isLiked ? 'text-red-500' : 'hover:text-red-500'}`}
              >
                <div className={`p-2 rounded-full group-hover:bg-red-50 dark:group-hover:bg-red-950/30 ${isLiked ? 'bg-red-50 dark:bg-red-950/30' : ''}`}>
                  {isLiked ? getReactionEmoji(activeReaction) : <HeartIcon className="w-[18px] h-[18px]" />}
                </div>
                {!hideCounts && <span className="text-sm">{likes || ''}</span>}
              </div>
              {showReactions && (
                <div className="absolute bottom-full left-0 mb-2 p-1 bg-white dark:bg-zinc-800 rounded-full shadow-xl border border-zinc-200 dark:border-zinc-700 flex gap-1 z-50 animate-in fade-in slide-in-from-bottom-2">
                  <button onClick={(e) => { e.stopPropagation(); handleReaction('like', e) }} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded-full transition-transform hover:scale-125">❤️</button>
                  <button onClick={(e) => { e.stopPropagation(); handleReaction('laugh', e) }} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded-full transition-transform hover:scale-125">😂</button>
                  <button onClick={(e) => { e.stopPropagation(); handleReaction('fire', e) }} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded-full transition-transform hover:scale-125">🔥</button>
                </div>
              )}
            </div>

            {/* Analytics (views) - Only for creator */}
            {currentUser?.id === post.creator_id && (
              <button
                onClick={(e) => { e.stopPropagation(); setShowAnalytics(!showAnalytics) }}
                className={`flex items-center gap-1 group transition-colors ${showAnalytics ? 'text-blue-500' : 'hover:text-blue-500'}`}
              >
                <div className={`p-2 rounded-full group-hover:bg-blue-50 dark:group-hover:bg-blue-950/30 ${showAnalytics ? 'bg-blue-50 dark:bg-blue-950/30' : ''}`}>
                  <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                {!hideCounts && <span className="text-sm">{views}</span>}
              </button>
            )}
          </div>
        </div>

        {/* Analytics panel */}
        {showAnalytics && (
          <div className="mt-1 p-4 bg-zinc-50 dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 animate-in fade-in slide-in-from-top-2">
            <h4 className="font-bold mb-3 text-sm">Post Analytics</h4>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="p-3 bg-white dark:bg-black rounded-xl border border-zinc-100 dark:border-zinc-800">
                <p className="text-zinc-500 text-xs mb-1">Impressions</p>
                <p className="text-xl font-bold">{views}</p>
              </div>
              <div className="p-3 bg-white dark:bg-black rounded-xl border border-zinc-100 dark:border-zinc-800">
                <p className="text-zinc-500 text-xs mb-1">Engagements</p>
                <p className="text-xl font-bold">{likes + comments + reposts}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Comments section */}
      {showComments && (
        <div className="bg-zinc-50 dark:bg-black border-t border-zinc-100 dark:border-zinc-800 px-2 sm:px-6 py-4 animate-in fade-in slide-in-from-top-2" onClick={(e) => e.stopPropagation()}>
          <form onSubmit={handleCommentSubmit} className="flex gap-3 mb-6 relative z-20">
            <Link href={`/profile?id=${profile.id}`} className="flex-none pt-1">
              <div className="w-10 h-10 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden shadow-sm">
                {currentUser?.user_metadata?.avatar_url ? (
                  <Image src={currentUser.user_metadata.avatar_url} alt="User" width={40} height={40} className="w-full h-full object-cover" unoptimized />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-zinc-500 font-bold">
                    {currentUser?.user_metadata?.full_name?.[0] || 'U'}
                  </div>
                )}
              </div>
            </Link>
            <div className="flex-grow flex flex-col gap-2">
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Post your reply..."
                className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm resize-none placeholder-zinc-500 shadow-sm transition-shadow"
                rows={2}
              />
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={isSubmittingComment || !newComment.trim()}
                  className="bg-black dark:bg-white text-white dark:text-black px-5 py-1.5 rounded-full font-bold transition-all text-sm disabled:opacity-40 hover:opacity-80 active:scale-95"
                >
                  {isSubmittingComment ? '...' : 'Reply'}
                </button>
              </div>
            </div>
          </form>
          <div className="space-y-1">
            {commentList.map((comment: any) => (
              <CommentItem
                key={comment.id}
                comment={comment}
                depth={0}
                currentUser={currentUser}
                post={post}
                fetchComments={fetchComments}
                supabase={supabase}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function CommentItem({ 
  comment, 
  depth, 
  currentUser, 
  post, 
  fetchComments, 
  supabase 
}: { 
  comment: any, depth: number, currentUser: any, post: any, fetchComments: () => void, supabase: any 
}) {
  const [isReplying, setIsReplying] = useState(false)
  const [replyText, setReplyText] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const upvotes = comment.comment_likes?.filter((l: any) => l.is_like).length || 0
  const downvotes = comment.comment_likes?.filter((l: any) => !l.is_like).length || 0
  const userVote = currentUser ? comment.comment_likes?.find((l: any) => l.user_id === currentUser.id) : null

  const handleCommentLike = async (isLike: boolean) => {
    if (!currentUser) return alert('Please login to vote')
    if (userVote) {
      if (userVote.is_like === isLike) {
        await supabase.from('comment_likes').delete().eq('id', userVote.id)
      } else {
        await supabase.from('comment_likes').update({ is_like: isLike }).eq('id', userVote.id)
      }
    } else {
      await supabase.from('comment_likes').insert({
        comment_id: comment.id,
        user_id: currentUser.id,
        is_like: isLike
      })
    }
    fetchComments()
  }

  const handleReplySubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!replyText.trim() || !currentUser) return
    setIsSubmitting(true)
    const { error } = await supabase.from('comments').insert({
      post_id: post.id,
      user_id: currentUser.id,
      content: replyText,
      parent_id: comment.id
    })
    if (!error) {
      setReplyText('')
      setIsReplying(false)
      fetchComments()
    } else {
      alert('Failed to post reply: ' + error.message)
    }
    setIsSubmitting(false)
  }

  return (
    <div className="relative flex gap-3 mt-4 group/comment">
      {comment.replies && comment.replies.length > 0 && (
        <div className="absolute left-[15px] top-[36px] bottom-[-20px] w-[2px] bg-gradient-to-b from-zinc-200 to-transparent dark:from-zinc-800 dark:to-transparent z-0" />
      )}
      
      <div className="relative z-10 flex-none h-max">
        <Link href={`/profile?id=${comment.profiles?.id}`}>
          {comment.profiles?.avatar_url ? (
            <Image src={comment.profiles.avatar_url} alt="A" width={32} height={32} className="rounded-full w-8 h-8 object-cover shadow-sm cursor-pointer hover:opacity-80 transition-opacity" unoptimized />
          ) : (
            <div className="w-8 h-8 bg-zinc-200 dark:bg-zinc-800 rounded-full flex items-center justify-center text-xs font-bold text-zinc-500 cursor-pointer shadow-sm">
              {comment.profiles?.full_name?.[0]?.toUpperCase() || 'U'}
            </div>
          )}
        </Link>
      </div>

      <div className="flex-grow pb-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <Link href={`/profile?id=${comment.profiles?.id}`} className="font-bold text-sm hover:underline truncate">
            {comment.profiles?.full_name}
          </Link>
          <span className="text-zinc-500 text-xs truncate">@{comment.profiles?.username}</span>
          <span className="text-zinc-500 text-xs">·</span>
          <span className="text-zinc-500 text-xs">{new Date(comment.created_at).toLocaleDateString()}</span>
        </div>
        
        <div className="text-sm mt-0.5 text-zinc-900 dark:text-zinc-100 whitespace-pre-wrap leading-relaxed break-words">
          {comment.content}
        </div>
        
        <div className="mt-1.5 flex items-center gap-4 text-zinc-500">
          <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-900/80 rounded-full p-0.5 px-1">
            <button
              onClick={() => handleCommentLike(true)}
              className={`flex items-center gap-1 p-1 rounded-full transition-colors ${userVote?.is_like === true ? 'text-blue-500' : 'hover:text-blue-500'}`}
              title="Like"
            >
              <svg className="w-4 h-4" fill={userVote?.is_like === true ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.514" />
              </svg>
            </button>
            <span className={`text-xs font-semibold px-1 ${upvotes > downvotes ? 'text-blue-500' : downvotes > upvotes ? 'text-red-500' : ''}`}>
              {upvotes - downvotes || 'Vote'}
            </span>
            <button
              onClick={() => handleCommentLike(false)}
              className={`flex items-center gap-1 p-1 rounded-full transition-colors ${userVote?.is_like === false ? 'text-red-500' : 'hover:text-red-500'}`}
              title="Dislike"
            >
              <svg className="w-4 h-4" fill={userVote?.is_like === false ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018a2 2 0 01.485.06l3.76.94m-7 10v5a2 2 0 002 2h.096c.5 0 .905-.405.905-.904 0-.715.211-1.413.608-2.008L17 13V4m-7 10h2m5-10h2a2 2 0 012 2v6a2 2 0 01-2 2h-2.514" />
              </svg>
            </button>
          </div>
          <button
            onClick={() => setIsReplying(!isReplying)}
            className="text-xs font-semibold hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors flex items-center gap-1"
          >
            <ChatBubbleLeftIcon className="w-4 h-4" />
            Reply
          </button>
        </div>
        
        {isReplying && (
          <form onSubmit={handleReplySubmit} className="mt-3 flex gap-2 animate-in fade-in slide-in-from-top-1 relative">
            <input
              type="text"
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder={`Replying to @${comment.profiles?.username}`}
              className="flex-grow bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-full px-4 py-2 pr-20 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm shadow-sm"
              autoFocus
            />
            <button
              type="submit"
              disabled={isSubmitting || !replyText.trim()}
              className="absolute right-1.5 top-1.5 bottom-1.5 bg-black dark:bg-white text-white dark:text-black px-4 rounded-full text-xs font-bold disabled:opacity-50 transition-opacity"
            >
              {isSubmitting ? '...' : 'Reply'}
            </button>
          </form>
        )}

        {comment.replies && comment.replies.length > 0 && (
          <div className="mt-1 relative z-10 w-full">
            {comment.replies.map((reply: any) => (
              <CommentItem
                key={reply.id}
                comment={reply}
                depth={depth + 1}
                currentUser={currentUser}
                post={post}
                fetchComments={fetchComments}
                supabase={supabase}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
