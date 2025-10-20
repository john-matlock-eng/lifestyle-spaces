import { useEffect } from 'react';

export type EllieMode = 'companion' | 'assistant' | 'playful' | 'focus';

export const EllieMode = {
  COMPANION: 'companion',
  ASSISTANT: 'assistant',
  PLAYFUL: 'playful',
  FOCUS: 'focus',
} as const;

export interface Position {
  x: number;
  y: number;
}

export interface InteractionModeManagerProps {
  currentMode: EllieMode;
  onModeChange: (mode: EllieMode) => void;
  position?: Position;
  onPositionChange?: (position: Position) => void;
  onDockChange?: (docked: boolean) => void;
  children?: React.ReactNode;
}

export interface ModeContextMenuProps {
  currentMode: EllieMode;
  onModeSelect: (mode: EllieMode) => void;
  children: React.ReactNode;
}

export const MODE_DESCRIPTIONS: Record<EllieMode, string> = {
  [EllieMode.COMPANION]: 'Follows user activity subtly, moves to avoid cursor',
  [EllieMode.ASSISTANT]: 'Stays docked in bottom-right until called',
  [EllieMode.PLAYFUL]: 'Occasionally moves on her own every 30-60 seconds',
  [EllieMode.FOCUS]: 'Minimizes to tiny bubble during work',
};

export const PLAYFUL_MIN_INTERVAL = 30000; // 30 seconds
export const PLAYFUL_MAX_INTERVAL = 60000; // 60 seconds
export const CURSOR_AVOID_DISTANCE = 100;
export const NUDGE_DISTANCE = 30;

/**
 * Custom hook for mode keyboard shortcuts
 */
export const useModeKeyboardShortcuts = (
  currentMode: EllieMode,
  onModeChange: (mode: EllieMode) => void
) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+Shift+E to cycle modes
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'e') {
        e.preventDefault();

        const modes = [
          EllieMode.COMPANION,
          EllieMode.ASSISTANT,
          EllieMode.PLAYFUL,
          EllieMode.FOCUS,
        ];

        const currentIndex = modes.indexOf(currentMode);
        const nextIndex = (currentIndex + 1) % modes.length;
        onModeChange(modes[nextIndex]);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [currentMode, onModeChange]);
};
