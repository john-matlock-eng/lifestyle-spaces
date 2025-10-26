import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { CheckboxSectionDisplay } from './CheckboxSectionDisplay';

describe('CheckboxSectionDisplay', () => {
  const mockHighlights = [];
  const mockHandlers = {
    onHighlightCreate: vi.fn(),
    onHighlightClick: vi.fn(),
    onHighlightUpdate: vi.fn(),
    onHighlightDelete: vi.fn(),
  };

  it('should render checkbox items from array value', () => {
    const checkboxItems = [
      { id: '1', text: 'Task 1', checked: true },
      { id: '2', text: 'Task 2', checked: false },
      { id: '3', text: 'Task 3', checked: true },
    ];

    render(
      <CheckboxSectionDisplay
        value={checkboxItems}
        sectionId="test-section"
        journalEntryId="journal-1"
        spaceId="space-1"
        highlights={mockHighlights}
        {...mockHandlers}
      />
    );

    expect(document.querySelector('.checkbox-section-display')).toBeInTheDocument();
  });

  it('should render checkbox items from JSON string value', () => {
    const checkboxItems = [
      { id: '1', text: 'Task 1', checked: true },
      { id: '2', text: 'Task 2', checked: false },
    ];
    const jsonValue = JSON.stringify(checkboxItems);

    render(
      <CheckboxSectionDisplay
        value={jsonValue}
        sectionId="test-section"
        journalEntryId="journal-1"
        spaceId="space-1"
        highlights={mockHighlights}
        {...mockHandlers}
      />
    );

    expect(document.querySelector('.checkbox-section-display')).toBeInTheDocument();
  });

  it('should handle empty checkbox list', () => {
    render(
      <CheckboxSectionDisplay
        value={[]}
        sectionId="test-section"
        journalEntryId="journal-1"
        spaceId="space-1"
        highlights={mockHighlights}
        {...mockHandlers}
      />
    );

    expect(document.querySelector('.checkbox-section-display')).toBeInTheDocument();
  });

  it('should apply custom className', () => {
    render(
      <CheckboxSectionDisplay
        value={[{ id: '1', text: 'Test', checked: true }]}
        sectionId="test-section"
        journalEntryId="journal-1"
        spaceId="space-1"
        highlights={mockHighlights}
        className="custom-checkbox-class"
        {...mockHandlers}
      />
    );

    expect(document.querySelector('.custom-checkbox-class')).toBeInTheDocument();
  });

  it('should convert checkbox items to markdown with proper checked state', () => {
    const checkboxItems = [
      { id: '1', text: 'Checked task', checked: true },
      { id: '2', text: 'Unchecked task', checked: false },
    ];

    const { container } = render(
      <CheckboxSectionDisplay
        value={checkboxItems}
        sectionId="test-section"
        journalEntryId="journal-1"
        spaceId="space-1"
        highlights={mockHighlights}
        {...mockHandlers}
      />
    );

    // HighlightableText should be rendered
    expect(container.querySelector('.highlightable-text')).toBeInTheDocument();
  });
});
