import React from 'react';
import type { BodyPartProps } from '../types/ellie.types';
import { Nose, Mouth, Tongue, Eyes, Ears } from '../facial';

export interface HeadProps extends BodyPartProps {
  onNoseBoop?: () => void;
}

export const Head: React.FC<HeadProps> = ({ furColor, mood, onNoseBoop, className = '' }) => {
  return (
    <g className={`ellie-head ${className}`}>
      {/* Ears (behind head) */}
      <Ears furColor={furColor} mood={mood} />

      {/* Main head circle */}
      <circle
        cx="50"
        cy="30"
        r="20"
        fill={furColor}
        stroke="#8B7355"
        strokeWidth="0.5"
      />

      {/* Muzzle/snout area */}
      <ellipse
        cx="50"
        cy="38"
        rx="12"
        ry="10"
        fill={furColor}
        stroke="#8B7355"
        strokeWidth="0.5"
      />

      {/* Lower jaw */}
      <ellipse
        cx="50"
        cy="42"
        rx="10"
        ry="6"
        fill={furColor}
        stroke="#8B7355"
        strokeWidth="0.5"
      />

      {/* Eyes */}
      <Eyes mood={mood} />

      {/* Nose */}
      <Nose mood={mood} onClick={onNoseBoop} />

      {/* Mouth */}
      <Mouth mood={mood} />

      {/* Tongue (on top of everything) */}
      <Tongue mood={mood} />
    </g>
  );
};
