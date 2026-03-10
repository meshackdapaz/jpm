'use client'

import React, { useEffect, useState } from 'react'
import { useTheme } from 'next-themes'

export function SplashScreen() {
  const [loading, setLoading] = useState(true)
  const [exiting, setExiting] = useState(false)
  const { resolvedTheme } = useTheme()

  useEffect(() => {
    // Only show splash screen on initial full-page load.
    const hasSeenSplash = sessionStorage.getItem('jsplash_seen')
    if (hasSeenSplash) {
      setLoading(false)
      return
    }

    sessionStorage.setItem('jsplash_seen', 'true')
    
    // Hold splash for 1.2s, then start exit scale/fade animation
    const timer1 = setTimeout(() => setExiting(true), 1200)
    
    // Remove from DOM entirely after animation completes
    const timer2 = setTimeout(() => setLoading(false), 1800)

    return () => {
      clearTimeout(timer1)
      clearTimeout(timer2)
    }
  }, [])

  if (!loading) return null

  // We detect system theme via a simple media query for the absolute initial render 
  // to avoid white flashes before next-themes resolves.
  return (
    <div 
      // Hardcoded black bg by default to match the native Android splash screen
      className={`fixed inset-0 z-[9999] flex items-center justify-center bg-[#0a0a0a] transition-all duration-700 ease-in-out ${
        exiting ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      <div 
        className={`transition-all duration-700 ease-in-out transform flex flex-col items-center justify-center ${
          exiting ? 'scale-[3] blur-sm opacity-0' : 'scale-100 blur-0 opacity-100'
        }`}
      >
        <span className="text-white text-7xl font-sans font-black tracking-tighter">JP</span>
      </div>
    </div>
  )
}
