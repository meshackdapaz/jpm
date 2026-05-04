'use client'

import { useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

export function useFeedTelemetry(user: any) {
  const supabase = createClient()
  const observers = useRef<Map<string, { startTime: number; observer: IntersectionObserver }>>(new Map())

  useEffect(() => {
    return () => {
      // Cleanup observers on unmount
      observers.current.forEach(({ observer }) => observer.disconnect())
      observers.current.clear()
    }
  }, [])

  const observePost = useCallback((postId: string, element: HTMLElement | null) => {
    if (!element || !user) return
    if (observers.current.has(postId)) return

    const observer = new IntersectionObserver(
      async (entries) => {
        const entry = entries[0]
        if (entry.isIntersecting) {
          // Started viewing
          observers.current.set(postId, {
            ...observers.current.get(postId)!,
            startTime: Date.now()
          })
        } else {
          // Stopped viewing
          const stats = observers.current.get(postId)
          if (stats && stats.startTime > 0) {
            const dwellTime = Date.now() - stats.startTime
            if (dwellTime > 1000) { // Only track if viewed for > 1s
              // Increment view count on post-dwell (atomic view logic)
              await supabase.rpc('increment_post_view', { 
                p_post_id: postId, 
                p_viewer_id: user.id 
              })
            }
            observers.current.set(postId, {
              ...stats,
              startTime: 0
            })
          }
        }
      },
      { threshold: 0.5 } // 50% visibility
    )

    observer.observe(element)
    observers.current.set(postId, { startTime: 0, observer })
  }, [user, supabase])

  return { observePost }
}
