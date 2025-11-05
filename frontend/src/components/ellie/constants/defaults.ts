import type { EllieProps, EllieMood, EllieSize, CollarStyle } from '../types/ellie.types';

export const DEFAULT_MOOD: EllieMood = 'idle';

// Real Ellie's cream/tan coloring (Shih Tzu)
export const DEFAULT_FUR_COLOR = 'linear-gradient(135deg, #F5E6D3 0%, #E8D4B8 100%)';

// Additional color constants for Shih Tzu features
export const ELLIE_TAN_PATCHES = '#D4B896';  // For ear and eye patches
export const ELLIE_NOSE_PINK = '#E8A5A5';    // For the pink nose
export const ELLIE_DARK_EYES = '#1a0f0a';    // Very dark brown eyes

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
