/**
 * CitationCard Component Tests
 *
 * Tests for the expandable citation card component used in chat responses.
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CitationCard } from '../CitationCard';
import { chatApi } from '../../api';
import type { JournalCitation } from '../../types';

// Mock the API
vi.mock('../../api', () => ({
  chatApi: {
    getJournalSection: vi.fn(),
  },
}));

// Mock framer-motion to avoid animation issues in tests
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => (
      <div {...props}>{children}</div>
    ),
  },
  AnimatePresence: ({ children }: React.PropsWithChildren) => <>{children}</>,
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useLocation: () => ({
      pathname: '/spaces/space-456/chat',
      search: '?conversation=conv-123',
    }),
  };
});

const mockCitation: JournalCitation = {
  journalId: 'journal-123',
  title: 'Personal Charter: Q1 2026',
  sectionTitle: 'The Practice',
  sectionIndex: 2,
  relevanceScore: 0.31,
  excerpt: 'How I build the foundation for physical sovereignty...',
  createdAt: '2025-12-22',
};

const mockSectionContent = {
  sectionIndex: 2,
  sectionTitle: 'The Practice',
  content:
    'Full content of the section goes here. This is much longer than the excerpt and contains the complete section text.',
  wordCount: 150,
  journalTitle: 'Personal Charter: Q1 2026',
  createdAt: '2025-12-22',
};

describe('CitationCard', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    vi.mocked(chatApi.getJournalSection).mockClear();
    sessionStorage.clear();
  });

  describe('Collapsed State', () => {
    it('renders citation information', () => {
      render(
        <BrowserRouter>
          <CitationCard citation={mockCitation} spaceId="space-456" />
        </BrowserRouter>
      );

      expect(screen.getByText('Personal Charter: Q1 2026')).toBeInTheDocument();
      expect(screen.getByText('The Practice')).toBeInTheDocument();
      expect(screen.getByText('31%')).toBeInTheDocument();
    });

    it('shows excerpt in collapsed state', () => {
      render(
        <BrowserRouter>
          <CitationCard citation={mockCitation} spaceId="space-456" />
        </BrowserRouter>
      );

      expect(screen.getByText(/How I build the foundation/)).toBeInTheDocument();
    });

    it('shows expand button', () => {
      render(
        <BrowserRouter>
          <CitationCard citation={mockCitation} spaceId="space-456" />
        </BrowserRouter>
      );

      expect(screen.getByLabelText('Expand section')).toBeInTheDocument();
    });

    it('navigates to journal on card click', () => {
      render(
        <BrowserRouter>
          <CitationCard citation={mockCitation} spaceId="space-456" />
        </BrowserRouter>
      );

      // Click on the card itself
      fireEvent.click(screen.getByRole('button', { name: /from/i }));

      expect(mockNavigate).toHaveBeenCalledWith(
        expect.stringContaining('/spaces/space-456/journals/journal-123')
      );
      expect(mockNavigate).toHaveBeenCalledWith(expect.stringContaining('section=2'));
    });

    it('stores return path in sessionStorage before navigation', () => {
      render(
        <BrowserRouter>
          <CitationCard citation={mockCitation} spaceId="space-456" />
        </BrowserRouter>
      );

      fireEvent.click(screen.getByRole('button', { name: /from/i }));

      expect(sessionStorage.getItem('chatReturnPath')).toBe(
        '/spaces/space-456/chat?conversation=conv-123'
      );
    });
  });

  describe('Expand/Collapse', () => {
    it('fetches and displays full content on expand', async () => {
      vi.mocked(chatApi.getJournalSection).mockResolvedValue(mockSectionContent);

      render(
        <BrowserRouter>
          <CitationCard citation={mockCitation} spaceId="space-456" />
        </BrowserRouter>
      );

      // Click expand button
      fireEvent.click(screen.getByLabelText('Expand section'));

      // Should show loading state
      expect(screen.getByText('Loading section...')).toBeInTheDocument();

      // Wait for content
      await waitFor(() => {
        expect(screen.getByText(/Full content of the section/)).toBeInTheDocument();
      });

      // Should show word count
      expect(screen.getByText('150 words')).toBeInTheDocument();

      // Should show "View in Journal" button
      expect(screen.getByText(/View in Journal/)).toBeInTheDocument();
    });

    it('calls API with correct parameters', async () => {
      vi.mocked(chatApi.getJournalSection).mockResolvedValue(mockSectionContent);

      render(
        <BrowserRouter>
          <CitationCard citation={mockCitation} spaceId="space-456" />
        </BrowserRouter>
      );

      fireEvent.click(screen.getByLabelText('Expand section'));

      await waitFor(() => {
        expect(chatApi.getJournalSection).toHaveBeenCalledWith('space-456', 'journal-123', 2);
      });
    });

    it('collapses on second click', async () => {
      vi.mocked(chatApi.getJournalSection).mockResolvedValue(mockSectionContent);

      render(
        <BrowserRouter>
          <CitationCard citation={mockCitation} spaceId="space-456" />
        </BrowserRouter>
      );

      // Expand
      fireEvent.click(screen.getByLabelText('Expand section'));

      await waitFor(() => {
        expect(screen.getByText(/Full content/)).toBeInTheDocument();
      });

      // Collapse
      fireEvent.click(screen.getByLabelText('Collapse section'));

      // Should show excerpt again
      await waitFor(() => {
        expect(screen.getByText(/How I build the foundation/)).toBeInTheDocument();
      });
    });

    it('does not re-fetch on second expand', async () => {
      vi.mocked(chatApi.getJournalSection).mockResolvedValue(mockSectionContent);

      render(
        <BrowserRouter>
          <CitationCard citation={mockCitation} spaceId="space-456" />
        </BrowserRouter>
      );

      // Expand
      fireEvent.click(screen.getByLabelText('Expand section'));
      await waitFor(() => {
        expect(screen.getByText(/Full content/)).toBeInTheDocument();
      });

      // Collapse
      fireEvent.click(screen.getByLabelText('Collapse section'));

      // Expand again
      await waitFor(() => {
        fireEvent.click(screen.getByLabelText('Expand section'));
      });

      // API should only be called once
      expect(chatApi.getJournalSection).toHaveBeenCalledTimes(1);
    });

    it('shows error state on fetch failure', async () => {
      vi.mocked(chatApi.getJournalSection).mockRejectedValue(new Error('Network error'));

      render(
        <BrowserRouter>
          <CitationCard citation={mockCitation} spaceId="space-456" />
        </BrowserRouter>
      );

      fireEvent.click(screen.getByLabelText('Expand section'));

      await waitFor(() => {
        expect(screen.getByText('Failed to load section content')).toBeInTheDocument();
      });

      // Should show retry button
      expect(screen.getByText('Retry')).toBeInTheDocument();
    });

    it('retries fetch on retry button click', async () => {
      vi.mocked(chatApi.getJournalSection)
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce(mockSectionContent);

      render(
        <BrowserRouter>
          <CitationCard citation={mockCitation} spaceId="space-456" />
        </BrowserRouter>
      );

      // First attempt fails
      fireEvent.click(screen.getByLabelText('Expand section'));
      await waitFor(() => {
        expect(screen.getByText('Retry')).toBeInTheDocument();
      });

      // Retry
      fireEvent.click(screen.getByText('Retry'));

      // Should succeed
      await waitFor(() => {
        expect(screen.getByText(/Full content/)).toBeInTheDocument();
      });
    });
  });

  describe('Keyboard Navigation', () => {
    it('Enter navigates to journal', () => {
      render(
        <BrowserRouter>
          <CitationCard citation={mockCitation} spaceId="space-456" />
        </BrowserRouter>
      );

      const card = screen.getByRole('button', { name: /from/i });
      fireEvent.keyDown(card, { key: 'Enter' });

      expect(mockNavigate).toHaveBeenCalled();
    });

    it('Space toggles expand', async () => {
      vi.mocked(chatApi.getJournalSection).mockResolvedValue(mockSectionContent);

      render(
        <BrowserRouter>
          <CitationCard citation={mockCitation} spaceId="space-456" />
        </BrowserRouter>
      );

      const card = screen.getByRole('button', { name: /from/i });
      fireEvent.keyDown(card, { key: ' ' });

      await waitFor(() => {
        expect(screen.getByText(/Full content/)).toBeInTheDocument();
      });
    });

    it('Shift+Enter toggles expand', async () => {
      vi.mocked(chatApi.getJournalSection).mockResolvedValue(mockSectionContent);

      render(
        <BrowserRouter>
          <CitationCard citation={mockCitation} spaceId="space-456" />
        </BrowserRouter>
      );

      const card = screen.getByRole('button', { name: /from/i });
      fireEvent.keyDown(card, { key: 'Enter', shiftKey: true });

      await waitFor(() => {
        expect(screen.getByText(/Full content/)).toBeInTheDocument();
      });
    });
  });

  describe('Expanded State Navigation', () => {
    it('View in Journal button navigates', async () => {
      vi.mocked(chatApi.getJournalSection).mockResolvedValue(mockSectionContent);

      render(
        <BrowserRouter>
          <CitationCard citation={mockCitation} spaceId="space-456" />
        </BrowserRouter>
      );

      // Expand
      fireEvent.click(screen.getByLabelText('Expand section'));
      await waitFor(() => {
        expect(screen.getByText(/View in Journal/)).toBeInTheDocument();
      });

      // Click View in Journal
      fireEvent.click(screen.getByText(/View in Journal/));

      expect(mockNavigate).toHaveBeenCalledWith(
        expect.stringContaining('/spaces/space-456/journals/journal-123')
      );
    });

    it('does not navigate when clicking expanded content area', async () => {
      vi.mocked(chatApi.getJournalSection).mockResolvedValue(mockSectionContent);

      render(
        <BrowserRouter>
          <CitationCard citation={mockCitation} spaceId="space-456" />
        </BrowserRouter>
      );

      // Expand
      fireEvent.click(screen.getByLabelText('Expand section'));
      await waitFor(() => {
        expect(screen.getByText(/Full content/)).toBeInTheDocument();
      });

      // Clear navigate mock
      mockNavigate.mockClear();

      // Click on the card body (not the View in Journal button)
      fireEvent.click(screen.getByRole('button', { name: /from/i }));

      // Should not navigate when expanded
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  describe('Without Section Title', () => {
    it('renders without section title', () => {
      const citationWithoutSection: JournalCitation = {
        ...mockCitation,
        sectionTitle: undefined,
      };

      render(
        <BrowserRouter>
          <CitationCard citation={citationWithoutSection} spaceId="space-456" />
        </BrowserRouter>
      );

      expect(screen.getByText('Personal Charter: Q1 2026')).toBeInTheDocument();
      expect(screen.queryByText('The Practice')).not.toBeInTheDocument();
    });
  });

  describe('Without Excerpt', () => {
    it('renders without excerpt', () => {
      const citationWithoutExcerpt: JournalCitation = {
        ...mockCitation,
        excerpt: undefined,
      };

      render(
        <BrowserRouter>
          <CitationCard citation={citationWithoutExcerpt} spaceId="space-456" />
        </BrowserRouter>
      );

      expect(screen.getByText('Personal Charter: Q1 2026')).toBeInTheDocument();
      expect(screen.queryByText(/How I build the foundation/)).not.toBeInTheDocument();
    });
  });

  describe('Relevance Score Display', () => {
    it('displays relevance score as percentage', () => {
      render(
        <BrowserRouter>
          <CitationCard citation={mockCitation} spaceId="space-456" />
        </BrowserRouter>
      );

      expect(screen.getByText('31%')).toBeInTheDocument();
    });

    it('rounds relevance score correctly', () => {
      const citationWithHighScore: JournalCitation = {
        ...mockCitation,
        relevanceScore: 0.856,
      };

      render(
        <BrowserRouter>
          <CitationCard citation={citationWithHighScore} spaceId="space-456" />
        </BrowserRouter>
      );

      expect(screen.getByText('86%')).toBeInTheDocument();
    });
  });
});
