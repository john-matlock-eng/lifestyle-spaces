/**
 * Hook for managing cross-journal unread navigation.
 *
 * Fetches all unread threads for a space and provides navigation
 * between them without returning to the ConversationsTab.
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { conversationService } from '../services/conversationService'
import type { ConversationThread, UnreadNavigationState } from '../types/conversation'

interface UseUnreadNavigationOptions {
  spaceId: string
  currentThreadId?: string
  initialIndex?: number
  enabled?: boolean
  autoRefreshInterval?: number // ms, default 60000
}

interface UseUnreadNavigationReturn {
  state: UnreadNavigationState
  currentThread: ConversationThread | null
  hasPrevious: boolean
  hasNext: boolean
  navigateToPrevious: () => void
  navigateToNext: () => void
  navigateToThread: (index: number) => void
  markCurrentAsRead: () => void
  refresh: () => Promise<void>
  dismiss: () => void
  isDismissed: boolean
}

export function useUnreadNavigation({
  spaceId,
  currentThreadId,
  initialIndex = 0,
  enabled = true,
  autoRefreshInterval = 60000,
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

  const refreshTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Fetch unread threads
  const fetchUnreadThreads = useCallback(async () => {
    if (!enabled || !spaceId) return

    setState((prev) => ({ ...prev, isLoading: true }))

    try {
      const response = await conversationService.getThreads(spaceId, {
        filter: 'unread',
        sort: 'recent',
        limit: 100,
      })

      setState((prev) => {
        // Try to maintain current position if possible
        let newIndex = prev.currentIndex

        // If we have a current thread ID, find its new position
        if (currentThreadId) {
          const foundIndex = response.threads.findIndex(
            (t) => t.threadId === currentThreadId
          )
          if (foundIndex >= 0) {
            newIndex = foundIndex
          }
        }

        // Clamp to valid range
        newIndex = Math.max(0, Math.min(newIndex, response.threads.length - 1))

        return {
          threads: response.threads,
          currentIndex: newIndex,
          totalUnread: response.totalUnread,
          isLoading: false,
          lastFetched: new Date().toISOString(),
        }
      })
    } catch (error) {
      console.error('Failed to fetch unread threads:', error)
      setState((prev) => ({ ...prev, isLoading: false }))
    }
  }, [spaceId, enabled, currentThreadId])

  // Initial fetch
  useEffect(() => {
    fetchUnreadThreads()
  }, [fetchUnreadThreads])

  // Set up auto-refresh polling
  useEffect(() => {
    if (!enabled || autoRefreshInterval <= 0) return

    refreshTimeoutRef.current = setInterval(() => {
      fetchUnreadThreads()
    }, autoRefreshInterval)

    return () => {
      if (refreshTimeoutRef.current) {
        clearInterval(refreshTimeoutRef.current)
      }
    }
  }, [enabled, autoRefreshInterval, fetchUnreadThreads])

  // Update index when currentThreadId changes
  useEffect(() => {
    if (!currentThreadId || state.threads.length === 0) return

    const index = state.threads.findIndex((t) => t.threadId === currentThreadId)
    if (index >= 0 && index !== state.currentIndex) {
      setState((prev) => ({ ...prev, currentIndex: index }))
    }
  }, [currentThreadId, state.threads, state.currentIndex])

  // Build navigation URL for a thread
  const buildThreadUrl = useCallback(
    (thread: ConversationThread, index: number) => {
      const params = new URLSearchParams()
      params.set('fromConversations', 'true')
      params.set('scrollToUnread', 'true')
      params.set('unreadNavIndex', index.toString())

      if (thread.threadType === 'highlight') {
        params.set('highlightId', thread.threadId)
      } else {
        params.set('openJournalComments', 'true')
      }

      return `/spaces/${spaceId}/journals/${thread.journalId}?${params.toString()}`
    },
    [spaceId]
  )

  // Navigate to previous unread thread
  const navigateToPrevious = useCallback(() => {
    if (state.currentIndex <= 0 || state.threads.length === 0) return

    const newIndex = state.currentIndex - 1
    const thread = state.threads[newIndex]
    if (thread) {
      navigate(buildThreadUrl(thread, newIndex))
    }
  }, [state.currentIndex, state.threads, navigate, buildThreadUrl])

  // Navigate to next unread thread
  const navigateToNext = useCallback(() => {
    if (
      state.currentIndex >= state.threads.length - 1 ||
      state.threads.length === 0
    )
      return

    const newIndex = state.currentIndex + 1
    const thread = state.threads[newIndex]
    if (thread) {
      navigate(buildThreadUrl(thread, newIndex))
    }
  }, [state.currentIndex, state.threads, navigate, buildThreadUrl])

  // Navigate to specific index
  const navigateToThread = useCallback(
    (index: number) => {
      if (index < 0 || index >= state.threads.length) return

      const thread = state.threads[index]
      if (thread) {
        navigate(buildThreadUrl(thread, index))
      }
    },
    [state.threads, navigate, buildThreadUrl]
  )

  // Mark current thread as read and remove from queue
  const markCurrentAsRead = useCallback(() => {
    setState((prev) => {
      const newThreads = prev.threads.filter(
        (_, i) => i !== prev.currentIndex
      )

      // Adjust index if needed
      let newIndex = prev.currentIndex
      if (newIndex >= newThreads.length) {
        newIndex = Math.max(0, newThreads.length - 1)
      }

      return {
        ...prev,
        threads: newThreads,
        currentIndex: newIndex,
        totalUnread: newThreads.length,
      }
    })
  }, [])

  // Dismiss the navigation bar
  const dismiss = useCallback(() => {
    setIsDismissed(true)
  }, [])

  // Get current thread
  const currentThread =
    state.threads.length > 0 ? state.threads[state.currentIndex] ?? null : null

  return {
    state,
    currentThread,
    hasPrevious: state.currentIndex > 0,
    hasNext: state.currentIndex < state.threads.length - 1,
    navigateToPrevious,
    navigateToNext,
    navigateToThread,
    markCurrentAsRead,
    refresh: fetchUnreadThreads,
    dismiss,
    isDismissed,
  }
}
