'use client'

import React from 'react'
import { Capacitor } from '@capacitor/core'
import { useInFeedAd } from '@/hooks/useInFeedAd'

/**
 * InlineFeedAd
 *
 * On Android (native app): renders an invisible placeholder div. 
 * The useInFeedAd hook detects this div's position and tells the 
 * native Kotlin plugin to overlay a real Google AdMob NativeAdView 
 * precisely on top of it. The result scrolls perfectly with the feed.
 *
 * On Web (browser): renders nothing (AdSense rejected, so no ads on web).
 */

function NativeAdPlaceholder() {
  const { placeholderRef } = useInFeedAd()

  return (
    <div
      ref={placeholderRef}
      className="w-full bg-zinc-50 dark:bg-zinc-900/50"
      style={{
        width: '100%',
        // Height must be large enough for MediaView (~300-360px)
        minHeight: 360,
        backgroundColor: 'transparent',
      }}
      data-ad-slot="native-infeed"
    />
  )
}

export function InlineFeedAd({ adId }: { adId?: string }) {
  // Only render on native Android/iOS — no web ads (AdSense rejected)
  if (!Capacitor.isNativePlatform()) return null

  return (
    <div className="w-full">
      <div 
        ref={useInFeedAd().placeholderRef}
        className="w-full border-b border-zinc-100 dark:border-zinc-900 bg-transparent"
        style={{
          minHeight: 340,
        }}
        data-ad-slot="native-infeed"
      />
    </div>
  )
}
