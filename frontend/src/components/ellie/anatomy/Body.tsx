import React from 'react';
import type { BodyPartProps } from '../types/ellie.types';

export const Body: React.FC<BodyPartProps> = ({ furColor, className = '' }) => {
  return (
    <g className={`ellie-body ${className}`}>
      {/* Shadow/ground indicator */}
      <ellipse
        cx="50"
        cy="95"
        rx="18"
        ry="3"
        fill="rgba(0, 0, 0, 0.15)"
      />

      {/* Main body - slimmer proportions */}
      <ellipse
        cx="50"
        cy="68"
        rx="22"
        ry="20"
        fill={furColor}
        stroke="#8B7355"
        strokeWidth="0.5"
      />

      {/* Chest/belly highlight */}
      <ellipse
        cx="50"
        cy="72"
        rx="12"
        ry="10"
        fill="rgba(255, 255, 255, 0.1)"
      />
    </g>
  );
};
