import React from 'react';
import { EllieControlPanel } from './EllieControlPanel';
import type { EllieMode } from './modes/types';
import './EllieBottomBar.css';

export interface EllieBottomBarProps {
  currentMode?: EllieMode;
  onModeChange?: (mode: EllieMode) => void;
  onMinimize?: () => void;
  onCustomize?: () => void;
  onReset?: () => void;
  opacity?: number;
  onOpacityChange?: (opacity: number) => void;
}

/**
 * Transparent bottom bar with Ellie control button
 * Designed to be used on sign-in pages and other non-dashboard pages
 */
export const EllieBottomBar: React.FC<EllieBottomBarProps> = ({
  currentMode = 'companion',
  onModeChange,
  onMinimize,
  onCustomize,
  onReset,
  opacity = 1.0,
  onOpacityChange,
}) => {
  return (
    <div className="ellie-bottom-bar">
      <div className="ellie-bottom-bar__content">
        <EllieControlPanel
          currentMode={currentMode}
          onModeChange={onModeChange || (() => {})}
          onMinimize={onMinimize}
          onCustomize={onCustomize}
          onReset={onReset}
          opacity={opacity}
          onOpacityChange={onOpacityChange}
          showOpacityControl={true}
        />
      </div>
    </div>
  );
};

export default EllieBottomBar;
