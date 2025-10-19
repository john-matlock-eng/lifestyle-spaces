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
  sectionId?: string; // Optional section ID for template journals
  onHighlightCreate: (selection: HighlightSelection, color: HighlightColor) => void;
  onHighlightClick: (highlight: Highlight) => void;
  onHighlightDelete?: (highlightId: string) => void;
  isReadOnly?: boolean;
  className?: string;
}

export const HighlightableText: React.FC<HighlightableTextProps> = ({
  content,
  highlights,
  sectionId,
  onHighlightCreate,
  onHighlightClick,
  onHighlightDelete,
  isReadOnly = false,
  className = '',
}) => {
  const [selection, setSelection] = useState<HighlightSelection | null>(null);
  const [showCreateButton, setShowCreateButton] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [buttonPosition, setButtonPosition] = useState<{ x: number; y: number } | null>(null);
  const [selectedColor, setSelectedColor] = useState<HighlightColor>('yellow');
  const [clickedHighlight, setClickedHighlight] = useState<Highlight | null>(null);
  const [highlightMenuPosition, setHighlightMenuPosition] = useState<{ x: number; y: number } | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const selectionTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Filter highlights to only show ones for this section (if sectionId provided)
  const filteredHighlights = React.useMemo(() => {
    if (!sectionId) {
      // No section ID - show all highlights (for non-template journals)
      return highlights;
    }
    // Filter to only highlights for this section
    return highlights.filter(h => h.textRange.startContainerId === sectionId);
  }, [highlights, sectionId]);

  // Shared selection handling logic for both mouse and touch
  const handleSelection = useCallback(() => {
    console.log('[HighlightableText] Selection triggered');

    if (isReadOnly) {
      console.log('[HighlightableText] Read-only mode, ignoring');
      return;
    }

    // Clear any existing timeout
    if (selectionTimeoutRef.current) {
      clearTimeout(selectionTimeoutRef.current);
    }

    // Wait a bit to see if user is still adjusting selection
    selectionTimeoutRef.current = setTimeout(() => {
      const windowSelection = window.getSelection();
      console.log('[HighlightableText] windowSelection:', windowSelection);

      if (!windowSelection || windowSelection.isCollapsed) {
        console.log('[HighlightableText] No selection or collapsed');
        setSelection(null);
        setShowCreateButton(false);
        setShowColorPicker(false);
        return;
      }

      const selectedText = windowSelection.toString().trim();
      console.log('[HighlightableText] Selected text:', selectedText);

      if (!selectedText) {
        console.log('[HighlightableText] Empty selection');
        setSelection(null);
        setShowCreateButton(false);
        setShowColorPicker(false);
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
            startContainerId: sectionId, // Store section ID for template journals
            endContainerId: sectionId,
          },
          boundingRect,
        });

        // Position button below selection to avoid OS context menu (viewport-relative for fixed positioning)
        const buttonPos = {
          x: boundingRect.left + (boundingRect.width / 2),
          y: boundingRect.bottom + 10, // 10px below selection
        };

        console.log('[HighlightableText] Setting button position:', buttonPos);
        console.log('[HighlightableText] BoundingRect:', boundingRect);
        setButtonPosition(buttonPos);
        setShowCreateButton(true);
        setShowColorPicker(false); // Don't show color picker yet
      } catch (error) {
        console.error('[HighlightableText] Error calculating selection:', error);
      }
    }, 500); // 500ms delay allows for selection adjustment
  }, [isReadOnly, sectionId]);

  // Handle text selection on desktop (mouse events)
  const handleMouseUp = useCallback(() => {
    console.log('[HighlightableText] mouseUp triggered');
    handleSelection();
  }, [handleSelection]);

  // Handle text selection on mobile (touch events)
  const handleTouchEnd = useCallback(() => {
    console.log('[HighlightableText] touchEnd triggered');
    handleSelection();
  }, [handleSelection]);

  // Listen for selection changes (more reliable for mobile)
  useEffect(() => {
    const handleSelectionChange = () => {
      console.log('[HighlightableText] selectionchange triggered');

      // Only process if we're within our content area
      const windowSelection = window.getSelection();
      if (!windowSelection || windowSelection.isCollapsed) {
        return;
      }

      // Check if selection is within our content
      const range = windowSelection.getRangeAt(0);
      const container = contentRef.current;
      if (!container) return;

      // Check if selection is within this component
      if (container.contains(range.commonAncestorContainer)) {
        console.log('[HighlightableText] Selection is within our content, triggering handler');
        handleSelection();
      }
    };

    document.addEventListener('selectionchange', handleSelectionChange);
    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange);
    };
  }, [handleSelection]);

  // Handle clicking/tapping outside to close UI elements
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      const target = e.target as HTMLElement;

      // Check if click/tap is on any highlight UI element
      if (!target.closest('.highlight-button') &&
          !target.closest('.highlight-color-picker') &&
          !target.closest('.highlight-menu') &&
          !target.closest('.highlightable-text')) {
        console.log('[HighlightableText] Clearing selection due to outside click/tap');
        setSelection(null);
        setShowCreateButton(false);
        setShowColorPicker(false);
        setClickedHighlight(null);
        setHighlightMenuPosition(null);
        window.getSelection()?.removeAllRanges();
      }
    };

    // Use setTimeout to avoid clearing immediately after setting
    const timeoutId = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }, 100);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [selection, showCreateButton, showColorPicker, clickedHighlight]);

  // Handle escape key to close UI
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelection(null);
        setShowCreateButton(false);
        setShowColorPicker(false);
        setClickedHighlight(null);
        setHighlightMenuPosition(null);
        window.getSelection()?.removeAllRanges();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, []);

  // Show color picker when user clicks "Create Highlight" button
  const handleShowColorPicker = useCallback(() => {
    setShowCreateButton(false);
    setShowColorPicker(true);
  }, []);

  // Create highlight with selected color
  const handleCreateHighlight = useCallback((color: HighlightColor) => {
    if (selection) {
      console.log('[HighlightableText] Creating highlight with color:', color);
      setSelectedColor(color); // Remember the last used color
      onHighlightCreate(selection, color);
      setSelection(null);
      setShowCreateButton(false);
      setShowColorPicker(false);
      setButtonPosition(null);
      window.getSelection()?.removeAllRanges();
    }
  }, [selection, onHighlightCreate]);

  // Handle clicking on an existing highlight
  const handleExistingHighlightClick = useCallback((e: React.MouseEvent, highlight: Highlight) => {
    e.stopPropagation();

    // Calculate position for menu (viewport-relative for fixed positioning)
    const rect = (e.target as HTMLElement).getBoundingClientRect();

    setClickedHighlight(highlight);
    setHighlightMenuPosition({
      x: rect.left + (rect.width / 2),
      y: rect.bottom + 8, // 8px below highlight
    });

    console.log('[HighlightableText] Highlight menu position:', {
      x: rect.left + (rect.width / 2),
      y: rect.bottom + 8,
      rect
    });
  }, []);

  // Handle deleting a highlight
  const handleDeleteHighlight = useCallback(() => {
    if (clickedHighlight && onHighlightDelete) {
      onHighlightDelete(clickedHighlight.id);
      setClickedHighlight(null);
      setHighlightMenuPosition(null);
    }
  }, [clickedHighlight, onHighlightDelete]);

  // Handle viewing comments for a highlight
  const handleViewComments = useCallback(() => {
    if (clickedHighlight) {
      onHighlightClick(clickedHighlight);
      setClickedHighlight(null);
      setHighlightMenuPosition(null);
    }
  }, [clickedHighlight, onHighlightClick]);

  // Render text with highlights - preserves markdown formatting
  const renderHighlightedContent = () => {
    // If no highlights, render markdown normally
    if (filteredHighlights.length === 0) {
      return <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>;
    }

    // Sort highlights by start offset for efficient lookup
    const sortedHighlights = [...filteredHighlights].sort(
      (a, b) => a.textRange.startOffset - b.textRange.startOffset
    );

    // Create a ref to track character offset across the entire render tree
    const offsetTracker = { current: 0 };

    // Process text node and apply highlights where they overlap
    const processTextNode = (text: string): React.ReactNode => {
      if (!text) return text;

      const textStart = offsetTracker.current;
      const textEnd = textStart + text.length;
      offsetTracker.current = textEnd;

      // Find highlights that overlap with this text segment
      const overlapping = sortedHighlights.filter(h => {
        return h.textRange.startOffset < textEnd && h.textRange.endOffset > textStart;
      });

      if (overlapping.length === 0) {
        return text;
      }

      // Split text into parts with highlights
      const parts: React.ReactNode[] = [];
      let pos = 0;

      overlapping.forEach((highlight, idx) => {
        // Calculate positions relative to this text node
        const relStart = Math.max(0, highlight.textRange.startOffset - textStart);
        const relEnd = Math.min(text.length, highlight.textRange.endOffset - textStart);

        // Text before highlight
        if (relStart > pos) {
          parts.push(text.substring(pos, relStart));
        }

        // Highlighted text
        parts.push(
          <mark
            key={`h-${highlight.id}-${idx}`}
            className="highlight cursor-pointer transition-all hover:opacity-80"
            style={{
              backgroundColor: highlight.color || HIGHLIGHT_COLORS.yellow,
              padding: '2px 0',
              borderRadius: '2px',
            }}
            onClick={(e) => handleExistingHighlightClick(e, highlight)}
            title={`Click for options (${highlight.commentCount || 0} comments)`}
          >
            {text.substring(relStart, relEnd)}
            {highlight.commentCount > 0 && (
              <span
                style={{
                  marginLeft: '4px',
                  fontSize: '0.8em',
                  verticalAlign: 'super',
                  opacity: 0.7,
                }}
              >
                [{highlight.commentCount}]
              </span>
            )}
          </mark>
        );

        pos = relEnd;
      });

      // Remaining text
      if (pos < text.length) {
        parts.push(text.substring(pos));
      }

      return <>{parts}</>;
    };

    // Process children recursively to handle nested structures
    const processChildren = (children: React.ReactNode): React.ReactNode => {
      if (typeof children === 'string') {
        return processTextNode(children);
      }

      if (Array.isArray(children)) {
        return children.map((child, i) => {
          if (typeof child === 'string') {
            return <React.Fragment key={i}>{processTextNode(child)}</React.Fragment>;
          }
          return child;
        });
      }

      return children;
    };

    // Type for markdown component props
    type MarkdownComponentProps = {
      children?: React.ReactNode;
      [key: string]: unknown;
    };

    // Custom components that process text while preserving structure
    const components = {
      p: ({ children, ...props }: MarkdownComponentProps) => <p {...props}>{processChildren(children)}</p>,
      li: ({ children, ...props }: MarkdownComponentProps) => <li {...props}>{processChildren(children)}</li>,
      h1: ({ children, ...props }: MarkdownComponentProps) => <h1 {...props}>{processChildren(children)}</h1>,
      h2: ({ children, ...props }: MarkdownComponentProps) => <h2 {...props}>{processChildren(children)}</h2>,
      h3: ({ children, ...props }: MarkdownComponentProps) => <h3 {...props}>{processChildren(children)}</h3>,
      h4: ({ children, ...props }: MarkdownComponentProps) => <h4 {...props}>{processChildren(children)}</h4>,
      h5: ({ children, ...props }: MarkdownComponentProps) => <h5 {...props}>{processChildren(children)}</h5>,
      h6: ({ children, ...props }: MarkdownComponentProps) => <h6 {...props}>{processChildren(children)}</h6>,
      strong: ({ children, ...props }: MarkdownComponentProps) => <strong {...props}>{processChildren(children)}</strong>,
      em: ({ children, ...props }: MarkdownComponentProps) => <em {...props}>{processChildren(children)}</em>,
      code: ({ children, ...props }: MarkdownComponentProps) => <code {...props}>{processChildren(children)}</code>,
      a: ({ children, ...props }: MarkdownComponentProps) => <a {...props}>{processChildren(children)}</a>,
      blockquote: ({ children, ...props }: MarkdownComponentProps) => <blockquote {...props}>{processChildren(children)}</blockquote>,
    };

    return (
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={components as React.ComponentProps<typeof ReactMarkdown>['components']}
      >
        {content}
      </ReactMarkdown>
    );
  };

  // Render "Create Highlight" button
  const renderCreateButton = () => {
    if (!showCreateButton || !buttonPosition || isReadOnly) {
      return null;
    }

    const buttonElement = (
      <div
        className="highlight-button"
        style={{
          position: 'fixed',
          left: `${buttonPosition.x}px`,
          top: `${buttonPosition.y}px`,
          transform: 'translate(-50%, 0%)',
          zIndex: 99999,
          animation: 'fadeIn 0.2s ease-out',
        }}
      >
        <button
          onClick={handleShowColorPicker}
          style={{
            padding: '10px 20px',
            fontSize: '14px',
            fontWeight: '600',
            color: 'white',
            background: 'linear-gradient(135deg, var(--theme-primary-500) 0%, var(--theme-primary-700) 100%)',
            border: '1px solid rgba(255, 255, 255, 0.3)',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(20, 184, 166, 0.3)',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            whiteSpace: 'nowrap',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.05)';
            e.currentTarget.style.boxShadow = '0 6px 16px rgba(20, 184, 166, 0.4)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(20, 184, 166, 0.3)';
          }}
        >
          ✨ Create Highlight
        </button>
      </div>
    );

    return ReactDOM.createPortal(buttonElement, document.body);
  };

  // Render color picker
  const renderColorPicker = () => {
    if (!showColorPicker || !buttonPosition || isReadOnly) {
      return null;
    }

    const popoverElement = (
      <div
        className="highlight-color-picker"
        style={{
          position: 'fixed',
          left: `${buttonPosition.x}px`,
          top: `${buttonPosition.y}px`,
          transform: 'translate(-50%, 0%)',
          zIndex: 99999,
          background: 'linear-gradient(135deg, var(--theme-primary-500) 0%, var(--theme-primary-700) 100%)',
          borderRadius: '12px',
          boxShadow: '0 10px 40px rgba(20, 184, 166, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.1)',
          padding: '12px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          animation: 'slideInFromBottom 0.3s ease-out',
          minWidth: '240px',
        }}
      >
        <style>{`
          @keyframes slideInFromBottom {
            from {
              opacity: 0;
              transform: translate(-50%, 10%) scale(0.95);
            }
            to {
              opacity: 1;
              transform: translate(-50%, 0%) scale(1);
            }
          }

          /* Pointer arrow pointing up - uses theme primary-500 */
          .highlight-color-picker::after {
            content: '';
            position: absolute;
            top: -8px;
            left: 50%;
            transform: translateX(-50%);
            width: 0;
            height: 0;
            border-left: 8px solid transparent;
            border-right: 8px solid transparent;
            border-bottom: 8px solid var(--theme-primary-500);
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
            setShowColorPicker(false);
            setButtonPosition(null);
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

  // Render highlight menu (for existing highlights)
  const renderHighlightMenu = () => {
    if (!clickedHighlight || !highlightMenuPosition) {
      return null;
    }

    const menuElement = (
      <div
        className="highlight-menu"
        style={{
          position: 'fixed',
          left: `${highlightMenuPosition.x}px`,
          top: `${highlightMenuPosition.y}px`,
          transform: 'translateX(-50%)',
          zIndex: 99999,
          background: 'white',
          borderRadius: '10px',
          boxShadow: '0 10px 40px rgba(0, 0, 0, 0.2)',
          border: '1px solid rgba(0, 0, 0, 0.1)',
          overflow: 'hidden',
          minWidth: '200px',
          animation: 'fadeIn 0.2s ease-out',
        }}
      >
        <style>{`
          @keyframes fadeIn {
            from { opacity: 0; transform: translateX(-50%) translateY(-10px); }
            to { opacity: 1; transform: translateX(-50%) translateY(0); }
          }
        `}</style>

        {/* View Comments Button */}
        <button
          onClick={handleViewComments}
          style={{
            width: '100%',
            padding: '14px 18px',
            fontSize: '14px',
            fontWeight: '600',
            color: 'var(--theme-primary-700)',
            background: 'none',
            border: 'none',
            borderBottom: '1px solid rgba(0, 0, 0, 0.08)',
            cursor: 'pointer',
            textAlign: 'left',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            transition: 'background-color 0.15s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(20, 184, 166, 0.08)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
        >
          <span style={{ fontSize: '18px' }}>💬</span>
          <span>View Comments ({clickedHighlight.commentCount || 0})</span>
        </button>

        {/* Delete Highlight Button */}
        {onHighlightDelete && (
          <button
            onClick={handleDeleteHighlight}
            style={{
              width: '100%',
              padding: '14px 18px',
              fontSize: '14px',
              fontWeight: '600',
              color: 'var(--theme-error-700)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              textAlign: 'left',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              transition: 'background-color 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.08)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            <span style={{ fontSize: '18px' }}>🗑️</span>
            <span>Delete Highlight</span>
          </button>
        )}
      </div>
    );

    return ReactDOM.createPortal(menuElement, document.body);
  };

  return (
    <>
      <div className={`relative ${className}`}>
        <div
          ref={contentRef}
          className="highlightable-text prose max-w-none"
          onMouseUp={handleMouseUp}
          onTouchEnd={handleTouchEnd}
          style={{ userSelect: 'text' }}
        >
          {renderHighlightedContent()}
        </div>
      </div>

      {/* Render UI elements via portals */}
      {renderCreateButton()}
      {renderColorPicker()}
      {renderHighlightMenu()}
    </>
  );
};
