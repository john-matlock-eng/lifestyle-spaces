import React from 'react';
import type { BodyPartProps } from '../types/ellie.types';
import { ELLIE_COORDINATES } from '../constants/coordinates';

export const Tail = React.forwardRef<SVGGElement, BodyPartProps>(
  ({ furColor, className = '' }, ref) => {
    const { tail } = ELLIE_COORDINATES;

    return (
      <g
        ref={ref}
        className={`ellie-tail ${className}`}
      >
        {/* Tail - ellipse attached at base (right edge at body) */}
        {/* Base stays fixed at transformOrigin, only tip wags */}
        {/* GSAP handles transformOrigin in animation code */}
        <ellipse
          cx={tail.cx}
          cy={tail.cy}
          rx={tail.rx}
          ry={tail.ry}
          fill={furColor}
          className="ellie-tail-inner"
        />
      </g>
    );
  }
);

Tail.displayName = 'Tail';
