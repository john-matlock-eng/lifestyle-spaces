import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  saveReadingPosition,
  getReadingPosition,
  deleteReadingPosition,
  getUserReadingPositions
} from './readingPositions'
import type {
  ReadingPosition,
  SavePositionRequest,
  ReadingPositionResponse
} from '../types/reading-position.types'

// Mock the API service
vi.mock('../../../services/api', () => ({
  apiService: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn()
  }
}))

import { apiService } from '../../../services/api'

describe('readingPositions API Client', () => {
  const mockPosition: ReadingPosition = {
    journalId: 'journal-123',
    spaceId: 'space-456',
    userId: 'user-789',
    scrollPosition: 1200,
    currentSectionId: 'section-2',
    progressPercent: 45.5,
    wordsRead: 500,
    totalWords: 1100,
    lastReadAt: '2024-01-15T10:30:00Z',
    createdAt: '2024-01-15T09:00:00Z',
    updatedAt: '2024-01-15T10:30:00Z'
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('saveReadingPosition', () => {
    it('should make PUT request to /api/reading-positions', async () => {
      const request: SavePositionRequest = {
        journalId: 'journal-123',
        spaceId: 'space-456',
        scrollPosition: 1200,
        currentSectionId: 'section-2',
        progressPercent: 45.5,
        wordsRead: 500,
        totalWords: 1100
      }

      const response: ReadingPositionResponse = {
        position: mockPosition
      }

      vi.mocked(apiService.put).mockResolvedValue(response)

      const result = await saveReadingPosition(request)

      expect(apiService.put).toHaveBeenCalledWith('/api/reading-positions', request)
      expect(result).toEqual(mockPosition)
    })

    it('should return the saved position', async () => {
      const request: SavePositionRequest = {
        journalId: 'journal-123',
        spaceId: 'space-456',
        scrollPosition: 500,
        progressPercent: 25,
        wordsRead: 250,
        totalWords: 1000
      }

      const response: ReadingPositionResponse = {
        position: mockPosition
      }

      vi.mocked(apiService.put).mockResolvedValue(response)

      const result = await saveReadingPosition(request)

      expect(result).toEqual(mockPosition)
    })

    it('should throw error when response is missing position', async () => {
      const request: SavePositionRequest = {
        journalId: 'journal-123',
        spaceId: 'space-456',
        scrollPosition: 1200,
        progressPercent: 45.5,
        wordsRead: 500,
        totalWords: 1100
      }

      const response = {
        position: null
      } as unknown as ReadingPositionResponse

      vi.mocked(apiService.put).mockResolvedValue(response)

      await expect(saveReadingPosition(request)).rejects.toThrow(
        'Invalid response from server: missing position data'
      )
    })

    it('should handle API errors', async () => {
      const request: SavePositionRequest = {
        journalId: 'journal-123',
        spaceId: 'space-456',
        scrollPosition: 1200,
        progressPercent: 45.5,
        wordsRead: 500,
        totalWords: 1100
      }

      const error = new Error('Network error')
      vi.mocked(apiService.put).mockRejectedValue(error)

      await expect(saveReadingPosition(request)).rejects.toThrow('Network error')
    })

    it('should send all fields in request payload', async () => {
      const request: SavePositionRequest = {
        journalId: 'journal-123',
        spaceId: 'space-456',
        scrollPosition: 1500,
        currentSectionId: 'section-5',
        progressPercent: 80,
        wordsRead: 800,
        totalWords: 1000
      }

      const response: ReadingPositionResponse = {
        position: mockPosition
      }

      vi.mocked(apiService.put).mockResolvedValue(response)

      await saveReadingPosition(request)

      expect(apiService.put).toHaveBeenCalledWith('/api/reading-positions', {
        journalId: 'journal-123',
        spaceId: 'space-456',
        scrollPosition: 1500,
        currentSectionId: 'section-5',
        progressPercent: 80,
        wordsRead: 800,
        totalWords: 1000
      })
    })

    it('should handle request without currentSectionId', async () => {
      const request: SavePositionRequest = {
        journalId: 'journal-123',
        spaceId: 'space-456',
        scrollPosition: 100,
        progressPercent: 10,
        wordsRead: 100,
        totalWords: 1000
      }

      const response: ReadingPositionResponse = {
        position: { ...mockPosition, currentSectionId: null }
      }

      vi.mocked(apiService.put).mockResolvedValue(response)

      const result = await saveReadingPosition(request)

      expect(result.currentSectionId).toBeNull()
    })
  })

  describe('getReadingPosition', () => {
    it('should make GET request to /api/reading-positions/:journalId', async () => {
      const response: ReadingPositionResponse = {
        position: mockPosition
      }

      vi.mocked(apiService.get).mockResolvedValue(response)

      const result = await getReadingPosition('journal-123')

      expect(apiService.get).toHaveBeenCalledWith('/api/reading-positions/journal-123')
      expect(result).toEqual(mockPosition)
    })

    it('should return the position when found', async () => {
      const response: ReadingPositionResponse = {
        position: mockPosition
      }

      vi.mocked(apiService.get).mockResolvedValue(response)

      const result = await getReadingPosition('journal-123')

      expect(result).toEqual(mockPosition)
    })

    it('should return null when position is not in response', async () => {
      const response: ReadingPositionResponse = {
        position: null
      }

      vi.mocked(apiService.get).mockResolvedValue(response)

      const result = await getReadingPosition('journal-123')

      expect(result).toBeNull()
    })

    it('should return null when position is undefined', async () => {
      const response = {
        position: undefined
      } as unknown as ReadingPositionResponse

      vi.mocked(apiService.get).mockResolvedValue(response)

      const result = await getReadingPosition('journal-123')

      expect(result).toBeNull()
    })

    it('should return null on 404 error', async () => {
      const error = new Error('Not found')
      Object.assign(error, { status: 404 })

      vi.mocked(apiService.get).mockRejectedValue(error)

      const result = await getReadingPosition('journal-123')

      expect(result).toBeNull()
    })

    it('should throw on non-404 errors', async () => {
      const error = new Error('Server error')
      Object.assign(error, { status: 500 })

      vi.mocked(apiService.get).mockRejectedValue(error)

      await expect(getReadingPosition('journal-123')).rejects.toThrow('Server error')
    })

    it('should throw on network errors', async () => {
      const error = new Error('Network error')

      vi.mocked(apiService.get).mockRejectedValue(error)

      await expect(getReadingPosition('journal-123')).rejects.toThrow('Network error')
    })

    it('should handle different journal IDs', async () => {
      const response: ReadingPositionResponse = {
        position: mockPosition
      }

      vi.mocked(apiService.get).mockResolvedValue(response)

      await getReadingPosition('journal-abc')

      expect(apiService.get).toHaveBeenCalledWith('/api/reading-positions/journal-abc')

      await getReadingPosition('journal-xyz')

      expect(apiService.get).toHaveBeenCalledWith('/api/reading-positions/journal-xyz')
    })
  })

  describe('deleteReadingPosition', () => {
    it('should make DELETE request to /api/reading-positions/:journalId', async () => {
      vi.mocked(apiService.delete).mockResolvedValue({})

      await deleteReadingPosition('journal-123')

      expect(apiService.delete).toHaveBeenCalledWith('/api/reading-positions/journal-123')
    })

    it('should return void on success', async () => {
      vi.mocked(apiService.delete).mockResolvedValue({})

      const result = await deleteReadingPosition('journal-123')

      expect(result).toBeUndefined()
    })

    it('should handle API errors', async () => {
      const error = new Error('Delete failed')
      vi.mocked(apiService.delete).mockRejectedValue(error)

      await expect(deleteReadingPosition('journal-123')).rejects.toThrow('Delete failed')
    })

    it('should handle 404 errors (position already deleted)', async () => {
      const error = new Error('Not found')
      Object.assign(error, { status: 404 })

      vi.mocked(apiService.delete).mockRejectedValue(error)

      await expect(deleteReadingPosition('journal-123')).rejects.toThrow('Not found')
    })

    it('should handle different journal IDs', async () => {
      vi.mocked(apiService.delete).mockResolvedValue({})

      await deleteReadingPosition('journal-abc')
      expect(apiService.delete).toHaveBeenCalledWith('/api/reading-positions/journal-abc')

      await deleteReadingPosition('journal-xyz')
      expect(apiService.delete).toHaveBeenCalledWith('/api/reading-positions/journal-xyz')
    })
  })

  describe('getUserReadingPositions', () => {
    const mockPositions: ReadingPosition[] = [
      mockPosition,
      {
        ...mockPosition,
        journalId: 'journal-456',
        progressPercent: 60,
        wordsRead: 600
      },
      {
        ...mockPosition,
        journalId: 'journal-789',
        progressPercent: 30,
        wordsRead: 300
      }
    ]

    it('should make GET request to /api/reading-positions', async () => {
      const response: ReadingPositionResponse = {
        positions: mockPositions
      }

      vi.mocked(apiService.get).mockResolvedValue(response)

      const result = await getUserReadingPositions()

      expect(apiService.get).toHaveBeenCalledWith('/api/reading-positions')
      expect(result).toEqual(mockPositions)
    })

    it('should return array of positions', async () => {
      const response: ReadingPositionResponse = {
        positions: mockPositions
      }

      vi.mocked(apiService.get).mockResolvedValue(response)

      const result = await getUserReadingPositions()

      expect(result).toEqual(mockPositions)
      expect(result).toHaveLength(3)
    })

    it('should include limit parameter when provided', async () => {
      const response: ReadingPositionResponse = {
        positions: mockPositions.slice(0, 2)
      }

      vi.mocked(apiService.get).mockResolvedValue(response)

      await getUserReadingPositions(2)

      expect(apiService.get).toHaveBeenCalledWith('/api/reading-positions?limit=2')
    })

    it('should handle limit of 1', async () => {
      const response: ReadingPositionResponse = {
        positions: [mockPosition]
      }

      vi.mocked(apiService.get).mockResolvedValue(response)

      const result = await getUserReadingPositions(1)

      expect(apiService.get).toHaveBeenCalledWith('/api/reading-positions?limit=1')
      expect(result).toHaveLength(1)
    })

    it('should handle limit of 100', async () => {
      const response: ReadingPositionResponse = {
        positions: mockPositions
      }

      vi.mocked(apiService.get).mockResolvedValue(response)

      await getUserReadingPositions(100)

      expect(apiService.get).toHaveBeenCalledWith('/api/reading-positions?limit=100')
    })

    it('should return empty array when no positions exist', async () => {
      const response: ReadingPositionResponse = {
        positions: []
      }

      vi.mocked(apiService.get).mockResolvedValue(response)

      const result = await getUserReadingPositions()

      expect(result).toEqual([])
    })

    it('should return empty array when positions is undefined', async () => {
      const response = {
        positions: undefined
      } as unknown as ReadingPositionResponse

      vi.mocked(apiService.get).mockResolvedValue(response)

      const result = await getUserReadingPositions()

      expect(result).toEqual([])
    })

    it('should return empty array when positions is null', async () => {
      const response = {
        positions: null
      } as unknown as ReadingPositionResponse

      vi.mocked(apiService.get).mockResolvedValue(response)

      const result = await getUserReadingPositions()

      expect(result).toEqual([])
    })

    it('should handle API errors', async () => {
      const error = new Error('Failed to fetch positions')
      vi.mocked(apiService.get).mockRejectedValue(error)

      await expect(getUserReadingPositions()).rejects.toThrow('Failed to fetch positions')
    })

    it('should handle network errors', async () => {
      const error = new Error('Network error')
      vi.mocked(apiService.get).mockRejectedValue(error)

      await expect(getUserReadingPositions()).rejects.toThrow('Network error')
    })

    it('should handle server errors', async () => {
      const error = new Error('Internal server error')
      Object.assign(error, { status: 500 })

      vi.mocked(apiService.get).mockRejectedValue(error)

      await expect(getUserReadingPositions()).rejects.toThrow('Internal server error')
    })
  })

  describe('Integration', () => {
    it('should handle full lifecycle: save -> get -> delete', async () => {
      const request: SavePositionRequest = {
        journalId: 'journal-123',
        spaceId: 'space-456',
        scrollPosition: 1200,
        progressPercent: 45.5,
        wordsRead: 500,
        totalWords: 1100
      }

      // Save
      vi.mocked(apiService.put).mockResolvedValue({ position: mockPosition })
      const saved = await saveReadingPosition(request)
      expect(saved).toEqual(mockPosition)

      // Get
      vi.mocked(apiService.get).mockResolvedValue({ position: mockPosition })
      const retrieved = await getReadingPosition('journal-123')
      expect(retrieved).toEqual(mockPosition)

      // Delete
      vi.mocked(apiService.delete).mockResolvedValue({})
      await deleteReadingPosition('journal-123')

      // Get after delete (404)
      const error = new Error('Not found')
      Object.assign(error, { status: 404 })
      vi.mocked(apiService.get).mockRejectedValue(error)
      const afterDelete = await getReadingPosition('journal-123')
      expect(afterDelete).toBeNull()
    })

    it('should handle multiple positions for different journals', async () => {
      const positions = [
        { ...mockPosition, journalId: 'journal-1' },
        { ...mockPosition, journalId: 'journal-2' },
        { ...mockPosition, journalId: 'journal-3' }
      ]

      vi.mocked(apiService.get).mockResolvedValue({ positions })

      const result = await getUserReadingPositions()

      expect(result).toHaveLength(3)
      expect(result[0].journalId).toBe('journal-1')
      expect(result[1].journalId).toBe('journal-2')
      expect(result[2].journalId).toBe('journal-3')
    })
  })

  describe('Error Handling Edge Cases', () => {
    it('should handle undefined error object', async () => {
      vi.mocked(apiService.get).mockRejectedValue(undefined)

      await expect(getReadingPosition('journal-123')).rejects.toBeUndefined()
    })

    it('should handle error without status property', async () => {
      const error = new Error('Generic error')
      vi.mocked(apiService.get).mockRejectedValue(error)

      await expect(getReadingPosition('journal-123')).rejects.toThrow('Generic error')
    })

    it('should handle error with non-404 status as regular error', async () => {
      const error = new Error('Forbidden')
      Object.assign(error, { status: 403 })

      vi.mocked(apiService.get).mockRejectedValue(error)

      await expect(getReadingPosition('journal-123')).rejects.toThrow('Forbidden')
    })

    it('should handle string error', async () => {
      vi.mocked(apiService.get).mockRejectedValue('String error')

      await expect(getReadingPosition('journal-123')).rejects.toBe('String error')
    })
  })

  describe('Data Validation', () => {
    it('should handle position with all fields', async () => {
      const completePosition: ReadingPosition = {
        journalId: 'journal-123',
        spaceId: 'space-456',
        userId: 'user-789',
        scrollPosition: 1200,
        currentSectionId: 'section-2',
        progressPercent: 45.5,
        wordsRead: 500,
        totalWords: 1100,
        lastReadAt: '2024-01-15T10:30:00Z',
        createdAt: '2024-01-15T09:00:00Z',
        updatedAt: '2024-01-15T10:30:00Z'
      }

      const response: ReadingPositionResponse = {
        position: completePosition
      }

      vi.mocked(apiService.get).mockResolvedValue(response)

      const result = await getReadingPosition('journal-123')

      expect(result).toEqual(completePosition)
      expect(result?.journalId).toBe('journal-123')
      expect(result?.spaceId).toBe('space-456')
      expect(result?.userId).toBe('user-789')
      expect(result?.scrollPosition).toBe(1200)
      expect(result?.currentSectionId).toBe('section-2')
      expect(result?.progressPercent).toBe(45.5)
      expect(result?.wordsRead).toBe(500)
      expect(result?.totalWords).toBe(1100)
    })

    it('should handle position with minimum required fields', async () => {
      const minimalRequest: SavePositionRequest = {
        journalId: 'journal-123',
        spaceId: 'space-456',
        scrollPosition: 0,
        progressPercent: 0,
        wordsRead: 0,
        totalWords: 0
      }

      const response: ReadingPositionResponse = {
        position: {
          ...mockPosition,
          scrollPosition: 0,
          progressPercent: 0,
          wordsRead: 0,
          currentSectionId: null
        }
      }

      vi.mocked(apiService.put).mockResolvedValue(response)

      const result = await saveReadingPosition(minimalRequest)

      expect(result.scrollPosition).toBe(0)
      expect(result.progressPercent).toBe(0)
      expect(result.wordsRead).toBe(0)
    })
  })
})
