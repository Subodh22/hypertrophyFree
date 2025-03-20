import "./globals.css";
import type { Metadata } from "next";
import Providers from "@/components/Providers";
import BottomNavigation from "@/components/BottomNavigation";
import Header from "@/components/Header";
import AuthCheck from "@/components/AuthCheck";

export const metadata: Metadata = {
  title: "HypertrophyPro - Intelligent Workout Tracking",
  description: "Track your hypertrophy workouts with intelligent periodization and progress tracking",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
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
      </body>
    </html>
  );
}
