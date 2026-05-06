'use client'

import { useEffect, useRef, useCallback } from 'react'
import { Capacitor } from '@capacitor/core'
import { registerPlugin } from '@capacitor/core'

// Register our custom native plugin
const NativeInFeedAd = registerPlugin<{
  initialize(): Promise<{ status: string }>
  showAd(options: { x: number; y: number; width: number; height: number }): Promise<{ shown: boolean }>
  updatePosition(options: { y: number }): Promise<void>
  hideAd(): Promise<{ hidden: boolean }>
  destroyAd(): Promise<{ destroyed: boolean }>
  isAdReady(): Promise<{ ready: boolean }>
  addListener(event: string, callback: (data: any) => void): any
}>('NativeInFeedAd')

/**
 * useInFeedAd — Manages a native Google AdMob Native Ad that overlays 
 * precisely on top of a placeholder div in the React feed.
 * 
 * Usage:
 *   const { placeholderRef } = useInFeedAd()
 *   return <div ref={placeholderRef} style={{ height: 200 }} />
 */
export function useInFeedAd() {
  const placeholderRef = useRef<HTMLDivElement>(null)
  const isInitialized = useRef(false)
  const isAdShown = useRef(false)
  const rafRef = useRef<number>(0)

  const updateAdPosition = useCallback(() => {
    if (!placeholderRef.current || !isAdShown.current) return

    const rect = placeholderRef.current.getBoundingClientRect()
    const isVisible = rect.top < window.innerHeight && rect.bottom > 0

    if (isVisible) {
      // Send current Y position to native layer
      NativeInFeedAd.updatePosition({ y: rect.top })
    } else {
      // Ad is offscreen, hide it to save GPU resources
      NativeInFeedAd.hideAd()
      isAdShown.current = false
    }
  }, [])

  const showAdAtCurrentPosition = useCallback(async () => {
    if (!placeholderRef.current) return

    const rect = placeholderRef.current.getBoundingClientRect()
    // Calculate the absolute Y position relative to the top of the scrollable document
    const absoluteY = rect.top + window.scrollY

    // Only show if the ad is somewhere in the document
    if (rect.height === 0) return

    try {
      const { ready } = await NativeInFeedAd.isAdReady()
      if (!ready) return

      await NativeInFeedAd.showAd({
        x: rect.left,
        y: absoluteY, // Pass absolute Y, Native layer will calculate scroll offset
        width: rect.width,
        height: rect.height,
      })
      isAdShown.current = true
    } catch (err) {
      console.warn('[InFeedAd] showAd error:', err)
    }
  }, [])

  useEffect(() => {
    // Only run on native Android/iOS
    if (!Capacitor.isNativePlatform()) return

    const init = async () => {
      if (isInitialized.current) return
      isInitialized.current = true

      try {
        await NativeInFeedAd.initialize()

        // Listen for when the ad is loaded and ready
        NativeInFeedAd.addListener('adLoaded', () => {
          showAdAtCurrentPosition()
        })

        NativeInFeedAd.addListener('adFailedToLoad', (data: any) => {
          console.warn('[InFeedAd] Failed to load:', data.error)
        })

        // Check if already ready (in case adLoaded fired before we added listener)
        const { ready } = await NativeInFeedAd.isAdReady()
        if (ready) {
          showAdAtCurrentPosition()
        }
      } catch (err) {
        console.warn('[InFeedAd] init error:', err)
      }
    }

    init()

    // Observe when placeholder enters/exits viewport
    // Since Native handles the scroll, we just use this to trigger the initial show
    // or to hide if it gets unmounted/hidden.
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !isAdShown.current) {
            showAdAtCurrentPosition()
          } else if (!entry.isIntersecting && isAdShown.current) {
            NativeInFeedAd.hideAd()
            isAdShown.current = false
          }
        })
      },
      // Give a large margin so it loads slightly before coming into view
      { rootMargin: '500px 0px 500px 0px' }
    )

    if (placeholderRef.current) {
      observer.observe(placeholderRef.current)
    }

    return () => {
      observer.disconnect()
      // Destroy ad when component unmounts
      NativeInFeedAd.destroyAd().catch(() => {})
      isInitialized.current = false
      isAdShown.current = false
    }
  }, [showAdAtCurrentPosition])

  return { placeholderRef }
}
