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
      setTimeout(() => setVisible(false), 500)
    }, 1500)
    return () => clearTimeout(timer)
  }, [])

  if (!visible) return null

  return (
    <div
      className={`fixed inset-0 z-[9999] flex items-center justify-center bg-black transition-opacity duration-500 pointer-events-none ${
        fadeOut ? 'opacity-0' : 'opacity-100'
      }`}
    >
      <div className="font-black text-[64px] tracking-tighter text-white animate-pulse">Jpm</div>
    </div>
  )
}
