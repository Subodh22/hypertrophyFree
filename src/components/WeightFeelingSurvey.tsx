'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/firebase';

interface WeightFeelingSurveyProps {
  isOpen: boolean;
  onClose: () => void;
  mesocycleId: string;
  weekKey: string;
  workoutIndex: number;
  exerciseIndex: number;
  exerciseName: string;
  userId: string | null;
  onFeedbackSaved: () => void;
  isAutoPopup?: boolean; // Flag to indicate if this was auto-triggered
}

export default function WeightFeelingSurvey({
  isOpen,
  onClose,
  mesocycleId,
  weekKey,
  workoutIndex,
  exerciseIndex,
  exerciseName,
  userId,
  onFeedbackSaved,
  isAutoPopup = false
}: WeightFeelingSurveyProps) {
  const [weightFeeling, setWeightFeeling] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Set title based on whether it's auto-triggered or manually opened
  const title = isAutoPopup 
    ? "Great job completing the exercise! How did the weight feel?" 
    : "How did the weight feel?";

  if (!isOpen) return null;

  const saveWeightFeeling = async () => {
    if (!userId) {
      setError('You must be logged in to save feedback');
      return;
    }

    if (!weightFeeling) {
      setError('Please select how the weight felt');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Get document reference
      const docRef = doc(db, 'mesocycles', mesocycleId);
      
      // Get document directly
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) {
        throw new Error("Mesocycle not found");
      }
      
      // Get data
      const data = docSnap.data();
      
      // Make sure path exists
      if (!data.workouts || 
          !data.workouts[weekKey] || 
          !data.workouts[weekKey][workoutIndex] || 
          !data.workouts[weekKey][workoutIndex].exercises || 
          !data.workouts[weekKey][workoutIndex].exercises[exerciseIndex]) {
        throw new Error("Invalid path to exercise");
      }
      
      // Get exercise
      const exerciseObj = data.workouts[weekKey][workoutIndex].exercises[exerciseIndex];
      
      // Update exercise with feedback
      exerciseObj.weightFeeling = weightFeeling;
      
      // Update the new feedback object if it exists
      if (!exerciseObj.feedback) {
        exerciseObj.feedback = {
          weightFeeling: "",
          muscleActivation: "",
          performanceRating: "",
          notes: "",
          timestamp: ""
        };
      }
      
      // Update the feedback with the weight feeling and timestamp
      exerciseObj.feedback.weightFeeling = weightFeeling;
      exerciseObj.feedback.timestamp = new Date().toISOString();
      
      // Update document
      await updateDoc(docRef, {
        workouts: data.workouts,
        updatedAt: new Date().toISOString()
      });

      // Notify parent component
      onFeedbackSaved();
      
      // Close the popup
      onClose();
    } catch (err: any) {
      console.error("Error saving weight feeling feedback:", err);
      setError(err.message || 'Failed to save feedback');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-lg w-full max-w-md p-6 relative">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white"
        >
          <X className="w-5 h-5" />
        </button>
        
        <h2 className="text-xl font-bold mb-6">{title}</h2>
        <h3 className="text-lg text-neon-green mb-4">{exerciseName}</h3>
        
        <div className="space-y-3 mb-6">
          <button
            className={`w-full text-left p-4 rounded-lg flex items-center transition-colors ${
              weightFeeling === 'too_light' 
                ? 'bg-blue-900/50 border border-blue-400' 
                : 'bg-gray-800 hover:bg-gray-700'
            }`}
            onClick={() => setWeightFeeling('too_light')}
          >
            <div className="w-3 h-3 rounded-full bg-blue-400 mr-3"></div>
            <span>Too Light - Could do more reps easily</span>
          </button>
          
          <button
            className={`w-full text-left p-4 rounded-lg flex items-center transition-colors ${
              weightFeeling === 'just_right' 
                ? 'bg-green-900/50 border border-neon-green' 
                : 'bg-gray-800 hover:bg-gray-700'
            }`}
            onClick={() => setWeightFeeling('just_right')}
          >
            <div className="w-3 h-3 rounded-full bg-neon-green mr-3"></div>
            <span>Just Right - Perfect challenge</span>
          </button>
          
          <button
            className={`w-full text-left p-4 rounded-lg flex items-center transition-colors ${
              weightFeeling === 'too_heavy' 
                ? 'bg-orange-900/50 border border-orange-400' 
                : 'bg-gray-800 hover:bg-gray-700'
            }`}
            onClick={() => setWeightFeeling('too_heavy')}
          >
            <div className="w-3 h-3 rounded-full bg-orange-400 mr-3"></div>
            <span>Too Heavy - Struggled to complete reps</span>
          </button>
          
          <button
            className={`w-full text-left p-4 rounded-lg flex items-center transition-colors ${
              weightFeeling === 'extremely_heavy' 
                ? 'bg-red-900/50 border border-red-400' 
                : 'bg-gray-800 hover:bg-gray-700'
            }`}
            onClick={() => setWeightFeeling('extremely_heavy')}
          >
            <div className="w-3 h-3 rounded-full bg-red-400 mr-3"></div>
            <span>Extremely Heavy - Could not complete intended reps</span>
          </button>
        </div>
        
        {error && (
          <div className="p-3 mb-4 bg-red-900/30 border border-red-500/30 rounded-lg text-red-300 text-sm">
            {error}
          </div>
        )}
        
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 btn-secondary py-3"
          >
            Cancel
          </button>
          <button
            onClick={saveWeightFeeling}
            disabled={loading || !weightFeeling}
            className="flex-1 btn-primary py-3"
          >
            {loading ? 'Saving...' : 'Save Feedback'}
          </button>
        </div>
      </div>
    </div>
  );
} 