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
      {/* Main nose - smaller, more button-like */}
      <ellipse
        cx={nose.cx}
        cy={nose.cy}
        rx={nose.rx * 0.8}
        ry={nose.ry * 0.8}
        fill={ELLIE_NOSE_PINK}
      />

      {/* Nose highlight - positioned at top left */}
      <ellipse
        cx={nose.cx - 0.8}
        cy={nose.cy - 0.8}
        rx={1.5}
        ry={1}
        fill="rgba(255, 255, 255, 0.5)"
      />

      {/* Nostrils for definition */}
      <circle
        cx={nose.cx - 1}
        cy={nose.cy + 0.5}
        r="0.5"
        fill="rgba(0, 0, 0, 0.3)"
      />
      <circle
        cx={nose.cx + 1}
        cy={nose.cy + 0.5}
        r="0.5"
        fill="rgba(0, 0, 0, 0.3)"
      />
    </g>
  );
};
