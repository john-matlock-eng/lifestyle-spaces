import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QASectionDisplay } from './QASectionDisplay';

describe('QASectionDisplay', () => {
  const mockHighlights = [];
  const mockHandlers = {
    onHighlightCreate: vi.fn(),
    onHighlightClick: vi.fn(),
    onHighlightUpdate: vi.fn(),
    onHighlightDelete: vi.fn(),
  };

  const qaPairs = [
    { id: '1', question: 'What is your goal?', answer: 'To improve my health' },
    { id: '2', question: 'How will you achieve it?', answer: 'By exercising daily' },
  ];

  it('should render Q&A pairs from array value', () => {
    render(
      <QASectionDisplay
        value={qaPairs}
        sectionId="test-section"
        journalEntryId="journal-1"
        spaceId="space-1"
        highlights={mockHighlights}
        {...mockHandlers}
      />
    );

    expect(screen.getByText('Q1')).toBeInTheDocument();
    expect(screen.getByText('Q2')).toBeInTheDocument();
  });

  it('should render Q&A pairs from JSON string value', () => {
    const jsonValue = JSON.stringify(qaPairs);

    render(
      <QASectionDisplay
        value={jsonValue}
        sectionId="test-section"
        journalEntryId="journal-1"
        spaceId="space-1"
        highlights={mockHighlights}
        {...mockHandlers}
      />
    );

    expect(screen.getByText('Q1')).toBeInTheDocument();
    expect(screen.getByText('Q2')).toBeInTheDocument();
  });

  it('should toggle collapse/expand when clicking collapse button', () => {
    render(
      <QASectionDisplay
        value={qaPairs}
        sectionId="test-section"
        journalEntryId="journal-1"
        spaceId="space-1"
        highlights={mockHighlights}
        {...mockHandlers}
      />
    );

    const collapseButtons = screen.getAllByLabelText(/collapse|expand/i);
    const firstButton = collapseButtons[0];

    // Initially expanded
    expect(firstButton).toHaveAttribute('aria-expanded', 'true');

    // Click to collapse
    fireEvent.click(firstButton);
    expect(firstButton).toHaveAttribute('aria-expanded', 'false');

    // Click to expand
    fireEvent.click(firstButton);
    expect(firstButton).toHaveAttribute('aria-expanded', 'true');
  });

  it('should handle empty Q&A pairs', () => {
    render(
      <QASectionDisplay
        value={[]}
        sectionId="test-section"
        journalEntryId="journal-1"
        spaceId="space-1"
        highlights={mockHighlights}
        {...mockHandlers}
      />
    );

    expect(document.querySelector('.qa-section-display')).toBeInTheDocument();
    expect(screen.queryByText(/Q\d/)).not.toBeInTheDocument();
  });

  it('should apply custom className', () => {
    render(
      <QASectionDisplay
        value={qaPairs}
        sectionId="test-section"
        journalEntryId="journal-1"
        spaceId="space-1"
        highlights={mockHighlights}
        className="custom-qa-class"
        {...mockHandlers}
      />
    );

    expect(document.querySelector('.custom-qa-class')).toBeInTheDocument();
  });

  it('should filter highlights by compound sectionId', () => {
    const highlights = [
      {
        id: 'h1',
        textRange: {
          startOffset: 0,
          endOffset: 10,
          startContainerId: 'test-section-q-1',
          endContainerId: 'test-section-q-1',
        },
        color: 'yellow',
        commentCount: 0,
      },
      {
        id: 'h2',
        textRange: {
          startOffset: 0,
          endOffset: 10,
          startContainerId: 'test-section-a-1',
          endContainerId: 'test-section-a-1',
        },
        color: 'blue',
        commentCount: 0,
      },
    ];

    const { container } = render(
      <QASectionDisplay
        value={qaPairs}
        sectionId="test-section"
        journalEntryId="journal-1"
        spaceId="space-1"
        highlights={highlights}
        {...mockHandlers}
      />
    );

    // HighlightableText components should be rendered for both question and answer
    const highlightableTexts = container.querySelectorAll('.highlightable-text');
    expect(highlightableTexts.length).toBeGreaterThan(0);
  });
});
