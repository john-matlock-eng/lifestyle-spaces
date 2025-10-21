import type { EllieProps, EllieMood, EllieSize, CollarStyle } from '../types/ellie.types';

export const DEFAULT_MOOD: EllieMood = 'idle';

export const DEFAULT_FUR_COLOR = 'linear-gradient(135deg, #FDE2E4 0%, #E0B1CB 100%)';

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
