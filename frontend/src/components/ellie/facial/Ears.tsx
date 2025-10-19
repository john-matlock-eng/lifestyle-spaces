import React from 'react';
import type { BodyPartProps } from '../types/ellie.types';
import { ELLIE_COORDINATES } from '../constants/coordinates';

export const Ears: React.FC<BodyPartProps> = ({ furColor, mood, className = '' }) => {
  const { leftEar, rightEar } = ELLIE_COORDINATES.face;

  // Ear rotation based on mood
  const getEarRotation = () => {
    switch(mood) {
      case 'curious':
        return { left: -10, right: 10 };  // Perked up
      case 'concerned':
        return { left: -30, right: 30 };  // Droopy
      case 'excited':
      case 'happy':
        return { left: -5, right: 5 };    // Alert
      default:
        return { left: -20, right: 20 };  // Normal
    }
  };

  const rotation = getEarRotation();

  return (
    <g className={`ellie-ears ${className}`}>
      {/* Left ear */}
      <ellipse
        cx={leftEar.cx}
        cy={leftEar.cy}
        rx={leftEar.rx}
        ry={leftEar.ry}
        fill={furColor}
        transform={`rotate(${rotation.left} ${leftEar.cx} ${leftEar.cy})`}
        className="ellie-ear-left"
      />
      {/* Left ear inner (darker) */}
      <ellipse
        cx={leftEar.cx + 2}
        cy={leftEar.cy}
        rx={leftEar.rx - 3}
        ry={leftEar.ry - 4}
        fill="#8B7355"
        opacity="0.5"
        transform={`rotate(${rotation.left} ${leftEar.cx} ${leftEar.cy})`}
      />

      {/* Right ear */}
      <ellipse
        cx={rightEar.cx}
        cy={rightEar.cy}
        rx={rightEar.rx}
        ry={rightEar.ry}
        fill={furColor}
        transform={`rotate(${rotation.right} ${rightEar.cx} ${rightEar.cy})`}
        className="ellie-ear-right"
      />
      {/* Right ear inner (darker) */}
      <ellipse
        cx={rightEar.cx - 2}
        cy={rightEar.cy}
        rx={rightEar.rx - 3}
        ry={rightEar.ry - 4}
        fill="#8B7355"
        opacity="0.5"
        transform={`rotate(${rotation.right} ${rightEar.cx} ${rightEar.cy})`}
      />
    </g>
  );
};
