import React, { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { motion, useAnimation } from 'framer-motion'

import { useTheme } from 'next-themes'
import {
  HomeIcon as HomeOutline,
  MagnifyingGlassIcon as SearchOutline,
  BellIcon as BellOutline,
  UserIcon as UserOutline,
  Bars3Icon,
  SunIcon,
  MoonIcon,
  Cog6ToothIcon,
  XMarkIcon,
  EnvelopeIcon as EnvelopeOutline,
  HeartIcon,
  BookmarkIcon,
  UserPlusIcon as FollowerIcon,
  ChevronRightIcon as RightIcon,
} from '@heroicons/react/24/outline'

import {
  HomeIcon as HomeSolid,
  MagnifyingGlassIcon as SearchSolid,
  BellIcon as BellSolid,
  UserIcon as UserSolid,
  EnvelopeIcon as EnvelopeSolid,
  ChatBubbleLeftRightIcon as MessagesSolid,
  PencilSquareIcon as PlusSolid,
} from '@heroicons/react/24/solid'

import { ChatBubbleLeftRightIcon as MessagesOutline, PencilSquareIcon as PlusOutline } from '@heroicons/react/24/outline'

import { useAuth } from './AuthProvider'
import { CreatePost } from './CreatePost'
import { RightSidebar } from './RightSidebar'
import { ToastNotification } from './ToastNotification'
import { PushNotifications } from '@capacitor/push-notifications'

// ── Pull-to-refresh threshold (px) ─────────────────────────────────────────
const PTR_THRESHOLD = 72

export function AppLayout({ children, fullBleed = false }: { children: React.ReactNode; fullBleed?: boolean }) {
  const { user: currentUser, loading: authLoading } = useAuth()
  const pathname = usePathname()
  const router = useRouter()
  const [isPostModalOpen, setIsPostModalOpen] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const supabase = createClient()

  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [isNative, setIsNative] = useState(false)

  // ── Pull-to-refresh state ──────────────────────────────────────────────────
  const [ptrPull, setPtrPull] = useState(0)          // px pulled so far
  const [ptrRefreshing, setPtrRefreshing] = useState(false)
  const logoControls = useAnimation()
  const rotationRef = useRef(0)
  const spinInterval = useRef<NodeJS.Timeout | null>(null)

  const touchStartY = useRef(0)
  const isPulling = useRef(false)

  // ── Keyboard visibility → hide bottom nav ─────────────────────────────
  const [keyboardVisible, setKeyboardVisible] = useState(false)

  // ── Scroll direction → hide/show bottom nav ────────────────────────────
  const [navHidden, setNavHidden] = useState(false)
  const lastScrollY = useRef(0)
  const navHiddenRef = useRef(false)

  useEffect(() => {
    setMounted(true)
    import('@capacitor/core').then(({ Capacitor }) => {
      setIsNative(Capacitor.isNativePlatform())
    }).catch(() => {})
    if (!currentUser) return

    const fetchUnread = async () => {
      const { count } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('receiver_id', currentUser.id)
        .eq('is_read', false)
      setUnreadCount(count || 0)
    }
    fetchUnread()

    // ── Global Delivered Sync ──
    // Mark ALL incoming messages for this user as delivered if the app is active
    const globalSync = supabase
      .channel('global-delivery')
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'messages',
        filter: `receiver_id=eq.${currentUser.id}`
      }, async (payload: any) => {
        const msg = payload.new
        if (!msg.is_delivered) {
          await supabase.from('messages').update({ is_delivered: true }).eq('id', msg.id)
          fetchUnread() // Also refresh badge if new message arrived
        }
      })
      .subscribe()

    // Listen for events to re-sync the badge
    const onNewMsg = () => fetchUnread()
    const onMsgRead = () => fetchUnread()
    window.addEventListener('new-message-received', onNewMsg)
    window.addEventListener('messages-read', onMsgRead)
    
    // ── Push Notifications ──
    if (isNative) {
      // Create channels for Android 8+
      PushNotifications.createChannel({
        id: 'messages',
        name: 'Messages',
        description: 'New messages and chat alerts',
        importance: 4, // high
        visibility: 1, // public
        vibration: true,
      }).catch(e => console.error('Failed to create messages channel:', e))

      PushNotifications.createChannel({
        id: 'calls',
        name: 'Calls',
        description: 'Incoming voice and video calls',
        importance: 5, // max
        visibility: 1, 
        vibration: true,
      }).catch(e => console.error('Failed to create calls channel:', e))

      PushNotifications.requestPermissions().then(result => {
        if (result.receive === 'granted') {
          PushNotifications.register()
        }
      })

      PushNotifications.addListener('registration', async (token) => {
        console.log('Push token:', token.value)
        await supabase.from('profiles').update({ fcm_token: token.value }).eq('id', currentUser.id)
      })

      PushNotifications.addListener('pushNotificationReceived', (notification) => {
        console.log('Push received:', notification)
        fetchUnread()
      })
    }

    return () => {
      window.removeEventListener('new-message-received', onNewMsg)
      window.removeEventListener('messages-read', onMsgRead)
      supabase.removeChannel(globalSync)
    }
  }, [currentUser, isNative])

  // ── Scroll-hide bottom nav listener ───────────────────────────────────
  useEffect(() => {
    // Initialize from current scroll position
    lastScrollY.current = window.scrollY

    let rafId = 0
    const onScroll = () => {
      cancelAnimationFrame(rafId)
      rafId = requestAnimationFrame(() => {
        const y = window.scrollY
        const delta = y - lastScrollY.current

        // Only react to meaningful scroll (>= 6px)
        if (Math.abs(delta) >= 6) {
          const shouldHide = delta > 0 && y > 80
          if (shouldHide !== navHiddenRef.current) {
            navHiddenRef.current = shouldHide
            setNavHidden(shouldHide)
          }
          lastScrollY.current = y
        }
      })
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      cancelAnimationFrame(rafId)
    }
  }, [])

  // ── Keyboard visibility listener ─────────────────────────────────────
  useEffect(() => {
    let showW: any, showD: any, hideW: any, hideD: any

    const setupKeyboard = async () => {
      try {
        const { Keyboard } = await import('@capacitor/keyboard')
        
        showW = await Keyboard.addListener('keyboardWillShow', () => setKeyboardVisible(true))
        showD = await Keyboard.addListener('keyboardDidShow', () => setKeyboardVisible(true))
        hideW = await Keyboard.addListener('keyboardWillHide', () => setKeyboardVisible(false))
        hideD = await Keyboard.addListener('keyboardDidHide', () => setKeyboardVisible(false))
      } catch (e) {
        console.error('Keyboard plugin error:', e)
      }
    }

    if (isNative) {
      setupKeyboard()
    } else {
      const handleResize = () => setKeyboardVisible(window.innerHeight < 500)
      window.addEventListener('resize', handleResize)
      return () => window.removeEventListener('resize', handleResize)
    }

    return () => {
      showW?.remove(); showD?.remove(); hideW?.remove(); hideD?.remove()
    }
  }, [isNative])

  // ── Pull-to-refresh touch handlers ────────────────────────────────────────
  const onTouchStart = useCallback((e: React.TouchEvent) => {
    if (window.scrollY === 0) {
      touchStartY.current = e.touches[0].clientY
      isPulling.current = true
    }
  }, [])

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isPulling.current || ptrRefreshing) return
    const delta = e.touches[0].clientY - touchStartY.current
    if (delta > 0) {
      // Apply rubber-band dampening
      setPtrPull(Math.min(delta * 0.45, PTR_THRESHOLD + 20))
    }
  }, [ptrRefreshing])

  const onTouchEnd = useCallback(() => {
    if (!isPulling.current) return
    isPulling.current = false
    if (ptrPull >= PTR_THRESHOLD && !ptrRefreshing) {
      setPtrRefreshing(true)
      setPtrPull(PTR_THRESHOLD)

      // Start spinning continuous
      rotationRef.current = 0
      spinInterval.current = setInterval(() => {
        rotationRef.current += 360
        logoControls.start({
          rotate: rotationRef.current,
          transition: { duration: 0.8, ease: "linear" }
        })
      }, 800)

      // ── Dispatch refresh event to Feed ──
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('ptr-refresh'))
        // Wait a bit, then stop spinning smoothly
        setTimeout(() => {
          if (spinInterval.current) {
            clearInterval(spinInterval.current)
            spinInterval.current = null
          }
          
          // Complete to nearest 360
          const finalRotation = Math.ceil(rotationRef.current / 360) * 360
          logoControls.start({
            rotate: finalRotation,
            transition: { duration: 0.8, ease: "easeOut" }
          }).then(() => {
            setPtrPull(0)
            setPtrRefreshing(false)
          })
        }, 800)
      }, 500)
    } else {

      setPtrPull(0)
    }
  }, [ptrPull, ptrRefreshing])

  // ── Protection logic ──
  useEffect(() => {
    if (!authLoading && !currentUser) {
      router.push('/login')
    }
  }, [authLoading, currentUser, router])

  // Listen for custom event to open post modal from Feed
  useEffect(() => {
    const handler = () => setIsPostModalOpen(true)
    window.addEventListener('open-post-modal', handler)
    return () => window.removeEventListener('open-post-modal', handler)
  }, [])

  // ── Tab definitions ───────────────────────────────────────────────────────
  type Tab = {
    name: string
    href?: string
    action?: () => void
    iconOutline: React.ElementType
    iconSolid: React.ElementType
    badge?: number
    isPost?: boolean
  }

  const bottomTabs: Tab[] = [
    { name: 'Home',          href: '/',               iconOutline: HomeOutline,    iconSolid: HomeSolid },
    { name: 'Messages',      href: '/messages',        iconOutline: EnvelopeOutline, iconSolid: EnvelopeSolid, badge: unreadCount },
    { name: 'Post',          action: () => setIsPostModalOpen(true), iconOutline: PlusOutline, iconSolid: PlusSolid, isPost: true },
    { name: 'Notifications', href: '/notifications',   iconOutline: BellOutline,    iconSolid: BellSolid },
    { name: 'Profile',       href: currentUser ? `/profile?id=${currentUser.id}` : '/login', iconOutline: UserOutline, iconSolid: UserSolid },
  ]

  const desktopTabs: Tab[] = [
    { name: 'Home',          href: '/',               iconOutline: HomeOutline,    iconSolid: HomeSolid },
    { name: 'Search',        href: '/search',          iconOutline: SearchOutline,  iconSolid: SearchSolid },
    { name: 'Post',          action: () => setIsPostModalOpen(true), iconOutline: PlusOutline, iconSolid: PlusSolid },
    { name: 'Notifications', href: '/notifications',   iconOutline: BellOutline,    iconSolid: BellSolid },
    { name: 'Messages',      href: '/messages',        iconOutline: MessagesOutline, iconSolid: MessagesSolid, badge: unreadCount },
    { name: 'Profile',       href: currentUser ? `/profile?id=${currentUser.id}` : '/login', iconOutline: UserOutline, iconSolid: UserSolid },
  ]

  if (isNative && authLoading) {
    return (
      <div className="flex min-h-screen min-h-[100dvh] items-center justify-center bg-black">
        <svg className="w-16 h-16 text-white" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12.001 2C6.475 2 2 6.476 2 12s4.475 10 10.001 10C17.522 22 22 17.524 22 12S17.522 2 12.001 2zM12 20c-4.41 0-8-3.589-8-8s3.59-8 8-8 8 3.589 8 8-3.59 8-8 8zm4.5-8c0 2.485-2.015 4.5-4.5 4.5S7.5 14.485 7.5 12s2.015-4.5 4.5-4.5 4.5 2.015 4.5 4.5zm1.5 0c0-3.313-2.687-6-6-6S6 8.687 6 12s2.687 6 6 6c1.293 0 2.49-.409 3.471-1.103l-.985-1.459A4.468 4.468 0 0112 16.5c-2.485 0-4.5-2.015-4.5-4.5S9.515 7.5 12 7.5s4.5 2.015 4.5 4.5v1.125c0 .621-.503 1.125-1.125 1.125S14.25 13.746 14.25 13.125V12c0-1.24-1.01-2.25-2.25-2.25S9.75 10.76 9.75 12s1.01 2.25 2.25 2.25c.655 0 1.24-.28 1.657-.726A2.614 2.614 0 0016.5 13.125V12z"/>
        </svg>
      </div>
    )
  }

  return (
    <div
      className="flex min-h-screen min-h-[100dvh] bg-white dark:bg-black text-[#101010] dark:text-[#f3f5f7]"
      style={{
        '--nav-height': navHidden || keyboardVisible ? '0px' : '56px'
      } as React.CSSProperties}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {/* ── In-App Toast Notifications ───────────────────────────────────────── */}
      <ToastNotification />

      {/* ── Mobile Top Header (Home page only) ─────────────────────────────── */}
      {pathname === '/' && (
      <header className="sm:hidden fixed top-0 left-0 right-0 z-40 bg-white dark:bg-black flex items-center px-4 pt-[env(safe-area-inset-top)] h-[calc(3.5rem+env(safe-area-inset-top))]">
        {/* Left Column (fixed width) */}
        <div className="w-10 flex items-center">
          {pathname === '/' && (
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="flex items-center justify-start text-zinc-900 dark:text-zinc-100"
              aria-label="Menu"
            >
              <Bars3Icon className="w-6 h-6" />
            </button>
          )}
        </div>

        {/* Center Column (flexible, logo centered) */}
        <div className="flex-1 flex justify-center items-center overflow-visible">
          <Link
            href="/"
            aria-label="Home"
          >
            <motion.div animate={logoControls}>
              <svg className="w-8 h-8 text-black dark:text-white" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                <path d="M12.001 2C6.475 2 2 6.476 2 12s4.475 10 10.001 10C17.522 22 22 17.524 22 12S17.522 2 12.001 2zM12 20c-4.41 0-8-3.589-8-8s3.59-8 8-8 8 3.589 8 8-3.59 8-8 8zm4.5-8c0 2.485-2.015 4.5-4.5 4.5S7.5 14.485 7.5 12s2.015-4.5 4.5-4.5 4.5 2.015 4.5 4.5zm1.5 0c0-3.313-2.687-6-6-6S6 8.687 6 12s2.687 6 6 6c1.293 0 2.49-.409 3.471-1.103l-.985-1.459A4.468 4.468 0 0112 16.5c-2.485 0-4.5-2.015-4.5-4.5S9.515 7.5 12 7.5s4.5 2.015 4.5 4.5v1.125c0 .621-.503 1.125-1.125 1.125S14.25 13.746 14.25 13.125V12c0-1.24-1.01-2.25-2.25-2.25S9.75 10.76 9.75 12s1.01 2.25 2.25 2.25c.655 0 1.24-.28 1.657-.726A2.614 2.614 0 0016.5 13.125V12z"/>
              </svg>
            </motion.div>
          </Link>
        </div>

        {/* Right Column (fixed width) */}
        <div className="w-10 flex items-center justify-end">
          {pathname === '/' && (
            <Link href="/search" className="flex items-center justify-end text-zinc-900 dark:text-zinc-100" aria-label="Search">
              <SearchOutline className="w-6 h-6" />
            </Link>
          )}
        </div>
      </header>
      )}

      {/* ── Desktop Left Nav ────────────────────────────────────────────────── */}
      <nav className="fixed top-0 left-0 bottom-0 w-[72px] z-50 hidden sm:flex flex-col items-center justify-between py-6 bg-white dark:bg-black border-r border-zinc-100 dark:border-zinc-900">
        <Link href="/" className="flex-shrink-0 mb-8 pt-2">
          <div className="font-black text-2xl tracking-tighter">Jpm</div>
        </Link>

        <div className="flex flex-col items-center gap-2 flex-grow justify-center">
          {desktopTabs.map((tab) => {
            const isActive = tab.href
              ? pathname === tab.href || (pathname.startsWith('/profile') && tab.name === 'Profile')
              : isPostModalOpen
            const Icon = isActive ? tab.iconSolid : tab.iconOutline
            const btnClass = `relative w-12 h-12 flex items-center justify-center rounded-2xl transition-all ${
              isActive
                ? 'text-black dark:text-white bg-zinc-100 dark:bg-zinc-900'
                : 'text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-900/50'
            }`
            if (tab.action) {
              return <button key={tab.name} onClick={tab.action} className={btnClass}><Icon className="w-6 h-6" /></button>
            }
            return (
              <Link key={tab.name} href={tab.href as string} className={btnClass}>
                <Icon className="w-6 h-6" />
                {tab.badge && tab.badge > 0 && (
                  <span className="absolute top-1.5 right-1.5 bg-red-500 text-white text-[9px] font-black w-4 h-4 flex items-center justify-center rounded-full border-2 border-white dark:border-black">
                    {tab.badge > 9 ? '9+' : tab.badge}
                  </span>
                )}
              </Link>
            )
          })}
        </div>

        <div className="mt-8 flex flex-col gap-2">
          {mounted && (
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="w-12 h-12 flex items-center justify-center text-zinc-400"
            >
              {theme === 'dark' ? <SunIcon className="w-6 h-6" /> : <MoonIcon className="w-6 h-6" />}
            </button>
          )}
        </div>
      </nav>

      {/* ── Main content ─────────────────────────────────────────────────────  */}
      <main
        className={`flex-grow ${pathname === '/' ? 'pt-14' : 'pt-0'} ${navHidden || keyboardVisible ? 'pb-0' : 'pb-16'} sm:pt-0 sm:pb-0 font-sans ${fullBleed ? 'sm:pl-[72px]' : 'flex justify-center'}`}
        style={{
          transform: ptrPull > 0 ? `translateY(${ptrPull}px)` : 'translateY(0)',
          transition: ptrPull > 0 ? 'none' : 'transform 0.35s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        }}
      >
        {fullBleed ? (
          children
        ) : (
          <div className="flex w-full max-w-4xl gap-0 lg:gap-8 lg:px-4">
            <div className="flex-1 min-w-0 max-w-xl w-full min-h-screen bg-white dark:bg-black sm:ml-[72px]">
              {children}
            </div>
            {!isNative && <RightSidebar />}
          </div>
        )}
      </main>

      {/* ── Mobile Bottom Nav — auto-hides on scroll-down ────────────────────  */}
      <nav
        className={`sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-black transition-transform duration-300 ease-in-out ${
          navHidden || keyboardVisible ? 'translate-y-full' : 'translate-y-0'
        }`}
        style={{
          paddingBottom: 'env(safe-area-inset-bottom)',
          paddingLeft:   'env(safe-area-inset-left)',
          paddingRight:  'env(safe-area-inset-right)',
        }}
      >
        {/* Top divider — very subtle */}
        <div className="absolute top-0 left-0 right-0 h-px bg-zinc-100 dark:bg-zinc-900" />
        <div className="flex justify-around items-center h-[56px]">
          {bottomTabs.map((tab) => {
            const isActive = tab.href
              ? pathname === tab.href || (pathname.startsWith('/profile') && tab.name === 'Profile')
              : false
            const Icon = isActive ? tab.iconSolid : tab.iconOutline

            // ── Center + pill ──
            if (tab.isPost) {
              return (
                <button
                  key="Post"
                  onClick={tab.action}
                  aria-label="New post"
                  className="flex-1 flex items-center justify-center h-full"
                >
                  <span className="w-[56px] h-[34px] bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center border border-zinc-200 dark:border-zinc-700">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-zinc-700 dark:text-zinc-200" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="12" y1="5" x2="12" y2="19" />
                      <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                  </span>
                </button>
              )
            }

            const iconEl = (
              <div className={`relative flex items-center justify-center h-full w-full transition-colors ${
                isActive ? 'text-black dark:text-white' : 'text-zinc-400 dark:text-zinc-500'
              }`}>
                <Icon className="w-[26px] h-[26px]" />
                {tab.badge && tab.badge > 0 && (
                  <span className="absolute top-2 right-1/2 translate-x-3 bg-red-500 text-white text-[9px] font-black w-[18px] h-[18px] flex items-center justify-center rounded-full ring-2 ring-white dark:ring-black">
                    {tab.badge > 9 ? '9+' : tab.badge}
                  </span>
                )}
              </div>
            )

            if (tab.action) return <button key={tab.name} onClick={tab.action} className="flex-1 h-full">{iconEl}</button>
            return <Link key={tab.name} href={tab.href as string} className="flex-1 h-full">{iconEl}</Link>
          })}
        </div>
      </nav>

      {/* ── Mobile Side Drawer (Feeds on Home, Menu elsewhere) ────────────────── */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex sm:hidden">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)} />
          <div className="relative w-[85%] max-w-[340px] h-full bg-white dark:bg-zinc-950 shadow-2xl flex flex-col animate-in slide-in-from-left duration-300 rounded-r-[32px] overflow-hidden">
            
            {pathname === '/' ? (
              /* HOME PAGE: FEEDS DRAWER (Mockup Image 1) */
              <div className="flex flex-col h-full">
                <div className="p-6 pt-10">
                  <h2 className="text-[32px] font-black tracking-tight mb-8">Feeds</h2>
                  
                  {/* Top quick actions */}
                  <div className="flex gap-4 mb-10">
                    <button className="flex-1 h-14 bg-zinc-50 dark:bg-zinc-900 rounded-2xl flex items-center justify-center border border-zinc-100 dark:border-zinc-800 shadow-sm active:scale-95 transition-transform">
                      <HeartIcon className="w-6 h-6 text-zinc-900 dark:text-zinc-100" />
                    </button>
                    <button className="flex-1 h-14 bg-zinc-50 dark:bg-zinc-900 rounded-2xl flex items-center justify-center border border-zinc-100 dark:border-zinc-800 shadow-sm active:scale-95 transition-transform">
                      <BookmarkIcon className="w-6 h-6 text-zinc-900 dark:text-zinc-100" />
                    </button>
                  </div>

                  {/* Feed List */}
                  <div className="bg-zinc-50 dark:bg-zinc-900/50 rounded-[32px] border border-zinc-100 dark:border-zinc-800/80 overflow-hidden divide-y divide-zinc-100 dark:divide-zinc-800">
                    <button 
                      onClick={() => {
                        window.dispatchEvent(new CustomEvent('feed-change', { detail: { tab: 'for_you' } }))
                        setIsMobileMenuOpen(false)
                      }}
                      className="w-full flex items-center justify-between p-6 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors group"
                    >
                      <span className="text-[20px] font-bold">For you</span>
                      <RightIcon className="w-5 h-5 text-zinc-300 group-hover:text-zinc-500 transition-colors" />
                    </button>
                    <button 
                      onClick={() => {
                        window.dispatchEvent(new CustomEvent('feed-change', { detail: { tab: 'following' } }))
                        setIsMobileMenuOpen(false)
                      }}
                      className="w-full flex items-center justify-between p-6 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors group"
                    >
                      <span className="text-[20px] font-bold">Following</span>
                      <RightIcon className="w-5 h-5 text-zinc-300 group-hover:text-zinc-500 transition-colors" />
                    </button>
                    <button 
                      className="w-full flex items-center justify-between p-6 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors group"
                    >
                      <span className="text-[20px] font-bold">Ghost posts</span>
                      <div className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center border border-zinc-200 dark:border-zinc-700">
                        <svg className="w-5 h-5 text-zinc-600 dark:text-zinc-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
                          <circle cx="9" cy="9" r="1.5" /><circle cx="15" cy="9" r="1.5" />
                          <path d="M8 13c0 .5.5 1 1 1s1-.5 1-1m4 0c0 .5.5 1 1 1s1-.5 1-1" />
                        </svg>
                      </div>
                    </button>
                  </div>
                </div>

                <div className="mt-auto p-6 flex items-center justify-between border-t border-zinc-50 dark:border-zinc-900">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 overflow-hidden">
                       <img src={currentUser?.user_metadata?.avatar_url || `https://ui-avatars.com/api/?name=${currentUser?.email}`} className="w-full h-full object-cover" />
                    </div>
                    <div>
                      <p className="text-[14px] font-bold leading-tight line-clamp-1">{currentUser?.email?.split('@')[0]}</p>
                    </div>
                  </div>
                  <button onClick={() => setIsMobileMenuOpen(false)} className="w-10 h-10 rounded-full bg-zinc-50 dark:bg-zinc-900 flex items-center justify-center border border-zinc-100 dark:border-zinc-800">
                    <XMarkIcon className="w-5 h-5 text-zinc-400" />
                  </button>
                </div>
              </div>
            ) : (
              /* OTHER PAGES: GLOBAL MENU */
              <>
                <div className="flex items-center justify-between p-5 border-b border-zinc-100 dark:border-zinc-900">
                  <span className="font-black text-xl">Menu</span>
                  <button onClick={() => setIsMobileMenuOpen(false)} className="p-2">
                    <XMarkIcon className="w-6 h-6" />
                  </button>
                </div>
                <div className="flex-1 flex flex-col p-4 gap-1">
                  <Link href="/search" onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-900 font-semibold text-[17px]">
                    <SearchOutline className="w-6 h-6 text-zinc-500" />
                    Search
                  </Link>
                  <Link href="/settings" onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-900 font-semibold text-[17px]">
                    <Cog6ToothIcon className="w-6 h-6 text-zinc-500" />
                    Settings
                  </Link>
                  {mounted && (
                    <button
                      onClick={() => { setTheme(theme === 'dark' ? 'light' : 'dark'); setIsMobileMenuOpen(false) }}
                      className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-900 font-semibold text-left text-[17px]"
                    >
                      {theme === 'dark'
                        ? <SunIcon className="w-6 h-6 text-zinc-500" />
                        : <MoonIcon className="w-6 h-6 text-zinc-500" />
                      }
                      {theme === 'dark' ? 'Light mode' : 'Dark mode'}
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Create Post Modal ─────────────────────────────────────────────────  */}
      {isPostModalOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center sm:p-4 bg-black/60 backdrop-blur-sm"
          onClick={() => setIsPostModalOpen(false)}
        >
          <div
            className="bg-white dark:bg-zinc-950 w-full sm:max-w-xl rounded-t-3xl sm:rounded-2xl overflow-hidden animate-slide-up sm:animate-none"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-between items-center px-5 py-4 border-b border-zinc-100 dark:border-zinc-800/80">
              <button onClick={() => setIsPostModalOpen(false)} className="text-zinc-500 font-semibold text-[15px]">
                Cancel
              </button>
              <h2 className="font-bold text-[16px]">New thread</h2>
              <div className="w-14" />
            </div>
            <CreatePost inModal={true} onSuccess={() => setIsPostModalOpen(false)} />
          </div>
        </div>
      )}
    </div>
  )
}
