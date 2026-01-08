/**
 * React Query hooks for conversation/thread data.
 *
 * These hooks provide:
 * - Automatic caching and background refetching
 * - Optimistic updates for mark-as-read operations
 * - Proper cache invalidation across related queries
 * - Type-safe query keys
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { conversationService } from '../services/conversationService'
import { useConversationStore } from '../stores/conversationStore'
import type {
  ThreadsResponse,
  UnreadCountResponse,
  GetThreadsOptions,
  ConversationThread,
} from '../types/conversation'

// ============================================================================
// Query Keys
// ============================================================================

export const conversationKeys = {
  all: ['conversations'] as const,
  threads: (spaceId: string) => [...conversationKeys.all, 'threads', spaceId] as const,
  threadsList: (spaceId: string, options?: GetThreadsOptions) =>
    [...conversationKeys.threads(spaceId), 'list', options] as const,
  unreadCount: (spaceId: string) => [...conversationKeys.all, 'unreadCount', spaceId] as const,
  unreadThreads: (spaceId: string) => [...conversationKeys.threads(spaceId), 'unread'] as const,
}

// ============================================================================
// Query Hooks
// ============================================================================

/**
 * Fetch conversation threads for a space.
 */
export function useThreads(spaceId: string, options: GetThreadsOptions = {}, enabled = true) {
  return useQuery({
    queryKey: conversationKeys.threadsList(spaceId, options),
    queryFn: () => conversationService.getThreads(spaceId, options),
    enabled: enabled && !!spaceId,
    staleTime: 1000 * 30, // 30 seconds
  })
}

/**
 * Fetch unread count for a space.
 */
export function useUnreadCount(spaceId: string, enabled = true) {
  return useQuery({
    queryKey: conversationKeys.unreadCount(spaceId),
    queryFn: () => conversationService.getUnreadCount(spaceId),
    enabled: enabled && !!spaceId,
    staleTime: 1000 * 60, // 1 minute
    refetchInterval: 1000 * 60 * 2, // Refetch every 2 minutes
  })
}

/**
 * Fetch unread threads for navigation purposes.
 * This is used by the unread navigation bar.
 */
export function useUnreadThreads(spaceId: string, enabled = true) {
  const setUnreadThreads = useConversationStore((state) => state.setUnreadThreads)

  return useQuery({
    queryKey: conversationKeys.unreadThreads(spaceId),
    queryFn: async () => {
      const response = await conversationService.getThreads(spaceId, {
        filter: 'unread',
        sort: 'recent',
        limit: 100,
      })
      // Also update Zustand store for UI state
      setUnreadThreads(spaceId, response.threads)
      return response.threads
    },
    enabled: enabled && !!spaceId,
    staleTime: 1000 * 60, // 1 minute
  })
}

// ============================================================================
// Mutation Hooks
// ============================================================================

interface MarkThreadAsReadOptions {
  spaceId: string
  threadId: string
  threadType: 'highlight' | 'journal_discussion'
}

/**
 * Mark a specific thread as read with optimistic updates.
 */
export function useMarkThreadAsRead() {
  const queryClient = useQueryClient()
  const {
    markThreadAsReadOptimistic,
    clearOptimisticRead,
    removeUnreadThread,
  } = useConversationStore()

  return useMutation({
    mutationFn: async ({ spaceId, threadId, threadType }: MarkThreadAsReadOptions) => {
      return conversationService.markThreadAsRead(spaceId, threadId, threadType)
    },
    onMutate: async ({ spaceId, threadId }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: conversationKeys.threads(spaceId) })
      await queryClient.cancelQueries({ queryKey: conversationKeys.unreadCount(spaceId) })

      // Snapshot previous values
      const previousThreads = queryClient.getQueryData<ConversationThread[]>(
        conversationKeys.unreadThreads(spaceId)
      )
      const previousUnreadCount = queryClient.getQueryData<UnreadCountResponse>(
        conversationKeys.unreadCount(spaceId)
      )

      // Optimistically update Zustand store
      markThreadAsReadOptimistic(threadId)
      removeUnreadThread(threadId)

      // Optimistically update React Query cache
      queryClient.setQueryData<ConversationThread[]>(
        conversationKeys.unreadThreads(spaceId),
        (old) => old?.filter((t) => t.threadId !== threadId)
      )

      queryClient.setQueryData<UnreadCountResponse>(
        conversationKeys.unreadCount(spaceId),
        (old) => {
          if (!old) return old
          return {
            ...old,
            totalUnread: Math.max(0, old.totalUnread - 1),
          }
        }
      )

      // Also update any threads list queries
      queryClient.setQueriesData<ThreadsResponse>(
        { queryKey: conversationKeys.threads(spaceId) },
        (old) => {
          if (!old) return old
          return {
            ...old,
            threads: old.threads.map((t) =>
              t.threadId === threadId
                ? { ...t, isUnread: false, unreadCount: 0 }
                : t
            ),
            totalUnread: Math.max(0, old.totalUnread - 1),
          }
        }
      )

      return { previousThreads, previousUnreadCount }
    },
    onError: (_err, { spaceId, threadId }, context) => {
      // Rollback optimistic updates
      clearOptimisticRead(threadId)

      if (context?.previousThreads) {
        queryClient.setQueryData(
          conversationKeys.unreadThreads(spaceId),
          context.previousThreads
        )
      }

      if (context?.previousUnreadCount) {
        queryClient.setQueryData(
          conversationKeys.unreadCount(spaceId),
          context.previousUnreadCount
        )
      }
    },
    onSuccess: (_data, { threadId }) => {
      // Clear optimistic flag now that server confirmed
      clearOptimisticRead(threadId)
    },
    onSettled: (_data, _error, { spaceId }) => {
      // Refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: conversationKeys.unreadCount(spaceId) })
    },
  })
}

