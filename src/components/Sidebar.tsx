'use client'

import React from 'react'
import { useI18n } from '@/lib/i18n'
import Link from 'next/link'
import { 
  HomeIcon, 
  HashtagIcon, 
  EnvelopeIcon, 
  UserIcon, 
  BellIcon,
  ArrowRightOnRectangleIcon,
  LanguageIcon
} from '@heroicons/react/24/outline'

import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export function Sidebar({ user }: { user: any }) {
  const { t, language, setLanguage } = useI18n()
  const supabase = createClient()
  const router = useRouter()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.refresh()
  }

  const navItems = [
    { name: t('home'), href: '/', icon: HomeIcon },
    { name: t('trending'), href: '/trending', icon: HashtagIcon },
    { name: t('notifications') || 'Notifications', href: '/notifications', icon: BellIcon },
    { name: t('messages'), href: '/messages', icon: EnvelopeIcon },
    { name: t('profile'), href: user ? `/profile?id=${user.id}` : '/login', icon: UserIcon },
  ]

  return (
    <div className="flex flex-col h-screen fixed w-64 border-r border-zinc-200 dark:border-zinc-800 p-4">


      <nav className="space-y-2 flex-grow">
        {navItems.map((item) => (
          <Link
            key={item.name}
            href={item.href}
            className="flex items-center gap-4 p-3 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors text-lg font-medium"
          >
            <item.icon className="w-7 h-7" />
            <span>{item.name}</span>
          </Link>
        ))}
        
        <button
          onClick={() => setLanguage(language === 'en' ? 'sw' : 'en')}
          className="flex items-center gap-4 p-3 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors text-lg font-medium w-full text-left"
        >
          <LanguageIcon className="w-7 h-7" />
          <span>{language === 'en' ? 'Kiswahili' : 'English'}</span>
        </button>
      </nav>

      <div className="mt-auto">
        {user ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3">
              <div className="w-10 h-10 bg-zinc-200 dark:bg-zinc-800 rounded-full flex items-center justify-center font-bold text-zinc-500">
                {user.email?.[0].toUpperCase()}
              </div>
              <div className="flex-grow overflow-hidden">
                <p className="font-bold truncate">{user.user_metadata?.full_name || 'User'}</p>
                <p className="text-zinc-500 text-sm truncate">@{user.user_metadata?.username || user.email?.split('@')[0]}</p>
              </div>
            </div>
            <button 
              onClick={handleLogout}
              className="flex items-center gap-4 p-3 rounded-full hover:bg-red-50 dark:hover:bg-red-950 transition-colors text-lg font-medium w-full text-left text-red-600"
            >
              <ArrowRightOnRectangleIcon className="w-7 h-7" />
              <span>{t('logout')}</span>
            </button>
          </div>
        ) : (
          <Link
            href="/login"
            className="flex items-center gap-4 p-3 rounded-full bg-blue-500 hover:bg-blue-600 transition-colors text-lg font-bold w-full text-white justify-center"
          >
            <span>{t('login')}</span>
          </Link>
        )}
      </div>
    </div>
  )
}

