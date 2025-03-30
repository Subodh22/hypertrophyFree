'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useSelector } from 'react-redux';
import { BarChart4, Dumbbell, Plus, ChevronRight, Settings } from 'lucide-react';
import { RootState } from '@/lib/store';
import WorkoutCard from '@/components/WorkoutCard';
import StatsOverview from '@/components/StatsOverview';

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<'overview' | 'history'>('overview');
  const { currentWorkout, workoutHistory } = useSelector((state: RootState) => state.workout);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
        <h1 className="text-3xl font-bold mb-4 md:mb-0">Dashboard</h1>
        <div className="flex items-center gap-4">
          <Link href="/workout/new" className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" /> New Workout
          </Link>
          <Link href="/settings" className="p-2 rounded-full bg-black/30 hover:bg-black/50 transition-colors">
            <Settings className="w-5 h-5" />
          </Link>
        </div>
      </div>

      {/* Dashboard Tabs */}
      <div className="flex border-b border-neon-green/20 mb-8 overflow-x-auto">
        <TabButton 
          active={activeTab === 'overview'} 
          onClick={() => setActiveTab('overview')}
          icon={<BarChart4 className="w-4 h-4" />}
          label="Overview"
        />
        <TabButton 
          active={activeTab === 'history'} 
          onClick={() => setActiveTab('history')}
          icon={<Dumbbell className="w-4 h-4" />}
          label="Workout History"
        />
      </div>

      {/* Dashboard Content */}
      <div className="mt-8">
        {activeTab === 'overview' && (
          <div>
            <StatsOverview />
            
            {/* Current/Active Workout */}
            <div className="mb-8">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">Active Workout</h2>
                {!currentWorkout && (
                  <Link href="/workout/new" className="text-sm text-neon-green flex items-center gap-1 hover:underline">
                    Start New <ChevronRight className="w-4 h-4" />
                  </Link>
                )}
              </div>
              
              {currentWorkout ? (
                <WorkoutCard workout={currentWorkout} />
              ) : (
                <div className="card p-8 text-center">
                  <p className="text-gray-400 mb-4">No active workout</p>
                  <Link href="/workout/new" className="btn-primary inline-flex items-center gap-2">
                    <Plus className="w-4 h-4" /> Start Workout
                  </Link>
                </div>
              )}
            </div>
            
            {/* Recent Workouts */}
            <div>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">Recent Workouts</h2>
                <Link href="/workouts" className="text-sm text-neon-green flex items-center gap-1 hover:underline">
                  View All <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
              
              {workoutHistory.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {workoutHistory.slice(0, 4).map((workout) => (
                    <WorkoutCard key={workout.id} workout={workout} compact />
                  ))}
                </div>
              ) : (
                <div className="card p-8 text-center">
                  <p className="text-gray-400">No workout history yet</p>
                </div>
              )}
            </div>
          </div>
        )}
        
        {activeTab === 'history' && (
          <div>
            {workoutHistory.length > 0 ? (
              <div className="space-y-4">
                {workoutHistory.map((workout) => (
                  <WorkoutCard key={workout.id} workout={workout} />
                ))}
              </div>
            ) : (
              <div className="card p-8 text-center">
                <p className="text-gray-400">No workout history yet</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

interface TabButtonProps {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}

function TabButton({ active, onClick, icon, label }: TabButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-3 font-medium transition-colors ${
        active 
          ? 'text-neon-green border-b-2 border-neon-green' 
          : 'text-gray-400 hover:text-white'
      }`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
} 