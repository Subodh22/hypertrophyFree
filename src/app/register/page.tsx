'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/hooks/useAuth';
import Link from 'next/link';
import { Dumbbell, Mail, Lock, User, AlertCircle } from 'lucide-react';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { auth } from '@/lib/firebase/firebase';
import { addDocument } from '@/lib/firebase/firebaseUtils';

export default function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [redirectPending, setRedirectPending] = useState(false);
  
  const { user, loading, signInWithGoogle, signInWithGoogleRedirect, isPwa, isMobilePwa } = useAuth();
  const router = useRouter();
  
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
        } else {
          // Clear old pending redirect flags
          localStorage.removeItem('authRedirectPending');
          localStorage.removeItem('authRedirectTime');
        }
      }
    }
  }, []);
  
  // Redirect if already logged in
  useEffect(() => {
    if (!loading && user) {
      // Clean up redirect flags
      if (typeof window !== 'undefined') {
        localStorage.removeItem('authRedirectPending');
        localStorage.removeItem('authRedirectTime');
        localStorage.removeItem('authReturnUrl');
      }
      
      router.push('/dashboard');
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
  }, [loading, user, router, redirectPending]);
  
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    // Validate password match
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    
    // Validate password strength
    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Create the user
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      // Update the user profile with the name
      await updateProfile(userCredential.user, {
        displayName: name
      });
      
      // Create a user document in Firestore
      await addDocument('users', {
        uid: userCredential.user.uid,
        displayName: name,
        email: userCredential.user.email,
        createdAt: new Date().toISOString(),
        preferences: {
          theme: 'dark',
          defaultRIR: 2,
          measurementUnit: 'imperial',
          defaultRestTime: 90,
          showTips: true,
        },
        stats: {
          fitnessGoal: 'muscle_gain',
          experienceLevel: 'intermediate',
        }
      });
      
      // Redirect will happen automatically due to useEffect
    } catch (error: any) {
      let errorMessage = 'Failed to create account.';
      
      // Handle specific Firebase error codes
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'Email is already in use by another account.';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Email address is not valid.';
      } else if (error.code === 'auth/weak-password') {
        errorMessage = 'Password is too weak. Use at least 6 characters.';
      }
      
      setError(errorMessage);
      setIsLoading(false);
    }
  };
  
  const handleGoogleSignUp = async () => {
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
        // The redirect will happen automatically due to the useEffect above
      }
    } catch (error: any) {
      console.error("Error during sign in:", error);
      setError("Failed to sign in with Google. Please try again.");
      setIsLoading(false);
    }
  };
  
  if (loading || user || redirectPending) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse flex flex-col items-center">
          <div className="w-12 h-12 rounded-full bg-neon-green/20 flex items-center justify-center mb-4">
            <Dumbbell className="w-6 h-6 text-neon-green" />
          </div>
          <p className="text-gray-400">
            {user ? 'Redirecting to dashboard...' : 
             redirectPending ? 'Checking your sign-in status...' : 
             'Loading...'}
          </p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-full bg-neon-green/20 flex items-center justify-center mb-4">
            <Dumbbell className="w-8 h-8 text-neon-green" />
          </div>
          <h1 className="text-3xl font-bold mb-2">
            <span className="text-neon-green">Hypertrophy</span>Pro
          </h1>
          <p className="text-gray-400 text-center">
            Create an account to start tracking your fitness journey
          </p>
        </div>
        
        {error && (
          <div className="bg-red-950/50 border border-red-500/50 rounded-lg p-3 mb-6 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <p className="text-red-200 text-sm">{error}</p>
          </div>
        )}
        
        <form onSubmit={handleRegister} className="card p-6 mb-4">
          <h2 className="text-xl font-bold mb-6">Create Your Account</h2>
          
          <div className="space-y-4 mb-6">
            <div>
              <label className="text-sm text-gray-400 block mb-1" htmlFor="name">
                Full Name
              </label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                  <User className="w-5 h-5" />
                </div>
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="input-field pl-10 w-full"
                  placeholder="John Doe"
                  required
                />
              </div>
            </div>
            
            <div>
              <label className="text-sm text-gray-400 block mb-1" htmlFor="email">
                Email
              </label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                  <Mail className="w-5 h-5" />
                </div>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input-field pl-10 w-full"
                  placeholder="your.email@example.com"
                  required
                />
              </div>
            </div>
            
            <div>
              <label className="text-sm text-gray-400 block mb-1" htmlFor="password">
                Password
              </label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                  <Lock className="w-5 h-5" />
                </div>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-field pl-10 w-full"
                  placeholder="••••••••"
                  required
                  minLength={6}
                />
              </div>
              <p className="text-xs text-gray-400 mt-1">
                Password must be at least 6 characters long
              </p>
            </div>
            
            <div>
              <label className="text-sm text-gray-400 block mb-1" htmlFor="confirm-password">
                Confirm Password
              </label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                  <Lock className="w-5 h-5" />
                </div>
                <input
                  id="confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="input-field pl-10 w-full"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>
          </div>
          
          <button
            type="submit"
            className="btn-primary w-full flex items-center justify-center"
            disabled={isLoading}
          >
            {isLoading ? 'Creating Account...' : 'Sign Up'}
          </button>
        </form>
        
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-neon-green/20"></div>
          </div>
          <div className="relative flex justify-center">
            <span className="bg-background px-4 text-sm text-gray-400">or sign up with</span>
          </div>
        </div>
        
        <button
          onClick={handleGoogleSignUp}
          className="w-full btn-secondary flex items-center justify-center gap-3 mb-6"
          disabled={isLoading}
        >
          <svg viewBox="0 0 24 24" width="20" height="20">
            <g transform="matrix(1, 0, 0, 1, 27.009001, -39.238998)">
              <path fill="#4285F4" d="M -3.264 51.509 C -3.264 50.719 -3.334 49.969 -3.454 49.239 L -14.754 49.239 L -14.754 53.749 L -8.284 53.749 C -8.574 55.229 -9.424 56.479 -10.684 57.329 L -10.684 60.329 L -6.824 60.329 C -4.564 58.239 -3.264 55.159 -3.264 51.509 Z"></path>
              <path fill="#34A853" d="M -14.754 63.239 C -11.514 63.239 -8.804 62.159 -6.824 60.329 L -10.684 57.329 C -11.764 58.049 -13.134 58.489 -14.754 58.489 C -17.884 58.489 -20.534 56.379 -21.484 53.529 L -25.464 53.529 L -25.464 56.619 C -23.494 60.539 -19.444 63.239 -14.754 63.239 Z"></path>
              <path fill="#FBBC05" d="M -21.484 53.529 C -21.734 52.809 -21.864 52.039 -21.864 51.239 C -21.864 50.439 -21.724 49.669 -21.484 48.949 L -21.484 45.859 L -25.464 45.859 C -26.284 47.479 -26.754 49.299 -26.754 51.239 C -26.754 53.179 -26.284 54.999 -25.464 56.619 L -21.484 53.529 Z"></path>
              <path fill="#EA4335" d="M -14.754 43.989 C -12.984 43.989 -11.404 44.599 -10.154 45.789 L -6.734 42.369 C -8.804 40.429 -11.514 39.239 -14.754 39.239 C -19.444 39.239 -23.494 41.939 -25.464 45.859 L -21.484 48.949 C -20.534 46.099 -17.884 43.989 -14.754 43.989 Z"></path>
            </g>
          </svg>
          {isLoading ? 'Signing up...' : 'Sign up with Google'}
        </button>
        
        {isPwa && (
          <p className="text-xs text-gray-400 mb-6 text-center">
            You&apos;re using the app in {isMobilePwa ? 'mobile' : 'desktop'} PWA mode. 
            {isMobilePwa ? ' When redirected to Google login, please complete the sign-in and return to this app.' : ''}
          </p>
        )}
        
        <p className="text-center text-gray-400 text-sm">
          Already have an account?{' '}
          <Link href="/login" className="text-neon-green hover:underline">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
} 