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

const EDGE_SNAP_THRESHOLD = 50;
const MOMENTUM_DECAY = 0.95;

export const ModularEnhancedShihTzu: React.FC<EllieProps> = ({
  mood: propMood = 'idle',
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
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
  const [velocity, setVelocity] = useState({ x: 0, y: 0 });
  const [internalPosition, setInternalPosition] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const lastMousePosRef = useRef({ x: 0, y: 0 });
  const lastTimestampRef = useRef(0);
  const momentumFrameRef = useRef<number | null>(null);

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

  // Constrain position to viewport
  const constrainPosition = useCallback((pos: { x: number; y: number }) => {
    const margin = 20;
    const maxX = window.innerWidth - (containerRef.current?.offsetWidth || 100) - margin;
    const maxY = window.innerHeight - (containerRef.current?.offsetHeight || 100) - margin;

    return {
      x: Math.max(margin, Math.min(pos.x, maxX)),
      y: Math.max(margin, Math.min(pos.y, maxY)),
    };
  }, []);

  // Snap to edge if close enough
  const snapToEdge = useCallback((pos: { x: number; y: number }) => {
    const margin = 20;
    const width = containerRef.current?.offsetWidth || 100;
    const height = containerRef.current?.offsetHeight || 100;

    let snappedX = pos.x;
    let snappedY = pos.y;

    // Check left edge
    if (pos.x < EDGE_SNAP_THRESHOLD) {
      snappedX = margin;
    }
    // Check right edge
    else if (pos.x > window.innerWidth - width - EDGE_SNAP_THRESHOLD) {
      snappedX = window.innerWidth - width - margin;
    }

    // Check top edge
    if (pos.y < EDGE_SNAP_THRESHOLD) {
      snappedY = margin;
    }
    // Check bottom edge
    else if (pos.y > window.innerHeight - height - EDGE_SNAP_THRESHOLD) {
      snappedY = window.innerHeight - height - margin;
    }

    return { x: snappedX, y: snappedY };
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent | React.PointerEvent) => {
    if (!onPositionChange) return;

    e.preventDefault();
    setIsDragging(true);
    setVelocity({ x: 0, y: 0 });

    const rect = containerRef.current?.getBoundingClientRect();
    if (rect) {
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
    }

    lastMousePosRef.current = { x: e.clientX, y: e.clientY };
    lastTimestampRef.current = Date.now();

    // Cancel any ongoing momentum
    if (momentumFrameRef.current) {
      cancelAnimationFrame(momentumFrameRef.current);
      momentumFrameRef.current = null;
    }
  }, [onPositionChange]);

  const handleMouseMove = useCallback((e: MouseEvent | PointerEvent) => {
    if (!isDragging || !onPositionChange) return;

    const now = Date.now();
    const deltaTime = Math.max(1, now - lastTimestampRef.current);

    const deltaX = e.clientX - lastMousePosRef.current.x;
    const deltaY = e.clientY - lastMousePosRef.current.y;

    // Calculate velocity
    const newVelocity = {
      x: deltaX / deltaTime * 16, // Normalize to 60fps
      y: deltaY / deltaTime * 16,
    };
    setVelocity(newVelocity);

    const rawPosition = {
      x: e.clientX - dragOffset.x,
      y: e.clientY - dragOffset.y,
    };

    const constrainedPosition = constrainPosition(rawPosition);
    setInternalPosition(constrainedPosition);
    onPositionChange(constrainedPosition);

    lastMousePosRef.current = { x: e.clientX, y: e.clientY };
    lastTimestampRef.current = now;
  }, [isDragging, dragOffset, onPositionChange, constrainPosition]);

  const handleMouseUp = useCallback(() => {
    if (!isDragging || !onPositionChange) return;

    setIsDragging(false);

    // Apply momentum if velocity is significant
    const velocityMagnitude = Math.sqrt(velocity.x * velocity.x + velocity.y * velocity.y);
    if (velocityMagnitude > 0.5) {
      let currentVelocity = { ...velocity };
      let currentPosition = { ...internalPosition };

      const applyMomentum = () => {
        currentVelocity.x *= MOMENTUM_DECAY;
        currentVelocity.y *= MOMENTUM_DECAY;

        currentPosition.x += currentVelocity.x;
        currentPosition.y += currentVelocity.y;

        const constrainedPosition = constrainPosition(currentPosition);
        setInternalPosition(constrainedPosition);
        onPositionChange(constrainedPosition);

        const newMagnitude = Math.sqrt(
          currentVelocity.x * currentVelocity.x + currentVelocity.y * currentVelocity.y
        );

        if (newMagnitude > 0.1) {
          momentumFrameRef.current = requestAnimationFrame(applyMomentum);
        } else {
          // Snap to edge when momentum ends
          const snappedPosition = snapToEdge(constrainedPosition);
          setInternalPosition(snappedPosition);
          onPositionChange(snappedPosition);
        }
      };

      momentumFrameRef.current = requestAnimationFrame(applyMomentum);
    } else {
      // No significant momentum, just snap to edge
      const snappedPosition = snapToEdge(internalPosition);
      setInternalPosition(snappedPosition);
      onPositionChange(snappedPosition);
    }
  }, [isDragging, velocity, internalPosition, onPositionChange, constrainPosition, snapToEdge]);

  // Pet handler
  const handlePet = useCallback(() => {
    celebrate('hearts');
    if (onPet) {
      onPet();
    }
  }, [celebrate, onPet]);

  // Effect for drag listeners (using pointer events for better touch support)
  useEffect(() => {
    if (isDragging) {
      const handleMove = (e: Event) => handleMouseMove(e as PointerEvent);
      const handleUp = () => handleMouseUp();

      window.addEventListener('pointermove', handleMove);
      window.addEventListener('pointerup', handleUp);
      window.addEventListener('pointercancel', handleUp);

      return () => {
        window.removeEventListener('pointermove', handleMove);
        window.removeEventListener('pointerup', handleUp);
        window.removeEventListener('pointercancel', handleUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // Cleanup momentum animation on unmount
  useEffect(() => {
    return () => {
      if (momentumFrameRef.current) {
        cancelAnimationFrame(momentumFrameRef.current);
      }
    };
  }, []);

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
        opacity: isDragging ? 0.8 : 1,
        transform: isDragging ? 'scale(1.05)' : 'scale(1)',
        transition: isDragging ? 'none' : 'opacity 0.2s ease, transform 0.2s ease',
        cursor: onPositionChange ? (isDragging ? 'grabbing' : 'grab') : 'default',
        filter: isDragging ? 'drop-shadow(0 10px 20px rgba(0, 0, 0, 0.3))' : 'drop-shadow(0 4px 8px rgba(0, 0, 0, 0.1))',
        userSelect: 'none',
        touchAction: 'none', // Prevent default touch behaviors
      }}
      onPointerDown={handleMouseDown}
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
