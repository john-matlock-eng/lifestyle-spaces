import React from 'react';
import type { BodyPartProps } from '../types/ellie.types';

export const Legs: React.FC<BodyPartProps> = ({ furColor, className = '' }) => {
  return (
    <g className={`ellie-legs ${className}`}>
      {/* Back legs */}
      <g className="back-legs">
        <rect
          x="32"
          y="78"
          width="6"
          height="16"
          rx="3"
          fill={furColor}
          stroke="#8B7355"
          strokeWidth="0.5"
        />
        <rect
          x="62"
          y="78"
          width="6"
          height="16"
          rx="3"
          fill={furColor}
          stroke="#8B7355"
          strokeWidth="0.5"
        />
        {/* Paws */}
        <ellipse cx="35" cy="94" rx="4" ry="2.5" fill="#8B7355" />
        <ellipse cx="65" cy="94" rx="4" ry="2.5" fill="#8B7355" />
      </g>

      {/* Front legs */}
      <g className="front-legs">
        <rect
          x="40"
          y="78"
          width="6"
          height="16"
          rx="3"
          fill={furColor}
          stroke="#8B7355"
          strokeWidth="0.5"
        />
        <rect
          x="54"
          y="78"
          width="6"
          height="16"
          rx="3"
          fill={furColor}
          stroke="#8B7355"
          strokeWidth="0.5"
        />
        {/* Paws */}
        <ellipse cx="43" cy="94" rx="4" ry="2.5" fill="#8B7355" />
        <ellipse cx="57" cy="94" rx="4" ry="2.5" fill="#8B7355" />
      </g>
    </g>
  );
};
