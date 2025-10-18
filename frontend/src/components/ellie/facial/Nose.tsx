import React from 'react';
import type { FacialFeatureProps } from '../types/ellie.types';

export const Nose: React.FC<FacialFeatureProps> = ({ onClick, className = '' }) => {
  return (
    <g className={`ellie-nose ${className}`} onClick={onClick} style={{ cursor: onClick ? 'pointer' : 'default' }}>
      {/* Main nose */}
      <ellipse
        cx="60"
        cy="42"
        rx="8"
        ry="6"
        fill="#2c1810"
      />

      {/* Nose highlight for depth */}
      <ellipse
        cx="58"
        cy="40"
        rx="3"
        ry="2"
        fill="rgba(255, 255, 255, 0.3)"
      />
    </g>
  );
};
