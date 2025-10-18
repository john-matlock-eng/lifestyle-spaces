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

export type EllieSize = 'sm' | 'md' | 'lg';

export type ParticleEffect = 'hearts' | 'sparkles' | 'treats' | 'zzz' | null;

export type CollarStyle = 'none' | 'leather' | 'fabric' | 'bowtie' | 'bandana';

export interface ElliePosition {
  x: number;
  y: number;
}

export interface EllieProps {
  mood?: EllieMood;
  position?: ElliePosition;
  size?: EllieSize;
  furColor?: string;
  collarStyle?: CollarStyle;
  collarColor?: string;
  showThoughtBubble?: boolean;
  thoughtText?: string;
  particleEffect?: ParticleEffect;
  onPositionChange?: (position: ElliePosition) => void;
  onClick?: () => void;
  onPet?: () => void;
  onNoseBoop?: () => void;
}

export interface BodyPartProps {
  furColor: string;
  mood: EllieMood;
  className?: string;
}

export interface FacialFeatureProps {
  mood: EllieMood;
  onClick?: () => void;
  className?: string;
}
