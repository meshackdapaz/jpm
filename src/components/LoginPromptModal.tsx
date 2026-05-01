'use client'

import Link from 'next/link'
import { XMarkIcon } from '@heroicons/react/24/outline'
import { useEffect } from 'react'

interface LoginPromptModalProps {
  onClose: () => void
  message?: string
}

export function LoginPromptModal({ onClose, message }: LoginPromptModalProps) {
  // Close on Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[200] bg-black/40 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Bottom sheet */}
      <div className="fixed bottom-0 left-0 right-0 z-[201] animate-in slide-in-from-bottom duration-300 sm:inset-0 sm:flex sm:items-center sm:justify-center sm:p-4">
        <div className="bg-white dark:bg-zinc-950 rounded-t-[32px] sm:rounded-[32px] w-full sm:max-w-sm overflow-hidden shadow-2xl border border-zinc-100 dark:border-zinc-800">
          
          {/* Drag handle (mobile) */}
          <div className="flex justify-center pt-3 pb-1 sm:hidden">
            <div className="w-10 h-1 bg-zinc-200 dark:bg-zinc-700 rounded-full" />
          </div>

          {/* Close button */}
          <div className="flex justify-end px-5 pt-4 sm:pt-5">
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
            >
              <XMarkIcon className="w-4 h-4" />
            </button>
          </div>

          <div className="px-7 pb-8 pt-2 flex flex-col items-center text-center">
            {/* Logo */}
            <div className="w-16 h-16 rounded-2xl bg-black dark:bg-white flex items-center justify-center mb-5">
              <svg className="w-9 h-9 text-white dark:text-black" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12.001 2C6.475 2 2 6.476 2 12s4.475 10 10.001 10C17.522 22 22 17.524 22 12S17.522 2 12.001 2zM12 20c-4.41 0-8-3.589-8-8s3.59-8 8-8 8 3.589 8 8-3.59 8-8 8zm4.5-8c0 2.485-2.015 4.5-4.5 4.5S7.5 14.485 7.5 12s2.015-4.5 4.5-4.5 4.5 2.015 4.5 4.5zm1.5 0c0-3.313-2.687-6-6-6S6 8.687 6 12s2.687 6 6 6c1.293 0 2.49-.409 3.471-1.103l-.985-1.459A4.468 4.468 0 0112 16.5c-2.485 0-4.5-2.015-4.5-4.5S9.515 7.5 12 7.5s4.5 2.015 4.5 4.5v1.125c0 .621-.503 1.125-1.125 1.125S14.25 13.746 14.25 13.125V12c0-1.24-1.01-2.25-2.25-2.25S9.75 10.76 9.75 12s1.01 2.25 2.25 2.25c.655 0 1.24-.28 1.657-.726A2.614 2.614 0 0016.5 13.125V12z"/>
              </svg>
            </div>

            <h2 className="text-[22px] font-black tracking-tight text-zinc-900 dark:text-zinc-50 mb-2">
              {message || 'Sign in to continue'}
            </h2>
            <p className="text-[14px] text-zinc-500 dark:text-zinc-400 mb-8 leading-relaxed max-w-[260px]">
              Join JPM to like posts, comment, follow people and share your thoughts.
            </p>

            <div className="w-full flex flex-col gap-3">
              <Link
                href="/login"
                className="w-full py-3.5 bg-black dark:bg-white text-white dark:text-black text-[15px] font-bold rounded-2xl text-center hover:opacity-90 active:scale-[0.98] transition-all"
              >
                Sign in
              </Link>
              <Link
                href="/signup"
                className="w-full py-3.5 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 text-[15px] font-bold rounded-2xl text-center hover:bg-zinc-50 dark:hover:bg-zinc-900 active:scale-[0.98] transition-all"
              >
                Create account
              </Link>
            </div>

            <p className="mt-5 text-[12px] text-zinc-400">
              By continuing you agree to our{' '}
              <Link href="/terms" className="underline hover:text-zinc-600">Terms</Link>
              {' '}and{' '}
              <Link href="/privacy" className="underline hover:text-zinc-600">Privacy Policy</Link>
            </p>
          </div>
        </div>
      </div>
    </>
  )
}
