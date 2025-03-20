'use client';

import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { Search, Filter, Plus } from 'lucide-react';
import { RootState } from '@/lib/store';
import { Exercise, MuscleGroup, ExerciseCategory } from '@/lib/slices/exerciseSlice';
import ExerciseCard from '@/components/ExerciseCard';

export default function ExercisesPage() {
  const { exercises } = useSelector((state: RootState) => state.exercise);
  const [filteredExercises, setFilteredExercises] = useState<Exercise[]>(exercises);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMuscle, setSelectedMuscle] = useState<MuscleGroup | 'all'>('all');
  const [selectedCategory, setSelectedCategory] = useState<ExerciseCategory | 'all'>('all');
  
  const muscleGroups: { value: MuscleGroup | 'all'; label: string }[] = [
    { value: 'all', label: 'All Muscles' },
    { value: 'chest', label: 'Chest' },
    { value: 'back', label: 'Back' },
    { value: 'shoulders', label: 'Shoulders' },
    { value: 'biceps', label: 'Biceps' },
    { value: 'triceps', label: 'Triceps' },
    { value: 'quadriceps', label: 'Quadriceps' },
    { value: 'hamstrings', label: 'Hamstrings' },
    { value: 'glutes', label: 'Glutes' },
    { value: 'calves', label: 'Calves' },
    { value: 'abs', label: 'Abs' },
    { value: 'forearms', label: 'Forearms' },
  ];
  
  const categories: { value: ExerciseCategory | 'all'; label: string }[] = [
    { value: 'all', label: 'All Types' },
    { value: 'compound', label: 'Compound' },
    { value: 'isolation', label: 'Isolation' },
    { value: 'bodyweight', label: 'Bodyweight' },
    { value: 'machine', label: 'Machine' },
    { value: 'cable', label: 'Cable' },
    { value: 'dumbbell', label: 'Dumbbell' },
    { value: 'barbell', label: 'Barbell' },
    { value: 'kettlebell', label: 'Kettlebell' },
  ];
  
  useEffect(() => {
    let result = exercises;
    
    // Apply search filter
    if (searchTerm) {
      const lowerCaseSearch = searchTerm.toLowerCase();
      result = result.filter(exercise => 
        exercise.name.toLowerCase().includes(lowerCaseSearch) || 
        exercise.description.toLowerCase().includes(lowerCaseSearch)
      );
    }
    
    // Apply muscle group filter
    if (selectedMuscle !== 'all') {
      result = result.filter(exercise => 
        exercise.targetMuscles.includes(selectedMuscle as MuscleGroup) || 
        exercise.secondaryMuscles.includes(selectedMuscle as MuscleGroup)
      );
    }
    
    // Apply category filter
    if (selectedCategory !== 'all') {
      result = result.filter(exercise => 
        exercise.category.includes(selectedCategory as ExerciseCategory)
      );
    }
    
    setFilteredExercises(result);
  }, [exercises, searchTerm, selectedMuscle, selectedCategory]);

  return (
    <main className="min-h-screen bg-background text-white">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
          <h1 className="text-3xl font-bold mb-4 md:mb-0">Exercise Library</h1>
          <button className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" /> Add Exercise
          </button>
        </div>

        {/* Search and Filters */}
        <div className="mb-8 space-y-4">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search exercises..."
                className="input-field pl-10 w-full"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <div className="flex gap-2">
              <select 
                className="input-field appearance-none pr-8"
                value={selectedMuscle}
                onChange={(e) => setSelectedMuscle(e.target.value as MuscleGroup | 'all')}
              >
                {muscleGroups.map((muscle) => (
                  <option key={muscle.value} value={muscle.value}>
                    {muscle.label}
                  </option>
                ))}
              </select>
              
              <select 
                className="input-field appearance-none pr-8"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value as ExerciseCategory | 'all')}
              >
                {categories.map((category) => (
                  <option key={category.value} value={category.value}>
                    {category.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Exercise Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredExercises.length > 0 ? (
            filteredExercises.map((exercise) => (
              <ExerciseCard key={exercise.id} exercise={exercise} />
            ))
          ) : (
            <div className="col-span-3 card p-8 text-center">
              <p className="text-gray-400 mb-2">No exercises found matching your filters</p>
              <button 
                className="text-neon-green hover:underline"
                onClick={() => {
                  setSearchTerm('');
                  setSelectedMuscle('all');
                  setSelectedCategory('all');
                }}
              >
                Clear all filters
              </button>
            </div>
          )}
        </div>
      </div>
    </main>
  );
} 