import React from 'react';

export interface VariantDecorationsProps {
  variant?: 'default' | 'winter' | 'party' | 'workout' | 'balloon';
  className?: string;
}

export const VariantDecorations: React.FC<VariantDecorationsProps> = ({
  variant = 'default',
  className = ''
}) => {
  if (variant === 'default' || !variant) {
    return null;
  }

  return (
    <g className={`ellie-variant-decorations variant-${variant} ${className}`}>
      {variant === 'balloon' && (
        <>
          {/* Balloon gradients */}
          <defs>
            <radialGradient id="balloonGradient1">
              <stop offset="0%" stopColor="#E879F9" />
              <stop offset="100%" stopColor="#9333EA" />
            </radialGradient>
            <radialGradient id="balloonGradient2">
              <stop offset="0%" stopColor="#5EEAD4" />
              <stop offset="100%" stopColor="#14B8A6" />
            </radialGradient>
          </defs>

          {/* Floating balloons */}
          <circle
            cx="15"
            cy="20"
            r="8"
            fill="url(#balloonGradient1)"
            opacity="0.8"
            className="animate-float-subtle"
          />
          <line
            x1="15"
            y1="28"
            x2="18"
            y2="40"
            stroke="#9333EA"
            strokeWidth="0.5"
          />

          <circle
            cx="85"
            cy="15"
            r="6"
            fill="url(#balloonGradient2)"
            opacity="0.8"
            className="animate-float-subtle"
            style={{ animationDelay: '1s' }}
          />
          <line
            x1="85"
            y1="21"
            x2="82"
            y2="30"
            stroke="#14B8A6"
            strokeWidth="0.5"
          />

          <circle
            cx="75"
            cy="35"
            r="5"
            fill="#EC4899"
            opacity="0.7"
            className="animate-float-subtle"
            style={{ animationDelay: '2s' }}
          />
          <line
            x1="75"
            y1="40"
            x2="73"
            y2="48"
            stroke="#BE185D"
            strokeWidth="0.5"
          />
        </>
      )}

      {variant === 'party' && (
        <>
          {/* Confetti sparkles */}
          <text x="15" y="25" className="animate-sparkle" fontSize="10">
            ✨
          </text>
          <text x="85" y="30" className="animate-sparkle" fontSize="10" style={{ animationDelay: '0.5s' }}>
            ✨
          </text>
          <text x="70" y="15" className="animate-sparkle" fontSize="8" style={{ animationDelay: '1s' }}>
            🎉
          </text>
        </>
      )}

      {variant === 'winter' && (
        <>
          {/* Snowflakes */}
          <text x="20" y="20" className="animate-float-subtle" fontSize="12">
            ❄️
          </text>
          <text x="80" y="25" className="animate-float-subtle" fontSize="10" style={{ animationDelay: '1s' }}>
            ❄️
          </text>
          <text x="65" y="15" className="animate-float-subtle" fontSize="8" style={{ animationDelay: '2s' }}>
            ❄️
          </text>
        </>
      )}

      {variant === 'workout' && (
        <>
          {/* Energy symbols */}
          <text x="15" y="30" className="animate-bounce-subtle" fontSize="12">
            💪
          </text>
          <text x="80" y="25" className="animate-bounce-subtle" fontSize="10" style={{ animationDelay: '0.5s' }}>
            ⚡
          </text>
        </>
      )}
    </g>
  );
};
