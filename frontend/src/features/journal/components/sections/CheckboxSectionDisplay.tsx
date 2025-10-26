/**
 * CheckboxSectionDisplay - Read-only display component for Checkbox sections with highlighting support
 *
 * Wraps checkbox text in HighlightableText to enable highlighting and commenting.
 */
import React from 'react';
import { HighlightableText } from '../HighlightableText';
import type { Highlight } from '../../types/highlight.types';
import type { HighlightSelection, HighlightColor } from '../../types/highlight.types';

interface CheckboxItem {
  id?: string;
  text: string;
  checked?: boolean;
}

interface CheckboxSectionDisplayProps {
  value: CheckboxItem[] | string;
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

export const CheckboxSectionDisplay: React.FC<CheckboxSectionDisplayProps> = ({
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
  // Parse value to checkbox items
  const items: CheckboxItem[] = typeof value === 'string'
    ? JSON.parse(value || '[]')
    : value || [];

  // Convert checkbox items to markdown format with checkbox syntax
  const markdownContent = items
    .map(item => {
      const checked = item.checked !== undefined ? item.checked : true;
      return `- [${checked ? 'x' : ' '}] ${item.text}`;
    })
    .join('\n');

  return (
    <div className={`checkbox-section-display ${className}`}>
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
        className="checkbox-section-content"
      />
    </div>
  );
};
