'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { User } from '@supabase/supabase-js'
import { CURRENT_APP_VERSION } from '@/lib/constants'
import { UpdateModal } from './UpdateModal'
import { Capacitor } from '@capacitor/core'

type AuthContextType = {
  user: User | null
  loading: boolean
  refresh: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({ 
  user: null, 
  loading: true, 
  refresh: async () => {} 
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [updateInfo, setUpdateInfo] = useState<{
    show: boolean;
    url: string;
    isCritical: boolean;
    latestVersion: number;
  }>({ show: false, url: '', isCritical: false, latestVersion: CURRENT_APP_VERSION })
  const supabase = createClient()

  const refresh = async () => {
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser()
      setUser(currentUser)
    } catch (err) {
      console.error('Error fetching user:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refresh()

    const checkForUpdates = async () => {
      // 1. Try Native Store Update (Google Play / App Store)
      if (Capacitor.isNativePlatform()) {
        try {
          const { AppUpdate, AppUpdateAvailability } = await import('@capawesome/capacitor-app-update')
          const result = await AppUpdate.getAppUpdateInfo()
          
          if (result.updateAvailability === AppUpdateAvailability.UPDATE_AVAILABLE) {
            // Priority 4 or 5 means critical
            if ((result.updatePriority ?? 0) >= 4) {
              await AppUpdate.performImmediateUpdate()
              return // Native UI takes over
            } else {
              // For flexible updates, we can either use native flexible or our modal
              // Let's use our modal but link to store if possible
              const availableVersion = parseInt(result.availableVersionCode ?? '0') || 
                                       parseInt(result.availableVersionName ?? '0') || 
                                       CURRENT_APP_VERSION + 1;

              setUpdateInfo({
                show: true,
                url: Capacitor.getPlatform() === 'android' 
                  ? `market://details?id=com.jpm.app` 
                  : `https://apps.apple.com/app/idYOUR_APP_ID`,
                isCritical: false,
                latestVersion: availableVersion
              })
              return
            }
          }
        } catch (e) {
          console.warn('Native update check failed, falling back to manual:', e)
        }
      }

      // 2. Fallback: Manual Supabase check (for APK/Direct installs)
      try {
        const { data, error } = await supabase
          .from('app_config')
          .select('latest_version, update_url, is_critical')
          .order('updated_at', { ascending: false })
          .limit(1)
          .single()

        if (data && !error) {
          if (data.latest_version > CURRENT_APP_VERSION) {
            setUpdateInfo({
              show: true,
              url: data.update_url,
              isCritical: data.is_critical,
              latestVersion: data.latest_version
            })
          }
        }
      } catch (err) {
        console.error('Manual update check failed:', err)
      }
    }

    checkForUpdates()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: any, session: any) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!user) return

    const updateLastSeen = async () => {
      await supabase.from('profiles').update({ last_seen: new Date().toISOString() }).eq('id', user.id)
    }

    updateLastSeen()
    const interval = setInterval(updateLastSeen, 5 * 60 * 1000) // Every 5 minutes

    return () => clearInterval(interval)
  }, [user])

  return (
    <AuthContext.Provider value={{ user, loading, refresh }}>
      {children}
      <UpdateModal 
        isOpen={updateInfo.show} 
        onClose={() => setUpdateInfo(prev => ({ ...prev, show: false }))}
        updateUrl={updateInfo.url}
        isCritical={updateInfo.isCritical}
        latestVersion={updateInfo.latestVersion}
      />
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
