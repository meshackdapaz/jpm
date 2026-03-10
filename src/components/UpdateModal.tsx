'use client'

import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowDownTrayIcon, XMarkIcon } from '@heroicons/react/24/outline'

interface UpdateModalProps {
  isOpen: boolean
  onClose: () => void
  updateUrl: string
  isCritical: boolean
  latestVersion: number
}

export function UpdateModal({ isOpen, onClose, updateUrl, isCritical, latestVersion }: UpdateModalProps) {
  if (!isOpen) return null

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm px-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-white dark:bg-zinc-900 w-full max-w-sm rounded-[24px] overflow-hidden shadow-2xl border border-zinc-200 dark:border-zinc-800"
        >
          <div className="p-6 text-center">
            <div className="w-16 h-16 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <ArrowDownTrayIcon className="w-8 h-8 text-black dark:text-white" />
            </div>
            
            <h2 className="text-xl font-bold mb-2 text-zinc-900 dark:text-zinc-100">
              Update Available
            </h2>
            <p className="text-zinc-500 dark:text-zinc-400 text-sm mb-6">
              A new version (v{latestVersion}) is available with the latest fixes and features.
            </p>

            <div className="space-y-3">
              <a
                href={updateUrl}
                className="w-full py-3 px-4 bg-black dark:bg-white text-white dark:text-black font-semibold rounded-xl flex items-center justify-center gap-2 hover:opacity-90 transition-opacity active:scale-[0.98]"
              >
                <ArrowDownTrayIcon className="w-5 h-5" />
                Download Update
              </a>
              
              {!isCritical && (
                <button
                  onClick={onClose}
                  className="w-full py-3 px-4 text-zinc-500 dark:text-zinc-400 font-medium hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
                >
                  Later
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
