import React from 'react';
import type { BodyPartProps } from '../types/ellie.types';
import { getTailRotation } from '../utils/paths';
import { ELLIE_COORDINATES } from '../constants/coordinates';

export const Tail: React.FC<BodyPartProps> = ({ furColor, mood, className = '' }) => {
  const rotation = getTailRotation(mood);
  const { tail } = ELLIE_COORDINATES;

  return (
    <g
      className={`ellie-tail ${className}`}
      transform={`rotate(${tail.rotation + rotation} ${tail.transformOrigin})`}
    >
      {/* Tail - ellipse for better shape */}
      {/* The wag animation will be applied via CSS to this inner element */}
      <ellipse
        cx={tail.cx}
        cy={tail.cy}
        rx={tail.rx}
        ry={tail.ry}
        fill={furColor}
        className="ellie-tail-inner"
      />
    </g>
  );
};
