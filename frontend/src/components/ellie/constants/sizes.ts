import type { EllieSize } from '../types/ellie.types';

export interface EllieSizeConfig {
  scale: number;
  width: number;
  height: number;
}

export const ELLIE_SIZES: Record<EllieSize, EllieSizeConfig> = {
  sm: {
    scale: 0.75,
    width: 90,
    height: 90,
  },
  md: {
    scale: 1,
    width: 120,
    height: 120,
  },
  lg: {
    scale: 1.5,
    width: 180,
    height: 180,
  },
};

export const DEFAULT_SIZE: EllieSize = 'md';

export const VIEWBOX = '0 0 120 120';
