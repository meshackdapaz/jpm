'use client'

import React from 'react'
import { AppLayout } from '@/components/AppLayout'
import Link from 'next/link'
import { ChevronLeftIcon, EnvelopeIcon } from '@heroicons/react/24/outline'
import { useAuth } from '@/components/AuthProvider'

export default function Contact() {
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
          <h1 className="text-4xl font-black tracking-tight mb-4">Contact Us</h1>
          <p className="text-zinc-500 font-medium">We're here to help and answer any questions you might have.</p>
        </header>

        <div className="prose prose-zinc dark:prose-invert max-w-none space-y-8 text-[16px] leading-relaxed text-zinc-800 dark:text-zinc-300">
          <section>
            <h2 className="text-xl font-bold text-black dark:text-white mb-4">Get in Touch</h2>
            <p>
              Whether you have a question about features, pricing, need technical support, or want to report a violation of our community standards, our team is ready to answer all your questions.
            </p>
          </section>

          <section className="bg-zinc-50 dark:bg-zinc-900/50 p-6 rounded-2xl border border-zinc-100 dark:border-zinc-800">
            <h2 className="text-lg font-bold text-black dark:text-white mb-4 flex items-center gap-2">
              <EnvelopeIcon className="w-5 h-5" />
              Email Support
            </h2>
            <p className="mb-4">
              For all inquiries, please email us directly at:
            </p>
            <a href="mailto:meshackurassa2@gmail.com" className="text-lg font-black text-blue-500 hover:underline">
              meshackurassa2@gmail.com
            </a>
            <p className="mt-4 text-sm text-zinc-500">
              We aim to respond to all inquiries within 24-48 business hours.
            </p>
          </section>
          
          <section>
            <h2 className="text-xl font-bold text-black dark:text-white mb-4">Copyright Claims</h2>
            <p>
              If you believe that your copyrighted work has been copied in a way that constitutes copyright infringement and is accessible via the platform, please notify us at the email address above with the subject line "Copyright Claim".
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
