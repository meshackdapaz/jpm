'use client'

import React from 'react'
import { AppLayout } from '@/components/AppLayout'
import Link from 'next/link'
import { ChevronLeftIcon } from '@heroicons/react/24/outline'
import { useAuth } from '@/components/AuthProvider'

export default function PrivacyPolicy() {
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
          <h1 className="text-4xl font-black tracking-tight mb-4">Privacy Policy</h1>
          <p className="text-zinc-500 font-medium">Last updated: March 26, 2026</p>
        </header>

        <div className="prose prose-zinc dark:prose-invert max-w-none space-y-8 text-[16px] leading-relaxed text-zinc-800 dark:text-zinc-300">
          <section>
            <h2 className="text-xl font-bold text-black dark:text-white mb-4">1. Introduction</h2>
            <p>
              Welcome to the platform ("we," "our," or "us"). We are committed to protecting your personal information and your right to privacy. This Privacy Policy explains how we collect, use, and share information when you use our platform.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-black dark:text-white mb-4">2. Information We Collect</h2>
            <div className="space-y-4">
              <p>We collect information that you provide directly to us:</p>
              <ul className="list-disc pl-5 space-y-2">
                <li><strong>Account Information:</strong> Name, username, email address, password, birthday, and gender.</li>
                <li><strong>Profile Information:</strong> Profile picture, bio, and other details you choose to add.</li>
                <li><strong>Content:</strong> Memes, comments, and other content you post on the platform.</li>
                <li><strong>Communications:</strong> Any feedback or support requests you send us.</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-bold text-black dark:text-white mb-4">3. How We Use Information</h2>
            <p>We use the information we collect to:</p>
            <ul className="list-disc pl-5 space-y-2 mt-4">
              <li>Provide, maintain, and improve our services.</li>
              <li>Personalize your experience and show you relevant content.</li>
              <li>Communicate with you about updates, security, and support.</li>
              <li>Monitor and analyze trends and usage.</li>
              <li>Detect and prevent fraudulent or illegal activities.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-black dark:text-white mb-4">4. Data Sharing and Advertising</h2>
            <p className="mb-4">
              We do not sell your personal data. We may share information with service providers who perform functions on our behalf, or when required by law to protect our rights or the safety of others.
            </p>
            <h3 className="text-lg font-bold text-black dark:text-white mb-2 mt-6">Third-Party Advertisers and Cookies</h3>
            <p className="mb-4">
              We use third-party advertising companies, including Google AdSense, to serve ads when you visit our website. These companies may use information (not including your name, address, email address, or telephone number) about your visits to this and other websites in order to provide advertisements about goods and services of interest to you.
            </p>
            <ul className="list-disc pl-5 space-y-2 mt-4">
              <li><strong>Google DoubleClick DART Cookie:</strong> Google, as a third-party vendor, uses cookies to serve ads on our site. Google's use of the DART cookie enables it to serve ads to our users based on their visit to our site and other sites on the Internet.</li>
              <li><strong>Opt-Out:</strong> Users may opt out of the use of the DART cookie by visiting the Google ad and content network privacy policy or by visiting <a href="https://www.aboutads.info" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">www.aboutads.info</a>.</li>
              <li><strong>Personalized Advertising:</strong> You can opt out of personalized advertising by visiting your <a href="https://myadcenter.google.com/" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">Google Ads Settings</a>.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-black dark:text-white mb-4">5. Age Requirement</h2>
            <p>
              The platform is restricted to users who are 18 years of age or older. We do not knowingly collect personal information from children under 18. If we become aware that a minor has provided us with personal information, we will take steps to delete such information and terminate the account.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-black dark:text-white mb-4">6. Your Rights</h2>
            <p>
              Depending on your location, you may have the right to access, correct, or delete your personal data. You can delete your account permanently through the Settings page at any time.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-black dark:text-white mb-4">7. Contact Us</h2>
            <p>
              If you have any questions about this Privacy Policy, please contact us at: <br />
              <span className="font-bold text-black dark:text-white">meshackurassa2@gmail.com</span>
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
