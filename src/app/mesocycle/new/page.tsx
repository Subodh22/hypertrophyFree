'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useDispatch, useSelector } from 'react-redux';
import { format, addWeeks, parse } from 'date-fns';
import { createMesocycleAsync, createMesocycle } from '@/lib/slices/workoutSlice';
import { RootState } from '@/lib/store';
import { Dumbbell, Calendar, ArrowLeft, ChevronDown, ChevronUp, Plus, X, AlertTriangle } from 'lucide-react';
import { useAuth } from '@/lib/hooks/useAuth';

// Exercise templates organized by muscle groups
const exerciseTemplates = {
  chest: [
    { id: 'bench-press', name: 'Barbell Bench Press', targetSets: 4, targetReps: 8, targetRIR: 2, exerciseType: 'strength', duration: 0 },
    { id: 'incline-press', name: 'Incline Dumbbell Press', targetSets: 3, targetReps: 10, targetRIR: 2, exerciseType: 'strength', duration: 0 },
    { id: 'chest-fly', name: 'Cable Chest Fly', targetSets: 3, targetReps: 12, targetRIR: 1, exerciseType: 'strength', duration: 0 },
    { id: 'dips', name: 'Chest Dips', targetSets: 3, targetReps: 10, targetRIR: 2, exerciseType: 'strength', duration: 0 },
    { id: 'incline-barbell-press', name: 'Incline Barbell Press', targetSets: 4, targetReps: 8, targetRIR: 2, exerciseType: 'strength', duration: 0 },
    { id: 'flat-dumbbell-press', name: 'Flat Dumbbell Press', targetSets: 4, targetReps: 10, targetRIR: 2, exerciseType: 'strength', duration: 0 },
    { id: 'close-grip-bench', name: 'Close-Grip Bench Press', targetSets: 4, targetReps: 10, targetRIR: 2, exerciseType: 'strength', duration: 0 },
  ],
  back: [
    { id: 'pull-up', name: 'Pull-ups', targetSets: 4, targetReps: 8, targetRIR: 2, exerciseType: 'strength', duration: 0 },
    { id: 'barbell-row', name: 'Barbell Row', targetSets: 4, targetReps: 10, targetRIR: 2, exerciseType: 'strength', duration: 0 },
    { id: 'lat-pulldown', name: 'Lat Pulldown', targetSets: 3, targetReps: 12, targetRIR: 1, exerciseType: 'strength', duration: 0 },
    { id: 'cable-row', name: 'Seated Cable Row', targetSets: 3, targetReps: 12, targetRIR: 1, exerciseType: 'strength', duration: 0 },
    { id: 'pendlay-row', name: 'Pendlay Row', targetSets: 4, targetReps: 8, targetRIR: 2, exerciseType: 'strength', duration: 0 },
    { id: 'bent-over-row', name: 'Bent-Over Barbell Row', targetSets: 4, targetReps: 8, targetRIR: 2, exerciseType: 'strength', duration: 0 },
    { id: 'chin-up', name: 'Chin-Ups', targetSets: 4, targetReps: 8, targetRIR: 2, exerciseType: 'strength', duration: 0 },
    { id: 'weighted-pull-up', name: 'Weighted Pull-Ups', targetSets: 4, targetReps: 8, targetRIR: 2, exerciseType: 'strength', duration: 0 },
    { id: 'tbar-row', name: 'T-Bar Rows', targetSets: 4, targetReps: 10, targetRIR: 2, exerciseType: 'strength', duration: 0 },
    { id: 'single-arm-row', name: 'Single-Arm Dumbbell Row', targetSets: 4, targetReps: 10, targetRIR: 2, exerciseType: 'strength', duration: 0 },
    { id: 'chest-supported-row', name: 'Chest-Supported Row', targetSets: 4, targetReps: 10, targetRIR: 2, exerciseType: 'strength', duration: 0 },
    { id: 'face-pull', name: 'Face Pulls', targetSets: 3, targetReps: 15, targetRIR: 1, exerciseType: 'strength', duration: 0 },
  ],
  legs: [
    { id: 'squat', name: 'Barbell Squat', targetSets: 4, targetReps: 8, targetRIR: 2, exerciseType: 'strength', duration: 0 },
    { id: 'deadlift', name: 'Deadlift', targetSets: 4, targetReps: 6, targetRIR: 2, exerciseType: 'strength', duration: 0 },
    { id: 'leg-press', name: 'Leg Press', targetSets: 3, targetReps: 12, targetRIR: 1, exerciseType: 'strength', duration: 0 },
    { id: 'leg-extension', name: 'Leg Extension', targetSets: 3, targetReps: 15, targetRIR: 1, exerciseType: 'strength', duration: 0 },
    { id: 'leg-curl', name: 'Leg Curl', targetSets: 3, targetReps: 12, targetRIR: 1, exerciseType: 'strength', duration: 0 },
    { id: 'front-squat', name: 'Front Squat', targetSets: 4, targetReps: 8, targetRIR: 2, exerciseType: 'strength', duration: 0 },
    { id: 'rdl', name: 'Romanian Deadlift', targetSets: 3, targetReps: 10, targetRIR: 2, exerciseType: 'strength', duration: 0 },
    { id: 'walking-lunge', name: 'Walking Lunges', targetSets: 3, targetReps: 10, targetRIR: 2, exerciseType: 'strength', duration: 0 },
    { id: 'calf-raise', name: 'Standing Calf Raises', targetSets: 3, targetReps: 15, targetRIR: 1, exerciseType: 'strength', duration: 0 },
    { id: 'seated-calf-raise', name: 'Seated Calf Raises', targetSets: 3, targetReps: 15, targetRIR: 1, exerciseType: 'strength', duration: 0 },
    { id: 'hip-thrust', name: 'Hip Thrusts', targetSets: 3, targetReps: 10, targetRIR: 2, exerciseType: 'strength', duration: 0 },
    { id: 'hack-squat', name: 'Hack Squats', targetSets: 4, targetReps: 10, targetRIR: 2, exerciseType: 'strength', duration: 0 },
    { id: 'safety-bar-squat', name: 'Safety Bar Squats', targetSets: 4, targetReps: 8, targetRIR: 2, exerciseType: 'strength', duration: 0 },
    { id: 'stiff-legged-deadlift', name: 'Stiff-Legged Deadlifts', targetSets: 4, targetReps: 10, targetRIR: 2, exerciseType: 'strength', duration: 0 },
    { id: 'bulgarian-split-squat', name: 'Bulgarian Split Squats', targetSets: 3, targetReps: 10, targetRIR: 2, exerciseType: 'strength', duration: 0 },
  ],
  shoulders: [
    { id: 'military-press', name: 'Standing Barbell Military Press', targetSets: 3, targetReps: 8, targetRIR: 2, exerciseType: 'strength', duration: 0 },
    { id: 'db-shoulder-press', name: 'Seated Dumbbell Shoulder Press', targetSets: 3, targetReps: 10, targetRIR: 2, exerciseType: 'strength', duration: 0 },
    { id: 'lateral-raise', name: 'Lateral Raises', targetSets: 3, targetReps: 15, targetRIR: 1, exerciseType: 'strength', duration: 0 },
    { id: 'push-press', name: 'Push Press', targetSets: 4, targetReps: 8, targetRIR: 2, exerciseType: 'strength', duration: 0 },
    { id: 'arnold-press', name: 'Arnold Presses', targetSets: 4, targetReps: 10, targetRIR: 2, exerciseType: 'strength', duration: 0 },
    { id: 'upright-row', name: 'Upright Rows', targetSets: 4, targetReps: 12, targetRIR: 1, exerciseType: 'strength', duration: 0 },
  ],
  arms: [
    { id: 'tricep-pushdown', name: 'Tricep Pushdowns', targetSets: 3, targetReps: 12, targetRIR: 1, exerciseType: 'strength', duration: 0 },
    { id: 'ez-curl', name: 'EZ-Bar Curls', targetSets: 3, targetReps: 10, targetRIR: 1, exerciseType: 'strength', duration: 0 },
    { id: 'hammer-curl', name: 'Hammer Curls', targetSets: 3, targetReps: 12, targetRIR: 1, exerciseType: 'strength', duration: 0 },
    { id: 'overhead-extension', name: 'Overhead Tricep Extensions', targetSets: 3, targetReps: 12, targetRIR: 1, exerciseType: 'strength', duration: 0 },
    { id: 'dips', name: 'Dips', targetSets: 4, targetReps: 10, targetRIR: 2, exerciseType: 'strength', duration: 0 },
    { id: 'incline-curl', name: 'Incline Dumbbell Curls', targetSets: 4, targetReps: 10, targetRIR: 1, exerciseType: 'strength', duration: 0 },
    { id: 'cable-curl', name: 'Cable Curls', targetSets: 4, targetReps: 12, targetRIR: 1, exerciseType: 'strength', duration: 0 },
    { id: 'preacher-curl', name: 'Preacher Curls', targetSets: 4, targetReps: 10, targetRIR: 1, exerciseType: 'strength', duration: 0 },
    { id: 'rope-pushdown', name: 'Rope Pushdowns', targetSets: 4, targetReps: 12, targetRIR: 1, exerciseType: 'strength', duration: 0 },
    { id: 'reverse-curl', name: 'Reverse Curls', targetSets: 3, targetReps: 12, targetRIR: 1, exerciseType: 'strength', duration: 0 },
    { id: 'spider-curl', name: 'Spider Curls', targetSets: 4, targetReps: 12, targetRIR: 1, exerciseType: 'strength', duration: 0 },
  ],
  core: [
    { id: 'v-ups', name: 'V-Ups', targetSets: 3, targetReps: 15, targetRIR: 1, exerciseType: 'strength', duration: 0 },
    { id: 'leg-raises', name: 'Leg Raises', targetSets: 3, targetReps: 15, targetRIR: 1, exerciseType: 'strength', duration: 0 },
    { id: 'supported-in-out', name: 'Supported In/Out', targetSets: 3, targetReps: 20, targetRIR: 1, exerciseType: 'strength', duration: 0 },
    { id: 'kickouts', name: 'Kick-outs', targetSets: 3, targetReps: 15, targetRIR: 1, exerciseType: 'strength', duration: 0 },
    { id: 'mountain-climbers', name: 'Mountain Climbers', targetSets: 3, targetReps: 30, targetRIR: 1, exerciseType: 'strength', duration: 0 },
    { id: 'burpees', name: 'Burpees', targetSets: 3, targetReps: 10, targetRIR: 1, exerciseType: 'strength', duration: 0 },
    { id: 'planks', name: 'Planks', targetSets: 3, targetReps: 45, targetRIR: 1, exerciseType: 'strength', duration: 0 },
    { id: 'russian-twist', name: 'Russian Twists', targetSets: 3, targetReps: 15, targetRIR: 1, exerciseType: 'strength', duration: 0 },
    { id: 'bicycle-crunch', name: 'Bicycle Crunches', targetSets: 3, targetReps: 20, targetRIR: 1, exerciseType: 'strength', duration: 0 },
  ],
  cardio: [
    { id: 'stairmaster', name: 'Stairmaster', targetSets: 1, targetReps: 1, targetRIR: 0, exerciseType: 'cardio', duration: 20 },
    { id: 'treadmill', name: 'Treadmill', targetSets: 1, targetReps: 1, targetRIR: 0, exerciseType: 'cardio', duration: 20 },
    { id: 'stationary-bike', name: 'Stationary Bike', targetSets: 1, targetReps: 1, targetRIR: 0, exerciseType: 'cardio', duration: 20 },
  ],
};

