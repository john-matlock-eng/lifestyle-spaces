import React from 'react';
import type { FacialFeatureProps } from '../types/ellie.types';
import { getEyePath } from '../utils/paths';

export const Eyes: React.FC<FacialFeatureProps> = ({ mood, className = '' }) => {
  return (
    <g className={`ellie-eyes ${className}`}>
      {/* Left eye */}
      <path
        d={getEyePath(mood, true)}
        fill={mood === 'sleeping' ? 'none' : '#2c1810'}
        stroke="#2c1810"
        strokeWidth={mood === 'sleeping' ? '1.5' : '0'}
        strokeLinecap="round"
      />

      {/* Right eye */}
      <path
        d={getEyePath(mood, false)}
        fill={mood === 'sleeping' ? 'none' : '#2c1810'}
        stroke="#2c1810"
        strokeWidth={mood === 'sleeping' ? '1.5' : '0'}
        strokeLinecap="round"
      />

      {/* Eye shine (only when not sleeping) */}
      {mood !== 'sleeping' && (
        <>
          <circle cx="41" cy="34" r="0.8" fill="rgba(255, 255, 255, 0.8)" />
          <circle cx="59" cy="34" r="0.8" fill="rgba(255, 255, 255, 0.8)" />
        </>
      )}
    </g>
  );
};
