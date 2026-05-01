'use client'

import React, { useEffect } from 'react'
import { Capacitor } from '@capacitor/core'

export function InArticleAd() {
  useEffect(() => {
    if (Capacitor.isNativePlatform()) return;
    try {
      // @ts-ignore
      ;(window.adsbygoogle = window.adsbygoogle || []).push({})
    } catch (err) {
      console.error('AdSense in-article error:', err)
    }
  }, [])

  if (Capacitor.isNativePlatform()) return null;

  return (
    <div className="w-full py-4 overflow-hidden flex justify-center">
      <ins 
        className="adsbygoogle"
        style={{ display: 'block', textAlign: 'center', minWidth: '300px', width: '100%' }}
        data-ad-layout="in-article"
        data-ad-format="fluid"
        data-ad-client="ca-pub-8166782428171770"
        data-ad-slot="8539768946"
      />
    </div>
  )
}

