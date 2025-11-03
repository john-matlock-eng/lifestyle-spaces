import { useState, useEffect, useCallback, useRef } from 'react'
import type {
  Section,
  SectionProgress,
  ReadingProgress,
  ReadingProgressOptions,
  UseReadingProgressReturn
} from '../types/navigation.types'

/**
 * Hook to track reading progress through journal content
 * Uses IntersectionObserver for efficient viewport detection
 * Calculates reading progress based on scroll position and word counts
 *
 * @param content - The journal content (can be HTML or markdown)
 * @param sections - Array of sections parsed from the content
 * @param options - Configuration options for tracking
 * @returns Reading progress data and control functions
 *
 * @example
 * const { sections, readingProgress, scrollToSection } = useReadingProgress(
 *   journal.content,
 *   displaySections,
 *   { wordsPerMinute: 200 }
 * )
 */
export function useReadingProgress(
  content: string,
  sections: Array<{ id: string; title: string; type: string; content: string }>,
  options: ReadingProgressOptions = {}
): UseReadingProgressReturn {
  const {
    wordsPerMinute = 250,
    debounceMs = 100,
    intersectionThreshold = 0.5,
    containerRef
  } = options

  // State
  const [enrichedSections, setEnrichedSections] = useState<Section[]>([])
  const [sectionProgress, setSectionProgress] = useState<Map<string, SectionProgress>>(new Map())
  const [readingProgress, setReadingProgress] = useState<ReadingProgress>({
    currentSectionId: null,
    overallPercent: 0,
    sectionsComplete: 0,
    sectionsTotal: sections.length,
    estimatedMinutesRemaining: 0,
    totalWordCount: 0,
    wordsRead: 0
  })
  const [isInitialized, setIsInitialized] = useState(false)

  // Refs
  const observerRef = useRef<IntersectionObserver | null>(null)
  const scrollTimeoutRef = useRef<NodeJS.Timeout>()
  const sectionElementsRef = useRef<Map<string, HTMLElement>>(new Map())

  /**
   * Calculate word count for a text string
   */
  const countWords = useCallback((text: string): number => {
    // Remove HTML tags and markdown syntax for more accurate count
    const cleanText = text
      .replace(/<[^>]*>/g, ' ')
      .replace(/[#*_~`[\]()]/g, ' ')
      .trim()

    if (!cleanText) return 0

    return cleanText.split(/\s+/).filter(word => word.length > 0).length
  }, [])

  /**
   * Find section elements in the DOM and enrich section data
   */
  const enrichSectionsWithDOM = useCallback(() => {
    const enriched: Section[] = sections.map((section, index) => {
      // Try to find the section element in the DOM
      // Look for elements with data-section-id attribute
      const element = document.querySelector(`[data-section-id="${section.id}"]`) as HTMLElement

      if (element) {
        sectionElementsRef.current.set(section.id, element)
      }

      const wordCount = countWords(section.content)

      // Calculate offsets based on previous sections
      let startOffset = 0
      for (let i = 0; i < index; i++) {
        startOffset += sections[i].content.length
      }
      const endOffset = startOffset + section.content.length

      return {
        id: section.id,
        title: section.title,
        type: section.type,
        wordCount,
        startOffset,
        endOffset,
        element
      }
    })

    setEnrichedSections(enriched)

    // Calculate total word count
    const totalWordCount = enriched.reduce((sum, s) => sum + s.wordCount, 0)

    setReadingProgress(prev => ({
      ...prev,
      sectionsTotal: enriched.length,
      totalWordCount,
      estimatedMinutesRemaining: Math.ceil(totalWordCount / wordsPerMinute)
    }))

    return enriched
  }, [sections, countWords, wordsPerMinute])

  /**
   * Calculate reading progress based on section visibility and scroll position
   */
  const calculateProgress = useCallback(() => {
    if (enrichedSections.length === 0) return

    const containerHeight = containerRef?.current?.clientHeight || window.innerHeight

    let currentSectionId: string | null = null
    let sectionsComplete = 0
    let totalWordsRead = 0
    const newProgress = new Map<string, SectionProgress>()

    enrichedSections.forEach((section) => {
      const element = sectionElementsRef.current.get(section.id)

      if (!element) {
        // If no element found, mark as not visible
        newProgress.set(section.id, {
          sectionId: section.id,
          percentRead: 0,
          isVisible: false,
          isComplete: false
        })
        return
      }

      const rect = element.getBoundingClientRect()
      const containerRect = container.getBoundingClientRect()

      // Calculate if section is visible
      const isVisible = rect.top < containerRect.bottom && rect.bottom > containerRect.top

      // Calculate how much of the section has been scrolled through
      let percentRead = 0
      let isComplete = false

      if (rect.bottom <= containerRect.top + containerHeight * 0.2) {
        // Section is above viewport - fully read
        percentRead = 100
        isComplete = true
        sectionsComplete++
        totalWordsRead += section.wordCount
      } else if (rect.top <= containerRect.top + containerHeight * 0.5) {
        // Section is in reading position
        currentSectionId = section.id

        // Calculate percentage based on how much is above the reading line (50% of viewport)
        const readingLine = containerRect.top + containerHeight * 0.5
        const sectionHeight = rect.height
        const visibleFromTop = readingLine - rect.top

        percentRead = Math.max(0, Math.min(100, (visibleFromTop / sectionHeight) * 100))

        // Calculate words read in this section
        const wordsInSection = section.wordCount
        totalWordsRead += Math.floor((percentRead / 100) * wordsInSection)
      }

      newProgress.set(section.id, {
        sectionId: section.id,
        percentRead,
        isVisible,
        isComplete
      })
    })

    setSectionProgress(newProgress)

    // Calculate overall progress
    const totalWordCount = enrichedSections.reduce((sum, s) => sum + s.wordCount, 0)
    const overallPercent = totalWordCount > 0 ? (totalWordsRead / totalWordCount) * 100 : 0
    const wordsRemaining = Math.max(0, totalWordCount - totalWordsRead)
    const estimatedMinutesRemaining = Math.ceil(wordsRemaining / wordsPerMinute)

    setReadingProgress({
      currentSectionId,
      overallPercent,
      sectionsComplete,
      sectionsTotal: enrichedSections.length,
      estimatedMinutesRemaining,
      totalWordCount,
      wordsRead: totalWordsRead
    })
  }, [enrichedSections, containerRef, wordsPerMinute])

  /**
   * Debounced scroll handler
   */
  const handleScroll = useCallback(() => {
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current)
    }

    scrollTimeoutRef.current = setTimeout(() => {
      calculateProgress()
    }, debounceMs)
  }, [calculateProgress, debounceMs])

  /**
   * Scroll to a specific section smoothly
   */
  const scrollToSection = useCallback((sectionId: string) => {
    const element = sectionElementsRef.current.get(sectionId)

    if (!element) {
      console.warn(`Section element not found: ${sectionId}`)
      return
    }

    const yOffset = -80 // Offset for fixed headers

    if (containerRef?.current) {
      // Scrolling within a container
      const containerTop = containerRef.current.getBoundingClientRect().top
      const elementTop = element.getBoundingClientRect().top
      const offsetPosition = elementTop - containerTop + containerRef.current.scrollTop + yOffset

      containerRef.current.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      })
    } else {
      // Scrolling the window
      const elementTop = element.getBoundingClientRect().top
      const offsetPosition = elementTop + window.pageYOffset + yOffset

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      })
    }
  }, [containerRef])

  /**
   * Initialize IntersectionObserver for efficient visibility tracking
   */
  useEffect(() => {
    if (enrichedSections.length === 0) return

    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const sectionId = entry.target.getAttribute('data-section-id')
          if (sectionId && entry.isIntersecting) {
            // Trigger progress calculation when section becomes visible
            calculateProgress()
          }
        })
      },
      {
        threshold: intersectionThreshold,
        root: containerRef?.current || null
      }
    )

    // Observe all section elements
    enrichedSections.forEach((section) => {
      const element = sectionElementsRef.current.get(section.id)
      if (element && observerRef.current) {
        observerRef.current.observe(element)
      }
    })

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect()
      }
    }
  }, [enrichedSections, calculateProgress, intersectionThreshold, containerRef])

  /**
   * Set up scroll listener
   */
  useEffect(() => {
    const container = containerRef?.current || window

    container.addEventListener('scroll', handleScroll, { passive: true })

    // Initial calculation
    handleScroll()

    return () => {
      container.removeEventListener('scroll', handleScroll)
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current)
      }
    }
  }, [handleScroll, containerRef])

  /**
   * Initialize sections when content changes
   */
  useEffect(() => {
    if (sections.length > 0) {
      // Wait for DOM to be ready
      const timer = setTimeout(() => {
        enrichSectionsWithDOM()
        setIsInitialized(true)
      }, 100)

      return () => clearTimeout(timer)
    }
  }, [sections, enrichSectionsWithDOM])

  return {
    sections: enrichedSections,
    sectionProgress,
    readingProgress,
    scrollToSection,
    isInitialized
  }
}
