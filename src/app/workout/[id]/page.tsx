'use client';

import { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useRouter } from 'next/navigation';
import { RootState } from '@/lib/store';
import { ArrowLeft, CheckCircle, Circle, Dumbbell, Clock, Plus, Trash, Save, X, ThumbsUp, ThumbsDown, Info } from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';
import LoadingScreen from '@/components/LoadingScreen';
import { updateWorkoutProgress } from '@/lib/slices/workoutSlice';
import { useAuth } from '@/lib/hooks/useAuth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/firebase';

export default function WorkoutDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const dispatch = useDispatch();
  const { user } = useAuth();
  const { currentMesocycle, mesocycles } = useSelector((state: RootState) => state.workout);
  
  const [loading, setLoading] = useState(true);
  const [workout, setWorkout] = useState<any>(null);
  const [exercises, setExercises] = useState<any[]>([]);
  const [activeExercise, setActiveExercise] = useState<number | null>(null);
  const [completedSets, setCompletedSets] = useState<Set<string>>(new Set());
  const [timerActive, setTimerActive] = useState(false);
  const [timer, setTimer] = useState(90); // Default rest timer in seconds
  const [initialTimer, setInitialTimer] = useState(90);
  
  // Feedback survey states
  const [showSurvey, setShowSurvey] = useState(false);
  const [feedback, setFeedback] = useState({
    muscleGroups: {} as Record<string, string>, // muscle group -> feeling
    overallDifficulty: "" as "Too Easy" | "Just Right" | "Too Hard" | "",
    notes: "",
  });
  
  // Find workout details from mesocycle
  useEffect(() => {
    if (currentMesocycle) {
      // Find the workout in the current mesocycle
      let foundWorkout = null;
      
      // Search through all weeks
      for (const [weekNum, weekWorkouts] of Object.entries(currentMesocycle.workouts)) {
        const found = weekWorkouts.find((w: any) => w.id === params.id);
        if (found) {
          foundWorkout = { ...found, weekNum };
          break;
        }
      }
      
      if (foundWorkout) {
        setWorkout(foundWorkout);
        
        // Prepare exercises with their sets
        const exerciseList = foundWorkout.exercises.map((exercise: any) => {
          // Use generated sets if available, otherwise create them
          const sets = exercise.generatedSets || Array.from({ length: exercise.sets }, (_, i) => ({
            id: `${exercise.id}-set-${i+1}`,
            number: i + 1,
            targetReps: exercise.reps,
            targetWeight: exercise.weight || "",
            completedReps: "",
            completedWeight: "",
          }));
          
          return {
            ...exercise,
            sets,
          };
        });
        
        setExercises(exerciseList);
        setLoading(false);
      } else {
        // If not found in current mesocycle, search in all mesocycles
        for (const mesocycle of mesocycles) {
          for (const [weekNum, weekWorkouts] of Object.entries(mesocycle.workouts)) {
            const found = weekWorkouts.find((w: any) => w.id === params.id);
            if (found) {
              foundWorkout = { ...found, weekNum };
              setWorkout(foundWorkout);
              
              // Prepare exercises with their sets
              const exerciseList = foundWorkout.exercises.map((exercise: any) => {
                // Use generated sets if available, otherwise create them
                const sets = exercise.generatedSets || Array.from({ length: exercise.sets }, (_, i) => ({
                  id: `${exercise.id}-set-${i+1}`,
                  number: i + 1,
                  targetReps: exercise.reps,
                  targetWeight: exercise.weight || "",
                  completedReps: "",
                  completedWeight: "",
                }));
                
                return {
                  ...exercise,
                  sets,
                };
              });
              
              setExercises(exerciseList);
              setLoading(false);
              return;
            }
          }
        }
        
        // If still not found, handle the error
        if (!foundWorkout) {
          console.error("Workout not found:", params.id);
          setLoading(false);
        }
      }
    }
  }, [currentMesocycle, mesocycles, params.id]);
  
  // Timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (timerActive && timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    } else if (timer === 0) {
      setTimerActive(false);
    }
    
    return () => clearInterval(interval);
  }, [timerActive, timer]);
  
  // Format time from seconds to MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  
  // Handle set completion
  const toggleSetCompletion = (exerciseId: string, setId: string) => {
    const uniqueId = `${exerciseId}-${setId}`;
    const newCompletedSets = new Set(completedSets);
    
    if (newCompletedSets.has(uniqueId)) {
      newCompletedSets.delete(uniqueId);
    } else {
      newCompletedSets.add(uniqueId);
      
      // Find the exercise and set in our data
      const exerciseIndex = exercises.findIndex(ex => ex.id === exerciseId);
      if (exerciseIndex !== -1) {
        const exercise = exercises[exerciseIndex];
        const setIndex = exercise.sets.findIndex((s: any) => s.id === setId);
        
        if (setIndex !== -1) {
          const set = exercise.sets[setIndex];
          const weight = set.completedWeight || set.targetWeight || '';
          const reps = set.completedReps || set.targetReps || '';
          
          // Only save if we have data
          if (weight && reps && currentMesocycle && user) {
            console.log("⭐ Saving set data to Firebase:", {
              exerciseId, 
              setId,
              weight, 
              reps,
              setNumber: setIndex + 1
            });
            
            // Find where this workout is in the mesocycle
            let weekKey = '';
            let workoutIndex = -1;
            let exerciseDocIndex = -1;
            
            // Search through mesocycle.workouts to find this workout
            if (currentMesocycle.workouts) {
              Object.entries(currentMesocycle.workouts).forEach(([week, workouts]: [string, any]) => {
                workouts.forEach((workout: any, idx: number) => {
                  if (workout.id === params.id) {
                    weekKey = week;
                    workoutIndex = idx;
                    
                    // Find exercise
                    workout.exercises.forEach((ex: any, exIdx: number) => {
                      if (ex.id === exerciseId) {
                        exerciseDocIndex = exIdx;
                      }
                    });
                  }
                });
              });
            }
            
            // If we found all the path components, save to Firebase
            if (weekKey && workoutIndex !== -1 && exerciseDocIndex !== -1) {
              const docRef = doc(db, 'mesocycles', currentMesocycle.id);
              
              // Get current document
              getDoc(docRef).then(docSnap => {
                if (!docSnap.exists()) {
                  console.error("Mesocycle not found in Firebase");
                  return;
                }
                
                // Get data
                const data = docSnap.data();
                
                // Verify path exists
                if (!data.workouts || !data.workouts[weekKey] || 
                    !data.workouts[weekKey][workoutIndex] || 
                    !data.workouts[weekKey][workoutIndex].exercises ||
                    !data.workouts[weekKey][workoutIndex].exercises[exerciseDocIndex]) {
                  console.error("Invalid path to exercise in Firebase document");
                  return;
                }
                
                // Get the exercise to update
                const exerciseDoc = data.workouts[weekKey][workoutIndex].exercises[exerciseDocIndex];
                
                // Initialize generatedSets if needed
                if (!exerciseDoc.generatedSets) {
                  exerciseDoc.generatedSets = [];
                  for (let i = 0; i < exercise.sets.length; i++) {
                    exerciseDoc.generatedSets.push({
                      id: `${exerciseDoc.id}-set-${i+1}`,
                      number: i + 1,
                      targetReps: exerciseDoc.reps,
                      targetWeight: exerciseDoc.weight || "",
                      completedReps: "",
                      completedWeight: ""
                    });
                  }
                }
                
                // Update ONLY the specific set
                if (Array.isArray(exerciseDoc.generatedSets) && 
                    exerciseDoc.generatedSets.length > setIndex && 
                    exerciseDoc.generatedSets[setIndex]) {
                  
                  // Update the specific set
                  exerciseDoc.generatedSets[setIndex].completedWeight = weight;
                  exerciseDoc.generatedSets[setIndex].completedReps = reps;
                  
                  console.log("⭐ Updated specific set:", {
                    setIndex,
                    weight, 
                    reps,
                    setData: exerciseDoc.generatedSets[setIndex]
                  });
                  
                  // Mark exercise as completed if any set is completed
                  exerciseDoc.completed = true;
                  
                  // Update document with set-specific changes
                  console.log("⭐ Updating exercise with set-specific data:", exerciseDoc.name);
                  updateDoc(docRef, {
                    workouts: data.workouts,
                    updatedAt: new Date().toISOString()
                  }).then(() => {
                    console.log("⭐ Successfully updated specific set in Firebase");
                  }).catch(error => {
                    console.error("⭐ Error updating set in Firebase:", error);
                  });
                } else {
                  console.error("Generated sets not properly initialized or set index out of bounds", {
                    hasGeneratedSets: !!exerciseDoc.generatedSets,
                    generatedSetsLength: exerciseDoc.generatedSets?.length,
                    setIndex
                  });
                }
              }).catch(error => {
                console.error("Error getting mesocycle document:", error);
              });
            } else {
              console.error("Could not find path to exercise in mesocycle:", {
                weekKey, workoutIndex, exerciseDocIndex
              });
            }
          }
        }
      }
      
      // Start rest timer when a set is completed
      setTimer(initialTimer);
      setTimerActive(true);
    }
    
    setCompletedSets(newCompletedSets);
  };
  
  // Handle updating set details
  const updateSetDetails = (exerciseIndex: number, setIndex: number, field: string, value: any) => {
    // Create a deep clone of the exercises array and all nested objects
    const updatedExercises = exercises.map((exercise, idx) => {
      if (idx !== exerciseIndex) return exercise;
      
      // Deep clone this exercise
      return {
        ...exercise,
        sets: exercise.sets.map((set: any, setIdx: number) => {
          if (setIdx !== setIndex) return set;
          
          // Create a new set with the updated field
          return {
            ...set,
            [field]: value
          };
        })
      };
    });
    
    setExercises(updatedExercises);
  };
  
  // Show the feedback survey
  const initiateSurvey = () => {
    // Create initial muscle group feedback
    const muscleGroups: Record<string, string> = {};
    exercises.forEach(ex => {
      // Get generic muscle group from exercise name (simplified approach)
      let muscleGroup = "general";
      if (ex.name.toLowerCase().includes("chest") || ex.name.toLowerCase().includes("press")) {
        muscleGroup = "chest";
      } else if (ex.name.toLowerCase().includes("back") || ex.name.toLowerCase().includes("row") || ex.name.toLowerCase().includes("pull")) {
        muscleGroup = "back";
      } else if (ex.name.toLowerCase().includes("leg") || ex.name.toLowerCase().includes("squat")) {
        muscleGroup = "legs";
      }
      
      if (!muscleGroups[muscleGroup]) {
        muscleGroups[muscleGroup] = "";
      }
    });
    
    setFeedback({
      ...feedback,
      muscleGroups
    });
    
    setShowSurvey(true);
  };
  
  // Update feedback for a specific muscle group
  const updateMuscleGroupFeedback = (muscleGroup: string, value: string) => {
    setFeedback({
      ...feedback,
      muscleGroups: {
        ...feedback.muscleGroups,
        [muscleGroup]: value
      }
    });
  };
  
  // Calculate suggested weights for next week based on current performance
  const calculateNextWeekSuggestions = () => {
    // For each exercise, analyze completed sets
    const suggestions: Record<string, { weight: number, reps: number, sets: number }> = {};
    
    exercises.forEach(exercise => {
      const completedSetsForExercise = exercise.sets.filter((set: any, i: number) => 
        completedSets.has(`${exercise.id}-${set.id}`)
      );
      
      if (completedSetsForExercise.length > 0) {
        // Calculate average weight and reps from completed sets
        const avgWeight = completedSetsForExercise.reduce((sum: number, set: any) => 
          sum + (parseInt(set.completedWeight) || 0), 0) / completedSetsForExercise.length;
          
        const avgReps = completedSetsForExercise.reduce((sum: number, set: any) => 
          sum + (parseInt(set.completedReps) || parseInt(set.targetReps) || 0), 0) / completedSetsForExercise.length;
        
        // Calculate suggested weight increase based on feedback difficulty
        let weightModifier = 1.05; // Default 5% increase
        if (feedback.overallDifficulty === "Too Hard") {
          weightModifier = 1.025; // Only 2.5% if it was very hard
        } else if (feedback.overallDifficulty === "Too Easy") {
          weightModifier = 1.075; // 7.5% if it was too easy
        }
        
        // Only include suggestions if we have valid weight/reps data
        if (avgWeight > 0) {
          suggestions[exercise.id] = {
            weight: Math.round(avgWeight * weightModifier),
            reps: Math.round(avgReps),
            sets: exercise.sets.length
          };
        }
      }
    });
    
    return suggestions;
  };
  
  // Mark workout as complete with feedback
  const completeWorkout = () => {
    if (!workout || !user) return;
    
    // Calculate suggestions for next week
    const suggestions = calculateNextWeekSuggestions();
    
    // Calculate progress data
    const totalSets = exercises.reduce((acc, ex) => acc + ex.sets.length, 0);
    const completedSetCount = completedSets.size;
    const progressPercentage = Math.round((completedSetCount / totalSets) * 100);
    
    // Prepare workout completion data
    const completionData = {
      id: workout.id,
      userId: user.uid,
      date: new Date().toISOString(),
      name: workout.name,
      mesocycleId: currentMesocycle?.id,
      week: workout.weekNum,
      exercises: exercises.map(ex => ({
        id: ex.id,
        name: ex.name,
        suggestions: suggestions[ex.id] || null,
        sets: ex.sets.map((set: any) => ({
          reps: set.completedReps || set.targetReps,
          weight: set.completedWeight || set.targetWeight,
          completed: completedSets.has(`${ex.id}-${set.id}`)
        }))
      })),
      feedback: feedback,
      weekRPE: workout.weekRPE,
      progress: progressPercentage,
      completed: progressPercentage === 100,
    };
    
    // Update workout progress in store/database
    try {
      dispatch(updateWorkoutProgress(completionData) as any);
      router.push('/dashboard');
    } catch (error) {
      console.error('Error completing workout:', error);
    }
  };
  
  // Change rest timer
  const changeRestTimer = (seconds: number) => {
    setInitialTimer(seconds);
    setTimer(seconds);
  };
  
  if (loading) {
    return <LoadingScreen message="Loading workout..." />;
  }
  
  if (!workout) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <div className="card p-8 max-w-md w-full text-center">
          <h2 className="text-xl font-bold mb-4">Workout Not Found</h2>
          <p className="text-gray-400 mb-6">The workout you&apos;re looking for doesn&apos;t exist or has been deleted.</p>
          <Link href="/dashboard" className="btn-primary">
            Go to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  // Show feedback survey if active
  if (showSurvey) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-6 pb-24">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-2xl font-bold">Workout Complete</h1>
            <p className="text-gray-400 mt-1">How did it go?</p>
          </div>
        </div>
        
        <div className="card p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">Overall Difficulty</h2>
          <div className="flex gap-4">
            <button 
              onClick={() => setFeedback({...feedback, overallDifficulty: "Too Easy"})}
              className={`flex-1 py-3 px-2 rounded-lg flex flex-col items-center justify-center ${
                feedback.overallDifficulty === "Too Easy" 
                  ? 'bg-green-500/30 border border-green-500/50' 
                  : 'bg-gray-800'
              }`}
            >
              <ThumbsDown className="w-6 h-6 mb-2 rotate-180" />
              <span>Too Easy</span>
            </button>
            
            <button 
              onClick={() => setFeedback({...feedback, overallDifficulty: "Just Right"})}
              className={`flex-1 py-3 px-2 rounded-lg flex flex-col items-center justify-center ${
                feedback.overallDifficulty === "Just Right" 
                  ? 'bg-neon-green/30 border border-neon-green/50' 
                  : 'bg-gray-800'
              }`}
            >
              <ThumbsUp className="w-6 h-6 mb-2" />
              <span>Just Right</span>
            </button>
            
            <button 
              onClick={() => setFeedback({...feedback, overallDifficulty: "Too Hard"})}
              className={`flex-1 py-3 px-2 rounded-lg flex flex-col items-center justify-center ${
                feedback.overallDifficulty === "Too Hard" 
                  ? 'bg-red-500/30 border border-red-500/50' 
                  : 'bg-gray-800'
              }`}
            >
              <ThumbsDown className="w-6 h-6 mb-2" />
              <span>Too Hard</span>
            </button>
          </div>
        </div>
        
        <div className="card p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">Muscle Group Feedback</h2>
          <div className="space-y-4">
            {Object.entries(feedback.muscleGroups).map(([muscleGroup, feeling]) => (
              <div key={muscleGroup} className="border-b border-gray-800 pb-4 last:border-0">
                <p className="text-gray-300 mb-2 capitalize">{muscleGroup}</p>
                <div className="flex gap-3">
                  <button 
                    onClick={() => updateMuscleGroupFeedback(muscleGroup, "Great Pump")}
                    className={`flex-1 py-2 px-1 rounded ${
                      feeling === "Great Pump" ? 'bg-green-500/30' : 'bg-gray-800'
                    }`}
                  >
                    Great Pump
                  </button>
                  <button 
                    onClick={() => updateMuscleGroupFeedback(muscleGroup, "Adequate")}
                    className={`flex-1 py-2 px-1 rounded ${
                      feeling === "Adequate" ? 'bg-blue-500/30' : 'bg-gray-800'
                    }`}
                  >
                    Adequate
                  </button>
                  <button 
                    onClick={() => updateMuscleGroupFeedback(muscleGroup, "Not Enough")}
                    className={`flex-1 py-2 px-1 rounded ${
                      feeling === "Not Enough" ? 'bg-yellow-500/30' : 'bg-gray-800'
                    }`}
                  >
                    Not Enough
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        <div className="card p-6 mb-8">
          <h2 className="text-xl font-bold mb-4">Notes</h2>
          <textarea
            value={feedback.notes}
            onChange={(e) => setFeedback({...feedback, notes: e.target.value})}
            placeholder="Any additional notes about this workout..."
            className="w-full h-32 bg-gray-800 rounded p-3 resize-none"
          />
        </div>
        
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-black/80 backdrop-blur-sm border-t border-gray-800">
          <div className="max-w-3xl mx-auto flex justify-between gap-4">
            <button 
              onClick={() => setShowSurvey(false)}
              className="btn-secondary flex-1 py-3"
            >
              Back
            </button>
            <button 
              onClick={completeWorkout}
              className="btn-primary flex-1 py-3 flex items-center justify-center gap-2"
            >
              <Save className="w-4 h-4" /> Save & Complete
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 pb-24">
      {/* Header */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <button
            onClick={() => router.back()}
            className="flex items-center text-gray-400 hover:text-white mb-2"
          >
            <ArrowLeft className="w-4 h-4 mr-1" /> Back
          </button>
          <h1 className="text-2xl font-bold">{workout.name}</h1>
          <p className="text-neon-green mt-1 text-sm">Week {workout.weekNum}</p>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-gray-800 rounded-full px-3 py-1">
            <Clock className="w-4 h-4 mr-2 text-gray-400" />
            <span className={`font-mono ${timerActive ? 'text-neon-green' : 'text-gray-400'}`}>
              {formatTime(timer)}
            </span>
          </div>
          <button 
            onClick={() => setTimerActive(!timerActive)}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-800"
          >
            {timerActive ? <X className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </button>
        </div>
      </div>
      
      {/* Weekly RPE Target */}
      {workout.weekRPE && (
        <div className="card p-4 mb-6 bg-gradient-to-r from-neon-green/10 to-transparent border-l-4 border-neon-green">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-neon-green shrink-0 mt-0.5" />
            <div>
              <h3 className="font-medium text-neon-green text-sm">Week {workout.weekNum} RPE Target: {workout.weekRPE.min}-{workout.weekRPE.max}</h3>
              <p className="text-sm text-gray-300 mt-1">{workout.weekRPE.label}</p>
            </div>
          </div>
        </div>
      )}
      
      {/* Rest Timer Settings */}
      <div className="card p-4 mb-6">
        <h3 className="text-sm font-medium mb-2 text-gray-300">Rest Timer</h3>
        <div className="flex gap-2">
          {[60, 90, 120, 180, 240].map((seconds) => (
            <button
              key={seconds}
              onClick={() => changeRestTimer(seconds)}
              className={`flex-1 py-1 px-2 rounded text-xs font-medium ${
                initialTimer === seconds 
                  ? 'bg-neon-green text-black' 
                  : 'bg-gray-800 text-gray-300'
              }`}
            >
              {formatTime(seconds)}
            </button>
          ))}
        </div>
      </div>
      
      {/* Exercise List */}
      <div className="space-y-4 mb-8">
        {exercises.map((exercise, exerciseIndex) => (
          <div 
            key={exercise.id} 
            className={`card overflow-hidden ${activeExercise === exerciseIndex ? 'border border-neon-green' : ''}`}
          >
            {/* Exercise Header */}
            <div 
              className="p-4 cursor-pointer"
              onClick={() => setActiveExercise(activeExercise === exerciseIndex ? null : exerciseIndex)}
            >
              <div className="flex justify-between items-center">
                <h3 className="font-bold">{exercise.name}</h3>
                <div className="text-sm text-gray-400">
                  {exercise.sets.length} sets x {exercise.reps} reps
                </div>
              </div>
              
              {/* Progress bar */}
              <div className="w-full h-1 bg-gray-800 mt-3 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-neon-green"
                  style={{ 
                    width: `${Math.round(
                      (exercise.sets.filter((_: any, i: number) => 
                        completedSets.has(`${exercise.id}-${exercise.sets[i].id}`)
                      ).length / exercise.sets.length) * 100
                    )}%` 
                  }}
                />
              </div>
            </div>
            
            {/* Sets (expanded when active) */}
            {activeExercise === exerciseIndex && (
              <div className="border-t border-gray-800">
                <div className="p-4">
                  <div className="text-xs text-gray-500 flex mb-3">
                    <div className="w-8 text-center">#</div>
                    <div className="flex-1 text-center">WEIGHT</div>
                    <div className="flex-1 text-center">REPS</div>
                    <div className="w-12 text-center">DONE</div>
                  </div>
                  
                  {exercise.sets.map((set: any, setIndex: number) => (
                    <div key={set.id} className="flex items-center py-2 border-t border-gray-800/50">
                      <div className="w-8 text-center text-sm">{set.number || setIndex + 1}</div>
                      
                      <div className="flex-1 px-2 flex justify-center">
                        <input
                          type="number"
                          value={set.completedWeight}
                          onChange={(e) => updateSetDetails(
                            exerciseIndex, 
                            setIndex, 
                            'completedWeight', 
                            e.target.value
                          )}
                          className="w-48 bg-gray-800 rounded text-center py-2 focus:ring-1 focus:ring-neon-green outline-none"
                          min="0"
                          placeholder="0"
                        />
                      </div>
                      
                      <div className="flex-1 px-2 flex justify-center">
                        <input
                          type="number"
                          value={set.completedReps || set.targetReps}
                          onChange={(e) => updateSetDetails(
                            exerciseIndex, 
                            setIndex, 
                            'completedReps', 
                            e.target.value
                          )}
                          className="w-48 bg-gray-800 rounded text-center py-2 focus:ring-1 focus:ring-neon-green outline-none"
                          min="0"
                          placeholder="0"
                        />
                      </div>
                      
                      <div className="w-12 flex justify-center">
                        <button
                          onClick={() => toggleSetCompletion(exercise.id, set.id)}
                          className="w-6 h-6 flex items-center justify-center"
                        >
                          {completedSets.has(`${exercise.id}-${set.id}`) ? (
                            <CheckCircle className="w-5 h-5 text-neon-green" />
                          ) : (
                            <Circle className="w-5 h-5 text-gray-600" />
                          )}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="p-4 border-t border-gray-800 bg-black/30">
                  <div className="flex justify-between items-center">
                    <div className="text-sm text-gray-400">
                      <span className="text-neon-green font-medium">
                        {exercise.sets.filter((_: any, i: number) => 
                          completedSets.has(`${exercise.id}-${exercise.sets[i].id}`)
                        ).length}
                      </span> / {exercise.sets.length} sets completed
                    </div>
                    <div className="flex gap-2">
                      <button className="btn-secondary py-1 px-3 text-sm">
                        <Plus className="w-3 h-3 mr-1" /> Add Set
                      </button>
                      <button className="text-red-500 py-1 px-2 text-sm">
                        <Trash className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
      
      {/* Action Buttons */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-black/80 backdrop-blur-sm border-t border-gray-800">
        <div className="max-w-3xl mx-auto flex justify-between gap-4">
          <button 
            onClick={() => router.back()}
            className="btn-secondary flex-1 py-3"
          >
            Cancel
          </button>
          <button 
            onClick={initiateSurvey}
            className="btn-primary flex-1 py-3 flex items-center justify-center gap-2"
          >
            <CheckCircle className="w-4 h-4" /> Complete Workout
          </button>
        </div>
      </div>
    </div>
  );
}

function Play({ className }: { className?: string }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <polygon points="5 3 19 12 5 21 5 3"></polygon>
    </svg>
  );
} 