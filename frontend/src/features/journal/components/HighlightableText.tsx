/**
 * HighlightableText Component
 *
 * Renders journal text with highlighting capability.
 * Allows users to select text and create highlights with color choices.
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  Highlight,
  HighlightSelection,
  HIGHLIGHT_COLORS,
  HighlightColor
} from '../types/highlight.types';

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
    if (isReadOnly) return;

    const windowSelection = window.getSelection();
    if (!windowSelection || windowSelection.isCollapsed) {
      setSelection(null);
      setPopoverPosition(null);
      return;
    }

    const selectedText = windowSelection.toString().trim();
    if (!selectedText) {
      setSelection(null);
      setPopoverPosition(null);
      return;
    }

    const range = windowSelection.getRangeAt(0);
    const boundingRect = range.getBoundingClientRect();

    // Calculate text offsets
    const container = contentRef.current;
    if (!container) return;

    const preSelectionRange = document.createRange();
    preSelectionRange.selectNodeContents(container);
    preSelectionRange.setEnd(range.startContainer, range.startOffset);
    const startOffset = preSelectionRange.toString().length;
    const endOffset = startOffset + selectedText.length;

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

    setPopoverPosition({
      x: boundingRect.left + boundingRect.width / 2,
      y: boundingRect.top - 10,
    });
  }, [isReadOnly]);

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
  const handleCreateHighlight = useCallback((_color: HighlightColor = 'yellow') => {
    if (selection) {
      onHighlightCreate(selection);
      setSelection(null);
      setPopoverPosition(null);
      window.getSelection()?.removeAllRanges();
    }
  }, [selection, onHighlightCreate]);

  // Render text with highlights
  const renderHighlightedContent = () => {
    if (highlights.length === 0) {
      return <div dangerouslySetInnerHTML={{ __html: content }} />;
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
          className="highlight-popover fixed z-50 bg-white rounded-lg shadow-lg border border-gray-200 p-2 flex gap-2"
          style={{
            left: `${popoverPosition.x}px`,
            top: `${popoverPosition.y}px`,
            transform: 'translate(-50%, -100%)',
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
