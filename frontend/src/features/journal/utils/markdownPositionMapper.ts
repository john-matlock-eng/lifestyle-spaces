/**
 * Utility for mapping character positions between markdown source and stripped text.
 *
 * This handles the issue where markdown symbols (**, -, etc.) affect character offsets
 * when calculating highlight positions.
 */

export interface PositionMap {
  /** The original markdown text */
  source: string;
  /** Text with markdown symbols stripped */
  stripped: string;
  /** Map from stripped position to source position */
  strippedToSource: Map<number, number>;
  /** Map from source position to stripped position */
  sourceToStripped: Map<number, number>;
}

/**
 * Strip markdown formatting and create bidirectional position mapping
 */
export function createPositionMap(markdown: string): PositionMap {
  const stripped: string[] = [];
  const strippedToSource = new Map<number, number>();
  const sourceToStripped = new Map<number, number>();

  let strippedPos = 0;
  let sourcePos = 0;
  let i = 0;

  while (i < markdown.length) {
    const char = markdown[i];
    const remaining = markdown.slice(i);

    // Handle **bold** or __bold__
    if (remaining.startsWith('**') || remaining.startsWith('__')) {
      const marker = remaining.slice(0, 2);
      const endIdx = remaining.indexOf(marker, 2);

      if (endIdx !== -1) {
        // Found closing marker
        const content = remaining.slice(2, endIdx);

        // Skip opening marker
        sourcePos = i + 2;

        // Map the content
        for (let j = 0; j < content.length; j++) {
          strippedToSource.set(strippedPos, sourcePos);
          sourceToStripped.set(sourcePos, strippedPos);
          stripped.push(content[j]);
          strippedPos++;
          sourcePos++;
        }

        // Skip closing marker
        i = i + 2 + content.length + 2;
        continue;
      }
    }

    // Handle *italic* or _italic_
    if ((char === '*' || char === '_') && remaining.length > 1) {
      const marker = char;
      const endIdx = remaining.indexOf(marker, 1);

      if (endIdx !== -1 && endIdx > 1) {
        // Found closing marker
        const content = remaining.slice(1, endIdx);

        // Skip opening marker
        sourcePos = i + 1;

        // Map the content
        for (let j = 0; j < content.length; j++) {
          strippedToSource.set(strippedPos, sourcePos);
          sourceToStripped.set(sourcePos, strippedPos);
          stripped.push(content[j]);
          strippedPos++;
          sourcePos++;
        }

        // Skip closing marker
        i = i + 1 + content.length + 1;
        continue;
      }
    }

    // Handle list markers: "- " or "* " at start of line
    if ((char === '-' || char === '*') && (i === 0 || markdown[i - 1] === '\n')) {
      if (i + 1 < markdown.length && markdown[i + 1] === ' ') {
        // Skip the "- " or "* "
        i += 2;
        sourcePos = i;
        continue;
      }
    }

    // Handle numbered lists: "1. " etc
    if (char >= '0' && char <= '9' && (i === 0 || markdown[i - 1] === '\n')) {
      let j = i + 1;
      while (j < markdown.length && markdown[j] >= '0' && markdown[j] <= '9') {
        j++;
      }
      if (j < markdown.length && markdown[j] === '.' && j + 1 < markdown.length && markdown[j + 1] === ' ') {
        // Skip the "1. " etc
        i = j + 2;
        sourcePos = i;
        continue;
      }
    }

    // Regular character - map it
    strippedToSource.set(strippedPos, i);
    sourceToStripped.set(i, strippedPos);
    stripped.push(char);
    strippedPos++;
    i++;
    sourcePos = i;
  }

  return {
    source: markdown,
    stripped: stripped.join(''),
    strippedToSource,
    sourceToStripped,
  };
}

/**
 * Convert an offset from stripped text space to source markdown space
 */
export function strippedToSourceOffset(map: PositionMap, strippedOffset: number): number {
  return map.strippedToSource.get(strippedOffset) ?? strippedOffset;
}

/**
 * Convert an offset from source markdown space to stripped text space
 */
export function sourceToStrippedOffset(map: PositionMap, sourceOffset: number): number {
  return map.sourceToStripped.get(sourceOffset) ?? sourceOffset;
}

/**
 * Convert a text range from stripped space to source space
 */
export function strippedRangeToSource(
  map: PositionMap,
  strippedStart: number,
  strippedEnd: number
): { start: number; end: number } {
  return {
    start: strippedToSourceOffset(map, strippedStart),
    end: strippedToSourceOffset(map, strippedEnd),
  };
}

/**
 * Convert a text range from source space to stripped space
 */
export function sourceRangeToStripped(
  map: PositionMap,
  sourceStart: number,
  sourceEnd: number
): { start: number; end: number } {
  return {
    start: sourceToStrippedOffset(map, sourceStart),
    end: sourceToStrippedOffset(map, sourceEnd),
  };
}
