import React from 'react';
import type { BodyPartProps } from '../types/ellie.types';
import { ELLIE_COORDINATES } from '../constants/coordinates';

export const Neck: React.FC<BodyPartProps> = ({ furColor, className = '' }) => {
  const { neck } = ELLIE_COORDINATES;

  return (
    <g className={`ellie-neck ${className}`}>
      {/* Neck connecting head to body */}
      <ellipse
        cx={neck.cx}
        cy={neck.cy}
        rx={neck.rx}
        ry={neck.ry}
        fill={furColor}
      />
    </g>
  );
};
