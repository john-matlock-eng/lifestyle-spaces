import React from 'react';

export interface LeatherCollarProps {
  color: string;
  showTag?: boolean;
  className?: string;
}

export const LeatherCollar: React.FC<LeatherCollarProps> = ({ color, showTag = false, className = '' }) => {
  return (
    <g className={`ellie-collar leather ${className}`}>
      {/* Leather collar band */}
      <ellipse
        cx="50"
        cy="58"
        rx="14"
        ry="4"
        fill={color}
        stroke="rgba(0, 0, 0, 0.3)"
        strokeWidth="0.5"
      />

      {/* Leather texture highlight */}
      <ellipse
        cx="50"
        cy="57"
        rx="13"
        ry="1.5"
        fill="rgba(255, 255, 255, 0.2)"
      />

      {/* Buckle */}
      <rect
        x="62"
        y="56"
        width="4"
        height="4"
        rx="0.5"
        fill="#C0C0C0"
        stroke="#888"
        strokeWidth="0.3"
      />

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
