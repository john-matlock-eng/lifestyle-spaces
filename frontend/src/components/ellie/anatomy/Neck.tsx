import React from 'react';
import type { BodyPartProps } from '../types/ellie.types';

export const Neck: React.FC<BodyPartProps> = ({ furColor, mood, className = '' }) => {
  return (
    <g className={`ellie-neck ${className}`}>
      {/* Neck connecting head to body */}
      <rect
        x="42"
        y="48"
        width="16"
        height="12"
        rx="8"
        ry="8"
        fill={furColor}
        stroke="#8B7355"
        strokeWidth="0.5"
      />
    </g>
  );
};
