'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/hooks/useAuth';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const [redirecting, setRedirecting] = useState(false);
  const router = useRouter();

  // Debug state - remove in production
  useEffect(() => {
    console.log("ProtectedRoute state:", {
      user: user ? `User: ${user.uid.substring(0, 6)}...` : "No user",
      loading,
      redirecting,
      timestamp: new Date().toISOString()
    });
  }, [user, loading, redirecting]);

  // Handle authentication redirect
  useEffect(() => {
    if (!loading && !user && !redirecting) {
      console.log("Protected route: redirecting to login (no user)");
      setRedirecting(true);
      
      // Add a small delay before redirecting to avoid infinite loops
      const redirectTimeout = setTimeout(() => {
        router.push('/login');
      }, 100);
      
      return () => clearTimeout(redirectTimeout);
    }
  }, [user, loading, router, redirecting]);

  // Show loading state while checking
  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="flex flex-col items-center">
          <div className="w-16 h-16 rounded-full bg-neon-green/20 flex items-center justify-center mb-4 animate-pulse">
            <svg 
              className="w-8 h-8 text-neon-green" 
              xmlns="http://www.w3.org/2000/svg" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2"
            >
              <path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83"/>
            </svg>
          </div>
          <p className="text-gray-400 mb-2">Verifying authentication...</p>
          <div className="h-1 w-40 bg-gray-800 rounded-full overflow-hidden">
            <div className="h-full bg-neon-green animate-progressBar"></div>
          </div>
        </div>
      </div>
    );
  }
  
  // If redirecting to login, show a different loading state
  if (redirecting) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="flex flex-col items-center">
          <div className="w-16 h-16 rounded-full bg-neon-green/20 flex items-center justify-center mb-4 animate-pulse">
            <svg 
              className="w-8 h-8 text-neon-green" 
              xmlns="http://www.w3.org/2000/svg" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2"
            >
              <path d="M9 11l-4 4l-4-4m4 4V3m6 18h10M6 15h2v-2"></path>
            </svg>
          </div>
          <p className="text-gray-400 mb-2">Redirecting to login...</p>
          <div className="h-1 w-40 bg-gray-800 rounded-full overflow-hidden mb-6">
            <div className="h-full bg-neon-green animate-progressBar"></div>
          </div>
        </div>
      </div>
    );
  }

  // Allow access if user is authenticated
  if (user) {
    return <>{children}</>;
  }

  // Don't render anything while redirecting
  return null;
}