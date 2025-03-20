import Dexie, { Table } from 'dexie';
import { Exercise } from './slices/exerciseSlice';
import { Mesocycle, WorkoutSession } from './slices/workoutSlice';
import { UserPreferences, UserStats } from './slices/userSlice';

class WorkoutDatabase extends Dexie {
  exercises!: Table<Exercise>;
  workouts!: Table<WorkoutSession>;
  mesocycles!: Table<Mesocycle>;
  userPreferences!: Table<UserPreferences>;
  userStats!: Table<UserStats>;

  constructor() {
    super('HypertrophyProDB');
    
    this.version(1).stores({
      exercises: 'id, name, *targetMuscles, *secondaryMuscles, *category',
      workouts: 'id, date, name, completed',
      mesocycles: 'id, name, startDate, endDate',
      userPreferences: '++id',
      userStats: '++id',
    });
  }

  async getExercisesByMuscle(muscleGroup: string): Promise<Exercise[]> {
    return this.exercises
      .where('targetMuscles')
      .equals(muscleGroup)
      .or('secondaryMuscles')
      .equals(muscleGroup)
      .toArray();
  }

  async getExercisesByCategory(category: string): Promise<Exercise[]> {
    return this.exercises
      .where('category')
      .equals(category)
      .toArray();
  }

  async getWorkoutHistory(limit: number = 10): Promise<WorkoutSession[]> {
    return this.workouts
      .orderBy('date')
      .reverse()
      .limit(limit)
      .toArray();
  }

  async saveWorkout(workout: WorkoutSession): Promise<string> {
    return this.workouts.put(workout);
  }

  async getMesocycles(): Promise<Mesocycle[]> {
    return this.mesocycles
      .orderBy('startDate')
      .reverse()
      .toArray();
  }

  async getCurrentMesocycle(): Promise<Mesocycle | undefined> {
    const today = new Date().toISOString().split('T')[0];
    
    return this.mesocycles
      .where('startDate')
      .belowOrEqual(today)
      .and(item => !item.endDate || item.endDate >= today)
      .first();
  }

  async getUserPreferences(): Promise<UserPreferences | undefined> {
    return this.userPreferences.toCollection().first();
  }

  async saveUserPreferences(preferences: UserPreferences): Promise<number> {
    await this.userPreferences.clear();
    return this.userPreferences.add(preferences);
  }

  async getUserStats(): Promise<UserStats | undefined> {
    return this.userStats.toCollection().first();
  }

  async saveUserStats(stats: UserStats): Promise<number> {
    await this.userStats.clear();
    return this.userStats.add(stats);
  }
}

export const db = new WorkoutDatabase(); 