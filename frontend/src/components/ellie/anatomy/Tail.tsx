import React from 'react';
import type { BodyPartProps } from '../types/ellie.types';
import { ELLIE_COORDINATES } from '../constants/coordinates';

export const Tail: React.FC<BodyPartProps> = ({ furColor, mood, className = '' }) => {
  const { body } = ELLIE_COORDINATES;

  // Tail position - starts at back of body, curves up and over
  const tailStartX = body.cx + body.rx - 5;
  const tailStartY = body.cy;

  // Tail wag animation based on mood
  const getTailAnimation = () => {
    switch(mood) {
      case 'happy':
      case 'excited':
      case 'celebrating':
        return { rotation: 0, wave: 'wag-fast' };  // Fast wagging
      case 'curious':
        return { rotation: 5, wave: 'wag-slow' };   // Gentle sway
      case 'concerned':
        return { rotation: -10, wave: 'none' };     // Lowered
      case 'sleeping':
        return { rotation: -5, wave: 'none' };      // Relaxed
      default:
        return { rotation: 0, wave: 'wag-slow' };   // Gentle movement
    }
  };

  const animation = getTailAnimation();

  return (
    <g
      className={`ellie-tail ${className} ${animation.wave !== 'none' ? `tail-${animation.wave}` : ''}`}
      transform={`rotate(${animation.rotation} ${tailStartX} ${tailStartY})`}
    >
      {/* Main tail - fluffy curve that goes up and over back */}
      <path
        d={`
          M ${tailStartX} ${tailStartY}
          C ${tailStartX + 3} ${tailStartY - 8},
            ${tailStartX + 8} ${tailStartY - 15},
            ${tailStartX + 10} ${tailStartY - 18}
          C ${tailStartX + 12} ${tailStartY - 20},
            ${tailStartX + 10} ${tailStartY - 22},
            ${tailStartX + 6} ${tailStartY - 20}
          C ${tailStartX + 2} ${tailStartY - 18},
            ${tailStartX - 2} ${tailStartY - 12},
            ${tailStartX - 3} ${tailStartY - 2}
        `}
        fill={furColor}
        stroke={furColor}
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Fluffy texture layers */}
      <ellipse
        cx={tailStartX + 8}
        cy={tailStartY - 16}
        rx="4"
        ry="5"
        fill={furColor}
        opacity="0.8"
      />
      <ellipse
        cx={tailStartX + 5}
        cy={tailStartY - 12}
        rx="3.5"
        ry="4.5"
        fill={furColor}
        opacity="0.7"
      />
      <ellipse
        cx={tailStartX + 2}
        cy={tailStartY - 7}
        rx="3"
        ry="4"
        fill={furColor}
        opacity="0.7"
      />

      {/* Highlight for fluffiness */}
      <ellipse
        cx={tailStartX + 7}
        cy={tailStartY - 15}
        rx="2"
        ry="3"
        fill="rgba(255, 255, 255, 0.2)"
      />
    </g>
  );
};
