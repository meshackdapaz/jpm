'use client'

import React, { useState, useRef, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useI18n } from '@/lib/i18n'
import Image from 'next/image'
import { useAuth } from './AuthProvider'
import { GiphyPicker } from './GiphyPicker'
import { motion, AnimatePresence } from 'framer-motion'
import { Haptics, ImpactStyle } from '@capacitor/haptics'
import { Capacitor } from '@capacitor/core'
import { 
  VideoCameraIcon,
  ListBulletIcon,
  ChatBubbleLeftEllipsisIcon,
  EllipsisHorizontalIcon,
  DocumentDuplicateIcon,
  XMarkIcon,
  PhotoIcon,
  GifIcon,
  CheckIcon,
  ChevronRightIcon
} from '@heroicons/react/24/outline'

const triggerHaptic = (style = ImpactStyle.Light) => {
  if (Capacitor.isNativePlatform()) {
    Haptics.impact({ style }).catch(() => {})
  }
}

interface PostItem {
  id: string
  content: string
  images: File[]
  remoteUrls: string[]
  previewUrls: string[]
  video: File | null
  videoPreviewUrl: string | null
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
  const [thread, setThread] = useState<PostItem[]>([{
    id: Math.random().toString(36).substr(2, 9),
    content: '',
    images: [],
    remoteUrls: [],
    previewUrls: [],
    video: null,
    videoPreviewUrl: null
  }])
  
  const [loading, setLoading] = useState(false)
  const [showGiphy, setShowGiphy] = useState<{ postIndex: number } | null>(null)
  const [showOptions, setShowOptions] = useState(false)
  const [showDrafts, setShowDrafts] = useState(false)
  const [drafts, setDrafts] = useState<any[]>([])
  
  const [replyPrivacy, setReplyPrivacy] = useState<'Anyone' | 'Followers' | 'Followed' | 'Mentioned'>('Anyone')
  const [reviewReplies, setReviewReplies] = useState(false)
  const [isGhost, setIsGhost] = useState(false)
  
  const fileInputRef = useRef<HTMLInputElement>(null)
  const videoInputRef = useRef<HTMLInputElement>(null)
  const textareaRefs = useRef<{[key: string]: HTMLTextAreaElement | null}>({})
  
  const { t } = useI18n()
  const supabase = createClient()
  const { user } = useAuth()
  const [currentProfile, setCurrentProfile] = useState<any>(null)

  useEffect(() => {
    if (user) {
      supabase.from('profiles').select('*').eq('id', user.id).single().then(({ data }: { data: any }) => setCurrentProfile(data))
      const savedDrafts = localStorage.getItem('echo_drafts_v4')
      if (savedDrafts) setDrafts(JSON.parse(savedDrafts))
    }
  }, [user])

  const saveDraft = useCallback(() => {
    if (thread[0].content.trim()) {
      const newDraft = { id: Date.now(), thread, date: new Date().toISOString() }
      const updated = [newDraft, ...drafts].slice(0, 10)
      setDrafts(updated)
      localStorage.setItem('echo_drafts_v4', JSON.stringify(updated))
      triggerHaptic(ImpactStyle.Medium)
    }
  }, [thread, drafts])

  const addThreadPost = () => {
    const newPostItem: PostItem = {
      id: Math.random().toString(36).substr(2, 9),
      content: '',
      images: [],
      remoteUrls: [],
      previewUrls: [],
      video: null,
      videoPreviewUrl: null
    }
    setThread([...thread, newPostItem])
    triggerHaptic()
  }

  const updatePost = (index: number, updates: Partial<PostItem>) => {
    const newThread = [...thread]
    newThread[index] = { ...newThread[index], ...updates }
    setThread(newThread)
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const files = Array.from(e.target.files || [])
    if (files.length > 0) {
      const post = thread[index]
      const newImages = [...post.images, ...files].slice(0, 4 - post.remoteUrls.length)
      const newPreviews = [...post.remoteUrls, ...newImages.map(f => URL.createObjectURL(f))]
      updatePost(index, { images: newImages, previewUrls: newPreviews, video: null, videoPreviewUrl: null })
    }
  }

