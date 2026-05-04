import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "JPM - Share your thoughts",
  description: "Share your thoughts anonymously.",
  other: {
    "google-adsense-account": "ca-pub-8166782428171770"
  }
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
  userScalable: false,
};

import { I18nProvider } from "@/lib/i18n";
import { AuthProvider } from "@/components/AuthProvider";
import { ThemeProvider } from "@/components/ThemeProvider";
import { OfflineNotice } from "@/components/OfflineNotice";
import { SplashScreen } from "@/components/SplashScreen";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Google AdSense verification - must be in <head> */}
        <script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-8166782428171770"
          crossOrigin="anonymous"
        />
      </head>
      <body
        suppressHydrationWarning
        className="antialiased font-sans"
      >
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <AuthProvider>
            <SplashScreen />
            <I18nProvider>
              <OfflineNotice />
              {children}
            </I18nProvider>
          </AuthProvider>
        </ThemeProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
