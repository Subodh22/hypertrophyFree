"use client";

import { createContext, useContext, useEffect, useState } from 'react';
import { 
  User, 
  onAuthStateChanged, 
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
  inMemoryPersistence
} from 'firebase/auth';
import { auth } from '../firebase/firebase';
import Cookies from 'js-cookie';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: Error | null;
  signInWithGoogle: () => Promise<void>;
  signInWithGoogleRedirect: () => Promise<void>;
  signOut: () => Promise<void>;
  isPwa: boolean;
  isMobilePwa: boolean;
}

// Check if running in PWA mode
const isPwa = () => {
  if (typeof window !== 'undefined') {
    return window.matchMedia('(display-mode: standalone)').matches || 
           window.matchMedia('(display-mode: fullscreen)').matches ||
           (window.navigator as any).standalone === true;
  }
  return false;
};

// Check if mobile device
const isMobile = () => {
  if (typeof window !== 'undefined') {
    // Check for mobile user agent
    const mobileUserAgent = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      window.navigator.userAgent
    );
    
    // Check for mobile screen size (under 768px width is typically mobile)
    const mobileScreenSize = window.innerWidth < 768;
    
    // Check for touch support (most mobile devices support touch)
    const touchSupport = 'ontouchstart' in window || 
                         navigator.maxTouchPoints > 0 ||
                         (navigator as any).msMaxTouchPoints > 0;
    
    // Return true if any two of these conditions are met
    // This improves reliability of detection
    let mobileIndicators = 0;
    if (mobileUserAgent) mobileIndicators++;
    if (mobileScreenSize) mobileIndicators++;
    if (touchSupport) mobileIndicators++;
    
    return mobileIndicators >= 2;
  }
  return false;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  error: null,
  signInWithGoogle: async () => {},
  signInWithGoogleRedirect: async () => {},
  signOut: async () => {},
  isPwa: false,
  isMobilePwa: false
});

