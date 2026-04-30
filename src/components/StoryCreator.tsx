'use client'

import React, { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from './AuthProvider'
import { XMarkIcon, PhotoIcon, ChevronRightIcon, SwatchIcon } from '@heroicons/react/24/outline'

const BG_COLORS = [
  { name: 'black',    value: '#000000' },
  { name: 'darkgray', value: '#111111' },
  { name: 'zinc',    value: '#18181b' },
  { name: 'slate',   value: '#0f172a' },
  { name: 'warm',    value: '#1c1917' },
  { name: 'mid',     value: '#27272a' },
  { name: 'silver',  value: '#3f3f46' },
  { name: 'white',   value: '#ffffff' },
]

export function StoryCreator({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [mode, setMode] = useState<'text' | 'image'>('text')
  const [text, setText] = useState('')
  const [bgIndex, setBgIndex] = useState(0)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const textInputRef = useRef<HTMLTextAreaElement>(null)
  const { user } = useAuth()
  const supabase = createClient()

  const currentBg = BG_COLORS[bgIndex].value
  const textColor = currentBg === '#ffffff' ? '#000000' : '#ffffff'

  // Auto-focus text input when in text mode
  useEffect(() => {
    if (mode === 'text' && !uploading) {
      setTimeout(() => textInputRef.current?.focus(), 100)
    }
  }, [mode, uploading])

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
    setMode('image')
  }

  const cycleBg = () => {
    setBgIndex((prev) => (prev + 1) % BG_COLORS.length)
  }

  const handleSubmit = async () => {
    if (!user || uploading) return
    if (mode === 'text' && !text.trim()) return
    if (mode === 'image' && !imageFile) return

    setUploading(true)
    let imageUrl: string | null = null

    if (imageFile) {
      const ext = imageFile.name.split('.').pop()
      const path = `stories/${user.id}/${Date.now()}.${ext}`
      const { data, error } = await supabase.storage.from('memes').upload(path, imageFile, { upsert: true })
      if (!error && data) {
        const { data: pubData } = supabase.storage.from('memes').getPublicUrl(path)
        imageUrl = pubData.publicUrl
      }
    }

    await supabase.from('stories').insert({
      creator_id: user.id,
      text_content: mode === 'text' ? text : null,
      image_url: imageUrl,
      bg_color: mode === 'text' ? currentBg : '#000000'
    })

    setUploading(false)
    onCreated()
    onClose()
  }

  const hasContent = (mode === 'text' && text.trim().length > 0) || (mode === 'image' && !!imagePreview)

  const content = (
    <div 
      className="fixed inset-0 z-[999999] flex flex-col bg-black animate-in fade-in duration-300"
      style={{ height: '100dvh' }}
    >
      {/* Immersive Background / Content Area */}
      <div 
        className="absolute inset-0 transition-colors duration-300 flex items-center justify-center"
        style={{ background: mode === 'text' ? currentBg : '#000000' }}
      >
        {mode === 'image' && imagePreview ? (
          <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
        ) : null}

        {mode === 'text' && (
          <textarea
            ref={textInputRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Type something..."
            maxLength={160}
            className="w-full h-full bg-transparent resize-none outline-none text-center px-6 flex items-center justify-center"
            style={{
              color: textColor,
              fontSize: '2.5rem',
              lineHeight: '1.2',
              fontWeight: 900,
              paddingTop: '40vh',
              textShadow: currentBg === '#ffffff' ? 'none' : '0 4px 24px rgba(0,0,0,0.5)',
            }}
          />
        )}
      </div>

      {/* Top Header Controls */}
      <div className="absolute top-0 left-0 right-0 z-50 flex justify-between items-start p-4 pt-[max(1rem,env(safe-area-inset-top))]">
        <button 
          onClick={onClose}
          className="w-10 h-10 rounded-full bg-black/20 backdrop-blur-md flex items-center justify-center text-white active:scale-90 transition-transform"
        >
          <XMarkIcon className="w-6 h-6" />
        </button>

        {mode === 'text' && (
          <button 
            onClick={cycleBg}
            className="w-10 h-10 rounded-full bg-black/20 backdrop-blur-md flex items-center justify-center text-white active:scale-90 transition-transform shadow-sm"
          >
            <SwatchIcon className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Bottom Controls */}
      <div className="absolute bottom-0 left-0 right-0 z-50 p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] flex flex-col gap-6">
        
        {/* Mode Toggles (Text vs Photo) */}
        {!hasContent && (
          <div className="flex justify-center gap-6">
            <button
              onClick={() => setMode('text')}
              className={`text-[15px] font-bold transition-all ${mode === 'text' ? 'text-white' : 'text-white/50'}`}
              style={{ textShadow: '0 2px 8px rgba(0,0,0,0.8)' }}
            >
              Aa Create
            </button>
            <button
              onClick={() => fileRef.current?.click()}
              className={`text-[15px] font-bold transition-all ${mode === 'image' ? 'text-white' : 'text-white/50'}`}
              style={{ textShadow: '0 2px 8px rgba(0,0,0,0.8)' }}
            >
              Photo
            </button>
            <input ref={fileRef} type="file" accept="image/*,video/*" className="hidden" onChange={handleImageSelect} />
          </div>
        )}

        {/* Share Button row */}
        {hasContent && (
          <div className="flex justify-between items-center w-full mt-auto">
            {/* Gallery Button (optional reset or reselect) */}
            <button 
              onClick={() => fileRef.current?.click()}
              className="w-10 h-10 rounded-[12px] bg-black/20 backdrop-blur-md border border-white/20 flex items-center justify-center text-white active:scale-90 transition-transform"
            >
              <PhotoIcon className="w-5 h-5" />
            </button>

            {/* Share / Next Button */}
            <button
              onClick={handleSubmit}
              disabled={uploading}
              className="flex items-center gap-2 px-5 py-3 bg-white text-black rounded-full font-black text-[15px] active:scale-95 transition-all shadow-[0_4px_24px_rgba(0,0,0,0.4)] disabled:opacity-50"
            >
              {uploading ? 'Posting...' : 'Your Story'}
              <div className="w-6 h-6 rounded-full bg-black text-white flex items-center justify-center ml-1">
                <ChevronRightIcon className="w-3.5 h-3.5 stroke-[3]" />
              </div>
            </button>
          </div>
        )}
      </div>
    </div>
  )

  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  if (!mounted || typeof document === 'undefined') return null

  return createPortal(content, document.body)
}
