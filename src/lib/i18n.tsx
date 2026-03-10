'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'

type Language = 'en' | 'sw'

type Translations = {
  [key in Language]: {
    home: string
    messages: string
    profile: string
    post: string
    search: string
    login: string
    signup: string
    logout: string
    trending: string
    whatIsHappening: string
    comment: string
    repost: string
    like: string
    share: string
    swahili: string
    english: string
    edit_profile: string
    notifications: string
  }
}

const translations: Translations = {
  en: {
    home: 'Home',
    messages: 'Messages',
    profile: 'Profile',
    post: 'Post',
    search: 'Search',
    login: 'Log in',
    signup: 'Sign up',
    logout: 'Log out',
    trending: 'Trending',
    whatIsHappening: "What's happening?",
    comment: 'Comment',
    repost: 'Repost',
    like: 'Like',
    share: 'Share',
    swahili: 'Swahili',
    english: 'English',
    edit_profile: 'Edit Profile',
    notifications: 'Notifications',
  },
  sw: {
    home: 'Nyumbani',
    messages: 'Ujumbe',
    profile: 'Wasifu',
    post: 'Chapisha',
    search: 'Tafuta',
    login: 'Ingia',
    signup: 'Jisajili',
    logout: 'Ondoka',
    trending: 'Yanayovuma',
    whatIsHappening: 'Nini kinaendelea?',
    comment: 'Maoni',
    repost: ' somezi',
    like: 'Penda',
    share: 'Shiriki',
    swahili: 'Kiswahili',
    english: 'Kiingereza',
    edit_profile: 'Hariri Profaili',
    notifications: 'Arifu',
  },
}

interface I18nContextType {
  language: Language
  setLanguage: (lang: Language) => void
  t: (key: keyof Translations['en']) => string
}

const I18nContext = createContext<I18nContextType | undefined>(undefined)

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState<Language>('en')

  const t = (key: keyof Translations['en']) => {
    return translations[language][key] || key
  }

  return (
    <I18nContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </I18nContext.Provider>
  )
}

export function useI18n() {
  const context = useContext(I18nContext)
  if (!context) {
    throw new Error('useI18n must be used within an I18nProvider')
  }
  return context
}
