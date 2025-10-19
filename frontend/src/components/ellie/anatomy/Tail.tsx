import React from 'react';
import type { BodyPartProps } from '../types/ellie.types';
import { getTailRotation } from '../utils/paths';
import { ELLIE_COORDINATES } from '../constants/coordinates';

export const Tail: React.FC<BodyPartProps> = ({ furColor, mood, className = '' }) => {
  const rotation = getTailRotation(mood);
  const { tail } = ELLIE_COORDINATES;

  return (
    <g className={`ellie-tail ${className}`}>
      {/* Tail - ellipse for better shape */}
      <ellipse
        cx={tail.cx}
        cy={tail.cy}
        rx={tail.rx}
        ry={tail.ry}
        fill={furColor}
        transform={`rotate(${tail.rotation + rotation} ${tail.transformOrigin})`}
        style={{ transformOrigin: tail.transformOrigin }}
      />
    </g>
  );
};
