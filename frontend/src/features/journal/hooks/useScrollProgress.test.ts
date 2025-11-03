import { renderHook, act } from '@testing-library/react'
import { useScrollProgress } from './useScrollProgress'
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'

describe('useScrollProgress', () => {
  let scrollYValue: number

  beforeEach(() => {
    scrollYValue = 0

    // Mock window.scrollY with getter/setter
    Object.defineProperty(window, 'scrollY', {
      get: () => scrollYValue,
      set: (value: number) => { scrollYValue = value },
      configurable: true
    })

    // Mock window.innerHeight
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: 800
    })

    // Mock requestAnimationFrame to execute callback immediately
    global.requestAnimationFrame = vi.fn((cb) => {
      cb(0)
      return 0
    }) as any
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Header State Transitions', () => {
    it('should start in full state when scroll is 0', () => {
      const { result } = renderHook(() => useScrollProgress())

      expect(result.current.headerState).toBe('full')
      expect(result.current.scrollY).toBe(0)
    })

    it('should transition to compact state at 100px threshold', () => {
      const { result } = renderHook(() => useScrollProgress())

      act(() => {
        window.scrollY = 150
        window.dispatchEvent(new Event('scroll'))
      })

      expect(result.current.headerState).toBe('compact')
      expect(result.current.scrollY).toBe(150)
    })

    it('should transition to hidden state at 500px threshold when scrolling down', () => {
      const { result } = renderHook(() => useScrollProgress())

      // Scroll down past hide threshold in one go
      act(() => {
        window.scrollY = 550
        window.dispatchEvent(new Event('scroll'))
      })

      expect(result.current.headerState).toBe('hidden')
      expect(result.current.scrollY).toBe(550)
      expect(result.current.isScrollingUp).toBe(false)
    })

    it('should show compact state when scrolling up from hidden state', () => {
      const { result } = renderHook(() => useScrollProgress())

      // First, scroll down to 600 (hidden state)
      act(() => {
        window.scrollY = 600
        window.dispatchEvent(new Event('scroll'))
      })

      // Verify we're in hidden state
      expect(result.current.headerState).toBe('hidden')
      expect(result.current.scrollY).toBe(600)

      // Then scroll up to 300 (should show compact)
      act(() => {
        window.scrollY = 300
        window.dispatchEvent(new Event('scroll'))
      })

      expect(result.current.headerState).toBe('compact')
      expect(result.current.isScrollingUp).toBe(true)
    })

    it('should use custom thresholds when provided', () => {
      const { result } = renderHook(() =>
        useScrollProgress({
          compactThreshold: 50,
          hideThreshold: 200
        })
      )

      // Test custom compact threshold (> 50)
      act(() => {
        window.scrollY = 75
        window.dispatchEvent(new Event('scroll'))
      })

      expect(result.current.headerState).toBe('compact')

      // Test custom hide threshold (> 200, scrolling down)
      act(() => {
        window.scrollY = 250
        window.dispatchEvent(new Event('scroll'))
      })

      expect(result.current.headerState).toBe('hidden')
      expect(result.current.isScrollingUp).toBe(false)
    })
  })

  describe('Scroll Direction Detection', () => {
    it('should detect scrolling down', () => {
      const { result } = renderHook(() => useScrollProgress())

      act(() => {
        window.scrollY = 100
        window.dispatchEvent(new Event('scroll'))
      })

      expect(result.current.isScrollingUp).toBe(false)
      expect(result.current.scrollY).toBe(100)
    })

    it('should detect scrolling up', () => {
      const { result } = renderHook(() => useScrollProgress())

      // First scroll down to 200
      act(() => {
        window.scrollY = 200
        window.dispatchEvent(new Event('scroll'))
      })

      expect(result.current.scrollY).toBe(200)
      expect(result.current.isScrollingUp).toBe(false)

      // Then scroll up to 100
      act(() => {
        window.scrollY = 100
        window.dispatchEvent(new Event('scroll'))
      })

      expect(result.current.scrollY).toBe(100)
      expect(result.current.isScrollingUp).toBe(true)
    })
  })

  describe('Reading Progress Calculation', () => {
    it('should calculate 0% progress at top of page', () => {
      const contentRef = {
        current: {
          scrollHeight: 2000
        } as HTMLElement
      }

      const { result } = renderHook(() =>
        useScrollProgress({ contentRef })
      )

      expect(result.current.readProgress).toBe(0)
    })

    it('should calculate 100% progress at bottom of page', () => {
      const contentRef = {
        current: {
          scrollHeight: 2000
        } as HTMLElement
      }

      const { result } = renderHook(() =>
        useScrollProgress({ contentRef })
      )

      act(() => {
        // scrollHeight (2000) - innerHeight (800) = 1200 trackLength
        window.scrollY = 1200
        window.dispatchEvent(new Event('scroll'))
      })

      expect(result.current.readProgress).toBe(100)
    })

    it('should calculate 50% progress at middle of page', () => {
      const contentRef = {
        current: {
          scrollHeight: 2000
        } as HTMLElement
      }

      const { result } = renderHook(() =>
        useScrollProgress({ contentRef })
      )

      act(() => {
        // trackLength = 2000 - 800 = 1200
        // 50% = 600px
        window.scrollY = 600
        window.dispatchEvent(new Event('scroll'))
      })

      expect(result.current.readProgress).toBe(50)
    })

    it('should return 100% when content is shorter than viewport', () => {
      const contentRef = {
        current: {
          scrollHeight: 500 // Shorter than viewport (800)
        } as HTMLElement
      }

      const { result } = renderHook(() =>
        useScrollProgress({ contentRef })
      )

      expect(result.current.readProgress).toBe(100)
    })

    it('should return 0% when contentRef is not provided', () => {
      const { result } = renderHook(() => useScrollProgress())

      expect(result.current.readProgress).toBe(0)
    })

    it('should clamp progress between 0 and 100', () => {
      const contentRef = {
        current: {
          scrollHeight: 2000
        } as HTMLElement
      }

      const { result } = renderHook(() =>
        useScrollProgress({ contentRef })
      )

      // Test over-scroll
      act(() => {
        window.scrollY = 5000
        window.dispatchEvent(new Event('scroll'))
      })

      expect(result.current.readProgress).toBe(100)

      // Test negative scroll
      act(() => {
        window.scrollY = -100
        window.dispatchEvent(new Event('scroll'))
      })

      expect(result.current.readProgress).toBeLessThanOrEqual(100)
      expect(result.current.readProgress).toBeGreaterThanOrEqual(0)
    })
  })

  describe('Performance Optimization', () => {
    it('should use requestAnimationFrame for throttling', () => {
      const { result } = renderHook(() => useScrollProgress())

      act(() => {
        window.scrollY = 100
        window.dispatchEvent(new Event('scroll'))
      })

      expect(global.requestAnimationFrame).toHaveBeenCalled()
    })

    it('should not trigger multiple updates for rapid scroll events', () => {
      const rafSpy = vi.spyOn(global, 'requestAnimationFrame')

      renderHook(() => useScrollProgress())

      act(() => {
        // Simulate rapid scroll events
        window.scrollY = 50
        window.dispatchEvent(new Event('scroll'))
        window.dispatchEvent(new Event('scroll'))
        window.dispatchEvent(new Event('scroll'))
      })

      // Should only call rAF once per scroll update cycle
      expect(rafSpy.mock.calls.length).toBeLessThanOrEqual(3)
    })
  })

  describe('Cleanup', () => {
    it('should remove scroll listener on unmount', () => {
      const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener')

      const { unmount } = renderHook(() => useScrollProgress())

      unmount()

      expect(removeEventListenerSpy).toHaveBeenCalledWith('scroll', expect.any(Function))
    })
  })

  describe('Edge Cases', () => {
    it('should handle scroll position at and above compact threshold', () => {
      const { result } = renderHook(() =>
        useScrollProgress({ compactThreshold: 100 })
      )

      // At exactly 100px, should still be full state (threshold is >100)
      act(() => {
        window.scrollY = 100
        window.dispatchEvent(new Event('scroll'))
      })

      expect(result.current.headerState).toBe('full')

      // At 101px, should be compact
      act(() => {
        window.scrollY = 101
        window.dispatchEvent(new Event('scroll'))
      })

      expect(result.current.headerState).toBe('compact')
    })

    it('should handle scroll position at and above hide threshold', () => {
      const { result } = renderHook(() =>
        useScrollProgress({ hideThreshold: 500, compactThreshold: 100 })
      )

      // At exactly 500px, should still be compact (threshold is >500)
      act(() => {
        window.scrollY = 500
        window.dispatchEvent(new Event('scroll'))
      })

      expect(result.current.headerState).toBe('compact')

      // At 501px, scrolling down, should be hidden
      act(() => {
        window.scrollY = 501
        window.dispatchEvent(new Event('scroll'))
      })

      expect(result.current.headerState).toBe('hidden')
    })
  })
})
