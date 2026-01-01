/**
 * Hook for managing cross-journal unread navigation.
 *
 * Fetches all unread threads for a space once on mount and provides
 * navigation between them without returning to the ConversationsTab.
 * Uses a stable cached list that only updates when explicitly navigating.
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { conversationService } from '../services/conversationService'
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
  dismiss: () => void
  isDismissed: boolean
}

export function useUnreadNavigation({
  spaceId,
  initialIndex = 0,
  enabled = true,
}: UseUnreadNavigationOptions): UseUnreadNavigationReturn {
  const navigate = useNavigate()
  const [isDismissed, setIsDismissed] = useState(false)
  const [state, setState] = useState<UnreadNavigationState>({
    threads: [],
    currentIndex: initialIndex,
    totalUnread: 0,
    isLoading: true,
    lastFetched: null,
  })

  // Track if we've already fetched to prevent refetching
  const hasFetchedRef = useRef(false)

  // Fetch unread threads once on mount
  useEffect(() => {
    if (!enabled || !spaceId || hasFetchedRef.current) return

    const fetchUnreadThreads = async () => {
      setState((prev) => ({ ...prev, isLoading: true }))

      try {
        const response = await conversationService.getThreads(spaceId, {
          filter: 'unread',
          sort: 'recent',
          limit: 100,
        })

        hasFetchedRef.current = true

        setState({
          threads: response.threads,
          currentIndex: Math.min(initialIndex, Math.max(0, response.threads.length - 1)),
          totalUnread: response.threads.length,
          isLoading: false,
          lastFetched: new Date().toISOString(),
        })
      } catch (error) {
        console.error('Failed to fetch unread threads:', error)
        setState((prev) => ({ ...prev, isLoading: false }))
      }
    }

    fetchUnreadThreads()
  }, [spaceId, enabled, initialIndex])

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

  // Navigate to next unread thread and remove current from list
  const navigateToNext = useCallback(() => {
    setState((prev) => {
      // Remove the current thread from the list (we're done with it)
      const remainingThreads = prev.threads.slice(prev.currentIndex + 1)

      if (remainingThreads.length === 0) {
        // No more threads, just update state
        return {
          ...prev,
          threads: [],
          currentIndex: 0,
          totalUnread: 0,
        }
      }

      // Navigate to the next thread (now at index 0 of remaining)
      const nextThread = remainingThreads[0]

      // Use setTimeout to navigate after state update
      setTimeout(() => {
        navigate(buildThreadUrl(nextThread))
      }, 0)

      return {
        ...prev,
        threads: remainingThreads,
        currentIndex: 0,
        totalUnread: remainingThreads.length,
      }
    })
  }, [navigate, buildThreadUrl])

  // Dismiss the navigation bar
  const dismiss = useCallback(() => {
    setIsDismissed(true)
  }, [])

  return {
    state,
    hasNext: state.threads.length > 1, // More than just current thread
    navigateToNext,
    dismiss,
    isDismissed,
  }
}
