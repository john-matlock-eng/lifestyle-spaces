import React from 'react';
import type { FacialFeatureProps } from '../types/ellie.types';
import { getMouthPath } from '../utils/paths';

export const Mouth: React.FC<FacialFeatureProps> = ({ mood, className = '' }) => {
  return (
    <g className={`ellie-mouth ${className}`}>
      <path
        d={getMouthPath(mood)}
        stroke="#2c1810"
        strokeWidth="1.5"
        fill="none"
        strokeLinecap="round"
      />
    </g>
  );
};
