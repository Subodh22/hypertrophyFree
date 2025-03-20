'use client';

import { useState } from 'react';
import { Clock, CheckCircle } from 'lucide-react';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/firebase';

interface ClientSideButtonProps {
  workoutId: string;
  exerciseId: string;
  weight: string;
  reps: string;
  userId: string;
  mesocycleId: string;
  weekKey: string;
  workoutIndex: number;
  exerciseIndex: number;
  isCompleted: boolean;
  onSuccess: () => void;
}

export default function ClientSideButton({
  workoutId,
  exerciseId,
  weight,
  reps,
  userId,
  mesocycleId,
  weekKey,
  workoutIndex,
  exerciseIndex,
  isCompleted,
  onSuccess
}: ClientSideButtonProps) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // This is a client-only component that isolates Firebase operations
  const handleSave = async () => {
    try {
      console.log("BUTTON CLICKED - CHECK THIS LOG");
      
      // Reset error state
      setError(null);
      
      // Validate inputs
      if (!weight || !reps) {
        setError("Enter weight & reps");
        console.log("Missing weight or reps:", { weight, reps });
        return;
      }
      
      if (!userId) {
        setError("Login required");
        console.log("Missing userId");
        return;
      }
      
      if (saving) {
        console.log("Already saving, ignoring duplicate click");
        return;
      }
      
      // Start saving
      setSaving(true);
      console.log(`Saving exercise data: mesocycleId=${mesocycleId}, weight=${weight}, reps=${reps}`);
      
      // Alert to confirm click is working
      alert(`Saving: weight=${weight}, reps=${reps} to mesocycle ${mesocycleId}`);
      
      // Get the document
      const docRef = doc(db, 'mesocycles', mesocycleId);
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) {
        throw new Error(`Mesocycle with ID ${mesocycleId} not found`);
      }
      
      // Get the data
      const data = docSnap.data();
      console.log("Retrieved document data:", { 
        hasData: !!data,
        hasWorkouts: data?.workouts ? 'yes' : 'no',
        documentId: mesocycleId
      });
      
      // Get the exercise
      if (!data.workouts || !data.workouts[weekKey] || 
          !data.workouts[weekKey][workoutIndex] || 
          !data.workouts[weekKey][workoutIndex].exercises) {
        console.error("Invalid path:", {
          hasWorkouts: !!data.workouts,
          hasWeekKey: data.workouts ? !!data.workouts[weekKey] : false,
          hasWorkoutIndex: data.workouts && data.workouts[weekKey] ? 
            !!data.workouts[weekKey][workoutIndex] : false,
          hasExercises: data.workouts && data.workouts[weekKey] && data.workouts[weekKey][workoutIndex] ?
            !!data.workouts[weekKey][workoutIndex].exercises : false,
        });
        throw new Error("Invalid path to exercise");
      }
      
      const exercise = data.workouts[weekKey][workoutIndex].exercises[exerciseIndex];
      if (!exercise) {
        throw new Error("Exercise not found");
      }
      
      // Update the exercise
      console.log("Updating exercise:", exercise.name);
      exercise.weight = weight;
      exercise.reps = reps;
      exercise.completed = true;
      
      // Update generatedSets if they exist
      if (exercise.generatedSets && Array.isArray(exercise.generatedSets)) {
        console.log("Updating generated sets");
        for (let i = 0; i < exercise.generatedSets.length; i++) {
          if (exercise.generatedSets[i]) {
            exercise.generatedSets[i].completedWeight = weight;
            exercise.generatedSets[i].completedReps = reps;
          }
        }
      }
      
      // Perform the update
      console.log("Sending update to Firestore...");
      await updateDoc(docRef, {
        workouts: data.workouts,
        updatedAt: new Date().toISOString()
      });
      
      console.log("🟢 Save successful!");
      alert("Exercise data saved successfully!");
      
      setSaving(false);
      onSuccess();
    } catch (error: any) {
      console.error("🔴 Error saving:", error);
      console.error("Error stack:", error.stack);
      alert(`Error saving: ${error.message}`);
      setError(error.message || "Save failed");
      setSaving(false);
    }
  };
  
  return (
    <div className="relative">
      <button
        onClick={handleSave}
        className="w-7 h-7 flex items-center justify-center bg-gray-800 hover:bg-gray-700 rounded-full"
        disabled={saving}
        title="Save weight and reps"
      >
        {saving ? (
          <div className="animate-spin">
            <Clock className="w-5 h-5 text-neon-green" />
          </div>
        ) : isCompleted ? (
          <CheckCircle className="w-5 h-5 text-neon-green" />
        ) : (
          <div className="w-5 h-5 rounded-full border-2 border-neon-green hover:border-white"></div>
        )}
      </button>
      
      {error && (
        <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 text-xs text-red-500 whitespace-nowrap">
          {error}
        </div>
      )}
    </div>
  );
} 