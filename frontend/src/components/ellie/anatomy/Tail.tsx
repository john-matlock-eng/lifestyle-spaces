import React from 'react';
import type { BodyPartProps } from '../types/ellie.types';
import { getTailRotation } from '../utils/paths';
import { ELLIE_COORDINATES } from '../constants/coordinates';

export const Tail: React.FC<BodyPartProps> = ({ furColor, mood, className = '' }) => {
  const rotation = getTailRotation(mood);
  const { tail } = ELLIE_COORDINATES;

  // Calculate brightness and provide contrasting color
  const getContrastingFluffColor = (color: string) => {
    let r = 0, g = 0, b = 0;

    if (color.startsWith('#')) {
      r = parseInt(color.slice(1, 3), 16);
      g = parseInt(color.slice(3, 5), 16);
      b = parseInt(color.slice(5, 7), 16);
    } else if (color.startsWith('rgb')) {
      const match = color.match(/\d+/g);
      if (match) {
        r = parseInt(match[0]);
        g = parseInt(match[1]);
        b = parseInt(match[2]);
      }
    }

    // Calculate relative luminance
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

    // For light fur (high luminance), use dark strokes
    // For dark fur (low luminance), use light strokes
    if (luminance > 0.5) {
      // Light fur - use dark strokes with good contrast
      return `rgba(${Math.max(0, r - 80)}, ${Math.max(0, g - 80)}, ${Math.max(0, b - 80)}, 0.7)`;
    } else {
      // Dark fur - use light strokes
      return `rgba(${Math.min(255, r + 100)}, ${Math.min(255, g + 100)}, ${Math.min(255, b + 100)}, 0.6)`;
    }
  };

  const furStrokeColor = getContrastingFluffColor(furColor);

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

      {/* Lion-style tuft at the end (slightly bulbous) */}
      <ellipse
        cx={tail.cx + 10}
        cy={tail.cy}
        rx={3.5}
        ry={5.5}
        fill={furColor}
        opacity="0.95"
      />

      {/* Fluff indicators - curved fur texture lines INSIDE the tail */}
      {/* Top fur strands - positioned inside tail boundaries */}
      <path
        d={`M ${tail.cx - 8} ${tail.cy - 2} Q ${tail.cx - 6} ${tail.cy - 3} ${tail.cx - 4} ${tail.cy - 2}`}
        stroke={furStrokeColor}
        strokeWidth="1.2"
        fill="none"
        strokeLinecap="round"
      />
      <path
        d={`M ${tail.cx - 2} ${tail.cy - 2.5} Q ${tail.cx} ${tail.cy - 3.5} ${tail.cx + 2} ${tail.cy - 2.5}`}
        stroke={furStrokeColor}
        strokeWidth="1.2"
        fill="none"
        strokeLinecap="round"
      />
      <path
        d={`M ${tail.cx + 4} ${tail.cy - 2} Q ${tail.cx + 6} ${tail.cy - 3} ${tail.cx + 8} ${tail.cy - 2}`}
        stroke={furStrokeColor}
        strokeWidth="1.2"
        fill="none"
        strokeLinecap="round"
      />

      {/* Middle fur strands */}
      <path
        d={`M ${tail.cx - 6} ${tail.cy} Q ${tail.cx - 4} ${tail.cy - 1} ${tail.cx - 2} ${tail.cy}`}
        stroke={furStrokeColor}
        strokeWidth="1.2"
        fill="none"
        strokeLinecap="round"
      />
      <path
        d={`M ${tail.cx} ${tail.cy} Q ${tail.cx + 2} ${tail.cy - 1} ${tail.cx + 4} ${tail.cy}`}
        stroke={furStrokeColor}
        strokeWidth="1.2"
        fill="none"
        strokeLinecap="round"
      />

      {/* Bottom fur strands - positioned inside tail boundaries */}
      <path
        d={`M ${tail.cx - 8} ${tail.cy + 2} Q ${tail.cx - 6} ${tail.cy + 3} ${tail.cx - 4} ${tail.cy + 2}`}
        stroke={furStrokeColor}
        strokeWidth="1.2"
        fill="none"
        strokeLinecap="round"
      />
      <path
        d={`M ${tail.cx - 2} ${tail.cy + 2.5} Q ${tail.cx} ${tail.cy + 3.5} ${tail.cx + 2} ${tail.cy + 2.5}`}
        stroke={furStrokeColor}
        strokeWidth="1.2"
        fill="none"
        strokeLinecap="round"
      />
      <path
        d={`M ${tail.cx + 4} ${tail.cy + 2} Q ${tail.cx + 6} ${tail.cy + 3} ${tail.cx + 8} ${tail.cy + 2}`}
        stroke={furStrokeColor}
        strokeWidth="1.2"
        fill="none"
        strokeLinecap="round"
      />

      {/* Tuft fluff lines - radiating from the bulbous end */}
      <path
        d={`M ${tail.cx + 10} ${tail.cy - 3} Q ${tail.cx + 11} ${tail.cy - 4} ${tail.cx + 12} ${tail.cy - 4.5}`}
        stroke={furStrokeColor}
        strokeWidth="1"
        strokeLinecap="round"
      />
      <path
        d={`M ${tail.cx + 11} ${tail.cy - 1.5} Q ${tail.cx + 12.5} ${tail.cy - 2} ${tail.cx + 13.5} ${tail.cy - 2}`}
        stroke={furStrokeColor}
        strokeWidth="1"
        strokeLinecap="round"
      />
      <path
        d={`M ${tail.cx + 12} ${tail.cy} L ${tail.cx + 14} ${tail.cy}`}
        stroke={furStrokeColor}
        strokeWidth="1"
        strokeLinecap="round"
      />
      <path
        d={`M ${tail.cx + 11} ${tail.cy + 1.5} Q ${tail.cx + 12.5} ${tail.cy + 2} ${tail.cx + 13.5} ${tail.cy + 2}`}
        stroke={furStrokeColor}
        strokeWidth="1"
        strokeLinecap="round"
      />
      <path
        d={`M ${tail.cx + 10} ${tail.cy + 3} Q ${tail.cx + 11} ${tail.cy + 4} ${tail.cx + 12} ${tail.cy + 4.5}`}
        stroke={furStrokeColor}
        strokeWidth="1"
        strokeLinecap="round"
      />
    </g>
  );
};
