'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/hooks/useAuth';
import Cookies from 'js-cookie';
import LoadingScreen from '@/components/LoadingScreen';

export default function ProfileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isGuest, setIsGuest] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { user, loading } = useAuth();
  const router = useRouter();
  
  console.log("ProfileLayout rendering, auth state:", { loading, user: !!user });
  
  useEffect(() => {
    // Check for guest mode
    const guestMode = Cookies.get('guestMode') === 'true' || 
                     localStorage.getItem('guestMode') === 'true';
    
    console.log("ProfileLayout guest mode check:", guestMode);
    setIsGuest(guestMode);
    
    // Wait for auth to complete before deciding what to do
    if (!loading) {
      if (!user && !guestMode) {
        console.log("ProfileLayout: redirecting to login, no user and not guest");
        router.push('/login');
      } else {
        console.log("ProfileLayout: allowing access, user or guest mode");
        setIsLoading(false);
      }
    }
  }, [loading, user, router]);
  
  // Show loading screen while checking auth status
  if (loading || isLoading) {
    return <LoadingScreen message="Loading profile access..." />;
  }
  
  // User is either authenticated or in guest mode, render the page
  return <>{children}</>;
} 