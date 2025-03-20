'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronDown, ChevronUp, Play } from 'lucide-react';
import { Exercise } from '@/lib/slices/exerciseSlice';

interface ExerciseCardProps {
  exercise: Exercise;
}

export default function ExerciseCard({ exercise }: ExerciseCardProps) {
  const [expanded, setExpanded] = useState(false);
  
  return (
    <motion.div 
      whileHover={{ y: -5 }}
      className="card overflow-hidden"
    >
      <div 
        className="p-4 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex justify-between items-center">
          <h3 className="font-semibold text-lg">{exercise.name}</h3>
          <button className="text-gray-400 p-1 rounded-full hover:bg-black/20">
            {expanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>
        </div>
        
        <div className="flex flex-wrap mt-2 gap-1">
          {exercise.targetMuscles.map(muscle => (
            <span 
              key={muscle} 
              className="inline-block bg-neon-green/10 text-neon-green text-xs px-2 py-1 rounded-full"
            >
              {muscle}
            </span>
          ))}
        </div>
        
        <div className="flex flex-wrap mt-2 gap-1">
          {exercise.category.map(cat => (
            <span 
              key={cat} 
              className="inline-block bg-black/30 text-gray-300 text-xs px-2 py-1 rounded-full"
            >
              {cat}
            </span>
          ))}
        </div>
      </div>
      
      {expanded && (
        <div className="p-4 pt-0 border-t border-neon-green/10 mt-2">
          <p className="text-sm text-gray-300 mb-4">{exercise.description}</p>
          
          {exercise.videoUrl && (
            <div className="mb-4 bg-black/50 rounded-lg overflow-hidden">
              <div className="relative pt-[56.25%]"> {/* 16:9 aspect ratio */}
                <iframe 
                  className="absolute top-0 left-0 w-full h-full"
                  src={exercise.videoUrl}
                  title={`${exercise.name} demonstration`}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                ></iframe>
              </div>
            </div>
          )}
          
          {exercise.tips.length > 0 && (
            <div>
              <h4 className="font-medium text-sm text-gray-300 mb-2">Form Tips</h4>
              <ul className="text-sm text-gray-300 list-disc pl-5 space-y-1">
                {exercise.tips.map((tip, index) => (
                  <li key={index}>{tip}</li>
                ))}
              </ul>
            </div>
          )}
          
          <div className="mt-4 pt-4 border-t border-neon-green/10 flex justify-between items-center">
            <div>
              <h4 className="font-medium text-sm text-gray-300 mb-1">Secondary Muscles</h4>
              <div className="flex flex-wrap gap-1">
                {exercise.secondaryMuscles.map(muscle => (
                  <span 
                    key={muscle} 
                    className="inline-block bg-black/30 text-gray-300 text-xs px-2 py-1 rounded-full"
                  >
                    {muscle}
                  </span>
                ))}
              </div>
            </div>
            
            {exercise.videoUrl && (
              <button className="bg-neon-green/20 hover:bg-neon-green/30 text-neon-green p-2 rounded-full transition-colors">
                <Play className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
      )}
    </motion.div>
  );
} 