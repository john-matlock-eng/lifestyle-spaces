import React from 'react';
import type { FacialFeatureProps } from '../types/ellie.types';
import { ELLIE_COORDINATES, EYE_COLOR } from '../constants';

export const Eyes: React.FC<FacialFeatureProps> = ({ mood, className = '' }) => {
  const { leftEye, rightEye } = ELLIE_COORDINATES.face;

  const renderEyes = () => {
    switch(mood) {
      case 'sleeping':
        // Closed eyes - curved lines
        return (
          <>
            <path
              d={`M ${leftEye.cx - 4} ${leftEye.cy} Q ${leftEye.cx} ${leftEye.cy + 2} ${leftEye.cx + 4} ${leftEye.cy}`}
              stroke={EYE_COLOR}
              strokeWidth="2"
              fill="none"
              strokeLinecap="round"
            />
            <path
              d={`M ${rightEye.cx - 4} ${rightEye.cy} Q ${rightEye.cx} ${rightEye.cy + 2} ${rightEye.cx + 4} ${rightEye.cy}`}
              stroke={EYE_COLOR}
              strokeWidth="2"
              fill="none"
              strokeLinecap="round"
            />
          </>
        );

      case 'happy':
      case 'excited':
      case 'celebrating':
        // Happy eyes - larger, bright with big shine
        return (
          <>
            {/* Left eye */}
            <circle cx={leftEye.cx} cy={leftEye.cy} r="4" fill={EYE_COLOR} />
            <circle cx={leftEye.cx - 1} cy={leftEye.cy - 1} r="1.5" fill="rgba(255, 255, 255, 0.9)" />
            <circle cx={leftEye.cx + 1} cy={leftEye.cy + 1.5} r="0.8" fill="rgba(255, 255, 255, 0.5)" />

            {/* Right eye */}
            <circle cx={rightEye.cx} cy={rightEye.cy} r="4" fill={EYE_COLOR} />
            <circle cx={rightEye.cx - 1} cy={rightEye.cy - 1} r="1.5" fill="rgba(255, 255, 255, 0.9)" />
            <circle cx={rightEye.cx + 1} cy={rightEye.cy + 1.5} r="0.8" fill="rgba(255, 255, 255, 0.5)" />

            {/* Upper lids slightly curved */}
            <path
              d={`M ${leftEye.cx - 4} ${leftEye.cy - 3} Q ${leftEye.cx} ${leftEye.cy - 4} ${leftEye.cx + 4} ${leftEye.cy - 3}`}
              stroke={EYE_COLOR}
              strokeWidth="1"
              fill="none"
              opacity="0.3"
            />
            <path
              d={`M ${rightEye.cx - 4} ${rightEye.cy - 3} Q ${rightEye.cx} ${rightEye.cy - 4} ${rightEye.cx + 4} ${rightEye.cy - 3}`}
              stroke={EYE_COLOR}
              strokeWidth="1"
              fill="none"
              opacity="0.3"
            />
          </>
        );

      case 'concerned':
        // Concerned eyes - round with worried expression
        return (
          <>
            {/* Left eye */}
            <circle cx={leftEye.cx} cy={leftEye.cy} r="3.5" fill={EYE_COLOR} />
            <circle cx={leftEye.cx - 1} cy={leftEye.cy - 0.5} r="1.2" fill="rgba(255, 255, 255, 0.9)" />

            {/* Right eye */}
            <circle cx={rightEye.cx} cy={rightEye.cy} r="3.5" fill={EYE_COLOR} />
            <circle cx={rightEye.cx - 1} cy={rightEye.cy - 0.5} r="1.2" fill="rgba(255, 255, 255, 0.9)" />

            {/* Worried eyebrows */}
            <path
              d={`M ${leftEye.cx - 3} ${leftEye.cy - 6} L ${leftEye.cx + 3} ${leftEye.cy - 8}`}
              stroke={EYE_COLOR}
              strokeWidth="1.5"
              fill="none"
              strokeLinecap="round"
            />
            <path
              d={`M ${rightEye.cx + 3} ${rightEye.cy - 6} L ${rightEye.cx - 3} ${rightEye.cy - 8}`}
              stroke={EYE_COLOR}
              strokeWidth="1.5"
              fill="none"
              strokeLinecap="round"
            />
          </>
        );

      default:
        // Normal eyes - realistic with prominent shine
        return (
          <>
            {/* Left eye - larger, more expressive */}
            <circle cx={leftEye.cx} cy={leftEye.cy} r="3.5" fill={EYE_COLOR} />
            <circle cx={leftEye.cx - 1} cy={leftEye.cy - 1} r="1.3" fill="rgba(255, 255, 255, 0.95)" />
            <circle cx={leftEye.cx + 0.5} cy={leftEye.cy + 1.5} r="0.7" fill="rgba(255, 255, 255, 0.6)" />

            {/* Right eye - matching */}
            <circle cx={rightEye.cx} cy={rightEye.cy} r="3.5" fill={EYE_COLOR} />
            <circle cx={rightEye.cx - 1} cy={rightEye.cy - 1} r="1.3" fill="rgba(255, 255, 255, 0.95)" />
            <circle cx={rightEye.cx + 0.5} cy={rightEye.cy + 1.5} r="0.7" fill="rgba(255, 255, 255, 0.6)" />

            {/* Subtle eyelid definition */}
            <ellipse
              cx={leftEye.cx}
              cy={leftEye.cy - 3}
              rx="4"
              ry="1"
              fill="rgba(0, 0, 0, 0.1)"
            />
            <ellipse
              cx={rightEye.cx}
              cy={rightEye.cy - 3}
              rx="4"
              ry="1"
              fill="rgba(0, 0, 0, 0.1)"
            />
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
