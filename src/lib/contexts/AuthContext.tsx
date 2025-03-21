"use client";

import { createContext, useContext, useEffect, useState } from 'react';
import { 
  User, 
  onAuthStateChanged, 
  signInWithPopup, 
  signOut as firebaseSignOut, 
  GoogleAuthProvider 
} from 'firebase/auth';
import { auth } from '../firebase/firebase';
import Cookies from 'js-cookie';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: Error | null;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  error: null,
  signInWithGoogle: async () => {},
  signOut: async () => {},
});

export function AuthProvider({ 
  children 
}: { 
  children: React.ReactNode 
}) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

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
      await signInWithPopup(auth, provider);
      // Note: The onAuthStateChanged listener will handle setting the user and cookies
    } catch (error) {
      console.error('Error signing in with Google:', error);
      setError(error instanceof Error ? error : new Error('Failed to sign in'));
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
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
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuthContext = () => useContext(AuthContext);
