import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { JournalCard } from './JournalCard'
import { journalApi } from '../services/journalApi'
import type { JournalEntry } from '../types/journal.types'
import '../styles/journal.css'

interface JournalListProps {
  spaceId: string
}

/**
 * Component for displaying a paginated list of journals
 */
export const JournalList: React.FC<JournalListProps> = ({ spaceId }) => {
  const navigate = useNavigate()
  const [journals, setJournals] = useState<JournalEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const pageSize = 9

  const loadJournals = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await journalApi.getSpaceJournals(spaceId, {
        page: currentPage,
        pageSize
      })
      setJournals(response.journals)
      setHasMore(response.hasMore)
      setTotalPages(Math.ceil(response.total / pageSize))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load journals')
    } finally {
      setLoading(false)
    }
  }, [spaceId, currentPage, pageSize])

  useEffect(() => {
    loadJournals()
  }, [loadJournals])

  const handleNewJournal = () => {
    navigate(`/spaces/${spaceId}/journals/new`)
  }

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1)
    }
  }

  const handleNextPage = () => {
    if (hasMore) {
      setCurrentPage(currentPage + 1)
    }
  }

  const handleDelete = async (journalId: string) => {
    try {
      await journalApi.deleteJournal(spaceId, journalId)
      // Reload journals after successful delete
      await loadJournals()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete journal')
    }
  }

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query)
    // Reset to first page when searching
    setCurrentPage(1)
  }, [])

  // Filter journals based on search query
  const filteredJournals = journals.filter((journal) => {
    if (!searchQuery.trim()) return true

    const query = searchQuery.toLowerCase()
    const titleMatch = journal.title?.toLowerCase().includes(query) || false
    const contentMatch = journal.content?.toLowerCase().includes(query) || false
    const tagsMatch = journal.tags?.some((tag) => tag.toLowerCase().includes(query)) || false
    const authorMatch = journal.author?.displayName?.toLowerCase().includes(query) || false

    return titleMatch || contentMatch || tagsMatch || authorMatch
  })

  if (loading) {
    return (
      <div className="journal-list-loading">
        <p>Loading journals...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="journal-list-error">
        <p>Error: {error}</p>
        <button onClick={loadJournals}>Try Again</button>
      </div>
    )
  }

  if (journals.length === 0 && !searchQuery) {
    return (
      <div className="journal-list-empty">
        <div className="journal-list-empty-icon">📔</div>
        <p className="journal-list-empty-text">No journals yet</p>
        <button onClick={handleNewJournal} className="button-primary">
          Create Your First Journal
        </button>
      </div>
    )
  }

  return (
    <div className="journal-list-container">
      <div className="journal-list-header">
        <h2 className="journal-list-title">Journals</h2>
        <div className="journal-list-search">
          <input
            type="text"
            placeholder="Search journals..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="journal-list-search__input"
            aria-label="Search journals"
          />
        </div>
        <div className="journal-list-actions">
          <button onClick={handleNewJournal} className="button-primary">
            + New Journal
          </button>
        </div>
      </div>

      {filteredJournals.length === 0 && searchQuery ? (
        <div className="journal-list-empty">
          <div className="journal-list-empty-icon">🔍</div>
          <p className="journal-list-empty-text">No journals match "{searchQuery}"</p>
          <button onClick={() => handleSearch('')} className="button-secondary">
            Clear Search
          </button>
        </div>
      ) : (
        <div className="journal-list-grid">
          {filteredJournals.map((journal) => (
            <JournalCard
              key={journal.journalId}
              journal={journal}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="journal-pagination">
          <button onClick={handlePreviousPage} disabled={currentPage === 1}>
            Previous
          </button>
          <span className="journal-pagination-info">
            Page {currentPage} of {totalPages}
          </span>
          <button onClick={handleNextPage} disabled={!hasMore}>
            Next
          </button>
        </div>
      )}
    </div>
  )
}
