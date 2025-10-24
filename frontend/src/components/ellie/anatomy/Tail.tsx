import React from 'react';
import type { BodyPartProps } from '../types/ellie.types';
import { getTailRotation } from '../utils/paths';
import { ELLIE_COORDINATES } from '../constants/coordinates';

export const Tail: React.FC<BodyPartProps> = ({ furColor, mood, className = '' }) => {
  const rotation = getTailRotation(mood);
  const { tail } = ELLIE_COORDINATES;

  // Calculate darker shade for fur texture lines
  const getDarkerShade = (color: string) => {
    // Simple darkening for common color formats
    if (color.startsWith('#')) {
      const r = parseInt(color.slice(1, 3), 16);
      const g = parseInt(color.slice(3, 5), 16);
      const b = parseInt(color.slice(5, 7), 16);
      return `rgb(${Math.max(0, r - 30)}, ${Math.max(0, g - 30)}, ${Math.max(0, b - 30)})`;
    }
    return 'rgba(0, 0, 0, 0.15)';
  };

  const furStrokeColor = getDarkerShade(furColor);

  return (
    <g
      className={`ellie-tail ${className}`}
      transform={`rotate(${tail.rotation + rotation} ${tail.transformOrigin})`}
    >
      {/* Base tail ellipse */}
      <ellipse
        cx={tail.cx}
        cy={tail.cy}
        rx={tail.rx}
        ry={tail.ry}
        fill={furColor}
        className="ellie-tail-inner"
      />

      {/* Fluff indicators - curved fur texture lines */}
      {/* Top fur strands */}
      <path
        d={`M ${tail.cx - 10} ${tail.cy - 3} Q ${tail.cx - 8} ${tail.cy - 5} ${tail.cx - 6} ${tail.cy - 4}`}
        stroke={furStrokeColor}
        strokeWidth="0.8"
        fill="none"
        strokeLinecap="round"
        opacity="0.6"
      />
      <path
        d={`M ${tail.cx - 4} ${tail.cy - 4} Q ${tail.cx - 2} ${tail.cy - 6} ${tail.cx} ${tail.cy - 5}`}
        stroke={furStrokeColor}
        strokeWidth="0.8"
        fill="none"
        strokeLinecap="round"
        opacity="0.6"
      />
      <path
        d={`M ${tail.cx + 2} ${tail.cy - 4} Q ${tail.cx + 4} ${tail.cy - 6} ${tail.cx + 6} ${tail.cy - 4}`}
        stroke={furStrokeColor}
        strokeWidth="0.8"
        fill="none"
        strokeLinecap="round"
        opacity="0.6"
      />

      {/* Bottom fur strands */}
      <path
        d={`M ${tail.cx - 10} ${tail.cy + 3} Q ${tail.cx - 8} ${tail.cy + 5} ${tail.cx - 6} ${tail.cy + 4}`}
        stroke={furStrokeColor}
        strokeWidth="0.8"
        fill="none"
        strokeLinecap="round"
        opacity="0.6"
      />
      <path
        d={`M ${tail.cx - 4} ${tail.cy + 4} Q ${tail.cx - 2} ${tail.cy + 6} ${tail.cx} ${tail.cy + 5}`}
        stroke={furStrokeColor}
        strokeWidth="0.8"
        fill="none"
        strokeLinecap="round"
        opacity="0.6"
      />
      <path
        d={`M ${tail.cx + 2} ${tail.cy + 4} Q ${tail.cx + 4} ${tail.cy + 6} ${tail.cx + 6} ${tail.cy + 4}`}
        stroke={furStrokeColor}
        strokeWidth="0.8"
        fill="none"
        strokeLinecap="round"
        opacity="0.6"
      />

      {/* Tip fluff - small radiating lines at the end */}
      <path
        d={`M ${tail.cx + 10} ${tail.cy - 2} L ${tail.cx + 13} ${tail.cy - 3}`}
        stroke={furStrokeColor}
        strokeWidth="0.6"
        strokeLinecap="round"
        opacity="0.5"
      />
      <path
        d={`M ${tail.cx + 11} ${tail.cy} L ${tail.cx + 14} ${tail.cy}`}
        stroke={furStrokeColor}
        strokeWidth="0.6"
        strokeLinecap="round"
        opacity="0.5"
      />
      <path
        d={`M ${tail.cx + 10} ${tail.cy + 2} L ${tail.cx + 13} ${tail.cy + 3}`}
        stroke={furStrokeColor}
        strokeWidth="0.6"
        strokeLinecap="round"
        opacity="0.5"
      />
    </g>
  );
};
