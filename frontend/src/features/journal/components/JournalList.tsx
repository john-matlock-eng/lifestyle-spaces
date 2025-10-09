import React, { useState, useEffect } from 'react'
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
  const pageSize = 9

  useEffect(() => {
    loadJournals()
  }, [spaceId, currentPage])

  const loadJournals = async () => {
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
  }

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

  if (journals.length === 0) {
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
        <div className="journal-list-actions">
          <button onClick={handleNewJournal} className="button-primary">
            + New Journal
          </button>
        </div>
      </div>

      <div className="journal-list-grid">
        {journals.map((journal) => (
          <JournalCard key={journal.journalId} journal={journal} />
        ))}
      </div>

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
