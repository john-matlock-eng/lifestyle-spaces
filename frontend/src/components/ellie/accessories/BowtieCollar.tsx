import React from 'react';
import { ELLIE_COORDINATES } from '../constants/coordinates';

export interface BowtieCollarProps {
  color: string;
  showTag?: boolean;
  className?: string;
}

export const BowtieCollar: React.FC<BowtieCollarProps> = ({ color, showTag = false, className = '' }) => {
  const { collar } = ELLIE_COORDINATES;
  const centerX = collar.x + collar.width / 2;
  const centerY = collar.y + collar.height / 2;

  return (
    <g className={`ellie-collar bowtie ${className}`}>
      {/* Thin collar band */}
      <rect
        x={collar.x}
        y={collar.y}
        width={collar.width}
        height={collar.height}
        rx={collar.rx}
        fill="#2c1810"
        stroke="rgba(0, 0, 0, 0.3)"
        strokeWidth="0.3"
      />

      {/* Bowtie centered on collar */}
      <g transform={`translate(${centerX}, ${centerY})`}>
        {/* Left bow */}
        <path
          d="M -8 -4 L -2 0 L -8 4 L -8 -4"
          fill={color}
          stroke="rgba(0, 0, 0, 0.3)"
          strokeWidth="0.5"
        />
        {/* Right bow */}
        <path
          d="M 2 0 L 8 -4 L 8 4 L 2 0"
          fill={color}
          stroke="rgba(0, 0, 0, 0.3)"
          strokeWidth="0.5"
        />
        {/* Center knot */}
        <rect
          x="-2"
          y="-2"
          width="4"
          height="4"
          rx="0.5"
          fill={color}
          stroke="rgba(0, 0, 0, 0.4)"
          strokeWidth="0.5"
        />
      </g>

      {/* Name tag */}
      {showTag && (
        <g className="name-tag">
          <circle
            cx={centerX}
            cy={collar.y + collar.height + 2}
            r="3"
            fill="#FFD700"
            stroke="#B8860B"
            strokeWidth="0.3"
          />
          <text
            x={centerX}
            y={collar.y + collar.height + 3.5}
            fontSize="2.5"
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
