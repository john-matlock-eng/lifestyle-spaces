import type { EllieMood } from '../types/ellie.types';

/**
 * Determine when to show tongue based on mood
 */
export const shouldShowTongue = (mood: EllieMood): boolean => {
  return ['happy', 'excited', 'playful', 'walking', 'celebrating'].includes(mood);
};

/**
 * Generate mouth path based on mood (simpler, shows lower jaw)
 */
export const getMouthPath = (mood: EllieMood): string => {
  switch (mood) {
    case 'happy':
    case 'excited':
    case 'playful':
    case 'celebrating':
      return 'M 60 44 L 60 47 M 55 47 Q 60 49 65 47';
    case 'concerned':
      return 'M 60 44 L 60 46 M 55 47 Q 60 45 65 47';
    case 'sleeping':
      return 'M 60 44 L 60 45';
    case 'zen':
      return 'M 60 44 L 60 46 M 56 46 Q 60 47 64 46';
    case 'proud':
      return 'M 60 44 L 60 46 M 55 46 Q 60 47 65 46';
    case 'curious':
      return 'M 60 44 L 60 46 M 57 46 L 63 46';
    default:
      return 'M 60 44 L 60 46 M 57 46 L 63 46';
  }
};

/**
 * Generate tongue shape (hangs from mouth, not covering collar)
 */
export const getTonguePath = (mood: EllieMood): string => {
  switch (mood) {
    case 'happy':
      return 'M 58 48 Q 58 52 59 54 Q 60 55 61 54 Q 62 52 62 48 Z';
    case 'excited':
    case 'celebrating':
      return 'M 57 48 Q 57 55 58 58 Q 60 59 62 58 Q 63 55 63 48 Z';
    case 'playful':
      return 'M 59 48 Q 61 52 63 54 Q 64 55 65 54 Q 65 51 63 48 Z';
    case 'walking':
      return 'M 58 48 Q 58 54 59 57 Q 61 58 63 57 Q 64 54 64 48 Z';
    default:
      return '';
  }
};

/**
 * Tongue highlight for dimension
 */
export const getTongueHighlightPath = (mood: EllieMood): string => {
  switch (mood) {
    case 'happy':
      return 'M 59 50 Q 59.5 52 60 53 Q 60.5 52 61 50';
    case 'excited':
    case 'celebrating':
      return 'M 58 50 Q 59 54 60 56 Q 61 54 62 50';
    case 'playful':
      return 'M 60 50 Q 62 52 63 53 Q 63 51 62 50';
    case 'walking':
      return 'M 59 50 Q 60 53 61 55 Q 62 53 62 50';
    default:
      return '';
  }
};

/**
 * Get eye path based on mood
 */
export const getEyePath = (mood: EllieMood, isLeft: boolean): string => {
  const xOffset = isLeft ? -8 : 8;
  const baseX = 50 + xOffset;

  switch (mood) {
    case 'sleeping':
      // Closed eyes (horizontal line)
      return `M ${baseX - 2} 35 L ${baseX + 2} 35`;
    case 'happy':
    case 'excited':
    case 'celebrating':
      // Happy eyes (curved upward)
      return `M ${baseX - 2} 36 Q ${baseX} 34 ${baseX + 2} 36`;
    case 'concerned':
      // Worried eyes (curved downward)
      return `M ${baseX - 2} 34 Q ${baseX} 36 ${baseX + 2} 34`;
    default:
      // Normal round eyes
      return `M ${baseX} 35 m -2 0 a 2 2 0 1 0 4 0 a 2 2 0 1 0 -4 0`;
  }
};

/**
 * Get ear rotation based on mood
 */
export const getEarRotation = (mood: EllieMood, isLeft: boolean): string => {
  const baseRotation = isLeft ? -15 : 15;

  switch (mood) {
    case 'excited':
    case 'curious':
    case 'playful':
      return `${baseRotation * 1.3}`;
    case 'sleeping':
    case 'zen':
      return `${baseRotation * 0.5}`;
    default:
      return `${baseRotation}`;
  }
};

/**
 * Get tail rotation based on mood
 */
export const getTailRotation = (mood: EllieMood): number => {
  switch (mood) {
    case 'happy':
    case 'excited':
    case 'playful':
    case 'celebrating':
      return 45; // Wagging up
    case 'concerned':
      return -15; // Tucked down
    case 'sleeping':
    case 'zen':
      return 15; // Relaxed
    default:
      return 30; // Normal
  }
};
