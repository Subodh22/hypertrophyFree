'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { format, addWeeks, isAfter, isBefore, parseISO } from 'date-fns';
import { Edit2, Calendar, Plus, ChevronRight, Dumbbell, Clock, CheckCircle, ArrowRight, Save } from 'lucide-react';
import { Mesocycle, WorkoutSession, updateMesocycleAsync } from '@/lib/slices/workoutSlice';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '@/lib/store';
import { useAuth } from '@/lib/hooks/useAuth';
import { updateExerciseInFirebase } from '@/lib/firebase/exerciseUtils';
import ClientSideButton from './ClientSideButton';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/firebase';

interface MesocycleProgressProps {
  mesocycle: Mesocycle;
}

interface DirectSaveButtonProps {
  mesocycleId: string;
  weekKey: string;
  workoutIndex: number;
  exerciseIndex: number; 
  weight: string;
  reps: string;
  userId: string;
  onSuccess: () => void;
}

function DirectSaveButton({ 
  mesocycleId, 
  weekKey, 
  workoutIndex, 
  exerciseIndex, 
  weight, 
  reps, 
  userId,
  onSuccess
}: DirectSaveButtonProps) {
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    // Basic validation
    if (!weight || !reps) {
      console.error("DirectSaveButton: Missing weight or reps");
      setError("Enter both values");
      setTimeout(() => setError(null), 3000);
      return;
    }

    console.log("⭐ DirectSaveButton: Save attempt", {
      mesocycleId, 
      weekKey, 
      workoutIndex, 
      exerciseIndex, 
      weight, 
      reps
    });
    
    try {
      setSaving(true);
      setError(null);
      
      // Get mesocycle document
      const docRef = doc(db, 'mesocycles', mesocycleId);
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) {
        throw new Error("Mesocycle not found");
      }
      
      // Get document data and clone it
      const data = docSnap.data();
      console.log("⭐ DirectSaveButton: Got document", { 
        id: mesocycleId,
        hasWorkouts: !!data.workouts, 
        hasWeek: data.workouts && !!data.workouts[weekKey]
      });
      
      // Check all paths exist
      if (!data.workouts) {
        throw new Error("No workouts in mesocycle");
      }
      
      if (!data.workouts[weekKey]) {
        throw new Error(`No workouts for ${weekKey}`);
      }
      
      if (!data.workouts[weekKey][workoutIndex]) {
        throw new Error(`No workout at index ${workoutIndex}`);
      }
      
      if (!data.workouts[weekKey][workoutIndex].exercises) {
        throw new Error("No exercises in workout");
      }
      
      if (!data.workouts[weekKey][workoutIndex].exercises[exerciseIndex]) {
        throw new Error(`No exercise at index ${exerciseIndex}`);
      }
      
      // Get exercise and update it
      const exercise = data.workouts[weekKey][workoutIndex].exercises[exerciseIndex];
      console.log("⭐ DirectSaveButton: Found exercise", { 
        name: exercise.name,
        currentWeight: exercise.weight,
        currentReps: exercise.reps
      });
      
      // Update exercise fields
      exercise.weight = weight;
      exercise.reps = reps;
      exercise.completed = true;
      
      // Update generatedSets if they exist
      if (exercise.generatedSets && Array.isArray(exercise.generatedSets)) {
        exercise.generatedSets.forEach((set: any) => {
          if (set) {
            set.completedWeight = weight;
            set.completedReps = reps;
          }
        });
      }
      
      // Create our update
      const update = {
        workouts: data.workouts,
        updatedAt: new Date().toISOString()
      };
      
      console.log("⭐ DirectSaveButton: Sending update to Firestore");
      
      // Update document
      await updateDoc(docRef, update);
      
      console.log("⭐ DirectSaveButton: Update successful!");
      setSuccess(true);
      onSuccess();
      
      // Reset success state after 3 seconds
      setTimeout(() => {
        setSuccess(false);
      }, 3000);
    } catch (err: any) {
      console.error("⭐ DirectSaveButton: Error saving", err);
      setError(err.message || "Save failed");
      
      // Clear error after 5 seconds
      setTimeout(() => {
        setError(null);
      }, 5000);
    } finally {
      setSaving(false);
    }
  };
  
  return (
    <button
      onClick={handleSave}
      disabled={saving}
      className={`ml-2 p-1 rounded-full ${
        success ? 'bg-green-600' : error ? 'bg-red-600' : 'bg-gray-700 hover:bg-gray-600'
      }`}
      title={error || "Save weight and reps"}
    >
      {saving ? (
        <Clock className="w-4 h-4 animate-spin text-white" />
      ) : success ? (
        <CheckCircle className="w-4 h-4 text-white" />
      ) : (
        <Save className="w-4 h-4 text-white" />
      )}
    </button>
  );
}

