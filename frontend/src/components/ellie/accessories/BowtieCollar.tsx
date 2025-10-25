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
        stroke="rgba(0, 0, 0, 0.6)"
        strokeWidth="0.8"
      />

      {/* Bowtie centered on collar - proper bow loops */}
      <g transform={`translate(${centerX}, ${centerY})`}>
        {/* Left bow loop - rounded ellipse */}
        <ellipse
          cx="-5.5"
          cy="0"
          rx="4"
          ry="3"
          fill={color}
          stroke="rgba(0, 0, 0, 0.5)"
          strokeWidth="0.8"
        />

        {/* Right bow loop - rounded ellipse */}
        <ellipse
          cx="5.5"
          cy="0"
          rx="4"
          ry="3"
          fill={color}
          stroke="rgba(0, 0, 0, 0.5)"
          strokeWidth="0.8"
        />

        {/* Left bow inner fold detail */}
        <ellipse
          cx="-5.5"
          cy="0"
          rx="2"
          ry="1.5"
          fill="rgba(0, 0, 0, 0.15)"
        />

        {/* Right bow inner fold detail */}
        <ellipse
          cx="5.5"
          cy="0"
          rx="2"
          ry="1.5"
          fill="rgba(0, 0, 0, 0.15)"
        />

        {/* Center knot */}
        <rect
          x="-1.5"
          y="-2"
          width="3"
          height="4"
          rx="0.5"
          fill={color}
          stroke="rgba(0, 0, 0, 0.6)"
          strokeWidth="0.8"
        />

        {/* Center knot highlight */}
        <rect
          x="-0.8"
          y="-1.5"
          width="0.8"
          height="3"
          rx="0.2"
          fill="rgba(255, 255, 255, 0.2)"
        />
      </g>

      {/* Name tag */}
      {showTag && (
        <g className="name-tag">
          <circle
            cx={centerX}
            cy={collar.y + collar.height + 2}
            r="3.5"
            fill="#FFD700"
            stroke="#B8860B"
            strokeWidth="0.6"
          />
          <text
            x={centerX}
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
