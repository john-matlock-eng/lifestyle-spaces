import React, { useState, useCallback, useRef, useEffect } from 'react';
import { EllieMode } from './modes/InteractionModes';

export interface EllieControlPanelProps {
  currentMode: EllieMode;
  onModeChange: (mode: EllieMode) => void;
  onMove?: () => void;
  onMinimize?: () => void;
  onCustomize?: () => void;
  onReset?: () => void;
  showOpacityControl?: boolean;
  opacity?: number;
  onOpacityChange?: (opacity: number) => void;
}

export interface EllieControlButtonProps {
  onClick?: () => void;
}

export interface CallEllieButtonProps {
  isHidden: boolean;
  onCall: () => void;
}

export interface OpacitySliderProps {
  value: number;
  onChange: (value: number) => void;
}

const MIN_OPACITY = 0.3;
const MAX_OPACITY = 1.0;

/**
 * 3-dot menu control button
 */
export const EllieControlButton: React.FC<EllieControlButtonProps> = ({ onClick }) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className="relative"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <button
        onClick={onClick}
        className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
        aria-label="Ellie control menu"
        type="button"
      >
        <div className="flex flex-col gap-1">
          <div className="w-1 h-1 bg-gray-600 rounded-full dot" data-testid="dot-1" />
          <div className="w-1 h-1 bg-gray-600 rounded-full dot" data-testid="dot-2" />
          <div className="w-1 h-1 bg-gray-600 rounded-full dot" data-testid="dot-3" />
        </div>
      </button>

      {isHovered && (
        <div className="absolute bottom-full mb-2 right-0 bg-white border border-gray-200 rounded-lg shadow-lg p-2 min-w-max whitespace-nowrap">
          <span className="text-xs text-gray-600">Move</span>
        </div>
      )}
    </div>
  );
};

/**
 * Opacity slider component
 */
export const OpacitySlider: React.FC<OpacitySliderProps> = ({ value, onChange }) => {
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = parseFloat(e.target.value);
      const constrained = Math.max(MIN_OPACITY, Math.min(MAX_OPACITY, newValue));
      onChange(constrained);
    },
    [onChange]
  );

  return (
    <div className="flex items-center gap-2 py-2">
      <label htmlFor="ellie-opacity" className="text-sm text-gray-700 font-medium">
        Opacity
      </label>
      <input
        id="ellie-opacity"
        type="range"
        min={MIN_OPACITY}
        max={MAX_OPACITY}
        step="0.1"
        value={value}
        onChange={handleChange}
        className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
        aria-label="Ellie opacity control"
      />
      <span className="text-sm text-gray-600 w-12 text-right">
        {Math.round(value * 100)}%
      </span>
    </div>
  );
};

/**
 * Call Ellie button (shown when minimized/hidden)
 */
export const CallEllieButton: React.FC<CallEllieButtonProps> = ({ isHidden, onCall }) => {
  if (!isHidden) {
    return null;
  }

  return (
    <button
      onClick={onCall}
      className="fixed bottom-4 right-4 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-full shadow-lg transition-all duration-200 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
      aria-label="Call Ellie"
      type="button"
    >
      <span className="flex items-center gap-2">
        <span>🐕</span>
        <span className="text-sm font-medium">Call Ellie</span>
      </span>
    </button>
  );
};

/**
 * Main control panel for Ellie
 */
export const EllieControlPanel: React.FC<EllieControlPanelProps> = ({
  currentMode,
  onModeChange,
  onMove,
  onMinimize,
  onCustomize,
  onReset,
  showOpacityControl = false,
  opacity = 1.0,
  onOpacityChange,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showModeSelector, setShowModeSelector] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const handleToggle = useCallback(() => {
    setIsOpen((prev) => !prev);
    setShowModeSelector(false);
  }, []);

  const handleAction = useCallback((action: () => void) => {
    action();
    setIsOpen(false);
    setShowModeSelector(false);
  }, []);

  // Close menu on outside click
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setShowModeSelector(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [isOpen]);

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={handleToggle}
        className="p-2 rounded-full bg-white/90 hover:bg-white shadow-md hover:shadow-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 border border-gray-200"
        aria-label="Ellie control panel"
        aria-expanded={isOpen}
        type="button"
      >
        <div className="flex flex-col gap-1">
          <div className="w-1 h-1 bg-gray-600 rounded-full" />
          <div className="w-1 h-1 bg-gray-600 rounded-full" />
          <div className="w-1 h-1 bg-gray-600 rounded-full" />
        </div>
      </button>

      {isOpen && (
        <div className="absolute bottom-full mb-2 right-0 bg-white border border-gray-200 rounded-lg shadow-xl p-2 min-w-48 z-50">
          {!showModeSelector ? (
            <>
              {/* Quick Actions */}
              <div className="space-y-1">
                {onMove && (
                  <button
                    onClick={() => handleAction(onMove)}
                    className="w-full text-left px-3 py-2 rounded-md hover:bg-gray-100 transition-colors duration-150 text-sm text-gray-700"
                    type="button"
                  >
                    Move
                  </button>
                )}

                {onMinimize && (
                  <button
                    onClick={() => handleAction(onMinimize)}
                    className="w-full text-left px-3 py-2 rounded-md hover:bg-gray-100 transition-colors duration-150 text-sm text-gray-700"
                    type="button"
                  >
                    Minimize
                  </button>
                )}

                <button
                  onClick={() => setShowModeSelector(true)}
                  className="w-full text-left px-3 py-2 rounded-md hover:bg-gray-100 transition-colors duration-150 text-sm text-gray-700"
                  type="button"
                >
                  Change Mode
                </button>

                {onCustomize && (
                  <button
                    onClick={() => handleAction(onCustomize)}
                    className="w-full text-left px-3 py-2 rounded-md hover:bg-gray-100 transition-colors duration-150 text-sm text-gray-700"
                    type="button"
                  >
                    Customize
                  </button>
                )}

                {onReset && (
                  <>
                    <div className="border-t border-gray-200 my-2" />
                    <button
                      onClick={() => handleAction(onReset)}
                      className="w-full text-left px-3 py-2 rounded-md hover:bg-gray-100 transition-colors duration-150 text-sm text-red-600"
                      type="button"
                    >
                      Reset Position
                    </button>
                  </>
                )}
              </div>

              {/* Opacity Control */}
              {showOpacityControl && onOpacityChange && (
                <>
                  <div className="border-t border-gray-200 my-2" />
                  <div className="px-2">
                    <OpacitySlider value={opacity} onChange={onOpacityChange} />
                  </div>
                </>
              )}
            </>
          ) : (
            /* Mode Selector */
            <div className="space-y-1">
              <button
                onClick={() => setShowModeSelector(false)}
                className="w-full text-left px-3 py-2 rounded-md hover:bg-gray-100 transition-colors duration-150 text-sm text-gray-500"
                type="button"
              >
                ← Back
              </button>

              <div className="border-t border-gray-200 my-2" />

              {Object.values(EllieMode).map((mode) => (
                <button
                  key={mode}
                  onClick={() =>
                    handleAction(() => {
                      onModeChange(mode);
                    })
                  }
                  className={`w-full text-left px-3 py-2 rounded-md transition-colors duration-150 text-sm ${
                    currentMode === mode
                      ? 'bg-blue-50 text-blue-700 font-medium'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                  type="button"
                >
                  <div className="flex items-center justify-between">
                    <span className="capitalize">{mode}</span>
                    {currentMode === mode && <span className="text-blue-500">✓</span>}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default EllieControlPanel;
