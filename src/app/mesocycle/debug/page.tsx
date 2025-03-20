'use client';

import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '@/lib/store';
import { useAuth } from '@/lib/hooks/useAuth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/firebase';

export default function MesocycleDebugPage() {
  const { user } = useAuth();
  const { currentMesocycle } = useSelector((state: RootState) => state.workout);
  const [debugInfo, setDebugInfo] = useState('');
  const [exerciseData, setExerciseData] = useState<any[]>([]);
  
  const loadExercises = () => {
    try {
      if (!currentMesocycle || !currentMesocycle.workouts) {
        setDebugInfo('No current mesocycle or workouts found');
        return;
      }
      
      setDebugInfo(`Mesocycle ID: ${currentMesocycle.id}`);
      
      const exercises: any[] = [];
      
      // Extract all exercises from the mesocycle for easier testing
      Object.keys(currentMesocycle.workouts).forEach(weekKey => {
        const workouts = currentMesocycle.workouts[weekKey];
        if (!workouts || !Array.isArray(workouts)) return;
        
        workouts.forEach((workout, workoutIndex) => {
          if (!workout || !workout.exercises) return;
          
          workout.exercises.forEach((exercise, exerciseIndex) => {
            exercises.push({
              weekKey,
              workoutIndex,
              exerciseIndex,
              workoutId: workout.id,
              exerciseId: exercise.id,
              exerciseName: exercise.name,
              weight: (exercise as any).weight || '',
              reps: (exercise as any).reps || '',
              isCompleted: !!(exercise as any).completed,
            });
          });
        });
      });
      
      setExerciseData(exercises);
    } catch (error: any) {
      setDebugInfo(`Error loading exercises: ${error.message}`);
    }
  };
  
  const saveExercise = async (exercise: any) => {
    try {
      if (!user) {
        setDebugInfo('No user logged in');
        return;
      }
      
      if (!currentMesocycle || !currentMesocycle.id) {
        setDebugInfo('No mesocycle ID available');
        return;
      }
      
      setDebugInfo(`Saving exercise: ${exercise.exerciseName}...`);
      
      // Get the document
      const docRef = doc(db, 'mesocycles', currentMesocycle.id);
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) {
        setDebugInfo(`Mesocycle with ID ${currentMesocycle.id} not found`);
        return;
      }
      
      // Get the data
      const data = docSnap.data();
      
      if (!data.workouts || !data.workouts[exercise.weekKey]) {
        setDebugInfo(`Week ${exercise.weekKey} not found`);
        return;
      }
      
      if (!data.workouts[exercise.weekKey][exercise.workoutIndex]) {
        setDebugInfo(`Workout at index ${exercise.workoutIndex} not found`);
        return;
      }
      
      if (!data.workouts[exercise.weekKey][exercise.workoutIndex].exercises || 
          !data.workouts[exercise.weekKey][exercise.workoutIndex].exercises[exercise.exerciseIndex]) {
        setDebugInfo(`Exercise at index ${exercise.exerciseIndex} not found`);
        return;
      }
      
      // Get the exercise
      const exerciseObj = data.workouts[exercise.weekKey][exercise.workoutIndex].exercises[exercise.exerciseIndex];
      
      // Update the exercise
      exerciseObj.weight = exercise.weight;
      exerciseObj.reps = exercise.reps;
      exerciseObj.completed = true;
      
      // Update generatedSets if they exist
      if (exerciseObj.generatedSets && Array.isArray(exerciseObj.generatedSets)) {
        for (let i = 0; i < exerciseObj.generatedSets.length; i++) {
          if (exerciseObj.generatedSets[i]) {
            exerciseObj.generatedSets[i].completedWeight = exercise.weight;
            exerciseObj.generatedSets[i].completedReps = exercise.reps;
          }
        }
      }
      
      // Perform the update
      await updateDoc(docRef, {
        workouts: data.workouts,
        updatedAt: new Date().toISOString()
      });
      
      setDebugInfo(`✅ Successfully saved ${exercise.exerciseName}`);
    } catch (error: any) {
      setDebugInfo(`Error saving: ${error.message}`);
    }
  };
  
  useEffect(() => {
    loadExercises();
  }, [currentMesocycle]);
  
  const updateExercise = (index: number, field: 'weight' | 'reps', value: string) => {
    setExerciseData(prev => {
      const newData = [...prev];
      newData[index] = { ...newData[index], [field]: value };
      return newData;
    });
  };
  
  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-6">Mesocycle Debug Page</h1>
      
      <div className="bg-gray-800 p-6 rounded-lg mb-6">
        <h2 className="text-xl font-bold mb-4">Debug Info</h2>
        <pre className="bg-gray-900 p-4 rounded mb-4">{debugInfo}</pre>
        
        <button
          onClick={loadExercises}
          className="bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600"
        >
          Reload Exercises
        </button>
      </div>
      
      <div className="bg-gray-800 p-6 rounded-lg">
        <h2 className="text-xl font-bold mb-4">Exercises</h2>
        
        {exerciseData.length > 0 ? (
          <div className="space-y-4">
            {exerciseData.map((exercise, index) => (
              <div key={`${exercise.workoutId}-${exercise.exerciseId}`} className="bg-gray-900 p-4 rounded">
                <h3 className="font-bold">{exercise.exerciseName}</h3>
                <p className="text-sm mb-2">
                  Week: {exercise.weekKey}, Workout: {exercise.workoutIndex}, Exercise: {exercise.exerciseIndex}
                </p>
                
                <div className="grid grid-cols-3 gap-4 mt-4">
                  <div>
                    <label className="block text-sm mb-1">Weight:</label>
                    <input
                      type="text"
                      value={exercise.weight}
                      onChange={(e) => updateExercise(index, 'weight', e.target.value)}
                      className="w-full bg-gray-800 p-2 rounded"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm mb-1">Reps:</label>
                    <input
                      type="text"
                      value={exercise.reps}
                      onChange={(e) => updateExercise(index, 'reps', e.target.value)}
                      className="w-full bg-gray-800 p-2 rounded"
                    />
                  </div>
                  
                  <div className="flex items-end">
                    <button
                      onClick={() => saveExercise(exercise)}
                      className="bg-neon-green text-black py-2 px-4 rounded hover:bg-neon-green/80"
                    >
                      Save
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p>No exercises found</p>
        )}
      </div>
    </div>
  );
} 