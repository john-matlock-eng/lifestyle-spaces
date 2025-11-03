import { useEffect, useCallback, useRef } from 'react'

export interface ReadingProgressTrackerOptions {
  /** Callback when scroll percentage changes */
  onScrollProgress?: (percentage: number) => void

  /** Callback when a section becomes visible */
  onSectionVisible?: (sectionId: string) => void

  /** Throttle delay for scroll events (ms) */
  throttleDelay?: number

  /** Intersection observer threshold (0-1) */
  visibilityThreshold?: number
}

/**
 * Hook for tracking reading progress via scroll and section visibility
 * Uses Intersection Observer API for performance
 */
export function useReadingProgress(options: ReadingProgressTrackerOptions = {}) {
  const {
    onScrollProgress,
    onSectionVisible,
    throttleDelay = 100,
    visibilityThreshold = 0.3
  } = options

  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const observerRef = useRef<IntersectionObserver | null>(null)
  const observedSectionsRef = useRef<Set<Element>>(new Set())

  // Calculate scroll progress percentage
  const calculateScrollProgress = useCallback(() => {
    const windowHeight = window.innerHeight
    const documentHeight = document.documentElement.scrollHeight
    const scrollTop = window.scrollY

    // Calculate percentage (0-100)
    const maxScroll = documentHeight - windowHeight
    const percentage = maxScroll > 0 ? Math.min(100, (scrollTop / maxScroll) * 100) : 100

    return Math.round(percentage)
  }, [])

  // Handle scroll events with throttling
  useEffect(() => {
    if (!onScrollProgress) return

    const handleScroll = () => {
      // Clear existing timeout
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current)
      }

      // Throttle scroll updates
      scrollTimeoutRef.current = setTimeout(() => {
        const percentage = calculateScrollProgress()
        onScrollProgress(percentage)
      }, throttleDelay)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })

    // Initial calculation
    handleScroll()

    return () => {
      window.removeEventListener('scroll', handleScroll)
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current)
      }
    }
  }, [onScrollProgress, calculateScrollProgress, throttleDelay])

  // Set up Intersection Observer for section visibility
  useEffect(() => {
    if (!onSectionVisible) return

    // Create observer
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          // Check if element is intersecting and meets threshold
          if (entry.isIntersecting && entry.intersectionRatio >= visibilityThreshold) {
            const sectionId = entry.target.getAttribute('data-section-id')
            if (sectionId) {
              onSectionVisible(sectionId)
            }
          }
        })
      },
      {
        threshold: [0, visibilityThreshold, 0.5, 1.0],
        rootMargin: '0px 0px -10% 0px' // Trigger when section is 10% from bottom
      }
    )

    // Observe all section elements
    const sectionElements = document.querySelectorAll('[data-section-id]')
    sectionElements.forEach((element) => {
      observerRef.current?.observe(element)
      observedSectionsRef.current.add(element)
    })

    // Cleanup - copy ref to local variable to avoid stale closure
    const currentObserver = observerRef.current
    const currentObservedSections = observedSectionsRef.current
    return () => {
      if (currentObserver) {
        currentObservedSections.forEach((element) => {
          currentObserver.unobserve(element)
        })
        currentObserver.disconnect()
        currentObservedSections.clear()
      }
    }
  }, [onSectionVisible, visibilityThreshold])

  // Mutation observer to watch for dynamically added sections
  useEffect(() => {
    if (!onSectionVisible || !observerRef.current) return

    const mutationObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node instanceof Element) {
            // Check if the node itself is a section
            if (node.hasAttribute('data-section-id') && !observedSectionsRef.current.has(node)) {
              observerRef.current?.observe(node)
              observedSectionsRef.current.add(node)
            }

            // Check for sections within the added node
            const childSections = node.querySelectorAll('[data-section-id]')
            childSections.forEach((section) => {
              if (!observedSectionsRef.current.has(section)) {
                observerRef.current?.observe(section)
                observedSectionsRef.current.add(section)
              }
            })
          }
        })
      })
    })

    mutationObserver.observe(document.body, {
      childList: true,
      subtree: true
    })

    return () => {
      mutationObserver.disconnect()
    }
  }, [onSectionVisible])

  return {
    calculateScrollProgress
  }
}
