import React, { useState, useCallback, useRef, useEffect } from 'react';
import type { EllieProps } from './types/ellie.types';
import { Head } from './anatomy/Head';
import { Body } from './anatomy/Body';
import { Neck } from './anatomy/Neck';
import { Legs } from './anatomy/Legs';
import { Tail } from './anatomy/Tail';
import { Collar } from './accessories/Collar';
import { VariantDecorations } from './accessories/VariantDecorations';
import { useEllieMood } from './hooks/useEllieMood';
import { useEllieAnimation } from './hooks/useEllieAnimation';
import { ELLIE_SIZES, VIEWBOX, DEFAULT_COLLAR_STYLE, DEFAULT_COLLAR_COLOR, ELLIE_COORDINATES } from './constants';
import { getVariantColors, getEffectiveFurColor } from './utils/variants';
import './styles';

export const ModularEnhancedShihTzu: React.FC<EllieProps> = ({
  mood: propMood = 'idle',
  position: _position = { x: 0, y: 0 },
  size = 'md',
  furColor,
  collarStyle = DEFAULT_COLLAR_STYLE,
  collarColor = DEFAULT_COLLAR_COLOR,
  collarTag = false,
  variant = 'default',
  showThoughtBubble = false,
  thoughtText = '',
  particleEffect: propParticleEffect = null,
  onPositionChange,
  onClick,
  onPet,
  onNoseBoop,
}) => {
  // Hooks
  const { mood, setMood } = useEllieMood({ initialMood: propMood });
  const { particles, particleEffect, celebrate } = useEllieAnimation();

  // State
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync mood with prop
  useEffect(() => {
    if (propMood !== mood) {
      setMood(propMood);
    }
  }, [propMood, mood, setMood]);

  // Sync particle effect with prop
  useEffect(() => {
    if (propParticleEffect && propParticleEffect !== particleEffect) {
      celebrate(propParticleEffect);
    }
  }, [propParticleEffect, particleEffect, celebrate]);

  // Get variant colors
  const variantColors = getVariantColors(variant);

  // Determine fur color (furColor prop takes precedence over variant)
  const effectiveFurColor = getEffectiveFurColor(furColor, variant);

  // Size config
  const sizeConfig = ELLIE_SIZES[size];

  // Handlers
  const handleNoseBoop = useCallback(() => {
    celebrate('hearts');
    if (onNoseBoop) {
      onNoseBoop();
    }
  }, [celebrate, onNoseBoop]);

  const handleClick = useCallback(() => {
    if (onClick) {
      onClick();
    }
  }, [onClick]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!onPositionChange) return;

    setIsDragging(true);
    const rect = containerRef.current?.getBoundingClientRect();
    if (rect) {
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
    }
  }, [onPositionChange]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging || !onPositionChange) return;

    const newX = e.clientX - dragOffset.x;
    const newY = e.clientY - dragOffset.y;
    onPositionChange({ x: newX, y: newY });
  }, [isDragging, dragOffset, onPositionChange]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Pet handler
  const handlePet = useCallback(() => {
    celebrate('hearts');
    if (onPet) {
      onPet();
    }
  }, [celebrate, onPet]);

  // Effect for drag listeners
  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // Particle emoji mapping
  const getParticleEmoji = (effect: typeof particleEffect) => {
    switch (effect) {
      case 'hearts': return '❤️';
      case 'sparkles': return '✨';
      case 'treats': return '🦴';
      case 'zzz': return '💤';
      default: return '✨';
    }
  };

  return (
    <div
      ref={containerRef}
      className={`ellie-container ${onPositionChange ? 'draggable' : ''} ${isDragging ? 'dragging' : ''}`}
      style={{
        position: 'relative',
        width: sizeConfig.width,
        height: sizeConfig.height,
      }}
      onMouseDown={handleMouseDown}
      onClick={handleClick}
      onDoubleClick={handlePet}
    >
      {/* Thought bubble */}
      {showThoughtBubble && thoughtText && (
        <div className="thought-bubble animate-fade-in">
          <div className="thought-text">{thoughtText}</div>
        </div>
      )}

      {/* Particles */}
      {particles.map((particle) => (
        <div
          key={particle.id}
          className="particle"
          style={{
            left: `calc(50% + ${particle.x}px)`,
            top: `calc(50% + ${particle.y}px)`,
          }}
        >
          {getParticleEmoji(particleEffect)}
        </div>
      ))}

      {/* Main SVG */}
      <svg
        className={`ellie-svg ellie-mood mood-${mood} ellie-${size}`}
        viewBox={VIEWBOX}
        width={sizeConfig.width}
        height={sizeConfig.height}
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Gradient definition for fur based on variant */}
        <defs>
          <linearGradient id="ellie-fur-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={variantColors.primary} />
            <stop offset="100%" stopColor={variantColors.secondary} />
          </linearGradient>
        </defs>

        {/* Shadow */}
        <ellipse
          cx={ELLIE_COORDINATES.shadow.cx}
          cy={ELLIE_COORDINATES.shadow.cy}
          rx={ELLIE_COORDINATES.shadow.rx}
          ry={ELLIE_COORDINATES.shadow.ry}
          fill="rgba(0, 0, 0, 0.1)"
        />

        {/* Render in proper layering order - back to front */}

        {/* 1. Tail (furthest back) */}
        <Tail furColor={effectiveFurColor} mood={mood} />

        {/* 2. Legs */}
        <Legs furColor={effectiveFurColor} mood={mood} />

        {/* 3. Body */}
        <Body furColor={effectiveFurColor} mood={mood} />

        {/* 4. Neck */}
        <Neck furColor={effectiveFurColor} mood={mood} />

        {/* 5. Collar (on neck) */}
        {collarStyle !== 'none' && (
          <Collar
            style={collarStyle}
            color={collarColor}
            showTag={collarTag}
          />
        )}

        {/* 6. Head (with all facial features) */}
        <Head
          furColor={effectiveFurColor}
          mood={mood}
          onNoseBoop={handleNoseBoop}
        />

        {/* 7. Variant decorations (balloons, snowflakes, etc.) */}
        <VariantDecorations variant={variant} />
      </svg>
    </div>
  );
};

export default ModularEnhancedShihTzu;
