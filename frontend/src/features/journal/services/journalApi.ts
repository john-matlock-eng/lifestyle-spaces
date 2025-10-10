import { apiService } from '../../../services/api'
import type {
  JournalEntry,
  JournalListResponse,
  CreateJournalRequest,
  UpdateJournalRequest,
  JournalListParams
} from '../types/journal.types'

/**
 * Validate journal title
 */
const validateTitle = (title: string): void => {
  if (!title || title.trim() === '') {
    throw new Error('Journal title is required')
  }
  if (title.length > 200) {
    throw new Error('Journal title must be 200 characters or less')
  }
}

/**
 * Validate journal content
 */
const validateContent = (content: string): void => {
  if (!content || content.trim() === '') {
    throw new Error('Journal content is required')
  }
  if (content.length > 50000) {
    throw new Error('Journal content must be 50,000 characters or less')
  }
}

/**
 * Journal API service
 */
export const journalApi = {
  /**
   * Create a new journal entry in a space
   */
  createJournal: async (spaceId: string, data: CreateJournalRequest): Promise<JournalEntry> => {
    if (!spaceId || spaceId.trim() === '') {
      throw new Error('Space ID is required')
    }

    validateTitle(data.title)
    validateContent(data.content)

    const response = await apiService.post(`/api/spaces/${spaceId}/journals`, {
      title: data.title.trim(),
      content: data.content,
      tags: data.tags || [],
      mood: data.mood,
      isPinned: data.isPinned || false
    })

    if (!response || typeof response !== 'object' || !('journalId' in response)) {
      throw new Error('Invalid journal data received from API')
    }

    return response as JournalEntry
  },

  /**
   * Get all journals in a space with optional filtering
   */
  getSpaceJournals: async (
    spaceId: string,
    params?: JournalListParams
  ): Promise<JournalListResponse> => {
    if (!spaceId || spaceId.trim() === '') {
      throw new Error('Space ID is required')
    }

    const queryParams = new URLSearchParams()
    if (params?.page) queryParams.append('page', params.page.toString())
    if (params?.pageSize) queryParams.append('pageSize', params.pageSize.toString())
    if (params?.tags) queryParams.append('tags', params.tags)
    if (params?.mood) queryParams.append('mood', params.mood)
    if (params?.authorId) queryParams.append('authorId', params.authorId)

    const queryString = queryParams.toString() ? `?${queryParams.toString()}` : ''
    const response = await apiService.get(`/api/spaces/${spaceId}/journals${queryString}`)

    if (!response || typeof response !== 'object' || !('journals' in response)) {
      throw new Error('Invalid journal list data received from API')
    }

    return response as JournalListResponse
  },

  /**
   * Get a single journal entry by ID
   */
  getJournal: async (spaceId: string, journalId: string): Promise<JournalEntry> => {
    if (!spaceId || spaceId.trim() === '') {
      throw new Error('Space ID is required')
    }
    if (!journalId || journalId.trim() === '') {
      throw new Error('Journal ID is required')
    }

    const response = await apiService.get(`/api/spaces/${spaceId}/journals/${journalId}`)

    if (!response || typeof response !== 'object' || !('journalId' in response)) {
      throw new Error('Invalid journal data received from API')
    }

    return response as JournalEntry
  },

  /**
   * Update an existing journal entry
   */
  updateJournal: async (
    spaceId: string,
    journalId: string,
    data: UpdateJournalRequest
  ): Promise<JournalEntry> => {
    if (!spaceId || spaceId.trim() === '') {
      throw new Error('Space ID is required')
    }
    if (!journalId || journalId.trim() === '') {
      throw new Error('Journal ID is required')
    }

    if (data.title !== undefined) {
      validateTitle(data.title)
    }

    if (data.content !== undefined) {
      validateContent(data.content)
    }

    const updateData: Record<string, unknown> = {}
    if (data.title !== undefined) updateData.title = data.title.trim()
    if (data.content !== undefined) updateData.content = data.content
    if (data.tags !== undefined) updateData.tags = data.tags
    if (data.mood !== undefined) updateData.mood = data.mood
    if (data.isPinned !== undefined) updateData.isPinned = data.isPinned

    const response = await apiService.put(`/api/spaces/${spaceId}/journals/${journalId}`, updateData)

    if (!response || typeof response !== 'object' || !('journalId' in response)) {
      throw new Error('Invalid journal data received from API')
    }

    return response as JournalEntry
  },

  /**
   * Delete a journal entry
   */
  deleteJournal: async (spaceId: string, journalId: string): Promise<void> => {
    if (!spaceId || spaceId.trim() === '') {
      throw new Error('Space ID is required')
    }
    if (!journalId || journalId.trim() === '') {
      throw new Error('Journal ID is required')
    }

    await apiService.delete(`/api/spaces/${spaceId}/journals/${journalId}`)
  },

  /**
   * Get all journals for the current user across all spaces
   */
  getMyJournals: async (params?: {
    page?: number
    pageSize?: number
  }): Promise<JournalListResponse> => {
    const queryParams = new URLSearchParams()
    if (params?.page) queryParams.append('page', params.page.toString())
    if (params?.pageSize) queryParams.append('pageSize', params.pageSize.toString())

    const queryString = queryParams.toString() ? `?${queryParams.toString()}` : ''
    const response = await apiService.get(`/api/users/me/journals${queryString}`)

    if (!response || typeof response !== 'object' || !('journals' in response)) {
      throw new Error('Invalid journal list data received from API')
    }

    return response as JournalListResponse
  }
}
