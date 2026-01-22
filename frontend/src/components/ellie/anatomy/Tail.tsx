import React from 'react';
import type { BodyPartProps } from '../types/ellie.types';
import { ELLIE_COORDINATES } from '../constants/coordinates';

export const Tail = React.forwardRef<SVGGElement, BodyPartProps>(
  ({ furColor, furPattern = 'parti', accentColor = '#000000', className = '' }, ref) => {
    const { tail } = ELLIE_COORDINATES;
    const showPartiPatches = furPattern === 'parti';

    return (
      <g
        ref={ref}
        className={`ellie-tail ${className}`}
      >
        <defs>
          {/* Clip path for tail */}
          <clipPath id="tailClip">
            <ellipse
              cx={tail.cx}
              cy={tail.cy}
              rx={tail.rx}
              ry={tail.ry}
            />
          </clipPath>
        </defs>

        {/* Tail base - white for parti, otherwise furColor */}
        <ellipse
          cx={tail.cx}
          cy={tail.cy}
          rx={tail.rx}
          ry={tail.ry}
          fill={furColor}
          className="ellie-tail-inner"
        />

        {/* Parti pattern - black base with white tip */}
        {showPartiPatches && (
          <g clipPath="url(#tailClip)">
            {/* Black portion of tail (base/middle) */}
            <ellipse
              cx={tail.cx + 3}
              cy={tail.cy}
              rx={tail.rx - 3}
              ry={tail.ry + 1}
              fill={accentColor}
              opacity={0.95}
            />
            {/* White tip - left side of tail (the curled tip) */}
            <ellipse
              cx={tail.cx - 8}
              cy={tail.cy}
              rx={5}
              ry={tail.ry}
              fill={furColor}
            />
          </g>
        )}
      </g>
    );
  }
);

Tail.displayName = 'Tail';
