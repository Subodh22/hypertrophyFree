'use client';

import { Dumbbell } from 'lucide-react';

interface LoadingScreenProps {
  message?: string;
}

export default function LoadingScreen({ message = 'Loading HypertrophyPro...' }: LoadingScreenProps) {
  return (
    <div className="flex justify-center items-center min-h-screen">
      <div className="animate-pulse flex flex-col items-center">
        <div className="w-16 h-16 rounded-full bg-neon-green/20 flex items-center justify-center mb-4">
          <Dumbbell className="w-8 h-8 text-neon-green" />
        </div>
        <p className="text-gray-400">{message}</p>
      </div>
    </div>
  );
} 