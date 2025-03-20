'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '@/lib/store';
import MesocycleProgress from '@/components/MesocycleProgress';
import { ArrowLeft, Dumbbell } from 'lucide-react';
import { fetchMesocycleByIdAsync } from '@/lib/slices/workoutSlice';
import { useAuth } from '@/lib/hooks/useAuth';
import LoadingScreen from '@/components/LoadingScreen';

interface MesocycleDetailPageProps {
  params: {
    id: string;
  };
}

export default function MesocycleDetailPage({ params }: MesocycleDetailPageProps) {
  const router = useRouter();
  const dispatch = useDispatch();
  const { user, loading: authLoading } = useAuth();
  const { mesocycles, loading } = useSelector((state: RootState) => state.workout);
  const [mesocycle, setMesocycle] = useState<any>(null);
  
  // Fetch the mesocycle by ID when the component mounts
  useEffect(() => {
    const fetchMesocycle = async () => {
      if (params.id) {
        // First try to find in the redux store
        const existingMesocycle = mesocycles.find(m => m.id === params.id);
        
        if (existingMesocycle) {
          setMesocycle(existingMesocycle);
        } else {
          // If not in the store, fetch from Firestore
          dispatch(fetchMesocycleByIdAsync(params.id) as any);
        }
      }
    };
    
    fetchMesocycle();
  }, [params.id, mesocycles, dispatch]);
  
  // When mesocycles change, update our local state
  useEffect(() => {
    const foundMesocycle = mesocycles.find(m => m.id === params.id);
    if (foundMesocycle) {
      setMesocycle(foundMesocycle);
    }
  }, [mesocycles, params.id]);
  
  // Redirect if mesocycle not found after loading
  useEffect(() => {
    if (!loading && !mesocycle && !authLoading) {
      router.push('/mesocycle');
    }
  }, [loading, mesocycle, router, authLoading]);
  
  if (loading || authLoading) {
    return <LoadingScreen message="Loading mesocycle..." />;
  }
  
  if (!mesocycle) return null;
  
  return (
    <div className="max-w-3xl mx-auto px-4 py-8 pb-24">
      <div className="flex items-center mb-8">
        <button
          onClick={() => router.back()}
          className="mr-4 p-2 rounded-full bg-black/30 hover:bg-black/50 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-3xl font-bold">Mesocycle Details</h1>
      </div>
      
      <MesocycleProgress mesocycle={mesocycle} />
    </div>
  );
} 