'use client'

import React from 'react'
import { AppLayout } from '@/components/AppLayout'
import Link from 'next/link'
import { ChevronLeftIcon } from '@heroicons/react/24/outline'
import { useAuth } from '@/components/AuthProvider'

export default function About() {
  const { user } = useAuth()
  const backHref = user ? '/' : '/signup'
  const backText = user ? 'Back' : 'Back to Signup'

  return (
    <AppLayout hideSidebar={true} isPublic={true}>
      <div className="max-w-3xl mx-auto py-12 px-6">
        <Link href={backHref} className="flex items-center gap-2 text-zinc-500 hover:text-black dark:hover:text-white transition-colors mb-8 group w-fit">
          <ChevronLeftIcon className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          <span className="font-bold text-sm">{backText}</span>
        </Link>

        <header className="mb-12">
          <h1 className="text-4xl font-black tracking-tight mb-4">About Us</h1>
          <p className="text-zinc-500 font-medium">Learn more about JPM and our mission.</p>
        </header>

        <div className="prose prose-zinc dark:prose-invert max-w-none space-y-8 text-[16px] leading-relaxed text-zinc-800 dark:text-zinc-300">
          <section>
            <h2 className="text-xl font-bold text-black dark:text-white mb-4">Our Mission</h2>
            <p>
              At JPM, we believe in the power of shared experiences and humor. Our mission is to provide a platform where users can freely share thoughts, connect over internet culture, and build a community around memes and engaging discussions. 
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-black dark:text-white mb-4">What We Do</h2>
            <p>
              JPM is a social content-sharing platform designed for creators and enthusiasts alike. Whether you're here to share a funny moment, read engaging thoughts, or participate in the latest online trends, our platform offers a seamless, mobile-first experience to keep you connected.
            </p>
            <p className="mt-4">
              We prioritize user experience, fast content delivery, and community-driven engagement.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-black dark:text-white mb-4">Community Standards</h2>
            <p>
              We are committed to maintaining a safe, respectful, and high-quality environment for all our users. We actively moderate content to ensure it aligns with our Terms of Service and fosters a positive community. 
            </p>
          </section>
        </div>

        <footer className="mt-20 pt-8 border-t border-zinc-100 dark:border-zinc-800 text-center text-zinc-500 text-sm">
          &copy; {new Date().getFullYear()} JPM. All rights reserved.
        </footer>
      </div>
    </AppLayout>
  )
}
