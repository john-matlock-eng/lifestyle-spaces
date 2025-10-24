import React from 'react';
import { ELLIE_COORDINATES } from '../constants/coordinates';

export interface LeatherCollarProps {
  color: string;
  showTag?: boolean;
  className?: string;
}

export const LeatherCollar: React.FC<LeatherCollarProps> = ({ color, showTag = false, className = '' }) => {
  const { collar } = ELLIE_COORDINATES;

  return (
    <g className={`ellie-collar leather ${className}`}>
      {/* Leather collar band */}
      <rect
        x={collar.x}
        y={collar.y}
        width={collar.width}
        height={collar.height}
        rx={collar.rx}
        fill={color}
        stroke="rgba(0, 0, 0, 0.6)"
        strokeWidth="1"
      />

      {/* Leather texture highlight */}
      <rect
        x={collar.x + 1}
        y={collar.y + 1}
        width={collar.width - 2}
        height={2}
        rx={1}
        fill="rgba(255, 255, 255, 0.4)"
      />

      {/* Buckle */}
      <rect
        x={collar.x + collar.width - 6}
        y={collar.y + 1}
        width={4}
        height={collar.height - 2}
        rx="0.5"
        fill="#C0C0C0"
        stroke="#666"
        strokeWidth="0.6"
      />

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
