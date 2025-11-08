import React from 'react';
import { ModularEnhancedShihTzu } from './ModularEnhancedShihTzu';
import { EllieControlPanel } from './EllieControlPanel';
import { useEllie } from '../../contexts/EllieContext';
import './styles/ellie-perch.css';

export interface ElliePerchProps {
  // Visual props
  showThoughtBubble?: boolean;
  thoughtText?: string;
  particleEffect?: 'hearts' | 'sparkles' | 'treats' | 'zzz' | null;
  variant?: 'default' | 'winter' | 'party' | 'workout' | 'balloon';
  size?: 'sm' | 'md' | 'lg';

  // Customization props
  furColor?: string;
  collarStyle?: 'none' | 'leather' | 'fabric' | 'bowtie' | 'bandana';
  collarColor?: string;
  collarTag?: boolean;

  // Control props
  showControlPanel?: boolean;
  showPerchControl?: boolean;

  // Interaction props
  onClick?: () => void;
  onPet?: () => void;
  onNoseBoop?: () => void;

  // Additional props
  className?: string;
}

/**
 * ElliePerch - Positions Ellie at a predefined safe perch location
 * Replaces SmartEllie and SimpleSmartEllie with a simpler, stable, mobile-first approach
 *
 * Features:
 * - Responsive perch positions (mobile vs desktop)
 * - Auto-hides when typing on mobile (keyboard awareness)
 * - Smooth transitions between perches
 */
export const ElliePerch: React.FC<ElliePerchProps> = ({
  showThoughtBubble = false,
  thoughtText = '',
  particleEffect = null,
  variant = 'default',
  size = 'md',
  furColor,
  collarStyle = 'none',
  collarColor = '#8B4513',
  collarTag = false,
  showControlPanel = true,
  showPerchControl = true,
  onClick,
  onPet,
  onNoseBoop,
  className = '',
}) => {
  const { mood, perchIndex, cyclePerch, isTyping } = useEllie();

  return (
    <div
      className={`ellie-perch perch-position-${perchIndex} ${isTyping ? 'is-typing' : ''} ${className}`}
      data-testid="ellie-perch"
      data-perch={perchIndex}
      data-typing={isTyping}
    >
      {/* Control Panel */}
      {showControlPanel && (
        <div className="ellie-perch__controls">
          <EllieControlPanel
            currentMode="companion"
            onModeChange={() => {}} // Mode is now just mood, no separate mode concept
            opacity={1.0}
            onOpacityChange={() => {}} // Removed opacity control
            showOpacityControl={false}
            onMinimize={() => {}} // Removed minimize functionality
          />
        </div>
      )}

      {/* Perch Cycle Control */}
      {showPerchControl && (
        <button
          onClick={cyclePerch}
          className="ellie-perch__cycle-button"
          title="Move Ellie to different position"
          aria-label="Move Ellie"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
            <path d="M4 8l4 4 4-4M16 12l-4-4-4 4" />
          </svg>
        </button>
      )}

      {/* Ellie Character */}
      <ModularEnhancedShihTzu
        mood={mood}
        position={{ x: 0, y: 0 }} // Position managed by CSS classes
        onPositionChange={undefined} // Dragging disabled in perch mode
        onClick={onClick}
        onPet={onPet}
        onNoseBoop={onNoseBoop}
        size={size}
        showThoughtBubble={showThoughtBubble}
        thoughtText={thoughtText}
        particleEffect={particleEffect}
        variant={variant}
        furColor={furColor}
        collarStyle={collarStyle}
        collarColor={collarColor}
        collarTag={collarTag}
      />
    </div>
  );
};