// Sample 4-week templates
const weeklyTemplates = {
  "Push/Pull/Legs": [
    { day: "Monday", name: "Push Day (Chest & Triceps)", muscleGroups: ["chest"] },
    { day: "Wednesday", name: "Pull Day (Back & Biceps)", muscleGroups: ["back"] },
    { day: "Friday", name: "Leg Day", muscleGroups: ["legs"] },
  ],
  "Upper/Lower": [
    { day: "Monday", name: "Upper Body A", muscleGroups: ["chest", "back"] },
    { day: "Tuesday", name: "Lower Body A", muscleGroups: ["legs"] },
    { day: "Thursday", name: "Upper Body B", muscleGroups: ["chest", "back"] },
    { day: "Friday", name: "Lower Body B", muscleGroups: ["legs"] },
  ],
  "Full Body": [
    { day: "Monday", name: "Full Body A", muscleGroups: ["chest", "back", "legs"] },
    { day: "Wednesday", name: "Full Body B", muscleGroups: ["chest", "back", "legs"] },
    { day: "Friday", name: "Full Body C", muscleGroups: ["chest", "back", "legs"] },
  ],
  "Dr. Israetel 4-Week Hypertrophy": [
    { day: "Monday", name: "Upper Body A", muscleGroups: ["chest", "back", "shoulders", "arms"] },
    { day: "Tuesday", name: "Lower Body A", muscleGroups: ["legs"] },
    { day: "Thursday", name: "Upper Body B", muscleGroups: ["chest", "back", "shoulders", "arms"] },
    { day: "Friday", name: "Lower Body B", muscleGroups: ["legs"] },
  ],
  "Nanu's Workout": [
    { day: "Sunday", name: "Day 1: Pull Day (BACK + BICEP)", muscleGroups: ["back", "arms"] },
    { day: "Sunday", name: "Day 2: GLUTES + HAMSTRING", muscleGroups: ["legs"] },
    { day: "Thursday", name: "Day 3: Push Day (CHEST, SHOULDERS + TRICEPS)", muscleGroups: ["chest", "shoulders", "arms"] },
    { day: "Thursday", name: "Day 4: QUADS-focused + CALVES", muscleGroups: ["legs"] },
    { day: "Wednesday", name: "Day 5: CARDIO + ABS", muscleGroups: ["core"] },
  ],
};

