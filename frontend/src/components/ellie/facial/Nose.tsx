import React from 'react';
import type { FacialFeatureProps } from '../types/ellie.types';
import { ELLIE_COORDINATES } from '../constants/coordinates';
import { ELLIE_NOSE_PINK } from '../constants/defaults';

export const Nose: React.FC<FacialFeatureProps> = ({ onClick, className = '' }) => {
  const { nose } = ELLIE_COORDINATES.face;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onClick) {
      onClick();
    }
  };

  return (
    <g className={`ellie-nose ${className}`} onClick={handleClick} style={{ cursor: onClick ? 'pointer' : 'default' }}>
      {/* Main nose - Shih Tzu pink nose */}
      <ellipse
        cx={nose.cx}
        cy={nose.cy}
        rx={nose.rx}
        ry={nose.ry}
        fill={ELLIE_NOSE_PINK}
      />

      {/* Nose highlight for depth and shine */}
      <ellipse
        cx={nose.cx - 1}
        cy={nose.cy - 1}
        rx={2}
        ry={1.5}
        fill="rgba(255, 255, 255, 0.4)"
      />
    </g>
  );
};
