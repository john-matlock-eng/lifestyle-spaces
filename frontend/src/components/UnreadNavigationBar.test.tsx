/**
 * Tests for UnreadNavigationBar Component
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ConversationThread } from '../types/conversation';

// Mock the context before imports
const mockNavigateToNext = vi.fn();
const mockNavigateToPrevious = vi.fn();
const mockExitNavigation = vi.fn();

const mockThread: ConversationThread = {
  threadId: 'thread-1',
  threadType: 'highlight',
  journalId: 'journal-1',
  journalTitle: 'Test Journal Entry',
  journalAuthorId: 'author-1',
  journalAuthorName: 'Author',
  highlightText: 'Highlighted text',
  highlightColor: '#ffeb3b',
  lastActivity: '2024-01-01T00:00:00Z',
  createdAt: '2024-01-01T00:00:00Z',
  commentCount: 5,
  participants: ['User 1'],
  participantIds: ['user-1'],
  userParticipated: true,
  userStarted: false,
  userLastSeen: null,
  userLastComment: null,
  isUnread: true,
  unreadCount: 3,
  hasReplyToUser: true,
  latestCommentText: 'Latest comment',
  latestCommentAuthor: 'User 1',
  latestCommentAuthorId: 'user-1',
  latestCommentTime: '2024-01-01T00:00:00Z',
};

let mockContextValue = {
  state: {
    unreadThreads: [mockThread],
    currentIndex: 0,
    spaceId: 'space-1',
    isActive: true,
  },
  enterUnreadNavigation: vi.fn(),
  navigateToNext: mockNavigateToNext,
  navigateToPrevious: mockNavigateToPrevious,
  markCurrentAsRead: vi.fn(),
  exitNavigation: mockExitNavigation,
  hasNext: true,
  hasPrevious: false,
  currentThread: mockThread,
  remainingCount: 3,
  totalCount: 3,
};

vi.mock('../contexts/UnreadNavigationContext', () => ({
  useUnreadNavigation: () => mockContextValue,
}));

// Import after mock
import { UnreadNavigationBar } from './UnreadNavigationBar';

describe('UnreadNavigationBar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset to default mock values
    mockContextValue = {
      state: {
        unreadThreads: [mockThread],
        currentIndex: 0,
        spaceId: 'space-1',
        isActive: true,
      },
      enterUnreadNavigation: vi.fn(),
      navigateToNext: mockNavigateToNext,
      navigateToPrevious: mockNavigateToPrevious,
      markCurrentAsRead: vi.fn(),
      exitNavigation: mockExitNavigation,
      hasNext: true,
      hasPrevious: false,
      currentThread: mockThread,
      remainingCount: 3,
      totalCount: 3,
    };
  });

  describe('Rendering', () => {
    it('should not render when navigation is inactive', () => {
      mockContextValue.state.isActive = false;
      const { container } = render(<UnreadNavigationBar />);
      expect(container.firstChild).toBeNull();
    });

    it('should render when navigation is active', () => {
      render(<UnreadNavigationBar />);
      expect(screen.getByText('1 of 3 unread')).toBeInTheDocument();
    });

    it('should display thread type for highlight', () => {
      render(<UnreadNavigationBar />);
      expect(screen.getByText('Highlight')).toBeInTheDocument();
    });

    it('should display thread type for journal discussion', () => {
      mockContextValue.currentThread = {
        ...mockThread,
        threadType: 'journal_discussion',
      };
      render(<UnreadNavigationBar />);
      expect(screen.getByText('Discussion')).toBeInTheDocument();
    });

    it('should display journal title', () => {
      render(<UnreadNavigationBar />);
      expect(screen.getByText('Test Journal Entry')).toBeInTheDocument();
    });
  });

  describe('Navigation Buttons', () => {
    it('should call navigateToNext when Next button is clicked', async () => {
      const user = userEvent.setup();
      render(<UnreadNavigationBar />);

      await user.click(screen.getByRole('button', { name: /next unread/i }));
      expect(mockNavigateToNext).toHaveBeenCalled();
    });

    it('should call navigateToPrevious when Previous button is clicked', async () => {
      mockContextValue.hasPrevious = true;
      const user = userEvent.setup();
      render(<UnreadNavigationBar />);

      await user.click(screen.getByRole('button', { name: /previous unread/i }));
      expect(mockNavigateToPrevious).toHaveBeenCalled();
    });

    it('should disable Previous button when at first thread', () => {
      render(<UnreadNavigationBar />);
      expect(screen.getByRole('button', { name: /previous unread/i })).toBeDisabled();
    });

    it('should disable Next button when at last thread', () => {
      mockContextValue.hasNext = false;
      mockContextValue.hasPrevious = true;
      mockContextValue.state.currentIndex = 2;
      render(<UnreadNavigationBar />);
      expect(screen.getByRole('button', { name: /next unread/i })).toBeDisabled();
    });
  });

  describe('Exit Button', () => {
    it('should call exitNavigation when exit button is clicked', async () => {
      const user = userEvent.setup();
      render(<UnreadNavigationBar />);

      await user.click(screen.getByRole('button', { name: /exit unread navigation/i }));
      expect(mockExitNavigation).toHaveBeenCalled();
    });
  });

  describe('Counter Display', () => {
    it('should display correct position and total', () => {
      mockContextValue.state.currentIndex = 1;
      mockContextValue.totalCount = 5;
      render(<UnreadNavigationBar />);
      expect(screen.getByText('2 of 5 unread')).toBeInTheDocument();
    });
  });
});
