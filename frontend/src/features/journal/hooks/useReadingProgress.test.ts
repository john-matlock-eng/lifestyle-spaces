import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useReadingProgress } from './useReadingProgress'

describe('useReadingProgress', () => {
  // Mock window properties
  let originalInnerHeight: number
  let originalScrollY: number

  beforeEach(() => {
    // Use fake timers FIRST
    vi.useFakeTimers()

    originalInnerHeight = window.innerHeight
    originalScrollY = window.scrollY

    // Set up mock dimensions
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: 800
    })

    Object.defineProperty(document.documentElement, 'scrollHeight', {
      writable: true,
      configurable: true,
      value: 2400 // 3x viewport height
    })

    Object.defineProperty(window, 'scrollY', {
      writable: true,
      configurable: true,
      value: 0
    })

    // Mock IntersectionObserver
    global.IntersectionObserver = vi.fn().mockImplementation((callback) => ({
      observe: vi.fn(),
      unobserve: vi.fn(),
      disconnect: vi.fn(),
      root: null,
      rootMargin: '',
      thresholds: []
    }))

    // Mock MutationObserver
    global.MutationObserver = vi.fn().mockImplementation((callback) => ({
      observe: vi.fn(),
      disconnect: vi.fn(),
      takeRecords: vi.fn()
    }))
  })

  afterEach(() => {
    window.innerHeight = originalInnerHeight
    window.scrollY = originalScrollY
    vi.clearAllTimers()
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  describe('scroll progress tracking', () => {
    it('should calculate initial scroll progress', () => {
      const onScrollProgress = vi.fn()

      renderHook(() =>
        useReadingProgress({
          onScrollProgress,
          throttleDelay: 0
        })
      )

      // Wait for initial scroll calculation
      act(() => {
        vi.runAllTimers()
      })

      expect(onScrollProgress).toHaveBeenCalledWith(0)
    })

    it('should calculate scroll progress percentage correctly', () => {
      const onScrollProgress = vi.fn()

      renderHook(() =>
        useReadingProgress({
          onScrollProgress,
          throttleDelay: 0
        })
      )

      // Scroll to 25%
      act(() => {
        Object.defineProperty(window, 'scrollY', { value: 400, configurable: true })
        window.dispatchEvent(new Event('scroll'))
        vi.runAllTimers()
      })

      expect(onScrollProgress).toHaveBeenCalledWith(25)

      // Scroll to 50%
      act(() => {
        Object.defineProperty(window, 'scrollY', { value: 800, configurable: true })
        window.dispatchEvent(new Event('scroll'))
        vi.runAllTimers()
      })

      expect(onScrollProgress).toHaveBeenCalledWith(50)

      // Scroll to 100%
      act(() => {
        Object.defineProperty(window, 'scrollY', { value: 1600, configurable: true })
        window.dispatchEvent(new Event('scroll'))
        vi.runAllTimers()
      })

      expect(onScrollProgress).toHaveBeenCalledWith(100)
    })

    it('should throttle scroll events', () => {
      const onScrollProgress = vi.fn()

      renderHook(() =>
        useReadingProgress({
          onScrollProgress,
          throttleDelay: 100
        })
      )

      // Initial calculation happens
      act(() => {
        vi.runAllTimers()
      })

      const initialCallCount = onScrollProgress.mock.calls.length

      // Trigger multiple scroll events rapidly
      act(() => {
        window.dispatchEvent(new Event('scroll'))
        window.dispatchEvent(new Event('scroll'))
        window.dispatchEvent(new Event('scroll'))
      })

      // Should call after throttle delay
      act(() => {
        vi.advanceTimersByTime(100)
      })

      // Should have called only once more (throttled) after initial
      expect(onScrollProgress.mock.calls.length).toBe(initialCallCount + 1)
    })

    it('should handle edge case when document height equals viewport height', () => {
      const onScrollProgress = vi.fn()

      // Make document same height as viewport
      Object.defineProperty(document.documentElement, 'scrollHeight', {
        value: 800,
        configurable: true
      })

      renderHook(() =>
        useReadingProgress({
          onScrollProgress,
          throttleDelay: 0
        })
      )

      act(() => {
        vi.runAllTimers()
      })

      // Should return 100% when content fits in viewport
      expect(onScrollProgress).toHaveBeenCalledWith(100)
    })
  })

  describe('section visibility tracking', () => {
    it('should set up IntersectionObserver with correct options', () => {
      const onSectionVisible = vi.fn()

      renderHook(() =>
        useReadingProgress({
          onSectionVisible,
          visibilityThreshold: 0.3
        })
      )

      expect(global.IntersectionObserver).toHaveBeenCalledWith(
        expect.any(Function),
        expect.objectContaining({
          threshold: [0, 0.3, 0.5, 1.0],
          rootMargin: '0px 0px -10% 0px'
        })
      )
    })

    it('should observe elements with data-section-id attribute', () => {
      const onSectionVisible = vi.fn()
      const mockObserve = vi.fn()

      global.IntersectionObserver = vi.fn().mockImplementation(() => ({
        observe: mockObserve,
        unobserve: vi.fn(),
        disconnect: vi.fn()
      }))

      // Create test sections
      const section1 = document.createElement('div')
      section1.setAttribute('data-section-id', 'section-1')
      const section2 = document.createElement('div')
      section2.setAttribute('data-section-id', 'section-2')

      document.body.appendChild(section1)
      document.body.appendChild(section2)

      renderHook(() =>
        useReadingProgress({
          onSectionVisible
        })
      )

      expect(mockObserve).toHaveBeenCalledWith(section1)
      expect(mockObserve).toHaveBeenCalledWith(section2)

      // Cleanup
      document.body.removeChild(section1)
      document.body.removeChild(section2)
    })

    it('should call onSectionVisible when section becomes visible', () => {
      const onSectionVisible = vi.fn()
      let observerCallback: IntersectionObserverCallback

      global.IntersectionObserver = vi.fn().mockImplementation((callback) => {
        observerCallback = callback
        return {
          observe: vi.fn(),
          unobserve: vi.fn(),
          disconnect: vi.fn()
        }
      })

      // Create test section
      const section = document.createElement('div')
      section.setAttribute('data-section-id', 'test-section')
      document.body.appendChild(section)

      renderHook(() =>
        useReadingProgress({
          onSectionVisible,
          visibilityThreshold: 0.3
        })
      )

      // Simulate intersection
      act(() => {
        observerCallback!(
          [
            {
              target: section,
              isIntersecting: true,
              intersectionRatio: 0.5,
              boundingClientRect: {} as DOMRectReadOnly,
              intersectionRect: {} as DOMRectReadOnly,
              rootBounds: null,
              time: 0
            }
          ] as IntersectionObserverEntry[],
          {} as IntersectionObserver
        )
      })

      expect(onSectionVisible).toHaveBeenCalledWith('test-section')

      // Cleanup
      document.body.removeChild(section)
    })

    it('should not call onSectionVisible when intersection ratio is below threshold', () => {
      const onSectionVisible = vi.fn()
      let observerCallback: IntersectionObserverCallback

      global.IntersectionObserver = vi.fn().mockImplementation((callback) => {
        observerCallback = callback
        return {
          observe: vi.fn(),
          unobserve: vi.fn(),
          disconnect: vi.fn()
        }
      })

      const section = document.createElement('div')
      section.setAttribute('data-section-id', 'test-section')
      document.body.appendChild(section)

      renderHook(() =>
        useReadingProgress({
          onSectionVisible,
          visibilityThreshold: 0.5
        })
      )

      // Simulate intersection with low ratio
      act(() => {
        observerCallback!(
          [
            {
              target: section,
              isIntersecting: true,
              intersectionRatio: 0.2, // Below threshold
              boundingClientRect: {} as DOMRectReadOnly,
              intersectionRect: {} as DOMRectReadOnly,
              rootBounds: null,
              time: 0
            }
          ] as IntersectionObserverEntry[],
          {} as IntersectionObserver
        )
      })

      expect(onSectionVisible).not.toHaveBeenCalled()

      // Cleanup
      document.body.removeChild(section)
    })
  })

  describe('cleanup', () => {
    it('should remove scroll listener on unmount', () => {
      const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener')

      const { unmount } = renderHook(() =>
        useReadingProgress({
          onScrollProgress: vi.fn()
        })
      )

      unmount()

      expect(removeEventListenerSpy).toHaveBeenCalledWith('scroll', expect.any(Function))
    })

    it('should disconnect observers on unmount', () => {
      const mockDisconnect = vi.fn()
      const mockUnobserve = vi.fn()

      global.IntersectionObserver = vi.fn().mockImplementation(() => ({
        observe: vi.fn(),
        unobserve: mockUnobserve,
        disconnect: mockDisconnect
      }))

      global.MutationObserver = vi.fn().mockImplementation(() => ({
        observe: vi.fn(),
        disconnect: vi.fn()
      }))

      const { unmount } = renderHook(() =>
        useReadingProgress({
          onSectionVisible: vi.fn()
        })
      )

      unmount()

      expect(mockDisconnect).toHaveBeenCalled()
    })
  })

  describe('performance', () => {
    it('should use passive scroll listener', () => {
      const addEventListenerSpy = vi.spyOn(window, 'addEventListener')

      renderHook(() =>
        useReadingProgress({
          onScrollProgress: vi.fn()
        })
      )

      expect(addEventListenerSpy).toHaveBeenCalledWith(
        'scroll',
        expect.any(Function),
        { passive: true }
      )
    })

    it('should handle rapid scroll events efficiently', () => {
      const onScrollProgress = vi.fn()

      renderHook(() =>
        useReadingProgress({
          onScrollProgress,
          throttleDelay: 100
        })
      )

      // Simulate rapid scrolling (100 events)
      act(() => {
        for (let i = 0; i < 100; i++) {
          window.dispatchEvent(new Event('scroll'))
        }
      })

      // Should only process once due to throttling
      act(() => {
        vi.advanceTimersByTime(100)
      })

      // Should have initial call + 1 throttled call
      expect(onScrollProgress.mock.calls.length).toBeLessThan(5)
    })
  })
})
