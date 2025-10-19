import React from 'react';
import type { BodyPartProps } from '../types/ellie.types';
import { ELLIE_COORDINATES } from '../constants/coordinates';

export const Legs: React.FC<BodyPartProps> = ({ furColor, className = '' }) => {
  const { legs, paws } = ELLIE_COORDINATES;

  return (
    <g className={`ellie-legs ${className}`}>
      {/* Back left leg */}
      <ellipse
        cx={legs.back.left.cx}
        cy={legs.back.left.cy}
        rx={legs.back.left.rx}
        ry={legs.back.left.ry}
        fill={furColor}
      />

      {/* Back right leg */}
      <ellipse
        cx={legs.back.right.cx}
        cy={legs.back.right.cy}
        rx={legs.back.right.rx}
        ry={legs.back.right.ry}
        fill={furColor}
      />

      {/* Front left leg */}
      <ellipse
        cx={legs.front.left.cx}
        cy={legs.front.left.cy}
        rx={legs.front.left.rx}
        ry={legs.front.left.ry}
        fill={furColor}
      />

      {/* Front right leg */}
      <ellipse
        cx={legs.front.right.cx}
        cy={legs.front.right.cy}
        rx={legs.front.right.rx}
        ry={legs.front.right.ry}
        fill={furColor}
      />

      {/* Back left paw */}
      <ellipse
        cx={paws.back.left.cx}
        cy={paws.back.left.cy}
        rx={paws.back.left.rx}
        ry={paws.back.left.ry}
        fill="#8B7355"
      />

      {/* Back right paw */}
      <ellipse
        cx={paws.back.right.cx}
        cy={paws.back.right.cy}
        rx={paws.back.right.rx}
        ry={paws.back.right.ry}
        fill="#8B7355"
      />

      {/* Front left paw */}
      <ellipse
        cx={paws.front.left.cx}
        cy={paws.front.left.cy}
        rx={paws.front.left.rx}
        ry={paws.front.left.ry}
        fill="#8B7355"
      />

      {/* Front right paw */}
      <ellipse
        cx={paws.front.right.cx}
        cy={paws.front.right.cy}
        rx={paws.front.right.rx}
        ry={paws.front.right.ry}
        fill="#8B7355"
      />
    </g>
  );
};
