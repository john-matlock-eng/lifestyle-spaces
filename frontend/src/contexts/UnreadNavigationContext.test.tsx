/**
 * Tests for UnreadNavigationContext
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { UnreadNavigationProvider, useUnreadNavigation } from './UnreadNavigationContext';
import type { ConversationThread } from '../types/conversation';

// Mock the conversation service
const mockMarkThreadAsRead = vi.fn().mockResolvedValue({ success: true });
vi.mock('../services/conversationService', () => ({
  conversationService: {
    markThreadAsRead: (...args: unknown[]) => mockMarkThreadAsRead(...args),
  },
}));

// Mock navigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Test component that exposes the context
const TestConsumer: React.FC = () => {
  const context = useUnreadNavigation();
  return (
    <div>
      <span data-testid="isActive">{context.state.isActive.toString()}</span>
      <span data-testid="currentIndex">{context.state.currentIndex}</span>
      <span data-testid="totalCount">{context.totalCount}</span>
      <span data-testid="remainingCount">{context.remainingCount}</span>
      <span data-testid="hasNext">{context.hasNext.toString()}</span>
      <span data-testid="hasPrevious">{context.hasPrevious.toString()}</span>
      <span data-testid="currentThreadId">{context.currentThread?.threadId || 'none'}</span>
      <button
        data-testid="enter"
        onClick={() => context.enterUnreadNavigation(mockThreads, 'space-1', 0)}
      >
        Enter
      </button>
      <button data-testid="next" onClick={context.navigateToNext}>Next</button>
      <button data-testid="previous" onClick={context.navigateToPrevious}>Previous</button>
      <button data-testid="markRead" onClick={context.markCurrentAsRead}>Mark Read</button>
      <button data-testid="exit" onClick={context.exitNavigation}>Exit</button>
    </div>
  );
};

// Mock thread data
const mockThreads: ConversationThread[] = [
  {
    threadId: 'thread-1',
    threadType: 'highlight',
    journalId: 'journal-1',
    journalTitle: 'First Journal',
    journalAuthorId: 'author-1',
    journalAuthorName: 'Author 1',
    highlightText: 'Highlighted text',
    highlightColor: '#ffeb3b',
    lastActivity: '2024-01-01T00:00:00Z',
    createdAt: '2024-01-01T00:00:00Z',
    commentCount: 5,
    participants: ['User 1', 'User 2'],
    participantIds: ['user-1', 'user-2'],
    userParticipated: true,
    userStarted: false,
    userLastSeen: null,
    userLastComment: null,
    isUnread: true,
    unreadCount: 3,
    hasReplyToUser: true,
    latestCommentText: 'Latest comment',
    latestCommentAuthor: 'User 2',
    latestCommentAuthorId: 'user-2',
    latestCommentTime: '2024-01-01T00:00:00Z',
  },
  {
    threadId: 'thread-2',
    threadType: 'journal_discussion',
    journalId: 'journal-2',
    journalTitle: 'Second Journal',
    journalAuthorId: 'author-2',
    journalAuthorName: 'Author 2',
    highlightText: null,
    highlightColor: null,
    lastActivity: '2024-01-02T00:00:00Z',
    createdAt: '2024-01-02T00:00:00Z',
    commentCount: 10,
    participants: ['User 3'],
    participantIds: ['user-3'],
    userParticipated: false,
    userStarted: false,
    userLastSeen: null,
    userLastComment: null,
    isUnread: true,
    unreadCount: 5,
    hasReplyToUser: false,
    latestCommentText: 'Discussion comment',
    latestCommentAuthor: 'User 3',
    latestCommentAuthorId: 'user-3',
    latestCommentTime: '2024-01-02T00:00:00Z',
  },
  {
    threadId: 'thread-3',
    threadType: 'highlight',
    journalId: 'journal-3',
    journalTitle: 'Third Journal',
    journalAuthorId: 'author-3',
    journalAuthorName: 'Author 3',
    highlightText: 'Another highlight',
    highlightColor: '#4caf50',
    lastActivity: '2024-01-03T00:00:00Z',
    createdAt: '2024-01-03T00:00:00Z',
    commentCount: 2,
    participants: ['User 4'],
    participantIds: ['user-4'],
    userParticipated: true,
    userStarted: true,
    userLastSeen: null,
    userLastComment: null,
    isUnread: true,
    unreadCount: 1,
    hasReplyToUser: false,
    latestCommentText: 'Third comment',
    latestCommentAuthor: 'User 4',
    latestCommentAuthorId: 'user-4',
    latestCommentTime: '2024-01-03T00:00:00Z',
  },
];

const renderWithProvider = () => {
  return render(
    <BrowserRouter>
      <UnreadNavigationProvider>
        <TestConsumer />
      </UnreadNavigationProvider>
    </BrowserRouter>
  );
};

describe('UnreadNavigationContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockMarkThreadAsRead.mockResolvedValue({ success: true });
  });

  describe('Initial State', () => {
    it('should start with navigation inactive', () => {
      renderWithProvider();
      expect(screen.getByTestId('isActive').textContent).toBe('false');
      expect(screen.getByTestId('totalCount').textContent).toBe('0');
    });

    it('should have no current thread initially', () => {
      renderWithProvider();
      expect(screen.getByTestId('currentThreadId').textContent).toBe('none');
    });
  });

  describe('Enter Navigation', () => {
    it('should activate navigation mode when entering with threads', async () => {
      const user = userEvent.setup();
      renderWithProvider();

      await act(async () => {
        await user.click(screen.getByTestId('enter'));
      });

      expect(screen.getByTestId('isActive').textContent).toBe('true');
      expect(screen.getByTestId('totalCount').textContent).toBe('3');
      expect(screen.getByTestId('currentIndex').textContent).toBe('0');
    });

    it('should navigate to first thread on enter', async () => {
      const user = userEvent.setup();
      renderWithProvider();

      await act(async () => {
        await user.click(screen.getByTestId('enter'));
      });

      // Should navigate to highlight thread
      expect(mockNavigate).toHaveBeenCalledWith(
        '/spaces/space-1/journals/journal-1?highlightId=thread-1'
      );
    });

    it('should set current thread correctly', async () => {
      const user = userEvent.setup();
      renderWithProvider();

      await act(async () => {
        await user.click(screen.getByTestId('enter'));
      });

      expect(screen.getByTestId('currentThreadId').textContent).toBe('thread-1');
    });
  });

  describe('Navigation', () => {
    it('should navigate to next thread', async () => {
      const user = userEvent.setup();
      renderWithProvider();

      await act(async () => {
        await user.click(screen.getByTestId('enter'));
      });

      mockNavigate.mockClear();

      await act(async () => {
        await user.click(screen.getByTestId('next'));
      });

      expect(screen.getByTestId('currentIndex').textContent).toBe('1');
      // Should navigate to journal discussion thread
      expect(mockNavigate).toHaveBeenCalledWith(
        '/spaces/space-1/journals/journal-2?openJournalComments=true&scrollToEnd=true'
      );
    });

    it('should navigate to previous thread', async () => {
      const user = userEvent.setup();
      renderWithProvider();

      // Enter at index 2
      await act(async () => {
        const context = (screen.getByTestId('enter') as HTMLButtonElement).onclick;
        // Re-render to start at different index
      });

      await act(async () => {
        await user.click(screen.getByTestId('enter'));
      });

      await act(async () => {
        await user.click(screen.getByTestId('next'));
      });

      mockNavigate.mockClear();

      await act(async () => {
        await user.click(screen.getByTestId('previous'));
      });

      expect(screen.getByTestId('currentIndex').textContent).toBe('0');
    });

    it('should correctly report hasNext and hasPrevious', async () => {
      const user = userEvent.setup();
      renderWithProvider();

      await act(async () => {
        await user.click(screen.getByTestId('enter'));
      });

      // At index 0
      expect(screen.getByTestId('hasPrevious').textContent).toBe('false');
      expect(screen.getByTestId('hasNext').textContent).toBe('true');

      await act(async () => {
        await user.click(screen.getByTestId('next'));
      });

      // At index 1
      expect(screen.getByTestId('hasPrevious').textContent).toBe('true');
      expect(screen.getByTestId('hasNext').textContent).toBe('true');

      await act(async () => {
        await user.click(screen.getByTestId('next'));
      });

      // At index 2 (last)
      expect(screen.getByTestId('hasPrevious').textContent).toBe('true');
      expect(screen.getByTestId('hasNext').textContent).toBe('false');
    });
  });

  describe('Exit Navigation', () => {
    it('should deactivate navigation on exit', async () => {
      const user = userEvent.setup();
      renderWithProvider();

      await act(async () => {
        await user.click(screen.getByTestId('enter'));
      });

      expect(screen.getByTestId('isActive').textContent).toBe('true');

      await act(async () => {
        await user.click(screen.getByTestId('exit'));
      });

      expect(screen.getByTestId('isActive').textContent).toBe('false');
      expect(screen.getByTestId('totalCount').textContent).toBe('0');
    });
  });

  describe('Mark as Read', () => {
    it('should call mark as read service and remove thread from queue', async () => {
      const user = userEvent.setup();
      renderWithProvider();

      await act(async () => {
        await user.click(screen.getByTestId('enter'));
      });

      expect(screen.getByTestId('totalCount').textContent).toBe('3');

      await act(async () => {
        await user.click(screen.getByTestId('markRead'));
      });

      expect(mockMarkThreadAsRead).toHaveBeenCalledWith(
        'space-1',
        'thread-1',
        'highlight'
      );
      expect(screen.getByTestId('totalCount').textContent).toBe('2');
    });

    it('should exit navigation when all threads are marked as read', async () => {
      const user = userEvent.setup();
      renderWithProvider();

      await act(async () => {
        await user.click(screen.getByTestId('enter'));
      });

      // Mark all as read one by one
      await act(async () => {
        await user.click(screen.getByTestId('markRead'));
      });
      await act(async () => {
        await user.click(screen.getByTestId('markRead'));
      });
      await act(async () => {
        await user.click(screen.getByTestId('markRead'));
      });

      expect(screen.getByTestId('isActive').textContent).toBe('false');
    });
  });

  describe('Remaining Count', () => {
    it('should correctly calculate remaining count', async () => {
      const user = userEvent.setup();
      renderWithProvider();

      await act(async () => {
        await user.click(screen.getByTestId('enter'));
      });

      expect(screen.getByTestId('remainingCount').textContent).toBe('3');

      await act(async () => {
        await user.click(screen.getByTestId('next'));
      });

      expect(screen.getByTestId('remainingCount').textContent).toBe('2');

      await act(async () => {
        await user.click(screen.getByTestId('next'));
      });

      expect(screen.getByTestId('remainingCount').textContent).toBe('1');
    });
  });
});

describe('useUnreadNavigation hook', () => {
  it('should throw error when used outside provider', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    const TestComponent = () => {
      try {
        useUnreadNavigation();
        return <div>No error</div>;
      } catch (error) {
        return <div>Error thrown</div>;
      }
    };

    render(
      <BrowserRouter>
        <TestComponent />
      </BrowserRouter>
    );

    expect(screen.getByText('Error thrown')).toBeInTheDocument();
    consoleError.mockRestore();
  });
});
