'use client'

import React, { useEffect, useState } from 'react'
import { AdMob, BannerAdPosition, BannerAdSize } from '@capacitor-community/admob'
import { Capacitor } from '@capacitor/core'

/**
 * An inline ad unit intended to be placed seamlessly in a vertical feed.
 * On Web, this returns an empty space or a placeholder so the layout isn't broken.
 * On iOS/Android, it triggers AdMob to place a banner over this space.
 */
export function InlineFeedAd({ adId = 'ca-app-pub-8166782428171770/3966636178' }: { adId?: string }) {
  const [isReady, setIsReady] = useState(false)
  
  useEffect(() => {
    let mounted = true

    const initAd = async () => {
      if (!Capacitor.isNativePlatform()) return

      try {
        await AdMob.initialize()
        
        // This is a global banner; Capacitor AdMob displays it at the top or bottom of the screen.
        // It cannot physically be "inline" scrolling with the React DOM natively,
        // but we can request it when the user reaches a certain point in the feed.
        await AdMob.showBanner({
          adId,
          adSize: BannerAdSize.BANNER,
          position: BannerAdPosition.BOTTOM_CENTER,
          margin: 0,
        })
        
        if (mounted) setIsReady(true)
      } catch (err) {
        console.error('Failed to init/show AdMob banner:', err)
      }
    }

    initAd()

    return () => {
      mounted = false
      if (Capacitor.isNativePlatform()) {
        AdMob.hideBanner().catch(() => {})
        AdMob.removeBanner().catch(() => {})
      }
    }
  }, [adId])

  if (!Capacitor.isNativePlatform()) {
    return (
      <div className="w-full flex justify-center py-6 border-b border-zinc-100 dark:border-zinc-900">
        <div className="w-[320px] h-[50px] bg-zinc-100 dark:bg-zinc-800 rounded flex items-center justify-center text-zinc-400 text-xs font-medium">
          Advertisement
        </div>
      </div>
    )
  }

  // When native, the Capacitor plugin draws over the WebView.
  // We don't render an inline div because the banner anchors to the screen Bottom/Top rigidly.
  // We can return null, as the banner handles its own rendering.
  return null
}
