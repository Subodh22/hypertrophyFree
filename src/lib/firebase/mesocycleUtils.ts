import { collection, doc, getDocs, query, where, setDoc, getDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import { db } from './firebase';
import { Mesocycle } from '@/lib/slices/workoutSlice';

const COLLECTION_NAME = 'mesocycles';

/**
 * Saves a mesocycle to Firestore
 */
export const saveMesocycle = async (mesocycle: Mesocycle, userId: string) => {
  try {
    // Use the mesocycle's ID as the document ID
    const docRef = doc(db, COLLECTION_NAME, mesocycle.id);
    
    // Add userId to the mesocycle object
    const mesocycleWithUser = {
      ...mesocycle,
      userId,
      updatedAt: new Date().toISOString(),
    };
    
    // Save to Firestore
    await setDoc(docRef, mesocycleWithUser);
    
    return mesocycle.id;
  } catch (error) {
    console.error('Error saving mesocycle:', error);
    throw error;
  }
};

/**
 * Gets all mesocycles for a specific user
 */
export const getUserMesocycles = async (userId: string): Promise<Mesocycle[]> => {
  try {
    const q = query(collection(db, COLLECTION_NAME), where('userId', '==', userId));
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        name: data.name,
        startDate: data.startDate,
        endDate: data.endDate,
        weeks: data.weeks,
        weeklyProgression: data.weeklyProgression,
        includeDeload: data.includeDeload,
        workouts: data.workouts,
      } as Mesocycle;
    });
  } catch (error) {
    console.error('Error getting user mesocycles:', error);
    throw error;
  }
};

/**
 * Gets a specific mesocycle by ID
 */
export const getMesocycleById = async (mesocycleId: string): Promise<Mesocycle | null> => {
  try {
    const docRef = doc(db, COLLECTION_NAME, mesocycleId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        name: data.name,
        startDate: data.startDate,
        endDate: data.endDate,
        weeks: data.weeks,
        weeklyProgression: data.weeklyProgression,
        includeDeload: data.includeDeload,
        workouts: data.workouts,
      } as Mesocycle;
    }
    
    return null;
  } catch (error) {
    console.error('Error getting mesocycle:', error);
    throw error;
  }
};

/**
 * Updates a mesocycle in Firestore
 */
export const updateMesocycle = async (
  mesocycleId: string, 
  updates: Partial<Omit<Mesocycle, 'id'>> | Record<string, any>,
  userId: string
) => {
  try {
    console.log("🔄 Starting Firestore updateDoc for mesocycle:", mesocycleId);
    console.log("🔄 Database instance:", typeof db, db);
    
    const docRef = doc(db, COLLECTION_NAME, mesocycleId);
    console.log("🔄 Document reference created:", docRef);
    
    // Add update metadata
    const updatedData = {
      ...updates,
      userId,
      updatedAt: new Date().toISOString(),
    };
    
    console.log("🔄 Updating document with data:", JSON.stringify(updatedData).slice(0, 100) + "...");
    await updateDoc(docRef, updatedData);
    console.log("🔄 Document updated successfully");
    
    return mesocycleId;
  } catch (error) {
    console.error("🔄 Error updating mesocycle in Firestore:", error);
    throw error;
  }
};

/**
 * Deletes a mesocycle from Firestore
 */
export const deleteMesocycle = async (mesocycleId: string) => {
  try {
    await deleteDoc(doc(db, COLLECTION_NAME, mesocycleId));
  } catch (error) {
    console.error('Error deleting mesocycle:', error);
    throw error;
  }
}; 