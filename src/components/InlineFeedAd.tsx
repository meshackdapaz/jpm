'use client'

import React, { useEffect, useState, useRef } from 'react'
import { AdMob } from '@capacitor-community/admob'
import { Capacitor } from '@capacitor/core'

/**
 * An inline ad unit intended to be placed seamlessly in a vertical feed.
 * On Web, this returns an empty space or a placeholder so the layout isn't broken.
 * On iOS/Android, it triggers AdMob to place a Native Video Ad over this space.
 */
export function InlineFeedAd({ adId = 'ca-app-pub-8166782428171770/3966636178' }: { adId?: string }) {
  const containerId = `ad-container-${adId.replace(/[^a-zA-Z0-9]/g, '')}`
  const [isReady, setIsReady] = useState(false)
  
  useEffect(() => {
    let mounted = true

    const initAd = async () => {
      if (!Capacitor.isNativePlatform()) return

      try {
        await AdMob.initialize()
        
        // Native Ads allow Google to serve Video content that flows with the feed.
        // We target the specific container ID in our React DOM.
        await (AdMob as any).showNativeAd({
          adId,
          isTesting: false,
          adsCount: 1,
          containerId: containerId,
          // Use a layout that prioritizes video/media
          nativeAdOptions: {
            adChoicesPosition: 'TOP_RIGHT',
            mediaAspectRatio: 'ANY',
            videoOptions: {
              startMuted: true,
            }
          }
        })
        
        if (mounted) setIsReady(true)
      } catch (err) {
        console.error('Failed to init/show AdMob native ad:', err)
      }
    }

    // Small delay to ensure the DOM element with containerId is rendered
    const timeout = setTimeout(initAd, 500)

    return () => {
      mounted = false
      clearTimeout(timeout)
      if (Capacitor.isNativePlatform()) {
        (AdMob as any).hideNativeAd().catch(() => {})
      }
    }
  }, [adId, containerId])

  if (!Capacitor.isNativePlatform()) {
    return (
      <div className="w-full flex justify-center py-6 border-b border-zinc-100 dark:border-zinc-800">
        <div className="w-[320px] h-[250px] bg-zinc-50 dark:bg-zinc-900 rounded-xl flex flex-col items-center justify-center gap-3 text-zinc-400 text-xs font-medium border border-zinc-100 dark:border-zinc-800">
          <div className="w-10 h-10 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center text-lg">📢</div>
          Advertisement
        </div>
      </div>
    )
  }

  // On Native, we provide the container that the plugin will draw over.
  // We give it a fixed height suitable for Native Ads (300px is common for Video + text)
  return (
    <div 
      id={containerId} 
      className="w-full h-[320px] bg-zinc-50 dark:bg-zinc-900/40 border-b border-zinc-100 dark:border-zinc-800 relative overflow-hidden"
    >
      {!isReady && (
        <div className="absolute inset-0 flex items-center justify-center animate-pulse">
          <div className="w-8 h-8 rounded-full border-2 border-zinc-200 border-t-violet-500 animate-spin" />
        </div>
      )}
    </div>
  )
}
