import React from 'react';
import type { BodyPartProps } from '../types/ellie.types';
import { getEarRotation } from '../utils/paths';
import { ELLIE_COORDINATES } from '../constants/coordinates';

export const Ears: React.FC<BodyPartProps> = ({ furColor, mood, className = '' }) => {
  const leftEarRotation = getEarRotation(mood, true);
  const rightEarRotation = getEarRotation(mood, false);
  const { leftEar, rightEar } = ELLIE_COORDINATES.face;

  return (
    <g className={`ellie-ears ${className}`}>
      {/* Left ear */}
      <path
        d={leftEar.path}
        fill={furColor}
        transform={`rotate(${leftEarRotation} 45 35)`}
      />

      {/* Right ear */}
      <path
        d={rightEar.path}
        fill={furColor}
        transform={`rotate(${rightEarRotation} 75 35)`}
      />
    </g>
  );
};
