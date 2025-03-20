'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/firebase';

export default function MesocycleFixPage() {
  const { user } = useAuth();
  const [mesocycleId, setMesocycleId] = useState('');
  const [weekKey, setWeekKey] = useState('week1');
  const [workoutIndex, setWorkoutIndex] = useState('0');
  const [exerciseIndex, setExerciseIndex] = useState('0');
  const [weight, setWeight] = useState('');
  const [reps, setReps] = useState('');
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);
  const [mesocycleData, setMesocycleData] = useState<any>(null);
  
  // Fetch mesocycle to inspect
  const fetchMesocycle = async () => {
    if (!mesocycleId) {
      setResult('Please enter a mesocycle ID');
      return;
    }
    
    try {
      setLoading(true);
      setResult('Fetching mesocycle...');
      
      const docRef = doc(db, 'mesocycles', mesocycleId);
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) {
        setResult(`Mesocycle with ID ${mesocycleId} not found`);
        setLoading(false);
        return;
      }
      
      const data = docSnap.data();
      setMesocycleData(data);
      setResult(`Mesocycle found: ${data.name || 'Unnamed'}`);
    } catch (error: any) {
      setResult(`Error: ${error.message}`);
      console.error('Error fetching mesocycle:', error);
    } finally {
      setLoading(false);
    }
  };
  
  // Direct update to Firebase
  const updateExercise = async () => {
    if (!user) {
      setResult('You must be logged in');
      return;
    }
    
    if (!mesocycleId || !weight || !reps) {
      setResult('Please fill in all fields');
      return;
    }
    
    try {
      setLoading(true);
      setResult('Updating exercise...');
      
      const workoutIdxNum = parseInt(workoutIndex);
      const exerciseIdxNum = parseInt(exerciseIndex);
      
      // Get the current document
      const docRef = doc(db, 'mesocycles', mesocycleId);
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) {
        setResult(`Mesocycle with ID ${mesocycleId} not found`);
        setLoading(false);
        return;
      }
      
      const data = docSnap.data();
      
      // Verify the paths exist
      if (!data.workouts || !data.workouts[weekKey]) {
        setResult(`Week ${weekKey} not found in mesocycle`);
        return;
      }
      
      if (!data.workouts[weekKey][workoutIdxNum]) {
        setResult(`Workout at index ${workoutIdxNum} not found in ${weekKey}`);
        return;
      }
      
      if (!data.workouts[weekKey][workoutIdxNum].exercises || 
          !data.workouts[weekKey][workoutIdxNum].exercises[exerciseIdxNum]) {
        setResult(`Exercise at index ${exerciseIdxNum} not found in workout`);
        return;
      }
      
      // Get the exercise 
      const exercise = data.workouts[weekKey][workoutIdxNum].exercises[exerciseIdxNum];
      console.log('Exercise before update:', exercise);
      
      // Update the exercise
      exercise.weight = weight;
      exercise.reps = reps;
      exercise.completed = true;
      
      // Update generated sets if they exist
      if (exercise.generatedSets && Array.isArray(exercise.generatedSets)) {
        console.log('Updating generatedSets:', exercise.generatedSets);
        exercise.generatedSets.forEach((set: any, index: number) => {
          set.completedWeight = weight;
          set.completedReps = reps;
          console.log(`Updated set ${index}:`, set);
        });
      }
      
      // Perform the update
      console.log('Sending update to Firestore...');
      await updateDoc(docRef, {
        workouts: data.workouts,
        updatedAt: new Date().toISOString()
      });
      
      setResult('Exercise updated successfully! 🎉');
      console.log('Update successful');
      
      // Refresh data
      const updatedSnap = await getDoc(docRef);
      if (updatedSnap.exists()) {
        setMesocycleData(updatedSnap.data());
      }
    } catch (error: any) {
      setResult(`Error: ${error.message}`);
      console.error('Error updating exercise:', error);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-6">Mesocycle Fix Page</h1>
      
      <div className="bg-gray-800 p-6 rounded-lg mb-6">
        <h2 className="text-xl font-bold mb-4">Update Exercise Directly</h2>
        
        <div className="space-y-4 mb-6">
          <div>
            <label className="block text-sm mb-1">Mesocycle ID:</label>
            <input
              value={mesocycleId}
              onChange={(e) => setMesocycleId(e.target.value)}
              className="w-full bg-gray-900 p-2 rounded"
              placeholder="913b8903-4e7c-4096-8bf7-40f45198b461"
            />
          </div>
          
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm mb-1">Week:</label>
              <select
                value={weekKey}
                onChange={(e) => setWeekKey(e.target.value)}
                className="w-full bg-gray-900 p-2 rounded"
              >
                <option value="week1">Week 1</option>
                <option value="week2">Week 2</option>
                <option value="week3">Week 3</option>
                <option value="week4">Week 4</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm mb-1">Workout Index:</label>
              <input
                type="number"
                min="0"
                value={workoutIndex}
                onChange={(e) => setWorkoutIndex(e.target.value)}
                className="w-full bg-gray-900 p-2 rounded"
              />
            </div>
            
            <div>
              <label className="block text-sm mb-1">Exercise Index:</label>
              <input
                type="number"
                min="0"
                value={exerciseIndex}
                onChange={(e) => setExerciseIndex(e.target.value)}
                className="w-full bg-gray-900 p-2 rounded"
              />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm mb-1">Weight:</label>
              <input
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                className="w-full bg-gray-900 p-2 rounded"
                placeholder="185"
              />
            </div>
            
            <div>
              <label className="block text-sm mb-1">Reps:</label>
              <input
                value={reps}
                onChange={(e) => setReps(e.target.value)}
                className="w-full bg-gray-900 p-2 rounded"
                placeholder="8"
              />
            </div>
          </div>
        </div>
        
        <div className="flex space-x-4">
          <button
            onClick={fetchMesocycle}
            disabled={loading || !mesocycleId}
            className="bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600 disabled:opacity-50"
          >
            Fetch Mesocycle
          </button>
          
          <button
            onClick={updateExercise}
            disabled={loading || !mesocycleId || !weight || !reps}
            className="bg-neon-green text-black py-2 px-4 rounded hover:bg-neon-green/80 disabled:opacity-50"
          >
            Update Exercise
          </button>
        </div>
        
        <div className="mt-4">
          <p className={`font-semibold ${
            result.includes('successfully') ? 'text-green-500' : 
            result.includes('Error') ? 'text-red-500' : 'text-yellow-400'
          }`}>
            {result || 'Ready to update'}
          </p>
        </div>
      </div>
      
      {mesocycleData && (
        <div className="bg-gray-800 p-6 rounded-lg">
          <h2 className="text-xl font-bold mb-4">Mesocycle Data</h2>
          <pre className="bg-black/30 p-4 rounded overflow-auto max-h-96">
            {JSON.stringify(mesocycleData, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
} 