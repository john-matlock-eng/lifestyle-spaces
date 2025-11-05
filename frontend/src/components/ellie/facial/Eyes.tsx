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
        // Happy eyes - ROUND but with happy eyebrows (not slits!)
        return (
          <>
            {/* Round eyes, not slits */}
            <circle cx={leftEye.cx} cy={leftEye.cy} r="3" fill={ELLIE_DARK_EYES} />
            <circle cx={rightEye.cx} cy={rightEye.cy} r="3" fill={ELLIE_DARK_EYES} />

            {/* Happy eyebrows - raised and curved */}
            <path
              d={`M ${leftEye.cx - 4} ${leftEye.cy - 5} Q ${leftEye.cx} ${leftEye.cy - 7} ${leftEye.cx + 4} ${leftEye.cy - 5}`}
              stroke={ELLIE_DARK_EYES}
              strokeWidth="1.5"
              fill="none"
              strokeLinecap="round"
            />
            <path
              d={`M ${rightEye.cx - 4} ${rightEye.cy - 5} Q ${rightEye.cx} ${rightEye.cy - 7} ${rightEye.cx + 4} ${rightEye.cy - 5}`}
              stroke={ELLIE_DARK_EYES}
              strokeWidth="1.5"
              fill="none"
              strokeLinecap="round"
            />

            {/* Eye shine - larger and brighter for happy expression */}
            <circle cx={leftEye.cx - 0.8} cy={leftEye.cy - 0.8} r="1.2" fill="rgba(255, 255, 255, 0.95)" />
            <circle cx={rightEye.cx - 0.8} cy={rightEye.cy - 0.8} r="1.2" fill="rgba(255, 255, 255, 0.95)" />
          </>
        );

      case 'concerned':
        // Concerned eyes - round with worried eyebrows
        return (
          <>
            <circle cx={leftEye.cx} cy={leftEye.cy} r="3" fill={ELLIE_DARK_EYES} />
            <circle cx={rightEye.cx} cy={rightEye.cy} r="3" fill={ELLIE_DARK_EYES} />

            {/* Worried eyebrows */}
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

            {/* Eye shine */}
            <circle cx={leftEye.cx - 0.8} cy={leftEye.cy - 0.8} r="1.0" fill="rgba(255, 255, 255, 0.9)" />
            <circle cx={rightEye.cx - 0.8} cy={rightEye.cy - 0.8} r="1.0" fill="rgba(255, 255, 255, 0.9)" />
          </>
        );

      case 'curious':
        // Curious eyes - slightly wider with raised brows
        return (
          <>
            <circle cx={leftEye.cx} cy={leftEye.cy} r="3.5" fill={ELLIE_DARK_EYES} />
            <circle cx={rightEye.cx} cy={rightEye.cy} r="3.5" fill={ELLIE_DARK_EYES} />

            {/* Curious raised eyebrows */}
            <path
              d={`M ${leftEye.cx - 4} ${leftEye.cy - 6} L ${leftEye.cx + 4} ${leftEye.cy - 6}`}
              stroke={ELLIE_DARK_EYES}
              strokeWidth="1.5"
              fill="none"
              strokeLinecap="round"
            />
            <path
              d={`M ${rightEye.cx - 4} ${rightEye.cy - 6} L ${rightEye.cx + 4} ${rightEye.cy - 6}`}
              stroke={ELLIE_DARK_EYES}
              strokeWidth="1.5"
              fill="none"
              strokeLinecap="round"
            />

            {/* Larger eye shine for wide-eyed look */}
            <circle cx={leftEye.cx - 1} cy={leftEye.cy - 1} r="1.3" fill="rgba(255, 255, 255, 0.95)" />
            <circle cx={rightEye.cx - 1} cy={rightEye.cy - 1} r="1.3" fill="rgba(255, 255, 255, 0.95)" />
          </>
        );

      default:
        // IDLE/DEFAULT - Normal round eyes with gentle expression
        return (
          <>
            {/* Main round eyes - slightly larger than before */}
            <circle cx={leftEye.cx} cy={leftEye.cy} r="3" fill={ELLIE_DARK_EYES} />
            <circle cx={rightEye.cx} cy={rightEye.cy} r="3" fill={ELLIE_DARK_EYES} />

            {/* Subtle eyebrows for gentle expression */}
            <path
              d={`M ${leftEye.cx - 3} ${leftEye.cy - 5} Q ${leftEye.cx} ${leftEye.cy - 5.5} ${leftEye.cx + 3} ${leftEye.cy - 5}`}
              stroke={ELLIE_DARK_EYES}
              strokeWidth="1"
              fill="none"
              strokeLinecap="round"
              opacity="0.6"
            />
            <path
              d={`M ${rightEye.cx - 3} ${rightEye.cy - 5} Q ${rightEye.cx} ${rightEye.cy - 5.5} ${rightEye.cx + 3} ${rightEye.cy - 5}`}
              stroke={ELLIE_DARK_EYES}
              strokeWidth="1"
              fill="none"
              strokeLinecap="round"
              opacity="0.6"
            />

            {/* Eye shine for life - prominent and bright */}
            <circle cx={leftEye.cx - 0.8} cy={leftEye.cy - 0.8} r="1.1" fill="rgba(255, 255, 255, 0.95)" />
            <circle cx={rightEye.cx - 0.8} cy={rightEye.cy - 0.8} r="1.1" fill="rgba(255, 255, 255, 0.95)" />
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
