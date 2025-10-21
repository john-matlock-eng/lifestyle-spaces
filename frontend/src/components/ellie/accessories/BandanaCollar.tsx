import React from 'react';
import { ELLIE_COORDINATES } from '../constants/coordinates';

export interface BandanaCollarProps {
  color: string;
  className?: string;
}

export const BandanaCollar: React.FC<BandanaCollarProps> = ({ color, className = '' }) => {
  const { collar } = ELLIE_COORDINATES;
  const centerX = collar.x + collar.width / 2;

  return (
    <g className={`ellie-collar bandana ${className}`}>
      {/* Bandana - triangular fold hanging from neck */}
      <path
        d={`M ${collar.x} ${collar.y + collar.height}
            L ${collar.x + collar.width} ${collar.y + collar.height}
            L ${centerX} ${collar.y + collar.height + 10} Z`}
        fill={color}
        stroke="rgba(0, 0, 0, 0.2)"
        strokeWidth="0.3"
      />

      {/* Bandana knot at neck */}
      <rect
        x={collar.x + 2}
        y={collar.y}
        width={collar.width - 4}
        height={collar.height}
        rx={collar.rx}
        fill={color}
        opacity="0.8"
        stroke="rgba(0, 0, 0, 0.2)"
        strokeWidth="0.3"
      />

      {/* Bandana fold highlight */}
      <path
        d={`M ${collar.x + 2} ${collar.y + collar.height} Q ${centerX} ${collar.y + collar.height - 2} ${collar.x + collar.width - 2} ${collar.y + collar.height}`}
        fill="none"
        stroke="rgba(255, 255, 255, 0.3)"
        strokeWidth="1"
      />

      {/* Bandana pattern dots */}
      <circle cx={centerX - 5} cy={collar.y + collar.height + 4} r="0.8" fill="rgba(255, 255, 255, 0.4)" />
      <circle cx={centerX} cy={collar.y + collar.height + 2} r="0.8" fill="rgba(255, 255, 255, 0.4)" />
      <circle cx={centerX + 5} cy={collar.y + collar.height + 4} r="0.8" fill="rgba(255, 255, 255, 0.4)" />
      <circle cx={centerX - 3} cy={collar.y + collar.height + 6} r="0.8" fill="rgba(255, 255, 255, 0.4)" />
      <circle cx={centerX + 3} cy={collar.y + collar.height + 6} r="0.8" fill="rgba(255, 255, 255, 0.4)" />
    </g>
  );
};
