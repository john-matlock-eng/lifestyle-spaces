import { useState, useEffect, useCallback, useRef } from 'react'

export type HeaderState = 'full' | 'compact' | 'hidden'

export interface ScrollProgressResult {
  /** Current scroll position in pixels */
  scrollY: number
  /** Reading progress as a percentage (0-100) */
  readProgress: number
  /** Current header state based on scroll position */
  headerState: HeaderState
  /** Whether user is scrolling up */
  isScrollingUp: boolean
}

interface UseScrollProgressOptions {
  /** Scroll threshold for compact state (default: 100px) */
  compactThreshold?: number
  /** Scroll threshold for hidden state (default: 500px) */
  hideThreshold?: number
  /** Content element ref to calculate read progress */
  contentRef?: React.RefObject<HTMLElement>
  /** Throttle delay in ms (default: 16ms for 60fps) */
  throttleMs?: number
}

/**
 * Custom hook to track scroll progress and header state transitions
 *
 * @example
 * ```tsx
 * const contentRef = useRef<HTMLDivElement>(null)
 * const { scrollY, readProgress, headerState } = useScrollProgress({ contentRef })
 * ```
 */
export const useScrollProgress = ({
  compactThreshold = 100,
  hideThreshold = 500,
  contentRef,
  throttleMs = 16
}: UseScrollProgressOptions = {}): ScrollProgressResult => {
  const [scrollY, setScrollY] = useState(0)
  const [readProgress, setReadProgress] = useState(0)
  const [headerState, setHeaderState] = useState<HeaderState>('full')
  const [isScrollingUp, setIsScrollingUp] = useState(false)

  const lastScrollY = useRef(0)
  const ticking = useRef(false)

  const calculateReadProgress = useCallback(() => {
    if (!contentRef?.current) return 0

    const element = contentRef.current
    const windowHeight = window.innerHeight
    const documentHeight = element.scrollHeight
    const scrollTop = window.scrollY
    const trackLength = documentHeight - windowHeight

    if (trackLength <= 0) return 100

    const progress = (scrollTop / trackLength) * 100
    return Math.min(100, Math.max(0, progress))
  }, [contentRef])

  const updateScrollState = useCallback(() => {
    const currentScrollY = window.scrollY
    const scrollingUp = currentScrollY < lastScrollY.current

    setScrollY(currentScrollY)
    setIsScrollingUp(scrollingUp)

    // Calculate read progress
    const progress = calculateReadProgress()
    setReadProgress(progress)

    // Determine header state
    let newState: HeaderState = 'full'
    if (currentScrollY > hideThreshold && !scrollingUp) {
      newState = 'hidden'
    } else if (currentScrollY > compactThreshold) {
      newState = 'compact'
    }
    setHeaderState(newState)

    // Update lastScrollY AFTER using it for comparison
    lastScrollY.current = currentScrollY
    ticking.current = false
  }, [compactThreshold, hideThreshold, calculateReadProgress])

  const handleScroll = useCallback(() => {
    if (!ticking.current) {
      window.requestAnimationFrame(updateScrollState)
      ticking.current = true
    }
  }, [updateScrollState])

  useEffect(() => {
    // Throttle scroll events using requestAnimationFrame
    window.addEventListener('scroll', handleScroll, { passive: true })

    // Initial calculation
    updateScrollState()

    return () => {
      window.removeEventListener('scroll', handleScroll)
    }
  }, [handleScroll, updateScrollState])

  return {
    scrollY,
    readProgress,
    headerState,
    isScrollingUp
  }
}
