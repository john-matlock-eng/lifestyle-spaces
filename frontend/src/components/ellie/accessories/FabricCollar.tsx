import React from 'react';
import { ELLIE_COORDINATES } from '../constants/coordinates';

export interface FabricCollarProps {
  color: string;
  showTag?: boolean;
  className?: string;
}

export const FabricCollar: React.FC<FabricCollarProps> = ({ color, showTag = false, className = '' }) => {
  const { collar } = ELLIE_COORDINATES;

  // Use royal blue if no color specified, otherwise use provided color
  const fabricColor = color || '#2B5AA3';

  return (
    <g className={`ellie-collar fabric ${className}`}>
      {/* Pattern definitions */}
      <defs>
        <pattern id="fabricPattern" width="3" height="3" patternUnits="userSpaceOnUse">
          <rect width="1.5" height="1.5" fill="rgba(255, 255, 255, 0.15)" />
          <rect x="1.5" y="1.5" width="1.5" height="1.5" fill="rgba(255, 255, 255, 0.15)" />
        </pattern>
      </defs>

      {/* Main fabric collar band */}
      <rect
        x={collar.x}
        y={collar.y}
        width={collar.width}
        height={collar.height}
        rx={collar.rx}
        fill={fabricColor}
        stroke="rgba(0, 0, 0, 0.4)"
        strokeWidth="1.5"
      />

      {/* Fabric weave pattern overlay */}
      <rect
        x={collar.x}
        y={collar.y}
        width={collar.width}
        height={collar.height}
        rx={collar.rx}
        fill="url(#fabricPattern)"
        opacity="0.6"
      />

      {/* Enhanced polka dot pattern - larger and more visible */}
      <circle cx={collar.x + 6} cy={collar.y + collar.height / 2} r="1.5" fill="#fff" opacity="0.8" />
      <circle cx={collar.x + 13} cy={collar.y + collar.height / 2} r="1.5" fill="#fff" opacity="0.8" />
      <circle cx={collar.x + 20} cy={collar.y + collar.height / 2} r="1.5" fill="#fff" opacity="0.8" />
      <circle cx={collar.x + 27} cy={collar.y + collar.height / 2} r="1.5" fill="#fff" opacity="0.8" />
      <circle cx={collar.x + 34} cy={collar.y + collar.height / 2} r="1.5" fill="#fff" opacity="0.8" />

      {/* Stitching detail along top and bottom edges */}
      <line
        x1={collar.x + 2}
        y1={collar.y + 1}
        x2={collar.x + collar.width - 2}
        y2={collar.y + 1}
        stroke="rgba(255, 255, 255, 0.4)"
        strokeWidth="0.4"
        strokeDasharray="2 2"
      />
      <line
        x1={collar.x + 2}
        y1={collar.y + collar.height - 1}
        x2={collar.x + collar.width - 2}
        y2={collar.y + collar.height - 1}
        stroke="rgba(255, 255, 255, 0.4)"
        strokeWidth="0.4"
        strokeDasharray="2 2"
      />

      {/* ID tag hanging from front-center - metallic silver circle with "E" */}
      <g className="id-tag">
        {/* Tag ring/attachment */}
        <circle
          cx={collar.x + collar.width / 2}
          cy={collar.y + collar.height}
          r="1.2"
          fill="none"
          stroke="#C0C0C0"
          strokeWidth="0.6"
        />
        {/* Main ID tag */}
        <circle
          cx={collar.x + collar.width / 2}
          cy={collar.y + collar.height + 4}
          r="3.5"
          fill="#C0C0C0"
          stroke="#888"
          strokeWidth="0.6"
        />
        {/* Inner circle detail */}
        <circle
          cx={collar.x + collar.width / 2}
          cy={collar.y + collar.height + 4}
          r="2.8"
          fill="none"
          stroke="#E8E8E8"
          strokeWidth="0.4"
        />
        {/* Engraved "E" */}
        <text
          x={collar.x + collar.width / 2}
          y={collar.y + collar.height + 5.8}
          fontSize="3.5"
          fill="#666"
          textAnchor="middle"
          fontWeight="bold"
          fontFamily="serif"
        >
          E
        </text>
      </g>

      {/* Optional name tag (in addition to ID tag) */}
      {showTag && (
        <g className="name-tag">
          <circle
            cx={collar.x + collar.width / 2}
            cy={collar.y + collar.height + 10}
            r="5"
            fill="#FFD700"
            stroke="#B8860B"
            strokeWidth="0.8"
          />
          <circle
            cx={collar.x + collar.width / 2}
            cy={collar.y + collar.height + 10}
            r="3.8"
            fill="none"
            stroke="#B8860B"
            strokeWidth="0.4"
          />
          <text
            x={collar.x + collar.width / 2}
            y={collar.y + collar.height + 12}
            fontSize="4"
            fill="#B8860B"
            textAnchor="middle"
            fontWeight="bold"
            fontFamily="serif"
          >
            E
          </text>
        </g>
      )}
    </g>
  );
};
