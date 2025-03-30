import './globals.css';
import type { Metadata } from "next";
import Providers from "@/components/Providers";
import BottomNavigation from '@/components/BottomNavigation';
import Header from '@/components/Header';
import AuthCheck from '@/components/AuthCheck';
import Script from 'next/script';

export const metadata: Metadata = {
  title: "HypertrophyPro - Intelligent Workout Tracking",
  description: "Track your hypertrophy workouts with intelligent periodization and progress tracking",
  manifest: '/manifest.json',
  themeColor: '#39FF14',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Workout App',
  },
  icons: {
    icon: '/icons/icon-512x512.png',
    shortcut: '/icons/icon-192x192.png',
    apple: '/icons/icon-192x192.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black" />
        <meta name="apple-mobile-web-app-title" content="Workout App" />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
        <meta name="theme-color" content="#39FF14" />
      </head>
      <body className="min-h-screen bg-background text-white pb-16 md:pb-0">
        <Providers>
          <AuthCheck>
            <Header />
            <main>
              {children}
            </main>
            <BottomNavigation />
          </AuthCheck>
        </Providers>
        <Script
          id="register-sw"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').then(
                    function(registration) {
                      console.log('Service Worker registration successful');
                    },
                    function(err) {
                      console.log('Service Worker registration failed: ', err);
                    }
                  );
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
