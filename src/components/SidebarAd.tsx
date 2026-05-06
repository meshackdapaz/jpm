'use client'

import React, { useEffect } from 'react'
import { Capacitor } from '@capacitor/core'

export function SidebarAd() {
  // Hide AdSense on native mobile apps (use AdMob instead)
  if (Capacitor.isNativePlatform()) return null;

  useEffect(() => {
    try {
      // @ts-ignore
      ;(window.adsbygoogle = window.adsbygoogle || []).push({})
    } catch (err) {
      console.error('AdSense error:', err)
    }
  }, [])

  return (
    <div className="w-full h-full min-h-[250px] flex items-center justify-center overflow-hidden">
      <ins
        className="adsbygoogle"
        style={{ display: 'block', width: '100%', height: '100%' }}
        data-ad-client="ca-pub-8166782428171770"
        data-ad-slot="8539768946"
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </div>
  )
}
