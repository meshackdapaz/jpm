'use client'

import React, { useState, useRef, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useI18n } from '@/lib/i18n'
import Image from 'next/image'
import { useAuth } from './AuthProvider'

export function CreatePost({ inModal = false, onSuccess }: { inModal?: boolean, onSuccess?: () => void }) {
  const [content, setContent] = useState('')
  const [images, setImages] = useState<File[]>([])
  const [previewUrls, setPreviewUrls] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const { t } = useI18n()
  const supabase = createClient()
  const { user } = useAuth()
  const [currentProfile, setCurrentProfile] = useState<any>(null)
  const [topText, setTopText] = useState('')
  const [bottomText, setBottomText] = useState('')
  const [showEditor, setShowEditor] = useState(false)
  const [textColor, setTextColor] = useState('#ffffff')
  const [textMode, setTextMode] = useState<'normal' | 'stroke' | 'bg'>('stroke')
  const [isBold, setIsBold] = useState(true)
  const [isItalic, setIsItalic] = useState(false)
  const [isUnderline, setIsUnderline] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const imageRef = useRef<HTMLImageElement | null>(null)

  useEffect(() => {
    if (user) {
      supabase.from('profiles').select('*').eq('id', user.id).single().then(({ data }: { data: any }) => {
        setCurrentProfile(data)
      })
      const savedDraft = localStorage.getItem('jpm_post_draft')
      if (savedDraft) {
        try {
          const draft = JSON.parse(savedDraft)
          if (draft.content) setContent(draft.content)
          if (draft.topText) setTopText(draft.topText)
          if (draft.bottomText) setBottomText(draft.bottomText)
          if (draft.textColor) setTextColor(draft.textColor)
          if (draft.textMode) setTextMode(draft.textMode)
          if (draft.isBold !== undefined) setIsBold(draft.isBold)
          if (draft.isItalic !== undefined) setIsItalic(draft.isItalic)
          if (draft.isUnderline !== undefined) setIsUnderline(draft.isUnderline)
        } catch (e) { console.error('Error loading draft:', e) }
      }
    } else {
      setCurrentProfile(null)
    }
  }, [user])

  useEffect(() => {
    if (user && (content || topText || bottomText)) {
      localStorage.setItem('jpm_post_draft', JSON.stringify({
        content, topText, bottomText, textColor, textMode, isBold, isItalic, isUnderline
      }))
    }
  }, [content, topText, bottomText, textColor, textMode, isBold, isItalic, isUnderline, user])
  
  useEffect(() => {
    const timer = setTimeout(() => {
      textareaRef.current?.focus()
    }, 200)
    return () => clearTimeout(timer)
  }, [inModal])

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length > 0) {
      const newImages = [...images, ...files].slice(0, 4)
      setImages(newImages)
      setPreviewUrls(newImages.map((file: File) => URL.createObjectURL(file)))
      setShowEditor(false)
      const img = new (window as any).Image()
      img.src = URL.createObjectURL(newImages[0])
      img.onload = () => { imageRef.current = img }
    }
  }

  const removeImage = (index: number) => {
    const newImages = images.filter((_, i) => i !== index)
    const newUrls = previewUrls.filter((_, i) => i !== index)
    setImages(newImages)
    setPreviewUrls(newUrls)
    if (newImages.length === 0) setShowEditor(false)
  }

  const renderMeme = () => {
    const canvas = canvasRef.current
    const img = imageRef.current
    if (!canvas || !img) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    canvas.width = img.width
    canvas.height = img.height
    ctx.drawImage(img, 0, 0)
    const fontSize = Math.floor(canvas.width / 12)
    const fontWeight = isBold ? 'bold' : 'normal'
    const fontStyle = isItalic ? 'italic' : 'normal'
    ctx.font = `${fontStyle} ${fontWeight} ${fontSize}px sans-serif`
    ctx.textAlign = 'center'
    const drawStyledText = (text: string, x: number, y: number, isTop: boolean) => {
      if (!text) return
      const padding = fontSize * 0.2
      const textWidth = ctx.measureText(text.toUpperCase()).width
      const rectHeight = fontSize * 1.2
      if (textMode === 'bg') {
        ctx.fillStyle = 'rgba(0,0,0,0.7)'
        const rectY = isTop ? y - padding : y - rectHeight + padding
        ctx.fillRect(x - textWidth/2 - padding, rectY, textWidth + padding*2, rectHeight)
      }
      ctx.fillStyle = textColor
      ctx.textBaseline = isTop ? 'top' : 'bottom'
      ctx.fillText(text.toUpperCase(), x, y)
      if (textMode === 'stroke') {
        ctx.strokeStyle = '#000000'
        ctx.lineWidth = Math.max(2, fontSize / 15)
        ctx.strokeText(text.toUpperCase(), x, y)
      }
      if (isUnderline) {
        ctx.strokeStyle = textColor
        ctx.lineWidth = Math.max(2, fontSize / 20)
        const lineY = isTop ? y + fontSize * 1.1 : y + padding
        ctx.beginPath()
        ctx.moveTo(x - textWidth/2, lineY)
        ctx.lineTo(x + textWidth/2, lineY)
        ctx.stroke()
      }
    }
    drawStyledText(topText, canvas.width / 2, 20, true)
    drawStyledText(bottomText, canvas.width / 2, canvas.height - 20, false)
  }

  useEffect(() => {
    if (showEditor) renderMeme()
  }, [topText, bottomText, showEditor, textColor, textMode, isBold, isItalic, isUnderline])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!content && images.length === 0) return
    if (!user) { alert('Please log in to post'); return }
    setLoading(true)
    let image_urls: string[] = []
    if (images.length > 0) {
      const uploadPromises = images.map(async (img: File, index: number) => {
        let finalBlob: Blob | null = null
        if (index === 0 && showEditor && canvasRef.current) {
          finalBlob = await new Promise<Blob | null>((resolve) => {
            canvasRef.current?.toBlob((blob) => resolve(blob), 'image/jpeg', 0.9)
          })
        }
        const fileName = `${Math.random()}.jpg`
        const { data, error } = await supabase.storage.from('memes').upload(fileName, finalBlob || img)
        if (error) { console.error(`Upload error for image ${index}:`, error); return null }
        return supabase.storage.from('memes').getPublicUrl(fileName).data.publicUrl
      })
      const results = await Promise.all(uploadPromises)
      image_urls = results.filter((url): url is string => url !== null)
    }
    const { error, data: postData } = await supabase.from('posts').insert({
      content,
      image_url: image_urls[0] || '',
      image_urls,
      creator_id: user.id,
      title: content.slice(0, 50) || 'Meme'
    }).select()
    if (!error) {
      const mentionRegex = /@(\w+)/g
      const mentions = [...content.matchAll(mentionRegex)].map((m: any) => m[1].toLowerCase())
      if (mentions.length > 0 && postData) {
        const { data: mentionedUsers } = await supabase.from('profiles').select('id, settings').in('username', mentions)
        if (mentionedUsers && mentionedUsers.length > 0) {
          const restrictedUsers = mentionedUsers.filter((u: any) => u.settings?.mentions === 'Profiles you follow')
          let usersFollowingMe: string[] = []
          if (restrictedUsers.length > 0) {
            const { data: followData } = await supabase.from('follows').select('follower_id')
              .in('follower_id', restrictedUsers.map((u: any) => u.id)).eq('following_id', user.id)
            if (followData) usersFollowingMe = followData.map((f: any) => f.follower_id)
          }
          const notifications = mentionedUsers
            .filter((u: any) => u.id !== user.id)
            .filter((u: any) => {
              const pref = u.settings?.mentions || 'Everyone'
              if (pref === 'Everyone') return true
              if (pref === 'Profiles you follow') return usersFollowingMe.includes(u.id)
              return false
            })
            .map((u: any) => ({ user_id: u.id, actor_id: user.id, type: 'mention', post_id: postData[0].id }))
          if (notifications.length > 0) await supabase.from('notifications').insert(notifications)
        }
      }
      setContent('')
      setImages([])
      setPreviewUrls([])
      localStorage.removeItem('jpm_post_draft')
      if (onSuccess) onSuccess()
      else window.location.reload()
    } else {
      alert('Error creating post: ' + error.message)
    }
    setLoading(false)
  }

  // ── JPM-style render ──────────────────────────────────────────────────────
  return (
    <div className="flex flex-col">
      <form onSubmit={handleSubmit} className="flex flex-col">

        {/* ── Main composer row ── */}
        <div className="flex gap-3 px-4 pt-4 pb-2">

          {/* Left: avatar + jpm line */}
          <div className="flex flex-col items-center flex-none" style={{ width: 40 }}>
            <div className="w-10 h-10 rounded-full bg-zinc-200 dark:bg-zinc-800 overflow-hidden">
              {currentProfile?.avatar_url ? (
                <Image src={currentProfile.avatar_url} alt="Avatar" width={40} height={40} className="w-full h-full object-cover" unoptimized />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-zinc-500 font-bold text-sm">
                  {currentProfile?.full_name?.[0] || '?'}
                </div>
              )}
            </div>
            <div className="w-[2px] flex-1 mt-2 bg-zinc-200 dark:bg-zinc-700 rounded-full min-h-[24px]" />
          </div>

          {/* Right: name + textarea + media icons */}
          <div className="flex-1 min-w-0 pb-1">
            <div className="mb-1">
              <span className="font-bold text-[15px] text-zinc-900 dark:text-white">
                {currentProfile?.username || currentProfile?.full_name || 'You'}
              </span>
            </div>

            <textarea
              ref={textareaRef}
              className="w-full bg-transparent border-none outline-none resize-none text-[15px] placeholder-zinc-400 dark:placeholder-zinc-500 text-zinc-900 dark:text-white leading-snug min-h-[44px]"
              placeholder="What's new?"
              rows={2}
              value={content}
              onChange={(e) => {
                setContent(e.target.value)
                e.target.style.height = 'auto'
                e.target.style.height = e.target.scrollHeight + 'px'
              }}
            />

            {/* Image previews */}
            {previewUrls.length > 0 && (
              <div className="mt-2 rounded-2xl overflow-hidden bg-zinc-100 dark:bg-zinc-800">
                {showEditor ? (
                  <div className="p-2 flex justify-center">
                    <canvas ref={canvasRef} className="max-w-full h-auto rounded-lg" />
                  </div>
                ) : (
                  <div className={`grid gap-1 p-1 ${previewUrls.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
                    {previewUrls.map((url: string, i: number) => (
                      <div key={i} className="relative group">
                        <Image src={url} alt={`Preview ${i}`} width={600} height={400} className="w-full h-52 object-cover rounded-xl" unoptimized />
                        <button type="button" onClick={() => removeImage(i)} className="absolute top-2 right-2 bg-black/60 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                {previewUrls.length === 1 && (
                  <div className="px-3 pb-2 flex justify-end">
                    <button type="button" onClick={() => setShowEditor(!showEditor)} className="text-xs text-zinc-500 font-semibold">
                      {showEditor ? 'Done editing' : 'Customize meme'}
                    </button>
                  </div>
                )}
                {showEditor && (
                  <div className="px-4 pb-4 space-y-3 border-t border-zinc-200 dark:border-zinc-700 pt-3">
                    <div className="grid grid-cols-2 gap-2">
                      <input type="text" placeholder="TOP TEXT" className="bg-zinc-100 dark:bg-zinc-700 rounded-lg p-2 text-sm font-bold outline-none" value={topText} onChange={(e) => setTopText(e.target.value)} />
                      <input type="text" placeholder="BOTTOM TEXT" className="bg-zinc-100 dark:bg-zinc-700 rounded-lg p-2 text-sm font-bold outline-none" value={bottomText} onChange={(e) => setBottomText(e.target.value)} />
                    </div>
                    <div className="flex items-center gap-3 flex-wrap">
                      {['#ffffff', '#ffeb3b', '#4caf50', '#2196f3', '#f44336'].map(color => (
                        <button key={color} type="button" onClick={() => setTextColor(color)} className={`w-5 h-5 rounded-full border-2 ${textColor === color ? 'border-blue-500' : 'border-zinc-300'}`} style={{ backgroundColor: color }} />
                      ))}
                      {(['normal', 'stroke', 'bg'] as const).map(mode => (
                        <button key={mode} type="button" onClick={() => setTextMode(mode)} className={`px-2 py-1 text-xs rounded font-bold ${textMode === mode ? 'bg-zinc-900 text-white dark:bg-white dark:text-black' : 'text-zinc-500'}`}>{mode}</button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Media attachment icons */}
            <div className="flex items-center gap-5 mt-3">
              <button type="button" onClick={(e) => { e.preventDefault(); fileInputRef.current?.click() }} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors" aria-label="Add photo">
                <svg className="w-[22px] h-[22px]" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8.5" cy="8.5" r="1.5" fill="currentColor" stroke="none"/><path d="m21 15-5-5L5 21"/></svg>
              </button>
              <button type="button" className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors" aria-label="GIF">
                <svg className="w-[22px] h-[22px]" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M10 9H7a1 1 0 0 0-1 1v4a1 1 0 0 0 1 1h2v-2H8m5-4h3m-3 2h2m-2 2h3"/></svg>
              </button>
              <button type="button" className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors" aria-label="List">
                <svg className="w-[22px] h-[22px]" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/></svg>
              </button>
              <button type="button" className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors" aria-label="Quote">
                <svg className="w-[22px] h-[22px]" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1zm12 0c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z"/></svg>
              </button>
              <button type="button" className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors" aria-label="More">
                <svg className="w-[22px] h-[22px]" fill="currentColor" viewBox="0 0 24 24"><circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/></svg>
              </button>
            </div>
          </div>
        </div>

        {/* ── "Add to jpm" row ── */}
        <div className="flex gap-3 px-4 py-2 items-center">
          <div className="flex-none flex justify-center" style={{ width: 40 }}>
            <div className="w-6 h-6 rounded-full bg-zinc-200 dark:bg-zinc-700 overflow-hidden opacity-50">
              {currentProfile?.avatar_url && <Image src={currentProfile.avatar_url} alt="" width={24} height={24} className="w-full h-full object-cover" unoptimized />}
            </div>
          </div>
          <span className="text-[14px] text-zinc-400">Add to jpm</span>
        </div>

        <input type="file" hidden ref={fileInputRef} accept="image/*" multiple onChange={handleImageChange} />

        {/* ── Footer bar ── */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-zinc-100 dark:border-zinc-800 mt-2">
          <div className="flex items-center gap-2 text-zinc-400">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>
            <span className="text-[13px] font-medium">Reply options</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-12 h-7 bg-zinc-300 dark:bg-zinc-600 rounded-full flex items-center px-1">
              <div className="w-5 h-5 bg-white rounded-full shadow-sm" />
            </div>
            <button
              type="submit"
              onClick={handleSubmit}
              disabled={loading || (!content && images.length === 0)}
              className="px-6 py-2 bg-zinc-900 dark:bg-white text-white dark:text-black text-[15px] font-bold rounded-full disabled:opacity-30 transition-opacity active:scale-95"
            >
              {loading ? '…' : 'Post'}
            </button>
          </div>
        </div>

      </form>
    </div>
  )
}
