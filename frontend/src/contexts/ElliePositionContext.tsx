import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  EllieMode,
  Position,
  ElliePreferences,
  PagePositions,
  ElliePositionContext,
} from './ElliePositionContextDefinition';

// Re-export types for convenience
export type { EllieMode, Position, ElliePreferences, PagePositions };

const STORAGE_KEYS = {
  POSITION: 'ellie-position',
  PAGE_POSITIONS: 'ellie-page-positions',
  PREFERENCES: 'ellie-preferences',
  HISTORY: 'ellie-position-history',
};

const BROADCAST_CHANNEL_NAME = 'ellie-position';
const MAX_HISTORY_LENGTH = 10;
const MIN_OPACITY = 0.3;
const MAX_OPACITY = 1.0;

function getDefaultPosition(): Position {
  const x = Math.max(20, window.innerWidth - 220);
  const y = Math.max(20, window.innerHeight - 220);
  return { x, y };
}

function constrainOpacity(value: number): number {
  return Math.max(MIN_OPACITY, Math.min(MAX_OPACITY, value));
}

export const ElliePositionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Load initial state from localStorage
  const loadPosition = (): Position => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.POSITION);
      if (saved) {
        return JSON.parse(saved) as Position;
      }
    } catch (error) {
      console.warn('Failed to load Ellie position:', error);
    }
    return getDefaultPosition();
  };

  const loadPagePositions = (): PagePositions => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.PAGE_POSITIONS);
      if (saved) {
        return JSON.parse(saved) as PagePositions;
      }
    } catch (error) {
      console.warn('Failed to load page positions:', error);
    }
    return {};
  };

  const loadPreferences = (): ElliePreferences => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.PREFERENCES);
      if (saved) {
        const prefs = JSON.parse(saved) as ElliePreferences;
        return {
          mode: prefs.mode || 'companion',
          opacity: constrainOpacity(prefs.opacity || 1.0),
          isDocked: prefs.isDocked || false,
        };
      }
    } catch (error) {
      console.warn('Failed to load preferences:', error);
    }
    return {
      mode: 'companion',
      opacity: 1.0,
      isDocked: false,
    };
  };

  const loadHistory = (): Position[] => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.HISTORY);
      if (saved) {
        return JSON.parse(saved) as Position[];
      }
    } catch (error) {
      console.warn('Failed to load position history:', error);
    }
    return [];
  };

  // State
  const [position, setPositionState] = useState<Position>(loadPosition);
  const [pagePositions, setPagePositions] = useState<PagePositions>(loadPagePositions);
  const [preferences, setPreferences] = useState<ElliePreferences>(loadPreferences);
  const [positionHistory, setPositionHistory] = useState<Position[]>(loadHistory);

  // Refs
  const broadcastChannelRef = useRef<BroadcastChannel | null>(null);

  // Initialize BroadcastChannel for cross-tab sync
  useEffect(() => {
    try {
      const channel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);

      channel.addEventListener('message', (event) => {
        const { type, data } = event.data;

        switch (type) {
          case 'position':
            setPositionState(data);
            break;
          case 'mode':
            setPreferences((prev) => ({ ...prev, mode: data }));
            break;
          case 'opacity':
            setPreferences((prev) => ({ ...prev, opacity: data }));
            break;
          case 'docked':
            setPreferences((prev) => ({ ...prev, isDocked: data }));
            break;
        }
      });

      broadcastChannelRef.current = channel;

      return () => {
        channel.close();
      };
    } catch (error) {
      console.warn('BroadcastChannel not available:', error);
    }
  }, []);

  // Save to localStorage when state changes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.POSITION, JSON.stringify(position));
    } catch (error) {
      console.warn('Failed to save position:', error);
    }
  }, [position]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.PAGE_POSITIONS, JSON.stringify(pagePositions));
    } catch (error) {
      console.warn('Failed to save page positions:', error);
    }
  }, [pagePositions]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.PREFERENCES, JSON.stringify(preferences));
    } catch (error) {
      console.warn('Failed to save preferences:', error);
    }
  }, [preferences]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(positionHistory));
    } catch (error) {
      console.warn('Failed to save history:', error);
    }
  }, [positionHistory]);

  // Set position
  const setPosition = useCallback((newPosition: Position) => {
    setPositionState((prev) => {
      // Add previous position to history
      setPositionHistory((history) => {
        const newHistory = [prev, ...history].slice(0, MAX_HISTORY_LENGTH);
        return newHistory;
      });

      return newPosition;
    });

    // Update page-specific position
    const pathname = window.location.pathname;
    setPagePositions((prev) => ({
      ...prev,
      [pathname]: newPosition,
    }));

    // Broadcast to other tabs
    if (broadcastChannelRef.current) {
      try {
        broadcastChannelRef.current.postMessage({
          type: 'position',
          data: newPosition,
        });
      } catch (error) {
        console.warn('Failed to broadcast position:', error);
      }
    }
  }, []);

  // Get position for specific page
  const getPositionForPage = useCallback(
    (pathname: string): Position | null => {
      return pagePositions[pathname] || null;
    },
    [pagePositions]
  );

  // Reset position to default
  const resetPosition = useCallback(() => {
    const defaultPos = getDefaultPosition();
    setPosition(defaultPos);
  }, [setPosition]);

  // Set mode
  const setMode = useCallback((mode: EllieMode) => {
    setPreferences((prev) => ({ ...prev, mode }));

    // Broadcast to other tabs
    if (broadcastChannelRef.current) {
      try {
        broadcastChannelRef.current.postMessage({
          type: 'mode',
          data: mode,
        });
      } catch (error) {
        console.warn('Failed to broadcast mode:', error);
      }
    }
  }, []);

  // Set opacity
  const setOpacity = useCallback((opacity: number) => {
    const constrainedOpacity = constrainOpacity(opacity);
    setPreferences((prev) => ({ ...prev, opacity: constrainedOpacity }));

    // Broadcast to other tabs
    if (broadcastChannelRef.current) {
      try {
        broadcastChannelRef.current.postMessage({
          type: 'opacity',
          data: constrainedOpacity,
        });
      } catch (error) {
        console.warn('Failed to broadcast opacity:', error);
      }
    }
  }, []);

  // Set docked state
  const setDocked = useCallback((docked: boolean) => {
    setPreferences((prev) => ({ ...prev, isDocked: docked }));

    // Broadcast to other tabs
    if (broadcastChannelRef.current) {
      try {
        broadcastChannelRef.current.postMessage({
          type: 'docked',
          data: docked,
        });
      } catch (error) {
        console.warn('Failed to broadcast docked state:', error);
      }
    }
  }, []);

  // Undo last position change
  const undoPosition = useCallback(() => {
    if (positionHistory.length > 0) {
      const [lastPosition, ...restHistory] = positionHistory;
      setPositionState(lastPosition);
      setPositionHistory(restHistory);

      // Don't broadcast undo to avoid conflicts
    }
  }, [positionHistory]);

  const value: ElliePositionContextValue = {
    position,
    setPosition,
    getPositionForPage,
    resetPosition,
    mode: preferences.mode,
    setMode,
    opacity: preferences.opacity,
    setOpacity,
    isDocked: preferences.isDocked,
    setDocked,
    positionHistory,
    undoPosition,
  };

  return (
    <ElliePositionContext.Provider value={value}>
      {children}
    </ElliePositionContext.Provider>
  );
};
