'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronDown, ChevronUp, Dumbbell, Calendar } from 'lucide-react';
import { WorkoutSession } from '@/lib/slices/workoutSlice';

interface WorkoutCardProps {
  workout: WorkoutSession;
  compact?: boolean;
}

export default function WorkoutCard({ workout, compact = false }: WorkoutCardProps) {
  const [expanded, setExpanded] = useState(!compact);
  
  const totalSets = workout.exercises.reduce((total, exercise) => 
    total + exercise.sets.filter(set => set.completed).length, 0);
  
  const totalVolume = workout.exercises.reduce((total, exercise) => {
    return total + exercise.sets
      .filter(set => set.completed)
      .reduce((setTotal, set) => setTotal + (set.weight * set.reps), 0);
  }, 0);

  return (
    <div className="card overflow-hidden">
      <div 
        className="flex justify-between items-center p-4 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-full bg-neon-green/10 text-neon-green">
            <Dumbbell className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-lg">{workout.name}</h3>
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <Calendar className="w-3 h-3" />
              <span>{workout.date}</span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          {!compact && (
            <div className="hidden md:block text-right">
              <div className="text-sm">
                <span className="text-gray-400">Volume: </span>
                <span className="font-mono">{totalVolume.toLocaleString()} kg</span>
              </div>
              <div className="text-sm">
                <span className="text-gray-400">Sets: </span>
                <span className="font-mono">{totalSets}</span>
              </div>
            </div>
          )}
          
          {compact ? (
            <Link 
              href={`/workout/${workout.id}`}
              className="text-neon-green text-sm hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              Details
            </Link>
          ) : (
            <button className="text-gray-400 p-1 rounded-full hover:bg-black/20">
              {expanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </button>
          )}
        </div>
      </div>

      {expanded && !compact && (
        <div className="px-4 pb-4 pt-2 border-t border-neon-green/10">
          <div className="mb-4">
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="bg-black/20 p-3 rounded-lg">
                <p className="text-xs text-gray-400 mb-1">Total Volume</p>
                <p className="font-mono text-lg">{totalVolume.toLocaleString()} kg</p>
              </div>
              <div className="bg-black/20 p-3 rounded-lg">
                <p className="text-xs text-gray-400 mb-1">Completed Sets</p>
                <p className="font-mono text-lg">{totalSets}</p>
              </div>
            </div>
          </div>

          <h4 className="font-medium text-sm text-gray-300 mb-2">Exercises</h4>
          <div className="space-y-3">
            {workout.exercises.map((exercise) => (
              <div key={exercise.id} className="bg-black/20 p-3 rounded-lg">
                <div className="flex justify-between items-center mb-2">
                  <h5 className="font-medium">{exercise.name}</h5>
                  <span className="text-xs text-gray-400">
                    {exercise.sets.filter(s => s.completed).length} / {exercise.targetSets} sets
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {exercise.sets.filter(s => s.completed).map((set, index) => (
                    <div 
                      key={set.id} 
                      className="text-xs bg-black/30 px-2 py-1 rounded font-mono text-neon-green"
                    >
                      {set.weight}kg × {set.reps}
                      {set.rir > 0 && <span className="text-gray-400 ml-1">@{set.rir}RIR</span>}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {workout.feedback && (
            <div className="mt-4 pt-4 border-t border-neon-green/10">
              <h4 className="font-medium text-sm text-gray-300 mb-2">Feedback</h4>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-black/20 p-2 rounded-lg">
                  <p className="text-xs text-gray-400">Exertion Level</p>
                  <p className="text-sm">{workout.feedback.exertionLevel}</p>
                </div>
                {Object.entries(workout.feedback.soreness).map(([muscle, level]) => (
                  <div key={muscle} className="bg-black/20 p-2 rounded-lg">
                    <p className="text-xs text-gray-400">{muscle} Soreness</p>
                    <div className="flex items-center gap-1 mt-1">
                      {[...Array(5)].map((_, i) => (
                        <div 
                          key={i} 
                          className={`h-1 w-5 rounded-full ${
                            i < level ? 'bg-neon-green' : 'bg-gray-700'
                          }`} 
                        />
                      ))}
                      <span className="text-xs ml-1">{level}/5</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          <div className="mt-4 text-center">
            <Link
              href={`/workout/${workout.id}`}
              className="text-neon-green text-sm hover:underline"
            >
              View Full Details
            </Link>
          </div>
        </div>
      )}
    </div>
  );
} 