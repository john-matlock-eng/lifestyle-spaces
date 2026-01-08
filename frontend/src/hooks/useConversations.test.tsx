import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import {
  useThreads,
  useUnreadCount,
  useUnreadThreads,
  useMarkThreadAsRead,
  useMarkAllAsRead,
  conversationKeys,
} from './useConversations'
import { conversationService } from '../services/conversationService'
import { useConversationStore } from '../stores/conversationStore'
import type { ConversationThread, ThreadsResponse, UnreadCountResponse } from '../types/conversation'

// Mock the conversation service
vi.mock('../services/conversationService', () => ({
  conversationService: {
    getThreads: vi.fn(),
    getUnreadCount: vi.fn(),
    markThreadAsRead: vi.fn(),
    markAllAsRead: vi.fn(),
  },
}))

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

// Create wrapper with fresh QueryClient for each test
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  })

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

const mockConversationService = conversationService as {
  getThreads: ReturnType<typeof vi.fn>
  getUnreadCount: ReturnType<typeof vi.fn>
  markThreadAsRead: ReturnType<typeof vi.fn>
  markAllAsRead: ReturnType<typeof vi.fn>
}

describe('useConversations hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset Zustand store
    act(() => {
      useConversationStore.getState().reset()
    })
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('conversationKeys', () => {
    it('should generate correct query keys', () => {
      expect(conversationKeys.all).toEqual(['conversations'])
      expect(conversationKeys.threads('space-1')).toEqual(['conversations', 'threads', 'space-1'])
      expect(conversationKeys.threadsList('space-1', { filter: 'unread' })).toEqual([
        'conversations',
        'threads',
        'space-1',
        'list',
        { filter: 'unread' },
      ])
      expect(conversationKeys.unreadCount('space-1')).toEqual([
        'conversations',
        'unreadCount',
        'space-1',
      ])
      expect(conversationKeys.unreadThreads('space-1')).toEqual([
        'conversations',
        'threads',
        'space-1',
        'unread',
      ])
    })
  })

  describe('useThreads', () => {
    it('should fetch threads successfully', async () => {
      const mockThreads: ThreadsResponse = {
        threads: [createMockThread('1'), createMockThread('2')],
        totalUnread: 2,
        threadsWithReplies: 1,
        totalCount: 2,
        hasMore: false,
        nextToken: null,
      }

      mockConversationService.getThreads.mockResolvedValue(mockThreads)

      const { result } = renderHook(() => useThreads('space-1'), {
        wrapper: createWrapper(),
      })

      expect(result.current.isLoading).toBe(true)

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data).toEqual(mockThreads)
      expect(mockConversationService.getThreads).toHaveBeenCalledWith('space-1', {})
    })

    it('should not fetch when disabled', async () => {
      const { result } = renderHook(() => useThreads('space-1', {}, false), {
        wrapper: createWrapper(),
      })

      expect(result.current.isLoading).toBe(false)
      expect(result.current.fetchStatus).toBe('idle')
      expect(mockConversationService.getThreads).not.toHaveBeenCalled()
    })

    it('should pass options to the service', async () => {
      const mockThreads: ThreadsResponse = {
        threads: [],
        totalUnread: 0,
        threadsWithReplies: 0,
        totalCount: 0,
        hasMore: false,
        nextToken: null,
      }

      mockConversationService.getThreads.mockResolvedValue(mockThreads)

      const options = { filter: 'unread' as const, limit: 10 }

      renderHook(() => useThreads('space-1', options), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(mockConversationService.getThreads).toHaveBeenCalledWith('space-1', options)
      })
    })
  })

  describe('useUnreadCount', () => {
    it('should fetch unread count successfully', async () => {
      const mockCount: UnreadCountResponse = {
        totalUnread: 5,
        threadsWithReplies: 3,
        spaceId: 'space-1',
      }

      mockConversationService.getUnreadCount.mockResolvedValue(mockCount)

      const { result } = renderHook(() => useUnreadCount('space-1'), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data).toEqual(mockCount)
    })

    it('should not fetch when disabled', async () => {
      const { result } = renderHook(() => useUnreadCount('space-1', false), {
        wrapper: createWrapper(),
      })

      expect(result.current.fetchStatus).toBe('idle')
      expect(mockConversationService.getUnreadCount).not.toHaveBeenCalled()
    })
  })

  describe('useUnreadThreads', () => {
    it('should fetch unread threads and update Zustand store', async () => {
      const mockThreads = [createMockThread('1'), createMockThread('2')]
      const mockResponse: ThreadsResponse = {
        threads: mockThreads,
        totalUnread: 2,
        threadsWithReplies: 1,
        totalCount: 2,
        hasMore: false,
        nextToken: null,
      }

      mockConversationService.getThreads.mockResolvedValue(mockResponse)

      const { result } = renderHook(() => useUnreadThreads('space-1'), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      // Check that Zustand store was updated
      const storeState = useConversationStore.getState()
      expect(storeState.unreadNav.threads).toEqual(mockThreads)
      expect(storeState.unreadNav.spaceId).toBe('space-1')
    })

    it('should call getThreads with unread filter', async () => {
      mockConversationService.getThreads.mockResolvedValue({
        threads: [],
        totalUnread: 0,
        threadsWithReplies: 0,
        totalCount: 0,
        hasMore: false,
        nextToken: null,
      })

      renderHook(() => useUnreadThreads('space-1'), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(mockConversationService.getThreads).toHaveBeenCalledWith('space-1', {
          filter: 'unread',
          sort: 'recent',
          limit: 100,
        })
      })
    })
  })

  describe('useMarkThreadAsRead', () => {
    it('should mark thread as read and update optimistic state', async () => {
      mockConversationService.markThreadAsRead.mockResolvedValue({
        success: true,
        journalId: 'journal-1',
        spaceId: 'space-1',
        threadId: 'thread-1',
      })

      // Set up initial state with threads
      act(() => {
        useConversationStore.getState().setUnreadThreads('space-1', [
          createMockThread('thread-1'),
          createMockThread('thread-2'),
        ])
      })

      const { result } = renderHook(() => useMarkThreadAsRead(), {
        wrapper: createWrapper(),
      })

      await act(async () => {
        await result.current.mutateAsync({
          spaceId: 'space-1',
          threadId: 'thread-1',
          threadType: 'highlight',
        })
      })

      expect(mockConversationService.markThreadAsRead).toHaveBeenCalledWith(
        'space-1',
        'thread-1',
        'highlight'
      )

      // Thread should be removed from navigation
      const storeState = useConversationStore.getState()
      expect(storeState.unreadNav.threads.find((t) => t.threadId === 'thread-1')).toBeUndefined()
    })

    it('should handle mutation errors', async () => {
      const error = new Error('Network error')
      mockConversationService.markThreadAsRead.mockRejectedValue(error)

      const { result } = renderHook(() => useMarkThreadAsRead(), {
        wrapper: createWrapper(),
      })

      await act(async () => {
        try {
          await result.current.mutateAsync({
            spaceId: 'space-1',
            threadId: 'thread-1',
            threadType: 'highlight',
          })
        } catch (e) {
          // Expected error
        }
      })

      expect(result.current.isError).toBe(true)
    })
  })

  describe('useMarkAllAsRead', () => {
    it('should mark all threads as read and reset navigation', async () => {
      mockConversationService.markAllAsRead.mockResolvedValue({
        success: true,
        markedCount: 5,
      })

      // Set up initial state
      act(() => {
        useConversationStore.getState().setUnreadThreads('space-1', [
          createMockThread('1'),
          createMockThread('2'),
        ])
      })

      const { result } = renderHook(() => useMarkAllAsRead(), {
        wrapper: createWrapper(),
      })

      await act(async () => {
        await result.current.mutateAsync('space-1')
      })

      expect(mockConversationService.markAllAsRead).toHaveBeenCalledWith('space-1')

      // Navigation should be reset
      const storeState = useConversationStore.getState()
      expect(storeState.unreadNav.threads).toEqual([])
    })
  })
})
