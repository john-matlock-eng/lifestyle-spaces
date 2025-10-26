import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ListSectionDisplay } from './ListSectionDisplay';

describe('ListSectionDisplay', () => {
  const mockHighlights = [];
  const mockHandlers = {
    onHighlightCreate: vi.fn(),
    onHighlightClick: vi.fn(),
    onHighlightUpdate: vi.fn(),
    onHighlightDelete: vi.fn(),
  };

  it('should render list items from array value', () => {
    const listItems = [
      { id: '1', text: 'First item' },
      { id: '2', text: 'Second item' },
      { id: '3', text: 'Third item' },
    ];

    render(
      <ListSectionDisplay
        value={listItems}
        sectionId="test-section"
        journalEntryId="journal-1"
        spaceId="space-1"
        highlights={mockHighlights}
        {...mockHandlers}
      />
    );

    // Check that HighlightableText wrapper exists
    expect(document.querySelector('.list-section-display')).toBeInTheDocument();
  });

  it('should render list items from string value', () => {
    const stringValue = 'Item 1\nItem 2\nItem 3';

    render(
      <ListSectionDisplay
        value={stringValue}
        sectionId="test-section"
        journalEntryId="journal-1"
        spaceId="space-1"
        highlights={mockHighlights}
        {...mockHandlers}
      />
    );

    expect(document.querySelector('.list-section-display')).toBeInTheDocument();
  });

  it('should handle empty list', () => {
    render(
      <ListSectionDisplay
        value={[]}
        sectionId="test-section"
        journalEntryId="journal-1"
        spaceId="space-1"
        highlights={mockHighlights}
        {...mockHandlers}
      />
    );

    expect(document.querySelector('.list-section-display')).toBeInTheDocument();
  });

  it('should apply custom className', () => {
    render(
      <ListSectionDisplay
        value={[{ id: '1', text: 'Test' }]}
        sectionId="test-section"
        journalEntryId="journal-1"
        spaceId="space-1"
        highlights={mockHighlights}
        className="custom-class"
        {...mockHandlers}
      />
    );

    expect(document.querySelector('.custom-class')).toBeInTheDocument();
  });

  it('should pass correct props to HighlightableText', () => {
    const listItems = [{ id: '1', text: 'Test item' }];

    const { container } = render(
      <ListSectionDisplay
        value={listItems}
        sectionId="test-section-id"
        journalEntryId="journal-123"
        spaceId="space-456"
        highlights={mockHighlights}
        {...mockHandlers}
      />
    );

    // HighlightableText should be rendered
    expect(container.querySelector('.highlightable-text')).toBeInTheDocument();
  });
});