export function AuthProvider({ 
  children 
}: { 
  children: React.ReactNode 
}) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [pwaMode] = useState(isPwa());
  const [mobileDevice] = useState(isMobile());
  const isMobilePwaState = pwaMode && mobileDevice;

  // Set appropriate persistence based on the environment
  useEffect(() => {
    const setupPersistence = async () => {
      try {
        // Always use local persistence for PWAs
        if (pwaMode) {
          await setPersistence(auth, browserLocalPersistence);
          console.log('Using browserLocalPersistence for PWA');
        } else {
          // For regular browser, use session persistence
          await setPersistence(auth, browserSessionPersistence);
          console.log('Using browserSessionPersistence for browser');
        }
      } catch (error) {
        console.error('Error setting auth persistence:', error);
      }
    };

    setupPersistence();
  }, [pwaMode]);

  // Check for redirect result when the app starts (especially important for PWA)
  useEffect(() => {
    const handleRedirectResult = async () => {
      try {
        console.log('Checking for redirect result...');
        const result = await getRedirectResult(auth);
        
        // Check for a pending auth redirect first
        const pending = typeof window !== 'undefined' && 
          localStorage.getItem('authRedirectPending') === 'true';
          
        if (result && result.user) {
          console.log('Successfully signed in after redirect:', result.user.email);
          
          // For any kind of PWA, we need to explicitly set the user and token
          // because onAuthStateChanged might not get triggered right away
          if (pwaMode) {
            setUser(result.user);
            
            // Set cookies for server-side auth
            try {
              const token = await result.user.getIdToken();
              
              // Set cookie for server middleware with extended expiry
              Cookies.set('firebaseToken', token, { 
                expires: 30, // 30 days
                path: '/',
                sameSite: 'lax'
              });
              
              // For Firebase Admin verification on server
              Cookies.set('__session', token, { 
                expires: 30, 
                path: '/',
                sameSite: 'lax'
              });
              
              // Also store in localStorage for backup retrieval
              if (typeof window !== 'undefined') {
                localStorage.setItem('authUserEmail', result.user.email || '');
                localStorage.setItem('authUserUid', result.user.uid || '');
                
                // Check if we have a stored return URL and navigate to it
                const returnUrl = localStorage.getItem('authReturnUrl');
                if (returnUrl && typeof window !== 'undefined') {
                  console.log('Redirecting to stored return URL:', returnUrl);
                  window.location.href = returnUrl;
                }
              }
              
              setLoading(false);
              
              // Clear pending flags since we've successfully authenticated
              if (typeof window !== 'undefined') {
                localStorage.removeItem('authRedirectPending');
                localStorage.removeItem('authRedirectTime');
                // Keep authReturnUrl for navigation after redirect
              }
            } catch (tokenError) {
              console.error('Error setting auth cookies after redirect:', tokenError);
            }
          }
        } else if (pending) {
          console.log('No redirect result found but redirect was pending...');
          
          // For mobile PWAs, check if we have cached user info that we can use
          // until Firebase auth state catches up
          if (isMobilePwaState && !user && typeof window !== 'undefined') {
            const cachedEmail = localStorage.getItem('authUserEmail');
            const cachedUid = localStorage.getItem('authUserUid');
            
            if (cachedEmail && cachedUid) {
              console.log('Using cached authentication data while waiting for redirect result');
              
              // We don't have a user object, but we can use the cached info
              // to know that a user exists and avoid immediate redirects
              
              // Retry getting the redirect result after a small delay
              setTimeout(() => {
                console.log('Retrying redirect result...');
                handleRedirectResult();
              }, 1000);
            } else {
              console.log('No cached auth data found, likely not authenticated');
            }
          } else {
            console.log('Not in mobile PWA or already have user, pending redirect may be stale');
          }
        } else {
          console.log('No redirect result or pending redirect found');
        }
      } catch (error) {
        console.error('Error with redirect sign-in:', error);
        setError(error instanceof Error ? error : new Error('Authentication failed after redirect'));
        
        // Clear pending flags on error
        if (typeof window !== 'undefined') {
          localStorage.removeItem('authRedirectPending');
          localStorage.removeItem('authRedirectTime');
          // Keep authReturnUrl for potential retry
        }
      }
    };

    handleRedirectResult();
  }, [isMobilePwaState, user, pwaMode]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      async (user) => {
        if (user) {
          try {
            // Set user state
            setUser(user);
            
            // Get token and set cookies for server-side auth
            const token = await user.getIdToken();
            
            // Set cookie for server middleware
            Cookies.set('firebaseToken', token, { 
              expires: 30, 
              path: '/',
              sameSite: 'lax'
            });
            
            // For Firebase Admin verification on server 
            Cookies.set('__session', token, { 
              expires: 30, 
              path: '/',
              sameSite: 'lax'
            });
            
            // Also store basic info in localStorage for PWA recovery
            if (typeof window !== 'undefined') {
              localStorage.setItem('authUserEmail', user.email || '');
              localStorage.setItem('authUserUid', user.uid || '');
            }
            
            console.log('Auth state change: User signed in');
          } catch (error) {
            console.error('Error setting authentication cookies:', error);
            setError(error instanceof Error ? error : new Error('Authentication error'));
          }
        } else {
          // User is signed out
          setUser(null);
          
          // Clear auth cookies
          Cookies.remove('firebaseToken', { path: '/' });
          Cookies.remove('__session', { path: '/' });
          
          // Clear localStorage auth data
          if (typeof window !== 'undefined') {
            localStorage.removeItem('authUserEmail');
            localStorage.removeItem('authUserUid');
          }
          
          console.log('Auth state change: User signed out');
        }
        setLoading(false);
      },
      (error) => {
        console.error('Auth state change error:', error);
        setError(error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    setLoading(true);
    try {
      setError(null);
      const provider = new GoogleAuthProvider();
      // Add login hint to reduce the need for user to select account
      provider.setCustomParameters({
        prompt: 'select_account'
      });
      await signInWithPopup(auth, provider);
      // Note: The onAuthStateChanged listener will handle setting the user and cookies
    } catch (error) {
      console.error('Error signing in with Google:', error);
      setError(error instanceof Error ? error : new Error('Failed to sign in'));
      setLoading(false);
    }
  };

  const signInWithGoogleRedirect = async () => {
    try {
      setError(null);
      const provider = new GoogleAuthProvider();
      
      // For mobile PWAs, we need a completely different approach
      if (isMobilePwaState && typeof window !== 'undefined') {
        console.log('Using mobile PWA direct authentication approach');
        
        // Create a popup window for authentication
        // This is a different approach that keeps the user in the same context
        try {
          const result = await signInWithPopup(auth, provider);
          if (result && result.user) {
            console.log('Successfully signed in with popup in PWA context');
            setUser(result.user);
            
            // Get token and set cookies and localStorage
            try {
              const token = await result.user.getIdToken();
              Cookies.set('firebaseToken', token, { expires: 30, path: '/', sameSite: 'lax' });
              Cookies.set('__session', token, { expires: 30, path: '/', sameSite: 'lax' });
              
              localStorage.setItem('authUserEmail', result.user.email || '');
              localStorage.setItem('authUserUid', result.user.uid || '');
              
              setLoading(false);
            } catch (tokenError) {
              console.error('Error setting auth data after popup:', tokenError);
            }
          }
        } catch (popupError) {
          console.error('Error with popup sign-in, falling back to redirect:', popupError);
          
          // If popup fails (which it might on some browsers), fall back to redirect
          // with extra information to help with return navigation
          localStorage.setItem('authRedirectPending', 'true');
          localStorage.setItem('authRedirectTime', Date.now().toString());
          
          // Store the current URL to return to after authentication
          const currentUrl = window.location.href;
          localStorage.setItem('authReturnUrl', currentUrl);
          
          // Try to open the auth page in the system browser instead
          // This creates a more native experience for returning
          try {
            const currentUrl = window.location.href;
            localStorage.setItem('authReturnUrl', currentUrl);
            
            // Create a simple redirect URL that will be handled by the system browser
            provider.setCustomParameters({
              prompt: 'select_account',
              auth_type: 'rerequest',
              access_type: 'offline'
            });
            
            // Use regular redirect as a fallback
            await signInWithRedirect(auth, provider);
          } catch (redirectError) {
            console.error('Error initiating fallback redirect:', redirectError);
            setError(redirectError instanceof Error ? redirectError : new Error('Failed to initiate sign in'));
          }
        }
      } else {
        // For desktop or browser, use standard approach
        provider.setCustomParameters({
          prompt: 'select_account'
        });
        
        // For desktop PWAs or regular browsers
        await signInWithRedirect(auth, provider);
      }
    } catch (error) {
      console.error('Error initiating Google sign in:', error);
      setError(error instanceof Error ? error : new Error('Failed to initiate sign in'));
    }
  };

  const signOut = async () => {
    try {
      // Clear localStorage auth data before signing out
      if (typeof window !== 'undefined') {
        localStorage.removeItem('authUserEmail');
        localStorage.removeItem('authUserUid');
        localStorage.removeItem('authRedirectPending');
        localStorage.removeItem('authRedirectTime');
        localStorage.removeItem('authReturnUrl');
      }
      
      await firebaseSignOut(auth);
      // Note: The onAuthStateChanged listener will handle removing the user and cookies
    } catch (error) {
      console.error('Error signing out:', error);
      setError(error instanceof Error ? error : new Error('Failed to sign out'));
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        error,
        signInWithGoogle,
        signInWithGoogleRedirect,
        signOut,
        isPwa: pwaMode,
        isMobilePwa: isMobilePwaState
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuthContext = () => useContext(AuthContext);
