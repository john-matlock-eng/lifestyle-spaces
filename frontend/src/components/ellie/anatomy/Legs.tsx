import React from 'react';
import type { BodyPartProps } from '../types/ellie.types';

export const Legs: React.FC<BodyPartProps> = ({ furColor, className = '' }) => {
  return (
    <g className={`ellie-legs ${className}`}>
      {/* Front legs - simple vertical connections from body to paws */}

      {/* Front left leg */}
      <ellipse
        cx={54}
        cy={78}
        rx={3.5}
        ry={8}
        fill={furColor}
        opacity={0.95}
      />

      {/* Front right leg */}
      <ellipse
        cx={66}
        cy={78}
        rx={3.5}
        ry={8}
        fill={furColor}
        opacity={0.95}
      />

      {/* Front paws visible when sitting - positioned at body edges */}

      {/* Front left paw */}
      <ellipse
        cx={54}
        cy={83}
        rx={3.5}
        ry={3}
        fill={furColor}
        opacity={1}
      />

      {/* Front right paw */}
      <ellipse
        cx={66}
        cy={83}
        rx={3.5}
        ry={3}
        fill={furColor}
        opacity={1}
      />
    </g>
  );
};