// Define exercise template type
export type ExerciseTemplate = {
  id: string;
  name: string;
  muscleGroup: string;
  sets: number;
  reps: number;
  notes?: string;
  exerciseType?: string; // 'strength' or 'cardio'
  duration?: number; // in minutes, for cardio exercises
};

// Define workout data type
export type WorkoutData = {
  id: string;
  name: string;
  date: string;
  week: number;
  completed: boolean;
  exercises: any[];
  weekRPE?: {
    min: number;
    max: number;
    label: string;
  };
  feedback: any | null;
};

// Define workout templates
export type WeeklyWorkoutTemplate = {
  name: string;
  days: number[]; // 0 = Sunday, 1 = Monday, etc
  exercises: ExerciseTemplate[];
};

// Define weekly RPE targets
const weeklyRPE: Record<number, { min: number; max: number; label: string }> = {
  1: { min: 6, max: 7, label: "MEV Introduction (3-4 RIR) - Focus on technique and form" },
  2: { min: 7, max: 8, label: "Volume Accumulation (2-3 RIR) - Progressive overload begins" },
  3: { min: 8, max: 9, label: "MAV Optimization (1-2 RIR) - Higher intensity week" },
  4: { min: 9, max: 10, label: "MRV Peaking (0-1 RIR) - Maximum recoverable volume" },
  5: { min: 6, max: 7, label: "Deload week (3-4 RIR) - Reduced volume and intensity" }
};

