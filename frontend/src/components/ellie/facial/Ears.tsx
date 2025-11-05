import React from 'react';
import type { BodyPartProps } from '../types/ellie.types';
import { ELLIE_COORDINATES } from '../constants/coordinates';
import { ELLIE_TAN_PATCHES } from '../constants/defaults';

export const Ears: React.FC<BodyPartProps> = ({ furColor, mood, className = '' }) => {
  const { leftEar, rightEar } = ELLIE_COORDINATES.face;

  // Ear sway based on mood - subtle movements for droopy ears
  const getEarSway = () => {
    switch(mood) {
      case 'curious':
        return { left: -2, right: 2 };    // Slight forward lean
      case 'concerned':
        return { left: -5, right: 5 };    // More droopy/back
      case 'excited':
      case 'happy':
        return { left: -3, right: 3 };    // Slight bounce
      default:
        return { left: 0, right: 0 };     // Natural hang
    }
  };

  const sway = getEarSway();

  // Droopy Shih Tzu ear paths (hang down beside face)
  const leftEarPath = `
    M ${leftEar.cx} ${leftEar.cy}
    Q ${leftEar.cx - 4} ${leftEar.cy + 8}, ${leftEar.cx - 2} ${leftEar.cy + 18}
    Q ${leftEar.cx} ${leftEar.cy + 24}, ${leftEar.cx + 2} ${leftEar.cy + 18}
    Q ${leftEar.cx + 4} ${leftEar.cy + 8}, ${leftEar.cx} ${leftEar.cy}
  `;

  const leftEarInnerPath = `
    M ${leftEar.cx} ${leftEar.cy + 2}
    Q ${leftEar.cx - 2} ${leftEar.cy + 8}, ${leftEar.cx - 1} ${leftEar.cy + 16}
    Q ${leftEar.cx} ${leftEar.cy + 20}, ${leftEar.cx + 1} ${leftEar.cy + 16}
    Q ${leftEar.cx + 2} ${leftEar.cy + 8}, ${leftEar.cx} ${leftEar.cy + 2}
  `;

  const rightEarPath = `
    M ${rightEar.cx} ${rightEar.cy}
    Q ${rightEar.cx + 4} ${rightEar.cy + 8}, ${rightEar.cx + 2} ${rightEar.cy + 18}
    Q ${rightEar.cx} ${rightEar.cy + 24}, ${rightEar.cx - 2} ${rightEar.cy + 18}
    Q ${rightEar.cx - 4} ${rightEar.cy + 8}, ${rightEar.cx} ${rightEar.cy}
  `;

  const rightEarInnerPath = `
    M ${rightEar.cx} ${rightEar.cy + 2}
    Q ${rightEar.cx + 2} ${rightEar.cy + 8}, ${rightEar.cx + 1} ${rightEar.cy + 16}
    Q ${rightEar.cx} ${rightEar.cy + 20}, ${rightEar.cx - 1} ${rightEar.cy + 16}
    Q ${rightEar.cx - 2} ${rightEar.cy + 8}, ${rightEar.cx} ${rightEar.cy + 2}
  `;

  return (
    <g className={`ellie-ears ${className}`}>
      {/* Left ear - droopy floppy ear */}
      <path
        d={leftEarPath}
        fill={furColor}
        transform={`translate(${sway.left}, 0)`}
        className="ellie-ear-left"
      />
      {/* Left ear inner (tan patches) */}
      <path
        d={leftEarInnerPath}
        fill={ELLIE_TAN_PATCHES}
        opacity="0.7"
        transform={`translate(${sway.left}, 0)`}
      />

      {/* Right ear - droopy floppy ear */}
      <path
        d={rightEarPath}
        fill={furColor}
        transform={`translate(${sway.right}, 0)`}
        className="ellie-ear-right"
      />
      {/* Right ear inner (tan patches) */}
      <path
        d={rightEarInnerPath}
        fill={ELLIE_TAN_PATCHES}
        opacity="0.7"
        transform={`translate(${sway.right}, 0)`}
      />
    </g>
  );
};
