import React from 'react';
import type { BodyPartProps } from '../types/ellie.types';
import { Nose, Mouth, Tongue, Eyes, Ears } from '../facial';
import { ELLIE_COORDINATES, FUR_ACCENT_COLOR, FUR_SHADOW_COLOR } from '../constants';

export interface HeadProps extends BodyPartProps {
  onNoseBoop?: () => void;
}

export const Head = React.forwardRef<SVGGElement, HeadProps>(
  ({ furColor, mood, onNoseBoop, className = '' }, ref) => {
    const { head, muzzle } = ELLIE_COORDINATES;

    return (
      <g className={`ellie-head ${className}`} ref={ref}>
        <defs>
          {/* Subtle head fur gradient - minimal 2 stops */}
          <radialGradient id="headFurGradient" cx="50%" cy="40%">
            <stop offset="0%" stopColor={furColor} stopOpacity="1" />
            <stop offset="100%" stopColor={FUR_SHADOW_COLOR} stopOpacity="0.95" />
          </radialGradient>

          {/* Subtle muzzle gradient */}
          <radialGradient id="muzzleGradient" cx="50%" cy="50%">
            <stop offset="30%" stopColor={FUR_ACCENT_COLOR} stopOpacity="0.9" />
            <stop offset="100%" stopColor={furColor} stopOpacity="1" />
          </radialGradient>
        </defs>

        {/* Ears (behind head) */}
        <Ears furColor={furColor} mood={mood} />

        {/* Main head circle with gradient */}
        <circle
          cx={head.cx}
          cy={head.cy}
          r={head.radius}
          fill="url(#headFurGradient)"
        />

        {/* Upper muzzle with gradient */}
        <ellipse
          cx={muzzle.upper.cx}
          cy={muzzle.upper.cy}
          rx={muzzle.upper.rx}
          ry={muzzle.upper.ry}
          fill="url(#muzzleGradient)"
        />

        {/* Lower muzzle */}
        <ellipse
          cx={muzzle.lower.cx}
          cy={muzzle.lower.cy}
          rx={muzzle.lower.rx}
          ry={muzzle.lower.ry}
          fill="url(#muzzleGradient)"
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
  }
);

Head.displayName = 'Head';
