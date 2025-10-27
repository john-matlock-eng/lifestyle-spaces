/**
 * ListSectionDisplay - Read-only display component for List sections with highlighting support
 *
 * Wraps list content in HighlightableText to enable highlighting and commenting on list items.
 */
import React from 'react';
import { HighlightableText } from '../HighlightableText';
import type { Highlight } from '../../types/highlight.types';
import type { HighlightSelection, HighlightColor } from '../../types/highlight.types';

interface ListItem {
  id?: string;
  text: string;
}

interface ListSectionDisplayProps {
  value: ListItem[] | string;
  sectionId: string;
  journalEntryId: string;
  spaceId: string;
  highlights: Highlight[];
  onHighlightCreate: (selection: HighlightSelection, color: HighlightColor) => void;
  onHighlightClick: (highlight: Highlight) => void;
  onHighlightUpdate?: (highlightId: string, selection: HighlightSelection) => void;
  onHighlightDelete?: (highlightId: string) => void;
  isReadOnly?: boolean;
  className?: string;
}

export const ListSectionDisplay: React.FC<ListSectionDisplayProps> = ({
  value,
  sectionId,
  journalEntryId,
  spaceId,
  highlights,
  onHighlightCreate,
  onHighlightClick,
  onHighlightUpdate,
  onHighlightDelete,
  isReadOnly = false,
  className = ''
}) => {
  // Parse value to list items
  let items: ListItem[] = [];

  if (typeof value === 'string') {
    try {
      // Try to parse as JSON first (structured data)
      items = JSON.parse(value || '[]');
    } catch {
      // Fallback: split by newlines (plain text)
      items = value ? value.split('\n').map((text, idx) => ({ id: `item-${idx}`, text })) : [];
    }
  } else {
    items = value || [];
  }

  // Convert list items to markdown format for HighlightableText
  // Use bullet points to make it look like a list
  const markdownContent = items
    .map(item => `• ${item.text}`)
    .join('\n\n');

  return (
    <div className={`list-section-display ${className}`}>
      <HighlightableText
        content={markdownContent}
        highlights={highlights}
        journalEntryId={journalEntryId}
        spaceId={spaceId}
        sectionId={sectionId}
        onHighlightCreate={onHighlightCreate}
        onHighlightClick={onHighlightClick}
        onHighlightUpdate={onHighlightUpdate}
        onHighlightDelete={onHighlightDelete}
        isReadOnly={isReadOnly}
        className="list-section-content"
      />
    </div>
  );
};
