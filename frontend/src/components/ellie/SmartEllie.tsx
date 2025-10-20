import React, { useCallback, useEffect } from 'react';
import { ModularEnhancedShihTzu } from './ModularEnhancedShihTzu';
import { EllieControlPanel } from './EllieControlPanel';
import { InteractionModeManager } from './modes/InteractionModes';
import { useElliePosition } from '../../contexts/useElliePosition';
import { useEllieSmartPosition } from '../../hooks/useEllieSmartPosition';
import type { EllieMode } from './modes/types';

export interface SmartEllieProps {
  mood?: 'idle' | 'happy' | 'excited' | 'curious' | 'playful' | 'sleeping' | 'walking' | 'concerned' | 'proud' | 'zen' | 'celebrating';
  onClick?: () => void;
  onPet?: () => void;
  size?: 'sm' | 'md' | 'lg';
  showThoughtBubble?: boolean;
  thoughtText?: string;
  particleEffect?: 'hearts' | 'sparkles' | 'treats' | 'zzz' | null;
  variant?: 'default' | 'winter' | 'party' | 'workout' | 'balloon';
  className?: string;
  tabIndex?: number;
  // Customization props
  furColor?: string;
  collarStyle?: 'none' | 'leather' | 'fabric' | 'bowtie' | 'bandana';
  collarColor?: string;
  collarTag?: boolean;
  // Smart positioning props
  enableSmartPositioning?: boolean;
  showControlPanel?: boolean;
}

/**
 * SmartEllie - Enhanced Ellie component with smart positioning, collision detection,
 * and interaction modes
 */
export const SmartEllie: React.FC<SmartEllieProps> = ({
  mood = 'idle',
  onClick,
  onPet,
  size = 'md',
  showThoughtBubble = false,
  thoughtText = '',
  particleEffect = null,
  variant = 'default',
  className,
  tabIndex,
  furColor,
  collarStyle = 'none',
  collarColor = '#8B4513',
  collarTag = false,
  enableSmartPositioning = true,
  showControlPanel = true,
}) => {
  // Get global position context
  const {
    position: globalPosition,
    setPosition: setGlobalPosition,
    mode,
    setMode,
    opacity,
    setOpacity,
    isDocked,
    setDocked,
  } = useElliePosition();

  // Use smart positioning hook
  const {
    position: smartPosition,
    setPosition,
    hasCollision,
    collidingElements,
  } = useEllieSmartPosition({
    followMode: mode === 'companion',
    initialPosition: globalPosition,
  });

  // Use global position if smart positioning is disabled
  const activePosition = enableSmartPositioning ? smartPosition : globalPosition;

  // Ensure position is visible on screen (only on mount)
  useEffect(() => {
    const checkPosition = () => {
      const isVisible =
        activePosition.x >= 0 &&
        activePosition.x < window.innerWidth - 150 &&
        activePosition.y >= 0 &&
        activePosition.y < window.innerHeight - 150;

      if (!isVisible) {
        // Reset to default visible position
        const newPos = {
          x: Math.min(window.innerWidth - 200, Math.max(20, window.innerWidth * 0.8)),
          y: Math.min(window.innerHeight - 200, 100)
        };
        setPosition(newPos);
        setGlobalPosition(newPos);
      }
    };

    checkPosition();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run on mount to avoid infinite loops

  // Sync positions
  useEffect(() => {
    if (enableSmartPositioning) {
      setGlobalPosition(smartPosition);
    }
  }, [smartPosition, enableSmartPositioning, setGlobalPosition]);

  // Handle position changes
  const handlePositionChange = useCallback((newPosition: { x: number; y: number }) => {
    setPosition(newPosition);
    setGlobalPosition(newPosition);
  }, [setPosition, setGlobalPosition]);

  // Handle mode changes
  const handleModeChange = useCallback((newMode: EllieMode) => {
    setMode(newMode);
  }, [setMode]);

  // Handle minimize (dock)
  const handleMinimize = useCallback(() => {
    setDocked(true);
  }, [setDocked]);

  // Handle restore from dock
  const handleRestore = useCallback(() => {
    setDocked(false);
  }, [setDocked]);

  // Handle opacity changes
  const handleOpacityChange = useCallback((newOpacity: number) => {
    setOpacity(newOpacity);
  }, [setOpacity]);

  // Generate ARIA label based on mood and mode
  const getAriaLabel = () => {
    const moodText = mood && mood !== 'idle' ? ` and is ${mood}` : '';
    const modeText = mode ? ` in ${mode} mode` : '';
    return `Ellie the wellness companion${modeText}${moodText}`;
  };

  // Show call button when docked
  if (isDocked) {
    return (
      <button
        onClick={handleRestore}
        className="fixed bottom-6 right-6 bg-purple-600 hover:bg-purple-700 text-white rounded-full p-4 shadow-lg transition-all z-50"
        aria-label="Call Ellie"
      >
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      </button>
    );
  }

  return (
    <>
      {/* Interaction Mode Manager for behavioral changes */}
      {enableSmartPositioning && (
        <InteractionModeManager
          currentMode={mode}
          onModeChange={handleModeChange}
          position={activePosition}
          onPositionChange={handlePositionChange}
        />
      )}

      {/* Main Ellie Component with fixed positioning */}
      <div
        role="img"
        aria-label={getAriaLabel()}
        className={`fixed ${className || ''}`}
        style={{
          left: `${activePosition.x}px`,
          top: `${activePosition.y}px`,
          zIndex: 9999,
          opacity,
          transition: 'opacity 0.3s ease-in-out',
        }}
        tabIndex={tabIndex}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && onClick) {
            onClick();
          }
        }}
      >
        {/* Control Panel */}
        {showControlPanel && (
          <div className="absolute top-0 left-full ml-2">
            <EllieControlPanel
              currentMode={mode}
              onModeChange={handleModeChange}
              onMinimize={handleMinimize}
              opacity={opacity}
              onOpacityChange={handleOpacityChange}
              showOpacityControl={true}
            />
          </div>
        )}

        {/* Ellie Character */}
        <ModularEnhancedShihTzu
          mood={mood}
          position={activePosition}
          onPositionChange={handlePositionChange}
          onClick={onClick}
          onPet={onPet}
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

        {/* Collision Warning (Debug) */}
        {hasCollision && process.env.NODE_ENV === 'development' && (
          <div className="absolute -bottom-8 left-0 text-xs text-red-500 bg-white px-2 py-1 rounded shadow">
            Collision: {collidingElements.length} elements
          </div>
        )}
      </div>
    </>
  );
};
