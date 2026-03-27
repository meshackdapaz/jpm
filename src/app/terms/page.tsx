'use client'

import React from 'react'
import { AppLayout } from '@/components/AppLayout'
import Link from 'next/link'
import { ChevronLeftIcon } from '@heroicons/react/24/outline'

export default function TermsOfService() {
  return (
    <AppLayout hideSidebar={true} isPublic={true}>
      <div className="max-w-3xl mx-auto py-12 px-6">
        <Link href="/signup" className="flex items-center gap-2 text-zinc-500 hover:text-black dark:hover:text-white transition-colors mb-8 group w-fit">
          <ChevronLeftIcon className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          <span className="font-bold text-sm">Back to Signup</span>
        </Link>

        <header className="mb-12">
          <h1 className="text-4xl font-black tracking-tight mb-4">Terms of Service</h1>
          <p className="text-zinc-500 font-medium">Last updated: March 26, 2026</p>
        </header>

        <div className="prose prose-zinc dark:prose-invert max-w-none space-y-8 text-[16px] leading-relaxed text-zinc-800 dark:text-zinc-300">
          <section>
            <h2 className="text-xl font-bold text-black dark:text-white mb-4">1. Acceptance of Terms</h2>
            <p>
              By accessing or using JPM, you agree to be bound by these Terms of Service. If you do not agree to these terms, you may not use the platform.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-black dark:text-white mb-4">2. Eligibility</h2>
            <p>
              You must be at least 18 years old to create an account and use JPM. By using the platform, you represent and warrant that you are of legal age and have the capacity to enter into these terms.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-black dark:text-white mb-4">3. User Conduct</h2>
            <p>You agree not to engage in any of the following prohibited activities:</p>
            <ul className="list-disc pl-5 space-y-2 mt-4">
              <li>Posting content that is illegal, harmful, or violates the rights of others.</li>
              <li>Harassing or bullying other users.</li>
              <li>Attempting to interfere with the security or operation of the platform.</li>
              <li>Using automated systems (bots) to access or scrape data.</li>
              <li>Spamming or sending unsolicited advertisements.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-black dark:text-white mb-4">4. Content Ownership</h2>
            <p>
              You retain ownership of the content you post on JPM. However, by posting content, you grant us a worldwide, non-exclusive, royalty-free license to use, display, and distribute that content to facilitate the platform's services.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-black dark:text-white mb-4">5. Account Termination</h2>
            <p>
              We reserve the right to suspend or terminate your account at our sole discretion, without notice, for conduct that we believe violates these Terms or is harmful to other users or ourselves.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-black dark:text-white mb-4">6. Limitation of Liability</h2>
            <p>
              JPM is provided "as is" without any warranties. We shall not be liable for any indirect, incidental, or consequential damages resulting from your use of the platform.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-black dark:text-white mb-4">7. Changes to Terms</h2>
            <p>
              We may update these Terms from time to time. We will notify you of any significant changes by posting the new Terms on this page. Your continued use of the platform after changes are posted constitutes acceptance of the new Terms.
            </p>
          </section>
        </div>

        <footer className="mt-20 pt-8 border-t border-zinc-100 dark:border-zinc-800 text-center text-zinc-500 text-sm">
          &copy; 2026 JPM. All rights reserved.
        </footer>
      </div>
    </AppLayout>
  )
}
