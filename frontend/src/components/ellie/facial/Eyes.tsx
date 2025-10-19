import React from 'react';
import type { FacialFeatureProps } from '../types/ellie.types';
import { ELLIE_COORDINATES } from '../constants/coordinates';

export const Eyes: React.FC<FacialFeatureProps> = ({ mood, className = '' }) => {
  const { leftEye, rightEye } = ELLIE_COORDINATES.face;

  const renderEyes = () => {
    switch(mood) {
      case 'sleeping':
        // Closed eyes - horizontal lines
        return (
          <>
            <line
              x1={leftEye.cx - 3}
              y1={leftEye.cy}
              x2={leftEye.cx + 3}
              y2={leftEye.cy}
              stroke="#2c1810"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <line
              x1={rightEye.cx - 3}
              y1={rightEye.cy}
              x2={rightEye.cx + 3}
              y2={rightEye.cy}
              stroke="#2c1810"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </>
        );

      case 'happy':
      case 'excited':
      case 'celebrating':
        // Happy eyes - curved upward (^_^)
        return (
          <>
            <path
              d={`M ${leftEye.cx - 3} ${leftEye.cy} Q ${leftEye.cx} ${leftEye.cy - 3} ${leftEye.cx + 3} ${leftEye.cy}`}
              stroke="#2c1810"
              strokeWidth="2"
              fill="none"
              strokeLinecap="round"
            />
            <path
              d={`M ${rightEye.cx - 3} ${rightEye.cy} Q ${rightEye.cx} ${rightEye.cy - 3} ${rightEye.cx + 3} ${rightEye.cy}`}
              stroke="#2c1810"
              strokeWidth="2"
              fill="none"
              strokeLinecap="round"
            />
          </>
        );

      case 'concerned':
        // Concerned eyes - round with worried eyebrows
        return (
          <>
            <circle cx={leftEye.cx} cy={leftEye.cy} r="2.5" fill="#2c1810" />
            <circle cx={rightEye.cx} cy={rightEye.cy} r="2.5" fill="#2c1810" />
            {/* Eyebrows showing concern */}
            <path
              d={`M ${leftEye.cx - 3} ${leftEye.cy - 5} L ${leftEye.cx + 3} ${leftEye.cy - 7}`}
              stroke="#2c1810"
              strokeWidth="1.5"
              fill="none"
              strokeLinecap="round"
            />
            <path
              d={`M ${rightEye.cx + 3} ${rightEye.cy - 5} L ${rightEye.cx - 3} ${rightEye.cy - 7}`}
              stroke="#2c1810"
              strokeWidth="1.5"
              fill="none"
              strokeLinecap="round"
            />
            {/* Eye shine */}
            <circle cx={leftEye.cx - 0.5} cy={leftEye.cy - 0.5} r="0.8" fill="rgba(255, 255, 255, 0.8)" />
            <circle cx={rightEye.cx - 0.5} cy={rightEye.cy - 0.5} r="0.8" fill="rgba(255, 255, 255, 0.8)" />
          </>
        );

      default:
        // Normal eyes - circles with shine
        return (
          <>
            <circle cx={leftEye.cx} cy={leftEye.cy} r="2.5" fill="#2c1810" />
            <circle cx={rightEye.cx} cy={rightEye.cy} r="2.5" fill="#2c1810" />
            {/* Eye shine for life */}
            <circle cx={leftEye.cx - 0.5} cy={leftEye.cy - 0.5} r="0.8" fill="rgba(255, 255, 255, 0.8)" />
            <circle cx={rightEye.cx - 0.5} cy={rightEye.cy - 0.5} r="0.8" fill="rgba(255, 255, 255, 0.8)" />
          </>
        );
    }
  };

  return (
    <g className={`ellie-eyes ${className}`}>
      {renderEyes()}
    </g>
  );
};
