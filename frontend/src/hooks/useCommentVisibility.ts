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
  onMarkAsRead?: () => void
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

  // Handle marking thread as read
  const markThreadAsRead = useCallback(async () => {
    if (hasMarkedAsReadRef.current) return

    hasMarkedAsReadRef.current = true
    setIsMarkedAsRead(true)

    try {
      await conversationService.markThreadAsRead(spaceId, threadId, threadType)
      onMarkAsRead?.()
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

    return () => {
      // Cleanup: cancel all timers and disconnect observer
      commentsRef.current.forEach((info) => {
        if (info.timerId) {
          clearTimeout(info.timerId)
        }
      })
      commentsRef.current.clear()
      observerRef.current?.disconnect()
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
        if (commentTimestamp > userLastSeenTime && !firstUnreadRef.current) {
          firstUnreadRef.current = element
          element.classList.add('comment-unread')
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
