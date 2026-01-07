/**
 * Hook for tracking comment visibility and auto mark-as-read functionality.
 *
 * Uses IntersectionObserver to detect when comments scroll into view.
 * After a configurable delay (default 2s), marks the thread as read.
 */

import { useEffect, useRef, useCallback, useState } from 'react'
import { conversationService } from '../services/conversationService'

interface CommentVisibilityOptions {
  spaceId: string
  threadId: string
  threadType: 'highlight' | 'journal_discussion'
  userLastSeen?: string | null
  onMarkAsRead?: (threadId: string) => void // BUG FIX #4: Pass threadId so caller can update navigation state
  viewportThreshold?: number // 0-1, how much must be visible (default: 0.5)
  readDelay?: number // ms to wait before marking read (default: 2000)
  enabled?: boolean // allow disabling the observer
}

interface CommentTrackingInfo {
  element: HTMLElement
  enteredAt: number | null
  timerId: ReturnType<typeof setTimeout> | null
}

interface UseCommentVisibilityReturn {
  registerComment: (commentId: string, element: HTMLElement | null) => void
  unregisterComment: (commentId: string) => void
  scrollToFirstUnread: () => void
  isMarkedAsRead: boolean
  firstUnreadRef: React.RefObject<HTMLElement | null>
}

export function useCommentVisibility({
  spaceId,
  threadId,
  threadType,
  userLastSeen,
  onMarkAsRead,
  viewportThreshold = 0.5,
  readDelay = 2000,
  enabled = true,
}: CommentVisibilityOptions): UseCommentVisibilityReturn {
  const [isMarkedAsRead, setIsMarkedAsRead] = useState(false)
  const observerRef = useRef<IntersectionObserver | null>(null)
  const commentsRef = useRef<Map<string, CommentTrackingInfo>>(new Map())
  const hasMarkedAsReadRef = useRef(false)
  const firstUnreadRef = useRef<HTMLElement | null>(null)

  // Parse userLastSeen to determine which comments are unread
  const userLastSeenTime = userLastSeen ? new Date(userLastSeen).getTime() : 0

  // BUG FIX #1 & #3: Reset all tracking state when threadId changes
  // This ensures refs don't persist stale data across different threads
  useEffect(() => {
    // Reset refs
    hasMarkedAsReadRef.current = false
    firstUnreadRef.current = null
    setIsMarkedAsRead(false)

    // Clear any existing timers and comment tracking
    commentsRef.current.forEach((info) => {
      if (info.timerId) clearTimeout(info.timerId)
    })
    commentsRef.current.clear()

    // Disconnect existing observer (will be recreated by the other effect)
    observerRef.current?.disconnect()
    observerRef.current = null
  }, [threadId, userLastSeen]) // Also reset when userLastSeen changes

  // Handle marking thread as read
  const markThreadAsRead = useCallback(async () => {
    if (hasMarkedAsReadRef.current) return

    hasMarkedAsReadRef.current = true
    setIsMarkedAsRead(true)

    try {
      await conversationService.markThreadAsRead(spaceId, threadId, threadType)
      // BUG FIX #4: Pass threadId so caller can update navigation state
      onMarkAsRead?.(threadId)
    } catch (error) {
      console.error('Failed to mark thread as read:', error)
      // Reset on error so user can retry
      hasMarkedAsReadRef.current = false
      setIsMarkedAsRead(false)
    }
  }, [spaceId, threadId, threadType, onMarkAsRead])

  // Start timer when comment becomes visible
  const startReadTimer = useCallback(
    (commentId: string) => {
      const info = commentsRef.current.get(commentId)
      if (!info || info.timerId || hasMarkedAsReadRef.current) return

      info.enteredAt = Date.now()
      info.timerId = setTimeout(() => {
        // Comment was visible for the full delay - mark as read
        markThreadAsRead()
      }, readDelay)
    },
    [readDelay, markThreadAsRead]
  )

  // Cancel timer when comment scrolls out of view
  const cancelReadTimer = useCallback((commentId: string) => {
    const info = commentsRef.current.get(commentId)
    if (!info || !info.timerId) return

    clearTimeout(info.timerId)
    info.timerId = null
    info.enteredAt = null
  }, [])

  // Create observer on mount
  useEffect(() => {
    if (!enabled) return

    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const commentId = entry.target.getAttribute('data-comment-id')
          if (!commentId) return

          if (entry.isIntersecting && entry.intersectionRatio >= viewportThreshold) {
            startReadTimer(commentId)
          } else {
            cancelReadTimer(commentId)
          }
        })
      },
      {
        root: null, // viewport
        threshold: [viewportThreshold],
        rootMargin: '0px',
      }
    )

    // Capture ref values for cleanup
    const currentComments = commentsRef.current
    const currentObserver = observerRef.current

    return () => {
      // Cleanup: cancel all timers and disconnect observer
      currentComments.forEach((info) => {
        if (info.timerId) {
          clearTimeout(info.timerId)
        }
      })
      currentComments.clear()
      currentObserver?.disconnect()
    }
  }, [enabled, viewportThreshold, startReadTimer, cancelReadTimer])

  // Register a comment element for observation
  const registerComment = useCallback(
    (commentId: string, element: HTMLElement | null) => {
      if (!element || !enabled) return

      // Add data attribute for observer callback
      element.setAttribute('data-comment-id', commentId)

      // Check if this comment is unread (created after userLastSeen)
      const commentTime = element.getAttribute('data-comment-time')
      if (commentTime && userLastSeenTime > 0) {
        const commentTimestamp = new Date(commentTime).getTime()
        if (commentTimestamp > userLastSeenTime) {
          element.classList.add('comment-unread')

          // BUG FIX #2: Set firstUnreadRef to the EARLIEST unread (lowest timestamp)
          // Previously we used !firstUnreadRef.current which picked the first to register,
          // not necessarily the chronologically earliest
          const currentFirstTime = firstUnreadRef.current?.getAttribute('data-comment-time')
          const currentFirstTimestamp = currentFirstTime
            ? new Date(currentFirstTime).getTime()
            : Infinity

          if (commentTimestamp < currentFirstTimestamp) {
            firstUnreadRef.current = element
          }
        }
      }

      // Track the comment
      commentsRef.current.set(commentId, {
        element,
        enteredAt: null,
        timerId: null,
      })

      // Start observing
      observerRef.current?.observe(element)
    },
    [enabled, userLastSeenTime]
  )

  // Unregister a comment element
  const unregisterComment = useCallback((commentId: string) => {
    const info = commentsRef.current.get(commentId)
    if (!info) return

    // Cancel any pending timer
    if (info.timerId) {
      clearTimeout(info.timerId)
    }

    // Stop observing
    observerRef.current?.unobserve(info.element)

    // Remove from tracking
    commentsRef.current.delete(commentId)
  }, [])

  // Scroll to the first unread comment
  const scrollToFirstUnread = useCallback(() => {
    if (firstUnreadRef.current) {
      firstUnreadRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      })

      // Add highlight animation
      firstUnreadRef.current.classList.add('comment-highlight-flash')
      setTimeout(() => {
        firstUnreadRef.current?.classList.remove('comment-highlight-flash')
      }, 3000)
    }
  }, [])

  return {
    registerComment,
    unregisterComment,
    scrollToFirstUnread,
    isMarkedAsRead,
    firstUnreadRef,
  }
}