  const handleVideoChange = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const file = e.target.files?.[0]
    if (file) {
      updatePost(index, { video: file, videoPreviewUrl: URL.createObjectURL(file), images: [], previewUrls: [] })
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || loading) return
    
    setLoading(true)
    try {
      let previousPostId: string | null = null

      for (const [idx, post] of thread.entries()) {
        if (!post.content.trim() && post.images.length === 0 && !post.video) continue

        let videoUrl = null
        let imageUrls: string[] = [...post.remoteUrls]

        if (post.video) {
          const name = `vid_${Date.now()}.mp4`
          await supabase.storage.from('videos').upload(name, post.video)
          videoUrl = supabase.storage.from('videos').getPublicUrl(name).data.publicUrl
        }

        if (post.images.length > 0) {
          const urls = await Promise.all(post.images.map(async img => {
            const name = `img_${Date.now()}_${Math.random()}.jpg`
            await supabase.storage.from('memes').upload(name, img)
            return supabase.storage.from('memes').getPublicUrl(name).data.publicUrl
          }))
          imageUrls.push(...urls.filter((u): u is string => u !== null))
        }

        const result: any = await supabase.from('posts').insert({
          content: post.content.trim(),
          image_urls: imageUrls,
          video_url: videoUrl,
          creator_id: user.id,
          parent_id: previousPostId,
          quoted_post_id: idx === 0 ? quotedPost?.id : null,
          is_ghost: isGhost,
          expires_at: isGhost ? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() : null,
          settings: {
            reply_privacy: replyPrivacy,
            review_replies: reviewReplies,
            thread_index: idx,
            is_quote: idx === 0 && !!quotedPost,
            ghost_mode: isGhost
          }
        }).select('id').single()

        if (result.error) throw result.error
        previousPostId = result.data.id
      }
      
      localStorage.removeItem('echo_post_draft')
      if (onSuccess) {
        onSuccess()
      } else {
        window.dispatchEvent(new CustomEvent('post-created'))
      }
    } catch (err: any) {
      alert('Post failed: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={`flex flex-col bg-zinc-950 h-full ${inModal ? 'fixed inset-0 z-50' : 'border border-zinc-900 rounded-3xl overflow-hidden'}`}>
      <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
        
        <div className="flex items-center justify-between px-6 pt-[calc(env(safe-area-inset-top)+12px)] pb-4 border-b border-zinc-900/50">
          <button type="button" onClick={() => onSuccess?.()} className="p-2 -ml-2 text-zinc-500 hover:text-white transition-all">
            <XMarkIcon className="w-6 h-6" />
          </button>
          <h2 className="text-[17px] font-black tracking-tight text-white">Create Post</h2>
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => setShowDrafts(true)} className="p-2 text-zinc-400 hover:text-white transition-all relative">
              <DocumentDuplicateIcon className="w-5 h-5" />
              {drafts.length > 0 && <div className="absolute top-1 right-1 w-2 h-2 bg-blue-500 rounded-full border-2 border-zinc-950" />}
            </button>
            <button type="button" onClick={() => setShowOptions(true)} className="p-2 text-zinc-400 hover:text-white transition-all"><EllipsisHorizontalIcon className="w-6 h-6" /></button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-6 scrollbar-none">
          {thread.map((post, idx) => (
            <div key={post.id} className="flex gap-4 mb-4 relative last:mb-0">
               <div className="flex flex-col items-center flex-none">
                <div className={`w-10 h-10 rounded-full bg-zinc-900 border ${isGhost ? 'border-amber-500/50' : 'border-zinc-800'} overflow-hidden flex items-center justify-center`}>
                  {isGhost ? (
                    <div className="w-full h-full bg-gradient-to-br from-amber-500/20 to-zinc-900 flex items-center justify-center">
                      <span className="text-[10px] font-black text-amber-500 tracking-tighter">GHOST</span>
                    </div>
                  ) : currentProfile?.avatar_url && (
                    <Image src={currentProfile.avatar_url} alt="" width={40} height={40} className="w-full h-full object-cover" unoptimized />
                  )}
                </div>
                {idx < thread.length - 1 && <div className="w-[2px] flex-1 bg-zinc-900 my-2 rounded-full" />}
              </div>

              <div className="flex-1 min-w-0 pt-0.5">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`font-black text-sm ${isGhost ? 'text-amber-500' : 'text-zinc-100'}`}>
                    {isGhost ? 'Anonymous Ghost' : currentProfile?.username || 'user'}
                  </span>
                  {idx === 0 && (
                    <div className="flex items-center gap-1 text-zinc-500 text-[13px] font-bold">
                       <span>›</span>
                       <span className="text-zinc-600 hover:text-zinc-400 transition-colors cursor-pointer">Anyone</span>
                    </div>
                  )}
                </div>

                <textarea
                  ref={el => { textareaRefs.current[post.id] = el }}
                  value={post.content}
                  onChange={(e) => updatePost(idx, { content: e.target.value })}
                  placeholder={idx === 0 ? "What's happening?" : "Say more..."}
                  className="w-full bg-transparent border-none focus:ring-0 resize-none placeholder-zinc-700 text-white font-medium text-[16px] p-0 min-h-[40px]"
                  rows={1}
                  onInput={(e: any) => {
                    e.target.style.height = 'auto'
                    e.target.style.height = e.target.scrollHeight + 'px'
                  }}
                />

                {/* Quote Preview */}
                {idx === 0 && quotedPost && (
                  <div className="mt-4 p-4 rounded-3xl border border-zinc-900 bg-zinc-900/40 relative">
                    <div className="flex items-center gap-2 mb-2">
                       <div className="w-5 h-5 rounded-full bg-zinc-800 overflow-hidden flex-none">
                         {quotedPost.profiles?.avatar_url && <Image src={quotedPost.profiles.avatar_url} alt="" width={20} height={20} className="w-full h-full object-cover" unoptimized />}
                       </div>
                       <span className="text-xs font-black text-zinc-300">@{quotedPost.profiles?.username}</span>
                    </div>
                    <p className="text-sm text-zinc-400 line-clamp-3 leading-relaxed">{quotedPost.content}</p>
                    <button type="button" onClick={(e) => { e.preventDefault(); window.dispatchEvent(new CustomEvent('open-post-modal', { detail: null })) }} className="absolute top-2 right-2 p-1 bg-black/40 rounded-full hover:bg-black/60 transition-colors">
                      <XMarkIcon className="w-4 h-4 text-white" />
                    </button>
                  </div>
                )}

                <div className="flex items-center gap-5 mt-3">
                  <button type="button" onClick={() => fileInputRef.current?.click()} className="text-zinc-600 hover:text-white transition-all"><PhotoIcon className="w-[21px] h-[21px]" /></button>
                  <button type="button" onClick={() => videoInputRef.current?.click()} className="text-zinc-600 hover:text-white transition-all"><VideoCameraIcon className="w-[21px] h-[21px]" /></button>
                  <button type="button" onClick={() => setShowGiphy({ postIndex: idx })} className="text-zinc-600 hover:text-white transition-all"><GifIcon className="w-[21px] h-[21px]" /></button>
                  <button type="button" onClick={addThreadPost} className="text-zinc-600 hover:text-white transition-all"><ListBulletIcon className="w-[21px] h-[21px]" /></button>
                  <button type="button" onClick={() => setShowOptions(true)} className="text-zinc-600 hover:text-white transition-all"><EllipsisHorizontalIcon className="w-[21px] h-[21px]" /></button>
                </div>

                {(post.previewUrls.length > 0 || post.videoPreviewUrl) && (
                  <div className="mt-4 space-y-3 max-w-[85%]">
                    {post.previewUrls.map((url, i) => (
                      <div key={i} className="relative aspect-video rounded-[24px] overflow-hidden border border-zinc-900">
                        <Image src={url} alt="" fill className="object-cover" unoptimized={url.startsWith('blob:')} />
                        <button type="button" onClick={() => updatePost(idx, { previewUrls: post.previewUrls.filter((_, j) => j !== i) })} className="absolute top-2 right-2 p-1.5 bg-black/60 rounded-full"><XMarkIcon className="w-4 h-4" /></button>
                      </div>
                    ))}
                    {post.videoPreviewUrl && (
                       <div className="relative aspect-video rounded-[24px] overflow-hidden border border-zinc-900 bg-black">
                          <video src={post.videoPreviewUrl} className="w-full h-full object-cover" controls />
                          <button type="button" onClick={() => updatePost(idx, { video: null, videoPreviewUrl: null })} className="absolute top-2 right-2 p-1.5 bg-black/60 rounded-full"><XMarkIcon className="w-4 h-4" /></button>
                       </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}

          <button 
            type="button" 
            onClick={addThreadPost}
            className="mt-6 flex items-center gap-3 group px-1"
          >
             <div className="w-10 h-10 rounded-full border border-dashed border-zinc-800 flex items-center justify-center opacity-40 group-hover:opacity-100 transition-all">
                <span className="text-zinc-500 text-lg">+</span>
             </div>
             <span className="text-[14px] font-black text-zinc-600 group-hover:text-zinc-400 transition-colors">Add to thread</span>
          </button>
        </div>

        <input type="file" hidden ref={fileInputRef} accept="image/*" multiple onChange={(e) => handleImageChange(e, thread.length - 1)} />
        <input type="file" hidden ref={videoInputRef} accept="video/*" onChange={(e) => handleVideoChange(e, thread.length - 1)} />

        <div className="px-6 py-6 border-t border-zinc-900/30 bg-zinc-950/80 backdrop-blur-xl">
          <div className="flex items-center justify-between mb-2">
            <button 
              type="button" 
              onClick={() => setShowOptions(true)}
              className="px-4 py-2 rounded-[18px] bg-zinc-900 border border-zinc-800 text-zinc-400 font-bold text-[13px] hover:bg-zinc-800 hover:text-white transition-all active:scale-95"
            >
              Options
            </button>

            <button 
              type="submit" 
              disabled={loading || (!thread[0].content.trim() && thread[0].images.length === 0 && !thread[0].video)} 
              className="bg-white text-black px-8 py-3 rounded-[20px] font-black text-[15px] transition-all disabled:opacity-20 active:scale-95 shadow-xl shadow-white/5"
            >
              {loading ? '...' : 'Post'}
            </button>
          </div>
          <p className="text-[11px] text-zinc-600 font-bold ml-1">Drafts auto-save to local history</p>
        </div>
      </form>

      <AnimatePresence>
        {showOptions && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/80 z-[60]" onClick={() => setShowOptions(false)} />
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 25 }} className="fixed bottom-0 left-0 right-0 bg-zinc-950 border-t border-zinc-900 rounded-t-[40px] z-[70] px-8 pt-4 pb-[calc(env(safe-area-inset-bottom)+32px)]">
              <div className="w-12 h-1.5 bg-zinc-800 rounded-full mx-auto mb-8" />
              <h3 className="text-xl font-black text-white text-center mb-10">Post Settings</h3>
              
              <div className="space-y-6">
                <div>
                  <p className="text-[10px] font-black text-zinc-500 uppercase tracking-[2px] mb-4 ml-1">Who can reply?</p>
                  {(['Anyone', 'Followers', 'Followed', 'Mentioned'] as const).map(opt => (
                    <button key={opt} onClick={() => { setReplyPrivacy(opt); triggerHaptic() }} className="w-full flex items-center justify-between py-5 border-b border-zinc-900/50 group">
                      <span className={`font-bold transition-colors ${replyPrivacy === opt ? 'text-white' : 'text-zinc-500 group-hover:text-zinc-300'}`}>{opt}</span>
                      <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${replyPrivacy === opt ? 'border-white bg-white' : 'border-zinc-800'}`}>
                        {replyPrivacy === opt && <div className="w-2.5 h-2.5 rounded-full bg-black" />}
                      </div>
                    </button>
                  ))}
                </div>

                 <div className="flex items-center justify-between py-6">
                  <div>
                    <p className="font-bold text-white">Ghost Post</p>
                    <p className="text-xs text-zinc-500 font-medium">Anonymous, disappears in 24h</p>
                  </div>
                  <div onClick={() => { setIsGhost(!isGhost); triggerHaptic() }} className={`w-12 h-7 rounded-full p-1 transition-all cursor-pointer ${isGhost ? 'bg-amber-500' : 'bg-zinc-800'}`}>
                    <div className={`w-5 h-5 rounded-full bg-white transition-all shadow-md ${isGhost ? 'translate-x-5' : ''}`} />
                  </div>
                </div>

                <div className="flex items-center justify-between py-6">
                  <div>
                    <p className="font-bold text-white">Review replies</p>
                    <p className="text-xs text-zinc-500 font-medium">Verify replies before they go public</p>
                  </div>
                  <div onClick={() => { setReviewReplies(!reviewReplies); triggerHaptic() }} className={`w-12 h-7 rounded-full p-1 transition-all cursor-pointer ${reviewReplies ? 'bg-blue-600' : 'bg-zinc-800'}`}>
                    <div className={`w-5 h-5 rounded-full bg-white transition-all shadow-md ${reviewReplies ? 'translate-x-5' : ''}`} />
                  </div>
                </div>
              </div>

              <button onClick={() => setShowOptions(false)} className="w-full bg-zinc-900 text-white font-black py-4 mt-8 rounded-[24px]">Done</button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showDrafts && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/80 z-[60]" onClick={() => setShowDrafts(false)} />
            <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} className="fixed inset-y-0 right-0 w-full bg-zinc-950 z-[70] flex flex-col p-8 pt-[calc(env(safe-area-inset-top)+20px)]">
              <div className="flex items-center justify-between mb-10">
                <h3 className="text-2xl font-black text-white">Recent Drafts</h3>
                <button onClick={() => setShowDrafts(false)} className="p-2 bg-zinc-900 rounded-full"><XMarkIcon className="w-6 h-6" /></button>
              </div>
              
              <div className="flex-1 space-y-4">
                {drafts.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center px-10">
                    <DocumentDuplicateIcon className="w-12 h-12 text-zinc-800 mb-4" />
                    <p className="text-zinc-600 font-bold">No drafts yet. Start writing to see them here.</p>
                  </div>
                ) : (
                  drafts.map((d, i) => (
                    <div key={i} onClick={() => { setThread(d.thread); setShowDrafts(false); triggerHaptic() }} className="p-6 bg-zinc-900 rounded-[24px] border border-zinc-800 group active:scale-[0.98] transition-all">
                      <p className="text-white font-bold line-clamp-2 mb-2">{d.thread[0].content || 'Empty post'}</p>
                      <p className="text-[10px] text-zinc-500 font-bold uppercase">{new Date(d.date).toLocaleDateString()}</p>
                    </div>
                  ))
                )}
              </div>
              
              {drafts.length > 0 && (
                <button onClick={() => { setDrafts([]); localStorage.removeItem('echo_drafts_v4'); triggerHaptic() }} className="mt-6 text-zinc-500 font-bold text-xs uppercase tracking-widest hover:text-red-500 transition-colors">Clear All History</button>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>{showGiphy && <GiphyPicker onGifSelect={(url) => {
        const post = thread[showGiphy.postIndex]
        const newRemote = [...post.remoteUrls, url].slice(0, 4 - post.images.length)
        updatePost(showGiphy.postIndex, { remoteUrls: newRemote, previewUrls: [...newRemote, ...post.images.map(f => URL.createObjectURL(f))] })
        setShowGiphy(null)
      }} onClose={() => setShowGiphy(null)} />}</AnimatePresence>
    </div>
  )
}