export default function CreateMesocyclePage() {
  const router = useRouter();
  const dispatch = useDispatch();
  const { exercises } = useSelector((state: RootState) => state.exercise);
  const { loading } = useSelector((state: RootState) => state.workout);
  const { user } = useAuth();
  
  const [name, setName] = useState('4-Week Hypertrophy Block');
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [displayDate, setDisplayDate] = useState(format(new Date(), 'MM/dd/yyyy'));
  const [weeks, setWeeks] = useState(4);
  const [progression, setProgression] = useState(5); // 5% weekly progression
  const [includeDeload, setIncludeDeload] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState('Push/Pull/Legs');
  const [expandedWeeks, setExpandedWeeks] = useState<Record<number, boolean>>({ 1: true });
  
  // Generate workouts for each week of the mesocycle
  const generateWorkouts = (
    templates: WeeklyWorkoutTemplate[],  
    startDate: Date,
    numWeeks: number,
    includeDeload: boolean
  ): Record<string, WorkoutData[]> => {
    const workouts: Record<string, WorkoutData[]> = {};
    
    // For each week
    for (let week = 1; week <= numWeeks; week++) {
      const weekKey = `week${week}`;
      workouts[weekKey] = [];
      
      // Skip workouts for deload week if included
      if (week === 4 && includeDeload) {
        continue;
      }
      
      // For each template
      templates.forEach((template, templateIndex) => {
        // For each day in the template
        template.days.forEach((day, dayIndex) => {
          // Get the date for this workout - create a fresh copy of startDate for each iteration
          const workoutDate = new Date(startDate);
          
          // Calculate days to add based on week and day of week
          // Handle case where day might be NaN by defaulting to current day
          const dayOfWeek = typeof day === 'number' && !isNaN(day) ? day : workoutDate.getDay();
          
          // Calculate the days to add
          let daysToAdd = (week - 1) * 7; // Add weeks
          
          // Add days to reach the target day of week
          const currentDay = workoutDate.getDay(); // 0 = Sunday
          if (dayOfWeek >= currentDay) {
            daysToAdd += (dayOfWeek - currentDay);
          } else {
            daysToAdd += (7 - (currentDay - dayOfWeek));
          }
          
          // Apply the date adjustment
          workoutDate.setDate(workoutDate.getDate() + daysToAdd);
          
          // Validate date before formatting
          if (isNaN(workoutDate.getTime())) {
            console.error("Invalid date generated", { week, day, startDate, daysToAdd });
            // Use start date as fallback
            const fallbackDate = new Date(startDate);
            fallbackDate.setDate(fallbackDate.getDate() + (week - 1) * 7);
            
            // Format date for display and create workout ID
            const dateStr = format(fallbackDate, 'yyyy-MM-dd');
            const workoutId = `workout-w${week}-${templateIndex}-${dayIndex}`;
            
            // Create exercises for this workout
            const exercises = template.exercises.map((exerciseTemplate, exerciseIndex) => {
              // Generate a consistent exercise ID across weeks
              const baseExerciseId = exerciseTemplate.id;
              const exerciseId = `${workoutId}-${baseExerciseId}`;
              
              // For the first week, create empty sets with just RPE targets
              // For later weeks, we'll use data from previous weeks
              const generatedSets = Array.from({ length: exerciseTemplate.sets }, (_, i) => {
                return {
                  id: `${exerciseId}-set-${i+1}`,
                  number: i + 1,
                  targetReps: exerciseTemplate.reps,
                  targetWeight: "", // Empty for first week
                  completedReps: "",
                  completedWeight: "",
                };
              });
              
              return {
                id: exerciseId,
                name: exerciseTemplate.name,
                muscleGroup: exerciseTemplate.muscleGroup,
                sets: exerciseTemplate.sets,
                reps: exerciseTemplate.reps,
                weight: "", // Empty for first week
                notes: exerciseTemplate.notes || "",
                generatedSets,
                weightFeeling: "", // Initialize weight feeling feedback
                baseExerciseId: baseExerciseId, // Store the consistent ID for tracking across weeks
                feedback: {
                  weightFeeling: "", // How the weight felt (too light, just right, too heavy, etc.)
                  muscleActivation: "", // How well the target muscles were activated
                  performanceRating: "", // Overall performance rating (1-5)
                  notes: "", // Any specific notes about this exercise
                  timestamp: "" // When the feedback was provided
                }
              };
            });
            
            // Get unique muscle groups to add to workout name
            const muscleGroups = Array.from(new Set(exercises.map(ex => ex.muscleGroup)));
            const muscleGroupsFormatted = muscleGroups.join(' & ');
            
            // Create the workout
            const workout: WorkoutData = {
              id: workoutId,
              name: `${template.name} (${muscleGroupsFormatted}) (Week ${week})`,
              date: dateStr,
              week,
              completed: false,
              exercises,
              weekRPE: weeklyRPE[week], // Add the weekly RPE target
              feedback: null // Initialize feedback as null
            };
            
            workouts[weekKey].push(workout);
          } else {
            // Format date for display and create workout ID
            const dateStr = format(workoutDate, 'yyyy-MM-dd');
            const workoutId = `workout-w${week}-${templateIndex}-${dayIndex}`;
            
            // Create exercises for this workout
            const exercises = template.exercises.map((exerciseTemplate, exerciseIndex) => {
              // Generate a consistent exercise ID across weeks
              const baseExerciseId = exerciseTemplate.id;
              const exerciseId = `${workoutId}-${baseExerciseId}`;
              
              // For the first week, create empty sets with just RPE targets
              // For later weeks, we'll use data from previous weeks
              const generatedSets = Array.from({ length: exerciseTemplate.sets }, (_, i) => {
                return {
                  id: `${exerciseId}-set-${i+1}`,
                  number: i + 1,
                  targetReps: exerciseTemplate.reps,
                  targetWeight: "", // Empty for first week
                  completedReps: "",
                  completedWeight: "",
                };
              });
              
              return {
                id: exerciseId,
                name: exerciseTemplate.name,
                muscleGroup: exerciseTemplate.muscleGroup,
                sets: exerciseTemplate.sets,
                reps: exerciseTemplate.reps,
                weight: "", // Empty for first week
                notes: exerciseTemplate.notes || "",
                generatedSets,
                weightFeeling: "", // Initialize weight feeling feedback
                baseExerciseId: baseExerciseId, // Store the consistent ID for tracking across weeks
                feedback: {
                  weightFeeling: "", // How the weight felt (too light, just right, too heavy, etc.)
                  muscleActivation: "", // How well the target muscles were activated
                  performanceRating: "", // Overall performance rating (1-5)
                  notes: "", // Any specific notes about this exercise
                  timestamp: "" // When the feedback was provided
                }
              };
            });
            
            // Get unique muscle groups to add to workout name
            const muscleGroups = Array.from(new Set(exercises.map(ex => ex.muscleGroup)));
            const muscleGroupsFormatted = muscleGroups.join(' & ');
            
            // Create the workout
            const workout: WorkoutData = {
              id: workoutId,
              name: `${template.name} (${muscleGroupsFormatted}) (Week ${week})`,
              date: dateStr,
              week,
              completed: false,
              exercises,
              weekRPE: weeklyRPE[week], // Add the weekly RPE target
              feedback: null // Initialize feedback as null
            };
            
            workouts[weekKey].push(workout);
          }
        });
      });
    }
    
    return workouts;
  };
  
  // Function to create workout templates from the selected template
  const createWorkoutTemplates = (selectedTemplateName: string): WeeklyWorkoutTemplate[] => {
    const templates: WeeklyWorkoutTemplate[] = [];
    const selectedTemplateConfig = weeklyTemplates[selectedTemplateName as keyof typeof weeklyTemplates] || [];
    
    console.log('Selected template:', selectedTemplateName);
    console.log('Template config:', selectedTemplateConfig);
    
    // Special handling for templates
    if (selectedTemplateName === "Dr. Israetel 4-Week Hypertrophy") {
      return createIsraetelHypertrophyTemplate();
    } else if (selectedTemplateName === "Nanu's Workout") {
      return createNanuWorkoutTemplate();
    }
    
    // Create a workout template for each day
    selectedTemplateConfig.forEach((day) => {
      const exercises: ExerciseTemplate[] = [];
      
      console.log('Processing day:', day);
      
      // Add exercises for each muscle group
      day.muscleGroups.forEach((muscleGroup) => {
        console.log('Processing muscle group:', muscleGroup);
        const exercisesForGroup = exerciseTemplates[muscleGroup as keyof typeof exerciseTemplates] || [];
        console.log('Exercises for group:', exercisesForGroup);
        
        // Add each exercise to the template - limit to 2 exercises per muscle group for now
        exercisesForGroup.slice(0, 2).forEach((exercise) => {
          console.log('Adding exercise:', exercise);
          exercises.push({
            id: `${exercise.id}-${muscleGroup}`, // Create a consistent ID based on exercise and muscle group
            name: exercise.name,
            muscleGroup: muscleGroup,
            sets: exercise.targetSets,
            reps: exercise.targetReps,
            notes: undefined, // Use undefined instead of accessing non-existent property
            exerciseType: exercise.exerciseType,
            duration: exercise.duration
          });
        });
      });
      
      console.log('Final exercises for day:', exercises);
      
      // Map day string to day number
      let dayNumber = 1; // Default to Monday
      
      // Convert day string to day number
      switch(day.day.toLowerCase()) {
        case "sunday": dayNumber = 0; break;
        case "monday": dayNumber = 1; break;
        case "tuesday": dayNumber = 2; break;
        case "wednesday": dayNumber = 3; break;
        case "thursday": dayNumber = 4; break;
        case "friday": dayNumber = 5; break;
        case "saturday": dayNumber = 6; break;
        default: 
          // Try parsing the day directly as a number (0-6)
          const parsed = parseInt(day.day);
          if (!isNaN(parsed) && parsed >= 0 && parsed <= 6) {
            dayNumber = parsed;
          }
      }
      
      // Create the template for this day
      templates.push({
        name: day.name,
        days: [dayNumber], // Use the properly converted day number
        exercises
      });
    });
    
    console.log('Final templates:', templates);
    return templates;
  };
  
  // Special function to create Dr. Israetel's detailed hypertrophy template
  const createIsraetelHypertrophyTemplate = (): WeeklyWorkoutTemplate[] => {
    const templates: WeeklyWorkoutTemplate[] = [];
    
    // Log deload status
    console.log('Creating Dr. Israetel template with includeDeload:', includeDeload);
    
    // Upper Body A (Monday)
    const upperBodyA: ExerciseTemplate[] = [
      {
        id: 'bench-press-chest',
        name: 'Barbell Bench Press',
        muscleGroup: 'chest',
        sets: 4,
        reps: 8,
        notes: 'Progressive overload focus, 3-4 RIR in week 1, 0-1 RIR by week 4',
        exerciseType: 'strength',
        duration: 0
      },
      {
        id: 'bent-over-row-back',
        name: 'Bent-Over Barbell Rows',
        muscleGroup: 'back',
        sets: 4,
        reps: 8,
        notes: 'Focus on controlled eccentric phase',
        exerciseType: 'strength',
        duration: 0
      },
      {
        id: 'military-press-shoulders',
        name: 'Standing Barbell Military Press',
        muscleGroup: 'shoulders',
        sets: 3,
        reps: 8,
        notes: 'Maintain tight core for stability',
        exerciseType: 'strength',
        duration: 0
      },
      {
        id: 'pull-up-back',
        name: 'Pull-Ups or Lat Pulldowns',
        muscleGroup: 'back',
        sets: 3,
        reps: 10,
        notes: 'Use assisted pull-ups if needed',
        exerciseType: 'strength',
        duration: 0
      },
      {
        id: 'tricep-pushdown-arms',
        name: 'Tricep Pushdowns',
        muscleGroup: 'arms',
        sets: 3,
        reps: 12,
        notes: 'Focus on full extension',
        exerciseType: 'strength',
        duration: 0
      },
      {
        id: 'ez-curl-arms',
        name: 'EZ-Bar Curls',
        muscleGroup: 'arms',
        sets: 3,
        reps: 10,
        notes: 'Controlled tempo',
        exerciseType: 'strength',
        duration: 0
      }
    ];
    
    // Lower Body A (Tuesday)
    const lowerBodyA: ExerciseTemplate[] = [
      {
        id: 'squat-legs',
        name: 'Barbell Back Squats',
        muscleGroup: 'legs',
        sets: 4,
        reps: 8,
        notes: 'Focus on depth and knee tracking',
        exerciseType: 'strength',
        duration: 0
      },
      {
        id: 'rdl-legs',
        name: 'Romanian Deadlifts',
        muscleGroup: 'legs',
        sets: 3,
        reps: 10,
        notes: 'Maintain flat back throughout movement',
        exerciseType: 'strength',
        duration: 0
      },
      {
        id: 'leg-press-legs',
        name: 'Leg Press',
        muscleGroup: 'legs',
        sets: 3,
        reps: 12,
        notes: 'Full range of motion',
        exerciseType: 'strength',
        duration: 0
      },
      {
        id: 'leg-curl-legs',
        name: 'Leg Curls',
        muscleGroup: 'legs',
        sets: 3,
        reps: 12,
        notes: 'Control the eccentric phase',
        exerciseType: 'strength',
        duration: 0
      },
      {
        id: 'calf-raise-legs',
        name: 'Standing Calf Raises',
        muscleGroup: 'legs',
        sets: 3,
        reps: 15,
        notes: 'Full stretch at bottom, full contraction at top',
        exerciseType: 'strength',
        duration: 0
      }
    ];
    
    // Upper Body B (Thursday)
    const upperBodyB: ExerciseTemplate[] = [
      {
        id: 'incline-press-chest',
        name: 'Incline Dumbbell Press',
        muscleGroup: 'chest',
        sets: 4,
        reps: 10,
        notes: 'Focus on upper chest activation',
        exerciseType: 'strength',
        duration: 0
      },
      {
        id: 'cable-row-back',
        name: 'Seated Cable Rows',
        muscleGroup: 'back',
        sets: 4,
        reps: 10,
        notes: 'Squeeze shoulder blades together',
        exerciseType: 'strength',
        duration: 0
      },
      {
        id: 'lateral-raise-shoulders',
        name: 'Lateral Raises',
        muscleGroup: 'shoulders',
        sets: 3,
        reps: 15,
        notes: 'Keep slight bend in elbows',
        exerciseType: 'strength',
        duration: 0
      },
      {
        id: 'face-pull-back',
        name: 'Face Pulls',
        muscleGroup: 'back',
        sets: 3,
        reps: 15,
        notes: 'Focus on external rotation at end range',
        exerciseType: 'strength',
        duration: 0
      },
      {
        id: 'overhead-extension-arms',
        name: 'Overhead Tricep Extensions',
        muscleGroup: 'arms',
        sets: 3,
        reps: 12,
        notes: 'Keep elbows close to head',
        exerciseType: 'strength',
        duration: 0
      },
      {
        id: 'hammer-curl-arms',
        name: 'Hammer Curls',
        muscleGroup: 'arms',
        sets: 3,
        reps: 12,
        notes: 'Focus on brachialis development',
        exerciseType: 'strength',
        duration: 0
      }
    ];
    
    // Lower Body B (Friday)
    const lowerBodyB: ExerciseTemplate[] = [
      {
        id: 'front-squat-legs',
        name: 'Front Squats',
        muscleGroup: 'legs',
        sets: 4,
        reps: 8,
        notes: 'Maintain upright torso',
        exerciseType: 'strength',
        duration: 0
      },
      {
        id: 'hip-thrust-legs',
        name: 'Hip Thrusts',
        muscleGroup: 'legs',
        sets: 3,
        reps: 10,
        notes: 'Full hip extension at top',
        exerciseType: 'strength',
        duration: 0
      },
      {
        id: 'walking-lunge-legs',
        name: 'Walking Lunges',
        muscleGroup: 'legs',
        sets: 3,
        reps: 10,
        notes: '10 steps per leg',
        exerciseType: 'strength',
        duration: 0
      },
      {
        id: 'leg-extension-legs',
        name: 'Leg Extensions',
        muscleGroup: 'legs',
        sets: 3,
        reps: 15,
        notes: 'Focus on quad contraction',
        exerciseType: 'strength',
        duration: 0
      },
      {
        id: 'seated-calf-raise-legs',
        name: 'Seated Calf Raises',
        muscleGroup: 'legs',
        sets: 3,
        reps: 15,
        notes: 'Emphasize soleus activation',
        exerciseType: 'strength',
        duration: 0
      }
    ];
    
    // Deload Upper Body
    const deloadUpperBody: ExerciseTemplate[] = [
      {
        id: 'machine-chest-press-chest',
        name: 'Machine Chest Press',
        muscleGroup: 'chest',
        sets: 3,
        reps: 12,
        notes: 'Deload week: reduced weight, moderate reps',
        exerciseType: 'strength',
        duration: 0
      },
      {
        id: 'lat-pulldown-back',
        name: 'Lat Pulldowns',
        muscleGroup: 'back',
        sets: 3,
        reps: 12,
        notes: 'Deload week: focus on technique',
        exerciseType: 'strength',
        duration: 0
      },
      {
        id: 'lateral-raise-shoulders',
        name: 'Dumbbell Lateral Raises',
        muscleGroup: 'shoulders',
        sets: 2,
        reps: 15,
        notes: 'Light weight, focus on controlled motion',
        exerciseType: 'strength',
        duration: 0
      },
      {
        id: 'face-pull-back',
        name: 'Cable Face Pulls',
        muscleGroup: 'back',
        sets: 2,
        reps: 15,
        notes: 'Emphasize scapular retraction',
        exerciseType: 'strength',
        duration: 0
      },
      {
        id: 'tricep-pushdown-arms',
        name: 'Tricep Pushdowns',
        muscleGroup: 'arms',
        sets: 2,
        reps: 15,
        notes: 'Light weight, focus on contraction',
        exerciseType: 'strength',
        duration: 0
      },
      {
        id: 'dumbbell-curl-arms',
        name: 'Dumbbell Curls',
        muscleGroup: 'arms',
        sets: 2,
        reps: 15,
        notes: 'Controlled tempo',
        exerciseType: 'strength',
        duration: 0
      }
    ];
    
    // Deload Lower Body
    const deloadLowerBody: ExerciseTemplate[] = [
      {
        id: 'leg-press-legs',
        name: 'Leg Press',
        muscleGroup: 'legs',
        sets: 3,
        reps: 12,
        notes: 'Deload week: reduced weight, focus on form',
        exerciseType: 'strength',
        duration: 0
      },
      {
        id: 'rdl-legs',
        name: 'Romanian Deadlifts',
        muscleGroup: 'legs',
        sets: 3,
        reps: 12,
        notes: 'Light weight, perfect form',
        exerciseType: 'strength',
        duration: 0
      },
      {
        id: 'leg-curl-legs',
        name: 'Leg Curls',
        muscleGroup: 'legs',
        sets: 2,
        reps: 15,
        notes: 'Focus on hamstring contraction',
        exerciseType: 'strength',
        duration: 0
      },
      {
        id: 'leg-extension-legs',
        name: 'Leg Extensions',
        muscleGroup: 'legs',
        sets: 2,
        reps: 15,
        notes: 'Light weight, full range of motion',
        exerciseType: 'strength',
        duration: 0
      },
      {
        id: 'calf-raise-legs',
        name: 'Body Weight Calf Raises',
        muscleGroup: 'legs',
        sets: 2,
        reps: 20,
        notes: 'Focus on full stretch and contraction',
        exerciseType: 'strength',
        duration: 0
      }
    ];
    
    // Add all workouts to the template
    templates.push({
      name: "Upper Body A",
      days: [1], // Monday
      exercises: upperBodyA
    });
    
    templates.push({
      name: "Lower Body A",
      days: [2], // Tuesday
      exercises: lowerBodyA
    });
    
    templates.push({
      name: "Upper Body B",
      days: [4], // Thursday
      exercises: upperBodyB
    });
    
    templates.push({
      name: "Lower Body B",
      days: [5], // Friday
      exercises: lowerBodyB
    });
    
    // Add deload workouts if needed
    if (includeDeload) {
      templates.push({
        name: "Deload Upper Body",
        days: [1], // Monday (week 5)
        exercises: deloadUpperBody
      });
      
      templates.push({
        name: "Deload Lower Body",
        days: [3], // Wednesday (week 5)
        exercises: deloadLowerBody
      });
    }
    
    return templates;
  };
  
  // Special function to create Nanu's Workout template
  const createNanuWorkoutTemplate = (): WeeklyWorkoutTemplate[] => {
    const templates: WeeklyWorkoutTemplate[] = [];
    
    // Day 1: Pull Day (BACK + BICEP)
    const pullDay: ExerciseTemplate[] = [
      {
        id: 'pull-ups-back',
        name: 'Pull-Ups',
        muscleGroup: 'back',
        sets: 2,
        reps: 4,
        notes: 'Use thick band for assistance if needed',
        exerciseType: 'strength',
        duration: 0
      },
      {
        id: 'wide-grip-pulldown-back',
        name: 'Wide Grip Pulldown',
        muscleGroup: 'back',
        sets: 4,
        reps: 8,
        notes: 'Try close grip variation',
        exerciseType: 'strength',
        duration: 0
      },
      {
        id: 'seated-iso-lat-rows-back',
        name: 'Seated Iso-Lat Rows',
        muscleGroup: 'back',
        sets: 4,
        reps: 8,
        notes: 'Can substitute with Barbell Row',
        exerciseType: 'strength',
        duration: 0
      },
      {
        id: 'bicep-curls-arms',
        name: 'Bicep Curls',
        muscleGroup: 'arms',
        sets: 4,
        reps: 10,
        notes: 'Focus on full range of motion',
        exerciseType: 'strength',
        duration: 0
      },
      {
        id: 'cable-curls-arms',
        name: 'Cable Curls',
        muscleGroup: 'arms',
        sets: 4,
        reps: 10,
        notes: 'Progressive overload focus',
        exerciseType: 'strength',
        duration: 0
      },
      {
        id: 'back-extensions',
        name: 'Back Extensions',
        muscleGroup: 'back',
        sets: 4,
        reps: 8,
        notes: 'Add weight as needed',
        exerciseType: 'strength',
        duration: 0
      },
      {
        id: 'stairmaster-cardio',
        name: 'Stairmaster Routine',
        muscleGroup: 'cardio',
        sets: 1,
        reps: 1,
        notes: '15-20min: ~2 min hands resting (8kmh), ~2 min hands off (6kmh). Repeat until complete.',
        exerciseType: 'cardio',
        duration: 20
      }
    ];

    // Day 2: GLUTES + HAMSTRING
    const glutesHamstringDay: ExerciseTemplate[] = [
      {
        id: 'glute-drive-machine',
        name: 'Glute Drive Machine',
        muscleGroup: 'legs',
        sets: 4,
        reps: 8,
        notes: 'Superset with KAS Glute Bridge (4x8-10) and Hip Thrusts',
        exerciseType: 'strength',
        duration: 0
      },
      {
        id: 'split-squat',
        name: 'Split Squat',
        muscleGroup: 'legs',
        sets: 4,
        reps: 8,
        notes: 'Use dumbbells for added resistance',
        exerciseType: 'strength',
        duration: 0
      },
      {
        id: 'stiff-rdl',
        name: 'Stiff RDL',
        muscleGroup: 'legs',
        sets: 4,
        reps: 8,
        notes: 'Use dumbbells',
        exerciseType: 'strength',
        duration: 0
      },
      {
        id: 'hip-extension',
        name: 'Hip Extension',
        muscleGroup: 'legs',
        sets: 4,
        reps: 8,
        notes: 'Focus on glute contraction',
        exerciseType: 'strength',
        duration: 0
      },
      {
        id: 'cardio-10min',
        name: '10 Minutes Cardio',
        muscleGroup: 'cardio',
        sets: 1,
        reps: 1,
        notes: 'Light cardio for recovery',
        exerciseType: 'cardio',
        duration: 10
      }
    ];

    // Day 3: Push Day (CHEST, SHOULDERS + TRICEPS)
    const pushDay: ExerciseTemplate[] = [
      {
        id: 'incline-dumbbell-press',
        name: 'Incline Dumbbell Press',
        muscleGroup: 'chest',
        sets: 4,
        reps: 8,
        notes: 'Progressive weight increase',
        exerciseType: 'strength',
        duration: 0
      },
      {
        id: 'chest-press-machine',
        name: 'Chest Press Machine',
        muscleGroup: 'chest',
        sets: 4,
        reps: 8,
        notes: 'Alternate with Incline DB Press',
        exerciseType: 'strength',
        duration: 0
      },
      {
        id: 'cable-chest-flys',
        name: 'Cable Chest Flys',
        muscleGroup: 'chest',
        sets: 4,
        reps: 10,
        notes: 'Focus on squeezing chest',
        exerciseType: 'strength',
        duration: 0
      },
      {
        id: 'shoulder-press',
        name: 'Shoulder Press',
        muscleGroup: 'shoulders',
        sets: 4,
        reps: 8,
        notes: 'Dumbbell variation',
        exerciseType: 'strength',
        duration: 0
      },
      {
        id: 'upright-row',
        name: 'Upright Row',
        muscleGroup: 'shoulders',
        sets: 4,
        reps: 8,
        notes: 'Keep elbows high',
        exerciseType: 'strength',
        duration: 0
      },
      {
        id: 'lateral-raises',
        name: 'Lateral Raises',
        muscleGroup: 'shoulders',
        sets: 4,
        reps: 8,
        notes: 'Control the movement',
        exerciseType: 'strength',
        duration: 0
      },
      {
        id: 'tricep-extension',
        name: 'Tricep Extension',
        muscleGroup: 'arms',
        sets: 4,
        reps: 10,
        notes: '1 set warm up and 3 working sets',
        exerciseType: 'strength',
        duration: 0
      },
      {
        id: 'stairmill-cardio',
        name: 'Stairmill',
        muscleGroup: 'cardio',
        sets: 1,
        reps: 1,
        notes: '15 min at 7-9 km/h, include abs',
        exerciseType: 'cardio',
        duration: 15
      }
    ];

    // Day 4: QUADS-focused + CALVES
    const quadsCalvesDay: ExerciseTemplate[] = [
      {
        id: 'goblet-squats',
        name: 'Goblet Squats',
        muscleGroup: 'legs',
        sets: 4,
        reps: 10,
        notes: 'Superset, use dumbbells',
        exerciseType: 'strength',
        duration: 0
      },
      {
        id: 'reverse-lunges',
        name: 'Reverse Lunges',
        muscleGroup: 'legs',
        sets: 4,
        reps: 8,
        notes: 'Maintain balance throughout',
        exerciseType: 'strength',
        duration: 0
      },
      {
        id: 'leg-extension-dropset',
        name: 'Leg Extension Dropset',
        muscleGroup: 'legs',
        sets: 4,
        reps: 10,
        notes: '2x: 10,8,6 reps with decreasing weights',
        exerciseType: 'strength',
        duration: 0
      },
      {
        id: 'calf-raises',
        name: 'Calf Raises',
        muscleGroup: 'legs',
        sets: 4,
        reps: 10,
        notes: 'Add weight as you progress',
        exerciseType: 'strength',
        duration: 0
      },
      {
        id: 'treadmill-incline',
        name: 'Incline Treadmill',
        muscleGroup: 'cardio',
        sets: 1,
        reps: 1,
        notes: '15 mins at 12 incline',
        exerciseType: 'cardio',
        duration: 15
      }
    ];

    // Day 5: CARDIO + ABS
    const cardioAbsDay: ExerciseTemplate[] = [
      {
        id: 'stairmaster-cardio-day5',
        name: 'Stairmaster',
        muscleGroup: 'cardio',
        sets: 1,
        reps: 1,
        notes: '30 minutes session',
        exerciseType: 'cardio',
        duration: 30
      },
      {
        id: 'abs-circuit-1',
        name: 'Abs Circuit I',
        muscleGroup: 'core',
        sets: 4,
        reps: 1,
        notes: 'V-Ups (10 reps) + Supported In/Out (20 reps)',
        exerciseType: 'strength',
        duration: 0
      },
      {
        id: 'abs-circuit-2',
        name: 'Abs Circuit II',
        muscleGroup: 'core',
        sets: 4,
        reps: 1,
        notes: 'Kick-outs (10 reps) + Leg Raises (10 reps)',
        exerciseType: 'strength',
        duration: 0
      },
      {
        id: 'abs-circuit-3',
        name: 'Abs Circuit III',
        muscleGroup: 'core',
        sets: 4,
        reps: 1,
        notes: 'Mountain Climbers (30 reps) + Burpees (10 reps)',
        exerciseType: 'strength',
        duration: 0
      }
    ];

    // Add all workouts to the template
    templates.push({
      name: "Day 1: Pull Day (BACK + BICEP)",
      days: [0], // Sunday
      exercises: pullDay
    });

    templates.push({
      name: "Day 2: GLUTES + HAMSTRING",
      days: [0], // Sunday (alternate week)
      exercises: glutesHamstringDay
    });

    templates.push({
      name: "Day 3: Push Day (CHEST, SHOULDERS + TRICEPS)",
      days: [4], // Thursday
      exercises: pushDay
    });

    templates.push({
      name: "Day 4: QUADS-focused + CALVES",
      days: [4], // Thursday (alternate week)
      exercises: quadsCalvesDay
    });

    templates.push({
      name: "Day 5: CARDIO + ABS",
      days: [3], // Wednesday
      exercises: cardioAbsDay
    });

    return templates;
  };
  
  const handleSubmit = () => {
    const endDate = format(
      addWeeks(new Date(startDate), weeks + (includeDeload ? 1 : 0)), 
      'yyyy-MM-dd'
    );
    
    const workoutTemplates = createWorkoutTemplates(selectedTemplate);
    const workouts = generateWorkouts(
      workoutTemplates,
      new Date(startDate),
      weeks,
      includeDeload
    );
    
    const mesocycleData = {
      name,
      startDate,
      endDate,
      weeks,
      weeklyProgression: progression,
      includeDeload,
      workouts,
    };
    
    if (user) {
      // Save to Firestore if user is authenticated
      dispatch(createMesocycleAsync({ mesocycleData, userId: user.uid }) as any);
    } else {
      // Use local storage for guest mode
      dispatch(createMesocycle(mesocycleData));
    }
    
    router.push('/dashboard');
  };
  
  const toggleWeekExpand = (week: number) => {
    setExpandedWeeks(prev => ({
      ...prev,
      [week]: !prev[week]
    }));
  };
  
  // Calculate number of workouts in the template
  const workoutsPerWeek = weeklyTemplates[selectedTemplate as keyof typeof weeklyTemplates].length;
  
  // Handle date input change
  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDisplayDate = e.target.value;
    setDisplayDate(newDisplayDate);
    
    try {
      // Try to parse the date
      const parsedDate = parse(newDisplayDate, 'MM/dd/yyyy', new Date());
      if (!isNaN(parsedDate.getTime())) {
        setStartDate(format(parsedDate, 'yyyy-MM-dd'));
      }
    } catch (error) {
      // If parsing fails, just update the display date
      console.error('Date parsing error:', error);
    }
  };
  
  return (
    <div className="max-w-3xl mx-auto px-4 py-8 pb-24">
      <div className="flex items-center mb-6">
        <button
          onClick={() => router.back()}
          className="mr-4 p-2 rounded-full bg-black/30 hover:bg-black/50 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-3xl font-bold">Create Mesocycle</h1>
      </div>
      
      {!user && (
        <div className="card p-4 mb-6 flex items-start gap-3 bg-yellow-500/10 border-yellow-500/30">
          <AlertTriangle className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5" />
          <div>
            <h3 className="font-medium text-yellow-500">Guest Mode</h3>
            <p className="text-sm text-gray-400 mt-1">
              You&apos;re creating this mesocycle in guest mode. Your data will be saved locally but not synced across devices.
            </p>
          </div>
        </div>
      )}
      
      <div className="card p-6 mb-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Mesocycle Details</h2>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="btn-primary py-2 px-4 flex items-center gap-2"
          >
            {loading ? (
              <span>Creating...</span>
            ) : (
              <>
                <Plus className="w-5 h-5" /> Create Mesocycle
              </>
            )}
          </button>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="text-sm text-gray-400 block mb-1">Mesocycle Name</label>
            <input
              type="text"
              className="input-field w-full"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Summer Hypertrophy Block"
            />
          </div>
          
          <div>
            <label className="text-sm text-gray-400 block mb-1">Start Date</label>
            <input
              type="text"
              className="input-field w-full"
              value={displayDate}
              onChange={handleDateChange}
              placeholder="MM/DD/YYYY"
            />
          </div>
          
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="text-sm text-gray-400 block mb-1">Weeks</label>
              <input
                type="number"
                className="input-field w-full"
                value={weeks}
                onChange={(e) => setWeeks(parseInt(e.target.value) || 4)}
                min={1}
                max={12}
              />
            </div>
            
            <div className="flex-1">
              <label className="text-sm text-gray-400 block mb-1">Weekly Progression (%)</label>
              <input
                type="number"
                className="input-field w-full"
                value={progression}
                onChange={(e) => setProgression(parseInt(e.target.value) || 5)}
                min={0}
                max={20}
              />
            </div>
          </div>
          
          <div className="flex items-center">
            <label className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={includeDeload}
                onChange={() => setIncludeDeload(!includeDeload)}
                className="sr-only"
              />
              <div 
                className={`w-10 h-6 rounded-full flex items-center p-0.5 transition-colors ${
                  includeDeload ? 'bg-neon-green justify-end' : 'bg-gray-700 justify-start'
                }`}
              >
                <div className="w-5 h-5 rounded-full bg-white" />
              </div>
              <span className="ml-2 text-gray-300">Include Deload Week</span>
            </label>
          </div>
        </div>
      </div>
      
      <div className="card p-6 mb-8">
        <h2 className="text-xl font-bold mb-4">Training Split</h2>
        
        <div className="space-y-4">
          <div>
            <label className="text-sm text-gray-400 block mb-1">Select Template</label>
            <select
              className="input-field w-full"
              value={selectedTemplate}
              onChange={(e) => setSelectedTemplate(e.target.value)}
            >
              {Object.keys(weeklyTemplates).map((template) => (
                <option key={template} value={template}>
                  {template} ({weeklyTemplates[template as keyof typeof weeklyTemplates].length} workouts/week)
                </option>
              ))}
            </select>
          </div>
          
          <div className="bg-black/30 rounded-lg p-4">
            <h3 className="text-md font-semibold mb-3">Schedule Preview</h3>
            <div className="space-y-2">
              {weeklyTemplates[selectedTemplate as keyof typeof weeklyTemplates].map((workout, index) => (
                <div key={index} className="flex items-center py-1 border-b border-gray-800 last:border-0">
                  <div className="w-28 text-gray-400">{workout.day}</div>
                  <div className="flex-1">{workout.name}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      
      <div className="card p-6 mb-8">
        <h2 className="text-xl font-bold mb-4">Workout Preview</h2>
        <p className="text-gray-400 mb-4">
          {weeks} weeks × {workoutsPerWeek} workouts = {weeks * workoutsPerWeek} total workouts
        </p>
        
        <div className="space-y-4">
          {Array.from({ length: weeks }).map((_, weekIndex) => {
            const weekNumber = weekIndex + 1;
            const isExpanded = expandedWeeks[weekNumber] || false;
            
            return (
              <div key={weekNumber} className="border border-neon-green/20 rounded-lg overflow-hidden">
                <button
                  onClick={() => toggleWeekExpand(weekNumber)}
                  className="w-full flex items-center justify-between p-4 text-left"
                >
                  <div className="flex items-center">
                    <Calendar className="w-5 h-5 text-neon-green mr-2" />
                    <span className="font-semibold">Week {weekNumber}</span>
                  </div>
                  {isExpanded ? (
                    <ChevronUp className="w-5 h-5" />
                  ) : (
                    <ChevronDown className="w-5 h-5" />
                  )}
                </button>
                
                {isExpanded && (
                  <div className="p-4 pt-0">
                    <div className="space-y-3">
                      {weeklyTemplates[selectedTemplate as keyof typeof weeklyTemplates].map((workout, workoutIndex) => (
                        <div key={workoutIndex} className="bg-black/30 rounded-lg p-3">
                          <h4 className="font-semibold text-neon-green mb-2">{workout.name}</h4>
                          
                          <div className="space-y-2">
                            {workout.muscleGroups.map((group, groupIndex) => (
                              <div key={groupIndex}>
                                <div className="text-sm text-gray-400 mb-1">
                                  {group.charAt(0).toUpperCase() + group.slice(1)} Exercises:
                                </div>
                                
                                <div className="ml-2">
                                  {/* Check if group exists in exerciseTemplates before mapping */}
                                  {exerciseTemplates[group as keyof typeof exerciseTemplates] ? 
                                    exerciseTemplates[group as keyof typeof exerciseTemplates].map((exercise, exIndex) => {
                                    // Apply progressive overload calculations
                                    const weeklyOverload = (weekNumber - 1) * (progression / 100);
                                    const adjustedWeight = 1 + weeklyOverload;
                                    let repAdjustment = 0;
                                    if (weekNumber > 1) repAdjustment = -1;
                                    if (weekNumber > 2) repAdjustment = -2;
                                    
                                    return (
                                      <div key={exIndex} className="text-sm py-1 flex flex-wrap items-center">
                                        <span className="font-medium mr-2">{exercise.name}</span>
                                        <span className="text-gray-400">
                                          {exercise.targetSets} × {Math.max(4, exercise.targetReps + repAdjustment)} 
                                          {weekNumber > 1 ? ` (${Math.round(adjustedWeight * 100)}% weight)` : ''}
                                        </span>
                                      </div>
                                    );
                                    })
                                  : <div className="text-sm text-gray-500">Custom exercises will be used</div>}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
} 