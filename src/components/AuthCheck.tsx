'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/lib/hooks/useAuth';
import LoadingScreen from './LoadingScreen';
import Cookies from 'js-cookie';

interface AuthCheckProps {
  children: React.ReactNode;
  publicRoutes?: string[];
}

export default function AuthCheck({ 
  children, 
  publicRoutes = ['/login', '/register', '/']
}: AuthCheckProps) {
  const { user, loading } = useAuth();
  const [isGuest, setIsGuest] = useState<boolean>(false);
  const [isCheckingAuthState, setIsCheckingAuthState] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  const isPublicRoute = publicRoutes.includes(pathname);

  // Immediately check localStorage for better performance
  useEffect(() => {
    // Quick client-side check
    const localGuestMode = localStorage.getItem('guestMode') === 'true';
    if (localGuestMode) {
      console.log("Guest mode found in localStorage");
      setIsGuest(true);
      // Quick update for state
      setIsCheckingAuthState(false);
    }
  }, []);
  
  // More thorough check for guest mode in cookies and localStorage
  useEffect(() => {
    // More comprehensive check
    const checkGuestMode = () => {
      const guestModeCookie = Cookies.get('guestMode');
      const guestModeLocal = localStorage.getItem('guestMode');
      
      console.log("Detailed guest mode check:", { 
        cookie: guestModeCookie,
        localStorage: guestModeLocal,
        headers: document.cookie
      });
      
      if (guestModeCookie === 'true' || guestModeLocal === 'true') {
        console.log("Setting guest mode to true");
        setIsGuest(true);
        
        // Make sure both cookie and localStorage are in sync
        if (!guestModeCookie) {
          console.log("Setting guestMode cookie");
          Cookies.set('guestMode', 'true', { 
            expires: 7, 
            path: '/',
            sameSite: 'strict',
            secure: window.location.protocol === 'https:'
          });
        }
        if (!guestModeLocal) {
          console.log("Setting guestMode localStorage");
          localStorage.setItem('guestMode', 'true');
        }
      }
    };
    
    // Perform the check
    checkGuestMode();
    
    // Listen for storage events from other tabs/windows
    const handleStorageChange = () => {
      console.log("Storage event detected, rechecking guest mode");
      checkGuestMode();
    };
    
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);
  
  // Reset the checkingAuthState once Firebase auth is done loading
  useEffect(() => {
    // Skip the additional delay if already in guest mode
    if (isGuest) {
      setIsCheckingAuthState(false);
      return;
    }
    
    if (!loading) {
      // Shorter delay since we've already done some checks
      const timer = setTimeout(() => {
        setIsCheckingAuthState(false);
        console.log("Auth check complete:", { 
          user: user ? "logged in" : "not logged in", 
          guestMode: isGuest,
          publicRoute: isPublicRoute,
          path: pathname
        });
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, [loading, user, isPublicRoute, pathname, isGuest]);
  
  // Handle redirection based on auth state
  useEffect(() => {
    // Only redirect after we've checked auth state and if not on a public route
    if (!isCheckingAuthState && !isPublicRoute) {
      if (!user && !isGuest) {
        console.log("Redirecting to login from", pathname);
        router.push(`/login?redirect=${encodeURIComponent(pathname)}`);
      }
    }
  }, [user, isGuest, isCheckingAuthState, isPublicRoute, pathname, router]);
  
  // Early exit - if we're on a public route, just render children
  if (isPublicRoute) {
    return <>{children}</>;
  }
  
  // Early exit - if we're in guest mode, just render children
  if (isGuest) {
    return <>{children}</>;
  }
  
  // Only show loading during the initial auth check 
  if (loading || isCheckingAuthState) {
    return <LoadingScreen message="Loading your profile..." />;
  }
  
  // If we're here, the user must be authenticated
  if (user) {
    return <>{children}</>;
  }
  
  // Fallback - don't render until we redirect
  return <LoadingScreen message="Preparing your experience..." />;
} 