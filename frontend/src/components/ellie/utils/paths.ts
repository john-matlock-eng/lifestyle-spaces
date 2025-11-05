import type { EllieMood } from '../types/ellie.types';

/**
 * Determine when to show tongue based on mood
 */
export const shouldShowTongue = (mood: EllieMood): boolean => {
  return ['happy', 'excited', 'playful', 'walking', 'celebrating'].includes(mood);
};

/**
 * Generate mouth path based on mood - now with friendly smiles
 */
export const getMouthPath = (mood: EllieMood): string => {
  switch (mood) {
    case 'happy':
    case 'excited':
    case 'playful':
    case 'celebrating':
      // Big happy smile with line from nose
      return 'M 60 43 L 60 47 M 56 47 Q 60 50 64 47';
    case 'concerned':
      // Slight frown
      return 'M 60 43 L 60 46 M 57 47 Q 60 46 63 47';
    case 'sleeping':
      // Peaceful closed mouth
      return 'M 60 43 L 60 45 M 58 45 L 62 45';
    case 'zen':
      // Calm gentle smile
      return 'M 60 43 L 60 46 M 57 46 Q 60 47 63 46';
    case 'proud':
      // Confident smile
      return 'M 60 43 L 60 46 M 57 46 Q 60 47.5 63 46';
    case 'curious':
      // Slight interested expression
      return 'M 60 43 L 60 46 M 58 46 L 62 46';
    default:
      // Gentle smile for idle/default - friendly and approachable
      return 'M 60 43 L 60 46 M 57 46 Q 60 47.5 63 46';
  }
};

/**
 * Generate tongue shape (hangs from mouth, not covering collar) - subtle size
 */
export const getTonguePath = (mood: EllieMood): string => {
  switch (mood) {
    case 'happy':
      return 'M 58 48 Q 58 50 59 51 Q 60 52 61 51 Q 62 50 62 48 Z';
    case 'excited':
    case 'celebrating':
      return 'M 57 48 Q 57 51 58 53 Q 60 54 62 53 Q 63 51 63 48 Z';
    case 'playful':
      return 'M 59 48 Q 60 50 61 51 Q 62 52 63 51 Q 63 49 62 48 Z';
    case 'walking':
      return 'M 58 48 Q 58 51 59 52 Q 60 53 61 52 Q 62 51 62 48 Z';
    default:
      return '';
  }
};

/**
 * Tongue highlight for dimension - subtle
 */
export const getTongueHighlightPath = (mood: EllieMood): string => {
  switch (mood) {
    case 'happy':
      return 'M 59 49 Q 59.5 50 60 50.5 Q 60.5 50 61 49';
    case 'excited':
    case 'celebrating':
      return 'M 58 49 Q 59 51 60 52 Q 61 51 62 49';
    case 'playful':
      return 'M 60 49 Q 61 50 61.5 50.5 Q 62 50 62 49';
    case 'walking':
      return 'M 59 49 Q 60 50.5 60.5 51 Q 61 50.5 61 49';
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
 * Get tail rotation based on mood - subtle movements
 */
export const getTailRotation = (mood: EllieMood): number => {
  switch (mood) {
    case 'happy':
    case 'excited':
    case 'playful':
    case 'celebrating':
      return 8; // Slightly up (happy) - reduced from 10
    case 'concerned':
      return -5; // Slightly down (tucked)
    case 'sleeping':
    case 'zen':
      return 2; // Relaxed - reduced from 3
    default:
      return 2; // Normal/neutral - reduced from 5
  }
};
