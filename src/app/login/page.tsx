'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/hooks/useAuth';
import Link from 'next/link';
import { Dumbbell } from 'lucide-react';

// This component uses searchParams which needs to be wrapped in Suspense
function LoginContent() {
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [redirectPending, setRedirectPending] = useState(false);
  
  const { user, loading, signInWithGoogle, signInWithGoogleRedirect, isPwa, isMobilePwa } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  // Fix the redirect parameter handling to properly decode the URL
  const returnUrl = searchParams.get('returnUrl') || searchParams.get('redirect');
  const redirectPath = returnUrl ? decodeURIComponent(returnUrl) : '/dashboard';
  
  // Check if we were in the middle of an auth redirect (especially for mobile PWA)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const pending = localStorage.getItem('authRedirectPending') === 'true';
      const redirectTime = localStorage.getItem('authRedirectTime');
      
      // If there was a pending redirect less than 10 minutes ago, show the user we're checking
      if (pending && redirectTime) {
        const elapsed = Date.now() - parseInt(redirectTime, 10);
        if (elapsed < 10 * 60 * 1000) { // 10 minutes
          setRedirectPending(true);
          console.log('Returning from auth redirect, checking authentication status...');
          
          // For mobile PWA, check if we have the return URL stored
          const storedReturnUrl = localStorage.getItem('authReturnUrl');
          if (isMobilePwa && storedReturnUrl && storedReturnUrl !== window.location.href) {
            console.log('Found stored return URL:', storedReturnUrl);
            
            // If we're on the login page after a redirect, wait a moment for auth to complete
            setTimeout(() => {
              // If we have a user by now, navigate to the dashboard
              if (user) {
                router.push('/dashboard');
              } 
              // If no user after 1.5 seconds, try to get the redirect result again
              else {
                console.log('No user after redirect, attempting to recover session...');
                // Force another check of authentication state
                setRedirectPending(false);
              }
            }, 1500);
          }
        } else {
          // Clear old pending redirect flags
          localStorage.removeItem('authRedirectPending');
          localStorage.removeItem('authRedirectTime');
          localStorage.removeItem('authReturnUrl');
        }
      }
    }
  }, [isMobilePwa, user, router]);
  
  // Redirect if already logged in
  useEffect(() => {
    if (!loading && user) {
      console.log("User is logged in, redirecting to", redirectPath);
      setIsRedirecting(true);
      
      // Clean up redirect flags
      if (typeof window !== 'undefined') {
        localStorage.removeItem('authRedirectPending');
        localStorage.removeItem('authRedirectTime');
        localStorage.removeItem('authReturnUrl');
      }
      
      // Add a small delay to ensure state updates before navigation
      setTimeout(() => {
        router.push(redirectPath);
      }, 100);
    } else if (!loading && redirectPending) {
      // If we were pending a redirect but now we know we're not logged in
      setRedirectPending(false);
      setError("Authentication failed after redirect. Please try again.");
      
      // Clean up failed redirect
      if (typeof window !== 'undefined') {
        localStorage.removeItem('authRedirectPending');
        localStorage.removeItem('authRedirectTime');
        localStorage.removeItem('authReturnUrl');
      }
    }
  }, [loading, user, router, redirectPath, redirectPending]);
  
  const handleGoogleSignIn = async () => {
    setError(null);
    setIsLoading(true);
    
    try {
      // Use the appropriate sign-in method based on whether we're in PWA mode
      if (isPwa) {
        console.log(`Using redirect sign-in method for ${isMobilePwa ? 'mobile' : 'desktop'} PWA`);
        await signInWithGoogleRedirect();
        // The page will redirect, no need to handle success here
      } else {
        console.log("Using popup sign-in method for browser");
        await signInWithGoogle();
        console.log("Google sign-in successful");
        // The redirect will happen automatically due to the useEffect above
      }
    } catch (error: any) {
      console.error("Error during sign in:", error);
      setError("Failed to sign in with Google. Please try again.");
      setIsLoading(false);
    }
  };
  
  // For mobile users encountering issues, provide a direct popup option
  const handleDirectPopupLogin = async () => {
    setError(null);
    setIsLoading(true);
    
    try {
      console.log("Using direct popup sign-in method for mobile");
      await signInWithGoogle();
      console.log("Google sign-in successful");
      // The redirect will happen automatically due to the useEffect above
    } catch (error: any) {
      console.error("Error during direct sign in:", error);
      setError("Failed to sign in with Google. Please try again with the standard login button.");
      setIsLoading(false);
    }
  };
  
  // Loading state
  if (loading || isRedirecting || redirectPending) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse flex flex-col items-center">
          <div className="w-12 h-12 rounded-full bg-neon-green/20 flex items-center justify-center mb-4">
            <Dumbbell className="w-6 h-6 text-neon-green" />
          </div>
          <p className="text-gray-400">
            {isRedirecting 
              ? 'Redirecting you...' 
              : redirectPending 
                ? 'Checking your sign-in status...'
                : 'Loading...'}
          </p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md flex flex-col items-center">
        <div className="w-24 h-24 rounded-full bg-neon-green/20 flex items-center justify-center mb-6">
          <Dumbbell className="w-12 h-12 text-neon-green" />
        </div>
        
        <h1 className="text-4xl font-bold mb-4">
          <span className="text-neon-green">Hypertrophy</span>Pro
        </h1>
        
        <p className="text-xl text-gray-300 max-w-md text-center mb-6">
          Track your workouts, optimize your progress
        </p>
        
        <p className="text-md text-gray-400 max-w-md text-center mb-8">
          Sign in with Google to start tracking your workouts and creating mesocycles.
        </p>
        
        {error && (
          <div className="w-full bg-red-500/10 border border-red-500/30 rounded-lg p-3 mb-6">
            <p className="text-red-200 text-sm text-center">{error}</p>
          </div>
        )}
        
        <button
          onClick={handleGoogleSignIn}
          disabled={isLoading}
          className="w-full bg-white text-black py-3 px-4 rounded-lg font-medium flex items-center justify-center gap-3 hover:bg-gray-100 transition-colors mb-6"
        >
          <svg viewBox="0 0 24 24" width="20" height="20">
            <g transform="matrix(1, 0, 0, 1, 27.009001, -39.238998)">
              <path fill="#4285F4" d="M -3.264 51.509 C -3.264 50.719 -3.334 49.969 -3.454 49.239 L -14.754 49.239 L -14.754 53.749 L -8.284 53.749 C -8.574 55.229 -9.424 56.479 -10.684 57.329 L -10.684 60.329 L -6.824 60.329 C -4.564 58.239 -3.264 55.159 -3.264 51.509 Z"></path>
              <path fill="#34A853" d="M -14.754 63.239 C -11.514 63.239 -8.804 62.159 -6.824 60.329 L -10.684 57.329 C -11.764 58.049 -13.134 58.489 -14.754 58.489 C -17.884 58.489 -20.534 56.379 -21.484 53.529 L -25.464 53.529 L -25.464 56.619 C -23.494 60.539 -19.444 63.239 -14.754 63.239 Z"></path>
              <path fill="#FBBC05" d="M -21.484 53.529 C -21.734 52.809 -21.864 52.039 -21.864 51.239 C -21.864 50.439 -21.724 49.669 -21.484 48.949 L -21.484 45.859 L -25.464 45.859 C -26.284 47.479 -26.754 49.299 -26.754 51.239 C -26.754 53.179 -26.284 54.999 -25.464 56.619 L -21.484 53.529 Z"></path>
              <path fill="#EA4335" d="M -14.754 43.989 C -12.984 43.989 -11.404 44.599 -10.154 45.789 L -6.734 42.369 C -8.804 40.429 -11.514 39.239 -14.754 39.239 C -19.444 39.239 -23.494 41.939 -25.464 45.859 L -21.484 48.949 C -20.534 46.099 -17.884 43.989 -14.754 43.989 Z"></path>
            </g>
          </svg>
          {isLoading ? 'Signing in...' : 'Sign in with Google'}
        </button>

        {isPwa && isMobilePwa && (
          <>
            <div className="w-full bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 mb-6">
              <p className="text-blue-200 text-sm text-center">
                You&apos;re using the mobile app. We&apos;ll try to keep you in the app during sign-in.
                If you&apos;re redirected to Gmail, please complete the verification and return to this app.
              </p>
              <p className="text-blue-200 text-sm mt-2 text-center">
                <strong>Tip:</strong> After clicking &quot;Yes, it&apos;s me&quot; in Gmail, look for a 
                &quot;Back to app&quot; or browser back button to return here.
              </p>
            </div>
            
            <div className="w-full my-4 text-center">
              <p className="text-xs text-gray-400 mb-2">Having trouble logging in?</p>
              <button
                onClick={handleDirectPopupLogin}
                disabled={isLoading}
                className="bg-transparent border border-neon-green text-neon-green py-2 px-4 rounded-md text-sm hover:bg-neon-green/10 transition-colors"
              >
                Try Direct Login
              </button>
              <p className="text-xs text-gray-500 mt-2">
                This alternative method may work better on some mobile devices.
              </p>
            </div>
          </>
        )}
        
        {isPwa && !isMobilePwa && (
          <p className="text-xs text-gray-400 mb-6 text-center">
            You&apos;re using the app in desktop PWA mode.
          </p>
        )}
        
        <div className="w-full border-t border-gray-800 pt-6 mt-2 text-center">
          <p className="text-sm text-gray-400">
            By signing in, you agree to our <a href="#" className="text-neon-green hover:underline">Terms of Service</a> and <a href="#" className="text-neon-green hover:underline">Privacy Policy</a>
          </p>
        </div>
      </div>
    </div>
  );
}

// Main component that wraps the content in a Suspense boundary
export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-pulse flex flex-col items-center">
            <div className="w-12 h-12 rounded-full bg-neon-green/20 flex items-center justify-center mb-4">
              <Dumbbell className="w-6 h-6 text-neon-green" />
            </div>
            <p className="text-gray-400">Loading...</p>
          </div>
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
} 