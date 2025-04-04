'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useSelector, useDispatch } from 'react-redux';
import { useAuth } from '@/lib/hooks/useAuth';
import { RootState } from '@/lib/store';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/firebase';
import { isPwa } from '@/lib/firebase/firebaseUtils';
import { 
  ArrowLeft, 
  Check, 
  CheckCircle, 
  Copy, 
  Timer, 
  ThumbsUp, 
  ThumbsDown, 
  Save, 
  Clock, 
  X, 
  Info, 
  Circle, 
  Plus, 
  Trash, 
  AlertTriangle,
  Dumbbell,
  Volume2,
  VolumeX
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { Modal } from "@/components/ui/Modal";
import Link from 'next/link';
import { format } from 'date-fns';
import LoadingScreen from '@/components/LoadingScreen';
import { updateWorkoutProgress, updateMesocycleAsync, fetchMesocycleByIdAsync } from '@/lib/slices/workoutSlice';
import WeightFeelingSurvey from '@/components/WeightFeelingSurvey';

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
  const [soundEnabled, setSoundEnabled] = useState(true);
  // Add a ref to track if we've already attempted to fetch fresh data
  const freshDataFetchedRef = useRef(false);
  
  // Audio reference for timer completion sound
  const timerAudioRef = useRef<HTMLAudioElement | null>(null);
  
  // Function to show notifications using Service Worker when available
  const showNotificationWithServiceWorker = (title: string, options: any) => {
    // Try to use service worker for notifications first (better for background support)
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'SHOW_NOTIFICATION',
        title,
        options: {
          ...options,
          data: {
            ...options.data,
            url: window.location.href, // Pass current URL to open if notification is clicked
          }
        }
      });
      console.log('Sent notification request to service worker');
      return true;
    } 
    
    // Fallback to regular web notifications
    else if ('Notification' in window && Notification.permission === 'granted') {
      try {
        const notification = new Notification(title, options);
        console.log('Showed notification using Web Notifications API');
        return true;
      } catch (e) {
        console.error('Error showing notification:', e);
        return false;
      }
    }
    
    return false;
  };
  
  // Initialize audio element
  useEffect(() => {
    if (typeof window !== 'undefined') {
      timerAudioRef.current = new Audio('/sounds/timer-complete.mp3');
      
      // Request notification permission if not already granted or denied
      if (isPwa() && 'Notification' in window && Notification.permission === 'default') {
        // Slight delay to not overwhelm the user on first load
        setTimeout(() => {
          Notification.requestPermission().then(permission => {
            console.log(`Notification permission: ${permission}`);
          });
        }, 2000);
      }
    }
    
    // Try to load sound preferences from localStorage
    const savedSound = localStorage.getItem('workoutTimerSound');
    if (savedSound !== null) {
      setSoundEnabled(savedSound === 'true');
    }
    
    return () => {
      if (timerAudioRef.current) {
        timerAudioRef.current.pause();
        timerAudioRef.current = null;
      }
    };
  }, []);
  
  // Feedback survey states
  const [showSurvey, setShowSurvey] = useState(false);
  const [feedback, setFeedback] = useState({
    muscleGroups: {} as Record<string, string>, // muscle group -> feeling
    overallDifficulty: "" as "Too Easy" | "Just Right" | "Too Hard" | "",
    notes: "",
  });
  
  // Weight feeling survey state
  const [weightSurveyOpen, setWeightSurveyOpen] = useState(false);
  const [surveyExercise, setSurveyExercise] = useState<any>(null);
  const [surveyShownForExercise, setSurveyShownForExercise] = useState<{[key: string]: boolean}>({});
  
  const [isCompleting, setIsCompleting] = useState(false);
  const [suggestionModalOpen, setSuggestionModalOpen] = useState(false);
  const [weightSuggestions, setWeightSuggestions] = useState<Record<string, { weight: number, reps: number, sets: number, exerciseName: string, exerciseId: string }>>({});
  
  // Delete exercise confirmation modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [exerciseToDelete, setExerciseToDelete] = useState<any>(null);
  
  // Add Exercise modal state
  const [addExerciseModalOpen, setAddExerciseModalOpen] = useState(false);
  const [newExercise, setNewExercise] = useState({
    name: "",
    sets: 3,
    reps: 10,
    weight: "",
    muscleGroup: "other",
    propagateToAllWeeks: true
  });
  
  // Track if we've fetched data in this session
  const hasInitialFetchRef = useRef(false);
  
  // Ref to track if we've already fetched data based on the timestamp
  const timestampFetchedRef = useRef(false);
  
  // Track data fetching state with useState
  const [dataFetched, setDataFetched] = useState(false);
  
  // Find workout details from mesocycle
  useEffect(() => {
    // Only fetch if we have the required data and haven't fetched yet
    if (!user || !params.id || dataFetched) return;
    
    // Mark as fetched to prevent further fetches
    setDataFetched(true);
    
    // Only fetch if we have the required data
    if (!user || !params.id) return;
    
    // Parse query parameters from URL for the timestamp
    const urlParams = new URLSearchParams(window.location.search);
    const timestamp = urlParams.get('t');
    
    // If we already fetched for this timestamp, don't fetch again
    if (timestamp && timestampFetchedRef.current) {
      return;
    }
    
    const fetchWorkoutData = async () => {
      setLoading(true);
      if (timestamp) {
        timestampFetchedRef.current = true;
      }
      
      // Helper function to process workout data and update state
      const processWorkoutData = (foundWorkout: any) => {
        setWorkout(foundWorkout);
        
        // Create a temporary set to collect all completed sets before updating state
        const completedSetsTemp = new Set<string>();
        
        // Prepare exercises with their sets
        const exerciseList = foundWorkout.exercises.map((exercise: any) => {
          // Use generatedSets if available, otherwise create them
          let generatedSets = [];
          
          if (exercise.generatedSets && Array.isArray(exercise.generatedSets)) {
            // Use existing generatedSets
            generatedSets = exercise.generatedSets;
            console.log(`⭐ Found ${generatedSets.length} existing generatedSets for ${exercise.name}`);
            
            // Mark sets with completion data as completed
            generatedSets.forEach((set: any, index: number) => {
              if (set.completedWeight || set.completedReps) {
                const uniqueId = `${exercise.id}-${set.id}`;
                completedSetsTemp.add(uniqueId);
                console.log(`⭐ Auto-marking completed set from DB: ${exercise.name} set #${index+1}, weight: ${set.completedWeight}, reps: ${set.completedReps}`);
              }
            });
          } else {
            // Create new generatedSets with only required fields
            generatedSets = Array.from({ length: parseInt(exercise.sets) || 3 }, (_, i) => ({
            id: `${exercise.id}-set-${i+1}`,
            number: i + 1,
            targetReps: exercise.reps,
            targetWeight: exercise.weight || "",
            completedReps: "",
            completedWeight: ""
          }));
            console.log(`⭐ Created ${generatedSets.length} new generatedSets for ${exercise.name}`);
          }
          
          // Reset completedSets state
          setCompletedSets(new Set());
          
          // Update completedSets state with any already completed sets
          generatedSets.forEach((set: any, index: number) => {
            if (set.completedWeight && set.completedReps) {
              // This set has completion data, mark it as completed
              const uniqueId = `${exercise.id}-${set.id}`;
              setCompletedSets(prev => {
                const newSet = new Set(prev);
                newSet.add(uniqueId);
                return newSet;
              });
              console.log(`⭐ Found completed set: ${exercise.name} set #${index+1}`);
            }
          });
          
          return {
            ...exercise,
            sets: generatedSets
          };
        });
        
        // Set the completed sets all at once after processing all exercises
        if (completedSetsTemp.size > 0) {
          console.log(`⭐ Setting ${completedSetsTemp.size} completed sets from database`);
          setCompletedSets(completedSetsTemp);
        } else {
          // If no completed sets were found, reset to empty set
          setCompletedSets(new Set());
        }
        
        setExercises(exerciseList);
        setLoading(false);
      };
      
      // If user is authenticated, always fetch fresh data from Firestore
      if (user) {
        try {
          // Set the flag to true to prevent further fetches
          freshDataFetchedRef.current = true;
          
          // Search in current mesocycle first to find which mesocycle contains this workout
          let mesocycleId = currentMesocycle?.id;
          
          if (!mesocycleId) {
            // If no current mesocycle, search all mesocycles
        for (const mesocycle of mesocycles) {
          for (const [weekNum, weekWorkouts] of Object.entries(mesocycle.workouts)) {
                const found = (weekWorkouts as any[]).find((w: any) => w.id === params.id);
            if (found) {
                  mesocycleId = mesocycle.id;
                  break;
                }
              }
              if (mesocycleId) break;
            }
          }
          
          // If we found which mesocycle contains this workout, fetch fresh data exactly once
          if (mesocycleId) {
            console.log("⭐ Fetching fresh mesocycle data from Firestore:", mesocycleId);
            
            try {
              // Direct Firestore access instead of using Redux
              const docRef = doc(db, 'mesocycles', mesocycleId);
              const docSnap = await getDoc(docRef);
              
              if (docSnap.exists()) {
                const mesocycleData = docSnap.data();
                let foundWorkout = null;
                
                // Search through all weeks in the fresh data
                for (const [week, weekWorkouts] of Object.entries(mesocycleData.workouts || {})) {
                  const found = (weekWorkouts as any[]).find((w: any) => w.id === params.id);
                  if (found) {
                    foundWorkout = { ...found, weekNum: week.replace('week', '') };
                    break;
                  }
                }
                
                if (foundWorkout) {
                  console.log("⭐ Found workout with fresh data:", foundWorkout.name);
                  processWorkoutData(foundWorkout);
              return;
            }
          }
            } catch (error) {
              console.error("Error accessing Firestore directly:", error);
            }
            
            // As a fallback, if direct Firestore access fails, try Redux (but this might trigger a loop)
            // await dispatch(fetchMesocycleByIdAsync(mesocycleId) as any);
            
            // After fetching, the state will be updated
            // Now search for workout with the freshly fetched data
            const state = (dispatch as any).getState();
            const updatedMesocycle = state.workout.currentMesocycle || 
                                    state.workout.mesocycles.find((m: any) => m.id === mesocycleId);
            
            if (updatedMesocycle) {
              let foundWorkout = null;
              let weekNum = '';
              
              // Search through all weeks
              for (const [week, weekWorkouts] of Object.entries(updatedMesocycle.workouts)) {
                const found = (weekWorkouts as any[]).find((w: any) => w.id === params.id);
                if (found) {
                  foundWorkout = { ...found, weekNum: week.replace('week', '') };
                  weekNum = week;
                  break;
                }
              }
              
              if (foundWorkout) {
                console.log("⭐ Found workout with fresh data:", foundWorkout.name);
                processWorkoutData(foundWorkout);
              return;
            }
            }
          }
        } catch (error) {
          console.error("Error fetching fresh mesocycle data:", error);
          // Continue with fallback to Redux state below
        }
      }
      
      // Fallback to using current state data
      if (currentMesocycle) {
        // Find the workout in the current mesocycle
        let foundWorkout = null;
        
        // Search through all weeks
        for (const [weekNum, weekWorkouts] of Object.entries(currentMesocycle.workouts)) {
          const found = (weekWorkouts as any[]).find((w: any) => w.id === params.id);
          if (found) {
            foundWorkout = { ...found, weekNum: weekNum.replace('week', '') };
            break;
          }
        }
        
        if (foundWorkout) {
          processWorkoutData(foundWorkout);
          return;
        }
      }
      
      // If not found in current mesocycle, search in all mesocycles
      for (const mesocycle of mesocycles) {
        for (const [weekNum, weekWorkouts] of Object.entries(mesocycle.workouts)) {
          const found = (weekWorkouts as any[]).find((w: any) => w.id === params.id);
          if (found) {
            const foundWorkout = { ...found, weekNum: weekNum.replace('week', '') };
            processWorkoutData(foundWorkout);
            return;
          }
        }
      }
      
      // If still not found, handle the error
      console.error("Workout not found:", params.id);
      setLoading(false);
    };
    
    fetchWorkoutData();
  }, [user, params.id, currentMesocycle, mesocycles, dataFetched]);  // Removed window.location.search to prevent loop
  
  // Timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    let startTime: number;
    let lastVisibilityChange: number;
    let elapsedPausedTime: number = 0;
    
    // Track visibility changes to handle background timer
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        // App going to background - store current time
        lastVisibilityChange = Date.now();
        // Clear the interval when hidden as it may be throttled
        clearInterval(interval);
        
        // For PWA: Try to register the current state with service worker before app goes to background
        if (isPwa() && timer > 0 && timerActive) {
          // Store timer state in localStorage for recovery
          localStorage.setItem('workout_timer_active', 'true');
          localStorage.setItem('workout_timer_start', startTime.toString());
          localStorage.setItem('workout_timer_initial', initialTimer.toString());
          localStorage.setItem('workout_timer_value', timer.toString());
          localStorage.setItem('workout_timer_background_time', Date.now().toString());
        }
      } else {
        // App coming back to foreground
        if (lastVisibilityChange && timerActive && timer > 0) {
          // Calculate time spent in background
          const timeInBackground = Math.floor((Date.now() - lastVisibilityChange) / 1000);
          
          // Update timer considering background time
          const newTime = Math.max(0, timer - timeInBackground);
          setTimer(newTime);
          
          // If timer should have expired while in background
          if (newTime === 0) {
            setTimerActive(false);
            // Play completion sound even if it finished in background
            if (soundEnabled && timerAudioRef.current) {
              timerAudioRef.current.play().catch(e => console.error("Error playing timer sound:", e));
            }
            
            // Show notification using service worker (better for mobile PWA)
            showNotificationWithServiceWorker('Rest Timer Complete', {
              body: 'Time to start your next set!',
              icon: '/icons/icon-192x192.png',
              vibrate: [200, 100, 200],
              tag: 'workout-timer',
              requireInteraction: false
            });
          } else {
            // Restart the interval
            startTime = Date.now();
            elapsedPausedTime = 0;
            startInterval();
          }
        }
        
        // Check for recovery from PWA background state
        if (isPwa()) {
          try {
            const wasTimerActive = localStorage.getItem('workout_timer_active') === 'true';
            const storedBackgroundTime = localStorage.getItem('workout_timer_background_time');
            
            if (wasTimerActive && storedBackgroundTime && !timerActive) {
              const backgroundTimestamp = parseInt(storedBackgroundTime);
              const elapsedSinceBackground = Math.floor((Date.now() - backgroundTimestamp) / 1000);
              const storedTimer = parseInt(localStorage.getItem('workout_timer_value') || '0');
              const newTimer = Math.max(0, storedTimer - elapsedSinceBackground);
              
              // Only recover if it's been less than 5 minutes
              if ((Date.now() - backgroundTimestamp) < 5 * 60 * 1000) {
                if (newTimer <= 0) {
                  // Timer completed while in background
                  if (soundEnabled && timerAudioRef.current) {
                    timerAudioRef.current.play().catch(e => console.error("Error playing timer sound:", e));
                  }
                } else {
                  // Resume timer with adjusted time
                  setTimer(newTimer);
                  setTimerActive(true);
                  startTime = Date.now();
                  elapsedPausedTime = 0;
                  startInterval();
                }
              }
            }
            
            // Clear stored timer state
            localStorage.removeItem('workout_timer_active');
            localStorage.removeItem('workout_timer_start');
            localStorage.removeItem('workout_timer_value');
            localStorage.removeItem('workout_timer_background_time');
          } catch (e) {
            console.error('Error recovering timer state:', e);
          }
        }
      }
    };
    
    // Start interval function for consistent reference
    const startInterval = () => {
      clearInterval(interval);
      interval = setInterval(() => {
        const now = Date.now();
        const elapsed = Math.floor((now - startTime - elapsedPausedTime) / 1000);
        const newTime = Math.max(0, timer - elapsed);
        
        setTimer(newTime);
        
        if (newTime === 0) {
      setTimerActive(false);
          clearInterval(interval);
          
          // Play sound when timer completes
          if (soundEnabled && timerAudioRef.current) {
            timerAudioRef.current.play().catch(e => console.error("Error playing timer sound:", e));
          }
          
          // Show notification using service worker (better for mobile PWA)
          showNotificationWithServiceWorker('Rest Timer Complete', {
            body: 'Time to start your next set!',
            icon: '/icons/icon-192x192.png',
            vibrate: [200, 100, 200],
            tag: 'workout-timer',
            requireInteraction: false
          });
        }
      }, 100); // Check more frequently for accuracy
    };
    
    if (timerActive && timer > 0) {
      // Add visibility change listener
      document.addEventListener('visibilitychange', handleVisibilityChange);
      
      // Initialize start time
      startTime = Date.now();
      lastVisibilityChange = 0;
      elapsedPausedTime = 0;
      
      // Start the timer
      startInterval();
    }
    
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [timerActive, timer, soundEnabled, initialTimer]);
  
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
      // If we're unchecking a set
      newCompletedSets.delete(uniqueId);
      setCompletedSets(newCompletedSets);
    } else {
      // If we're checking a set (marking it as completed)
      newCompletedSets.add(uniqueId);
      
      // Request notification permission when user completes first set
      if ('Notification' in window && Notification.permission !== 'granted' && Notification.permission !== 'denied') {
        Notification.requestPermission().then(permission => {
          console.log(`Notification permission ${permission}`);
        }).catch(error => {
          console.error('Error requesting notification permission:', error);
        });
      }
      
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
                
                // Find or initialize the generatedSets array
                if (!exerciseDoc.generatedSets || !Array.isArray(exerciseDoc.generatedSets)) {
                  console.log("⭐ Creating generatedSets array for exercise", exerciseDoc.name);
                  exerciseDoc.generatedSets = Array.from({ length: exercise.sets.length }, (_, i) => ({
                      id: `${exerciseDoc.id}-set-${i+1}`,
                      number: i + 1,
                      targetReps: exerciseDoc.reps,
                      targetWeight: exerciseDoc.weight || "",
                      completedReps: "",
                      completedWeight: ""
                  }));
                }
                
                // Make sure the generatedSets array is long enough
                while (exerciseDoc.generatedSets.length <= setIndex) {
                  const newSetIndex = exerciseDoc.generatedSets.length;
                  exerciseDoc.generatedSets.push({
                    id: `${exerciseDoc.id}-set-${newSetIndex+1}`,
                    number: newSetIndex + 1,
                      targetReps: exerciseDoc.reps,
                      targetWeight: exerciseDoc.weight || "",
                      completedReps: "",
                      completedWeight: ""
                    });
                }
                
                // Update the specific set's completedWeight and completedReps
                if (setIndex >= 0 && setIndex < exerciseDoc.generatedSets.length) {
                  exerciseDoc.generatedSets[setIndex].completedWeight = weight;
                  exerciseDoc.generatedSets[setIndex].completedReps = reps;
                  
                  console.log("⭐ Updated set data in generatedSets:", {
                    exerciseName: exerciseDoc.name,
                    setIndex,
                    weight, 
                    reps
                  });
                } else {
                  console.error("Set index out of bounds", {
                    setIndex,
                    generatedSetsLength: exerciseDoc.generatedSets.length
                  });
                  return;
                }
                  
                  // Mark exercise as completed if any set is completed
                  exerciseDoc.completed = true;
                
                // Initialize feedback object if it doesn't exist
                if (!exerciseDoc.feedback) {
                  exerciseDoc.feedback = {
                    weightFeeling: "",
                    muscleActivation: "",
                    performanceRating: "",
                    notes: "",
                    timestamp: ""
                  };
                }
                  
                  // Update document with set-specific changes
                  console.log("⭐ Updating exercise with set-specific data:", exerciseDoc.name);
                  updateDoc(docRef, {
                    workouts: data.workouts,
                    updatedAt: new Date().toISOString()
                  }).then(() => {
                    console.log("⭐ Successfully updated specific set in Firebase");
                  
                  // Update completedSets with this new set
                  setCompletedSets(prev => {
                    // Create a new set with all previous values
                    const updatedCompletedSets = new Set(prev);
                    // Add the new unique ID
                    updatedCompletedSets.add(uniqueId);
                    
                    // Now check if all sets for this exercise are completed
                    const allSetsCompleted = exercise.sets.every((s: any) => 
                      updatedCompletedSets.has(`${exerciseId}-${s.id}`)
                    );
                    
                    console.log(`⭐ After adding ${uniqueId}, all sets completed: ${allSetsCompleted}`);
                    
                    // If all sets are now completed, show the survey
                    if (allSetsCompleted && weekKey && currentMesocycle) {
                      console.log(`⭐ All sets completed for ${exercise.name}, showing weight feeling survey!`);
                      
                      // Create a unique state key for this exercise
                      const stateKey = `${workout.id}-${exerciseId}`;
                      
                      // Check if we've already shown the survey for this exercise
                      if (!surveyShownForExercise[stateKey]) {
                        // Mark this exercise as having shown the survey
                        setSurveyShownForExercise(prev => ({
                          ...prev,
                          [stateKey]: true
                        }));
                        
                        // Prepare survey data
                        setSurveyExercise({
                          mesocycleId: currentMesocycle.id,
                          weekKey,
                          workoutIndex,
                          exerciseIndex: exerciseDocIndex,
                          exerciseName: exercise.name,
                          stateKey,
                          isAutoPopup: true
                        });
                        
                        // Open the survey with a slight delay to ensure state updates first
                        setTimeout(() => {
                          setWeightSurveyOpen(true);
                        }, 300);
                } else {
                        console.log(`⭐ Survey already shown for ${exercise.name}, not showing again`);
                      }
                    }
                    
                    return updatedCompletedSets;
                  });
                  
                }).catch(error => {
                  console.error("⭐ Error updating set in Firebase:", error);
                });
              }).catch(error => {
                console.error("Error getting mesocycle document:", error);
              });
            } else {
              console.error("Could not find path to exercise in mesocycle:", {
                weekKey, workoutIndex, exerciseDocIndex
              });
            }
          } else {
            // If we don't have weight/reps data but we're still marking the set as completed
            setCompletedSets(newCompletedSets);
          }
        } else {
          // Set not found, just update the state
          setCompletedSets(newCompletedSets);
        }
      } else {
        // Exercise not found, just update the state
        setCompletedSets(newCompletedSets);
      }
      
      // Start rest timer when a set is completed
      setTimer(initialTimer);
      setTimerActive(true);
    }
  };
  
  // Check if all sets for an exercise are completed and show the weight feeling survey
  const checkAndShowWeightSurvey = (exerciseId: string, exercise: any, weekKey: string, workoutIndex: number, exerciseIndex: number) => {
    // Skip if no mesocycle or workout or if we've already shown the survey for this exercise
    if (!currentMesocycle || !workout) {
      console.log("⭐ Cannot show survey: missing mesocycle or workout");
      return;
    }
    
    const stateKey = `${workout.id}-${exerciseId}`;
    if (surveyShownForExercise[stateKey]) {
      console.log(`⭐ Survey already shown for ${exercise.name}, skipping`);
      return;
    }
    
    // Count completed sets for this exercise
    let completedSetsCount = 0;
    const totalSets = exercise.sets.length;
    
    exercise.sets.forEach((set: any) => {
      const setKey = `${exerciseId}-${set.id}`;
      if (completedSets.has(setKey)) {
        completedSetsCount++;
      }
    });
    
    console.log(`⭐ Exercise: ${exercise.name}, Completed sets: ${completedSetsCount}/${totalSets}`);
    
    // If all sets are completed, show the survey
    if (completedSetsCount === totalSets) {
      console.log(`⭐ All ${totalSets} sets completed for ${exercise.name}, showing weight feeling survey`);
      
      // Mark this exercise as having shown the survey
      setSurveyShownForExercise(prev => ({
        ...prev,
        [stateKey]: true
      }));
      
      // Prepare survey data - using mesocycleId from the non-null currentMesocycle
      const mesocycleId = currentMesocycle.id; // Safe to use here because of the null check above
      
      setSurveyExercise({
        mesocycleId,
        weekKey,
        workoutIndex,
        exerciseIndex,
        exerciseName: exercise.name,
        stateKey,
        isAutoPopup: true
      });
      
      // Open the survey
      setWeightSurveyOpen(true);
    } else {
      console.log(`⭐ Not all sets completed for ${exercise.name} (${completedSetsCount}/${totalSets}), not showing survey yet`);
    }
  };
  
  // Handle updating set details
  const updateSetDetails = (exerciseIndex: number, setIndex: number, field: string, value: any) => {
    // Clone exercises to avoid direct state mutation
    const updatedExercises = [...exercises];
    const exercise = updatedExercises[exerciseIndex];
    const set = exercise.sets[setIndex];
    
    // Update the specified field
    set[field] = value;
    
    // Auto-check the "done" mark if both weight and reps are filled
    if (set.completedWeight && set.completedReps) {
      const uniqueId = `${exercise.id}-${set.id}`;
      
      // Only add to completedSets if it's not already there
      if (!completedSets.has(uniqueId)) {
        console.log(`⭐ Auto-marking set as completed: ${exercise.name} set #${setIndex + 1}`);
        setCompletedSets(prev => {
          const newSet = new Set(prev);
          newSet.add(uniqueId);
          return newSet;
        });
        
        // Also save the set data to Firebase (similar to what toggleSetCompletion does)
        if (currentMesocycle && user) {
          saveSetToFirebase(exercise.id, set.id, exercise, setIndex);
        }
      }
    }
    
    setExercises(updatedExercises);
  };
  
  // Function to save set data to Firebase
  const saveSetToFirebase = (exerciseId: string, setId: string, exercise: any, setIndex: number) => {
    const weight = exercise.sets[setIndex].completedWeight || exercise.sets[setIndex].targetWeight || '';
    const reps = exercise.sets[setIndex].completedReps || exercise.sets[setIndex].targetReps || '';
    
    // Only save if we have data
    if (weight && reps && currentMesocycle && user) {
      console.log("⭐ Auto-saving set data to Firebase:", {
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
          
          // Find or initialize the generatedSets array
          if (!exerciseDoc.generatedSets || !Array.isArray(exerciseDoc.generatedSets)) {
            console.log("⭐ Creating generatedSets array for exercise", exerciseDoc.name);
            exerciseDoc.generatedSets = Array.from({ length: exercise.sets.length }, (_, i) => ({
                id: `${exerciseDoc.id}-set-${i+1}`,
                number: i + 1,
                targetReps: exerciseDoc.reps,
                targetWeight: exerciseDoc.weight || "",
                completedReps: "",
                completedWeight: ""
            }));
          }
          
          // Make sure the generatedSets array is long enough
          while (exerciseDoc.generatedSets.length <= setIndex) {
            const newSetIndex = exerciseDoc.generatedSets.length;
            exerciseDoc.generatedSets.push({
              id: `${exerciseDoc.id}-set-${newSetIndex+1}`,
              number: newSetIndex + 1,
                targetReps: exerciseDoc.reps,
                targetWeight: exerciseDoc.weight || "",
                completedReps: "",
                completedWeight: ""
              });
          }
          
          // Update the specific set
          if (setIndex >= 0 && setIndex < exerciseDoc.generatedSets.length) {
            exerciseDoc.generatedSets[setIndex].completedWeight = weight;
            exerciseDoc.generatedSets[setIndex].completedReps = reps;
            exerciseDoc.generatedSets[setIndex].completed = true;
            exerciseDoc.generatedSets[setIndex].timestamp = new Date().toISOString();
            
            console.log("⭐ Auto-updated set data in Firebase:", {
              exerciseName: exerciseDoc.name,
              setIndex,
              weight, 
              reps,
              completed: true,
              timestamp: exerciseDoc.generatedSets[setIndex].timestamp
            });
            
            // Mark exercise as completed
            exerciseDoc.completed = true;
            
            // Update document with set-specific changes
            updateDoc(docRef, {
              workouts: data.workouts,
              updatedAt: new Date().toISOString()
            }).then(() => {
              console.log("⭐ Successfully auto-saved set data to Firebase");
            }).catch(error => {
              console.error("Error auto-saving set data to Firebase:", error);
            });
          }
        }).catch(error => {
          console.error("Error getting document for auto-save:", error);
        });
      }
    }
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
  
  // Helper function to update exercise and its generatedSets with suggestion
  const updateExerciseWithSuggestion = (
    exercise: any, 
    suggestion: { weight: number, reps: number, sets: number, exerciseName: string, exerciseId: string }
  ): boolean => {
    try {
      const suggestedWeight = suggestion.weight;
      const suggestedReps = suggestion.reps;
      
      // Log the values we're about to apply
      console.log(`⭐ UpdateExerciseWithSuggestion DETAILS:`, {
        exerciseName: exercise.name,
        exerciseId: exercise.id,
        fromExerciseName: suggestion.exerciseName,
        fromExerciseId: suggestion.exerciseId,
        rawSuggestedWeight: suggestedWeight,
        suggestedWeightString: suggestedWeight.toString(),
        suggestedReps,
        suggestedSets: suggestion.sets,
        hasGeneratedSets: Boolean(exercise.generatedSets)
      });
      
      // Validate the suggestion weight - ensure it's a reasonable value (greater than 0)
      if (!suggestedWeight || suggestedWeight <= 0) {
        console.log(`⭐ Invalid suggested weight (${suggestedWeight}) for exercise ${exercise.name}, cannot update`);
        return false;
      }
      
      // Convert to string with up to 2 decimal places for display
      let weightString = "";
      if (Math.floor(suggestedWeight) === suggestedWeight) {
        // It's a whole number, no decimal places needed
        weightString = Math.floor(suggestedWeight).toString();
      } else {
        // Has decimal places, format with up to 2 decimal places
        weightString = suggestedWeight.toFixed(2).replace(/\.?0+$/, '');
      }
      
      const repsString = suggestedReps.toString();
      
      // Update the generatedSets with new target weights and reps
      if (exercise.generatedSets && Array.isArray(exercise.generatedSets)) {
        console.log(`⭐ Updating ${exercise.generatedSets.length} generatedSets for ${exercise.name}`);
        
        // Loop through each set and update the target weight
        exercise.generatedSets.forEach((set: any, index: number) => {
          const originalWeight = set.targetWeight;
          const originalReps = set.targetReps;
          
          // Update target weight and reps
          set.targetWeight = weightString;
          set.targetReps = repsString;
          
          console.log(`⭐ [Set ${index + 1}] Updated for ${exercise.name}: target weight: ${originalWeight} → ${set.targetWeight}, target reps: ${originalReps} → ${set.targetReps}`);
        });
        
        // If we need more sets than current, add them
        if (exercise.generatedSets.length < suggestion.sets) {
          const setsToAdd = suggestion.sets - exercise.generatedSets.length;
          console.log(`⭐ Adding ${setsToAdd} more sets to match suggestion`);
          
          for (let i = 0; i < setsToAdd; i++) {
            const newSet = {
              id: `set-${Date.now()}-${i}`,
              targetWeight: weightString,
              targetReps: repsString,
              completedWeight: "",
              completedReps: ""
            };
            
            exercise.generatedSets.push(newSet);
            console.log(`⭐ Added new set with target weight ${weightString} and reps ${repsString}`);
          }
        }
      } else {
        // No generated sets exist, create them
        console.log(`⭐ Creating new generatedSets for ${exercise.name}`);
        
        exercise.generatedSets = [];
        
        for (let i = 0; i < suggestion.sets; i++) {
          const newSet = {
            id: `set-${Date.now()}-${i}`,
            targetWeight: weightString,
            targetReps: repsString,
            completedWeight: "",
            completedReps: ""
          };
          
          exercise.generatedSets.push(newSet);
        }
        
        console.log(`⭐ Created ${suggestion.sets} new sets with target weight ${weightString} and reps ${repsString}`);
      }
      
      // Also update the exercise-level weight and reps to match
      const oldWeight = exercise.weight;
      const oldReps = exercise.reps;
      
      exercise.weight = weightString;
      exercise.reps = repsString;
      
      console.log(`⭐ Updated exercise-level data for ${exercise.name}: weight ${oldWeight} → ${exercise.weight}, reps ${oldReps} → ${exercise.reps}`);
      
      return true;
    } catch (error) {
      console.error("Error updating exercise with suggestion:", error);
      return false;
    }
  };
  
  // Update next week's workout with suggested weights
  const updateNextWeekWorkout = async (suggestions: Record<string, { weight: number, reps: number, sets: number, exerciseName: string, exerciseId: string }>) => {
    if (!user || !currentMesocycle) {
      console.error("Cannot update next week's workout: missing user or mesocycle data");
      return;
    }
    
    try {
      console.log("⭐ Updating next week's workout with suggestions:", suggestions);
      console.log("⭐ Suggestion keys available:", Object.keys(suggestions));
      console.log("⭐ Suggestion values:", Object.values(suggestions).map(s => `${s.exerciseName}: ${s.weight}kg x ${s.reps} reps`));
      
      // Reference to mesocycle document
      const mesocycleRef = doc(db, 'mesocycles', currentMesocycle.id);
      
      // Get the current mesocycle data
      const mesocycleSnap = await getDoc(mesocycleRef);
      if (!mesocycleSnap.exists()) {
        throw new Error("Mesocycle document not found");
      }
      
      const mesocycleData = mesocycleSnap.data();
      const workouts = mesocycleData.workouts || {};
      
      // Get the current week and workout info
      const weekMatch = workout?.id.match(/workout-w(\d+)-(\d+)-(\d+)/);
      if (!weekMatch) {
        throw new Error(`Cannot parse week from workout ID: ${workout?.id}`);
      }
      
      console.log(`⭐ Current workout ID: ${workout?.id}`);
      
      // Extract current week number and workout info
      const currentWeekNum = parseInt(weekMatch[1]);
      const currentDayIndex = parseInt(weekMatch[2]); 
      const currentSessionIndex = parseInt(weekMatch[3]);
      
      // Calculate next week number
      const nextWeekNum = currentWeekNum + 1;
      const nextWeekKey = `week${nextWeekNum}`;
      
      console.log(`⭐ Current week: ${currentWeekNum}, Next week: ${nextWeekNum}, Looking for: ${nextWeekKey}`);
      
      // Check if next week exists
      if (!workouts[nextWeekKey]) {
        throw new Error(`Next week (${nextWeekKey}) not found in mesocycle`);
      }
      
      // Find the corresponding workout in the next week (same day and session index)
      const nextWeekWorkouts = workouts[nextWeekKey];
      
      // First try to find the workout with the same day and session index
      let nextWorkoutIndex = nextWeekWorkouts.findIndex((w: any) => {
        const nextIdMatch = w.id.match(/workout-w\d+-(\d+)-(\d+)/);
        return nextIdMatch && 
               parseInt(nextIdMatch[1]) === currentDayIndex && 
               parseInt(nextIdMatch[2]) === currentSessionIndex;
      });
      
      // If not found, fall back to position-based matching (first workout)
      if (nextWorkoutIndex === -1) {
        console.log(`⭐ Could not find matching workout in next week, using first available`);
        nextWorkoutIndex = 0;
      }
      
      if (nextWorkoutIndex === -1 || !nextWeekWorkouts[nextWorkoutIndex]) {
        throw new Error(`No workout found in next week (${nextWeekKey})`);
      }
      
      const nextWorkout = nextWeekWorkouts[nextWorkoutIndex];
      console.log(`⭐ Found next week's workout: ${nextWorkout.id}`);
      
      // Create a working copy of the next week's workouts
      const updatedNextWeekWorkouts = JSON.parse(JSON.stringify(nextWeekWorkouts));
      const updatedNextWorkout = updatedNextWeekWorkouts[nextWorkoutIndex];
      
      // Track which exercises were updated
      const updatedExercises: string[] = [];
      
      // Create a map to track which exercises have been matched with which suggestion
      // This helps prevent using the same suggestion for multiple exercises
      const usedSuggestions = new Set<string>();
      
      // First, let's log the current exercises from this week's workout for reference
      console.log("⭐ CURRENT WEEK EXERCISES:");
      exercises.forEach((ex: any, idx: number) => {
        console.log(`${idx+1}. ${ex.name} (baseExerciseId: ${ex.baseExerciseId || 'not set'})`);
      });
      
      // Now log the next week's exercises
      console.log("⭐ NEXT WEEK EXERCISES:");
      updatedNextWorkout.exercises.forEach((ex: any, idx: number) => {
        console.log(`${idx+1}. ${ex.name} (baseExerciseId: ${ex.baseExerciseId || 'not set'})`);
      });
      
      // Go through each exercise in the next week's workout and find matches
      for (let i = 0; i < updatedNextWorkout.exercises.length; i++) {
        const exercise = updatedNextWorkout.exercises[i];
        let found = false;
        let matchInfo = '';
        let suggestion = null;
        let suggestionKey = '';
        
        console.log(`⭐ Checking exercise ${exercise.name} (baseExerciseId: ${exercise.baseExerciseId || 'not set'})`);
        
        // Try different matching strategies - prioritize exact baseExerciseId matches
        
        // 0. First try to find a suggestion with matching exerciseId (highest priority)
        if (!found) {
          // Look for suggestions with explicit "from this exercise ID" mapping
          for (const [key, sugg] of Object.entries(suggestions)) {
            if (usedSuggestions.has(key)) continue; // Skip already used suggestions
            
            // Check if this suggestion contains the original exercise's ID
            if (sugg.exerciseId) {
              console.log(`⭐ Checking suggestion with exerciseId=${sugg.exerciseId} against exercise ${exercise.name}`);
              
              // Direct match by ID (best case)
              const suggestionExerciseId = sugg.exerciseId;
              if (suggestionExerciseId === exercise.id || 
                  (exercise.baseExerciseId && suggestionExerciseId === exercise.baseExerciseId)) {
                suggestionKey = key;
                suggestion = sugg;
                matchInfo = `direct exercise ID match: ${suggestionExerciseId}`;
                console.log(`⭐ DIRECT MATCH FOUND by exerciseId: ${suggestionExerciseId}`);
                found = true;
              break;
            }
          }
        }
      }
      
        // 1. Direct match by baseExerciseId
        if (!found && exercise.baseExerciseId && suggestions[exercise.baseExerciseId] && !usedSuggestions.has(exercise.baseExerciseId)) {
          suggestionKey = exercise.baseExerciseId;
          suggestion = suggestions[suggestionKey];
          matchInfo = `direct baseExerciseId match: ${exercise.baseExerciseId}`;
          found = true;
        }
        
        // 2. Normalized baseExerciseId match (lowercase, trimmed)
        if (!found && exercise.baseExerciseId) {
          const normalizedId = exercise.baseExerciseId.toLowerCase().trim();
          if (suggestions[normalizedId] && !usedSuggestions.has(normalizedId)) {
            suggestionKey = normalizedId;
            suggestion = suggestions[suggestionKey];
            matchInfo = `normalized baseExerciseId match: ${normalizedId}`;
            found = true;
          }
        }
        
        // 3. Try to match with current week exercises by comparing names
        if (!found && exercises && exercises.length > 0) {
          // Find a matching exercise from this week with the same name
          for (const currExercise of exercises) {
            if (currExercise.id && suggestions[currExercise.id] && !usedSuggestions.has(currExercise.id) && 
                (currExercise.name.toLowerCase() === exercise.name.toLowerCase() ||
                 currExercise.name.toLowerCase().includes(exercise.name.toLowerCase()) ||
                 exercise.name.toLowerCase().includes(currExercise.name.toLowerCase()))) {
              suggestionKey = currExercise.id;
              suggestion = suggestions[suggestionKey];
              matchInfo = `current week exercise ID match: ${currExercise.id} via name similarity`;
              found = true;
              break;
            }
          }
        }
        
        // 4. Exact exercise name match
        if (!found) {
          const exactNameKey = exercise.name;
          if (suggestions[exactNameKey] && !usedSuggestions.has(exactNameKey)) {
            suggestionKey = exactNameKey;
            suggestion = suggestions[suggestionKey];
            matchInfo = `exact name match: ${exercise.name}`;
            found = true;
          }
        }
        
        // 5. Lowercase exercise name match
        if (!found) {
          const lowerNameKey = exercise.name.toLowerCase();
          if (suggestions[lowerNameKey] && !usedSuggestions.has(lowerNameKey)) {
            suggestionKey = lowerNameKey;
            suggestion = suggestions[suggestionKey];
            matchInfo = `lowercase name match: ${lowerNameKey}`;
            found = true;
          }
        }
        
        // 6. Fuzzy match by exercise name similarity
        if (!found) {
          // Compare with each suggestion exerciseName
          for (const [key, sugg] of Object.entries(suggestions)) {
            if (usedSuggestions.has(key)) continue; // Skip already used suggestions
            
            const suggestionName = sugg.exerciseName.toLowerCase();
            const exerciseName = exercise.name.toLowerCase();
            
            // Check if names are similar (one contains the other or they share significant words)
            if (suggestionName.includes(exerciseName) || 
                exerciseName.includes(suggestionName) || 
                (suggestionName.split(' ').some((word: string) => word.length > 3 && exerciseName.includes(word)) && 
                 exerciseName.split(' ').some((word: string) => word.length > 3 && suggestionName.includes(word)))) {
              
              suggestionKey = key;
              suggestion = sugg;
              matchInfo = `fuzzy name match: "${suggestionName}" ~ "${exerciseName}"`;
              found = true;
              break;
            }
          }
        }
        
        // 7. Fallback to position-based matching as a last resort
        if (!found) {
          // Try to match with same index exercise from current workout
          if (exercises && exercises.length > i) {
            const currExercise = exercises[i];
            if (currExercise.id && suggestions[currExercise.id] && !usedSuggestions.has(currExercise.id)) {
              suggestionKey = currExercise.id;
              suggestion = suggestions[suggestionKey];
              matchInfo = `position-based match (index ${i}) from current workout`;
              found = true;
            }
          }
          
          // If still not found, try any unused suggestion
          if (!found) {
            for (const [key, sugg] of Object.entries(suggestions)) {
              if (!usedSuggestions.has(key)) {
                suggestionKey = key;
                suggestion = sugg;
                matchInfo = `last resort - any unused suggestion`;
                found = true;
                break;
              }
            }
          }
        }
        
        // Apply the suggestion if found
        if (found && suggestion) {
          console.log(`⭐ Found match for exercise: "${exercise.name}" (${exercise.id || 'no ID'})`);
          console.log(`⭐ Using suggestion from: "${suggestion.exerciseName}" (${suggestion.exerciseId || 'no ID'})`);
          console.log(`⭐ Values to apply: ${suggestion.weight}kg x ${suggestion.reps} reps`);
          
          const updated = updateExerciseWithSuggestion(exercise, suggestion);
          
          if (updated) {
            updatedExercises.push(exercise.name);
            // Mark this suggestion as used to prevent applying it to another exercise
            usedSuggestions.add(suggestionKey);
            console.log(`⭐ Successfully updated ${exercise.name} with suggestion and marked ${suggestionKey} as used`);
            console.log(`⭐ Remaining unused suggestions: ${Object.keys(suggestions).filter(key => !usedSuggestions.has(key)).length}`);
          }
        } else {
          console.log(`⭐ No matching suggestion found for ${exercise.name}`);
        }
      }
      
      // Update the mesocycle document with the changes if any exercises were updated
      if (updatedExercises.length > 0) {
        // Prepare the update
        const updatedWorkouts = {
          ...workouts,
          [nextWeekKey]: updatedNextWeekWorkouts
        };
        
        // Update the Firestore document
        await updateDoc(mesocycleRef, {
          workouts: updatedWorkouts
        });
        
        console.log(`⭐ Successfully updated next week's workout with ${updatedExercises.length} exercise updates`);
        console.log(`⭐ Updated exercises: ${updatedExercises.join(', ')}`);
        
        return updatedExercises;
      } else {
        console.log(`⭐ No exercises were updated in next week's workout`);
        return [];
      }
    } catch (error) {
      console.error("Error updating next week's workout:", error);
      throw error;
    }
  };
  
  // Mark workout as complete with feedback
  const completeWorkout = async () => {
    if (!user || !workout || !currentMesocycle) {
      toast.error("Cannot complete workout: missing user, workout, or mesocycle data");
          return;
        }
      
    setIsCompleting(true);

    try {
      // Log the current state of exercises
      console.log("⭐ Completing workout with exercises:", exercises);
      
      // Create a working copy of exercises to avoid modifying read-only objects
      const workingExercises = JSON.parse(JSON.stringify(exercises));
      
      // Create a one-to-one map between current exercises and their suggestions
      // This ensures each exercise's data is used only for the corresponding exercise in the next week
      const exerciseSuggestions: Record<string, { 
        weight: number, 
        reps: number, 
        sets: number, 
        exerciseName: string, 
        exerciseId: string,
        baseExerciseId: string | null
      }> = {};
      
      let missingFeedback = false;
      let allExercisesChecked = true;
      
      // Log the exercise sets to troubleshoot the weight detection issue
      console.log("⭐ DETAILED EXERCISE DATA DEBUG:");
      workingExercises.forEach((exercise: any, eIdx: number) => {
        console.log(`Exercise ${eIdx + 1}: ${exercise.name}`);
        console.log(`- Sets array:`, exercise.sets);
        console.log(`- Completed sets count:`, exercise.sets.filter((s: any) => 
          completedSets.has(`${exercise.id}-${s.id}`)
        ).length);
      });
      
      // First, process all exercises and collect their weight data
      for (let exerciseIndex = 0; exerciseIndex < workingExercises.length; exerciseIndex++) {
        const exercise = workingExercises[exerciseIndex];
        
        // Skip exercises that aren't marked as completed
        if (!exercise.completed && !exercise.sets.some((set: any) => 
          completedSets.has(`${exercise.id}-${set.id}`)
        )) {
          console.log(`⭐ Exercise ${exercise.name} not completed, skipping`);
          allExercisesChecked = false;
          continue;
        }
        
        console.log(`⭐ Processing exercise [${exerciseIndex}]: ${exercise.name} (ID: ${exercise.id}, baseExerciseId: ${exercise.baseExerciseId || 'none'})`);
        
        // Initialize with default feedback if none exists
        if (!exercise.feedback) {
          exercise.feedback = {};
        }
        
        // Gather actual weights used by the user from sets
        let totalWeight = 0;
        let totalReps = 0;
        let setCount = 0;
        
        // Check completed sets for this exercise
        const completedExerciseSets = exercise.sets.filter((set: any) => 
          completedSets.has(`${exercise.id}-${set.id}`)
        );
        
        console.log(`⭐ Found ${completedExerciseSets.length} completed sets for ${exercise.name}`);
        
        if (completedExerciseSets.length > 0) {
          completedExerciseSets.forEach((set: any, index: number) => {
            // Get the weight and reps values directly
            const setWeight = set.completedWeight ? parseFloat(set.completedWeight) : 
                              (set.targetWeight ? parseFloat(set.targetWeight) : 0);
                              
            const setReps = set.completedReps ? parseInt(set.completedReps) : 
                            (set.targetReps ? parseInt(set.targetReps) : 0);
            
            console.log(`⭐ COMPLETED Set ${index + 1} for ${exercise.name}:`, {
              rawCompletedWeight: set.completedWeight,
              parsedCompletedWeight: setWeight,
              targetWeight: set.targetWeight,
              rawCompletedReps: set.completedReps,
              parsedCompletedReps: setReps,
              targetReps: set.targetReps
            });
            
            // Use either completed or target values (if completed is missing)
            if (setWeight > 0 && setReps > 0) {
              console.log(`⭐ Adding set data: weight=${setWeight}, reps=${setReps}`);
              totalWeight += setWeight;
              totalReps += setReps;
              setCount++;
            } else {
              console.log(`⭐ Set has invalid weight/reps: ${setWeight}kg x ${setReps}`);
            }
          });
        } else {
          console.log(`⭐ No completed sets found for ${exercise.name}`);
        }
        
        // Calculate average weight and reps if completed sets were found
        let exerciseWeight = 0;
        let exerciseReps = 0;
        
        if (setCount > 0) {
          exerciseWeight = totalWeight / setCount;
          exerciseReps = Math.round(totalReps / setCount);
          console.log(`⭐ Using ACTUAL COMPLETED data for ${exercise.name}: avg weight=${exerciseWeight}, avg reps=${exerciseReps} from ${setCount} sets`);
        } else {
          // If no completed weights/reps found but sets are marked complete,
          // use target weights as fallback
          const targetSets = exercise.sets.filter((set: any) => set.targetWeight && set.targetReps);
          
          if (targetSets.length > 0) {
            const totalTargetWeight = targetSets.reduce((sum: number, set: any) => 
              sum + (parseFloat(set.targetWeight) || 0), 0);
            const totalTargetReps = targetSets.reduce((sum: number, set: any) => 
              sum + (parseInt(set.targetReps) || 0), 0);
            
            exerciseWeight = totalTargetWeight / targetSets.length;
            exerciseReps = Math.round(totalTargetReps / targetSets.length);
            setCount = targetSets.length;
            
            console.log(`⭐ No completed data, using TARGET data as fallback for ${exercise.name}: weight=${exerciseWeight}, reps=${exerciseReps}`);
          } else {
            // Set default values if no data is available at all
            exerciseWeight = exercise.weight ? parseFloat(exercise.weight) : 45;
            exerciseReps = exercise.reps ? parseInt(exercise.reps) : 8;
            setCount = exercise.sets.length;
            
            console.log(`⭐ No set data at all, using DEFAULT data for ${exercise.name}: weight=${exerciseWeight}, reps=${exerciseReps}`);
          }
        }
        
        // Only proceed if we have valid weight data
        if (exerciseWeight <= 0) {
          console.log(`⭐ Invalid weight (${exerciseWeight}) for ${exercise.name}, setting to default`);
          
          // Set a reasonable default weight based on the exercise name
          if (exercise.name.toLowerCase().includes('squat')) {
            exerciseWeight = 45;
          } else if (exercise.name.toLowerCase().includes('bench')) {
            exerciseWeight = 45;
          } else if (exercise.name.toLowerCase().includes('deadlift')) {
            exerciseWeight = 60;
          } else if (exercise.name.toLowerCase().includes('press')) {
            exerciseWeight = 30;
          } else {
            exerciseWeight = 25; // Default weight
          }
        }
        
        // Process feedback (either provided or default)
        const feedback = exercise.feedback.weightFeeling || exercise.weightFeeling || "just_right";
        
        // Get RPE if available (default to 7 if not provided)
        const rpe = exercise.feedback.rpe || exercise.rpe || 7;
        
        console.log(`⭐ Final values for ${exercise.name}: Weight=${exerciseWeight}, Reps=${exerciseReps}, RPE=${rpe}, Feedback=${feedback}`);
        
        // Calculate suggested weight change based on feedback
        let weightAdjustmentFactor = 1.0; // Default: no change
        
        // Adjust weight based on feedback and RPE
        if (feedback === "too_light") {
          // If RPE is low (1-4), increase weight more aggressively
          if (rpe <= 4) {
            weightAdjustmentFactor = 1.10; // 10% increase
          } 
          // If RPE is moderate (5-7), increase weight moderately
          else if (rpe <= 7) {
            weightAdjustmentFactor = 1.05; // 5% increase
          } 
          // If RPE is high (8-10), increase weight conservatively
          else {
            weightAdjustmentFactor = 1.025; // 2.5% increase
          }
        } 
        else if (feedback === "light") {
          // Smaller increases based on RPE
          if (rpe <= 4) {
            weightAdjustmentFactor = 1.075; // 7.5% increase
          } 
          else if (rpe <= 7) {
            weightAdjustmentFactor = 1.04; // 4% increase
          } 
          else {
            weightAdjustmentFactor = 1.02; // 2% increase
          }
        } 
        else if (feedback === "just_right") {
          // For "just right" feedback, make small adjustments based on RPE
          if (rpe <= 5) {
            weightAdjustmentFactor = 1.025; // 2.5% increase
          } 
          else if (rpe <= 7) {
            weightAdjustmentFactor = 1.015; // 1.5% increase
          } 
          else if (rpe <= 9) {
            weightAdjustmentFactor = 1.005; // 0.5% increase
          }
          // RPE of 10 means keep weight the same
        } 
        else if (feedback === "heavy") {
          // For "heavy" feedback, keep weight the same or reduce slightly
          if (rpe >= 9) {
            weightAdjustmentFactor = 0.98; // 2% decrease
          } 
          else if (rpe >= 7) {
            weightAdjustmentFactor = 0.995; // 0.5% decrease
          }
          // Otherwise keep the same weight
        } 
        else if (feedback === "too_heavy") {
          // Reduce weight more based on higher RPE
          if (rpe >= 9) {
            weightAdjustmentFactor = 0.95; // 5% decrease
          } 
          else if (rpe >= 7) {
            weightAdjustmentFactor = 0.97; // 3% decrease
          } 
          else {
            weightAdjustmentFactor = 0.98; // 2% decrease
          }
        }
        
        // Calculate the new suggested weight
        let suggestedWeight = exerciseWeight * weightAdjustmentFactor;
        
        // Round the weight to the nearest 1.25 (for standard plate increments)
        suggestedWeight = Math.round(suggestedWeight * 4) / 4;
        
        // Ensure we don't suggest a weight of 0 or less
        if (suggestedWeight <= 0 || suggestedWeight < 5) {
          suggestedWeight = exerciseWeight > 5 ? exerciseWeight : 5;
        }
        
        console.log(`⭐ WEIGHT CALCULATION for ${exercise.name}:`, {
          originalWeight: exerciseWeight,
          adjustmentFactor: weightAdjustmentFactor,
          calculatedWeight: exerciseWeight * weightAdjustmentFactor,
          roundedWeight: suggestedWeight
        });
        
        // Store suggestion in the exercise-specific map
        exerciseSuggestions[exercise.id] = {
          weight: suggestedWeight,
          reps: exerciseReps,
          sets: setCount > 0 ? setCount : (parseInt(exercise.sets) || 3),
          exerciseName: exercise.name,
          exerciseId: exercise.id,
          baseExerciseId: exercise.baseExerciseId || null
        };
      }
      
      // Log the suggestions we're working with
      console.log("⭐ Exercise suggestions for next week:");
      Object.entries(exerciseSuggestions).forEach(([exerciseId, suggestion]) => {
        console.log(`  - Exercise ID ${exerciseId} (${suggestion.exerciseName}): ${suggestion.weight}kg x ${suggestion.reps} reps`);
      });
      
      // Check if we have any suggestions at all
      if (Object.keys(exerciseSuggestions).length === 0) {
        console.log("⭐ NO SUGGESTIONS AVAILABLE: No exercises have completed weight data");
        toast.error("Cannot update next week's weights: You must complete weights for at least one exercise");
        setIsCompleting(false);
        return;
      }
      
      // Now, update the next week's workout with our exercise-specific suggestions
      try {
        // Get the current week and workout info to find next week
        const weekMatch = workout?.id.match(/workout-w(\d+)-(\d+)-(\d+)/);
        if (!weekMatch) {
          throw new Error(`Cannot parse week from workout ID: ${workout?.id}`);
        }
        
        // Extract current week number
        const currentWeekNum = parseInt(weekMatch[1]);
        const nextWeekNum = currentWeekNum + 1;
        
        console.log(`⭐ Current week: ${currentWeekNum}, Next week: ${nextWeekNum}`);
        
        // Get the mesocycle data to find next week's workouts
        const mesocycleRef = doc(db, 'mesocycles', currentMesocycle.id);
        const mesocycleSnap = await getDoc(mesocycleRef);
        
        if (!mesocycleSnap.exists()) {
          throw new Error("Mesocycle document not found");
        }
        
        const mesocycleData = mesocycleSnap.data();
        const workouts = mesocycleData.workouts || {};
        
        // Get next week's key
        const nextWeekKey = `week${nextWeekNum}`;
        
        if (!workouts[nextWeekKey]) {
          throw new Error(`Next week (${nextWeekKey}) not found in mesocycle`);
        }
        
        // Deep clone the current workout structure
        const updatedWorkouts = JSON.parse(JSON.stringify(workouts));
        const nextWeekWorkouts = updatedWorkouts[nextWeekKey];
        
        // Check if any workouts exist for next week
        if (!nextWeekWorkouts || !Array.isArray(nextWeekWorkouts) || nextWeekWorkouts.length === 0) {
          throw new Error(`No workouts found for next week (${nextWeekKey})`);
        }
        
        // Track which exercises were successfully updated
        const updatedExercises: string[] = [];
        
        // Go through each workout in the next week
        for (let workoutIndex = 0; workoutIndex < nextWeekWorkouts.length; workoutIndex++) {
          const nextWorkout = nextWeekWorkouts[workoutIndex];
          console.log(`⭐ Checking next week workout ${workoutIndex + 1}: ${nextWorkout.id}`);
          
          if (!nextWorkout.exercises || !Array.isArray(nextWorkout.exercises)) {
            console.log(`⭐ No exercises found in workout ${nextWorkout.id}, skipping`);
            continue;
          }
          
          // Go through each exercise in the next week's workout
          for (let exerciseIndex = 0; exerciseIndex < nextWorkout.exercises.length; exerciseIndex++) {
            const nextExercise = nextWorkout.exercises[exerciseIndex];
            console.log(`⭐ Checking exercise ${exerciseIndex + 1}: ${nextExercise.name} (${nextExercise.id})`);
            
            // Try to find a matching suggestion
            let matchedSuggestion = null;
            let matchReason = '';
            
            // 1. First try matching by baseExerciseId (highest priority)
            if (nextExercise.baseExerciseId) {
              // Look for a suggestion with the same baseExerciseId
              for (const [exerciseId, suggestion] of Object.entries(exerciseSuggestions)) {
                if (suggestion.baseExerciseId && suggestion.baseExerciseId === nextExercise.baseExerciseId) {
                  matchedSuggestion = suggestion;
                  matchReason = `baseExerciseId match: ${nextExercise.baseExerciseId}`;
                  console.log(`⭐ FOUND MATCH: ${nextExercise.name} matched with ${suggestion.exerciseName} by baseExerciseId`);
                  console.log(`⭐ Weight data: ${suggestion.weight}kg x ${suggestion.reps} reps`);
                  break;
                }
              }
            }
            
            // 2. Try matching by exact name if no baseExerciseId match
            if (!matchedSuggestion) {
              for (const [exerciseId, suggestion] of Object.entries(exerciseSuggestions)) {
                if (suggestion.exerciseName.toLowerCase() === nextExercise.name.toLowerCase()) {
                  matchedSuggestion = suggestion;
                  matchReason = `exact name match: ${nextExercise.name}`;
                  console.log(`⭐ FOUND MATCH: ${nextExercise.name} matched with ${suggestion.exerciseName} by exact name`);
                  console.log(`⭐ Weight data: ${suggestion.weight}kg x ${suggestion.reps} reps`);
                  break;
                }
              }
            }
            
            // 3. Try partial name matching as a last resort
            if (!matchedSuggestion) {
              for (const [exerciseId, suggestion] of Object.entries(exerciseSuggestions)) {
                // Only consider strong matches where one name contains the other
                const nameA = suggestion.exerciseName.toLowerCase();
                const nameB = nextExercise.name.toLowerCase();
                
                if (nameA.includes(nameB) || nameB.includes(nameA)) {
                  // This is a strong partial match
                  matchedSuggestion = suggestion;
                  matchReason = `partial name match: "${suggestion.exerciseName}" ~ "${nextExercise.name}"`;
                  console.log(`⭐ FOUND MATCH: ${nextExercise.name} matched with ${suggestion.exerciseName} by partial name`);
                  console.log(`⭐ Weight data: ${suggestion.weight}kg x ${suggestion.reps} reps`);
                  break;
                }
              }
            }
            
            // If we found a match, update the exercise
            if (matchedSuggestion) {
              console.log(`⭐ [EXERCISE UPDATE] Found match for ${nextExercise.name} using ${matchReason}`);
              console.log(`⭐ APPLYING DATA: ${matchedSuggestion.weight}kg x ${matchedSuggestion.reps} reps from "${matchedSuggestion.exerciseName}"`);
              
              const updated = updateExerciseWithSuggestion(nextExercise, matchedSuggestion);
              
              if (updated) {
                updatedExercises.push(nextExercise.name);
                // Remove this suggestion to prevent reusing it
                console.log(`⭐ REMOVING suggestion for ${matchedSuggestion.exerciseName} (ID: ${matchedSuggestion.exerciseId}) from pool`);
                delete exerciseSuggestions[matchedSuggestion.exerciseId];
                console.log(`⭐ Successfully updated ${nextExercise.name} with ${matchedSuggestion.weight}kg`);
                
                // Log remaining suggestions
                console.log(`⭐ REMAINING SUGGESTIONS:`, Object.entries(exerciseSuggestions).map(([id, sugg]) => 
                  `${sugg.exerciseName}: ${sugg.weight}kg`).join(', ')
                );
              }
      } else {
              console.log(`⭐ NO MATCH: Could not find matching suggestion for ${nextExercise.name}`);
            }
          }
        }
        
        // Save updated workouts to Firebase if any changes were made
        if (updatedExercises.length > 0) {
          await updateDoc(mesocycleRef, {
            workouts: updatedWorkouts
          });
          
          console.log(`⭐ Successfully updated ${updatedExercises.length} exercises in next week's workouts`);
          toast.success(`Next week's target weights have been updated for ${updatedExercises.length} exercises`);
      } else {
          console.log(`⭐ No exercises were updated`);
          toast.error("No exercises in next week's workout could be matched to update");
      }
        
        // Navigate to mesocycle page
        router.push(`/mesocycle/${currentMesocycle.id}`);
    } catch (error) {
      console.error("Error updating next week's workout:", error);
        toast.error("Failed to update next week's weights. Please try again.");
      }
    } catch (error) {
      console.error("Error processing workout completion:", error);
      toast.error("Failed to process workout completion. Please try again.");
    } finally {
      setIsCompleting(false);
    }
  };
  
  // Change rest timer
  const changeRestTimer = (seconds: number) => {
    setInitialTimer(seconds);
    setTimer(seconds);
  };
  
  // Toggle sound setting
  const toggleSound = () => {
    const newSetting = !soundEnabled;
    setSoundEnabled(newSetting);
    // Save to localStorage
    localStorage.setItem('workoutTimerSound', newSetting.toString());
    toast(newSetting ? 'Timer sound enabled' : 'Timer sound disabled', { 
      icon: newSetting ? '🔊' : '🔇',
      position: 'bottom-center',
      duration: 1500
    });
  };
  
  // Function to add a new set to an exercise
  const addSet = async (exerciseIndex: number) => {
    if (!workout || !currentMesocycle || !user) return;
    
    try {
      // First, get fresh data directly from Firestore to ensure we have the latest state
      const docRef = doc(db, 'mesocycles', currentMesocycle.id);
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) {
        toast.error("Mesocycle not found in Firestore");
        return;
      }
      
      // Get the current data from Firestore
      const firestoreData = docSnap.data();
      
      // Find the week and workout in Firestore data
      const weekKey = `week${workout.weekNum}`;
      const workoutIndex = currentMesocycle.workouts[weekKey].findIndex(w => w.id === workout.id);
      
      if (workoutIndex === -1) {
        toast.error("Could not find workout to update");
        return;
      }
      
      // Check if we can access the exercise in Firestore
      if (!firestoreData.workouts?.[weekKey]?.[workoutIndex]?.exercises?.[exerciseIndex]) {
        toast.error("Could not find exercise in Firestore");
        return;
      }
      
      // Get the exercise from our local state
      const exercise = exercises[exerciseIndex];
      if (!exercise) {
        toast.error("Exercise not found in local state");
        return;
      }
      
      // Prepare the new set object
      const newSetNumber = exercise.sets.length + 1;
      const newSetId = `${exercise.id}-set-${newSetNumber}`;
      const newSet = {
        id: newSetId,
        number: newSetNumber,
        targetReps: exercise.reps,
        targetWeight: exercise.weight || "",
        completedReps: "",
        completedWeight: ""
      };
      
      // Get a reference to the exercise in Firestore
      const firestoreExercise = firestoreData.workouts[weekKey][workoutIndex].exercises[exerciseIndex];
      
      // Make sure the generatedSets array exists
      if (!firestoreExercise.generatedSets) {
        firestoreExercise.generatedSets = [];
      }
      
      // If it's not an array, initialize it
      if (!Array.isArray(firestoreExercise.generatedSets)) {
        firestoreExercise.generatedSets = [];
      }
      
      console.log(`⭐ Found ${firestoreExercise.generatedSets.length} existing sets in Firestore`);
      
      // Add our new set to the EXISTING generatedSets array from Firestore
      firestoreExercise.generatedSets.push(newSet);
      
      // Update the 'sets' property if it exists and is a number
      if (typeof firestoreExercise.sets === 'number') {
        firestoreExercise.sets = firestoreExercise.sets + 1;
      } else {
        firestoreExercise.sets = firestoreExercise.generatedSets.length;
      }
      
      console.log(`⭐ Updated to ${firestoreExercise.generatedSets.length} sets in Firestore`);
      
      // Update the entire document in Firestore
      await updateDoc(docRef, {
        workouts: firestoreData.workouts,
        updatedAt: new Date().toISOString()
      });
      
      // Also update local state for immediate UI feedback
      const updatedExercises = JSON.parse(JSON.stringify(exercises));
      updatedExercises[exerciseIndex].sets.push(newSet);
      setExercises(updatedExercises);
      
      toast.success("Set added");
    } catch (error) {
      console.error("Error adding set:", error);
      toast.error("Failed to add set. Please try again.");
    }
  };
  
  // Function to handle deleting an exercise from a single workout
  const deleteExercise = (exerciseIndex: number) => {
    if (!workout || !currentMesocycle) return;
    
    // Update local state immediately
    const updatedExercises = [...exercises];
    updatedExercises.splice(exerciseIndex, 1);
    setExercises(updatedExercises);
    
    // Find the week and workout index
    const weekKey = `week${workout.week}`;
    const workoutIndex = currentMesocycle.workouts[weekKey].findIndex(w => w.id === workout.id);
    
    if (workoutIndex === -1) {
      toast.error("Could not find workout to update");
      return;
    }
    
    // Create deep copy of the mesocycle to update
    const updatedMesocycle = JSON.parse(JSON.stringify(currentMesocycle));
    
    // Remove the exercise from the copied mesocycle
    updatedMesocycle.workouts[weekKey][workoutIndex].exercises.splice(exerciseIndex, 1);
    
    // Create update record
    const updates: Record<string, any> = {
      workouts: updatedMesocycle.workouts
    };
    
    // Update in Redux and Firestore
    if (user) {
      // Use the thunk to update the mesocycle in the store and Firestore
      dispatch(updateMesocycleAsync({
        id: currentMesocycle.id,
        updates,
        userId: user.uid
      }) as any).then(() => {
        // Make sure active exercise index doesn't point to a non-existent exercise
        if (activeExercise !== null && activeExercise >= exerciseIndex) {
          setActiveExercise(activeExercise > 0 ? activeExercise - 1 : null);
        }
        toast.success("Exercise removed from this workout");
      }).catch((error: Error) => {
        console.error("Error removing exercise:", error);
        toast.error("Failed to remove exercise. Please try again.");
        });
      } else {
      // For offline mode
      toast.success("Exercise removed from this workout");
    }
  };
  
  // Function to delete an exercise from all weeks in the mesocycle
  const deleteExerciseFromAllWeeks = async () => {
    if (!user || !currentMesocycle || !exerciseToDelete) {
      toast.error("Missing required data to delete exercise");
      setDeleteModalOpen(false);
      return;
    }
    
    console.log("🗑️ Deleting exercise from all weeks:", exerciseToDelete.name);
    
    try {
      setIsCompleting(true);
      
      // Deep copy mesocycle to avoid mutating state directly
      const updatedMesocycle = JSON.parse(JSON.stringify(currentMesocycle));
      const baseExerciseId = exerciseToDelete.baseExerciseId;
      let exerciseRemoved = false;
      
      // Loop through all weeks and workouts to find exercises with the same baseExerciseId
      Object.keys(updatedMesocycle.workouts).forEach(weekKey => {
        const weekWorkouts = updatedMesocycle.workouts[weekKey];
        
        weekWorkouts.forEach((workout: any, workoutIndex: number) => {
          // Find all exercises with the matching baseExerciseId
          const exercisesToRemove = workout.exercises
            .map((ex: any, index: number) => ({ ex, index }))
            .filter(({ ex }: { ex: any }) => ex.baseExerciseId === baseExerciseId)
            .sort((a: any, b: any) => b.index - a.index); // Sort in reverse order so we can splice without affecting indices
          
          // Remove each matching exercise
          exercisesToRemove.forEach(({ index }: { index: number }) => {
            workout.exercises.splice(index, 1);
            exerciseRemoved = true;
          });
        });
      });
      
      if (!exerciseRemoved) {
        toast.error("Could not find matching exercises to delete");
        setIsCompleting(false);
        setDeleteModalOpen(false);
        return;
      }
      
      // Update Redux with the modified mesocycle
      dispatch(updateMesocycleAsync({
        id: currentMesocycle.id,
        updates: { workouts: updatedMesocycle.workouts },
        userId: user.uid
      }) as any).then(() => {
        // Also update the current exercises in state (for UI)
        const updatedExercises = exercises.filter(ex => ex.baseExerciseId !== baseExerciseId);
        setExercises(updatedExercises);
        
        toast.success(`${exerciseToDelete.name} removed from all workouts`);
        
        // Close the modal and clear the exercise to delete
        setDeleteModalOpen(false);
        setExerciseToDelete(null);
        setIsCompleting(false);
      }).catch((error: Error) => {
        console.error("Error deleting exercise from all weeks:", error);
        toast.error("Failed to delete exercise. Please try again.");
        setIsCompleting(false);
        setDeleteModalOpen(false);
      });
    } catch (error: unknown) {
      console.error("Error in deleteExerciseFromAllWeeks:", error);
      toast.error("An unexpected error occurred. Please try again.");
      setIsCompleting(false);
      setDeleteModalOpen(false);
    }
  };
  
  // Function to add a new custom exercise
  const addCustomExercise = async () => {
    if (!workout || !currentMesocycle) {
      toast.error("Cannot add exercise: missing workout or mesocycle data");
      return;
    }
    
    try {
      // Generate unique IDs for the exercise
      const exerciseId = `exercise-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      const baseExerciseId = exerciseId; // Use the same ID as base ID for tracking across weeks
      
      // Create generatedSets for the exercise
      const generatedSets = Array.from({ length: newExercise.sets }, (_, i) => ({
        id: `${exerciseId}-set-${i+1}`,
        number: i + 1,
        targetReps: newExercise.reps.toString(),
        targetWeight: newExercise.weight || "",
        completedReps: "",
        completedWeight: ""
      }));
      
      // Create the new exercise object - make structure match existing exercises
      const exerciseToAdd = {
        id: exerciseId,
        name: newExercise.name,
        muscleGroup: newExercise.muscleGroup,
        sets: newExercise.sets, // This should be a number, not an array
        reps: newExercise.reps,
        weight: newExercise.weight || "",
        notes: "",
        generatedSets, // This is where the actual set data goes
        weightFeeling: "",
        baseExerciseId,
        feedback: {
          weightFeeling: "",
          muscleActivation: "",
          performanceRating: "",
          notes: "",
          timestamp: ""
        }
      };
      
      console.log(`⭐ Adding new exercise: ${newExercise.name} with ${newExercise.sets} sets`);
      
      // Add to local state immediately
      setExercises(prevExercises => [...prevExercises, exerciseToAdd]);
      
      // Extract the correct week number from the weekNum field directly
      const weekKey = `week${workout.week || workout.weekNum}`;
      
      console.log(`⭐ Looking for workout in ${weekKey}, workout ID: ${workout.id}`);
      console.log(`⭐ Available weeks: ${Object.keys(currentMesocycle.workouts).join(', ')}`);
      
      // Check if weekKey exists in the workouts object
      if (!currentMesocycle.workouts[weekKey]) {
        console.error(`Week ${weekKey} not found in mesocycle workouts`);
        toast.error(`Week ${weekKey} not found in mesocycle`);
        return;
      }
      
      // Check if workouts array exists for the week
      if (!Array.isArray(currentMesocycle.workouts[weekKey])) {
        console.error(`Workouts for week ${weekKey} is not an array:`, currentMesocycle.workouts[weekKey]);
        toast.error("Invalid workouts data structure");
        return;
      }
      
      // Log the available workout IDs for debugging
      const availableWorkoutIds = currentMesocycle.workouts[weekKey].map(w => w.id);
      console.log(`⭐ Available workout IDs in ${weekKey}: ${availableWorkoutIds.join(', ')}`);
      
      // The workout ID format is 'workout-w1-0-0'
      // Parse the ID to find the workout index
      const workoutIdParts = workout.id.split('-');
      console.log(`⭐ Workout ID parts: ${workoutIdParts.join(', ')}`);
      
      const workoutIndex = currentMesocycle.workouts[weekKey].findIndex(w => w.id === workout.id);
      console.log(`⭐ Found workout at index: ${workoutIndex}`);
      
      if (workoutIndex === -1) {
        toast.error("Could not find workout to update");
        return;
      }
      
      // Create deep copy of the mesocycle to update
      const updatedMesocycle = JSON.parse(JSON.stringify(currentMesocycle));
      
      // Add the exercise to the current workout
      updatedMesocycle.workouts[weekKey][workoutIndex].exercises.push(exerciseToAdd);
      
      // If user wants to propagate to all weeks
      if (newExercise.propagateToAllWeeks) {
        // Loop through all weeks in the mesocycle
        Object.keys(updatedMesocycle.workouts)
          .filter(week => week !== weekKey) // Skip current week since we already added it
          .forEach(otherWeekKey => {
            // Check if the week has any workouts
            if (!Array.isArray(updatedMesocycle.workouts[otherWeekKey]) || 
                updatedMesocycle.workouts[otherWeekKey].length <= workoutIndex) {
              console.log(`⭐ Skipping week ${otherWeekKey}: No matching workout index`);
              return; // Skip this week
            }
            
            // Find the corresponding workout in other weeks (same workout index)
            const otherWorkout = updatedMesocycle.workouts[otherWeekKey][workoutIndex];
            if (otherWorkout) {
              // Create a variation of the exercise for this week
              const otherWeekExerciseId = `exercise-${Date.now()}-${Math.floor(Math.random() * 1000)}-${otherWeekKey}`;
              const otherWeekGeneratedSets = Array.from({ length: newExercise.sets }, (_, i) => ({
                id: `${otherWeekExerciseId}-set-${i+1}`,
                number: i + 1,
                targetReps: newExercise.reps.toString(),
                targetWeight: newExercise.weight || "",
                completedReps: "",
                completedWeight: ""
              }));
              
              const otherWeekExercise = {
                ...exerciseToAdd,
                id: otherWeekExerciseId,
                generatedSets: otherWeekGeneratedSets,
                // Don't include sets array - it should be a number
                sets: newExercise.sets,
                baseExerciseId // Keep the same baseExerciseId to link exercises across weeks
              };
              
              // Add to the corresponding workout
              updatedMesocycle.workouts[otherWeekKey][workoutIndex].exercises.push(otherWeekExercise);
              console.log(`⭐ Added exercise to week: ${otherWeekKey}`);
            } else {
              console.log(`⭐ Skipping week ${otherWeekKey}: No matching workout found`);
            }
          });
      }
      
      // Create update record
      const updates: Record<string, any> = {
        workouts: updatedMesocycle.workouts
      };
      
      // Update in Redux and Firestore
      if (user) {
        dispatch(updateMesocycleAsync({
          id: currentMesocycle.id,
          updates,
          userId: user.uid
        }) as any).then(() => {
          toast.success(`${newExercise.name} added to ${newExercise.propagateToAllWeeks ? 'all weeks' : 'this workout'}`);
          
          // Reset the new exercise form
          setNewExercise({
            name: "",
            sets: 3,
            reps: 10,
            weight: "",
            muscleGroup: "other",
            propagateToAllWeeks: true
          });
          
          // Close the modal
          setAddExerciseModalOpen(false);
        }).catch((error: Error) => {
          console.error("Error adding exercise:", error);
          toast.error("Failed to add exercise. Please try again.");
        });
      } else {
        // For offline mode
        toast.success(`${newExercise.name} added to workout`);
        setAddExerciseModalOpen(false);
      }
    } catch (error: unknown) {
      console.error("Error in addCustomExercise:", error);
      toast.error("An unexpected error occurred. Please try again.");
    }
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
    <div className="min-h-screen flex flex-col">
      <div className="flex-1 overflow-y-auto pb-52">
        <div className="max-w-3xl mx-auto px-4 py-6">
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
          <button 
            onClick={toggleSound}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-800"
            aria-label={soundEnabled ? "Disable timer sound" : "Enable timer sound"}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
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
          <div className="space-y-4  ">
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
                            ((exercise.sets && Array.isArray(exercise.sets) && exercise.sets.length > 0)
                              ? (exercise.sets.filter((_: any, i: number) => 
                        completedSets.has(`${exercise.id}-${exercise.sets[i].id}`)
                                ).length / exercise.sets.length)
                              : (exercise.generatedSets && Array.isArray(exercise.generatedSets) && exercise.generatedSets.length > 0)
                                ? (exercise.generatedSets.filter((_: any, i: number) => 
                                    completedSets.has(`${exercise.id}-${exercise.generatedSets[i].id}`)
                                  ).length / exercise.generatedSets.length)
                                : 0) * 100
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
                          value={set.completedWeight || set.targetWeight || ''}
                          onChange={(e) => updateSetDetails(
                            exerciseIndex, 
                            setIndex, 
                            'completedWeight', 
                            e.target.value
                          )}
                          className="w-48 bg-gray-800 rounded text-center py-2 focus:ring-1 focus:ring-neon-green outline-none"
                          min="0"
                          placeholder={set.targetWeight || "0"}
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
                      <button 
                        className="btn-secondary py-1 px-3 text-sm"
                        onClick={(e) => {
                          e.stopPropagation(); // Prevent the exercise from toggling expand/collapse
                          addSet(exerciseIndex);
                        }}
                      >
                        <Plus className="w-3 h-3 mr-1" /> Add Set
                      </button>
                            <button 
                              className="text-red-500 py-1 px-2 text-sm hover:bg-red-500/10 rounded"
                              onClick={(e) => {
                                e.stopPropagation(); // Prevent the exercise from toggling expand/collapse
                                setExerciseToDelete(exercise);
                                setDeleteModalOpen(true);
                              }}
                            >
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
        </div>
      </div>
      
      {/* Add Exercise Button - Non-Fixed */}
      <div className="px-8 ">
        <div className="max-w-3xl mx-auto">
          <button
            onClick={() => setAddExerciseModalOpen(true)}
            className="w-full p-4 flex items-center justify-center gap-2 bg-gray-800/90 backdrop-blur-sm hover:bg-gray-700 rounded-lg border border-dashed border-gray-600"
          >
            <Plus className="w-5 h-5 text-neon-green" />
            <span className="text-neon-green font-medium">Add Exercise</span>
          </button>
        </div>
      </div>

      {/* Action Buttons - Non-Fixed */}
      <div className="p-4 mt-4 mb-24 bg-black">
        <div className="flex gap-2 max-w-md mx-auto">
          <button 
            onClick={() => router.back()}
            className="w-full py-3 px-4 rounded-md bg-gray-800 text-white font-medium hover:bg-gray-700 transition-colors"
          >
            Cancel
          </button>
          <button 
            onClick={initiateSurvey}
            className="w-full py-3 px-4 rounded-md bg-neon-green text-black font-medium hover:bg-neon-green/90 transition-colors"
          >
            <span className="flex items-center justify-center">
              <Check className="w-5 h-5 mr-2" />
              Complete Workout
            </span>
          </button>
        </div>
      </div>

      {/* Modals */}
      {/* Rest Timer Modal */}
      {timerActive && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-gray-900 rounded-2xl p-8 max-w-sm w-full mx-4 text-center">
            <h3 className="text-2xl font-bold mb-2">Rest Timer</h3>
            <div className="text-6xl font-bold text-neon-green mb-6">
              {formatTime(timer)}
    </div>
            <div className="flex gap-3">
              <button
                onClick={() => setTimerActive(false)}
                className="flex-1 py-3 px-4 rounded bg-gray-800 hover:bg-gray-700 font-medium"
              >
                Skip
              </button>
              <button
                onClick={() => {
                  setTimer(initialTimer);
                  setTimerActive(true);
                }}
                className="flex-1 py-3 px-4 rounded bg-neon-green hover:bg-neon-green/90 text-black font-medium"
              >
                Restart
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Weight Feeling Survey */}
      {weightSurveyOpen && surveyExercise && (
        <WeightFeelingSurvey
          isOpen={weightSurveyOpen}
          onClose={() => {
            setWeightSurveyOpen(false);
          }}
          mesocycleId={surveyExercise.mesocycleId}
          weekKey={surveyExercise.weekKey}
          workoutIndex={surveyExercise.workoutIndex}
          exerciseIndex={surveyExercise.exerciseIndex}
          exerciseName={surveyExercise.exerciseName}
          userId={user?.uid || null}
          isAutoPopup={surveyExercise.isAutoPopup}
          onFeedbackSaved={() => {
            // Update local state with the new feedback - Use a proper state update
            setExercises(prevExercises => {
              // Create a deep copy to avoid modifying read-only objects
              const updatedExercises = JSON.parse(JSON.stringify(prevExercises));
              
              // Find the exercise that was just updated
              const exerciseIndex = updatedExercises.findIndex((ex: any) => 
                ex.name === surveyExercise.exerciseName
              );
              
              if (exerciseIndex >= 0) {
                // Create a new feedback object if it doesn't exist
                if (!updatedExercises[exerciseIndex].feedback) {
                  updatedExercises[exerciseIndex].feedback = {};
                }
                
                // Set temporary feedback value to be updated from Firebase later
                updatedExercises[exerciseIndex].feedback.weightFeeling = "just_right";
                console.log(`⭐ Updated local state for ${surveyExercise.exerciseName} with temporary feedback value`);
              }
              
              return updatedExercises;
            });
            
            // Fetch the actual value from Firebase as before...
            if (currentMesocycle) {
              const docRef = doc(db, 'mesocycles', currentMesocycle.id);
              getDoc(docRef).then(docSnap => {
                if (docSnap.exists()) {
                  // Process Firebase data as before...
                }
              }).catch(error => {
                console.error("Error fetching updated feedback from Firebase:", error);
              });
            }
            
            console.log("Weight feeling feedback saved and local state updated");
          }}
        />
      )}

      {/* Add Exercise Modal */}
      <Modal
        isOpen={addExerciseModalOpen}
        onClose={() => setAddExerciseModalOpen(false)}
        title="Add Custom Exercise"
      >
        <div className="p-4">
          <div className="space-y-4">
            <div>
              <label htmlFor="exercise-name" className="block text-sm font-medium text-gray-300 mb-1">
                Exercise Name
              </label>
              <input
                id="exercise-name"
                type="text"
                placeholder="e.g., Dumbbell Curl"
                value={newExercise.name}
                onChange={(e) => setNewExercise({...newExercise, name: e.target.value})}
                className="w-full bg-gray-800 rounded p-3 focus:ring-1 focus:ring-neon-green outline-none"
              />
            </div>
            
            <div>
              <label htmlFor="muscle-group" className="block text-sm font-medium text-gray-300 mb-1">
                Muscle Group
              </label>
              <select
                id="muscle-group"
                value={newExercise.muscleGroup}
                onChange={(e) => setNewExercise({...newExercise, muscleGroup: e.target.value})}
                className="w-full bg-gray-800 rounded p-3 focus:ring-1 focus:ring-neon-green outline-none"
              >
                <option value="chest">Chest</option>
                <option value="back">Back</option>
                <option value="shoulders">Shoulders</option>
                <option value="legs">Legs</option>
                <option value="arms">Arms</option>
                <option value="core">Core</option>
                <option value="other">Other</option>
              </select>
            </div>
            
            <div className="flex gap-4">
              <div className="flex-1">
                <label htmlFor="sets" className="block text-sm font-medium text-gray-300 mb-1">
                  Sets
                </label>
                <input
                  id="sets"
                  type="number"
                  min="1"
                  max="10"
                  value={newExercise.sets}
                  onChange={(e) => setNewExercise({...newExercise, sets: parseInt(e.target.value) || 1})}
                  className="w-full bg-gray-800 rounded p-3 focus:ring-1 focus:ring-neon-green outline-none"
                />
              </div>
              
              <div className="flex-1">
                <label htmlFor="reps" className="block text-sm font-medium text-gray-300 mb-1">
                  Reps
                </label>
                <input
                  id="reps"
                  type="number"
                  min="1"
                  max="100"
                  value={newExercise.reps}
                  onChange={(e) => setNewExercise({...newExercise, reps: parseInt(e.target.value) || 1})}
                  className="w-full bg-gray-800 rounded p-3 focus:ring-1 focus:ring-neon-green outline-none"
                />
              </div>
            </div>
            
            <div>
              <label htmlFor="weight" className="block text-sm font-medium text-gray-300 mb-1">
                Starting Weight (optional)
              </label>
              <input
                id="weight"
                type="text"
                placeholder="e.g., 25"
                value={newExercise.weight}
                onChange={(e) => setNewExercise({...newExercise, weight: e.target.value})}
                className="w-full bg-gray-800 rounded p-3 focus:ring-1 focus:ring-neon-green outline-none"
              />
            </div>
            
            <div className="flex items-center gap-2 mt-2">
              <input
                id="propagate"
                type="checkbox"
                checked={newExercise.propagateToAllWeeks}
                onChange={(e) => setNewExercise({...newExercise, propagateToAllWeeks: e.target.checked})}
                className="w-4 h-4 accent-neon-green"
              />
              <label htmlFor="propagate" className="text-sm text-gray-300">
                Add this exercise to all weeks in this mesocycle
              </label>
            </div>
            
            {!newExercise.propagateToAllWeeks && (
              <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-3 mt-2">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="text-yellow-500 w-5 h-5 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm text-yellow-200">
                      This exercise will only be added to the current workout, not future weeks.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          <div className="mt-6 flex justify-end gap-3">
            <button
              className="bg-gray-700 hover:bg-gray-600 text-white font-medium px-4 py-2 rounded"
              onClick={() => setAddExerciseModalOpen(false)}
            >
              Cancel
            </button>
            
            <button
              className="bg-neon-green hover:bg-neon-green/90 text-black font-medium px-4 py-2 rounded flex items-center gap-2"
              onClick={addCustomExercise}
              disabled={!newExercise.name.trim()}
            >
              <Dumbbell className="w-4 h-4" /> Add Exercise
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete Exercise Confirmation Modal */}
      <Modal
        isOpen={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setExerciseToDelete(null);
        }}
        title="Delete Exercise"
      >
        <div className="p-4">
          <p className="mb-6 text-gray-300">
            {exerciseToDelete && `Are you sure you want to delete "${exerciseToDelete.name}"?`}
          </p>
          
          <div className="flex flex-col gap-4">
            <button
              onClick={() => {
                if (exerciseToDelete) {
                  const exerciseIndex = exercises.findIndex(ex => ex.id === exerciseToDelete.id);
                  if (exerciseIndex !== -1) {
                    deleteExercise(exerciseIndex);
                  }
                }
                setDeleteModalOpen(false);
                setExerciseToDelete(null);
              }}
              className="py-3 px-4 rounded-md border border-gray-700 bg-gray-800 text-white font-medium hover:bg-gray-700"
            >
              Delete from this workout only
            </button>
            
            <button
              onClick={deleteExerciseFromAllWeeks}
              className="py-3 px-4 rounded-md bg-red-600 text-white font-medium hover:bg-red-700 flex items-center justify-center gap-2"
            >
              {isCompleting ? (
                <span className="flex items-center gap-2">
                  <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"/>
                  Processing...
                </span>
              ) : (
                <>
                  <Trash className="w-4 h-4" />
                  Delete from all workouts
                </>
              )}
            </button>
            
            <button
              onClick={() => {
                setDeleteModalOpen(false);
                setExerciseToDelete(null);
              }}
              className="py-2 px-4 text-gray-400 hover:text-white"
            >
              Cancel
            </button>
          </div>
        </div>
      </Modal>
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