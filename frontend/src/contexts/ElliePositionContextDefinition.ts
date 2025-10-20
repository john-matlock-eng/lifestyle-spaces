import { createContext } from 'react';

export type EllieMode = 'companion' | 'assistant' | 'playful' | 'focus';

export interface Position {
  x: number;
  y: number;
}

export interface ElliePreferences {
  mode: EllieMode;
  opacity: number;
  isDocked: boolean;
}

export interface PagePositions {
  [pathname: string]: Position;
}

export interface ElliePositionContextValue {
  // Position
  position: Position;
  setPosition: (position: Position) => void;
  getPositionForPage: (pathname: string) => Position | null;
  resetPosition: () => void;

  // Mode
  mode: EllieMode;
  setMode: (mode: EllieMode) => void;

  // Appearance
  opacity: number;
  setOpacity: (opacity: number) => void;

  // Docked state
  isDocked: boolean;
  setDocked: (docked: boolean) => void;

  // History
  positionHistory: Position[];
  undoPosition: () => void;
}

export const ElliePositionContext = createContext<ElliePositionContextValue | null>(null);
