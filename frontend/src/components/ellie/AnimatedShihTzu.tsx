import React from 'react';
import type { Mood } from '../../hooks/useShihTzuCompanion';

interface AnimatedShihTzuProps {
  mood: Mood;
  size?: number;
}

export function AnimatedShihTzu({ mood, size = 100 }: AnimatedShihTzuProps) {
  const getMoodEmoji = () => {
    switch (mood) {
      case 'happy': return '😊';
      case 'excited': return '🤩';
      case 'curious': return '🤔';
      case 'playful': return '😄';
      case 'sleeping': return '😴';
      case 'walking': return '🚶';
      case 'concerned': return '😟';
      case 'proud': return '😌';
      case 'zen': return '🧘';
      case 'celebrating': return '🎉';
      default: return '🐕';
    }
  };

  const getMoodAnimation = () => {
    switch (mood) {
      case 'celebrating':
        return 'ellie-bounce';
      case 'excited':
      case 'playful':
        return 'ellie-pulse';
      case 'walking':
        return 'ellie-bounce-slow';
      case 'sleeping':
        return 'ellie-pulse-slow';
      default:
        return '';
    }
  };

  return (
    <div
      className={`relative ${getMoodAnimation()}`}
      style={{ width: size, height: size }}
    >
      {/* Simple SVG representation of Ellie */}
      <svg
        viewBox="0 0 200 200"
        className="w-full h-full"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Body */}
        <ellipse
          cx="100"
          cy="140"
          rx="45"
          ry="35"
          fill="#F4E4C1"
          stroke="#D4A574"
          strokeWidth="2"
        />

        {/* Head */}
        <circle
          cx="100"
          cy="80"
          r="40"
          fill="#F4E4C1"
          stroke="#D4A574"
          strokeWidth="2"
        />

        {/* Ears */}
        <ellipse
          cx="70"
          cy="70"
          rx="15"
          ry="25"
          fill="#D4A574"
          transform="rotate(-30 70 70)"
        />
        <ellipse
          cx="130"
          cy="70"
          rx="15"
          ry="25"
          fill="#D4A574"
          transform="rotate(30 130 70)"
        />

        {/* Eyes */}
        <circle cx="85" cy="75" r="8" fill="#333" />
        <circle cx="115" cy="75" r="8" fill="#333" />
        <circle cx="87" cy="73" r="3" fill="#fff" />
        <circle cx="117" cy="73" r="3" fill="#fff" />

        {/* Nose */}
        <ellipse cx="100" cy="90" rx="6" ry="4" fill="#333" />

        {/* Mouth/Expression based on mood */}
        {mood === 'happy' || mood === 'celebrating' ? (
          <path
            d="M 85 95 Q 100 105 115 95"
            stroke="#333"
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
          />
        ) : mood === 'concerned' ? (
          <path
            d="M 85 100 Q 100 95 115 100"
            stroke="#333"
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
          />
        ) : (
          <line
            x1="90"
            y1="98"
            x2="110"
            y2="98"
            stroke="#333"
            strokeWidth="2"
            strokeLinecap="round"
          />
        )}

        {/* Tail */}
        <ellipse
          cx="145"
          cy="140"
          rx="20"
          ry="8"
          fill="#D4A574"
          transform={mood === 'excited' || mood === 'happy' ? "rotate(-20 145 140)" : "rotate(0 145 140)"}
          className={mood === 'excited' || mood === 'happy' ? 'ellie-wag' : ''}
        />

        {/* Paws */}
        <ellipse cx="75" cy="165" rx="12" ry="8" fill="#D4A574" />
        <ellipse cx="125" cy="165" rx="12" ry="8" fill="#D4A574" />
      </svg>

      {/* Mood indicator */}
      <div className="absolute -top-2 -right-2 text-2xl">
        {getMoodEmoji()}
      </div>
    </div>
  );
}