export default function MesocycleProgress({ mesocycle }: MesocycleProgressProps) {
  // Check if running in browser or server
  const isBrowser = typeof window !== 'undefined' && typeof document !== 'undefined';
  console.log("🧩 MesocycleProgress component running in:", isBrowser ? "browser" : "server");
  
  const [selectedWeek, setSelectedWeek] = useState(1);
  const [exerciseStates, setExerciseStates] = useState<{[key: string]: {weight: string, reps: string, completed: boolean}}>({});
  const [savingExerciseId, setSavingExerciseId] = useState<string | null>(null);
  const dispatch = useDispatch();
  const { user } = useAuth();
  
  // Log environment and auth status
  useEffect(() => {
    console.log("🧩 MesocycleProgress mounted in browser with user:", user?.uid || "not logged in");
  }, [user]);
  
  const startDate = parseISO(mesocycle.startDate);
  const weeks = Array.from({ length: mesocycle.weeks }, (_, i) => i + 1);
  
  const isCurrentWeek = (week: number) => {
    const weekStartDate = addWeeks(startDate, week - 1);
    const weekEndDate = addWeeks(weekStartDate, 1);
    const now = new Date();
    return !isBefore(now, weekStartDate) && !isAfter(now, weekEndDate);
  };
  
  // Update the weekly workouts retrieval to handle the new format
  const weeklyWorkouts = mesocycle.workouts[`week${selectedWeek}`] || [];
  
  // Group workouts by day of week for better organization
  const groupedWorkouts = weeklyWorkouts.reduce((acc: Record<string, WorkoutSession[]>, workout: WorkoutSession) => {
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
    .filter(day => groupedWorkouts[day]?.length > 0);
  
  const currentWeekIndex = weeks.findIndex(week => isCurrentWeek(week));
  
  // Calculate the progression based on the week
  const getProgressionForWeek = (week: number) => {
    if (mesocycle.includeDeload && week === mesocycle.weeks) {
      return 0.7; // 70% volume for deload week
    }
    return 1 + (mesocycle.weeklyProgression / 100) * (week - 1);
  };

  // Initialize exercise states with saved data
  useEffect(() => {
    const initialStates: {[key: string]: {weight: string, reps: string, completed: boolean}} = {};
    const weekKey = `week${selectedWeek}`;
    
    // If there are no workouts for this week, return early
    if (!mesocycle.workouts[weekKey]) return;
    
    // For each workout in this week
    mesocycle.workouts[weekKey].forEach((workout: any) => {
      // For each exercise in this workout
      workout.exercises.forEach((exercise: any) => {
        const stateKey = `${workout.id}-${exercise.id}`;
        
        // Check if exercise has weight and reps data
        const hasData = exercise.weight && exercise.reps;
        
        initialStates[stateKey] = {
          weight: exercise.weight || '',
          reps: exercise.reps || '',
          completed: Boolean(hasData)
        };
      });
    });
    
    setExerciseStates(initialStates);
  }, [mesocycle, selectedWeek]);

  // Handle saving exercise data when check button is pressed
  const saveExerciseData = (workoutId: string, exerciseId: string, weight: string, reps: string) => {
    // Ensure we're in client context
    if (typeof window === 'undefined') {
      console.error("Cannot save data - running in server context");
      return;
    }
    
    if (!user) {
      console.error("Cannot save data - no user logged in");
      return;
    }
    
    console.log("Saving exercise data:", { workoutId, exerciseId, weight, reps, user: user.uid });
    
    // Set saving state
    setSavingExerciseId(`${workoutId}-${exerciseId}`);
    
    // Update local state
    setExerciseStates(prev => ({
      ...prev,
      [`${workoutId}-${exerciseId}`]: {
        weight,
        reps,
        completed: true
      }
    }));
    
    // Find the correct week key and indexes
    const weekKey = `week${selectedWeek}`;
    const workoutIndex = mesocycle.workouts[weekKey]?.findIndex(w => w.id === workoutId);
    
    if (workoutIndex === -1 || workoutIndex === undefined) {
      console.error("Workout not found:", { weekKey, workoutId });
      setSavingExerciseId(null);
      return;
    }
    
    const exerciseIndex = mesocycle.workouts[weekKey][workoutIndex].exercises.findIndex(
      e => e.id === exerciseId
    );
    
    if (exerciseIndex === -1) {
      console.error("Exercise not found:", { workoutId, exerciseId });
      setSavingExerciseId(null);
      return;
    }
    
    // Create updates for Firebase
    const updates: Record<string, any> = {};
    
    // Update exercise weight and reps
    updates[`workouts.${weekKey}.${workoutIndex}.exercises.${exerciseIndex}.weight`] = weight;
    updates[`workouts.${weekKey}.${workoutIndex}.exercises.${exerciseIndex}.reps`] = reps;
    
    // Check if exercise has generatedSets
    const exercise = mesocycle.workouts[weekKey][workoutIndex].exercises[exerciseIndex] as any;
    if (exercise.generatedSets && exercise.generatedSets.length > 0) {
      updates[`workouts.${weekKey}.${workoutIndex}.exercises.${exerciseIndex}.generatedSets.0.completedWeight`] = weight;
      updates[`workouts.${weekKey}.${workoutIndex}.exercises.${exerciseIndex}.generatedSets.0.completedReps`] = reps;
    }
    
    // Use a setTimeout to ensure this runs in the client context
    setTimeout(() => {
      updateExerciseInFirebase(mesocycle.id, updates, user.uid)
        .then(() => {
          console.log("Successfully updated exercise data in Firebase");
          setTimeout(() => setSavingExerciseId(null), 500);
        })
        .catch((error: unknown) => {
          console.error("Error saving exercise data to Firebase:", error);
          setSavingExerciseId(null);
        });
    }, 0);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">{mesocycle.name}</h2>
        <Link 
          href={`/mesocycle/${mesocycle.id}/edit`}
          className="flex items-center gap-1 text-neon-green text-sm hover:underline"
        >
          <Edit2 className="w-4 h-4" /> Edit
        </Link>
      </div>
      
      <div className="card p-4">
        <div className="flex items-center gap-2 text-sm text-gray-400 mb-4">
          <Calendar className="w-4 h-4" />
          <span>{format(startDate, 'MMM d, yyyy')} — {format(parseISO(mesocycle.endDate), 'MMM d, yyyy')}</span>
        </div>
        
        <div className="mb-6">
          <p className="text-sm text-gray-300 mb-2">Weekly Progression: +{mesocycle.weeklyProgression}% volume per week</p>
          <div className="flex gap-1 h-3">
            {weeks.map(week => (
              <div 
                key={week}
                className={`flex-1 rounded ${
                  mesocycle.includeDeload && week === mesocycle.weeks
                    ? 'bg-neon-green/30' // Deload week
                    : 'bg-neon-green'
                }`}
                style={{ 
                  opacity: Math.min(0.3 + (week / weeks.length) * 0.7, 1),
                  height: `${getProgressionForWeek(week) * 100}%`,
                }}
              />
            ))}
          </div>
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>Week 1</span>
            <span>Week {mesocycle.weeks}</span>
          </div>
        </div>
        
        {/* Week selector as cards */}
        <div className="grid grid-cols-4 gap-3 mb-6">
          {weeks.map(week => (
            <button
              key={week}
              onClick={() => setSelectedWeek(week)}
              className={`p-4 rounded-lg transition-colors relative text-center ${
                selectedWeek === week 
                  ? 'bg-neon-green/20 border border-neon-green' 
                  : 'bg-gray-800/50 hover:bg-gray-800'
              }`}
            >
              <h4 className={`text-lg font-bold ${selectedWeek === week ? 'text-neon-green' : ''}`}>Week {week}</h4>
              <p className="text-xs text-gray-400 mt-1">
                {format(addWeeks(startDate, week - 1), 'MMM d')} - 
                {format(addWeeks(startDate, week), 'MMM d')}
              </p>
              
              {isCurrentWeek(week) && (
                <span className="absolute top-2 right-2 bg-neon-green text-black text-xs px-2 py-0.5 rounded-full">Current</span>
              )}
              
              {mesocycle.includeDeload && week === mesocycle.weeks && (
                <span className="absolute bottom-2 right-2 text-xs text-neon-green/80">Deload</span>
              )}
            </button>
          ))}
        </div>
        
        {/* Weekly RPE Target */}
        {weeklyWorkouts.length > 0 && (weeklyWorkouts[0] as any).weekRPE && (
          <div className="card bg-black/30 p-4 mb-6 border-l-4 border-neon-green">
            <h3 className="font-medium text-neon-green mb-1">Week {selectedWeek} RPE Target</h3>
            <div className="flex items-center gap-2">
              <div className="bg-neon-green/20 px-3 py-1.5 rounded-lg">
                <p className="text-xl font-bold text-neon-green">
                  {(weeklyWorkouts[0] as any).weekRPE.min}-{(weeklyWorkouts[0] as any).weekRPE.max}
                </p>
              </div>
              <p className="text-sm text-gray-300">{(weeklyWorkouts[0] as any).weekRPE.label}</p>
            </div>
          </div>
        )}
        
        {/* Week workouts by day */}
        <div>
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-semibold">Week {selectedWeek} Workouts</h3>
            <Link 
              href={`/mesocycle/${mesocycle.id}/week/${selectedWeek}/workout/new`}
              className="flex items-center gap-1 text-neon-green text-sm hover:underline"
            >
              <Plus className="w-4 h-4" /> Add Workout
            </Link>
          </div>
          
          {orderedDays.length > 0 ? (
            <div className="space-y-6">
              {orderedDays.map(day => (
                <div key={day} className="space-y-3">
                  <h4 className="text-gray-400 text-sm font-medium border-b border-gray-800 pb-2">{day}</h4>
                  
                  {groupedWorkouts[day].map((workout: WorkoutSession) => (
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
                        <div className="space-y-4 mb-4">
                          {workout.exercises.map((exercise: any) => {
                            const stateKey = `${workout.id}-${exercise.id}`;
                            const exerciseState = exerciseStates[stateKey] || {
                              weight: exercise.weight || '',
                              reps: exercise.reps || '',
                              completed: false
                            };
                            
                            // Find indexes for direct Firebase updates
                            const weekKey = `week${selectedWeek}`;
                            const workoutIndex = mesocycle.workouts[weekKey]?.findIndex(w => w.id === workout.id);
                            const exerciseIndex = workoutIndex >= 0 ? 
                              mesocycle.workouts[weekKey][workoutIndex].exercises.findIndex(e => e.id === exercise.id) : -1;
                            
                            return (
                              <div key={exercise.id} className="bg-black/30 p-4 rounded-lg">
                                <div className="flex flex-col mb-2">
                                  <h4 className="font-bold text-white">{exercise.name}</h4>
                                  <p className="text-sm text-gray-400">
                                    {exercise.sets} sets x {exercise.reps} reps
                                  </p>
                                </div>
                                
                                <div className="border-t border-gray-800 mt-2 pt-2">
                                  <div className="flex text-xs text-gray-500 mb-3 px-2">
                                    <div className="w-8 text-center">#</div>
                                    <div className="flex-1 text-center">WEIGHT</div>
                                    <div className="flex-1 text-center">REPS</div>
                                    <div className="w-12 text-center">DONE</div>
                                  </div>
                                  
                                  {Array.from({ length: exercise.sets || 1 }).map((_, setIndex) => (
                                    <div key={setIndex} className="flex items-center py-2 border-t border-gray-800/50">
                                      <div className="w-8 text-center text-sm">{setIndex + 1}</div>
                                      
                                      <div className="flex-1 px-2 flex justify-center">
                                        <input
                                          type="number"
                                          value={exerciseState.weight}
                                          onChange={(e) => setExerciseStates(prev => ({
                                            ...prev,
                                            [stateKey]: {
                                              ...prev[stateKey] || exerciseState,
                                              weight: e.target.value
                                            }
                                          }))}
                                          className="w-full bg-gray-800 rounded text-center py-2 focus:ring-1 focus:ring-neon-green outline-none"
                                          min="0"
                                          placeholder="0"
                                        />
                                      </div>
                                      
                                      <div className="flex-1 px-2 flex justify-center">
                                        <input
                                          type="number"
                                          value={exerciseState.reps}
                                          onChange={(e) => setExerciseStates(prev => ({
                                            ...prev,
                                            [stateKey]: {
                                              ...prev[stateKey] || exerciseState,
                                              reps: e.target.value
                                            }
                                          }))}
                                          className="w-full bg-gray-800 rounded text-center py-2 focus:ring-1 focus:ring-neon-green outline-none"
                                          min="0"
                                          placeholder="0"
                                        />
                                      </div>
                                      
                                      <div className="w-12 flex justify-center">
                                        {user && workoutIndex >= 0 && exerciseIndex >= 0 ? (
                                          <button
                                            onClick={() => {
                                              // Only proceed if weight and reps are entered
                                              if (!exerciseState.weight || !exerciseState.reps) {
                                                console.log("Cannot save: Missing weight or reps");
                                                return;
                                              }
                                              
                                              console.log("⭐ Save clicked for", {
                                                exercise: exercise.name,
                                                weight: exerciseState.weight,
                                                reps: exerciseState.reps
                                              });

                                              // Get document reference
                                              const docRef = doc(db, 'mesocycles', mesocycle.id);
                                              
                                              // Get document directly (no state)
                                              getDoc(docRef).then(docSnap => {
                                                if (!docSnap.exists()) {
                                                  console.error("Mesocycle not found");
                                                  return;
                                                }
                                                
                                                // Get data
                                                const data = docSnap.data();
                                                
                                                // Make sure path exists
                                                if (!data.workouts || 
                                                    !data.workouts[weekKey] || 
                                                    !data.workouts[weekKey][workoutIndex] || 
                                                    !data.workouts[weekKey][workoutIndex].exercises || 
                                                    !data.workouts[weekKey][workoutIndex].exercises[exerciseIndex]) {
                                                  console.error("Invalid path to exercise");
                                                  return;
                                                }
                                                
                                                // Get exercise
                                                const exercise = data.workouts[weekKey][workoutIndex].exercises[exerciseIndex];
                                                
                                                // Update exercise
                                                exercise.weight = exerciseState.weight;
                                                exercise.reps = exerciseState.reps;
                                                exercise.completed = true;
                                                
                                                // Update generated sets if they exist
                                                if (exercise.generatedSets && Array.isArray(exercise.generatedSets)) {
                                                  exercise.generatedSets.forEach((set: any) => {
                                                    if (set) {
                                                      set.completedWeight = exerciseState.weight;
                                                      set.completedReps = exerciseState.reps;
                                                    }
                                                  });
                                                }
                                                
                                                // Update document
                                                console.log("⭐ Updating Firestore directly");
                                                updateDoc(docRef, {
                                                  workouts: data.workouts,
                                                  updatedAt: new Date().toISOString()
                                                }).then(() => {
                                                  console.log("⭐ SAVE SUCCESS!");
                                                  // Update local state to show completion
                                                  setExerciseStates(prev => ({
                                                    ...prev,
                                                    [stateKey]: {
                                                      ...prev[stateKey],
                                                      completed: true
                                                    }
                                                  }));
                                                }).catch(err => {
                                                  console.error("⭐ SAVE ERROR:", err);
                                                });
                                              }).catch(err => {
                                                console.error("Error fetching document:", err);
                                              });
                                            }}
                                            className="p-1 rounded-full bg-gray-700 hover:bg-gray-600"
                                            title="Save weight and reps"
                                          >
                                            {exerciseState.completed ? (
                                              <CheckCircle className="w-4 h-4 text-neon-green" />
                                            ) : (
                                              <Save className="w-4 h-4 text-white" />
                                            )}
                                          </button>
                                        ) : (
                                          <div className="w-5 h-5 rounded-full border-2 border-gray-600"></div>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          })}
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
          ) : (
            <div className="bg-black/20 p-6 rounded-lg text-center">
              <p className="text-gray-400 mb-3">No workouts planned for Week {selectedWeek}</p>
              <Link 
                href={`/mesocycle/${mesocycle.id}/week/${selectedWeek}/workout/new`}
                className="btn-primary inline-flex items-center gap-2"
              >
                <Plus className="w-4 h-4" /> Add Workout
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 