import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: " ",
  description: "Share your thoughts anonymously.",
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-8166782428171770" crossOrigin="anonymous"></script>
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
      </body>
    </html>
  );
}

