import { createSlice, PayloadAction, createAsyncThunk } from '@reduxjs/toolkit';
import { format } from 'date-fns';
import { saveMesocycle, getUserMesocycles, getMesocycleById, updateMesocycle as updateMesocycleInFirestore } from '../firebase/mesocycleUtils';

export interface Set {
  id: string;
  weight: number;
  reps: number;
  rir: number; // Reps In Reserve
  completed: boolean;
}

export interface ExerciseInstance {
  id: string;
  exerciseId: string;
  name: string;
  targetSets: number;
  targetReps: number;
  targetRIR: number;
  sets: Set[];
  notes: string;
  weightFeeling?: string; // Feedback on how the weight felt during exercise
}

export interface WorkoutSession {
  id: string;
  date: string;
  name: string;
  exercises: ExerciseInstance[];
  completed: boolean;
  feedback: {
    soreness: Record<string, number>; // muscle group -> soreness level (1-5)
    pumpQuality: Record<string, 'Poor' | 'Good' | 'Excellent'>;
    exertionLevel: 'Light' | 'Moderate' | 'Hard' | 'Very Hard';
    notes: string;
  } | null;
}

export interface Mesocycle {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  weeks: number;
  weeklyProgression: number; // percentage increase per week
  includeDeload: boolean;
  workouts: Record<string, WorkoutSession[]>; // weekNumber -> workouts
}

interface WorkoutState {
  currentWorkout: WorkoutSession | null;
  workoutHistory: WorkoutSession[];
  mesocycles: Mesocycle[];
  currentMesocycle: Mesocycle | null;
  loading: boolean;
  error: string | null;
}

const initialState: WorkoutState = {
  currentWorkout: null,
  workoutHistory: [],
  mesocycles: [],
  currentMesocycle: null,
  loading: false,
  error: null,
};

// Async thunk to create a mesocycle in Firestore
export const createMesocycleAsync = createAsyncThunk(
  'workout/createMesocycleAsync',
  async ({ mesocycleData, userId }: { mesocycleData: Omit<Mesocycle, 'id'>, userId: string }, { rejectWithValue }) => {
    try {
      // Create a local ID for the mesocycle
      const mesocycleId = crypto.randomUUID();
      
      // Create the full mesocycle object
      const mesocycle: Mesocycle = {
        ...mesocycleData,
        id: mesocycleId,
      };
      
      // Save to Firestore
      await saveMesocycle(mesocycle, userId);
      
      return mesocycle;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to create mesocycle');
    }
  }
);

// Async thunk to fetch all mesocycles for a user
export const fetchUserMesocyclesAsync = createAsyncThunk(
  'workout/fetchUserMesocyclesAsync',
  async (userId: string, { rejectWithValue }) => {
    try {
      const mesocycles = await getUserMesocycles(userId);
      return mesocycles;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch mesocycles');
    }
  }
);

// Async thunk to fetch a specific mesocycle by ID
export const fetchMesocycleByIdAsync = createAsyncThunk(
  'workout/fetchMesocycleByIdAsync',
  async (mesocycleId: string, { rejectWithValue }) => {
    try {
      const mesocycle = await getMesocycleById(mesocycleId);
      if (!mesocycle) {
        throw new Error('Mesocycle not found');
      }
      return mesocycle;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch mesocycle');
    }
  }
);

// Async thunk to update a mesocycle
export const updateMesocycleAsync = createAsyncThunk(
  'workout/updateMesocycleAsync',
  async ({ 
    id, 
    updates, 
    userId 
  }: { 
    id: string; 
    updates: Partial<Omit<Mesocycle, 'id'>>; 
    userId: string 
  }, { rejectWithValue }) => {
    try {
      console.log("🔥 Starting Firebase update for mesocycle:", id);
      console.log("🔥 with updates:", JSON.stringify(updates).slice(0, 200) + "...");
      console.log("🔥 for user:", userId);
      
      await updateMesocycleInFirestore(id, updates, userId);
      console.log("🔥 Successfully updated mesocycle in Firestore");
      
      return { id, updates };
    } catch (error: any) {
      console.error("🔥 Failed to update mesocycle in Firestore:", error);
      return rejectWithValue(error.message || 'Failed to update mesocycle');
    }
  }
);

// Async thunk to update workout progress
export const updateWorkoutProgress = createAsyncThunk(
  'workout/updateWorkoutProgress',
  async (workoutData: any, { rejectWithValue }) => {
    try {
      // Here we would normally save to Firestore
      // For now, we'll just return the data to update the store
      return workoutData;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to update workout progress');
    }
  }
);

