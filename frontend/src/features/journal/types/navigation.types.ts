/**
 * Navigation types for journal reading progress and section tracking
 */

/**
 * Represents a section in the journal content
 */
export interface Section {
  /** Unique identifier for the section */
  id: string
  /** Display title of the section */
  title: string
  /** Section type (prose, list, q_and_a, etc.) */
  type: string
  /** Estimated word count for the section */
  wordCount: number
  /** Character offset where section starts in content */
  startOffset: number
  /** Character offset where section ends in content */
  endOffset: number
  /** DOM element reference for the section (if available) */
  element?: HTMLElement
}

/**
 * Progress information for an individual section
 */
export interface SectionProgress {
  /** Section ID this progress applies to */
  sectionId: string
  /** Percentage of section that has been read (0-100) */
  percentRead: number
  /** Whether the section is currently visible in viewport */
  isVisible: boolean
  /** Whether the section has been completely read */
  isComplete: boolean
}

/**
 * Overall reading progress across all sections
 */
export interface ReadingProgress {
  /** ID of the section currently being read */
  currentSectionId: string | null
  /** Overall percentage of document read (0-100) */
  overallPercent: number
  /** Number of sections that have been completed */
  sectionsComplete: number
  /** Total number of sections in the document */
  sectionsTotal: number
  /** Estimated minutes remaining based on reading speed */
  estimatedMinutesRemaining: number
  /** Total word count across all sections */
  totalWordCount: number
  /** Approximate number of words read so far */
  wordsRead: number
}

/**
 * Configuration options for reading progress tracking
 */
export interface ReadingProgressOptions {
  /** Average reading speed in words per minute (default: 250) */
  wordsPerMinute?: number
  /** Debounce delay for scroll calculations in ms (default: 100) */
  debounceMs?: number
  /** Threshold for IntersectionObserver (0-1, default: 0.5) */
  intersectionThreshold?: number
  /** Container element to track scrolling within */
  containerRef?: React.RefObject<HTMLElement>
}

/**
 * Return type for useReadingProgress hook
 */
export interface UseReadingProgressReturn {
  /** Array of all sections found in content */
  sections: Section[]
  /** Progress information for each section */
  sectionProgress: Map<string, SectionProgress>
  /** Overall reading progress */
  readingProgress: ReadingProgress
  /** Function to manually jump to a specific section */
  scrollToSection: (sectionId: string) => void
  /** Whether the progress tracker is initialized */
  isInitialized: boolean
}
