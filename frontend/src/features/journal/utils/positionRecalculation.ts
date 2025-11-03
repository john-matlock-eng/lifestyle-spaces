/**
 * Position Recalculation Utilities
 *
 * Handles recalculating comment/highlight positions when text is edited.
 * Ensures comments stay anchored to the correct text even after edits.
 */

import type { TextRange, Highlight } from '../types/highlight.types';

export interface TextEdit {
  position: number; // Character position where edit occurred
  deletedLength: number; // Number of characters deleted
  insertedLength: number; // Number of characters inserted
}

/**
 * Recalculate text range after an edit
 * Performance target: < 50ms
 */
export const recalculateTextRange = (
  range: TextRange,
  edit: TextEdit
): TextRange => {
  const { position, deletedLength, insertedLength } = edit;
  const netChange = insertedLength - deletedLength;

  let newStartOffset = range.startOffset;
  let newEndOffset = range.endOffset;

  // Edit is before the range - shift both offsets
  if (position < range.startOffset) {
    newStartOffset = Math.max(position, range.startOffset + netChange);
    newEndOffset = range.endOffset + netChange;
  }
  // Edit is within the range - adjust end offset
  else if (position >= range.startOffset && position <= range.endOffset) {
    newEndOffset = range.endOffset + netChange;
    // If deletion removes part of the range, shrink it
    if (deletedLength > 0) {
      const deletedEnd = position + deletedLength;
      if (deletedEnd > range.endOffset) {
        // Deletion extends past range end
        newEndOffset = position + insertedLength;
      } else {
        // Deletion is within range
        newEndOffset = range.endOffset - deletedLength + insertedLength;
      }
    }
  }
  // Edit is after the range - no change needed

  // Ensure valid range (start < end)
  if (newStartOffset >= newEndOffset) {
    newEndOffset = newStartOffset + 1;
  }

  return {
    ...range,
    startOffset: newStartOffset,
    endOffset: newEndOffset,
  };
};

/**
 * Recalculate all highlights after a text edit
 * Performance target: < 50ms for 100+ highlights
 */
export const recalculateHighlights = (
  highlights: Highlight[],
  edit: TextEdit
): Highlight[] => {
  const startTime = performance.now();

  const recalculated = highlights.map((highlight) => ({
    ...highlight,
    textRange: recalculateTextRange(highlight.textRange, edit),
  }));

  const duration = performance.now() - startTime;
  if (duration > 50) {
    console.warn(`Position recalculation took ${duration.toFixed(2)}ms (target: <50ms)`);
  }

  return recalculated;
};

/**
 * Detect edits from TipTap editor transactions
 * This can be integrated with TipTap's transaction system
 */
export const detectEditsFromTransaction = (
  oldText: string,
  newText: string
): TextEdit | null => {
  // Simple diff algorithm - find first difference
  let position = 0;
  while (
    position < oldText.length &&
    position < newText.length &&
    oldText[position] === newText[position]
  ) {
    position++;
  }

  // Find end of difference
  let oldEnd = oldText.length;
  let newEnd = newText.length;
  while (
    oldEnd > position &&
    newEnd > position &&
    oldText[oldEnd - 1] === newText[newEnd - 1]
  ) {
    oldEnd--;
    newEnd--;
  }

  const deletedLength = oldEnd - position;
  const insertedLength = newEnd - position;

  // No change detected
  if (deletedLength === 0 && insertedLength === 0) {
    return null;
  }

  return {
    position,
    deletedLength,
    insertedLength,
  };
};

/**
 * Validate that a text range is still valid after recalculation
 */
export const isValidTextRange = (
  range: TextRange,
  textLength: number
): boolean => {
  return (
    range.startOffset >= 0 &&
    range.endOffset <= textLength &&
    range.startOffset < range.endOffset
  );
};

/**
 * Calculate DOM position for inline comment display
 * Returns the bounding rect for the text range
 */
export const getTextRangePosition = (
  textRange: TextRange,
  containerElement: HTMLElement
): DOMRect | null => {
  try {
    const textNode = containerElement.firstChild;
    if (!textNode || textNode.nodeType !== Node.TEXT_NODE) {
      return null;
    }

    const range = document.createRange();
    range.setStart(textNode, textRange.startOffset);
    range.setEnd(textNode, textRange.endOffset);

    return range.getBoundingClientRect();
  } catch (error) {
    console.error('Error calculating text range position:', error);
    return null;
  }
};
