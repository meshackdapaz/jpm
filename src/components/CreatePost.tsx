'use client'

import React, { useState, useRef, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useI18n } from '@/lib/i18n'
import Image from 'next/image'
import { useAuth } from './AuthProvider'
import { GiphyPicker } from './GiphyPicker'
import { motion, AnimatePresence } from 'framer-motion'
import { Haptics, ImpactStyle } from '@capacitor/haptics'
import { Capacitor } from '@capacitor/core'
import { 
  GlobeAltIcon, 
  UsersIcon, 
  CheckIcon,
  ChatBubbleBottomCenterTextIcon,
  XMarkIcon,
  CalendarIcon,
  PhotoIcon,
  GifIcon,
  VideoCameraIcon
} from '@heroicons/react/24/outline'

const triggerHaptic = (style = ImpactStyle.Light) => {
  if (Capacitor.isNativePlatform()) {
    Haptics.impact({ style }).catch(() => {})
  }
}

export function CreatePost({ 
  inModal = false, 
  onSuccess,
  quotedPost = null 
}: { 
  inModal?: boolean, 
  onSuccess?: () => void,
  quotedPost?: any
}) {
  const [content, setContent] = useState('')
  const [images, setImages] = useState<File[]>([])
  const [remoteUrls, setRemoteUrls] = useState<string[]>([])
  const [previewUrls, setPreviewUrls] = useState<string[]>([])
  const [video, setVideo] = useState<File | null>(null)
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [showGiphy, setShowGiphy] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const videoInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const { t } = useI18n()
  const supabase = createClient()
  const { user } = useAuth()
  const [currentProfile, setCurrentProfile] = useState<any>(null)
  
  const [poll, setPoll] = useState<{ question: string, options: string[], expires_at: string } | null>(null)
  const [isQuote, setIsQuote] = useState(false)
  const [replyPrivacy, setReplyPrivacy] = useState<'Everyone' | 'Followers' | 'Mentioned'>('Everyone')
  const [showMoreMenu, setShowMoreMenu] = useState(false)

  useEffect(() => {
    if (user) {
      supabase.from('profiles').select('*').eq('id', user.id).single().then(({ data }: { data: any }) => {
        setCurrentProfile(data)
      })
      const savedDraft = localStorage.getItem('echo_post_draft')
      if (savedDraft) {
        try {
          const draft = JSON.parse(savedDraft)
          if (draft.content) setContent(draft.content)
        } catch (e) { console.error('Error loading draft:', e) }
      }
    } else {
      setCurrentProfile(null)
    }
  }, [user])

  useEffect(() => {
    if (user && content) {
      localStorage.setItem('echo_post_draft', JSON.stringify({ content }))
    }
  }, [content, user])
  
  useEffect(() => {
    const timer = setTimeout(() => {
      textareaRef.current?.focus()
    }, 200)
    return () => clearTimeout(timer)
  }, [inModal])

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length > 0) {
      if (video) { setVideo(null); setVideoPreviewUrl(null) }
      const newImages = [...images, ...files].slice(0, 4 - remoteUrls.length)
      setImages(newImages)
      setPreviewUrls([...remoteUrls, ...newImages.map((file: File) => URL.createObjectURL(file))])
    }
  }

  const handleVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setVideo(file)
      setImages([])
      setRemoteUrls([])
      setPreviewUrls([])
      setVideoPreviewUrl(URL.createObjectURL(file))
    }
  }

  const handleGifSelect = (url: string) => {
    if (remoteUrls.length + images.length >= 4) return
    const newRemote = [...remoteUrls, url]
    setRemoteUrls(newRemote)
    setPreviewUrls([...newRemote, ...images.map((file: File) => URL.createObjectURL(file))])
    setShowGiphy(false)
  }

  const removeVideo = () => {
    setVideo(null)
    setVideoPreviewUrl(null)
  }

  const removeImage = (index: number) => {
    if (index < remoteUrls.length) {
      const newRemote = remoteUrls.filter((_, i) => i !== index)
      setRemoteUrls(newRemote)
      setPreviewUrls([...newRemote, ...images.map(f => URL.createObjectURL(f))])
    } else {
      const imgIndex = index - remoteUrls.length
      const newImages = images.filter((_, i) => i !== imgIndex)
      setImages(newImages)
      setPreviewUrls([...remoteUrls, ...newImages.map(f => URL.createObjectURL(f))])
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) { alert('Please log in to post'); return }
    if (!content.trim() && images.length === 0 && remoteUrls.length === 0) return
    
    setLoading(true)
    let image_urls: string[] = [...remoteUrls]
    let video_url: string | null = null

    try {
      if (video) {
        const fileName = `${Math.random()}.mp4`
        const { error } = await supabase.storage.from('videos').upload(fileName, video)
        if (error) throw error
        video_url = supabase.storage.from('videos').getPublicUrl(fileName).data.publicUrl
      }
      if (images.length > 0) {
        const uploadPromises = images.map(async (img: File, index: number) => {
          const fileName = `${Math.random()}.jpg`
          const { error } = await supabase.storage.from('memes').upload(fileName, img)
          if (error) { console.error(`Upload error for image ${index}:`, error); return null }
          return supabase.storage.from('memes').getPublicUrl(fileName).data.publicUrl
        })
        const results = await Promise.all(uploadPromises)
        image_urls = results.filter((url): url is string => url !== null)
      }

      const { data: postData, error: postError } = await supabase.from('posts').insert([{
        content: content.trim(),
        image_url: image_urls[0] || null,
        image_urls: image_urls,
        video_url: video_url,
        creator_id: user.id,
        quoted_post_id: quotedPost?.id || null,
        settings: {
          is_quote: isQuote || !!quotedPost,
          reply_privacy: replyPrivacy,
          has_video: !!video_url
        }
      }]).select('id').single()

      if (postError) throw postError
      const lastPostId = postData.id

      // Send Quote Notification
      if (quotedPost && quotedPost.creator_id !== user.id) {
        await supabase.from('notifications').insert({
          user_id: quotedPost.creator_id,
          actor_id: user.id,
          type: 'quote',
          post_id: lastPostId
        })
      }

      if (poll) {
        const { data: pData, error: pError } = await supabase.from('polls').insert({
          post_id: lastPostId,
          question: poll.question || content.slice(0, 100),
          ends_at: poll.expires_at
        }).select().single()
        if (!pError) {
          await supabase.from('poll_options').insert(
            poll.options.map((opt, idx) => ({
              poll_id: pData.id,
              option_text: opt,
              display_order: idx
            }))
          )
        }
      }

      const mentionRegex = /@(\w+)/g
      const mentions = [...content.matchAll(mentionRegex)].map((m: any) => m[1].toLowerCase())
      if (mentions.length > 0) {
        const { data: mentionedUsers } = await supabase.from('profiles').select('id, settings').in('username', mentions)
        if (mentionedUsers && mentionedUsers.length > 0) {
          const notifications = mentionedUsers
            .filter((u: any) => u.id !== user.id)
            .map((u: any) => ({ user_id: u.id, actor_id: user.id, type: 'mention', post_id: lastPostId }))
          if (notifications.length > 0) await supabase.from('notifications').insert(notifications)
        }
      }

      setContent('')
      setImages([])
      setPreviewUrls([])
      setRemoteUrls([])
      setPoll(null)
      setIsQuote(false)
      localStorage.removeItem('echo_post_draft')
      if (onSuccess) onSuccess()
      else window.location.reload()
    } catch (err: any) {
      console.error('Error creating post:', err)
      alert('Failed: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={`flex flex-col bg-white dark:bg-black h-full ${inModal ? '' : 'border border-zinc-200 dark:border-zinc-800 rounded-3xl p-1 shadow-sm'}`}>
      <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto px-4 pt-4 pb-2 scrollbar-none">
          <div className="flex gap-4">
          <div className="flex flex-col items-center flex-none" style={{ width: 48 }}>
            <div className="w-12 h-12 rounded-full bg-zinc-200 dark:bg-zinc-800 overflow-hidden shadow-sm">
              {currentProfile?.avatar_url ? (
                <Image src={currentProfile.avatar_url} alt="Avatar" width={48} height={48} className="w-full h-full object-cover" unoptimized />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-zinc-500 font-bold text-sm">
                  {currentProfile?.full_name?.[0] || '?'}
                </div>
              )}
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <div className={`relative mt-1 ${isQuote ? 'bg-zinc-100/40 dark:bg-zinc-800/40 p-6 rounded-3xl border border-zinc-200/50 mb-4' : ''}`}>
              <textarea
                ref={textareaRef}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder={quotedPost ? "Add a comment..." : t('whatIsHappening')}
                className={`w-full bg-transparent border-none focus:ring-0 resize-none placeholder-zinc-400 dark:placeholder-zinc-500 font-medium ${isQuote ? 'text-[22px] text-center font-black leading-tight' : 'text-[18px]'}`}
                rows={inModal ? 6 : 3}
              />
            </div>

            {/* Quoted Post Preview */}
            {quotedPost && (
              <div className="mt-2 mb-4 rounded-3xl border border-zinc-100 dark:border-zinc-800 p-4 bg-zinc-50/50 dark:bg-zinc-900/50">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-5 h-5 rounded-full bg-zinc-200 dark:bg-zinc-800 overflow-hidden">
                    {quotedPost.profiles?.avatar_url && (
                      <Image src={quotedPost.profiles.avatar_url} alt="" width={20} height={20} className="w-full h-full object-cover" unoptimized />
                    )}
                  </div>
                  <span className="font-bold text-xs tracking-tight">{quotedPost.profiles?.full_name}</span>
                  <span className="text-zinc-500 text-[10px]">@{quotedPost.profiles?.username}</span>
                </div>
                <p className="text-[13px] text-zinc-600 dark:text-zinc-400 line-clamp-3">
                  {quotedPost.content}
                </p>
              </div>
            )}

            {/* Video Preview */}
            {videoPreviewUrl && (
              <div className="relative mt-4 rounded-2xl overflow-hidden bg-black aspect-video group">
                <video 
                  src={videoPreviewUrl} 
                  className="w-full h-full object-cover"
                  controls
                />
                <button
                  onClick={removeVideo}
                  className="absolute top-2 right-2 p-1.5 bg-black/50 hover:bg-black/70 text-white rounded-full transition-colors opacity-0 group-hover:opacity-100"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>
            )}

            {/* Image Previews */}
            {previewUrls.length > 0 && (
              <div className={`mt-3 grid gap-2 ${previewUrls.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                {previewUrls.map((url, i) => (
                  <div key={i} className="relative aspect-video rounded-3xl overflow-hidden group/img border border-zinc-100 dark:border-zinc-800">
                    <Image src={url} alt="" fill className="object-cover" unoptimized={url.startsWith('blob:')} />
                    <button type="button" onClick={() => removeImage(i)} className="absolute top-2 right-2 p-1.5 bg-black/60 text-white rounded-full">
                      <XMarkIcon className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {poll && (
              <div className="mt-4 p-4 bg-zinc-50 dark:bg-zinc-900 rounded-3xl border border-zinc-200 relative animate-in zoom-in-95">
                <button type="button" onClick={() => setPoll(null)} className="absolute top-3 right-3 text-zinc-400"><XMarkIcon className="w-5 h-5" /></button>
                <p className="text-[10px] font-black uppercase text-zinc-400 tracking-widest mb-3">Poll: {poll.question}</p>
                <div className="space-y-2">
                  {poll.options.map((opt, i) => (
                    <div key={i} className="px-4 py-2 bg-white dark:bg-black rounded-xl border border-zinc-100 text-sm font-bold opacity-60">{opt}</div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <input type="file" hidden ref={fileInputRef} accept="image/*" multiple onChange={handleImageChange} />
      <input type="file" hidden ref={videoInputRef} accept="video/*" onChange={handleVideoChange} />

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-zinc-100 dark:border-zinc-800 mt-2 bg-white/80 dark:bg-black/80 backdrop-blur-xl">
          <div className="flex items-center gap-1">
            <button type="button" onClick={() => fileInputRef.current?.click()} className="p-2 text-black dark:text-white hover:bg-zinc-100 dark:hover:bg-white/5 rounded-full transition-colors"><PhotoIcon className="w-5 h-5" /></button>
            <button type="button" onClick={() => videoInputRef.current?.click()} className="p-2 text-black dark:text-white hover:bg-zinc-100 dark:hover:bg-white/5 rounded-full transition-colors"><VideoCameraIcon className="w-5 h-5" /></button>
            <button type="button" onClick={() => setShowGiphy(true)} className="p-2 text-black dark:text-white hover:bg-zinc-100 dark:hover:bg-white/5 rounded-full transition-colors"><GifIcon className="w-5 h-5" /></button>
            <button type="button" onClick={() => setIsQuote(!isQuote)} className={`p-2 transition-colors rounded-full ${isQuote ? 'text-black dark:text-white bg-zinc-100 dark:bg-white/10' : 'text-zinc-400 hover:bg-zinc-50 dark:hover:bg-white/5'}`} title="Toggle Quote Mode"><ChatBubbleBottomCenterTextIcon className="w-5 h-5" /></button>
            
            <div className="relative">
              <button type="button" onClick={() => setShowMoreMenu(!showMoreMenu)} className={`p-2 rounded-full transition-colors ${replyPrivacy !== 'Everyone' ? 'text-black dark:text-white bg-zinc-100 dark:bg-white/10' : 'text-zinc-400 hover:bg-zinc-50 dark:hover:bg-white/5'}`}><svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/></svg></button>
              <AnimatePresence>
                {showMoreMenu && (
                  <>
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-40" onClick={() => setShowMoreMenu(false)} />
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="absolute bottom-full left-0 mb-4 w-64 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-xl z-50 p-2 overflow-hidden">
                      <div className="px-4 py-3 mb-2 bg-zinc-50 dark:bg-white/5 rounded-2xl"><p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Who can reply?</p></div>
                      {(['Everyone', 'Followers', 'Mentioned'] as const).map((opt) => (
                        <button key={opt} type="button" onClick={() => { setReplyPrivacy(opt); setShowMoreMenu(false); triggerHaptic() }} className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl text-sm font-bold ${replyPrivacy === opt ? 'bg-sky-500/10 text-sky-500' : 'hover:bg-zinc-50 dark:hover:bg-white/5 text-zinc-600 dark:text-zinc-300'}`}>
                          {opt === 'Everyone' ? 'Everyone' : opt === 'Followers' ? 'Followers' : 'Mentioned Only'}
                          {replyPrivacy === opt && <CheckIcon className="w-4 h-4" />}
                        </button>
                      ))}
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          </div>

          <button type="submit" disabled={loading || (!content.trim() && images.length === 0)} className="bg-black dark:bg-white text-white dark:text-black px-7 py-2 rounded-full font-black text-[14px] transition-all disabled:opacity-30 active:scale-95">{loading ? '...' : t('post')}</button>
        </div>
      </form>
      <AnimatePresence>{showGiphy && <GiphyPicker onGifSelect={handleGifSelect} onClose={() => setShowGiphy(false)} />}</AnimatePresence>
    </div>
  )
}
