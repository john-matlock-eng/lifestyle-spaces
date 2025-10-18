import React from 'react';
import type { BodyPartProps } from '../types/ellie.types';
import { getEarRotation } from '../utils/paths';

export const Ears: React.FC<BodyPartProps> = ({ furColor, mood, className = '' }) => {
  const leftEarRotation = getEarRotation(mood, true);
  const rightEarRotation = getEarRotation(mood, false);

  return (
    <g className={`ellie-ears ${className}`}>
      {/* Left ear */}
      <ellipse
        cx="35"
        cy="25"
        rx="12"
        ry="18"
        fill={furColor}
        stroke="#8B7355"
        strokeWidth="0.5"
        transform={`rotate(${leftEarRotation} 35 25)`}
      />

      {/* Right ear */}
      <ellipse
        cx="65"
        cy="25"
        rx="12"
        ry="18"
        fill={furColor}
        stroke="#8B7355"
        strokeWidth="0.5"
        transform={`rotate(${rightEarRotation} 65 25)`}
      />

      {/* Inner ear details */}
      <ellipse
        cx="35"
        cy="27"
        rx="6"
        ry="10"
        fill="rgba(139, 115, 85, 0.3)"
        transform={`rotate(${leftEarRotation} 35 25)`}
      />
      <ellipse
        cx="65"
        cy="27"
        rx="6"
        ry="10"
        fill="rgba(139, 115, 85, 0.3)"
        transform={`rotate(${rightEarRotation} 65 25)`}
      />
    </g>
  );
};
