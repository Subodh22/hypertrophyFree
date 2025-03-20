import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export type ThemeMode = 'dark' | 'light';

export interface UserPreferences {
  theme: ThemeMode;
  defaultRIR: number;
  measurementUnit: 'imperial' | 'metric';
  defaultRestTime: number; // in seconds
  showTips: boolean;
}

export interface UserStats {
  height?: number; // in cm or inches based on measurementUnit
  weight?: number; // in kg or lbs based on measurementUnit
  bodyFatPercentage?: number;
  fitnessGoal?: 'muscle_gain' | 'strength' | 'fat_loss' | 'endurance' | 'general_fitness';
  experienceLevel?: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  workoutsCompleted?: number;
  lastWorkout?: string; // ISO date string
  totalVolume?: number;
  uniqueExercises?: number;
  currentStreak?: number;
}

interface UserState {
  preferences: UserPreferences;
  stats: UserStats;
}

const initialState: UserState = {
  preferences: {
    theme: 'dark',
    defaultRIR: 2,
    measurementUnit: 'imperial',
    defaultRestTime: 90,
    showTips: true,
  },
  stats: {
    fitnessGoal: 'muscle_gain',
    experienceLevel: 'intermediate',
    workoutsCompleted: 0,
    totalVolume: 0,
    uniqueExercises: 0,
    currentStreak: 0,
  },
};

const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    updatePreferences: (state, action: PayloadAction<Partial<UserPreferences>>) => {
      state.preferences = {
        ...state.preferences,
        ...action.payload,
      };
    },
    updateStats: (state, action: PayloadAction<Partial<UserStats>>) => {
      state.stats = {
        ...state.stats,
        ...action.payload,
      };
    },
  },
});

export const {
  updatePreferences,
  updateStats,
} = userSlice.actions;

export default userSlice.reducer; 