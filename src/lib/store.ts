import { configureStore } from '@reduxjs/toolkit';
import { setupListeners } from '@reduxjs/toolkit/query';
import workoutReducer from './slices/workoutSlice';
import exerciseReducer from './slices/exerciseSlice';
import userReducer from './slices/userSlice';

export const store = configureStore({
  reducer: {
    workout: workoutReducer,
    exercise: exerciseReducer,
    user: userReducer,
  },
  devTools: process.env.NODE_ENV !== 'production',
});

setupListeners(store.dispatch);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch; 