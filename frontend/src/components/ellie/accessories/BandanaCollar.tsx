import React from 'react';

export interface BandanaCollarProps {
  color: string;
  className?: string;
}

export const BandanaCollar: React.FC<BandanaCollarProps> = ({ color, className = '' }) => {
  return (
    <g className={`ellie-collar bandana ${className}`}>
      {/* Bandana - triangular fold around neck */}
      <path
        d="M 36 58 Q 50 54 64 58 L 60 66 L 50 62 L 40 66 Z"
        fill={color}
        stroke="rgba(0, 0, 0, 0.2)"
        strokeWidth="0.3"
      />

      {/* Bandana fold highlight */}
      <path
        d="M 38 58 Q 50 55 62 58"
        fill="none"
        stroke="rgba(255, 255, 255, 0.3)"
        strokeWidth="1"
      />

      {/* Bandana pattern dots */}
      <circle cx="45" cy="60" r="0.8" fill="rgba(255, 255, 255, 0.4)" />
      <circle cx="50" cy="58" r="0.8" fill="rgba(255, 255, 255, 0.4)" />
      <circle cx="55" cy="60" r="0.8" fill="rgba(255, 255, 255, 0.4)" />
      <circle cx="48" cy="62" r="0.8" fill="rgba(255, 255, 255, 0.4)" />
      <circle cx="52" cy="62" r="0.8" fill="rgba(255, 255, 255, 0.4)" />
    </g>
  );
};
