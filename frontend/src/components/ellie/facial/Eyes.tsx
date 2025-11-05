import React from 'react';
import type { FacialFeatureProps } from '../types/ellie.types';
import { ELLIE_COORDINATES } from '../constants/coordinates';
import { ELLIE_DARK_EYES } from '../constants/defaults';

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
              stroke={ELLIE_DARK_EYES}
              strokeWidth="2"
              strokeLinecap="round"
            />
            <line
              x1={rightEye.cx - 3}
              y1={rightEye.cy}
              x2={rightEye.cx + 3}
              y2={rightEye.cy}
              stroke={ELLIE_DARK_EYES}
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
              stroke={ELLIE_DARK_EYES}
              strokeWidth="2"
              fill="none"
              strokeLinecap="round"
            />
            <path
              d={`M ${rightEye.cx - 3} ${rightEye.cy} Q ${rightEye.cx} ${rightEye.cy - 3} ${rightEye.cx + 3} ${rightEye.cy}`}
              stroke={ELLIE_DARK_EYES}
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
            <circle cx={leftEye.cx} cy={leftEye.cy} r="2.5" fill={ELLIE_DARK_EYES} />
            <circle cx={rightEye.cx} cy={rightEye.cy} r="2.5" fill={ELLIE_DARK_EYES} />
            {/* Eyebrows showing concern */}
            <path
              d={`M ${leftEye.cx - 3} ${leftEye.cy - 5} L ${leftEye.cx + 3} ${leftEye.cy - 7}`}
              stroke={ELLIE_DARK_EYES}
              strokeWidth="1.5"
              fill="none"
              strokeLinecap="round"
            />
            <path
              d={`M ${rightEye.cx + 3} ${rightEye.cy - 5} L ${rightEye.cx - 3} ${rightEye.cy - 7}`}
              stroke={ELLIE_DARK_EYES}
              strokeWidth="1.5"
              fill="none"
              strokeLinecap="round"
            />
            {/* Prominent eye shine for expressiveness */}
            <circle cx={leftEye.cx - 0.5} cy={leftEye.cy - 0.5} r="1" fill="rgba(255, 255, 255, 0.9)" />
            <circle cx={rightEye.cx - 0.5} cy={rightEye.cy - 0.5} r="1" fill="rgba(255, 255, 255, 0.9)" />
          </>
        );

      default:
        // Normal eyes - circles with prominent shine
        return (
          <>
            <circle cx={leftEye.cx} cy={leftEye.cy} r="2.5" fill={ELLIE_DARK_EYES} />
            <circle cx={rightEye.cx} cy={rightEye.cy} r="2.5" fill={ELLIE_DARK_EYES} />
            {/* Prominent eye shine for expressiveness */}
            <circle cx={leftEye.cx - 0.5} cy={leftEye.cy - 0.5} r="1" fill="rgba(255, 255, 255, 0.9)" />
            <circle cx={rightEye.cx - 0.5} cy={rightEye.cy - 0.5} r="1" fill="rgba(255, 255, 255, 0.9)" />
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