const workoutSlice = createSlice({
  name: 'workout',
  initialState,
  reducers: {
    startWorkout: (state, action: PayloadAction<Omit<WorkoutSession, 'id' | 'date' | 'completed' | 'feedback'>>) => {
      const workoutId = crypto.randomUUID();
      state.currentWorkout = {
        ...action.payload,
        id: workoutId,
        date: format(new Date(), 'yyyy-MM-dd'),
        completed: false,
        feedback: null,
      };
    },
    addSet: (state, action: PayloadAction<{ exerciseId: string; set: Omit<Set, 'id'> }>) => {
      if (!state.currentWorkout) return;
      
      const { exerciseId, set } = action.payload;
      const exerciseIndex = state.currentWorkout.exercises.findIndex(e => e.id === exerciseId);
      
      if (exerciseIndex !== -1) {
        state.currentWorkout.exercises[exerciseIndex].sets.push({
          ...set,
          id: crypto.randomUUID(),
        });
      }
    },
    updateSet: (state, action: PayloadAction<{ exerciseId: string; setId: string; set: Partial<Set> }>) => {
      if (!state.currentWorkout) return;
      
      const { exerciseId, setId, set } = action.payload;
      const exerciseIndex = state.currentWorkout.exercises.findIndex(e => e.id === exerciseId);
      
      if (exerciseIndex !== -1) {
        const setIndex = state.currentWorkout.exercises[exerciseIndex].sets.findIndex(s => s.id === setId);
        
        if (setIndex !== -1) {
          state.currentWorkout.exercises[exerciseIndex].sets[setIndex] = {
            ...state.currentWorkout.exercises[exerciseIndex].sets[setIndex],
            ...set,
          };
        }
      }
    },
    completeWorkout: (state, action: PayloadAction<WorkoutSession['feedback']>) => {
      if (!state.currentWorkout) return;
      
      state.currentWorkout.completed = true;
      state.currentWorkout.feedback = action.payload;
      state.workoutHistory.push(state.currentWorkout);
      state.currentWorkout = null;
    },
    // Keep the sync version for offline use
    createMesocycle: (state, action: PayloadAction<Omit<Mesocycle, 'id'>>) => {
      const mesocycle: Mesocycle = {
        ...action.payload,
        id: crypto.randomUUID(),
      };
      
      state.mesocycles.push(mesocycle);
      state.currentMesocycle = mesocycle;
    },
    // Keep the sync version for offline use
    updateMesocycle: (state, action: PayloadAction<{ id: string; updates: Partial<Omit<Mesocycle, 'id'>> }>) => {
      const { id, updates } = action.payload;
      const mesocycleIndex = state.mesocycles.findIndex(m => m.id === id);
      
      if (mesocycleIndex !== -1) {
        state.mesocycles[mesocycleIndex] = {
          ...state.mesocycles[mesocycleIndex],
          ...updates,
        };
        
        if (state.currentMesocycle?.id === id) {
          state.currentMesocycle = state.mesocycles[mesocycleIndex];
        }
      }
    },
    setCurrentMesocycle: (state, action: PayloadAction<string>) => {
      const mesocycle = state.mesocycles.find(m => m.id === action.payload);
      if (mesocycle) {
        state.currentMesocycle = mesocycle;
      }
    },
  },
  extraReducers: (builder) => {
    // Handle createMesocycleAsync
    builder
      .addCase(createMesocycleAsync.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createMesocycleAsync.fulfilled, (state, action) => {
        state.loading = false;
        state.mesocycles.push(action.payload);
        state.currentMesocycle = action.payload;
      })
      .addCase(createMesocycleAsync.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
      
    // Handle fetchUserMesocyclesAsync
    builder
      .addCase(fetchUserMesocyclesAsync.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchUserMesocyclesAsync.fulfilled, (state, action) => {
        state.loading = false;
        state.mesocycles = action.payload;
        // Set the current mesocycle to the first one if there's no current mesocycle
        if (!state.currentMesocycle && action.payload.length > 0) {
          state.currentMesocycle = action.payload[0];
        }
      })
      .addCase(fetchUserMesocyclesAsync.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
      
    // Handle fetchMesocycleByIdAsync
    builder
      .addCase(fetchMesocycleByIdAsync.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchMesocycleByIdAsync.fulfilled, (state, action) => {
        state.loading = false;
        // Update the mesocycle in the array if it exists, otherwise add it
        const index = state.mesocycles.findIndex(m => m.id === action.payload.id);
        if (index !== -1) {
          state.mesocycles[index] = action.payload;
        } else {
          state.mesocycles.push(action.payload);
        }
      })
      .addCase(fetchMesocycleByIdAsync.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
      
    // Handle updateMesocycleAsync
    builder
      .addCase(updateMesocycleAsync.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateMesocycleAsync.fulfilled, (state, action) => {
        state.loading = false;
        const { id, updates } = action.payload;
        const mesocycleIndex = state.mesocycles.findIndex(m => m.id === id);
        
        if (mesocycleIndex !== -1) {
          state.mesocycles[mesocycleIndex] = {
            ...state.mesocycles[mesocycleIndex],
            ...updates,
          };
          
          if (state.currentMesocycle?.id === id) {
            state.currentMesocycle = state.mesocycles[mesocycleIndex];
          }
        }
      })
      .addCase(updateMesocycleAsync.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Handle updateWorkoutProgress
    builder
      .addCase(updateWorkoutProgress.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateWorkoutProgress.fulfilled, (state, action) => {
        state.loading = false;
        // Add the completed workout to history
        state.workoutHistory.unshift(action.payload);
        
        // Update the workout in the mesocycle if it exists
        if (state.currentMesocycle && action.payload.mesocycleId === state.currentMesocycle.id) {
          const weekNum = action.payload.week.toString();
          if (state.currentMesocycle.workouts[weekNum]) {
            const workoutIndex = state.currentMesocycle.workouts[weekNum].findIndex(
              w => w.id === action.payload.id
            );
            
            if (workoutIndex !== -1) {
              state.currentMesocycle.workouts[weekNum][workoutIndex] = {
                ...state.currentMesocycle.workouts[weekNum][workoutIndex],
                completed: action.payload.completed,
                exercises: action.payload.exercises
              };
            }
          }
        }
      })
      .addCase(updateWorkoutProgress.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const {
  startWorkout,
  addSet,
  updateSet,
  completeWorkout,
  createMesocycle,
  updateMesocycle,
  setCurrentMesocycle,
} = workoutSlice.actions;

export default workoutSlice.reducer; 