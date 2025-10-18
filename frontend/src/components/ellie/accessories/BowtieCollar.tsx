import React from 'react';

export interface BowtieCollarProps {
  color: string;
  showTag?: boolean;
  className?: string;
}

export const BowtieCollar: React.FC<BowtieCollarProps> = ({ color, showTag = false, className = '' }) => {
  return (
    <g className={`ellie-collar bowtie ${className}`}>
      {/* Thin collar band */}
      <ellipse
        cx="50"
        cy="58"
        rx="14"
        ry="2"
        fill="#2c1810"
        stroke="rgba(0, 0, 0, 0.3)"
        strokeWidth="0.3"
      />

      {/* Bowtie - left side */}
      <path
        d="M 42 58 L 38 55 L 38 61 Z"
        fill={color}
        stroke="rgba(0, 0, 0, 0.3)"
        strokeWidth="0.3"
      />

      {/* Bowtie - right side */}
      <path
        d="M 43 58 L 47 55 L 47 61 Z"
        fill={color}
        stroke="rgba(0, 0, 0, 0.3)"
        strokeWidth="0.3"
      />

      {/* Bowtie center knot */}
      <rect
        x="41"
        y="56.5"
        width="3"
        height="3"
        rx="0.5"
        fill={color}
        stroke="rgba(0, 0, 0, 0.4)"
        strokeWidth="0.3"
      />

      {/* Name tag */}
      {showTag && (
        <g className="name-tag">
          <path
            d="M 52 62 L 55 62 L 55 66 L 53.5 65 L 52 66 Z"
            fill="#FFD700"
            stroke="#B8860B"
            strokeWidth="0.3"
          />
          <text
            x="53.5"
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
