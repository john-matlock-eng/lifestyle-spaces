import type { EllieProps, EllieMood, EllieSize, CollarStyle } from '../types/ellie.types';

export const DEFAULT_MOOD: EllieMood = 'idle';

// Realistic Shih Tzu cream/tan palette based on reference photos
export const DEFAULT_FUR_COLOR = '#F5E6D3'; // Cream base
export const FUR_ACCENT_COLOR = '#E8D9C8'; // Lighter cream
export const FUR_SHADOW_COLOR = '#D4C5B0'; // Tan shadow
export const EAR_ACCENT_COLOR = '#C4B5A0'; // Darker ears/face
export const NOSE_COLOR = '#5A3A1F'; // Darker brown nose
export const EYE_COLOR = '#1A0F08'; // Very dark brown eyes
export const TONGUE_COLOR = '#FFB5BA'; // Pink tongue

export const DEFAULT_COLLAR_STYLE: CollarStyle = 'leather';

export const DEFAULT_COLLAR_COLOR = '#8B4513';

export const DEFAULT_ELLIE_PROPS: Partial<EllieProps> = {
  mood: DEFAULT_MOOD,
  size: 'md' as EllieSize,
  furColor: undefined, // Will use gradient in component
  collarStyle: DEFAULT_COLLAR_STYLE,
  collarColor: DEFAULT_COLLAR_COLOR,
  showThoughtBubble: false,
  thoughtText: '',
  particleEffect: null,
};
