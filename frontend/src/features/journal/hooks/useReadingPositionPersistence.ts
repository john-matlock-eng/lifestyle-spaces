/**
 * Hook for automatically persisting and restoring journal reading positions
 *
 * Features:
 * - Auto-saves position every 5 seconds
 * - Saves on page unload/unmount
 * - Restores position on mount
 * - Detects unread content (< 90% progress)
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import type { ReadingProgress } from '../types/navigation.types'
import type { ReadingPosition } from '../types/reading-position.types'
import {
  saveReadingPosition,
  getReadingPosition,
  deleteReadingPosition
} from '../api/readingPositions'

export interface UseReadingPositionPersistenceProps {
  /** Journal ID to track position for */
  journalId: string
  /** Space ID containing the journal */
  spaceId: string
  /** Current reading progress from useReadingProgress hook */
  readingProgress: ReadingProgress
  /** Enable/disable persistence (default: true) */
  enabled?: boolean
}

export interface UseReadingPositionPersistenceReturn {
  /** Saved position loaded from server (null if none exists) */
  savedPosition: ReadingPosition | null
  /** Whether a save operation is in progress */
  isSaving: boolean
  /** Whether position is being loaded from server */
  isRestoring: boolean
  /** Error from save/load operations (null if no error) */
  error: Error | null
  /** Manually trigger an immediate save */
  saveNow: () => Promise<void>
  /** Clear the saved position */
  clearPosition: () => Promise<void>
  /** True if saved position exists and progress < 90% */
  hasUnreadContent: boolean
}

/**
 * Hook to persist and restore journal reading positions
 *
 * @example
 * const {
 *   savedPosition,
 *   hasUnreadContent,
 *   saveNow,
 *   clearPosition
 * } = useReadingPositionPersistence({
 *   journalId: 'journal-123',
 *   spaceId: 'space-456',
 *   readingProgress,
 *   enabled: true
 * })
 *
 * // Show banner if user has unread content
 * {hasUnreadContent && <ResumeReadingBanner ... />}
 */
export function useReadingPositionPersistence({
  journalId,
  spaceId,
  readingProgress,
  enabled = true
}: UseReadingPositionPersistenceProps): UseReadingPositionPersistenceReturn {
  // State
  const [savedPosition, setSavedPosition] = useState<ReadingPosition | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isRestoring, setIsRestoring] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [hasUnreadContent, setHasUnreadContent] = useState(false)

  // Refs
  const saveIntervalRef = useRef<NodeJS.Timeout>()
  const lastSaveTimeRef = useRef<number>(0)
  const isMountedRef = useRef(true)

  /**
   * Save current position to server
   */
  const savePosition = useCallback(async () => {
    if (!enabled || !journalId || !spaceId) return

    // Don't save too frequently (minimum 1 second between saves)
    const now = Date.now()
    if (now - lastSaveTimeRef.current < 1000) {
      return
    }

    try {
      setIsSaving(true)
      setError(null)

      const currentScrollPosition = window.pageYOffset || document.documentElement.scrollTop

      const position = await saveReadingPosition({
        journalId,
        spaceId,
        scrollPosition: currentScrollPosition,
        currentSectionId: readingProgress.currentSectionId || undefined,
        progressPercent: readingProgress.overallPercent,
        wordsRead: readingProgress.wordsRead,
        totalWords: readingProgress.totalWordCount
      })

      if (isMountedRef.current) {
        setSavedPosition(position)
        lastSaveTimeRef.current = now

        // Update hasUnreadContent flag
        setHasUnreadContent(position.progressPercent < 90)
      }
    } catch (err) {
      console.error('Failed to save reading position:', err)
      if (isMountedRef.current) {
        setError(err instanceof Error ? err : new Error('Failed to save position'))
      }
    } finally {
      if (isMountedRef.current) {
        setIsSaving(false)
      }
    }
  }, [enabled, journalId, spaceId, readingProgress])

  /**
   * Load saved position from server
   */
  const loadPosition = useCallback(async () => {
    if (!enabled || !journalId) return

    try {
      setIsRestoring(true)
      setError(null)

      const position = await getReadingPosition(journalId)

      if (isMountedRef.current) {
        setSavedPosition(position)

        // Check if there's unread content
        if (position && position.progressPercent < 90) {
          setHasUnreadContent(true)
        }
      }
    } catch (err) {
      console.error('Failed to load reading position:', err)
      if (isMountedRef.current) {
        setError(err instanceof Error ? err : new Error('Failed to load position'))
      }
    } finally {
      if (isMountedRef.current) {
        setIsRestoring(false)
      }
    }
  }, [enabled, journalId])

  /**
   * Manually trigger an immediate save
   */
  const saveNow = useCallback(async () => {
    lastSaveTimeRef.current = 0 // Reset to allow immediate save
    await savePosition()
  }, [savePosition])

  /**
   * Clear the saved position
   */
  const clearPosition = useCallback(async () => {
    if (!journalId) return

    try {
      setError(null)
      await deleteReadingPosition(journalId)

      if (isMountedRef.current) {
        setSavedPosition(null)
        setHasUnreadContent(false)
      }
    } catch (err) {
      console.error('Failed to clear reading position:', err)
      if (isMountedRef.current) {
        setError(err instanceof Error ? err : new Error('Failed to clear position'))
      }
    }
  }, [journalId])

  /**
   * Load position on mount
   */
  useEffect(() => {
    loadPosition()
  }, [loadPosition])

  /**
   * Set up auto-save interval (every 5 seconds)
   */
  useEffect(() => {
    if (!enabled) return

    // Start auto-save interval
    saveIntervalRef.current = setInterval(() => {
      savePosition()
    }, 5000) // Save every 5 seconds

    return () => {
      if (saveIntervalRef.current) {
        clearInterval(saveIntervalRef.current)
      }
    }
  }, [enabled, savePosition])

  /**
   * Save on unmount
   */
  useEffect(() => {
    return () => {
      isMountedRef.current = false

      // Save position before unmounting
      if (enabled && journalId && spaceId) {
        // Note: sendBeacon is more reliable but doesn't wait for response
        // If sendBeacon isn't available, the position will be saved by the interval
        savePosition()
      }
    }
  }, [enabled, journalId, spaceId, savePosition])

  /**
   * Save on page unload (browser close, navigation away, etc.)
   */
  useEffect(() => {
    if (!enabled) return

    const handleBeforeUnload = () => {
      // Synchronous save on page unload
      const currentScrollPosition = window.pageYOffset || document.documentElement.scrollTop

      // Try to save using navigator.sendBeacon for reliability
      if (navigator.sendBeacon && journalId && spaceId) {
        JSON.stringify({
          journalId,
          spaceId,
          scrollPosition: currentScrollPosition,
          currentSectionId: readingProgress.currentSectionId || undefined,
          progressPercent: readingProgress.overallPercent,
          wordsRead: readingProgress.wordsRead,
          totalWords: readingProgress.totalWordCount
        })

        // Note: We would need a beacon endpoint, but for now just trigger regular save
        savePosition()
      } else {
        savePosition()
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [enabled, journalId, spaceId, readingProgress, savePosition])

  return {
    savedPosition,
    isSaving,
    isRestoring,
    error,
    saveNow,
    clearPosition,
    hasUnreadContent
  }
}
