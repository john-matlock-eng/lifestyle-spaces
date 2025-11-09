import React from 'react';
import type { BodyPartProps } from '../types/ellie.types';
import { ELLIE_COORDINATES, FUR_ACCENT_COLOR, FUR_SHADOW_COLOR } from '../constants';

export const Body = React.forwardRef<SVGGElement, BodyPartProps>(
  ({ furColor, className = '' }, ref) => {
    const { body } = ELLIE_COORDINATES;

    return (
      <g className={`ellie-body ${className}`} ref={ref}>
        <defs>
          {/* Subtle body gradient - 3 stops for better depth */}
          <radialGradient id="bodyFurGradient" cx="50%" cy="40%">
            <stop offset="0%" stopColor={furColor} stopOpacity="1" />
            <stop offset="60%" stopColor={furColor} stopOpacity="1" />
            <stop offset="100%" stopColor={FUR_SHADOW_COLOR} stopOpacity="1" />
          </radialGradient>
        </defs>

        {/* Main body with subtle gradient - narrow oval shape */}
        <ellipse
          cx={body.cx}
          cy={body.cy}
          rx={body.rx - 5}
          ry={body.ry + 3}
          fill="url(#bodyFurGradient)"
        />

        {/* Subtle chest highlight for dimension */}
        <ellipse
          cx={body.cx}
          cy={body.cy + 5}
          rx={12}
          ry={8}
          fill={FUR_ACCENT_COLOR}
          opacity={0.05}
        />
      </g>
    );
  }
);

Body.displayName = 'Body';
