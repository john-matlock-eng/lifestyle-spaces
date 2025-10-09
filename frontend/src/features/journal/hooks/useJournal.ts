import { useState, useCallback } from 'react'
import { journalApi } from '../services/journalApi'
import type {
  JournalEntry,
  CreateJournalRequest,
  UpdateJournalRequest
} from '../types/journal.types'

/**
 * Hook for managing a single journal entry
 */
export const useJournal = () => {
  const [journal, setJournal] = useState<JournalEntry | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  /**
   * Load a journal entry by ID
   */
  const loadJournal = useCallback(async (id: string) => {
    setLoading(true)
    setError(null)
    try {
      const data = await journalApi.getJournal(id)
      setJournal(data)
      return data
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load journal'
      setError(errorMessage)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  /**
   * Create a new journal entry
   */
  const createJournal = useCallback(
    async (spaceId: string, data: CreateJournalRequest) => {
      setLoading(true)
      setError(null)
      try {
        const newJournal = await journalApi.createJournal(spaceId, data)
        setJournal(newJournal)
        return newJournal
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to create journal'
        setError(errorMessage)
        throw err
      } finally {
        setLoading(false)
      }
    },
    []
  )

  /**
   * Update an existing journal entry
   */
  const updateJournal = useCallback(
    async (id: string, data: UpdateJournalRequest) => {
      setLoading(true)
      setError(null)
      try {
        const updated = await journalApi.updateJournal(id, data)
        setJournal(updated)
        return updated
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to update journal'
        setError(errorMessage)
        throw err
      } finally {
        setLoading(false)
      }
    },
    []
  )

  /**
   * Delete a journal entry
   */
  const deleteJournal = useCallback(async (id: string) => {
    setLoading(true)
    setError(null)
    try {
      await journalApi.deleteJournal(id)
      setJournal(null)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete journal'
      setError(errorMessage)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setError(null)
  }, [])

  return {
    journal,
    loading,
    error,
    loadJournal,
    createJournal,
    updateJournal,
    deleteJournal,
    clearError
  }
}
