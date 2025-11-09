import React from 'react';
import type { FacialFeatureProps } from '../types/ellie.types';
import { ELLIE_COORDINATES, EAR_ACCENT_COLOR } from '../constants';

export const Ears: React.FC<FacialFeatureProps> = ({ furColor = '#F5E6D3', className = '' }) => {
  const { leftEar, rightEar } = ELLIE_COORDINATES.face;

  return (
    <g className={`ellie-ears ${className}`}>
      <defs>
        {/* Subtle ear gradient - 2 stops only */}
        <linearGradient id="earGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={furColor} stopOpacity="1" />
          <stop offset="100%" stopColor={EAR_ACCENT_COLOR} stopOpacity="0.95" />
        </linearGradient>
      </defs>

      {/* Left ear - hanging down */}
      <ellipse
        cx={leftEar.cx}
        cy={leftEar.cy}
        rx={leftEar.rx}
        ry={leftEar.ry}
        fill="url(#earGradient)"
        transform={`rotate(${leftEar.rotation} ${leftEar.cx} ${leftEar.cy})`}
      />

      {/* Right ear - hanging down */}
      <ellipse
        cx={rightEar.cx}
        cy={rightEar.cy}
        rx={rightEar.rx}
        ry={rightEar.ry}
        fill="url(#earGradient)"
        transform={`rotate(${rightEar.rotation} ${rightEar.cx} ${rightEar.cy})`}
      />
    </g>
  );
};
