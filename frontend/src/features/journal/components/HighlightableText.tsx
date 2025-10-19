/**
 * HighlightableText Component - ENHANCED WITH COLOR SELECTION
 *
 * Renders journal text with highlighting capability.
 * Allows users to select text and create highlights with color choices.
 * Features beautiful gradient popover with animations and color indicators.
 *
 * Uses React Portal to render popover at document.body level.
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import ReactDOM from 'react-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type {
  Highlight,
  HighlightSelection,
  HighlightColor
} from '../types/highlight.types';
import { HIGHLIGHT_COLORS } from '../types/highlight.types';

interface HighlightableTextProps {
  content: string;
  highlights: Highlight[];
  journalEntryId: string;
  spaceId: string;
  onHighlightCreate: (selection: HighlightSelection, color: HighlightColor) => void;
  onHighlightClick: (highlight: Highlight) => void;
  isReadOnly?: boolean;
  className?: string;
}

export const HighlightableText: React.FC<HighlightableTextProps> = ({
  content,
  highlights,
  onHighlightCreate,
  onHighlightClick,
  isReadOnly = false,
  className = '',
}) => {
  const [selection, setSelection] = useState<HighlightSelection | null>(null);
  const [popoverPosition, setPopoverPosition] = useState<{ x: number; y: number } | null>(null);
  const [selectedColor, setSelectedColor] = useState<HighlightColor>('yellow');
  const contentRef = useRef<HTMLDivElement>(null);

  // Handle text selection
  const handleMouseUp = useCallback(() => {
    console.log('[HighlightableText] mouseUp triggered');

    if (isReadOnly) {
      console.log('[HighlightableText] Read-only mode, ignoring');
      return;
    }

    const windowSelection = window.getSelection();
    console.log('[HighlightableText] windowSelection:', windowSelection);

    if (!windowSelection || windowSelection.isCollapsed) {
      console.log('[HighlightableText] No selection or collapsed');
      setSelection(null);
      setPopoverPosition(null);
      return;
    }

    const selectedText = windowSelection.toString().trim();
    console.log('[HighlightableText] Selected text:', selectedText);

    if (!selectedText) {
      console.log('[HighlightableText] Empty selection');
      setSelection(null);
      setPopoverPosition(null);
      return;
    }

    const range = windowSelection.getRangeAt(0);
    const boundingRect = range.getBoundingClientRect();
    console.log('[HighlightableText] boundingRect:', boundingRect);

    // Calculate text offsets
    const container = contentRef.current;
    console.log('[HighlightableText] container:', container);

    if (!container) {
      console.log('[HighlightableText] No container ref, aborting');
      return;
    }

    try {
      const preSelectionRange = document.createRange();
      preSelectionRange.selectNodeContents(container);
      preSelectionRange.setEnd(range.startContainer, range.startOffset);
      const startOffset = preSelectionRange.toString().length;
      const endOffset = startOffset + selectedText.length;

      console.log('[HighlightableText] Calculated offsets:', { startOffset, endOffset });

      setSelection({
        text: selectedText,
        range: {
          startOffset,
          endOffset,
          startContainerId: undefined,
          endContainerId: undefined,
        },
        boundingRect,
      });

      // Position popover above selection, accounting for scroll
      const scrollY = window.scrollY || window.pageYOffset;
      const scrollX = window.scrollX || window.pageXOffset;

      const popoverPos = {
        x: boundingRect.left + (boundingRect.width / 2) + scrollX,
        y: boundingRect.top + scrollY - 10, // 10px above selection
      };

      console.log('[HighlightableText] Setting popover position:', popoverPos);
      console.log('[HighlightableText] Window scroll:', { scrollX, scrollY });
      setPopoverPosition(popoverPos);
    } catch (error) {
      console.error('[HighlightableText] Error calculating selection:', error);
    }
  }, [isReadOnly]);

  // Debug: Log when selection/position changes
  useEffect(() => {
    console.log('[HighlightableText] State changed - selection:', selection);
    console.log('[HighlightableText] State changed - popoverPosition:', popoverPosition);
    console.log('[HighlightableText] State changed - Should show popover?', !!(selection && popoverPosition && !isReadOnly));
  }, [selection, popoverPosition, isReadOnly]);

  // Handle clicking outside to close popover
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (selection && popoverPosition) {
        const target = e.target as HTMLElement;

        // Check if click is on popover or its children
        if (!target.closest('.highlight-popover') && !target.closest('.highlightable-text')) {
          console.log('[HighlightableText] Clearing selection due to outside click');
          setSelection(null);
          setPopoverPosition(null);
          window.getSelection()?.removeAllRanges();
        }
      }
    };

    // Use setTimeout to avoid clearing immediately after setting
    const timeoutId = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 100);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [selection, popoverPosition]);

  // Handle escape key to close popover
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && selection) {
        setSelection(null);
        setPopoverPosition(null);
        window.getSelection()?.removeAllRanges();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [selection]);

  // Create highlight with selected color
  const handleCreateHighlight = useCallback((color: HighlightColor) => {
    if (selection) {
      console.log('[HighlightableText] Creating highlight with color:', color);
      setSelectedColor(color); // Remember the last used color
      onHighlightCreate(selection, color);
      setSelection(null);
      setPopoverPosition(null);
      window.getSelection()?.removeAllRanges();
    }
  }, [selection, onHighlightCreate]);

  // Render text with highlights
  const renderHighlightedContent = () => {
    // If no highlights, render markdown
    if (highlights.length === 0) {
      return <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>;
    }

    // Sort highlights by start offset
    const sortedHighlights = [...highlights].sort(
      (a, b) => a.textRange.startOffset - b.textRange.startOffset
    );

    const parts: React.ReactNode[] = [];
    let currentIndex = 0;

    sortedHighlights.forEach((highlight, idx) => {
      const { startOffset, endOffset } = highlight.textRange;

      // Add text before highlight
      if (currentIndex < startOffset) {
        parts.push(
          <span key={`text-${idx}`}>
            {content.substring(currentIndex, startOffset)}
          </span>
        );
      }

      // Add highlighted text
      parts.push(
        <mark
          key={`highlight-${highlight.id}`}
          className="highlight cursor-pointer transition-all hover:opacity-80"
          style={{
            backgroundColor: highlight.color || HIGHLIGHT_COLORS.yellow,
            padding: '2px 0',
            borderRadius: '2px'
          }}
          onClick={() => onHighlightClick(highlight)}
          title={`Click to view comments (${highlight.commentCount || 0})`}
        >
          {content.substring(startOffset, endOffset)}
          {highlight.commentCount > 0 && (
            <span
              style={{
                marginLeft: '4px',
                fontSize: '0.8em',
                verticalAlign: 'super',
                opacity: 0.7
              }}
            >
              [{highlight.commentCount}]
            </span>
          )}
        </mark>
      );

      currentIndex = endOffset;
    });

    // Add remaining text
    if (currentIndex < content.length) {
      parts.push(
        <span key="text-end">{content.substring(currentIndex)}</span>
      );
    }

    return <>{parts}</>;
  };

  // Render popover using React Portal
  const renderPopover = () => {
    if (!selection || !popoverPosition || isReadOnly) {
      return null;
    }

    const popoverElement = (
      <div
        className="highlight-popover"
        style={{
          position: 'fixed',
          left: `${popoverPosition.x}px`,
          top: `${popoverPosition.y}px`,
          transform: 'translate(-50%, -100%)',
          zIndex: 99999,
          background: 'linear-gradient(135deg, var(--theme-primary-500) 0%, var(--theme-primary-700) 100%)',
          borderRadius: '12px',
          boxShadow: '0 10px 40px rgba(20, 184, 166, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.1)',
          padding: '12px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          animation: 'slideInFromTop 0.3s ease-out',
          minWidth: '240px',
        }}
      >
        <style>{`
          @keyframes slideInFromTop {
            from {
              opacity: 0;
              transform: translate(-50%, -110%) scale(0.95);
            }
            to {
              opacity: 1;
              transform: translate(-50%, -100%) scale(1);
            }
          }

          /* Pointer arrow - uses theme primary-700 */
          .highlight-popover::after {
            content: '';
            position: absolute;
            bottom: -8px;
            left: 50%;
            transform: translateX(-50%);
            width: 0;
            height: 0;
            border-left: 8px solid transparent;
            border-right: 8px solid transparent;
            border-top: 8px solid var(--theme-primary-700);
          }
        `}</style>

        {/* Title */}
        <div style={{
          color: 'white',
          fontSize: '13px',
          fontWeight: '600',
          textAlign: 'center',
          marginBottom: '4px',
          letterSpacing: '0.5px',
        }}>
          Choose highlight color
        </div>

        {/* Color buttons */}
        <div style={{
          display: 'flex',
          gap: '8px',
          justifyContent: 'center',
          flexWrap: 'wrap',
        }}>
          {(Object.keys(HIGHLIGHT_COLORS) as HighlightColor[]).map((color) => (
            <button
              key={color}
              className="highlight-color-btn"
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                border: selectedColor === color ? '3px solid white' : '2px solid rgba(255, 255, 255, 0.3)',
                backgroundColor: HIGHLIGHT_COLORS[color],
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                position: 'relative',
                boxShadow: selectedColor === color
                  ? '0 4px 12px rgba(0, 0, 0, 0.3)'
                  : '0 2px 6px rgba(0, 0, 0, 0.15)',
              }}
              onClick={() => handleCreateHighlight(color)}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.1)';
                e.currentTarget.style.boxShadow = '0 6px 16px rgba(0, 0, 0, 0.25)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.boxShadow = selectedColor === color
                  ? '0 4px 12px rgba(0, 0, 0, 0.3)'
                  : '0 2px 6px rgba(0, 0, 0, 0.15)';
              }}
              title={`Highlight in ${color}`}
            >
              {/* Checkmark for selected color */}
              {selectedColor === color && (
                <svg
                  style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: '16px',
                    height: '16px',
                  }}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="rgba(0, 0, 0, 0.6)"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
            </button>
          ))}
        </div>

        {/* Cancel button */}
        <button
          style={{
            padding: '8px 16px',
            fontSize: '13px',
            color: 'white',
            backgroundColor: 'rgba(255, 255, 255, 0.2)',
            border: '1px solid rgba(255, 255, 255, 0.3)',
            borderRadius: '6px',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            fontWeight: '500',
            marginTop: '4px',
          }}
          onClick={() => {
            setSelection(null);
            setPopoverPosition(null);
            window.getSelection()?.removeAllRanges();
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.3)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
          }}
        >
          Cancel
        </button>
      </div>
    );

    // Use React Portal to render at document body level
    return ReactDOM.createPortal(popoverElement, document.body);
  };

  return (
    <>
      <div className={`relative ${className}`}>
        <div
          ref={contentRef}
          className="highlightable-text prose max-w-none"
          onMouseUp={handleMouseUp}
          style={{ userSelect: 'text' }}
        >
          {renderHighlightedContent()}
        </div>
      </div>

      {/* Render popover via portal */}
      {renderPopover()}
    </>
  );
};
