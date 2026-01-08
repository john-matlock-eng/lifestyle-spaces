import { describe, it, expect, beforeEach } from 'vitest'
import { act } from '@testing-library/react'
import {
  useConversationStore,
  selectUnreadThreads,
  selectUnreadCount,
  selectCurrentUnreadThread,
  selectHasMoreUnread,
  selectIsNavigationDismissed,
  selectActiveThread,
} from './conversationStore'
import type { ConversationThread } from '../types/conversation'

// Helper to create mock threads
const createMockThread = (id: string, overrides?: Partial<ConversationThread>): ConversationThread => ({
  threadId: id,
  threadType: 'highlight',
  journalId: `journal-${id}`,
  journalTitle: `Journal ${id}`,
  journalAuthorId: 'author-1',
  journalAuthorName: 'Test Author',
  highlightText: 'Test highlight',
  highlightColor: 'yellow',
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
  unreadCount: 2,
  hasReplyToUser: false,
  latestCommentText: 'Latest comment',
  latestCommentAuthor: 'User 1',
  latestCommentAuthorId: 'user-1',
  latestCommentTime: '2024-01-01T00:00:00Z',
  ...overrides,
})

describe('conversationStore', () => {
  beforeEach(() => {
    // Reset the store before each test
    act(() => {
      useConversationStore.getState().reset()
    })
  })

  describe('Initial State', () => {
    it('should have correct initial state', () => {
      const state = useConversationStore.getState()

      expect(state.unreadNav.threads).toEqual([])
      expect(state.unreadNav.currentIndex).toBe(0)
      expect(state.unreadNav.isDismissed).toBe(false)
      expect(state.unreadNav.lastFetched).toBeNull()
      expect(state.unreadNav.spaceId).toBeNull()

      expect(state.activeThread.threadId).toBeNull()
      expect(state.activeThread.threadType).toBeNull()
      expect(state.activeThread.journalId).toBeNull()

      expect(state.optimisticallyReadThreads.size).toBe(0)
    })
  })

  describe('setUnreadThreads', () => {
    it('should set unread threads for a space', () => {
      const threads = [createMockThread('1'), createMockThread('2')]

      act(() => {
        useConversationStore.getState().setUnreadThreads('space-1', threads)
      })

      const state = useConversationStore.getState()
      expect(state.unreadNav.threads).toEqual(threads)
      expect(state.unreadNav.spaceId).toBe('space-1')
      expect(state.unreadNav.currentIndex).toBe(0)
      expect(state.unreadNav.isDismissed).toBe(false)
      expect(state.unreadNav.lastFetched).not.toBeNull()
    })

    it('should reset isDismissed when setting new threads', () => {
      act(() => {
        useConversationStore.getState().dismissNavigation()
      })

      expect(useConversationStore.getState().unreadNav.isDismissed).toBe(true)

      act(() => {
        useConversationStore.getState().setUnreadThreads('space-1', [createMockThread('1')])
      })

      expect(useConversationStore.getState().unreadNav.isDismissed).toBe(false)
    })
  })

  describe('removeUnreadThread', () => {
    it('should remove a thread from the list', () => {
      const threads = [createMockThread('1'), createMockThread('2'), createMockThread('3')]

      act(() => {
        useConversationStore.getState().setUnreadThreads('space-1', threads)
      })

      act(() => {
        useConversationStore.getState().removeUnreadThread('2')
      })

      const state = useConversationStore.getState()
      expect(state.unreadNav.threads).toHaveLength(2)
      expect(state.unreadNav.threads.map((t) => t.threadId)).toEqual(['1', '3'])
    })

    it('should adjust currentIndex when removing thread before current position', () => {
      const threads = [createMockThread('1'), createMockThread('2'), createMockThread('3')]

      act(() => {
        useConversationStore.getState().setUnreadThreads('space-1', threads)
        // Simulate being at index 2 (thread '3')
        useConversationStore.setState((state) => ({
          unreadNav: { ...state.unreadNav, currentIndex: 2 },
        }))
      })

      act(() => {
        useConversationStore.getState().removeUnreadThread('1') // Remove thread before current
      })

      expect(useConversationStore.getState().unreadNav.currentIndex).toBe(1) // Adjusted down
    })

    it('should adjust currentIndex when removing current thread at end of list', () => {
      const threads = [createMockThread('1'), createMockThread('2')]

      act(() => {
        useConversationStore.getState().setUnreadThreads('space-1', threads)
        useConversationStore.setState((state) => ({
          unreadNav: { ...state.unreadNav, currentIndex: 1 },
        }))
      })

      act(() => {
        useConversationStore.getState().removeUnreadThread('2') // Remove current at end
      })

      expect(useConversationStore.getState().unreadNav.currentIndex).toBe(0)
    })

    it('should not modify state if thread not found', () => {
      const threads = [createMockThread('1')]

      act(() => {
        useConversationStore.getState().setUnreadThreads('space-1', threads)
      })

      const stateBefore = useConversationStore.getState().unreadNav

      act(() => {
        useConversationStore.getState().removeUnreadThread('nonexistent')
      })

      const stateAfter = useConversationStore.getState().unreadNav
      expect(stateAfter).toEqual(stateBefore)
    })
  })

  describe('navigateToNextUnread', () => {
    it('should return next thread and update state', () => {
      const threads = [createMockThread('1'), createMockThread('2'), createMockThread('3')]

      act(() => {
        useConversationStore.getState().setUnreadThreads('space-1', threads)
      })

      let nextThread: ConversationThread | null = null
      act(() => {
        nextThread = useConversationStore.getState().navigateToNextUnread()
      })

      expect(nextThread?.threadId).toBe('2')
      expect(useConversationStore.getState().unreadNav.threads).toHaveLength(2)
      expect(useConversationStore.getState().unreadNav.currentIndex).toBe(0)
    })

    it('should return null and clear threads when no more unread', () => {
      const threads = [createMockThread('1')]

      act(() => {
        useConversationStore.getState().setUnreadThreads('space-1', threads)
      })

      let nextThread: ConversationThread | null = null
      act(() => {
        nextThread = useConversationStore.getState().navigateToNextUnread()
      })

      expect(nextThread).toBeNull()
      expect(useConversationStore.getState().unreadNav.threads).toHaveLength(0)
    })
  })

  describe('dismissNavigation', () => {
    it('should set isDismissed to true', () => {
      act(() => {
        useConversationStore.getState().dismissNavigation()
      })

      expect(useConversationStore.getState().unreadNav.isDismissed).toBe(true)
    })
  })

  describe('resetNavigation', () => {
    it('should reset navigation state', () => {
      const threads = [createMockThread('1')]

      act(() => {
        useConversationStore.getState().setUnreadThreads('space-1', threads)
        useConversationStore.getState().dismissNavigation()
      })

      act(() => {
        useConversationStore.getState().resetNavigation('space-2')
      })

      const state = useConversationStore.getState().unreadNav
      expect(state.threads).toEqual([])
      expect(state.currentIndex).toBe(0)
      expect(state.isDismissed).toBe(false)
      expect(state.spaceId).toBe('space-2')
    })
  })

  describe('Active Thread', () => {
    it('should set active thread', () => {
      act(() => {
        useConversationStore.getState().setActiveThread('thread-1', 'highlight', 'journal-1')
      })

      const state = useConversationStore.getState().activeThread
      expect(state.threadId).toBe('thread-1')
      expect(state.threadType).toBe('highlight')
      expect(state.journalId).toBe('journal-1')
    })

    it('should clear active thread', () => {
      act(() => {
        useConversationStore.getState().setActiveThread('thread-1', 'highlight', 'journal-1')
        useConversationStore.getState().clearActiveThread()
      })

      const state = useConversationStore.getState().activeThread
      expect(state.threadId).toBeNull()
      expect(state.threadType).toBeNull()
      expect(state.journalId).toBeNull()
    })
  })

  describe('Optimistic Updates', () => {
    it('should mark thread as read optimistically', () => {
      act(() => {
        useConversationStore.getState().markThreadAsReadOptimistic('thread-1')
      })

      expect(useConversationStore.getState().isThreadReadOptimistic('thread-1')).toBe(true)
      expect(useConversationStore.getState().isThreadReadOptimistic('thread-2')).toBe(false)
    })

    it('should clear optimistic read', () => {
      act(() => {
        useConversationStore.getState().markThreadAsReadOptimistic('thread-1')
        useConversationStore.getState().clearOptimisticRead('thread-1')
      })

      expect(useConversationStore.getState().isThreadReadOptimistic('thread-1')).toBe(false)
    })

    it('should handle multiple optimistic reads', () => {
      act(() => {
        useConversationStore.getState().markThreadAsReadOptimistic('thread-1')
        useConversationStore.getState().markThreadAsReadOptimistic('thread-2')
      })

      expect(useConversationStore.getState().isThreadReadOptimistic('thread-1')).toBe(true)
      expect(useConversationStore.getState().isThreadReadOptimistic('thread-2')).toBe(true)

      act(() => {
        useConversationStore.getState().clearOptimisticRead('thread-1')
      })

      expect(useConversationStore.getState().isThreadReadOptimistic('thread-1')).toBe(false)
      expect(useConversationStore.getState().isThreadReadOptimistic('thread-2')).toBe(true)
    })
  })

  describe('Reset', () => {
    it('should reset all state', () => {
      act(() => {
        useConversationStore.getState().setUnreadThreads('space-1', [createMockThread('1')])
        useConversationStore.getState().setActiveThread('thread-1', 'highlight', 'journal-1')
        useConversationStore.getState().markThreadAsReadOptimistic('thread-1')
        useConversationStore.getState().dismissNavigation()
      })

      act(() => {
        useConversationStore.getState().reset()
      })

      const state = useConversationStore.getState()
      expect(state.unreadNav.threads).toEqual([])
      expect(state.unreadNav.isDismissed).toBe(false)
      expect(state.activeThread.threadId).toBeNull()
      expect(state.optimisticallyReadThreads.size).toBe(0)
    })
  })

  describe('Selectors', () => {
    it('selectUnreadThreads should return threads', () => {
      const threads = [createMockThread('1')]

      act(() => {
        useConversationStore.getState().setUnreadThreads('space-1', threads)
      })

      expect(selectUnreadThreads(useConversationStore.getState())).toEqual(threads)
    })

    it('selectUnreadCount should return thread count', () => {
      const threads = [createMockThread('1'), createMockThread('2')]

      act(() => {
        useConversationStore.getState().setUnreadThreads('space-1', threads)
      })

      expect(selectUnreadCount(useConversationStore.getState())).toBe(2)
    })

    it('selectCurrentUnreadThread should return current thread', () => {
      const threads = [createMockThread('1'), createMockThread('2')]

      act(() => {
        useConversationStore.getState().setUnreadThreads('space-1', threads)
      })

      expect(selectCurrentUnreadThread(useConversationStore.getState())?.threadId).toBe('1')
    })

    it('selectCurrentUnreadThread should return null for empty list', () => {
      expect(selectCurrentUnreadThread(useConversationStore.getState())).toBeNull()
    })

    it('selectHasMoreUnread should return true when more than one thread', () => {
      const threads = [createMockThread('1'), createMockThread('2')]

      act(() => {
        useConversationStore.getState().setUnreadThreads('space-1', threads)
      })

      expect(selectHasMoreUnread(useConversationStore.getState())).toBe(true)
    })

    it('selectHasMoreUnread should return false for single thread', () => {
      act(() => {
        useConversationStore.getState().setUnreadThreads('space-1', [createMockThread('1')])
      })

      expect(selectHasMoreUnread(useConversationStore.getState())).toBe(false)
    })

    it('selectIsNavigationDismissed should return dismissed state', () => {
      expect(selectIsNavigationDismissed(useConversationStore.getState())).toBe(false)

      act(() => {
        useConversationStore.getState().dismissNavigation()
      })

      expect(selectIsNavigationDismissed(useConversationStore.getState())).toBe(true)
    })

    it('selectActiveThread should return active thread state', () => {
      act(() => {
        useConversationStore.getState().setActiveThread('thread-1', 'journal_discussion', 'journal-1')
      })

      const activeThread = selectActiveThread(useConversationStore.getState())
      expect(activeThread.threadId).toBe('thread-1')
      expect(activeThread.threadType).toBe('journal_discussion')
      expect(activeThread.journalId).toBe('journal-1')
    })
  })
})
