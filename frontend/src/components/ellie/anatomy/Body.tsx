import React from 'react';
import type { BodyPartProps } from '../types/ellie.types';
import { ELLIE_COORDINATES } from '../constants/coordinates';

export const Body: React.FC<BodyPartProps> = ({ furColor, className = '' }) => {
  const { body } = ELLIE_COORDINATES;

  return (
    <g className={`ellie-body ${className}`}>
      {/* Main body */}
      <ellipse
        cx={body.cx}
        cy={body.cy}
        rx={body.rx}
        ry={body.ry}
        fill={furColor}
      />

      {/* Chest/belly highlight */}
      <ellipse
        cx={body.cx}
        cy={body.cy + 4}
        rx={12}
        ry={8}
        fill="rgba(255, 255, 255, 0.1)"
      />
    </g>
  );
};
