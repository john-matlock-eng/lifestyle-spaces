import React from 'react';
import { ELLIE_COORDINATES } from '../constants/coordinates';

export interface LeatherCollarProps {
  color: string;
  showTag?: boolean;
  className?: string;
}

export const LeatherCollar: React.FC<LeatherCollarProps> = ({ color, showTag = false, className = '' }) => {
  const { collar } = ELLIE_COORDINATES;

  // Use dark brown if no color specified, otherwise use provided color
  const leatherColor = color || '#3D2817';

  return (
    <g className={`ellie-collar leather ${className}`}>
      {/* Gradient definition for leather dimension */}
      <defs>
        <linearGradient id="leatherGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={leatherColor} stopOpacity="1" />
          <stop offset="10%" stopColor={leatherColor} stopOpacity="1" style={{ stopColor: `color-mix(in srgb, ${leatherColor} 90%, white 10%)` }} />
          <stop offset="100%" stopColor={leatherColor} stopOpacity="1" />
        </linearGradient>
      </defs>

      {/* Main leather collar band with gradient */}
      <rect
        x={collar.x}
        y={collar.y}
        width={collar.width}
        height={collar.height}
        rx={collar.rx}
        fill={leatherColor}
        stroke="rgba(0, 0, 0, 0.4)"
        strokeWidth="1.5"
      />

      {/* Leather texture highlight - more prominent */}
      <rect
        x={collar.x + 1}
        y={collar.y + 0.5}
        width={collar.width - 2}
        height={2.5}
        rx={1.5}
        fill="rgba(255, 255, 255, 0.3)"
      />

      {/* Metallic buckle - larger and more detailed */}
      <g className="buckle">
        {/* Buckle frame */}
        <rect
          x={collar.x + collar.width - 8}
          y={collar.y + 1}
          width={6}
          height={collar.height - 2}
          rx="0.8"
          fill="#C0C0C0"
          stroke="#666"
          strokeWidth="0.8"
        />
        {/* Buckle pin */}
        <line
          x1={collar.x + collar.width - 7}
          y1={collar.y + collar.height / 2}
          x2={collar.x + collar.width - 3}
          y2={collar.y + collar.height / 2}
          stroke="#888"
          strokeWidth="0.6"
        />
        {/* Buckle highlight */}
        <rect
          x={collar.x + collar.width - 7.5}
          y={collar.y + 1.5}
          width={2}
          height={collar.height - 3}
          rx="0.4"
          fill="rgba(255, 255, 255, 0.5)"
        />
      </g>

      {/* Stitching detail along edges */}
      <line
        x1={collar.x + 2}
        y1={collar.y + 1.5}
        x2={collar.x + collar.width - 10}
        y2={collar.y + 1.5}
        stroke="rgba(0, 0, 0, 0.3)"
        strokeWidth="0.3"
        strokeDasharray="1.5 1.5"
      />
      <line
        x1={collar.x + 2}
        y1={collar.y + collar.height - 1.5}
        x2={collar.x + collar.width - 10}
        y2={collar.y + collar.height - 1.5}
        stroke="rgba(0, 0, 0, 0.3)"
        strokeWidth="0.3"
        strokeDasharray="1.5 1.5"
      />

      {/* Name tag - larger and more prominent */}
      {showTag && (
        <g className="name-tag">
          <circle
            cx={collar.x + collar.width / 2}
            cy={collar.y + collar.height + 3.5}
            r="5"
            fill="#FFD700"
            stroke="#B8860B"
            strokeWidth="0.8"
          />
          <circle
            cx={collar.x + collar.width / 2}
            cy={collar.y + collar.height + 3.5}
            r="3.8"
            fill="none"
            stroke="#B8860B"
            strokeWidth="0.4"
          />
          <text
            x={collar.x + collar.width / 2}
            y={collar.y + collar.height + 5.5}
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
