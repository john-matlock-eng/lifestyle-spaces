import React, { useState, useCallback, useEffect } from 'react';
import { ModularEnhancedShihTzu } from './ModularEnhancedShihTzu';
import { EllieControlPanel } from './EllieControlPanel';
import type { EllieMode } from './modes/types';

export interface SimpleSmartEllieProps {
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
  furColor?: string;
  collarStyle?: 'none' | 'leather' | 'fabric' | 'bowtie' | 'bandana';
  collarColor?: string;
  collarTag?: boolean;
  showControlPanel?: boolean;
  enableSmartPositioning?: boolean; // Accepted for compatibility but always enabled
}

const STORAGE_KEY = 'ellie-simple-position';
const ELLIE_SIZE = 150;

/**
 * SimpleSmartEllie - A simplified, working version of SmartEllie
 * Bypasses all complex positioning systems for reliable dragging
 */
export const SimpleSmartEllie: React.FC<SimpleSmartEllieProps> = ({
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
  showControlPanel = true,
}) => {
  // Simple local position state
  const [position, setPosition] = useState(() => {
    // Try to load from localStorage
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const pos = JSON.parse(saved);
        // Validate it's on screen
        if (
          pos.x >= 0 &&
          pos.x <= window.innerWidth - ELLIE_SIZE &&
          pos.y >= 0 &&
          pos.y <= window.innerHeight - ELLIE_SIZE
        ) {
          console.log('[SimpleSmartEllie] Loaded position from localStorage:', pos);
          return pos;
        }
      }
    } catch (error) {
      console.warn('[SimpleSmartEllie] Failed to load position:', error);
    }

    // Default to right side of screen
    const defaultPos = {
      x: Math.max(20, window.innerWidth - ELLIE_SIZE - 20),
      y: 100
    };
    console.log('[SimpleSmartEllie] Using default position:', defaultPos);
    return defaultPos;
  });

  const [mode, setMode] = useState<EllieMode>('companion');
  const [opacity, setOpacity] = useState(1.0);
  const [isDocked, setDocked] = useState(false);

  // Handle position changes from dragging
  const handlePositionChange = useCallback((newPosition: { x: number; y: number }) => {
    // Constrain to viewport
    const constrainedPos = {
      x: Math.max(0, Math.min(newPosition.x, window.innerWidth - ELLIE_SIZE)),
      y: Math.max(0, Math.min(newPosition.y, window.innerHeight - ELLIE_SIZE))
    };

    console.log('[SimpleSmartEllie] Position changed:', constrainedPos);
    setPosition(constrainedPos);

    // Save to localStorage
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(constrainedPos));
    } catch (error) {
      console.warn('[SimpleSmartEllie] Failed to save position:', error);
    }
  }, []);

  // Handle window resize - keep Ellie on screen
  useEffect(() => {
    const handleResize = () => {
      setPosition((prev: { x: number; y: number }) => ({
        x: Math.max(0, Math.min(prev.x, window.innerWidth - ELLIE_SIZE)),
        y: Math.max(0, Math.min(prev.y, window.innerHeight - ELLIE_SIZE))
      }));
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Handle minimize
  const handleMinimize = useCallback(() => {
    setDocked(true);
  }, []);

  // Handle restore from dock
  const handleRestore = useCallback(() => {
    setDocked(false);
  }, []);

  // Handle opacity changes
  const handleOpacityChange = useCallback((newOpacity: number) => {
    setOpacity(Math.max(0.3, Math.min(1.0, newOpacity)));
  }, []);

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
    <div
      className={`fixed ${className || ''}`}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        zIndex: 9999,
        opacity,
        transition: 'opacity 0.3s ease-in-out',
      }}
      role="img"
      aria-label={`Ellie the wellness companion in ${mode} mode and is ${mood}`}
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
            onModeChange={setMode}
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
        position={position}
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
    </div>
  );
};

export default SimpleSmartEllie;
