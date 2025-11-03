import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useReadingPositionPersistence } from './useReadingPositionPersistence'
import type { ReadingProgress } from '../types/navigation.types'
import type { ReadingPosition } from '../types/reading-position.types'

// Mock the API client
vi.mock('../api/readingPositions', () => ({
  saveReadingPosition: vi.fn(),
  getReadingPosition: vi.fn(),
  deleteReadingPosition: vi.fn()
}))

import {
  saveReadingPosition,
  getReadingPosition,
  deleteReadingPosition
} from '../api/readingPositions'

describe('useReadingPositionPersistence', () => {
  const mockReadingProgress: ReadingProgress = {
    currentSectionId: 'section-2',
    overallPercent: 45.5,
    sectionsComplete: 1,
    sectionsTotal: 3,
    estimatedMinutesRemaining: 5,
    totalWordCount: 1000,
    wordsRead: 455
  }

  const mockSavedPosition: ReadingPosition = {
    journalId: 'journal-123',
    spaceId: 'space-456',
    userId: 'user-789',
    scrollPosition: 1200,
    currentSectionId: 'section-2',
    progressPercent: 45.5,
    wordsRead: 455,
    totalWords: 1000,
    lastReadAt: '2024-01-15T10:30:00Z',
    createdAt: '2024-01-15T09:00:00Z',
    updatedAt: '2024-01-15T10:30:00Z'
  }

  const defaultProps = {
    journalId: 'journal-123',
    spaceId: 'space-456',
    readingProgress: mockReadingProgress,
    enabled: true
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()

    // Mock window properties
    Object.defineProperty(window, 'pageYOffset', { value: 1200, writable: true })
    Object.defineProperty(document.documentElement, 'scrollTop', { value: 1200, writable: true })

    // Mock navigator.sendBeacon
    Object.defineProperty(navigator, 'sendBeacon', {
      value: vi.fn(() => true),
      writable: true
    })
  })

  afterEach(() => {
    try {
      vi.runOnlyPendingTimers()
    } catch {
      // Timers might not be mocked in some tests
    }
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  describe('Initialization', () => {
    it('should initialize with default state', () => {
      vi.mocked(getReadingPosition).mockResolvedValue(null)

      const { result } = renderHook(() => useReadingPositionPersistence(defaultProps))

      expect(result.current.savedPosition).toBeNull()
      expect(result.current.isSaving).toBe(false)
      expect(result.current.isRestoring).toBe(false)
      expect(result.current.error).toBeNull()
      expect(result.current.hasUnreadContent).toBe(false)
    })

    it('should load saved position on mount', async () => {
      vi.mocked(getReadingPosition).mockResolvedValue(mockSavedPosition)

      const { result } = renderHook(() => useReadingPositionPersistence(defaultProps))

      await waitFor(() => {
        expect(result.current.savedPosition).toEqual(mockSavedPosition)
        expect(result.current.isRestoring).toBe(false)
      })
    })

    it('should set hasUnreadContent when progress < 90%', async () => {
      const position = { ...mockSavedPosition, progressPercent: 45 }
      vi.mocked(getReadingPosition).mockResolvedValue(position)

      const { result } = renderHook(() => useReadingPositionPersistence(defaultProps))

      await waitFor(() => {
        expect(result.current.hasUnreadContent).toBe(true)
      })
    })

    it('should not set hasUnreadContent when progress >= 90%', async () => {
      const position = { ...mockSavedPosition, progressPercent: 95 }
      vi.mocked(getReadingPosition).mockResolvedValue(position)

      const { result } = renderHook(() => useReadingPositionPersistence(defaultProps))

      await waitFor(() => {
        expect(result.current.hasUnreadContent).toBe(false)
      })
    })

    it('should handle load error gracefully', async () => {
      const error = new Error('Network error')
      vi.mocked(getReadingPosition).mockRejectedValue(error)

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      const { result } = renderHook(() => useReadingPositionPersistence(defaultProps))

      await waitFor(() => {
        expect(result.current.error).toEqual(error)
        expect(result.current.isRestoring).toBe(false)
      })

      consoleSpy.mockRestore()
    })

    it('should not load position when enabled is false', async () => {
      vi.mocked(getReadingPosition).mockResolvedValue(mockSavedPosition)

      renderHook(() => useReadingPositionPersistence({ ...defaultProps, enabled: false }))

      await vi.advanceTimersByTimeAsync(100)

      expect(getReadingPosition).not.toHaveBeenCalled()
    })
  })

  describe('Auto-save', () => {
    it('should auto-save position every 5 seconds', async () => {
      vi.mocked(getReadingPosition).mockResolvedValue(null)
      vi.mocked(saveReadingPosition).mockResolvedValue(mockSavedPosition)

      renderHook(() => useReadingPositionPersistence(defaultProps))

      // Wait for initial load to complete
      await waitFor(() => {
        expect(getReadingPosition).toHaveBeenCalled()
      })

      // Clear the mock to track new calls
      vi.clearAllMocks()

      // Advance time by 5 seconds
      await vi.advanceTimersByTimeAsync(5000)

      await waitFor(() => {
        expect(saveReadingPosition).toHaveBeenCalledWith({
          journalId: 'journal-123',
          spaceId: 'space-456',
          scrollPosition: 1200,
          currentSectionId: 'section-2',
          progressPercent: 45.5,
          wordsRead: 455,
          totalWords: 1000
        })
      })
    })

    it('should save multiple times at 5-second intervals', async () => {
      vi.mocked(getReadingPosition).mockResolvedValue(null)
      vi.mocked(saveReadingPosition).mockResolvedValue(mockSavedPosition)

      renderHook(() => useReadingPositionPersistence(defaultProps))

      await waitFor(() => {
        expect(getReadingPosition).toHaveBeenCalled()
      })

      vi.clearAllMocks()

      // Advance 15 seconds (3 intervals)
      await vi.advanceTimersByTimeAsync(15000)

      await waitFor(() => {
        expect(saveReadingPosition).toHaveBeenCalledTimes(3)
      })
    })

    it('should not auto-save when enabled is false', async () => {
      vi.mocked(getReadingPosition).mockResolvedValue(null)
      vi.mocked(saveReadingPosition).mockResolvedValue(mockSavedPosition)

      renderHook(() => useReadingPositionPersistence({ ...defaultProps, enabled: false }))

      await vi.advanceTimersByTimeAsync(10000)

      expect(saveReadingPosition).not.toHaveBeenCalled()
    })

    it('should clear interval on unmount', async () => {
      vi.mocked(getReadingPosition).mockResolvedValue(null)
      vi.mocked(saveReadingPosition).mockResolvedValue(mockSavedPosition)

      const { unmount } = renderHook(() => useReadingPositionPersistence(defaultProps))

      await waitFor(() => {
        expect(getReadingPosition).toHaveBeenCalled()
      })

      unmount()

      vi.clearAllMocks()

      // Advance time after unmount
      await vi.advanceTimersByTimeAsync(10000)

      expect(saveReadingPosition).not.toHaveBeenCalled()
    })
  })

  describe('Throttling', () => {
    it('should throttle saves to minimum 1 second apart', async () => {
      vi.mocked(getReadingPosition).mockResolvedValue(null)
      vi.mocked(saveReadingPosition).mockResolvedValue(mockSavedPosition)

      const { result } = renderHook(() => useReadingPositionPersistence(defaultProps))

      await waitFor(() => {
        expect(getReadingPosition).toHaveBeenCalled()
      })

      vi.clearAllMocks()

      // Call saveNow multiple times rapidly
      act(() => {
        result.current.saveNow()
      })

      await vi.advanceTimersByTimeAsync(100)

      act(() => {
        result.current.saveNow()
      })

      await vi.advanceTimersByTimeAsync(100)

      act(() => {
        result.current.saveNow()
      })

      await waitFor(() => {
        // Only first call should succeed
        expect(saveReadingPosition).toHaveBeenCalledTimes(1)
      })
    })

    it('should allow save after 1 second has passed', async () => {
      vi.mocked(getReadingPosition).mockResolvedValue(null)
      vi.mocked(saveReadingPosition).mockResolvedValue(mockSavedPosition)

      const { result } = renderHook(() => useReadingPositionPersistence(defaultProps))

      await waitFor(() => {
        expect(getReadingPosition).toHaveBeenCalled()
      })

      vi.clearAllMocks()

      // First save
      act(() => {
        result.current.saveNow()
      })

      await waitFor(() => {
        expect(saveReadingPosition).toHaveBeenCalledTimes(1)
      })

      // Wait 1 second
      await vi.advanceTimersByTimeAsync(1000)

      // Second save should work
      act(() => {
        result.current.saveNow()
      })

      await waitFor(() => {
        expect(saveReadingPosition).toHaveBeenCalledTimes(2)
      })
    })
  })

  describe('saveNow', () => {
    it('should trigger immediate save', async () => {
      vi.mocked(getReadingPosition).mockResolvedValue(null)
      vi.mocked(saveReadingPosition).mockResolvedValue(mockSavedPosition)

      const { result } = renderHook(() => useReadingPositionPersistence(defaultProps))

      await waitFor(() => {
        expect(getReadingPosition).toHaveBeenCalled()
      })

      vi.clearAllMocks()

      await act(async () => {
        await result.current.saveNow()
      })

      expect(saveReadingPosition).toHaveBeenCalled()
    })

    it('should update savedPosition after save', async () => {
      vi.mocked(getReadingPosition).mockResolvedValue(null)
      vi.mocked(saveReadingPosition).mockResolvedValue(mockSavedPosition)

      const { result } = renderHook(() => useReadingPositionPersistence(defaultProps))

      await waitFor(() => {
        expect(getReadingPosition).toHaveBeenCalled()
      })

      await act(async () => {
        await result.current.saveNow()
      })

      await waitFor(() => {
        expect(result.current.savedPosition).toEqual(mockSavedPosition)
      })
    })

    it('should set isSaving flag during save', async () => {
      vi.mocked(getReadingPosition).mockResolvedValue(null)

      let resolveSave: (value: ReadingPosition) => void
      const savePromise = new Promise<ReadingPosition>((resolve) => {
        resolveSave = resolve
      })
      vi.mocked(saveReadingPosition).mockReturnValue(savePromise)

      const { result } = renderHook(() => useReadingPositionPersistence(defaultProps))

      await waitFor(() => {
        expect(getReadingPosition).toHaveBeenCalled()
      })

      act(() => {
        result.current.saveNow()
      })

      await waitFor(() => {
        expect(result.current.isSaving).toBe(true)
      })

      await act(async () => {
        resolveSave!(mockSavedPosition)
      })

      await waitFor(() => {
        expect(result.current.isSaving).toBe(false)
      })
    })

    it('should handle save errors', async () => {
      vi.mocked(getReadingPosition).mockResolvedValue(null)
      const error = new Error('Save failed')
      vi.mocked(saveReadingPosition).mockRejectedValue(error)

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      const { result } = renderHook(() => useReadingPositionPersistence(defaultProps))

      await waitFor(() => {
        expect(getReadingPosition).toHaveBeenCalled()
      })

      await act(async () => {
        await result.current.saveNow()
      })

      await waitFor(() => {
        expect(result.current.error).toEqual(error)
        expect(result.current.isSaving).toBe(false)
      })

      consoleSpy.mockRestore()
    })

    it('should bypass throttle when called', async () => {
      vi.mocked(getReadingPosition).mockResolvedValue(null)
      vi.mocked(saveReadingPosition).mockResolvedValue(mockSavedPosition)

      const { result } = renderHook(() => useReadingPositionPersistence(defaultProps))

      await waitFor(() => {
        expect(getReadingPosition).toHaveBeenCalled()
      })

      vi.clearAllMocks()

      // First auto-save
      await vi.advanceTimersByTimeAsync(5000)

      await waitFor(() => {
        expect(saveReadingPosition).toHaveBeenCalledTimes(1)
      })

      // Immediate saveNow should work (resets throttle)
      await act(async () => {
        await result.current.saveNow()
      })

      await waitFor(() => {
        expect(saveReadingPosition).toHaveBeenCalledTimes(2)
      })
    })
  })

  describe('clearPosition', () => {
    it('should delete position from server', async () => {
      vi.mocked(getReadingPosition).mockResolvedValue(mockSavedPosition)
      vi.mocked(deleteReadingPosition).mockResolvedValue()

      const { result } = renderHook(() => useReadingPositionPersistence(defaultProps))

      await waitFor(() => {
        expect(result.current.savedPosition).toEqual(mockSavedPosition)
      })

      await act(async () => {
        await result.current.clearPosition()
      })

      expect(deleteReadingPosition).toHaveBeenCalledWith('journal-123')
    })

    it('should clear local state after deletion', async () => {
      vi.mocked(getReadingPosition).mockResolvedValue(mockSavedPosition)
      vi.mocked(deleteReadingPosition).mockResolvedValue()

      const { result } = renderHook(() => useReadingPositionPersistence(defaultProps))

      await waitFor(() => {
        expect(result.current.savedPosition).toEqual(mockSavedPosition)
        expect(result.current.hasUnreadContent).toBe(true)
      })

      await act(async () => {
        await result.current.clearPosition()
      })

      await waitFor(() => {
        expect(result.current.savedPosition).toBeNull()
        expect(result.current.hasUnreadContent).toBe(false)
      })
    })

    it('should handle delete errors', async () => {
      vi.useRealTimers()
      vi.mocked(getReadingPosition).mockResolvedValue(mockSavedPosition)
      const error = new Error('Delete failed')
      vi.mocked(deleteReadingPosition).mockRejectedValue(error)

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      const { result } = renderHook(() => useReadingPositionPersistence(defaultProps))

      await waitFor(() => {
        expect(result.current.savedPosition).toEqual(mockSavedPosition)
      }, { timeout: 1000 })

      await act(async () => {
        await result.current.clearPosition()
      })

      await waitFor(() => {
        expect(result.current.error).toEqual(error)
        // Position should still exist after error
        expect(result.current.savedPosition).toEqual(mockSavedPosition)
      }, { timeout: 1000 })

      consoleSpy.mockRestore()
      vi.useFakeTimers()
    })
  })

  describe('Save on unmount', () => {
    it('should save position when component unmounts', async () => {
      vi.useRealTimers()
      vi.mocked(getReadingPosition).mockResolvedValue(null)
      vi.mocked(saveReadingPosition).mockResolvedValue(mockSavedPosition)

      const { unmount } = renderHook(() => useReadingPositionPersistence(defaultProps))

      await waitFor(() => {
        expect(getReadingPosition).toHaveBeenCalled()
      }, { timeout: 1000 })

      vi.clearAllMocks()

      unmount()

      // The save is called synchronously on unmount
      await waitFor(() => {
        expect(saveReadingPosition).toHaveBeenCalled()
      }, { timeout: 1000 })

      vi.useFakeTimers()
    })

    it('should not save on unmount when enabled is false', async () => {
      vi.mocked(getReadingPosition).mockResolvedValue(null)
      vi.mocked(saveReadingPosition).mockResolvedValue(mockSavedPosition)

      const { unmount } = renderHook(() =>
        useReadingPositionPersistence({ ...defaultProps, enabled: false })
      )

      await vi.advanceTimersByTimeAsync(100)

      unmount()

      expect(saveReadingPosition).not.toHaveBeenCalled()
    })
  })

  describe('beforeunload event', () => {
    it('should add beforeunload event listener', async () => {
      vi.useRealTimers()
      vi.mocked(getReadingPosition).mockResolvedValue(null)

      const addEventListenerSpy = vi.spyOn(window, 'addEventListener')

      renderHook(() => useReadingPositionPersistence(defaultProps))

      await waitFor(() => {
        expect(addEventListenerSpy).toHaveBeenCalledWith('beforeunload', expect.any(Function))
      }, { timeout: 1000 })

      vi.useFakeTimers()
    })

    it('should remove beforeunload listener on unmount', async () => {
      vi.useRealTimers()
      vi.mocked(getReadingPosition).mockResolvedValue(null)

      const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener')

      const { unmount } = renderHook(() => useReadingPositionPersistence(defaultProps))

      await waitFor(() => {
        expect(getReadingPosition).toHaveBeenCalled()
      }, { timeout: 1000 })

      unmount()

      expect(removeEventListenerSpy).toHaveBeenCalledWith('beforeunload', expect.any(Function))

      vi.useFakeTimers()
    })

    it('should not add listener when enabled is false', async () => {
      vi.mocked(getReadingPosition).mockResolvedValue(null)

      const addEventListenerSpy = vi.spyOn(window, 'addEventListener')

      renderHook(() => useReadingPositionPersistence({ ...defaultProps, enabled: false }))

      await vi.advanceTimersByTimeAsync(100)

      const beforeunloadCalls = addEventListenerSpy.mock.calls.filter(
        call => call[0] === 'beforeunload'
      )
      expect(beforeunloadCalls).toHaveLength(0)
    })
  })

  describe('Reading progress updates', () => {
    it('should save with updated progress when readingProgress changes', async () => {
      vi.useRealTimers()
      vi.mocked(getReadingPosition).mockResolvedValue(null)
      vi.mocked(saveReadingPosition).mockResolvedValue(mockSavedPosition)

      const { rerender } = renderHook(
        (props) => useReadingPositionPersistence(props),
        { initialProps: defaultProps }
      )

      await waitFor(() => {
        expect(getReadingPosition).toHaveBeenCalled()
      }, { timeout: 1000 })

      const updatedProgress: ReadingProgress = {
        ...mockReadingProgress,
        overallPercent: 75,
        wordsRead: 750
      }

      rerender({ ...defaultProps, readingProgress: updatedProgress })

      vi.clearAllMocks()

      // Wait for auto-save (5 seconds)
      await new Promise(resolve => setTimeout(resolve, 5100))

      await waitFor(() => {
        expect(saveReadingPosition).toHaveBeenCalledWith(
          expect.objectContaining({
            progressPercent: 75,
            wordsRead: 750
          })
        )
      }, { timeout: 2000 })

      vi.useFakeTimers()
    }, 10000) // Increase timeout to 10 seconds for this slow test

    it('should update hasUnreadContent based on new progress', async () => {
      vi.useRealTimers()
      const position = { ...mockSavedPosition, progressPercent: 85 }
      vi.mocked(getReadingPosition).mockResolvedValue(position)
      vi.mocked(saveReadingPosition).mockImplementation(async (data) => ({
        ...mockSavedPosition,
        ...data
      }))

      const { result } = renderHook(() => useReadingPositionPersistence(defaultProps))

      await waitFor(() => {
        expect(result.current.hasUnreadContent).toBe(true)
      }, { timeout: 1000 })

      vi.clearAllMocks()

      // Mock returns position with high progress
      vi.mocked(saveReadingPosition).mockResolvedValue({
        ...mockSavedPosition,
        progressPercent: 95
      })

      await act(async () => {
        await result.current.saveNow()
      })

      await waitFor(() => {
        expect(result.current.hasUnreadContent).toBe(false)
      }, { timeout: 1000 })

      vi.useFakeTimers()
    })
  })

  describe('Edge Cases', () => {
    it('should handle missing journalId', async () => {
      vi.mocked(getReadingPosition).mockResolvedValue(null)
      vi.mocked(saveReadingPosition).mockResolvedValue(mockSavedPosition)

      const { result } = renderHook(() =>
        useReadingPositionPersistence({ ...defaultProps, journalId: '' })
      )

      await vi.advanceTimersByTimeAsync(100)

      expect(getReadingPosition).not.toHaveBeenCalled()

      await act(async () => {
        await result.current.saveNow()
      })

      expect(saveReadingPosition).not.toHaveBeenCalled()
    })

    it('should handle missing spaceId', async () => {
      vi.mocked(getReadingPosition).mockResolvedValue(null)
      vi.mocked(saveReadingPosition).mockResolvedValue(mockSavedPosition)

      renderHook(() =>
        useReadingPositionPersistence({ ...defaultProps, spaceId: '' })
      )

      await vi.advanceTimersByTimeAsync(100)

      // Should not be called initially because spaceId is empty
      expect(saveReadingPosition).not.toHaveBeenCalled()
    })

    it('should handle currentSectionId being null', async () => {
      vi.useRealTimers()
      vi.mocked(getReadingPosition).mockResolvedValue(null)
      vi.mocked(saveReadingPosition).mockResolvedValue(mockSavedPosition)

      const progressWithoutSection: ReadingProgress = {
        ...mockReadingProgress,
        currentSectionId: null
      }

      const { result } = renderHook(() =>
        useReadingPositionPersistence({ ...defaultProps, readingProgress: progressWithoutSection })
      )

      await waitFor(() => {
        expect(getReadingPosition).toHaveBeenCalled()
      }, { timeout: 1000 })

      vi.clearAllMocks()

      await act(async () => {
        await result.current.saveNow()
      })

      await waitFor(() => {
        expect(saveReadingPosition).toHaveBeenCalledWith(
          expect.objectContaining({
            currentSectionId: undefined
          })
        )
      }, { timeout: 1000 })

      vi.useFakeTimers()
    })

    it('should handle 0% progress', async () => {
      vi.useRealTimers()
      const position = { ...mockSavedPosition, progressPercent: 0 }
      vi.mocked(getReadingPosition).mockResolvedValue(position)

      const { result } = renderHook(() => useReadingPositionPersistence(defaultProps))

      await waitFor(() => {
        expect(result.current.hasUnreadContent).toBe(true)
      }, { timeout: 1000 })

      vi.useFakeTimers()
    })

    it('should handle 100% progress', async () => {
      vi.useRealTimers()
      const position = { ...mockSavedPosition, progressPercent: 100 }
      vi.mocked(getReadingPosition).mockResolvedValue(position)

      const { result } = renderHook(() => useReadingPositionPersistence(defaultProps))

      await waitFor(() => {
        expect(result.current.hasUnreadContent).toBe(false)
      }, { timeout: 1000 })

      vi.useFakeTimers()
    })

    it('should handle exactly 90% progress', async () => {
      vi.useRealTimers()
      const position = { ...mockSavedPosition, progressPercent: 90 }
      vi.mocked(getReadingPosition).mockResolvedValue(position)

      const { result } = renderHook(() => useReadingPositionPersistence(defaultProps))

      await waitFor(() => {
        expect(result.current.hasUnreadContent).toBe(false)
      }, { timeout: 1000 })

      vi.useFakeTimers()
    })

    it('should not crash when unmounted during save', async () => {
      vi.useRealTimers()
      vi.mocked(getReadingPosition).mockResolvedValue(null)

      let resolveSave: (value: ReadingPosition) => void
      const savePromise = new Promise<ReadingPosition>((resolve) => {
        resolveSave = resolve
      })
      vi.mocked(saveReadingPosition).mockReturnValue(savePromise)

      const { result, unmount } = renderHook(() => useReadingPositionPersistence(defaultProps))

      await waitFor(() => {
        expect(getReadingPosition).toHaveBeenCalled()
      }, { timeout: 1000 })

      act(() => {
        result.current.saveNow()
      })

      // Unmount while save is in progress
      unmount()

      // Resolve save after unmount
      await act(async () => {
        resolveSave!(mockSavedPosition)
      })

      // Should not throw or update state
      expect(true).toBe(true)

      vi.useFakeTimers()
    })
  })
})
