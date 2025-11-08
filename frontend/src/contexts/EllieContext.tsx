import React, { createContext, useContext, useState, useCallback } from 'react';

// Perch positions: 0=bottom-left, 1=bottom-right, 2=top-right, 3=top-left
export type PerchIndex = 0 | 1 | 2 | 3;

export type EllieMood =
  | 'idle'
  | 'happy'
  | 'excited'
  | 'curious'
  | 'playful'
  | 'sleeping'
  | 'walking'
  | 'concerned'
  | 'proud'
  | 'zen'
  | 'celebrating';

export interface EllieContextValue {
  mood: EllieMood;
  setMood: (mood: EllieMood) => void;
  perchIndex: PerchIndex;
  setPerch: (index: PerchIndex) => void;
  cyclePerch: () => void;
  isTyping: boolean;
  setIsTyping: (typing: boolean) => void;
}

const EllieContext = createContext<EllieContextValue | undefined>(undefined);

const STORAGE_KEY = 'ellie-perch';

export const EllieProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Load initial perch from localStorage
  const loadPerch = (): PerchIndex => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = parseInt(saved, 10);
        if (parsed >= 0 && parsed <= 3) {
          return parsed as PerchIndex;
        }
      }
    } catch (error) {
      console.warn('Failed to load Ellie perch:', error);
    }
    return 1; // Default: bottom-right
  };

  const [mood, setMood] = useState<EllieMood>('idle');
  const [perchIndex, setPerchState] = useState<PerchIndex>(loadPerch);
  const [isTyping, setIsTyping] = useState<boolean>(false);

  const setPerch = useCallback((index: PerchIndex) => {
    setPerchState(index);
    try {
      localStorage.setItem(STORAGE_KEY, String(index));
    } catch (error) {
      console.warn('Failed to save Ellie perch:', error);
    }
  }, []);

  const cyclePerch = useCallback(() => {
    setPerch(((perchIndex + 1) % 4) as PerchIndex);
  }, [perchIndex, setPerch]);

  return (
    <EllieContext.Provider
      value={{
        mood,
        setMood,
        perchIndex,
        setPerch,
        cyclePerch,
        isTyping,
        setIsTyping
      }}
    >
      {children}
    </EllieContext.Provider>
  );
};

export const useEllie = (): EllieContextValue => {
  const context = useContext(EllieContext);
  if (!context) {
    throw new Error('useEllie must be used within EllieProvider');
  }
  return context;
};
