import React from 'react';
import { ELLIE_COORDINATES } from '../constants/coordinates';

export interface FabricCollarProps {
  color: string;
  showTag?: boolean;
  className?: string;
}

export const FabricCollar: React.FC<FabricCollarProps> = ({ color, showTag = false, className = '' }) => {
  const { collar } = ELLIE_COORDINATES;

  return (
    <g className={`ellie-collar fabric ${className}`}>
      {/* Pattern definition */}
      <defs>
        <pattern id="fabricPattern" width="2" height="2" patternUnits="userSpaceOnUse">
          <rect width="1" height="1" fill="rgba(255, 255, 255, 0.4)" />
          <rect x="1" y="1" width="1" height="1" fill="rgba(255, 255, 255, 0.4)" />
        </pattern>
      </defs>

      {/* Fabric collar band - softer appearance */}
      <rect
        x={collar.x}
        y={collar.y}
        width={collar.width}
        height={collar.height}
        rx={collar.rx}
        fill={color}
        stroke="rgba(0, 0, 0, 0.5)"
        strokeWidth="0.8"
      />

      {/* Fabric weave pattern */}
      <rect
        x={collar.x}
        y={collar.y}
        width={collar.width}
        height={collar.height}
        rx={collar.rx}
        fill="url(#fabricPattern)"
        opacity="0.5"
      />

      {/* Polka dot pattern */}
      <circle cx={collar.x + 5} cy={collar.y + 3} r="1.2" fill="#fff" opacity="0.7" />
      <circle cx={collar.x + 12} cy={collar.y + 3} r="1.2" fill="#fff" opacity="0.7" />
      <circle cx={collar.x + 19} cy={collar.y + 3} r="1.2" fill="#fff" opacity="0.7" />

      {/* Name tag */}
      {showTag && (
        <g className="name-tag">
          <circle
            cx={collar.x + collar.width / 2}
            cy={collar.y + collar.height + 2}
            r="3.5"
            fill="#FFD700"
            stroke="#B8860B"
            strokeWidth="0.6"
          />
          <text
            x={collar.x + collar.width / 2}
            y={collar.y + collar.height + 3.5}
            fontSize="3"
            fill="#B8860B"
            textAnchor="middle"
            fontWeight="bold"
          >
            E
          </text>
        </g>
      )}
    </g>
  );
};
