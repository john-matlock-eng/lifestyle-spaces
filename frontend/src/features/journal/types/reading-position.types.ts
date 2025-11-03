/**
 * Types for journal reading position persistence
 */

/**
 * Reading position data stored on the backend
 */
export interface ReadingPosition {
  /** User ID who saved this position */
  userId: string
  /** Journal ID this position belongs to */
  journalId: string
  /** Space ID containing the journal */
  spaceId: string
  /** Scroll position in pixels */
  scrollPosition: number
  /** Current section ID being read (optional) */
  currentSectionId?: string
  /** Reading progress percentage (0-100) */
  progressPercent: number
  /** Number of words read */
  wordsRead: number
  /** Total words in the journal */
  totalWords: number
  /** Timestamp when position was created */
  createdAt: string
  /** Timestamp when position was last updated */
  updatedAt: string
}

/**
 * Request payload for saving/updating a reading position
 */
export interface SavePositionRequest {
  /** Journal ID */
  journalId: string
  /** Space ID */
  spaceId: string
  /** Current scroll position in pixels */
  scrollPosition: number
  /** Current section ID being read (optional) */
  currentSectionId?: string
  /** Reading progress percentage (0-100) */
  progressPercent: number
  /** Number of words read so far */
  wordsRead: number
  /** Total words in the journal */
  totalWords: number
}

/**
 * Response from backend API endpoints
 */
export interface ReadingPositionResponse {
  /** Success message */
  message?: string
  /** Reading position data */
  position?: ReadingPosition
  /** Array of reading positions */
  positions?: ReadingPosition[]
}
