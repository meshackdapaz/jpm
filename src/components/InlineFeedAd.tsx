'use client'

import React, { useEffect, useRef, useState } from 'react'
import { Capacitor } from '@capacitor/core'

/**
 * InlineFeedAd — shows an AdSense fluid ad on web and native.
 * This ensures the ad is inside the DOM and scrolls naturally like a post,
 * avoiding the floating native overlay behavior of AdMob banners.
 */
export function InlineFeedAd({ adId = 'ca-app-pub-8166782428171770/3966636178' }: { adId?: string }) {
  if (Capacitor.isNativePlatform()) {
    // Native: Render an iframe pointing to the live domain.
    // This bypasses the localhost origin block in AdSense, and
    // because it's an iframe, it scrolls perfectly natively with the feed.
    return (
      <div className="w-full py-4 border-b border-zinc-100 dark:border-zinc-800 overflow-hidden flex justify-center">
        <iframe 
          src="https://jpmtz.online/ad-unit" 
          width="100%" 
          height="300" 
          frameBorder="0" 
          scrolling="no" 
          style={{ overflow: 'hidden' }}
          title="Sponsored Content"
        />
      </div>
    )
  }

  return <WebFeedAd />
}

// ── Web & Native: Google AdSense fluid in-feed ad ────────────────────────────
function WebFeedAd() {
  useEffect(() => {
    try {
      // @ts-ignore
      ;(window.adsbygoogle = window.adsbygoogle || []).push({})
    } catch (err) {
      console.error('AdSense error:', err)
    }
  }, [])

  return (
    <div className="w-full py-4 border-b border-zinc-100 dark:border-zinc-800 overflow-hidden flex justify-center">
      <ins
        className="adsbygoogle"
        style={{ display: 'block', minWidth: '300px', width: '100%' }}
        data-ad-format="fluid"
        data-ad-layout-key="-6t+ed+2i-1n-4w"
        data-ad-client="ca-pub-8166782428171770"
        data-ad-slot="2820538405"
      />
    </div>
  )
}
