import React from 'react';
import type { FacialFeatureProps } from '../types/ellie.types';
import { ELLIE_COORDINATES, NOSE_COLOR } from '../constants';

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
      {/* Main nose - larger, more prominent */}
      <ellipse
        cx={nose.cx}
        cy={nose.cy}
        rx={4}
        ry={3}
        fill={NOSE_COLOR}
        className="ellie-nose"
      />

      {/* Nose shine - more subtle */}
      <ellipse
        cx={nose.cx - 1}
        cy={nose.cy - 0.8}
        rx={1.5}
        ry={1}
        fill="rgba(255, 255, 255, 0.4)"
      />

      {/* Nostril detail */}
      <ellipse
        cx={nose.cx - 0.8}
        cy={nose.cy + 0.5}
        rx={0.6}
        ry={0.8}
        fill="rgba(0, 0, 0, 0.3)"
      />
      <ellipse
        cx={nose.cx + 0.8}
        cy={nose.cy + 0.5}
        rx={0.6}
        ry={0.8}
        fill="rgba(0, 0, 0, 0.3)"
      />
    </g>
  );
};
