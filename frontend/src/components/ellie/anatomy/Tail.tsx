import React from 'react';
import type { BodyPartProps } from '../types/ellie.types';
import { getTailRotation } from '../utils/paths';

export const Tail: React.FC<BodyPartProps> = ({ furColor, mood, className = '' }) => {
  const rotation = getTailRotation(mood);

  return (
    <g className={`ellie-tail ${className}`}>
      {/* Tail - curved and fluffy */}
      <path
        d="M 72 70 Q 80 68 85 65 Q 88 63 90 60"
        fill="none"
        stroke={furColor}
        strokeWidth="8"
        strokeLinecap="round"
        transform={`rotate(${rotation} 72 70)`}
        style={{ transformOrigin: '72px 70px' }}
      />

      {/* Tail outline for definition */}
      <path
        d="M 72 70 Q 80 68 85 65 Q 88 63 90 60"
        fill="none"
        stroke="#8B7355"
        strokeWidth="8.5"
        strokeLinecap="round"
        transform={`rotate(${rotation} 72 70)`}
        style={{ transformOrigin: '72px 70px', opacity: 0.3 }}
      />
    </g>
  );
};
