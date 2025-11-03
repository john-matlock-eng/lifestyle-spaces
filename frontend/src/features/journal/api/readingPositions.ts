/**
 * API client for journal reading position endpoints
 */

import { apiService } from '../../../services/api'
import type {
  ReadingPosition,
  SavePositionRequest,
  ReadingPositionResponse
} from '../types/reading-position.types'

/**
 * Save or update a reading position for a journal
 * @param data - Reading position data to save
 * @returns Promise resolving to the saved reading position
 *
 * @example
 * const position = await saveReadingPosition({
 *   journalId: 'journal-123',
 *   spaceId: 'space-456',
 *   scrollPosition: 1200,
 *   currentSectionId: 'section-2',
 *   progressPercent: 45.5,
 *   wordsRead: 500,
 *   totalWords: 1100
 * })
 */
export async function saveReadingPosition(
  data: SavePositionRequest
): Promise<ReadingPosition> {
  const response = await apiService.put<ReadingPositionResponse>(
    '/api/reading-positions',
    data
  )

  if (!response.position) {
    throw new Error('Invalid response from server: missing position data')
  }

  return response.position
}

/**
 * Get the saved reading position for a specific journal
 * @param journalId - ID of the journal to get position for
 * @returns Promise resolving to the reading position, or null if none exists
 *
 * @example
 * const position = await getReadingPosition('journal-123')
 * if (position && position.progressPercent < 90) {
 *   // Show "resume reading" option
 * }
 */
export async function getReadingPosition(
  journalId: string
): Promise<ReadingPosition | null> {
  try {
    const response = await apiService.get<ReadingPositionResponse>(
      `/api/reading-positions/${journalId}`
    )

    return response.position || null
  } catch (error) {
    // If 404, no position exists - return null
    if (error && typeof error === 'object' && 'status' in error && error.status === 404) {
      return null
    }
    throw error
  }
}

/**
 * Delete a saved reading position for a journal
 * @param journalId - ID of the journal to clear position for
 * @returns Promise resolving when deletion is complete
 *
 * @example
 * await deleteReadingPosition('journal-123')
 */
export async function deleteReadingPosition(journalId: string): Promise<void> {
  await apiService.delete<ReadingPositionResponse>(
    `/api/reading-positions/${journalId}`
  )
}

/**
 * Get all reading positions for the current user
 * @param limit - Maximum number of positions to return (optional)
 * @returns Promise resolving to array of reading positions
 *
 * @example
 * const recentPositions = await getUserReadingPositions(10)
 */
export async function getUserReadingPositions(
  limit?: number
): Promise<ReadingPosition[]> {
  const endpoint = limit
    ? `/api/reading-positions?limit=${limit}`
    : '/api/reading-positions'

  const response = await apiService.get<ReadingPositionResponse>(endpoint)

  return response.positions || []
}
