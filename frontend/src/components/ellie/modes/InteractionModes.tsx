import React, { useEffect, useState, useCallback } from 'react';
import type {
  InteractionModeManagerProps,
  ModeContextMenuProps,
} from './types';
import {
  EllieMode,
  MODE_DESCRIPTIONS,
} from './types';

/**
 * InteractionModeManager component manages Ellie's behavior based on the selected mode
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const InteractionModeManager: React.FC<InteractionModeManagerProps> = ({
  currentMode,
  onModeChange,
  onPositionChange, // Currently unused - all auto-positioning behaviors disabled to allow dragging
  onDockChange,
  children,
}) => {
  const [showModeSelector, setShowModeSelector] = useState(false);

  // Companion mode: Move away from cursor
  // DISABLED: This was preventing users from dragging Ellie
  // The cursor avoidance made it impossible to click and drag since
  // Ellie would move away as soon as the cursor got close
  /*
  useEffect(() => {
    if (currentMode !== EllieMode.COMPANION || !onPositionChange) {
      return;
    }

    const handleMouseMove = (e: MouseEvent) => {
      const distance = Math.sqrt(
        Math.pow(e.clientX - position.x, 2) + Math.pow(e.clientY - position.y, 2)
      );

      if (distance < CURSOR_AVOID_DISTANCE) {
        // Calculate direction away from cursor
        const dx = position.x - e.clientX;
        const dy = position.y - e.clientY;
        const magnitude = Math.sqrt(dx * dx + dy * dy);

        if (magnitude > 0) {
          const nudgeX = (dx / magnitude) * NUDGE_DISTANCE;
          const nudgeY = (dy / magnitude) * NUDGE_DISTANCE;

          onPositionChange({
            x: position.x + nudgeX,
            y: position.y + nudgeY,
          });
        }
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [currentMode, position, onPositionChange]);
  */

  // Assistant mode: Dock to bottom-right
  // DISABLED: This was forcing Ellie to bottom-right corner, preventing dragging
  // Users should be able to position Ellie wherever they want, regardless of mode
  /*
  useEffect(() => {
    if (currentMode === EllieMode.ASSISTANT) {
      if (onDockChange) {
        onDockChange(true);
      }
      if (onPositionChange) {
        const dockPosition = {
          x: window.innerWidth - 120,
          y: window.innerHeight - 120,
        };
        onPositionChange(dockPosition);
      }
    }
  }, [currentMode, onDockChange, onPositionChange]);
  */

  // Playful mode: Random movements
  // DISABLED: This was randomly moving Ellie, preventing users from keeping her in one place
  // Users should have full control over Ellie's position
  /*
  useEffect(() => {
    if (currentMode !== EllieMode.PLAYFUL || !onPositionChange) {
      return;
    }

    const scheduleRandomMovement = () => {
      const interval =
        Math.random() * (PLAYFUL_MAX_INTERVAL - PLAYFUL_MIN_INTERVAL) + PLAYFUL_MIN_INTERVAL;

      playfulTimerRef.current = window.setTimeout(() => {
        // Generate random position
        const randomX = Math.random() * (window.innerWidth - 200) + 100;
        const randomY = Math.random() * (window.innerHeight - 200) + 100;

        onPositionChange({ x: randomX, y: randomY });

        // Schedule next movement
        scheduleRandomMovement();
      }, interval);
    };

    scheduleRandomMovement();

    return () => {
      if (playfulTimerRef.current) {
        clearTimeout(playfulTimerRef.current);
      }
    };
  }, [currentMode, onPositionChange]);
  */

  // Focus mode: Minimize to tiny bubble
  useEffect(() => {
    if (currentMode === EllieMode.FOCUS && onDockChange) {
      onDockChange(true);
    }
  }, [currentMode, onDockChange]);

  return (
    <div data-mode={currentMode}>
      {/* Mode description */}
      <div className="mode-description">
        <p>{MODE_DESCRIPTIONS[currentMode]}</p>
      </div>

      {/* Mode selector */}
      {showModeSelector && (
        <div className="mode-selector">
          <button onClick={() => setShowModeSelector(false)}>Close</button>
          {Object.values(EllieMode).map((mode) => (
            <button
              key={mode}
              onClick={() => {
                onModeChange(mode);
                setShowModeSelector(false);
              }}
              className={currentMode === mode ? 'active' : ''}
            >
              {mode.charAt(0).toUpperCase() + mode.slice(1)}
            </button>
          ))}
        </div>
      )}

      <button
        role="button"
        aria-label="Change mode"
        onClick={() => setShowModeSelector(!showModeSelector)}
      >
        Change Mode
      </button>

      {children}
    </div>
  );
};

/**
 * ModeContextMenu component provides a right-click context menu for mode selection
 */
export const ModeContextMenu: React.FC<ModeContextMenuProps> = ({
  currentMode,
  onModeSelect,
  children,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const menuRef = useRef<HTMLDivElement>(null);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setPosition({ x: e.clientX, y: e.clientY });
    setIsOpen(true);
  }, []);

  const handleSelect = useCallback(
    (mode: EllieMode) => {
      onModeSelect(mode);
      setIsOpen(false);
    },
    [onModeSelect]
  );

  // Close menu on outside click
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [isOpen]);

  return (
    <>
      <div onContextMenu={handleContextMenu}>{children}</div>

      {isOpen && (
        <div
          ref={menuRef}
          className="context-menu"
          style={{
            position: 'fixed',
            left: position.x,
            top: position.y,
            zIndex: 10000,
          }}
        >
          {Object.values(EllieMode).map((mode) => (
            <button
              key={mode}
              onClick={() => handleSelect(mode)}
              className={currentMode === mode ? 'active' : ''}
            >
              {mode.charAt(0).toUpperCase() + mode.slice(1)} Mode
            </button>
          ))}
        </div>
      )}
    </>
  );
};
