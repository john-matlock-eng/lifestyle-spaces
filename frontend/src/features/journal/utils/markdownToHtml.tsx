/**
 * Simple markdown to HTML converter for Q&A content
 * Renders markdown with proper formatting while preserving text positions for highlighting
 */

import React from 'react';

export interface MarkdownElement {
  type: 'text' | 'bold' | 'italic' | 'paragraph' | 'list' | 'listItem';
  content: string | MarkdownElement[];
  start: number; // Position in stripped text
  end: number; // Position in stripped text
}

/**
 * Parse markdown into a tree of elements with position tracking
 */
export function parseMarkdownWithPositions(text: string): MarkdownElement[] {
  const lines = text.split('\n');
  const elements: MarkdownElement[] = [];
  let currentPos = 0; // Tracks position in RENDERED text (DOM text content)
  let paragraphStart = 0; // Start position of current paragraph
  let currentParagraph: string[] = [];
  let currentList: MarkdownElement[] = [];

  const flushParagraph = () => {
    if (currentParagraph.length > 0) {
      const content = currentParagraph.join('\n');
      const inlineElements = parseInlineMarkdown(content, paragraphStart);
      elements.push({
        type: 'paragraph',
        content: inlineElements,
        start: paragraphStart,
        end: paragraphStart + content.length,
      });
      currentPos = paragraphStart + content.length;
      currentParagraph = [];
    }
  };

  const flushList = () => {
    if (currentList.length > 0) {
      const listStart = currentList[0].start;
      const listEnd = currentList[currentList.length - 1].end;
      elements.push({
        type: 'list',
        content: currentList,
        start: listStart,
        end: listEnd,
      });
      currentList = [];
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trim();

    // Empty line - paragraph break
    // Don't increment currentPos for empty lines - they don't render as text in the DOM
    if (trimmedLine === '') {
      flushParagraph();
      flushList();
      // Reset paragraph start for next paragraph
      paragraphStart = currentPos;
      continue;
    }

    // List item
    if (trimmedLine.startsWith('- ') || trimmedLine.startsWith('* ')) {
      flushParagraph();
      paragraphStart = currentPos;

      const content = trimmedLine.slice(2); // Remove "- " or "* "
      const itemStart = currentPos;
      const inlineElements = parseInlineMarkdown(content, itemStart);
      const itemEnd = itemStart + content.length;

      currentList.push({
        type: 'listItem',
        content: inlineElements,
        start: itemStart,
        end: itemEnd,
      });

      // Track position based on RENDERED text (content without prefix)
      currentPos = itemEnd;
      continue;
    }

    // Numbered list item
    const numberedMatch = trimmedLine.match(/^(\d+)\.\s+(.+)$/);
    if (numberedMatch) {
      flushParagraph();
      paragraphStart = currentPos;

      const content = numberedMatch[2];
      const itemStart = currentPos;
      const inlineElements = parseInlineMarkdown(content, itemStart);
      const itemEnd = itemStart + content.length;

      currentList.push({
        type: 'listItem',
        content: inlineElements,
        start: itemStart,
        end: itemEnd,
      });

      // Track position based on RENDERED text (content without number prefix)
      currentPos = itemEnd;
      continue;
    }

    // Regular paragraph line
    flushList();
    if (currentParagraph.length === 0) {
      // Starting a new paragraph
      paragraphStart = currentPos;
    }
    currentParagraph.push(line);
  }

  // Flush remaining content
  flushParagraph();
  flushList();

  return elements;
}

/**
 * Parse inline markdown (bold, italic) within a line
 * Tracks positions based on RENDERED text, not source markdown
 */
function parseInlineMarkdown(text: string, startPos: number): MarkdownElement[] {
  const elements: MarkdownElement[] = [];
  let i = 0; // Position in source text
  let renderedPos = startPos; // Position in rendered text
  let currentText = '';
  let currentStart = startPos;

  const flushText = () => {
    if (currentText) {
      elements.push({
        type: 'text',
        content: currentText,
        start: currentStart,
        end: currentStart + currentText.length,
      });
      renderedPos = currentStart + currentText.length;
      currentText = '';
    }
  };

  while (i < text.length) {
    const remaining = text.slice(i);

    // Handle **bold** or __bold__
    if (remaining.startsWith('**') || remaining.startsWith('__')) {
      const marker = remaining.slice(0, 2);
      const endIdx = remaining.indexOf(marker, 2);

      if (endIdx !== -1) {
        flushText();
        const content = remaining.slice(2, endIdx);
        elements.push({
          type: 'bold',
          content,
          start: renderedPos,
          end: renderedPos + content.length,
        });
        renderedPos += content.length;
        i += 2 + content.length + 2; // Skip markers in source
        currentStart = renderedPos;
        continue;
      }
    }

    // Handle *italic* or _italic_
    if ((remaining[0] === '*' || remaining[0] === '_') && remaining.length > 1) {
      const marker = remaining[0];
      const endIdx = remaining.indexOf(marker, 1);

      if (endIdx !== -1 && endIdx > 1) {
        flushText();
        const content = remaining.slice(1, endIdx);
        elements.push({
          type: 'italic',
          content,
          start: renderedPos,
          end: renderedPos + content.length,
        });
        renderedPos += content.length;
        i += 1 + content.length + 1; // Skip markers in source
        currentStart = renderedPos;
        continue;
      }
    }

    // Regular character
    currentText += text[i];
    i++;
  }

  flushText();
  return elements;
}

/**
 * Render markdown elements to React components
 */
export function renderMarkdownElements(
  elements: MarkdownElement[],
  renderText: (text: string, start: number, end: number) => React.ReactNode
): React.ReactNode[] {
  return elements.map((element, index) => {
    switch (element.type) {
      case 'text':
        return <React.Fragment key={index}>{renderText(element.content as string, element.start, element.end)}</React.Fragment>;

      case 'bold':
        return <strong key={index}>{renderText(element.content as string, element.start, element.end)}</strong>;

      case 'italic':
        return <em key={index}>{renderText(element.content as string, element.start, element.end)}</em>;

      case 'paragraph':
        return (
          <p key={index} className="mb-2">
            {renderMarkdownElements(element.content as MarkdownElement[], renderText)}
          </p>
        );

      case 'list':
        return (
          <ul key={index} className="list-disc list-inside mb-2">
            {renderMarkdownElements(element.content as MarkdownElement[], renderText)}
          </ul>
        );

      case 'listItem':
        return (
          <li key={index}>
            {renderMarkdownElements(element.content as MarkdownElement[], renderText)}
          </li>
        );

      default:
        return null;
    }
  });
}
