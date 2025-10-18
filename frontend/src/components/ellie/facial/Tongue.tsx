import React from 'react';
import type { FacialFeatureProps } from '../types/ellie.types';
import { shouldShowTongue, getTonguePath, getTongueHighlightPath } from '../utils/paths';

export const Tongue: React.FC<FacialFeatureProps> = ({ mood, className = '' }) => {
  if (!shouldShowTongue(mood)) {
    return null;
  }

  const tonguePath = getTonguePath(mood);
  const highlightPath = getTongueHighlightPath(mood);

  if (!tonguePath) {
    return null;
  }

  return (
    <g className={`ellie-tongue ${className}`}>
      {/* Main tongue */}
      <path
        d={tonguePath}
        fill="#ff6b9d"
        stroke="#d63384"
        strokeWidth="0.5"
      />

      {/* Tongue highlight */}
      {highlightPath && (
        <path
          d={highlightPath}
          stroke="rgba(255, 255, 255, 0.4)"
          strokeWidth="1"
          fill="none"
          strokeLinecap="round"
        />
      )}
    </g>
  );
};
