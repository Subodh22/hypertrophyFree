import { doc, getDoc, updateDoc, setDoc } from 'firebase/firestore';
import { db } from './firebase';

const COLLECTION_NAME = 'mesocycles';

/**
 * Updates exercise data directly in Firestore
 * This function is designed to be used only on the client side
 */
export const updateExerciseInFirebase = async (
  mesocycleId: string,
  updates: Record<string, any>,
  userId: string
): Promise<string> => {
  try {
    // Clear console for better visibility of logs
    console.clear();
    console.log("====== FIREBASE UPDATE PROCESS STARTED ======");
    console.log("Running updateExerciseInFirebase in browser context:", typeof window !== 'undefined');
    console.log("Mesocycle ID:", mesocycleId);
    console.log("User ID:", userId?.substring(0, 8) + "...");
    console.log("Update keys:", Object.keys(updates));
    
    // Verify we're in browser environment
    if (typeof window === 'undefined') {
      throw new Error("updateExerciseInFirebase must be called from client-side code");
    }
    
    // Basic validation
    if (!mesocycleId) throw new Error("Missing mesocycleId");
    if (!userId) throw new Error("Missing userId");
    if (!updates || Object.keys(updates).length === 0) throw new Error("No updates provided");
    
    console.log("Step 1: Getting document reference...");
    const docRef = doc(db, COLLECTION_NAME, mesocycleId);
    
    console.log("Step 2: Fetching current document data...");
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) {
      console.error(`Document with ID ${mesocycleId} not found in ${COLLECTION_NAME} collection`);
      throw new Error(`Mesocycle with ID ${mesocycleId} not found`);
    }
    
    console.log("Step 3: Document found, extracting data...");
    const mesocycleData = docSnap.data();
    
    // Extract info about what to update
    const firstUpdateKey = Object.keys(updates)[0]; 
    const updateParts = firstUpdateKey.split('.');
    
    if (updateParts.length < 5) {
      throw new Error(`Invalid update path: ${firstUpdateKey}`);
    }
    
    const weekKey = updateParts[1]; // Extract week key from first update
    const workoutIndexStr = updateParts[2]; // Extract workout index 
    const workoutIndex = parseInt(workoutIndexStr);
    const exerciseIndexStr = updateParts[4]; // Extract exercise index
    const exerciseIndex = parseInt(exerciseIndexStr);
    
    console.log("Step 4: Update location identified:", { weekKey, workoutIndex, exerciseIndex });
    
    // Get the workout array for this week 
    const weekWorkouts = mesocycleData.workouts[weekKey];
    if (!weekWorkouts || !weekWorkouts[workoutIndex]) {
      throw new Error(`Workout at index ${workoutIndex} for week ${weekKey} not found`);
    }
    
    // Get the workout and exercise
    const workout = weekWorkouts[workoutIndex];
    const exercises = workout.exercises;
    
    if (!exercises || !exercises[exerciseIndex]) {
      throw new Error(`Exercise at index ${exerciseIndex} in workout ${workout.id} not found`);
    }
    
    // Get the exercise
    const exercise = exercises[exerciseIndex];
    console.log("Step 5: Found exercise:", { 
      id: exercise.id, 
      name: exercise.name,
      currentWeight: exercise.weight,
      currentReps: exercise.reps
    });
    
    // Get the values to update
    const weight = updates[`workouts.${weekKey}.${workoutIndex}.exercises.${exerciseIndex}.weight`];
    const reps = updates[`workouts.${weekKey}.${workoutIndex}.exercises.${exerciseIndex}.reps`];
    
    console.log("Step 6: Updating with values:", { weight, reps });
    
    // Update the main exercise data
    exercise.weight = weight;
    exercise.reps = reps;
    exercise.completed = true;
    
    // Print out the exact structure of generatedSets for debugging
    console.log("Step 7a: GeneratedSets BEFORE update:", JSON.stringify(exercise.generatedSets, null, 2));
    
    // Create generatedSets array if it doesn't exist
    if (!exercise.generatedSets) {
      console.log("Creating new generatedSets array as it does not exist");
      exercise.generatedSets = [];
    }
    
    // Ensure it's an array
    if (!Array.isArray(exercise.generatedSets)) {
      console.log("Converting generatedSets to array as it is not an array");
      exercise.generatedSets = [];
    }
    
    // Update all sets in the generatedSets array
    if (exercise.generatedSets.length > 0) {
      console.log(`Updating ${exercise.generatedSets.length} existing sets in generatedSets`);
      for (let i = 0; i < exercise.generatedSets.length; i++) {
        // Ensure the set exists
        if (!exercise.generatedSets[i]) {
          exercise.generatedSets[i] = {};
        }
        
        // Update the set with weight and reps
        exercise.generatedSets[i].completedWeight = weight;
        exercise.generatedSets[i].completedReps = reps;
        console.log(`Updated set ${i} with completedWeight: ${weight}, completedReps: ${reps}`);
      }
    } else {
      // If there are no generatedSets, add one
      console.log("No generatedSets found, creating a new one");
      exercise.generatedSets.push({
        id: `${exercise.id}-set-1`,
        number: 1,
        targetReps: "8",
        targetWeight: "",
        completedReps: reps,
        completedWeight: weight
      });
    }
    
    console.log("Step 7b: GeneratedSets AFTER update:", JSON.stringify(exercise.generatedSets, null, 2));
    
    // Check if all exercises are completed
    const allExercisesCompleted = exercises.every((e: any) => e.weight && e.reps);
    if (allExercisesCompleted) {
      workout.completed = true;
      console.log("Step 8: All exercises completed, marking workout as completed");
    } else {
      console.log("Step 8: Not all exercises completed, workout remains incomplete");
    }
    
    // Create a clean update object
    const updatedData = {
      workouts: mesocycleData.workouts,
      updatedAt: new Date().toISOString(),
      // Include userId to make sure it's preserved
      userId: userId
    };
    
    // Show update object size
    console.log("Step 9: Update data object size:", JSON.stringify(updatedData).length, "bytes");
    
    // Perform the update
    console.log("Step 10: Sending update to Firebase...");
    await updateDoc(docRef, updatedData);
    console.log("✅ FIREBASE UPDATE SUCCESSFUL! ✅");
    console.log(`Data for exercise ${exercise.name} (weight: ${weight}, reps: ${reps}) saved to Firebase`);
    console.log("====== FIREBASE UPDATE PROCESS COMPLETED ======");
    
    return mesocycleId;
  } catch (error: any) {
    console.error("❌ ERROR UPDATING EXERCISE IN FIREBASE:", error);
    console.error("Error details:", { 
      message: error.message || 'Unknown error', 
      code: error.code || 'No error code', 
      stack: error.stack || 'No stack trace' 
    });
    throw error;
  }
}; 