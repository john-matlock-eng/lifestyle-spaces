import React from 'react';
import { ModularEnhancedShihTzu } from './ModularEnhancedShihTzu';
import { EllieControlPanel } from './EllieControlPanel';
import { useEllie } from '../../contexts/EllieContext';
import { useEllieCustomizationContext } from '../../hooks/useEllieCustomizationContext';
import './styles/ellie-perch.css';

export interface ElliePerchProps {
  showThoughtBubble?: boolean;
  thoughtText?: string;
  particleEffect?: 'hearts' | 'sparkles' | 'treats' | 'zzz' | null;
  variant?: 'default' | 'winter' | 'party' | 'workout' | 'balloon';
  size?: 'sm' | 'md' | 'lg';
  furColor?: string;
  furPattern?: 'solid' | 'parti';
  accentColor?: string;
  collarStyle?: 'none' | 'leather' | 'fabric' | 'bowtie' | 'bandana';
  collarColor?: string;
  collarTag?: boolean;
  showControlPanel?: boolean;
  showPerchControl?: boolean;
  onClick?: () => void;
  onPet?: () => void;
  onNoseBoop?: () => void;
}

export const ElliePerch: React.FC<ElliePerchProps> = ({
  showThoughtBubble = false,
  thoughtText = '',
  particleEffect = null,
  variant = 'default',
  size = 'md',
  furColor,
  furPattern,
  accentColor,
  collarStyle = 'none',
  collarColor = '#8B4513',
  collarTag = false,
  showControlPanel = false,
  showPerchControl = true,
  onClick,
  onPet,
  onNoseBoop,
}) => {
  const { mood, perchIndex, cyclePerch, isTyping } = useEllie();
  const { customization } = useEllieCustomizationContext();

  // Get effective values from context or props
  const petName = customization.petName ?? 'Lily';
  const effectiveFurPattern = furPattern ?? customization.furPattern ?? 'parti';
  const effectiveAccentColor = accentColor ?? customization.accentColor ?? '#000000';

  return (
    <div
      className={`ellie-perch perch-position-${perchIndex} ${isTyping ? 'is-typing' : ''}`}
      data-testid="ellie-perch"
      data-perch={perchIndex}
      data-typing={isTyping}
    >
      {showControlPanel && (
        <div className="ellie-perch__controls">
          <EllieControlPanel
            currentMode="companion"
            onModeChange={() => {}}
            opacity={1.0}
            onOpacityChange={() => {}}
            showOpacityControl={false}
            onMinimize={() => {}}
          />
        </div>
      )}

      {showPerchControl && (
        <button
          onClick={cyclePerch}
          className="ellie-perch__cycle-button"
          title={`Move ${petName} to different position`}
          aria-label={`Move ${petName}`}
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
            <path d="M4 8l4 4 4-4M16 12l-4-4-4 4" />
          </svg>
        </button>
      )}

      <ModularEnhancedShihTzu
        mood={mood}
        position={{ x: 0, y: 0 }}
        onPositionChange={undefined}
        onClick={onClick}
        onPet={onPet}
        onNoseBoop={onNoseBoop}
        size={size}
        showThoughtBubble={showThoughtBubble}
        thoughtText={thoughtText}
        particleEffect={particleEffect}
        variant={variant}
        furColor={furColor}
        furPattern={effectiveFurPattern}
        accentColor={effectiveAccentColor}
        collarStyle={collarStyle}
        collarColor={collarColor}
        collarTag={collarTag}
      />
    </div>
  );
};
