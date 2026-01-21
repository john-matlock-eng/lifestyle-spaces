import React from 'react';
import type { BodyPartProps } from '../types/ellie.types';
import { ELLIE_COORDINATES, FUR_ACCENT_COLOR, FUR_SHADOW_COLOR } from '../constants';

export const Body = React.forwardRef<SVGGElement, BodyPartProps>(
  ({ furColor, furPattern = 'parti', accentColor = '#000000', className = '' }, ref) => {
    const { body } = ELLIE_COORDINATES;
    const showPartiPatches = furPattern === 'parti';

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

        {/* Parti pattern body patches (black spots on back/sides) */}
        {showPartiPatches && (
          <g className="ellie-parti-body-patches">
            {/* Back patch - larger spot on upper back */}
            <ellipse
              cx={body.cx + 8}
              cy={body.cy - 8}
              rx={12}
              ry={10}
              fill={accentColor}
              opacity={0.85}
              transform="rotate(-15 ${body.cx + 8} ${body.cy - 8})"
            />
            {/* Side patch - smaller spot */}
            <ellipse
              cx={body.cx - 10}
              cy={body.cy + 5}
              rx={8}
              ry={6}
              fill={accentColor}
              opacity={0.8}
              transform="rotate(20 ${body.cx - 10} ${body.cy + 5})"
            />
          </g>
        )}

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
