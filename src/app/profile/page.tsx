'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Settings, Award, BarChart2, LogOut, Edit2, Info, Dumbbell, Calendar, Check } from 'lucide-react';
import { RootState } from '@/lib/store';
import { updatePreferences, updateStats, UserPreferences, UserStats } from '@/lib/slices/userSlice';
import { useAuth } from '@/lib/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/firebase';

// Generate placeholder stats based on user ID
const generatePlaceholderStats = (uid: string) => {
  // Use the uid as a seed for pseudo-random numbers
  const seed = parseInt(uid.substring(0, 8), 16);
  const random = (min: number, max: number) => {
    const x = Math.sin(seed) * 10000;
    const rand = x - Math.floor(x);
    return Math.floor(rand * (max - min + 1)) + min;
  };
  
  return {
    workouts: random(5, 25),
    volume: random(5000, 50000),
    exercises: random(8, 30),
    streak: random(1, 14)
  };
};

export default function ProfilePage() {
  const dispatch = useDispatch();
  const { preferences, stats } = useSelector((state: RootState) => state.user as { preferences: UserPreferences, stats: UserStats });
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [profileCompletion, setProfileCompletion] = useState(0);
  const [placeholderStats, setPlaceholderStats] = useState({
    workouts: 0,
    volume: 0,
    exercises: 0,
    streak: 0
  });
  
  const { user, signOut } = useAuth();
  const router = useRouter();
  
  // Define loadUserData as a memoized callback to avoid recreation on every render
  const loadUserData = useCallback(async () => {
    if (!user) return;
    
    try {
      console.log("Loading user data for:", user.uid);
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        
        if (userData.preferences) {
          dispatch(updatePreferences(userData.preferences));
        }
        
        if (userData.stats) {
          dispatch(updateStats(userData.stats));
        }
      } else {
        // Create user document if it doesn't exist
        await setDoc(doc(db, 'users', user.uid), {
          uid: user.uid,
          displayName: user.displayName,
          email: user.email,
          createdAt: new Date().toISOString(),
          preferences,
          stats
        });
      }
      
      // Generate placeholder stats for the user
      setPlaceholderStats(generatePlaceholderStats(user.uid));
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      // Always set loading to false regardless of success/failure
      setIsLoading(false);
    }
  }, [user, dispatch]); // Remove preferences and stats from dependencies
  
  // User authentication check - with reduced dependencies
  useEffect(() => {
    if (!user) {
      console.log("Redirecting to login from profile page");
      router.push('/login');
    }
  }, [user, router]); // Only check for authentication
  
  // Calculate profile completion
  useEffect(() => {
    // Fields to check for completion
    const fields = [
      stats.experienceLevel,
      stats.fitnessGoal,
      stats.height,
      stats.weight,
      stats.bodyFatPercentage
    ];
    
    // Calculate percentage of fields that are filled
    const filledFields = fields.filter(field => field !== undefined).length;
    const completionPercentage = Math.round((filledFields / fields.length) * 100);
    
    setProfileCompletion(completionPercentage);
  }, [stats]);
  
  // Save changes to Firestore when preferences or stats change
  const saveUserData = useCallback(async () => {
    if (!user || isLoading) return;
    
    try {
      await setDoc(doc(db, 'users', user.uid), {
        preferences,
        stats
      }, { merge: true });
    } catch (error) {
      console.error('Error saving user data:', error);
    }
  }, [user, preferences, stats, isLoading]);
  
  // Add a separate state to track if data has been loaded initially
  const [initialDataLoaded, setInitialDataLoaded] = useState(false);
  
  useEffect(() => {
    // Modify the loadUserData effect to set initialDataLoaded
    if (user && isLoading) {
      loadUserData().then(() => {
        setInitialDataLoaded(true);
      });
    }
  }, [user, isLoading, loadUserData]);
  
  useEffect(() => {
    // Only save data if it's not the initial load and user exists
    if (initialDataLoaded && user && !isLoading) {
      const timeoutId = setTimeout(() => {
        saveUserData();
      }, 1000); // Debounce to avoid too many writes
      
      return () => clearTimeout(timeoutId);
    }
  }, [preferences, stats, initialDataLoaded, user, isLoading, saveUserData]);
  
  const handleToggleTheme = () => {
    const newTheme = preferences.theme === 'dark' ? 'light' : 'dark';
    dispatch(updatePreferences({ theme: newTheme }));
  };
  
  const handleToggleUnit = () => {
    const newUnit = preferences.measurementUnit === 'imperial' ? 'metric' : 'imperial';
    dispatch(updatePreferences({ measurementUnit: newUnit }));
  };
  
  const handleSignOut = async () => {
    try {
      await signOut();
      router.push('/login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };
  
  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-pulse flex flex-col items-center">
          <div className="w-12 h-12 rounded-full bg-neon-green/20 flex items-center justify-center mb-4">
            <Settings className="w-6 h-6 text-neon-green" />
          </div>
          <p className="text-gray-400">Loading profile...</p>
        </div>
      </div>
    );
  }

  // Only render when we have user data
  if (!user) return null;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 pb-24">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Profile</h1>
        <button 
          onClick={() => setIsEditing(!isEditing)}
          className="p-2 rounded-full bg-black/30 hover:bg-black/50 transition-colors"
        >
          {isEditing ? <Settings className="w-5 h-5" /> : <Edit2 className="w-5 h-5" />}
        </button>
      </div>

      {/* Profile Header */}
      <div className="card p-6 mb-8">
        <div className="flex items-center gap-6">
          <div className="w-20 h-20 rounded-full bg-neon-green/20 flex items-center justify-center text-neon-green text-xl font-bold">
            {user?.photoURL ? (
              <img 
                src={user.photoURL} 
                alt="Profile" 
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              <User className="w-8 h-8" />
            )}
          </div>
          <div className="flex-1">
            <h2 className="text-2xl font-bold">{user?.displayName || 'Fitness Enthusiast'}</h2>
            <p className="text-gray-400">
              {user?.email || 'Sign in to save your progress'}
            </p>
            <div className="mt-2">
              <div className="flex items-center">
                <div className="flex-1 bg-gray-800 h-2 rounded-full overflow-hidden">
                  <div 
                    className="bg-neon-green h-full rounded-full"
                    style={{ width: `${profileCompletion}%` }}
                  ></div>
                </div>
                <span className="ml-2 text-sm text-gray-400">{profileCompletion}%</span>
              </div>
              <p className="text-xs text-gray-500 mt-1">Profile completion</p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="card p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-gray-400 text-sm">Workouts</p>
              <h3 className="text-2xl font-bold mt-1">{stats.workoutsCompleted || placeholderStats.workouts}</h3>
            </div>
            <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-500">
              <Dumbbell className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-4">
            {stats.lastWorkout ? 
              `Last: ${new Date(stats.lastWorkout).toLocaleDateString()}` : 
              'Start your fitness journey'}
          </p>
        </div>

        <div className="card p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-gray-400 text-sm">Volume</p>
              <h3 className="text-2xl font-bold mt-1">{stats.totalVolume || placeholderStats.volume}</h3>
            </div>
            <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-500">
              <BarChart2 className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-4">
            Total weight lifted (kg/lbs)
          </p>
        </div>

        <div className="card p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-gray-400 text-sm">Exercises</p>
              <h3 className="text-2xl font-bold mt-1">{stats.uniqueExercises || placeholderStats.exercises}</h3>
            </div>
            <div className="w-8 h-8 rounded-full bg-orange-500/20 flex items-center justify-center text-orange-500">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-4">
            Unique exercises performed
          </p>
        </div>

        <div className="card p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-gray-400 text-sm">Streak</p>
              <h3 className="text-2xl font-bold mt-1">{stats.currentStreak || placeholderStats.streak}</h3>
            </div>
            <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center text-red-500">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-4">
            Consecutive workout days
          </p>
        </div>
      </div>

      {isEditing ? (
        <div className="space-y-8">
          {/* Preferences Section */}
          <div className="card p-6">
            <h2 className="text-xl font-bold mb-4">App Preferences</h2>
            
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-medium">Theme</h3>
                  <p className="text-sm text-gray-400">{preferences.theme === 'dark' ? 'Dark Mode' : 'Light Mode'}</p>
                </div>
                <button 
                  onClick={handleToggleTheme}
                  className="px-3 py-1 rounded-md bg-gray-800 hover:bg-gray-700 text-sm"
                >
                  Toggle
                </button>
              </div>
              
              <div className="border-t border-gray-800 pt-4 flex justify-between items-center">
                <div>
                  <h3 className="font-medium">Measurement Units</h3>
                  <p className="text-sm text-gray-400">{preferences.measurementUnit === 'imperial' ? 'Imperial (lbs, ft)' : 'Metric (kg, cm)'}</p>
                </div>
                <button 
                  onClick={handleToggleUnit}
                  className="px-3 py-1 rounded-md bg-gray-800 hover:bg-gray-700 text-sm"
                >
                  Toggle
                </button>
              </div>
            </div>
          </div>
          
          {/* Personal Information */}
          <div className="card p-6">
            <h2 className="text-xl font-bold mb-4">Personal Information</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Fitness Goal</label>
                <select 
                  value={stats.fitnessGoal || ''}
                  onChange={(e) => dispatch(updateStats({ fitnessGoal: e.target.value as any }))}
                  className="w-full p-2 bg-gray-900 border border-gray-800 rounded-md"
                >
                  <option value="">Select a goal</option>
                  <option value="muscle_gain">Build Muscle</option>
                  <option value="strength">Strength</option>
                  <option value="fat_loss">Lose Fat</option>
                  <option value="endurance">Endurance</option>
                  <option value="general_fitness">General Fitness</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm text-gray-400 mb-1">Experience Level</label>
                <select 
                  value={stats.experienceLevel || ''}
                  onChange={(e) => dispatch(updateStats({ experienceLevel: e.target.value as any }))}
                  className="w-full p-2 bg-gray-900 border border-gray-800 rounded-md"
                >
                  <option value="">Select experience</option>
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                  <option value="expert">Expert</option>
                </select>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Height</label>
                  <div className="relative">
                    <input 
                      type="number"
                      value={stats.height || ''}
                      onChange={(e) => dispatch(updateStats({ height: e.target.value ? Number(e.target.value) : undefined }))}
                      placeholder={preferences.measurementUnit === 'imperial' ? 'ft' : 'cm'}
                      className="w-full p-2 bg-gray-900 border border-gray-800 rounded-md"
                    />
                    <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm">
                      {preferences.measurementUnit === 'imperial' ? 'ft' : 'cm'}
                    </span>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Weight</label>
                  <div className="relative">
                    <input 
                      type="number"
                      value={stats.weight || ''}
                      onChange={(e) => dispatch(updateStats({ weight: e.target.value ? Number(e.target.value) : undefined }))}
                      placeholder={preferences.measurementUnit === 'imperial' ? 'lbs' : 'kg'}
                      className="w-full p-2 bg-gray-900 border border-gray-800 rounded-md"
                    />
                    <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm">
                      {preferences.measurementUnit === 'imperial' ? 'lbs' : 'kg'}
                    </span>
                  </div>
                </div>
              </div>
              
              <div>
                <label className="block text-sm text-gray-400 mb-1">Body Fat % (optional)</label>
                <div className="relative">
                  <input 
                    type="number"
                    value={stats.bodyFatPercentage || ''}
                    onChange={(e) => dispatch(updateStats({ bodyFatPercentage: e.target.value ? Number(e.target.value) : undefined }))}
                    placeholder="Body fat percentage"
                    className="w-full p-2 bg-gray-900 border border-gray-800 rounded-md"
                  />
                  <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm">
                    %
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Account Section */}
          <div className="card p-6">
            <h2 className="text-xl font-bold mb-4">Account</h2>
            
            <button 
              onClick={handleSignOut}
              className="w-full flex items-center justify-center gap-2 p-3 rounded-md bg-red-900/30 text-red-500 hover:bg-red-900/50 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* User Stats Section */}
          <div className="card p-6">
            <h2 className="text-xl font-bold mb-4">User Stats</h2>
            
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Info className="w-4 h-4 text-gray-500" />
                  <span className="text-gray-400">Fitness Goal</span>
                </div>
                <span className="font-medium capitalize">
                  {stats.fitnessGoal ? stats.fitnessGoal.replace('_', ' ') : 'Not set'}
                </span>
              </div>
              
              <div className="border-t border-gray-800 pt-3 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Info className="w-4 h-4 text-gray-500" />
                  <span className="text-gray-400">Experience Level</span>
                </div>
                <span className="font-medium capitalize">
                  {stats.experienceLevel || 'Not set'}
                </span>
              </div>
              
              <div className="border-t border-gray-800 pt-3 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Info className="w-4 h-4 text-gray-500" />
                  <span className="text-gray-400">Height</span>
                </div>
                <span className="font-medium">
                  {stats.height ? 
                    `${stats.height} ${preferences.measurementUnit === 'imperial' ? 'ft' : 'cm'}` : 
                    'Not set'}
                </span>
              </div>
              
              <div className="border-t border-gray-800 pt-3 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Info className="w-4 h-4 text-gray-500" />
                  <span className="text-gray-400">Weight</span>
                </div>
                <span className="font-medium">
                  {stats.weight ? 
                    `${stats.weight} ${preferences.measurementUnit === 'imperial' ? 'lbs' : 'kg'}` : 
                    'Not set'}
                </span>
              </div>
              
              <div className="border-t border-gray-800 pt-3 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Info className="w-4 h-4 text-gray-500" />
                  <span className="text-gray-400">Body Fat</span>
                </div>
                <span className="font-medium">
                  {stats.bodyFatPercentage ? `${stats.bodyFatPercentage}%` : 'Not set'}
                </span>
              </div>
            </div>
          </div>
          
          {/* App Preferences Section */}
          <div className="card p-6">
            <h2 className="text-xl font-bold mb-4">App Preferences</h2>
            
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Info className="w-4 h-4 text-gray-500" />
                  <span className="text-gray-400">Theme</span>
                </div>
                <span className="font-medium capitalize">
                  {preferences.theme} Mode
                </span>
              </div>
              
              <div className="border-t border-gray-800 pt-3 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Info className="w-4 h-4 text-gray-500" />
                  <span className="text-gray-400">Units</span>
                </div>
                <span className="font-medium capitalize">
                  {preferences.measurementUnit}
                </span>
              </div>
            </div>
          </div>
          
          {/* Account Section */}
          <div className="card p-6">
            <button 
              onClick={handleSignOut}
              className="w-full flex items-center justify-center gap-2 p-3 rounded-md bg-gray-800 hover:bg-gray-700 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function User({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
} 