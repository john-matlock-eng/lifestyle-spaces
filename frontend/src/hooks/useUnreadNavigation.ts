/**
 * Hook for managing cross-journal unread navigation.
 *
 * Fetches all unread threads for a space once on mount and provides
 * navigation between them without returning to the ConversationsTab.
 *
 * MODERNIZED: Now uses Zustand for client state and React Query for server data.
 */

import { useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useConversationStore, selectHasMoreUnread } from '../stores/conversationStore'
import { useUnreadThreads } from './useConversations'
import type { ConversationThread, UnreadNavigationState } from '../types/conversation'

interface UseUnreadNavigationOptions {
  spaceId: string
  initialIndex?: number
  enabled?: boolean
}

interface UseUnreadNavigationReturn {
  state: UnreadNavigationState
  hasNext: boolean
  navigateToNext: () => void
  removeThread: (threadId: string) => void
  dismiss: () => void
  isDismissed: boolean
}

export function useUnreadNavigation({
  spaceId,
  initialIndex: _initialIndex = 0, // Kept for API compatibility, Zustand store manages index
  enabled = true,
}: UseUnreadNavigationOptions): UseUnreadNavigationReturn {
  const navigate = useNavigate()

  // Zustand store selectors
  const unreadNav = useConversationStore((state) => state.unreadNav)
  const hasNext = useConversationStore(selectHasMoreUnread)
  const navigateToNextUnread = useConversationStore((state) => state.navigateToNextUnread)
  const dismissNavigation = useConversationStore((state) => state.dismissNavigation)
  const removeUnreadThread = useConversationStore((state) => state.removeUnreadThread)
  const resetNavigation = useConversationStore((state) => state.resetNavigation)

  // React Query for fetching unread threads
  const { isLoading } = useUnreadThreads(spaceId, enabled)

  // Reset navigation when spaceId changes
  useEffect(() => {
    if (spaceId && unreadNav.spaceId !== spaceId) {
      resetNavigation(spaceId)
    }
  }, [spaceId, unreadNav.spaceId, resetNavigation])

  // Build navigation URL for a thread
  const buildThreadUrl = useCallback(
    (thread: ConversationThread) => {
      const params = new URLSearchParams()
      params.set('fromConversations', 'true')
      params.set('scrollToUnread', 'true')

      if (thread.threadType === 'highlight') {
        params.set('highlightId', thread.threadId)
      } else {
        params.set('openJournalComments', 'true')
      }

      return `/spaces/${spaceId}/journals/${thread.journalId}?${params.toString()}`
    },
    [spaceId]
  )

  // Navigate to next unread thread
  const handleNavigateToNext = useCallback(() => {
    const nextThread = navigateToNextUnread()
    if (nextThread) {
      // Use setTimeout to navigate after state update
      setTimeout(() => {
        navigate(buildThreadUrl(nextThread))
      }, 0)
    }
  }, [navigateToNextUnread, navigate, buildThreadUrl])

  // Remove thread and update service cache
  const handleRemoveThread = useCallback(
    (threadId: string) => {
      removeUnreadThread(threadId)
      // Note: React Query cache is updated via useMarkThreadAsRead mutation
      // which should be called alongside this when marking as read
    },
    [removeUnreadThread]
  )

  // Build backward-compatible state object
  const state: UnreadNavigationState = {
    threads: unreadNav.threads,
    currentIndex: unreadNav.currentIndex,
    totalUnread: unreadNav.threads.length,
    isLoading,
    lastFetched: unreadNav.lastFetched,
  }

  return {
    state,
    hasNext,
    navigateToNext: handleNavigateToNext,
    removeThread: handleRemoveThread,
    dismiss: dismissNavigation,
    isDismissed: unreadNav.isDismissed,
  }
}
