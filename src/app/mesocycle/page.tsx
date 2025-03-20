'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '@/lib/store';
import { Calendar, Plus, ChevronRight, ArrowRight, Dumbbell, CheckCircle, Info } from 'lucide-react';
import { format, parseISO, addWeeks, isAfter, isBefore } from 'date-fns';
import { fetchUserMesocyclesAsync } from '@/lib/slices/workoutSlice';
import { useAuth } from '@/lib/hooks/useAuth';
import LoadingScreen from '@/components/LoadingScreen';

export default function MesocyclePage() {
  const router = useRouter();
  const dispatch = useDispatch();
  const { user, loading: authLoading } = useAuth();
  const { mesocycles, currentMesocycle, loading } = useSelector((state: RootState) => state.workout);
  
  // Current week state for display in the current mesocycle
  const [currentWeek, setCurrentWeek] = useState(1);

  // Fetch mesocycles when the component mounts or user changes
  useEffect(() => {
    if (user) {
      // Fetch from Firestore
      dispatch(fetchUserMesocyclesAsync(user.uid) as any);
    } else if (!authLoading && !user) {
      // If the user is not logged in, redirect to new mesocycle creation
      if (mesocycles.length === 0) {
        router.push('/mesocycle/new');
      }
    }
  }, [user, authLoading, dispatch, mesocycles.length, router]);

  // Calculate current week of a mesocycle
  const calculateCurrentWeek = (mesocycle: any) => {
    if (!mesocycle) return 1;
    
    const startDate = parseISO(mesocycle.startDate);
    const today = new Date();
    const diffTime = today.getTime() - startDate.getTime();
    const diffWeeks = Math.floor(diffTime / (7 * 24 * 60 * 60 * 1000)) + 1;
    
    return Math.min(Math.max(1, diffWeeks), mesocycle.weeks);
  };
  
  // Check if a week is the current week
  const isCurrentWeek = (mesocycle: any, week: number) => {
    const startDate = parseISO(mesocycle.startDate);
    const weekStartDate = addWeeks(startDate, week - 1);
    const weekEndDate = addWeeks(weekStartDate, 1);
    const now = new Date();
    return !isBefore(now, weekStartDate) && !isAfter(now, weekEndDate);
  };
  
  // Group workouts by day
  const groupWorkoutsByDay = (workouts: any[]) => {
    const grouped = workouts.reduce((acc: Record<string, any[]>, workout: any) => {
      // Extract day of week from the date
      const day = format(parseISO(workout.date), 'EEEE'); // Full day name (Monday, Tuesday, etc.)
      
      if (!acc[day]) {
        acc[day] = [];
      }
      
      acc[day].push(workout);
      return acc;
    }, {});
    
    // Get days in order (Sunday to Saturday)
    const orderedDays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
      .filter(day => grouped[day]?.length > 0);
      
    return { grouped, orderedDays };
  };

  // Show loading state
  if (loading || authLoading) {
    return <LoadingScreen message="Loading mesocycles..." />;
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 pb-24">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Mesocycles</h1>
        <Link
          href="/mesocycle/new"
          className="btn-primary py-2 px-4 flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> New Mesocycle
        </Link>
      </div>
      
      {currentMesocycle && (
        <div className="mb-8">
          <h2 className="text-xl font-bold mb-4">Current Mesocycle</h2>
          <div className="card p-6">
            <div className="flex justify-between mb-6">
              <div>
                <h3 className="text-xl font-bold text-neon-green">{currentMesocycle.name}</h3>
                <p className="text-sm text-gray-400 flex items-center gap-1 mt-1">
                  <Calendar className="w-4 h-4" />
                  <span>
                    {currentMesocycle?.startDate ? (
                      <>{format(parseISO(currentMesocycle.startDate), 'MMM d, yyyy')} — {format(parseISO(currentMesocycle.endDate), 'MMM d, yyyy')}</>
                    ) : (
                      <span>Date not available</span>
                    )}
                  </span>
                </p>
              </div>
              <Link
                href={`/mesocycle/${currentMesocycle.id}`}
                className="btn-secondary py-1 px-3 h-fit text-sm"
              >
                View
              </Link>
            </div>
            
            <div className="mb-6">
              <p className="text-sm text-gray-300 mb-2">Weekly Progression: +{currentMesocycle.weeklyProgression}% volume per week</p>
              <div className="flex gap-1 h-3">
                {Array.from({ length: currentMesocycle.weeks }, (_, i) => i + 1).map(week => (
                  <div 
                    key={week}
                    className={`flex-1 rounded ${
                      currentMesocycle.includeDeload && week === currentMesocycle.weeks
                        ? 'bg-neon-green/30' // Deload week
                        : 'bg-neon-green'
                    }`}
                    style={{ 
                      opacity: Math.min(0.3 + (week / currentMesocycle.weeks) * 0.7, 1),
                    }}
                  />
                ))}
              </div>
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>Week 1</span>
                <span>Week {currentMesocycle.weeks}</span>
              </div>
            </div>
            
            {/* Week selector as cards */}
            <div className="grid grid-cols-4 gap-3 mb-6">
              {Array.from({ length: currentMesocycle.weeks }, (_, i) => i + 1).map(week => {
                const isCurrentW = isCurrentWeek(currentMesocycle, week);
                return (
                  <button
                    key={week}
                    onClick={() => setCurrentWeek(week)}
                    className={`p-4 rounded-lg transition-colors relative text-center ${
                      currentWeek === week 
                        ? 'bg-neon-green/20 border border-neon-green' 
                        : 'bg-gray-800/50 hover:bg-gray-800'
                    }`}
                  >
                    <h4 className={`text-lg font-bold ${currentWeek === week ? 'text-neon-green' : ''}`}>Week {week}</h4>
                    <p className="text-xs text-gray-400 mt-1">
                      {format(addWeeks(parseISO(currentMesocycle.startDate), week - 1), 'MMM d')} - 
                      {format(addWeeks(parseISO(currentMesocycle.startDate), week), 'MMM d')}
                    </p>
                    
                    {isCurrentW && (
                      <span className="absolute top-2 right-2 bg-neon-green text-black text-xs px-2 py-0.5 rounded-full">Current</span>
                    )}
                    
                    {currentMesocycle.includeDeload && week === currentMesocycle.weeks && (
                      <span className="absolute bottom-2 right-2 text-xs text-neon-green/80">Deload</span>
                    )}
                  </button>
                );
              })}
            </div>
            
            {/* Weekly RPE Target */}
            {currentMesocycle.workouts[`week${currentWeek}`]?.length > 0 && 
             (currentMesocycle.workouts[`week${currentWeek}`][0] as any).weekRPE && (
              <div className="card bg-black/30 p-4 mb-6 border-l-4 border-neon-green">
                <h3 className="font-medium text-neon-green mb-1">Week {currentWeek} RPE Target</h3>
                <div className="flex items-center gap-2">
                  <div className="bg-neon-green/20 px-3 py-1.5 rounded-lg">
                    <p className="text-xl font-bold text-neon-green">
                      {(currentMesocycle.workouts[`week${currentWeek}`][0] as any).weekRPE.min}-
                      {(currentMesocycle.workouts[`week${currentWeek}`][0] as any).weekRPE.max}
                    </p>
                  </div>
                  <p className="text-sm text-gray-300">{(currentMesocycle.workouts[`week${currentWeek}`][0] as any).weekRPE.label}</p>
                </div>
              </div>
            )}
            
            <div className="space-y-2 mb-2">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Week {currentWeek} Workouts</h3>
                <Link 
                  href={`/mesocycle/${currentMesocycle.id}`}
                  className="flex items-center gap-1 text-neon-green text-sm hover:underline"
                >
                  <Plus className="w-4 h-4" /> Add Workout
                </Link>
              </div>
              
              {currentMesocycle.workouts[`week${currentWeek}`]?.length > 0 ? (
                (() => {
                  const { grouped, orderedDays } = groupWorkoutsByDay(currentMesocycle.workouts[`week${currentWeek}`]);
                  
                  return (
                    <div className="space-y-6">
                      {orderedDays.map(day => (
                        <div key={day} className="space-y-3">
                          <h4 className="text-gray-400 text-sm font-medium border-b border-gray-800 pb-2">{day}</h4>
                          
                          {grouped[day].map((workout: any) => (
                            <div 
                              key={workout.id}
                              className="bg-black/20 rounded-lg overflow-hidden"
                            >
                              <div className="p-4 border-b border-gray-800/50">
                                <div className="flex justify-between items-center">
                                  <h4 className="font-medium">{workout.name}</h4>
                                  {workout.completed ? (
                                    <span className="bg-neon-green/20 text-neon-green text-xs px-2 py-1 rounded-full flex items-center gap-1">
                                      <CheckCircle className="w-3 h-3" /> Completed
                                    </span>
                                  ) : null}
                                </div>
                                <p className="text-xs text-gray-400 mt-1">{format(parseISO(workout.date), 'EEEE, MMMM d')}</p>
                              </div>
                              
                              <div className="p-3 bg-black/20">
                                <h5 className="text-xs text-gray-400 mb-2">Exercises ({workout.exercises.length})</h5>
                                <div className="space-y-1 mb-4">
                                  {workout.exercises.slice(0, 3).map((exercise: any) => (
                                    <div key={exercise.id} className="flex items-center gap-2">
                                      <Dumbbell className="w-3 h-3 text-gray-500" />
                                      <p className="text-sm truncate">{exercise.name}</p>
                                      <span className="text-xs text-gray-500">
                                        {exercise.sets} × {exercise.reps}
                                      </span>
                                    </div>
                                  ))}
                                  
                                  {workout.exercises.length > 3 && (
                                    <p className="text-xs text-gray-500 pl-5">+{workout.exercises.length - 3} more exercises</p>
                                  )}
                                </div>
                                
                                <Link 
                                  href={`/workout/${workout.id}`}
                                  className="btn-primary w-full flex items-center justify-center gap-2 py-2"
                                >
                                  {workout.completed ? 'View Details' : 'Start Workout'} <ArrowRight className="w-4 h-4" />
                                </Link>
                              </div>
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  );
                })()
              ) : (
                <div className="bg-black/20 p-6 rounded-lg text-center">
                  <p className="text-gray-400 mb-3">No workouts planned for Week {currentWeek}</p>
                  <Link 
                    href={`/mesocycle/${currentMesocycle.id}`}
                    className="btn-primary inline-flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" /> Add Workout
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      
      {mesocycles.length > 0 ? (
        <div>
          <h2 className="text-xl font-bold mb-4">All Mesocycles</h2>
          <div className="space-y-4">
            {mesocycles.map((mesocycle) => (
              <div key={mesocycle.id} className="card p-4 hover:bg-gray-800/30 transition-colors">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold">{mesocycle.name}</h3>
                    <p className="text-sm text-gray-400">
                      {mesocycle?.startDate ? (
                        <>{format(parseISO(mesocycle.startDate), 'MMM d, yyyy')} - {mesocycle?.endDate ? format(parseISO(mesocycle.endDate), 'MMM d, yyyy') : ''}</>
                      ) : (
                        <span>Date not available</span>
                      )}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <div className="text-xs bg-gray-800 px-2 py-1 rounded">
                        {mesocycle.weeks} weeks
                      </div>
                      <div className="text-xs bg-gray-800 px-2 py-1 rounded">
                        {mesocycle.workouts ? Object.values(mesocycle.workouts).flat().length : 0} workouts
                      </div>
                    </div>
                  </div>
                  <Link
                    href={`/mesocycle/${mesocycle.id}`}
                    className="text-neon-green hover:underline flex items-center gap-1"
                  >
                    View <ChevronRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="card p-8 text-center">
          <h3 className="text-xl font-bold mb-4">No Mesocycles Yet</h3>
          <p className="text-gray-400 mb-6">
            Create your first mesocycle to plan out your training for the next few weeks
          </p>
          <Link
            href="/mesocycle/new"
            className="btn-primary py-2 px-6 flex items-center gap-2 justify-center mx-auto"
          >
            <Plus className="w-4 h-4" /> Create Mesocycle
          </Link>
        </div>
      )}
    </div>
  );
} 