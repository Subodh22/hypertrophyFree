'use client';

import { useState } from 'react';
import { useSelector } from 'react-redux';
import Link from 'next/link';
import { Plus, ChevronRight, Calendar, ArrowRight } from 'lucide-react';
import { RootState } from '@/lib/store';
import WorkoutCard from '@/components/WorkoutCard';

export default function WorkoutPage() {
  const { currentWorkout, workoutHistory, currentMesocycle } = useSelector((state: RootState) => state.workout);
  
  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Workouts</h1>
        <Link href="/workout/new" className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> New Workout
        </Link>
      </div>
      
      {/* Active Workout */}
      <div className="mb-8">
        <h2 className="text-xl font-bold mb-4">Active Workout</h2>
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
      
      {/* Current Mesocycle */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Current Mesocycle</h2>
          <Link href="/mesocycle" className="text-sm text-neon-green flex items-center gap-1 hover:underline">
            View Details <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
        
        {currentMesocycle ? (
          <div className="card p-4">
            <h3 className="font-semibold text-lg mb-2">{currentMesocycle.name}</h3>
            <div className="flex items-center gap-2 text-sm text-gray-400 mb-3">
              <Calendar className="w-4 h-4" />
              <span>{currentMesocycle.startDate} — {currentMesocycle.endDate}</span>
            </div>
            <div className="flex gap-1 h-3 mb-4">
              {Array.from({ length: currentMesocycle.weeks }, (_, i) => (
                <div 
                  key={i}
                  className="flex-1 bg-neon-green rounded"
                  style={{ 
                    opacity: Math.min(0.3 + ((i + 1) / currentMesocycle.weeks) * 0.7, 1)
                  }}
                />
              ))}
            </div>
            <Link 
              href={`/mesocycle/${currentMesocycle.id}`}
              className="text-neon-green text-sm hover:underline flex items-center justify-end gap-1"
            >
              Manage Workouts <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        ) : (
          <div className="card p-6 text-center">
            <p className="text-gray-400 mb-3">No active mesocycle</p>
            <Link 
              href="/mesocycle/new" 
              className="btn-primary inline-flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> Create Mesocycle
            </Link>
          </div>
        )}
      </div>
      
      {/* Recent Workouts */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Recent Workouts</h2>
          <Link href="/workouts/history" className="text-sm text-neon-green flex items-center gap-1 hover:underline">
            View All <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
        
        {workoutHistory.length > 0 ? (
          <div className="space-y-4">
            {workoutHistory.slice(0, 3).map((workout) => (
              <WorkoutCard key={workout.id} workout={workout} compact />
            ))}
          </div>
        ) : (
          <div className="card p-6 text-center">
            <p className="text-gray-400">No workout history yet</p>
          </div>
        )}
      </div>
    </div>
  );
} 