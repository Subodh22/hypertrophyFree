import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export type MuscleGroup = 
  | 'chest' 
  | 'back' 
  | 'shoulders' 
  | 'biceps' 
  | 'triceps' 
  | 'quadriceps' 
  | 'hamstrings' 
  | 'glutes' 
  | 'calves' 
  | 'abs' 
  | 'forearms';

export type ExerciseCategory = 
  | 'compound' 
  | 'isolation' 
  | 'bodyweight' 
  | 'machine' 
  | 'cable' 
  | 'dumbbell' 
  | 'barbell' 
  | 'kettlebell';

export interface Exercise {
  id: string;
  name: string;
  targetMuscles: MuscleGroup[];
  secondaryMuscles: MuscleGroup[];
  category: ExerciseCategory[];
  description: string;
  videoUrl?: string;
  tips: string[];
}

interface ExerciseState {
  exercises: Exercise[];
  loading: boolean;
  error: string | null;
  selectedExerciseId: string | null;
}

const initialState: ExerciseState = {
  exercises: [
    {
      id: '1',
      name: 'Barbell Bench Press',
      targetMuscles: ['chest'],
      secondaryMuscles: ['shoulders', 'triceps'],
      category: ['compound', 'barbell'],
      description: 'A compound movement that targets the chest with secondary activation of the shoulders and triceps.',
      videoUrl: 'https://www.youtube.com/embed/xwzVX9M77M0',
      tips: [
        'Keep your feet flat on the floor',
        'Maintain a slight arch in your lower back',
        'Lower the bar to mid-chest level',
        'Keep your elbows at a 45-degree angle to your body'
      ]
    },
    {
      id: '2',
      name: 'Pull-up',
      targetMuscles: ['back'],
      secondaryMuscles: ['biceps', 'forearms'],
      category: ['compound', 'bodyweight'],
      description: 'An upper body exercise that primarily targets the lats and other back muscles.',
      videoUrl: 'https://www.youtube.com/embed/eGo4IYlbE5g',
      tips: [
        'Start with a dead hang',
        'Pull yourself up until your chin is over the bar',
        'Lower yourself with control', 
        'Avoid swinging or using momentum'
      ]
    },
    {
      id: '3',
      name: 'Barbell Squat',
      targetMuscles: ['quadriceps', 'glutes'],
      secondaryMuscles: ['hamstrings', 'calves', 'abs'],
      category: ['compound', 'barbell'],
      description: 'A fundamental lower body compound exercise that primarily targets the quadriceps and glutes.',
      videoUrl: 'https://www.youtube.com/embed/bEv6CCg2BC8',
      tips: [
        'Keep your chest up and core tight',
        'Push your knees out in the direction of your toes',
        'Lower until thighs are parallel with the ground or lower',
        'Drive through your heels on the way up'
      ]
    }
  ],
  loading: false,
  error: null,
  selectedExerciseId: null,
};

const exerciseSlice = createSlice({
  name: 'exercise',
  initialState,
  reducers: {
    addExercise: (state, action: PayloadAction<Omit<Exercise, 'id'>>) => {
      const newExercise: Exercise = {
        ...action.payload,
        id: crypto.randomUUID(),
      };
      state.exercises.push(newExercise);
    },
    updateExercise: (state, action: PayloadAction<{ id: string; updates: Partial<Omit<Exercise, 'id'>> }>) => {
      const { id, updates } = action.payload;
      const exerciseIndex = state.exercises.findIndex(e => e.id === id);
      
      if (exerciseIndex !== -1) {
        state.exercises[exerciseIndex] = {
          ...state.exercises[exerciseIndex],
          ...updates,
        };
      }
    },
    deleteExercise: (state, action: PayloadAction<string>) => {
      state.exercises = state.exercises.filter(e => e.id !== action.payload);
      
      if (state.selectedExerciseId === action.payload) {
        state.selectedExerciseId = null;
      }
    },
    selectExercise: (state, action: PayloadAction<string>) => {
      state.selectedExerciseId = action.payload;
    },
    clearSelectedExercise: (state) => {
      state.selectedExerciseId = null;
    },
  },
});

export const {
  addExercise,
  updateExercise,
  deleteExercise,
  selectExercise,
  clearSelectedExercise,
} = exerciseSlice.actions;

export default exerciseSlice.reducer; 