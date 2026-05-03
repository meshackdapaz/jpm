'use client'

import React from 'react'
import { AppLayout } from '@/components/AppLayout'
import Link from 'next/link'
import { ChevronLeftIcon } from '@heroicons/react/24/outline'
import { useAuth } from '@/components/AuthProvider'

export default function TermsOfService() {
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
          <h1 className="text-4xl font-black tracking-tight mb-4">Terms of Service</h1>
          <p className="text-zinc-500 font-medium">Last updated: March 26, 2026</p>
        </header>

        <div className="prose prose-zinc dark:prose-invert max-w-none space-y-8 text-[16px] leading-relaxed text-zinc-800 dark:text-zinc-300">
          <section>
            <h2 className="text-xl font-bold text-black dark:text-white mb-4">1. Acceptance of Terms</h2>
            <p>
              By accessing or using the platform, you agree to be bound by these Terms of Service. If you do not agree to these terms, you may not use the platform.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-black dark:text-white mb-4">2. Eligibility</h2>
            <p>
              You must be at least 18 years old to create an account and use the platform. By using the platform, you represent and warrant that you are of legal age and have the capacity to enter into these terms.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-black dark:text-white mb-4">3. User Conduct and User-Generated Content (UGC)</h2>
            <p>We maintain strict guidelines for content published on our platform. You agree not to engage in any of the following prohibited activities or post content that involves:</p>
            <ul className="list-disc pl-5 space-y-2 mt-4">
              <li><strong>Illegal or Harmful Content:</strong> Posting content that is illegal, harmful, or violates the rights of others, including copyright infringement.</li>
              <li><strong>Adult Content:</strong> Publishing sexually explicit material, pornography, or suggestive content.</li>
              <li><strong>Hate Speech & Harassment:</strong> Harassing, bullying, or promoting discrimination/violence against any individual or group.</li>
              <li><strong>Misleading Information:</strong> Spreading spam, false information, or unsolicited advertisements.</li>
              <li><strong>Platform Abuse:</strong> Attempting to interfere with the security or operation of the platform, or using automated systems (bots) to access or scrape data.</li>
            </ul>
            <p className="mt-4">
              <strong>Moderation:</strong> We reserve the right to review, flag, and remove any User-Generated Content that violates these Terms or our community standards. Accounts repeatedly violating these guidelines will be permanently suspended.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-black dark:text-white mb-4">4. Content Ownership</h2>
            <p>
              You retain ownership of the content you post on the platform. However, by posting content, you grant us a worldwide, non-exclusive, royalty-free license to use, display, and distribute that content to facilitate the platform's services.
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
              The platform is provided "as is" without any warranties. We shall not be liable for any indirect, incidental, or consequential damages resulting from your use of the platform.
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
          &copy; {new Date().getFullYear()} JPM. All rights reserved.
        </footer>
      </div>
    </AppLayout>
  )
}
