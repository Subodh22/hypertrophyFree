'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/hooks/useAuth';
import { Dumbbell, ArrowRight, User } from 'lucide-react';
import Link from 'next/link';

export default function HomePage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  // Redirect to dashboard if user is logged in
  useEffect(() => {
    if (!loading && user) {
      router.push('/dashboard');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-pulse flex flex-col items-center">
          <div className="w-16 h-16 rounded-full bg-neon-green/20 flex items-center justify-center mb-4">
            <Dumbbell className="w-8 h-8 text-neon-green" />
          </div>
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] px-4 text-center">
      <div className="w-24 h-24 rounded-full bg-neon-green/20 flex items-center justify-center mb-6">
        <Dumbbell className="w-12 h-12 text-neon-green" />
      </div>
      
      <h1 className="text-4xl md:text-5xl font-bold mb-4">
        <span className="text-neon-green">Hypertrophy</span>Pro
      </h1>
      
      <p className="text-xl text-gray-300 max-w-2xl mb-8">
        Your intelligent workout companion for optimal muscle growth and strength.
      </p>
      
      <p className="text-gray-400 max-w-2xl mb-12">
        Track your workouts, monitor your progress, and optimize your training with smart analytics and personalized recommendations.
      </p>
      
      <div className="mt-8 flex flex-col sm:flex-row gap-4">
        <Link 
          href="/login" 
          className="btn-primary py-3 px-8"
        >
          Get Started
        </Link>
        <Link 
          href="/profile" 
          className="btn-secondary py-3 px-8 flex items-center justify-center gap-2"
        >
          <User className="w-5 h-5" />
          Visit Profile
        </Link>
      </div>
      
      <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl">
        <div className="card p-6">
          <h3 className="text-lg font-bold mb-3 text-neon-green">Track Workouts</h3>
          <p className="text-gray-400 text-sm">
            Log your exercises, sets, reps, and weights with an intuitive interface designed for the gym.
          </p>
        </div>
        
        <div className="card p-6">
          <h3 className="text-lg font-bold mb-3 text-neon-green">Monitor Progress</h3>
          <p className="text-gray-400 text-sm">
            Visualize your improvements over time with detailed analytics and performance metrics.
          </p>
        </div>
        
        <div className="card p-6">
          <h3 className="text-lg font-bold mb-3 text-neon-green">Optimize Training</h3>
          <p className="text-gray-400 text-sm">
            Get personalized recommendations based on your performance and recovery patterns.
          </p>
        </div>
      </div>
    </div>
  );
}
