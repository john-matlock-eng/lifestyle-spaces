import { useState } from 'react';
import type { EllieMood } from '../types/ellie.types';

export interface UseEllieMoodOptions {
  initialMood?: EllieMood;
  transitionDuration?: number;
}

export interface UseEllieMoodReturn {
  mood: EllieMood;
  setMood: (mood: EllieMood) => void;
  transitionTo: (mood: EllieMood, duration?: number) => void;
}

/**
 * Hook for managing Ellie's mood state with smooth transitions
 */
export function useEllieMood(options: UseEllieMoodOptions = {}): UseEllieMoodReturn {
  const { initialMood = 'idle', transitionDuration = 300 } = options;
  const [mood, setMoodState] = useState<EllieMood>(initialMood);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const setMood = (newMood: EllieMood) => {
    setMoodState(newMood);
  };

  const transitionTo = (newMood: EllieMood, duration: number = transitionDuration) => {
    if (isTransitioning) return;

    setIsTransitioning(true);

    // Optional: Add intermediate "curious" state during transitions
    if (mood !== newMood && mood !== 'curious') {
      setMoodState('curious');
      setTimeout(() => {
        setMoodState(newMood);
        setIsTransitioning(false);
      }, duration);
    } else {
      setMoodState(newMood);
      setIsTransitioning(false);
    }
  };

  return {
    mood,
    setMood,
    transitionTo,
  };
}
