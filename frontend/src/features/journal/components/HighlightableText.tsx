/**
 * HighlightableText Component
 *
 * Renders journal text with highlighting capability.
 * Allows users to select text and create highlights with color choices.
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
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
  onHighlightCreate: (selection: HighlightSelection) => void;
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

      // Position popover above selection, but keep it on screen
      // With transform: translate(-50%, -100%), we need extra space above
      const popoverHeight = 60; // Approximate height of popover
      const minTop = popoverHeight + 20; // Minimum distance from top of viewport

      const popoverPos = {
        x: boundingRect.left + boundingRect.width / 2,
        y: Math.max(minTop, boundingRect.top - 10),
      };

      console.log('[HighlightableText] Setting popover position:', popoverPos);
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
        if (!target.closest('.highlight-popover') && !target.closest('.highlightable-text')) {
          setSelection(null);
          setPopoverPosition(null);
          window.getSelection()?.removeAllRanges();
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [selection, popoverPosition]);

  // Create highlight with selected color
  const handleCreateHighlight = useCallback((color: HighlightColor = 'yellow') => {
    if (selection) {
      // TODO: Use color parameter when passing to onHighlightCreate
      void color; // Suppress unused warning
      onHighlightCreate(selection);
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
          style={{ backgroundColor: highlight.color || HIGHLIGHT_COLORS.yellow }}
          onClick={() => onHighlightClick(highlight)}
          title={`Click to view comments (${highlight.commentCount})`}
        >
          {content.substring(startOffset, endOffset)}
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

  return (
    <div className={`relative ${className}`}>
      <div
        ref={contentRef}
        className="highlightable-text prose max-w-none"
        onMouseUp={handleMouseUp}
      >
        {renderHighlightedContent()}
      </div>

      {/* Highlight Color Popover */}
      {selection && popoverPosition && !isReadOnly && (
        <div
          className="highlight-popover fixed bg-white rounded-lg shadow-lg border-4 border-red-500 p-2 flex gap-2"
          style={{
            left: `${popoverPosition.x}px`,
            top: `${popoverPosition.y}px`,
            transform: 'translate(-50%, -100%)',
            zIndex: 9999,
          }}
        >
          {(Object.keys(HIGHLIGHT_COLORS) as HighlightColor[]).map((color) => (
            <button
              key={color}
              className="w-8 h-8 rounded border-2 border-gray-300 hover:border-gray-500 transition-colors"
              style={{ backgroundColor: HIGHLIGHT_COLORS[color] }}
              onClick={() => handleCreateHighlight(color)}
              title={`Highlight in ${color}`}
            />
          ))}
          <button
            className="ml-2 px-3 py-1 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded"
            onClick={() => {
              setSelection(null);
              setPopoverPosition(null);
              window.getSelection()?.removeAllRanges();
            }}
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
};
