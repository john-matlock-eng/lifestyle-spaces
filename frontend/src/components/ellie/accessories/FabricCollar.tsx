import React from 'react';

export interface FabricCollarProps {
  color: string;
  showTag?: boolean;
  className?: string;
}

export const FabricCollar: React.FC<FabricCollarProps> = ({ color, showTag = false, className = '' }) => {
  return (
    <g className={`ellie-collar fabric ${className}`}>
      {/* Fabric collar band - softer appearance */}
      <ellipse
        cx="50"
        cy="58"
        rx="14"
        ry="3.5"
        fill={color}
        stroke="rgba(0, 0, 0, 0.2)"
        strokeWidth="0.3"
      />

      {/* Fabric weave pattern */}
      <ellipse
        cx="50"
        cy="58"
        rx="14"
        ry="3.5"
        fill="url(#fabricPattern)"
        opacity="0.3"
      />

      {/* Pattern definition */}
      <defs>
        <pattern id="fabricPattern" width="2" height="2" patternUnits="userSpaceOnUse">
          <rect width="1" height="1" fill="rgba(255, 255, 255, 0.2)" />
          <rect x="1" y="1" width="1" height="1" fill="rgba(255, 255, 255, 0.2)" />
        </pattern>
      </defs>

      {/* Name tag */}
      {showTag && (
        <g className="name-tag">
          <path
            d="M 45 62 L 48 62 L 48 66 L 46.5 65 L 45 66 Z"
            fill="#FFD700"
            stroke="#B8860B"
            strokeWidth="0.3"
          />
          <text
            x="46.5"
            y="64.5"
            fontSize="2"
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
