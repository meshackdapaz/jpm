'use client'

import React, { useEffect, useState } from 'react'

export function SplashScreen() {
  const [visible, setVisible] = useState(true)
  const [fadeOut, setFadeOut] = useState(false)

  useEffect(() => {
    // Hide native splash screen (if present) to show our custom DOM one
    import('@capacitor/splash-screen').then(({ SplashScreen: CapSplash }) => {
      CapSplash.hide().catch(() => {})
    }).catch(() => {})

    const timer = setTimeout(() => {
      setFadeOut(true)
      setTimeout(() => setVisible(false), 400)
    }, 1000)
    return () => clearTimeout(timer)
  }, [])

  if (!visible) return null

  return (
    <div
      className={`fixed inset-0 z-[9999] flex items-center justify-center bg-white dark:bg-black transition-opacity duration-500 pointer-events-none ${
        fadeOut ? 'opacity-0' : 'opacity-100'
      }`}
    >
      <div className="flex flex-col items-center animate-pulse">
        <h1 className="text-5xl font-black text-black dark:text-white tracking-[0.2em] uppercase mb-4">
          JPM
        </h1>
        <p className="text-[13px] text-zinc-500 dark:text-zinc-400 font-medium tracking-widest uppercase">
          always in our heart
        </p>
      </div>
    </div>
  )
}
