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
  PhotoIcon,
  LockClosedIcon,
  FlagIcon,
  BookmarkIcon,
  ArrowUpTrayIcon,
  ShareIcon
} from '@heroicons/react/24/outline'
import { Share } from '@capacitor/share'
import { useI18n } from '@/lib/i18n'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { VerifiedBadge } from './VerifiedBadge'
import { InArticleAd } from './InArticleAd'
import { motion, AnimatePresence } from 'framer-motion'

import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from './AuthProvider'
import { LoginPromptModal } from './LoginPromptModal'
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

const CommentItem = React.memo(({ 
  comment, 
  depth, 
  currentUser, 
  post, 
  fetchComments, 
  supabase 
}: { 
  comment: any, depth: number, currentUser: any, post: any, fetchComments: () => void, supabase: any 
}) => {
  const [isReplying, setIsReplying] = useState(false)
  const [replyText, setReplyText] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const upvotes = comment.comment_likes?.filter((l: any) => l.is_like).length || 0
  const downvotes = comment.comment_likes?.filter((l: any) => !l.is_like).length || 0
  const userVote = currentUser ? comment.comment_likes?.find((l: any) => l.user_id === currentUser.id) : null

  const handleCommentLike = async (isLike: boolean) => {
    if (!currentUser) return alert('Join JPM to vote on comments')
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
    const isReviewRequired = post.settings?.review_replies || post.settings?.reviewReplies
    const isApproved = isReviewRequired ? (currentUser.id === post.creator_id) : true

    setIsSubmitting(true)
    const { error } = await supabase.from('comments').insert({
      post_id: post.id,
      user_id: currentUser.id,
      content: replyText,
      parent_id: comment.id,
      is_approved: isApproved
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
          <Link href={`/profile?id=${comment.profiles?.id}`} className="font-bold text-sm hover:underline truncate flex items-center gap-1">
            {comment.profiles?.full_name}
            {comment.profiles?.is_verified && <VerifiedBadge className="w-3.5 h-3.5 flex-none" />}
          </Link>
          <span className="text-zinc-500 text-xs truncate">@{comment.profiles?.username}</span>
          <span className="text-zinc-500 text-xs">·</span>
          <span className="text-zinc-500 text-xs">{new Date(comment.created_at).toLocaleDateString()}</span>
        </div>
        
        <div className="text-sm mt-0.5 text-zinc-900 dark:text-zinc-100 whitespace-pre-wrap leading-relaxed break-words">
          {comment.content}
        </div>
        
        {comment.is_approved === false && (
          <div className="mt-2 flex items-center gap-2">
            {currentUser?.id === post.creator_id ? (
              <>
                <button onClick={async () => { await supabase.from('comments').update({ is_approved: true }).eq('id', comment.id); fetchComments() }} className="bg-green-500 hover:bg-green-600 text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider transition-colors shadow-sm">Approve</button>
                <button onClick={async () => { await supabase.from('comments').delete().eq('id', comment.id); fetchComments() }} className="bg-red-500 hover:bg-red-600 text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider transition-colors shadow-sm">Reject</button>
              </>
            ) : (
              <span className="text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border border-amber-500/20">Pending Approval</span>
            )}
          </div>
        )}
        
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
})

export const Post = React.memo(({ post, onObserve }: { post: any; onObserve?: (postId: string, el: HTMLElement | null) => void }) => {
  const [isDeleting, setIsDeleting] = useState(false)
  const [isDeletedLocally, setIsDeletedLocally] = useState(false)
  const [showOptions, setShowOptions] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showLoginPrompt, setShowLoginPrompt] = useState(false)
  const [loginPromptMessage, setLoginPromptMessage] = useState('')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])
  const { t } = useI18n()
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient()
  const { user: currentUser } = useAuth()
  
  const [likes, setLikes] = useState(post.likes_count || 0)
  const [isLiked, setIsLiked] = useState(post.is_liked_by_me || false)
  const [comments, setComments] = useState(post.comments_count || 0)
  const [reposts, setReposts] = useState(post.reposts_count || 0)
  const [isReposted, setIsReposted] = useState(post.is_reposted_by_me || false)
  const [views, setViews] = useState(post.view_count || post.views_count || 0)
  const [showAnalytics, setShowAnalytics] = useState(false)
  const [showReactions, setShowReactions] = useState(false)
  const [activeReaction, setActiveReaction] = useState<string | null>(post.my_reaction || null)
  const [hideCounts, setHideCounts] = useState(post.hide_counts || false)
  const [isArchived, setIsArchived] = useState(post.is_archived || false)
  const [isBookmarked, setIsBookmarked] = useState(false)
  const viewIncremented = useRef(false)

  // ── Push notification helper ──────────────────────────────────────────────
  const sendPush = async (fcm_token: string, title: string, body: string) => {
    try {
      const PUSH_URL = `${process.env.NEXT_PUBLIC_INSFORGE_URL}/functions/send-push`
      const ANON_KEY = process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY
      await fetch(PUSH_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${ANON_KEY}` },
        body: JSON.stringify({ fcm_token, title, body, type: 'notification', data: { url: `/p?id=${post.id}` } }),
      })
    } catch {}
  }

  // View increment logic moved to useFeedTelemetry
  
  const [dataSaver, setDataSaver] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('echo_data_saver') === 'true'
    }
    return false
  })
  const [imageLoaded, setImageLoaded] = useState(false)
  const [poll, setPoll] = useState<any>(null)
  const [votedOptionId, setVotedOptionId] = useState<string | null>(null)
  const [pollOptions, setPollOptions] = useState<any[]>([])
  const [totalVotes, setTotalVotes] = useState(0)
  const [canReply, setCanReply] = useState(true)
  const [replyRestrictionReason, setReplyRestrictionReason] = useState('')
  
  const profile = Array.isArray(post.profiles) ? post.profiles[0] : (post.profiles || { full_name: 'Anonymous', avatar_url: null, username: 'anon' })

  const [imageIndex, setImageIndex] = useState(0)
  const images = post.image_urls && post.image_urls.length > 0 
    ? post.image_urls 
    : (post.image_url ? [post.image_url] : [])

  const [direction, setDirection] = useState(0)

  const handleNextImage = (e: React.MouseEvent) => {
    e.stopPropagation()
    setDirection(1)
    triggerHaptic(ImpactStyle.Light)
    setImageIndex((prev) => (prev + 1) % images.length)
  }

  const handlePrevImage = (e: React.MouseEvent) => {
    e.stopPropagation()
    setDirection(-1)
    triggerHaptic(ImpactStyle.Light)
    setImageIndex((prev) => (prev - 1 + images.length) % images.length)
  }

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      await Share.share({
        title: 'Check out this post',
        text: post.content,
        url: `https://jpmtz.online/p?id=${post.id}`,
      })
    } catch (err) {
      console.error('Error sharing:', err)
    }
  }

  useEffect(() => {
    async function fetchPoll() {
      const { data: pollData } = await supabase.from('polls').select('*').eq('post_id', post.id).maybeSingle()
      if (pollData) {
        setPoll(pollData)
        const { data: options } = await supabase
          .from('poll_options')
          .select('*, poll_votes(count)')
          .eq('poll_id', pollData.id)
          .order('display_order', { ascending: true })
        
        if (options) {
          setPollOptions(options)
          const total = options.reduce((acc: number, opt: any) => acc + (opt.poll_votes?.[0]?.count || 0), 0)
          setTotalVotes(total)
        }

        if (currentUser) {
          const { data: myVote } = await supabase
            .from('poll_votes')
            .select('option_id')
            .eq('poll_id', pollData.id)
            .eq('user_id', currentUser.id)
            .maybeSingle()
          if (myVote) setVotedOptionId(myVote.option_id)
        }
      }
    }
    fetchPoll()

    // Realtime subscription for votes
    const channel = supabase
      .channel(`poll:${post.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'poll_votes' }, () => fetchPoll())
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [post.id, currentUser])

  useEffect(() => {
    async function checkReplyPrivacy() {
      const privacy = post.settings?.reply_privacy || post.settings?.replyPrivacy || 'Anyone'
      if (privacy === 'Anyone' || privacy === 'Everyone') return setCanReply(true)
      
      if (!currentUser) {
        setCanReply(false)
        setReplyRestrictionReason('Please login to reply')
        return
      }

      if (currentUser.id === post.creator_id) return setCanReply(true)

      if (privacy === 'Mentioned') {
        const { data: myProfile } = await supabase.from('profiles').select('username').eq('id', currentUser.id).maybeSingle()
        const myUsername = myProfile?.username
        const isMentioned = myUsername && post.content?.includes(`@${myUsername}`)
        setCanReply(!!isMentioned)
        if (!isMentioned) setReplyRestrictionReason('Only mentioned profiles can reply')
        return
      }

      if (privacy === 'Followed') {
        // "People the author follows" -> The creator of the post is following the current user.
        // Therefore, we check if there is a follows record where follower_id = post.creator_id AND following_id = currentUser.id
        const { data: isFollowing, error } = await supabase
          .from('follows')
          .select('id')
          .eq('follower_id', post.creator_id)
          .eq('following_id', currentUser.id)
          .maybeSingle()
        
        if (error && error.code !== 'PGRST116') {
           console.error('Error checking follows:', error)
           setCanReply(false)
           return
        }

        setCanReply(!!isFollowing)
        if (!isFollowing) setReplyRestrictionReason('Only profiles the author follows can reply')
        return
      }

      if (privacy === 'Followers') {
        // "Followers of the author" -> The current user is following the creator of the post.
        // Therefore, we check if there is a follows record where follower_id = currentUser.id AND following_id = post.creator_id
        const { data: isFollower, error } = await supabase
          .from('follows')
          .select('id')
          .eq('follower_id', currentUser.id)
          .eq('following_id', post.creator_id)
          .maybeSingle()
        
        if (error && error.code !== 'PGRST116') {
           console.error('Error checking follows:', error)
           setCanReply(false)
           return
        }

        setCanReply(!!isFollower)
        if (!isFollower) setReplyRestrictionReason('Only followers can reply')
        return
      }
    }
    checkReplyPrivacy()
  }, [post.settings, currentUser, post.creator_id])

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

            // Check Data Saver
            const { data: myProfile } = await supabase
              .from('profiles')
              .select('settings')
              .eq('id', currentUser.id)
              .maybeSingle()
            
            const isDataSaver = !!myProfile?.settings?.dataSaver
            setDataSaver(isDataSaver)
            if (typeof window !== 'undefined') {
              localStorage.setItem('echo_data_saver', isDataSaver.toString())
            }
          } catch (error) {
            console.error('Error checking interactions:', error)
          }
        }

        // View Increment Logic moved to useFeedTelemetry
      }
    }

    checkUserInteractions()
  }, [post.id, currentUser])

  // Check bookmark state on mount
  useEffect(() => {
    if (!currentUser) return
    supabase.from('bookmarks').select('id').eq('user_id', currentUser.id).eq('post_id', post.id).maybeSingle()
      .then(({ data }: { data: any }) => setIsBookmarked(!!data))
  }, [post.id, currentUser?.id])

  const handleReaction = async (type: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation()
    if (!currentUser) {
      setLoginPromptMessage('Join JPM to react to this post')
      setShowLoginPrompt(true)
      return
    }

    if (isLiked && activeReaction === type) {
      await supabase.from('likes').delete().eq('post_id', post.id).eq('user_id', currentUser.id)
      setLikes((prev: number) => Math.max(0, prev - 1))
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
            // Push notification for like
            const creatorFcm = profile?.fcm_token
            if (creatorFcm) {
              const senderName = currentUser.user_metadata?.full_name || 'Someone'
              sendPush(creatorFcm, `${senderName} liked your post`, post.content?.slice(0, 60) || 'your post')
            }
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
    if (!currentUser) {
      setLoginPromptMessage('Join JPM to repost this to your followers')
      setShowLoginPrompt(true)
      return
    }
    triggerHaptic(isReposted ? ImpactStyle.Light : ImpactStyle.Medium)

    try {
      if (isReposted) {
        setReposts((prev: number) => Math.max(0, prev - 1))
        setIsReposted(false)
        await supabase.from('reposts').delete().eq('post_id', post.id).eq('user_id', currentUser.id)
      } else {
        setReposts((prev: number) => prev + 1)
        setIsReposted(true)
        const { error } = await supabase.from('reposts').insert({ post_id: post.id, user_id: currentUser.id })
        if (error && error.code !== '23505') throw error
      }
    } catch (error: any) {
      console.error('Repost error:', error)
      setReposts(post.reposts_count || 0)
      setIsReposted(post.is_reposted_by_me || false)
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

  const handleDelete = async (e?: React.MouseEvent) => {
    if (e) e.stopPropagation()
    setShowDeleteConfirm(false)
    
    setIsDeleting(true)
    triggerHaptic(ImpactStyle.Heavy)
    setShowOptions(false)

    try {
      const { error } = await supabase.from('posts').delete().eq('id', post.id)
      if (error) throw error

      if (images.length > 0) {
        try {
          const fileNames = images.map((url: string) => {
            const parts = url.split('/')
            return parts[parts.length - 1].split('?')[0]
          })
          await supabase.storage.from('memes').remove(fileNames)
        } catch (storageErr) {
          console.error('Storage cleanup failed:', storageErr)
        }
      }
      
      triggerHaptic(ImpactStyle.Medium)
      setIsDeletedLocally(true)
    } catch (error: any) {
      alert('Error deleting post: ' + error.message)
      setIsDeleting(false)
    }
  }

  const [showComments, setShowComments] = useState(false)
  const [commentList, setCommentList] = useState<any[]>([])
  const [newComment, setNewComment] = useState('')
  const [isSubmittingComment, setIsSubmittingComment] = useState(false)

  const fetchComments = async () => {
    let query = supabase
      .from('comments')
      .select('*, profiles(*), comment_likes(*)')
      .eq('post_id', post.id)
      .order('created_at', { ascending: true })
      
    if (!currentUser) {
      query = query.eq('is_approved', true)
    } else if (currentUser.id !== post.creator_id) {
      query = query.or(`is_approved.eq.true,user_id.eq.${currentUser.id}`)
    }

    const { data } = await query
      
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
    if (!user) {
      setLoginPromptMessage('Join JPM to join the conversation')
      setShowLoginPrompt(true)
      return
    }

    const isReviewRequired = post.settings?.review_replies || post.settings?.reviewReplies
    const isApproved = isReviewRequired ? (user.id === post.creator_id) : true

    setIsSubmittingComment(true)
    const { error, data: commentData } = await supabase.from('comments').insert({
      post_id: post.id,
      user_id: user.id,
      content: newComment,
      is_approved: isApproved
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
        // Push notification for comment
        const creatorFcm = profile?.fcm_token
        if (creatorFcm) {
          const senderName = user.user_metadata?.full_name || 'Someone'
          sendPush(creatorFcm, `${senderName} commented on your post`, newComment.slice(0, 80))
        }
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

      {/* Repost status */}
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
        ref={(el) => onObserve?.(post.id, el)}
        onClick={() => setShowComments(!showComments)}
        className="px-4 py-3 flex flex-col gap-2 transition-colors cursor-pointer group/post"
      >
        {/* Row 1: Avatar + author info + caption */}
        <div className="flex gap-3">
          {/* Avatar */}
          <div className="flex-none" onClick={(e) => e.stopPropagation()}>
            <div className="relative">
              {post.is_ghost ? (
                <div className="w-11 h-11 bg-gradient-to-br from-amber-500/20 to-zinc-900 rounded-full flex items-center justify-center border border-amber-500/50 cursor-default">
                  <span className="text-[10px] font-black text-amber-500 tracking-tighter">GHOST</span>
                </div>
              ) : (
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
              )}
              {!post.is_ghost && (() => {
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
              {post.category && (
                  <span className="inline-block px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 text-[10px] font-bold uppercase tracking-wider mb-2">
                    #{post.category}
                  </span>
                )}
              <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                {post.is_ghost ? (
                  <span className="font-black text-[15px] leading-snug text-amber-500 truncate max-w-[130px] sm:max-w-none cursor-default">Anonymous Ghost</span>
                ) : (
                  <>
                    <Link
                      href={`/profile?id=${profile.id}`}
                      className="flex items-center gap-1 group/author"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <span className="font-bold text-[15px] leading-snug group-hover/author:underline truncate max-w-[130px] sm:max-w-none">{profile.full_name}</span>
                      {profile.is_verified && <VerifiedBadge className="w-4 h-4 flex-none" />}
                      {profile.is_staff && <VerifiedBadge className="w-auto h-3.5 flex-none" type="staff" />}
                    </Link>
                    <span className="text-zinc-400 dark:text-zinc-500 text-sm truncate max-w-[100px] sm:max-w-none">@{profile.username}</span>
                  </>
                )}
                <span className="text-zinc-400 text-sm">·</span>
                <span className="text-zinc-400 text-sm flex-none" title={new Date(post.created_at).toLocaleString()}>{formatRelativeTime(post.created_at)}</span>
              </div>

              {/* Three dots - Options Menu */}
              {currentUser?.id === post.creator_id && (
                <div className="relative">
                  <button 
                    onClick={(e) => { e.stopPropagation(); setShowOptions(!showOptions) }}
                    className={`w-8 h-8 flex items-center justify-center rounded-full transition-colors flex-none -mr-2 ${showOptions ? 'bg-zinc-100 dark:bg-zinc-900 text-zinc-900 dark:text-white' : 'hover:bg-zinc-100 dark:hover:bg-zinc-900 text-zinc-400'}`}
                  >
                    <EllipsisHorizontalIcon className="w-5 h-5" />
                  </button>

                  <AnimatePresence>
                    {showOptions && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setShowOptions(false)} />
                        <motion.div 
                          initial={{ opacity: 0, scale: 0.95, y: -10 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95, y: -10 }}
                          className="absolute right-0 mt-2 w-48 bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-zinc-100 dark:border-zinc-800 py-2 z-50 overflow-hidden"
                        >
                          <button
                            onClick={(e) => { e.stopPropagation(); setShowOptions(false); setShowDeleteConfirm(true); }}
                            disabled={isDeleting}
                            className="w-full px-4 py-3 flex items-center gap-3 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors text-sm font-bold disabled:opacity-50"
                          >
                            <TrashIcon className="w-4 h-4" />
                            {isDeleting ? 'Deleting...' : 'Delete Post'}
                          </button>
                        </motion.div>
                      </>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </div>
            <div className={`relative ${ (post.settings?.isQuote || post.settings?.is_quote) ? 'mt-4 mb-4' : 'mt-0.5' }`}>
              {(post.settings?.isQuote || post.settings?.is_quote) ? (
                <div className="relative group/quote mt-4 mb-4">
                  {/* Subtle background glow */}
                  <div className="absolute inset-0 bg-gradient-to-br from-sky-500/10 to-transparent dark:from-sky-500/5 dark:to-transparent rounded-[32px] blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                  
                  <div className="relative bg-white/40 dark:bg-zinc-900/40 backdrop-blur-xl border border-white/20 dark:border-white/5 rounded-[32px] p-8 sm:p-10 shadow-2xl shadow-black/5 flex flex-col items-center text-center transition-transform duration-500 group-hover:scale-[1.01]">
                    <div className="mb-6 opacity-20 text-sky-500">
                      <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24"><path d="M14.017 21L14.017 18C14.017 16.8954 14.9124 16 16.0171 16H19.0171C20.1216 16 21.0171 15.1046 21.0171 14V11C21.0171 9.89543 20.1216 9 19.0171 9H16.0171C14.9124 9 14.017 8.10457 14.017 7V4H21.0171C22.1216 4 23.0171 4.89543 23.0171 6V14C23.0171 17.866 19.8831 21 16.0171 21H14.017ZM1 21L1 18C1 16.8954 1.89543 16 3 16H6C7.10457 16 8 15.1046 8 14V11C8 9.89543 7.10457 9 6 9H3C1.89543 9 1 8.10457 1 7V4H8C9.10457 4 10 4.89543 10 6V14C10 17.866 6.86599 21 3 21H1Z" /></svg>
                    </div>
                    
                    <p className="text-[20px] sm:text-[24px] font-semibold tracking-tight leading-snug text-zinc-900 dark:text-zinc-100 whitespace-pre-wrap break-words">
                      {post.content}
                    </p>
                    
                    <div className="mt-8 flex items-center gap-3">
                      <div className="w-1 h-1 rounded-full bg-zinc-300 dark:bg-zinc-700" />
                      <span className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-400 dark:text-zinc-500">Reflective Statement</span>
                      <div className="w-1 h-1 rounded-full bg-zinc-300 dark:bg-zinc-700" />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="relative group/caption">
                  <p className={`text-[15px] leading-relaxed text-zinc-900 dark:text-zinc-100 whitespace-pre-wrap break-words transition-all duration-300 ${!showAnalytics && post.content?.length > 180 ? 'line-clamp-3' : ''}`}>
                    {post.content}
                  </p>
                  {post.content?.length > 180 && !showAnalytics && (
                    <button className="text-zinc-500 text-[13px] font-bold mt-1 hover:text-blue-500 transition-colors">...more</button>
                  )}
                </div>
              )}
            </div>

            {/* Quoted Post Preview */}
            {post.quoted_post && (
              <div 
                className="mt-3 mb-1 rounded-2xl border border-zinc-100 dark:border-zinc-800 p-3 bg-zinc-50/50 dark:bg-zinc-900/50 hover:bg-zinc-100/50 dark:hover:bg-zinc-800/50 transition-colors cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation()
                  router.push(`/post?id=${post.quoted_post.id}`)
                }}
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="w-5 h-5 rounded-full bg-zinc-200 dark:bg-zinc-800 overflow-hidden">
                    {post.quoted_post.profiles?.avatar_url && (
                      <Image src={post.quoted_post.profiles.avatar_url} alt="" width={20} height={20} className="w-full h-full object-cover" unoptimized />
                    )}
                  </div>
                  <span className="font-bold text-[11px] tracking-tight">{post.quoted_post.profiles?.full_name}</span>
                </div>
                <p className="text-[12px] text-zinc-600 dark:text-zinc-400 line-clamp-2">
                  {post.quoted_post.content}
                </p>
              </div>
            )}

            {/* ── Poll Display ── */}
            {poll && (
              <div className="mt-4 mb-2 space-y-2" onClick={(e) => e.stopPropagation()}>
                {pollOptions.map((opt) => {
                  const votes = opt.poll_votes?.[0]?.count || 0
                  const percent = totalVotes > 0 ? Math.round((votes / totalVotes) * 100) : 0
                  const isVoted = votedOptionId === opt.id
                  const isExpired = new Date(poll.ends_at) < new Date()

                  return (
                    <button
                      key={opt.id}
                      disabled={!!votedOptionId || isExpired}
                      onClick={async (e) => {
                        e.stopPropagation()
                        if (!currentUser) {
                          setLoginPromptMessage('Join JPM to vote on polls')
                          setShowLoginPrompt(true)
                          return
                        }
                        setVotedOptionId(opt.id)
                        setTotalVotes(prev => prev + 1)
                        await supabase.from('poll_votes').insert({
                          poll_id: poll.id,
                          option_id: opt.id,
                          user_id: currentUser.id
                        })
                      }}
                      className="relative w-full h-11 rounded-xl border border-zinc-200 dark:border-zinc-700 overflow-hidden group/poll transition-all active:scale-[0.98]"
                    >
                      {/* Progress Bar */}
                      {(votedOptionId || isExpired) && (
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${percent}%` }}
                          className={`absolute inset-0 ${isVoted ? 'bg-sky-500/20 dark:bg-sky-500/30' : 'bg-zinc-100 dark:bg-zinc-800'}`}
                        />
                      )}
                      
                      <div className="absolute inset-0 px-4 flex items-center justify-between text-[15px]">
                        <span className={`font-bold ${isVoted ? 'text-sky-600 dark:text-sky-400' : 'text-zinc-700 dark:text-zinc-200'}`}>
                          {opt.option_text}
                          {isVoted && <span className="ml-2">✓</span>}
                        </span>
                        {(votedOptionId || isExpired) && (
                          <span className="font-black text-zinc-500">{percent}%</span>
                        )}
                      </div>
                    </button>
                  )
                })}
                <div className="flex items-center gap-2 text-[13px] text-zinc-400 mt-2 font-medium">
                  <span>{totalVotes} votes</span>
                  <span>·</span>
                  <span>{new Date(poll.ends_at) < new Date() ? 'Final results' : 'Active poll'}</span>
                </div>
              </div>
            )}

          </div>
        </div>

        {/* Row 2: Full-width Media — Fixed 4:5 Aspect Ratio like IG */}
        {post.video_url ? (
          <div
            className="w-full relative rounded-[20px] overflow-hidden group/video mb-2 aspect-[4/5] bg-zinc-100 dark:bg-zinc-900 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Blurred background frame */}
            {(post.image_url || images[0]) && (
              <div 
                className="absolute inset-0 z-0 bg-cover bg-center blur-3xl scale-125 opacity-40 select-none pointer-events-none"
                style={{ backgroundImage: `url(${post.image_url || images[0]})` }} 
              />
            )}
            
            <video
              src={post.video_url}
              className="w-full h-full object-cover relative z-10 drop-shadow-2xl"
              controls
              autoPlay
              loop
              muted
              playsInline
              poster={post.image_url || undefined}
            />
          </div>
        ) : images.length > 0 && (
          <div
            className="w-full relative rounded-[20px] overflow-hidden group/carousel aspect-[4/5] bg-zinc-100 dark:bg-zinc-900 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Blurred background frame */}
            {imageLoaded && (
              <div 
                className="absolute inset-0 z-0 bg-cover bg-center blur-3xl scale-125 opacity-40 select-none pointer-events-none"
                style={{ backgroundImage: `url(${images[imageIndex]})` }}
              />
            )}

            {dataSaver && !imageLoaded ? (
              <button 
                onClick={(e) => { e.stopPropagation(); setImageLoaded(true) }}
                className="w-full h-full flex flex-col items-center justify-center gap-2 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors relative z-10"
              >
                <PhotoIcon className="w-8 h-8 text-zinc-400" />
                <span className="text-[11px] font-black uppercase tracking-tighter text-zinc-500">Data saver: Click to load</span>
              </button>
            ) : (
              <div className="w-full h-full relative z-10">
                <AnimatePresence initial={false} custom={direction}>
                  <motion.div
                    key={imageIndex}
                    custom={direction}
                    variants={{
                      enter: (direction: number) => ({
                        x: direction > 0 ? '100%' : '-100%',
                        opacity: 0,
                        scale: 1.1
                      }),
                      center: {
                        x: 0,
                        opacity: 1,
                        scale: 1,
                        transition: {
                          x: { type: "spring", stiffness: 300, damping: 30 },
                          opacity: { duration: 0.2 },
                          scale: { duration: 0.4 }
                        }
                      },
                      exit: (direction: number) => ({
                        x: direction < 0 ? '100%' : '-100%',
                        opacity: 0,
                        scale: 0.9,
                        transition: {
                          x: { type: "spring", stiffness: 300, damping: 30 },
                          opacity: { duration: 0.2 }
                        }
                      })
                    }}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    className="absolute inset-0 w-full h-full"
                  >
                    <motion.div
                      drag="x"
                      dragConstraints={{ left: 0, right: 0 }}
                      dragElastic={0.7}
                      onDragEnd={(_, info) => {
                        const swipe = info.offset.x;
                        const threshold = 50;
                        if (swipe < -threshold) {
                          handleNextImage(new MouseEvent('click') as any);
                        } else if (swipe > threshold) {
                          handlePrevImage(new MouseEvent('click') as any);
                        }
                      }}
                      className="w-full h-full"
                    >
                      <Image
                        src={images[imageIndex]}
                        alt={post.title || `Post image ${imageIndex + 1}`}
                        width={1080}
                        height={1350}
                        className="w-full h-full object-cover drop-shadow-2xl pointer-events-none select-none"
                        unoptimized
                        onLoad={() => setImageLoaded(true)}
                      />
                    </motion.div>
                  </motion.div>
                </AnimatePresence>
              </div>
            )}

            {/* Carousel controls (multi-image only) */}
            {images.length > 1 && (
              <>
                 <motion.button
                   whileHover={{ scale: 1.1 }}
                   whileTap={{ scale: 0.9 }}
                   onClick={handlePrevImage}
                   className="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/40 text-white backdrop-blur-md opacity-0 group-hover/carousel:opacity-100 transition-opacity hover:bg-black/60 z-20"
                   aria-label="Previous image"
                 >
                   <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                     <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                   </svg>
                 </motion.button>
                 <motion.button
                   whileHover={{ scale: 1.1 }}
                   whileTap={{ scale: 0.9 }}
                   onClick={handleNextImage}
                   className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/40 text-white backdrop-blur-md opacity-0 group-hover/carousel:opacity-100 transition-opacity hover:bg-black/60 z-20"
                   aria-label="Next image"
                 >
                   <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                     <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                   </svg>
                 </motion.button>
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

            {/* Quote */}
            <button
              onClick={(e) => { 
                e.stopPropagation(); 
                if (!currentUser) {
                  setLoginPromptMessage('Join JPM to quote this post')
                  setShowLoginPrompt(true)
                  return
                }
                triggerHaptic(ImpactStyle.Medium);
                window.dispatchEvent(new CustomEvent('open-post-modal', { detail: post }))
              }}
              className="flex items-center gap-1 group hover:text-sky-500 transition-colors"
              title="Quote this post"
            >
              <div className="p-2 rounded-full group-hover:bg-sky-50 dark:group-hover:bg-sky-950/30">
                <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1zm12 0c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z"/></svg>
              </div>
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

            {/* Bookmark */}
            <button
              onClick={async (e) => {
                e.stopPropagation()
                if (!currentUser) {
                  setLoginPromptMessage('Join JPM to save this post')
                  setShowLoginPrompt(true)
                  return
                }
                triggerHaptic(ImpactStyle.Light)
                if (isBookmarked) {
                  setIsBookmarked(false)
                  await supabase.from('bookmarks').delete().eq('user_id', currentUser.id).eq('post_id', post.id)
                } else {
                  setIsBookmarked(true)
                  await supabase.from('bookmarks').upsert({ user_id: currentUser.id, post_id: post.id }, { onConflict: 'user_id,post_id' })
                }
              }}
              className={`flex items-center gap-1 group transition-colors ml-auto ${
                isBookmarked
                  ? 'text-black dark:text-white'
                  : 'text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200'
              }`}
              title="Archive post"
            >
              <div className={`p-2 rounded-full group-hover:bg-zinc-100 dark:group-hover:bg-zinc-800 ${
                isBookmarked ? 'bg-zinc-100 dark:bg-zinc-800' : ''
              }`}>
                <ArchiveBoxIcon className={`w-[18px] h-[18px] ${isBookmarked ? 'fill-current' : ''}`} />
              </div>
            </button>

            {/* Share */}
            <button
              onClick={handleShare}
              className="flex items-center gap-1 group hover:text-indigo-500 transition-colors"
              title="Share this post"
            >
              <div className="p-2 rounded-full group-hover:bg-indigo-50 dark:group-hover:bg-indigo-950/30">
                <ShareIcon className="w-[18px] h-[18px]" />
              </div>
            </button>

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

      {/* In-Article Ad when comments are open */}
      {showComments && <InArticleAd />}

      {/* Comments section */}
      {showComments && (
        <div className="bg-zinc-50 dark:bg-black border-t border-zinc-100 dark:border-zinc-800 px-2 sm:px-6 py-4 animate-in fade-in slide-in-from-top-2" onClick={(e) => e.stopPropagation()}>
          {canReply ? (
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
          ) : (
            <div className="flex items-center justify-center gap-2 mb-6 px-4 py-4 bg-zinc-100/50 dark:bg-zinc-900/50 rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-800 text-zinc-500 text-[13px] font-bold uppercase tracking-wider">
              <LockClosedIcon className="w-4 h-4" />
              {replyRestrictionReason}
            </div>
          )}
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


      {mounted && createPortal(
        <AnimatePresence>
          {showDeleteConfirm && (
            <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4 overflow-hidden">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowDeleteConfirm(false)}
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              />
              <motion.div 
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                className="relative z-10 w-full max-w-[324px] bg-white dark:bg-zinc-900 rounded-[36px] p-8 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.3)] border border-zinc-100 dark:border-zinc-800 text-center overflow-hidden"
              >
                <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-6 text-red-500">
                  <TrashIcon className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-black mb-2 text-zinc-900 dark:text-white leading-tight">Delete Post?</h3>
                <p className="text-zinc-500 dark:text-zinc-400 text-sm leading-relaxed mb-8 px-2">
                  This action is permanent and cannot be undone. Are you sure?
                </p>
                <div className="flex flex-col gap-3">
                  <button 
                    onClick={() => { triggerHaptic(ImpactStyle.Heavy); handleDelete(); }}
                    className="w-full py-4 bg-red-500 hover:bg-red-600 active:scale-[0.97] text-white rounded-2xl font-black text-sm transition-all shadow-lg shadow-red-500/20"
                  >
                    Yes, Delete Permanently
                  </button>
                  <button 
                    onClick={() => setShowDeleteConfirm(false)}
                    className="w-full py-4 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 active:scale-[0.97] text-zinc-900 dark:text-white rounded-2xl font-bold text-sm transition-all"
                  >
                    No, Keep Post
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {showLoginPrompt && (
        <LoginPromptModal 
          message={loginPromptMessage}
          onClose={() => setShowLoginPrompt(false)} 
        />
      )}
    </div>
  )
})

