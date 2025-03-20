'use client';

import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { RootState } from '@/lib/store';
import { WorkoutSession } from '@/lib/slices/workoutSlice';

export default function StatsOverview() {
  const { workoutHistory } = useSelector((state: RootState) => state.workout);
  const [volumeData, setVolumeData] = useState<{ date: string; volume: number }[]>([]);
  
  useEffect(() => {
    // Process workouts to extract volume data
    if (workoutHistory.length > 0) {
      const processedData = workoutHistory
        .slice(-7) // Last 7 workouts for the chart
        .map((workout: WorkoutSession) => {
          const totalVolume = workout.exercises.reduce((total, exercise) => {
            return total + exercise.sets
              .filter(set => set.completed)
              .reduce((setTotal, set) => setTotal + (set.weight * set.reps), 0);
          }, 0);
          
          return {
            date: workout.date,
            volume: totalVolume,
          };
        });
      
      setVolumeData(processedData);
    }
  }, [workoutHistory]);
  
  // Calculate total volume, sets, and exercises
  const totalVolume = workoutHistory.reduce((total, workout) => {
    const workoutVolume = workout.exercises.reduce((wTotal, exercise) => {
      return wTotal + exercise.sets
        .filter(set => set.completed)
        .reduce((setTotal, set) => setTotal + (set.weight * set.reps), 0);
    }, 0);
    
    return total + workoutVolume;
  }, 0);
  
  const totalSets = workoutHistory.reduce((total, workout) => {
    const workoutSets = workout.exercises.reduce((wTotal, exercise) => {
      return wTotal + exercise.sets.filter(set => set.completed).length;
    }, 0);
    
    return total + workoutSets;
  }, 0);
  
  const totalExercises = workoutHistory.reduce((total, workout) => {
    return total + workout.exercises.length;
  }, 0);
  
  const chartTheme = {
    background: 'transparent',
    text: '#FFFFFF',
    bars: '#00ff88',
    tooltip: {
      background: 'rgba(0, 0, 0, 0.8)',
      border: '#00ff88',
      text: '#FFFFFF'
    }
  };

  return (
    <div className="mb-8 space-y-6">
      <h2 className="text-xl font-bold">Progress Overview</h2>
      
      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card p-4">
          <h3 className="text-xs text-gray-400 mb-1">Total Volume</h3>
          <p className="text-xl font-mono font-semibold">{totalVolume.toLocaleString()} kg</p>
        </div>
        <div className="card p-4">
          <h3 className="text-xs text-gray-400 mb-1">Total Sets</h3>
          <p className="text-xl font-mono font-semibold">{totalSets}</p>
        </div>
        <div className="card p-4">
          <h3 className="text-xs text-gray-400 mb-1">Total Exercises</h3>
          <p className="text-xl font-mono font-semibold">{totalExercises}</p>
        </div>
      </div>
      
      {/* Volume Chart */}
      <div className="card p-4 h-64">
        {volumeData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={volumeData}
              margin={{ top: 10, right: 10, left: 0, bottom: 20 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis 
                dataKey="date" 
                stroke={chartTheme.text} 
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => value.split('-').slice(1).join('/')}
              />
              <YAxis 
                stroke={chartTheme.text}
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => `${Math.round(value / 1000)}k`}
              />
              <Tooltip
                contentStyle={{ 
                  background: chartTheme.tooltip.background,
                  border: `1px solid ${chartTheme.tooltip.border}`,
                  borderRadius: '4px',
                  color: chartTheme.tooltip.text,
                }}
                formatter={(value: number) => [`${value.toLocaleString()} kg`, 'Volume']}
                labelFormatter={(label) => `Date: ${label}`}
              />
              <Bar 
                dataKey="volume" 
                fill={chartTheme.bars}
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex items-center justify-center">
            <p className="text-gray-400">Complete workouts to see your volume progression</p>
          </div>
        )}
      </div>
    </div>
  );
} 