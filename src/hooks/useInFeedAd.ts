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
    const isVisible = rect.top < window.innerHeight && rect.bottom > 0

    if (!isVisible) return

    try {
      const { ready } = await NativeInFeedAd.isAdReady()
      if (!ready) return

      await NativeInFeedAd.showAd({
        x: rect.left,
        y: rect.top,
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
      } catch (err) {
        console.warn('[InFeedAd] init error:', err)
      }
    }

    init()

    // Track scroll to update ad position in real-time
    const onScroll = () => {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = requestAnimationFrame(updateAdPosition)
    }

    window.addEventListener('scroll', onScroll, { passive: true })

    // Observe when placeholder enters/exits viewport
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
      { threshold: 0.1 }
    )

    if (placeholderRef.current) {
      observer.observe(placeholderRef.current)
    }

    return () => {
      window.removeEventListener('scroll', onScroll)
      observer.disconnect()
      cancelAnimationFrame(rafRef.current)
      // Destroy ad when component unmounts
      NativeInFeedAd.destroyAd().catch(() => {})
      isInitialized.current = false
      isAdShown.current = false
    }
  }, [showAdAtCurrentPosition, updateAdPosition])

  return { placeholderRef }
}
