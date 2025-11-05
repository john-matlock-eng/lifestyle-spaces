import React from 'react';
import type { BodyPartProps } from '../types/ellie.types';
import { Nose, Mouth, Tongue, Eyes, Ears } from '../facial';
import { ELLIE_COORDINATES } from '../constants/coordinates';
import { ELLIE_TAN_PATCHES } from '../constants/defaults';

export interface HeadProps extends BodyPartProps {
  onNoseBoop?: () => void;
}

export const Head: React.FC<HeadProps> = ({ furColor, mood, onNoseBoop, className = '' }) => {
  const { head, muzzle, face } = ELLIE_COORDINATES;
  const { leftEye, rightEye } = face;

  return (
    <g className={`ellie-head ${className}`}>
      {/* Ears (behind head) */}
      <Ears furColor={furColor} mood={mood} />

      {/* Main head circle */}
      <circle
        cx={head.cx}
        cy={head.cy}
        r={head.radius}
        fill={furColor}
      />

      {/* Tan patch on top of head (between ears) - Shih Tzu characteristic */}
      <ellipse
        cx={head.cx}
        cy={head.cy - 8}
        rx={8}
        ry={6}
        fill={ELLIE_TAN_PATCHES}
        opacity="0.6"
      />

      {/* Tan patches around eyes - Shih Tzu "mask" effect */}
      <ellipse
        cx={leftEye.cx}
        cy={leftEye.cy}
        rx={5}
        ry={4}
        fill={ELLIE_TAN_PATCHES}
        opacity="0.5"
      />
      <ellipse
        cx={rightEye.cx}
        cy={rightEye.cy}
        rx={5}
        ry={4}
        fill={ELLIE_TAN_PATCHES}
        opacity="0.5"
      />

      {/* Upper muzzle/snout area */}
      <ellipse
        cx={muzzle.upper.cx}
        cy={muzzle.upper.cy}
        rx={muzzle.upper.rx}
        ry={muzzle.upper.ry}
        fill={furColor}
      />

      {/* Lower muzzle/jaw */}
      <ellipse
        cx={muzzle.lower.cx}
        cy={muzzle.lower.cy}
        rx={muzzle.lower.rx}
        ry={muzzle.lower.ry}
        fill={furColor}
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