interface MarkJournalAsReadOptions {
  spaceId: string
  journalId: string
  options?: { markHighlightComments?: boolean; markJournalComments?: boolean }
}

/**
 * Mark all comments in a journal as read.
 */
export function useMarkJournalAsRead() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ spaceId, journalId, options }: MarkJournalAsReadOptions) => {
      return conversationService.markJournalAsRead(spaceId, journalId, options)
    },
    onSuccess: (_data, { spaceId }) => {
      // Invalidate all thread-related queries for this space
      queryClient.invalidateQueries({ queryKey: conversationKeys.threads(spaceId) })
      queryClient.invalidateQueries({ queryKey: conversationKeys.unreadCount(spaceId) })
    },
  })
}

/**
 * Mark all threads in a space as read.
 */
export function useMarkAllAsRead() {
  const queryClient = useQueryClient()
  const resetNavigation = useConversationStore((state) => state.resetNavigation)

  return useMutation({
    mutationFn: async (spaceId: string) => {
      return conversationService.markAllAsRead(spaceId)
    },
    onSuccess: (_data, spaceId) => {
      // Clear Zustand navigation state
      resetNavigation(spaceId)

      // Invalidate all queries
      queryClient.invalidateQueries({ queryKey: conversationKeys.threads(spaceId) })
      queryClient.invalidateQueries({ queryKey: conversationKeys.unreadCount(spaceId) })
    },
  })
}

// ============================================================================
// Utility Hooks
// ============================================================================

/**
 * Combined hook for unread navigation that uses both React Query and Zustand.
 * Provides the thread data from React Query and navigation state from Zustand.
 */
export function useUnreadNavigationV2(spaceId: string, enabled = true) {
  const {
    unreadNav,
    navigateToNextUnread,
    dismissNavigation,
    resetNavigation,
    removeUnreadThread,
  } = useConversationStore()

  const {
    isLoading,
    error,
    refetch,
  } = useUnreadThreads(spaceId, enabled)

  const markAsReadMutation = useMarkThreadAsRead()

  const currentThread = unreadNav.threads[unreadNav.currentIndex] ?? null
  const hasNext = unreadNav.threads.length > 1

  return {
    // Data
    threads: unreadNav.threads,
    currentThread,
    totalUnread: unreadNav.threads.length,
    hasNext,
    isDismissed: unreadNav.isDismissed,

    // Loading state
    isLoading,
    error,

    // Actions
    navigateToNext: navigateToNextUnread,
    dismiss: dismissNavigation,
    reset: () => resetNavigation(spaceId),
    refetch,
    removeThread: removeUnreadThread,

    // Mark as read with proper cache invalidation
    markAsRead: (threadId: string, threadType: 'highlight' | 'journal_discussion') => {
      markAsReadMutation.mutate({ spaceId, threadId, threadType })
    },
  }
}

/**
 * Hook to prefetch threads for a space (for optimistic navigation).
 */
export function usePrefetchThreads() {
  const queryClient = useQueryClient()

  return (spaceId: string, options?: GetThreadsOptions) => {
    queryClient.prefetchQuery({
      queryKey: conversationKeys.threadsList(spaceId, options),
      queryFn: () => conversationService.getThreads(spaceId, options ?? {}),
    })
  }
}
