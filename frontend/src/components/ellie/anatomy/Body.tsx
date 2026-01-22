import React from 'react';
import type { BodyPartProps } from '../types/ellie.types';
import { ELLIE_COORDINATES, FUR_ACCENT_COLOR, FUR_SHADOW_COLOR } from '../constants';

export const Body = React.forwardRef<SVGGElement, BodyPartProps>(
  ({ furColor, furPattern = 'parti', accentColor = '#000000', className = '' }, ref) => {
    const { body } = ELLIE_COORDINATES;
    const showPartiPatches = furPattern === 'parti';

    // Actual body dimensions used in rendering
    const bodyRx = body.rx - 5;
    const bodyRy = body.ry + 3;

    return (
      <g className={`ellie-body ${className}`} ref={ref}>
        <defs>
          {/* Subtle body gradient - 3 stops for better depth */}
          <radialGradient id="bodyFurGradient" cx="50%" cy="40%">
            <stop offset="0%" stopColor={furColor} stopOpacity="1" />
            <stop offset="60%" stopColor={furColor} stopOpacity="1" />
            <stop offset="100%" stopColor={FUR_SHADOW_COLOR} stopOpacity="1" />
          </radialGradient>

          {/* Clip path for body to constrain saddle marking */}
          <clipPath id="bodyClip">
            <ellipse cx={body.cx} cy={body.cy} rx={bodyRx} ry={bodyRy} />
          </clipPath>
        </defs>

        {/* Main body with subtle gradient - narrow oval shape (white base) */}
        <ellipse
          cx={body.cx}
          cy={body.cy}
          rx={bodyRx}
          ry={bodyRy}
          fill="url(#bodyFurGradient)"
        />

        {/* Parti pattern - black saddle on back, clipped to body */}
        {showPartiPatches && (
          <g className="ellie-parti-body-patches" clipPath="url(#bodyClip)">
            {/* Black saddle - covers the upper back area */}
            <ellipse
              cx={body.cx}
              cy={body.cy - 6}
              rx={bodyRx - 2}
              ry={bodyRy - 6}
              fill={accentColor}
              opacity={0.95}
            />
            {/* White chest/belly shows through as base - no additional shapes needed */}
          </g>
        )}

        {/* Subtle chest highlight for dimension (on white belly area) */}
        <ellipse
          cx={body.cx}
          cy={body.cy + 8}
          rx={10}
          ry={6}
          fill={FUR_ACCENT_COLOR}
          opacity={0.08}
        />
      </g>
    );
  }
);

Body.displayName = 'Body';
