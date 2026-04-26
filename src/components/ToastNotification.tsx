'use client'

/**
 * ToastNotification — in-app sliding toast for:
 *  - New messages received while NOT in that conversation
 */

import React, { useEffect, useState, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from './AuthProvider'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import { XMarkIcon } from '@heroicons/react/24/solid'

interface Toast {
  id: string
  type: 'message'
  title: string
  body: string
  avatarUrl?: string | null
  href?: string
}

const TOAST_DURATION = 5000 // ms

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: (id: string) => void }) {
  const [visible, setVisible] = useState(false)
  const router = useRouter()
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const startTime = useRef(Date.now())
  const [progress, setProgress] = useState(100)

  useEffect(() => {
    // Animate in after mount
    const t = setTimeout(() => setVisible(true), 10)
    
    // Progress bar animation
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime.current
      const remaining = Math.max(0, 100 - (elapsed / TOAST_DURATION) * 100)
      setProgress(remaining)
      if (remaining <= 0) clearInterval(interval)
    }, 50)

    // Auto-dismiss
    timerRef.current = setTimeout(() => dismiss(), TOAST_DURATION)
    
    return () => {
      clearTimeout(t)
      clearInterval(interval)
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  const dismiss = () => {
    setVisible(false)
    setTimeout(() => onDismiss(toast.id), 350)
  }

  const handleTap = () => {
    if (toast.href) router.push(toast.href)
    dismiss()
  }

  return (
    <div
      className={`
        relative flex items-center gap-3 px-4 py-3 mx-3
        bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md
        border border-zinc-200/50 dark:border-zinc-800/50
        rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)]
        transition-all duration-350 ease-out
        cursor-pointer select-none overflow-hidden
        ${visible ? 'translate-y-0 opacity-100' : '-translate-y-4 opacity-0 scale-95'}
      `}
      style={{ minWidth: 280, maxWidth: 400 }}
      onClick={handleTap}
    >
      {/* Auto-dismiss progress bar */}
      <div 
        className="absolute bottom-0 left-0 h-[2px] bg-black dark:bg-white/40 transition-all duration-100 ease-linear"
        style={{ width: `${progress}%` }}
      />

      {/* Avatar / icon */}
      <div className="flex-none w-11 h-11 rounded-full overflow-hidden bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center border border-zinc-100 dark:border-zinc-700">
        {toast.avatarUrl ? (
          <Image src={toast.avatarUrl} alt="" width={44} height={44} className="w-full h-full object-cover" unoptimized />
        ) : (
          <span className="text-[20px]">💬</span>
        )}
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <p className="text-[13.5px] font-black text-zinc-900 dark:text-zinc-50 truncate leading-tight">{toast.title}</p>
        <p className="text-[12px] text-zinc-500 dark:text-zinc-400 truncate mt-0.5 font-medium">{toast.body}</p>
      </div>

      <button
        onClick={e => { e.stopPropagation(); dismiss() }}
        className="flex-none w-8 h-8 rounded-full flex items-center justify-center hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
      >
        <XMarkIcon className="w-4 h-4 text-zinc-400" />
      </button>
    </div>
  )
}

export function ToastNotification() {
  const { user } = useAuth()
  const supabase = createClient()
  const pathname = usePathname()

  // Try to get the open conversation userId from the URL search params
  // We do this via a small helper that reads window.location since this
  // component lives outside of the Suspense boundary
  const getOpenConvoUserId = () => {
    if (typeof window === 'undefined') return null
    const p = new URLSearchParams(window.location.search)
    return p.get('userId')
  }

  const [toasts, setToasts] = useState<Toast[]>([])
  const callToastAddedRef = useRef(false)

  const addToast = useCallback((t: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).slice(2)
    setToasts(prev => [...prev, { ...t, id }])
  }, [])

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  // ── Subscribe to new messages ───────────────────────────────────────────────
  useEffect(() => {
    if (!user) return

    const ch = supabase
      .channel(`toast-messages-${user.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' },
        async (payload: any) => {
          const m = payload.new
          if (m.receiver_id !== user.id) return

          // Don't toast if we are currently viewing that conversation
          const openId = getOpenConvoUserId()
          if (pathname === '/messages' && openId === m.sender_id) return

          // Fetch sender profile for display
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, avatar_url')
            .eq('id', m.sender_id)
            .single()

          const name = profile?.full_name || 'Someone'
          const isVoice = m.content?.startsWith('voice:')
          const body = isVoice ? '🎤 Sent a voice message' : (m.content?.length > 60 ? m.content.slice(0, 60) + '…' : m.content)

          addToast({
            type: 'message',
            title: name,
            body: body || 'New message',
            avatarUrl: profile?.avatar_url,
            href: `/messages?userId=${m.sender_id}`,
          })

          // Also update the AppLayout unread badge
          window.dispatchEvent(new CustomEvent('new-message-received'))
        })
      .subscribe()

    // ── Listen for local generic toasts ─────────────────────────────────────
    const handleLocalToast = (e: any) => {
      if (e.detail) {
        addToast(e.detail)
      }
    }
    window.addEventListener('show-toast', handleLocalToast)

    return () => { 
      supabase.removeChannel(ch)
      window.removeEventListener('show-toast', handleLocalToast)
    }
  }, [user, pathname])

  if (toasts.length === 0) return null

  return (
    <div
      className="fixed top-4 left-0 right-0 z-[200] flex flex-col gap-2 pointer-events-none"
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      {toasts.map(t => (
        <div key={t.id} className="pointer-events-auto flex justify-center w-full">
          <ToastItem toast={t} onDismiss={removeToast} />
        </div>
      ))}
    </div>
  )
}
