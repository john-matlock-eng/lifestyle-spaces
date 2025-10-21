import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { JournalCard } from './JournalCard'
import { journalApi } from '../services/journalApi'
import type { JournalEntry } from '../types/journal.types'
import { getEmotionById } from '../data/emotionData'
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
  const [selectedAuthor, setSelectedAuthor] = useState<string>('all')
  const [selectedEmotion, setSelectedEmotion] = useState<string>('all')
  const [selectedTag, setSelectedTag] = useState<string>('all')
  const [dateFilter, setDateFilter] = useState<string>('all')
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

  // Extract unique values for filter dropdowns
  const uniqueAuthors = Array.from(
    new Set(journals.map((j) => j.author?.displayName).filter(Boolean))
  ).sort()

  const uniqueEmotions = Array.from(
    new Set(journals.flatMap((j) => j.emotions || []))
  ).sort()

  const uniqueTags = Array.from(
    new Set(journals.flatMap((j) => j.tags || []))
  ).sort()

  // Helper function to check if date matches filter
  const matchesDateFilter = (dateString: string): boolean => {
    if (dateFilter === 'all') return true

    const journalDate = new Date(dateString)
    const now = new Date()
    const dayInMs = 24 * 60 * 60 * 1000

    switch (dateFilter) {
      case 'today':
        return journalDate.toDateString() === now.toDateString()
      case 'week':
        return now.getTime() - journalDate.getTime() <= 7 * dayInMs
      case 'month':
        return now.getTime() - journalDate.getTime() <= 30 * dayInMs
      case 'year':
        return now.getTime() - journalDate.getTime() <= 365 * dayInMs
      default:
        return true
    }
  }

  // Filter journals based on search query and filters
  const filteredJournals = journals.filter((journal) => {
    // Search query filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      const titleMatch = journal.title?.toLowerCase().includes(query) || false
      const contentMatch = journal.content?.toLowerCase().includes(query) || false
      const tagsMatch = journal.tags?.some((tag) => tag.toLowerCase().includes(query)) || false
      const authorMatch = journal.author?.displayName?.toLowerCase().includes(query) || false

      if (!titleMatch && !contentMatch && !tagsMatch && !authorMatch) {
        return false
      }
    }

    // Author filter
    if (selectedAuthor !== 'all' && journal.author?.displayName !== selectedAuthor) {
      return false
    }

    // Emotion filter
    if (selectedEmotion !== 'all' && !journal.emotions?.includes(selectedEmotion)) {
      return false
    }

    // Tag filter
    if (selectedTag !== 'all' && !journal.tags?.includes(selectedTag)) {
      return false
    }

    // Date filter
    if (!matchesDateFilter(journal.createdAt)) {
      return false
    }

    return true
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

      {/* Filter Controls */}
      <div className="journal-list-filters">
        {/* Author Filter */}
        {uniqueAuthors.length > 0 && (
          <div className="journal-filter">
            <label htmlFor="author-filter" className="journal-filter__label">
              Author:
            </label>
            <select
              id="author-filter"
              value={selectedAuthor}
              onChange={(e) => setSelectedAuthor(e.target.value)}
              className="journal-filter__select"
            >
              <option value="all">All Authors</option>
              {uniqueAuthors.map((author) => (
                <option key={author} value={author}>
                  {author}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Date Filter */}
        <div className="journal-filter">
          <label htmlFor="date-filter" className="journal-filter__label">
            Date:
          </label>
          <select
            id="date-filter"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="journal-filter__select"
          >
            <option value="all">All Time</option>
            <option value="today">Today</option>
            <option value="week">Past Week</option>
            <option value="month">Past Month</option>
            <option value="year">Past Year</option>
          </select>
        </div>

        {/* Emotion Filter */}
        {uniqueEmotions.length > 0 && (
          <div className="journal-filter">
            <label htmlFor="emotion-filter" className="journal-filter__label">
              Feeling:
            </label>
            <select
              id="emotion-filter"
              value={selectedEmotion}
              onChange={(e) => setSelectedEmotion(e.target.value)}
              className="journal-filter__select"
            >
              <option value="all">All Feelings</option>
              {uniqueEmotions.map((emotionId) => {
                const emotion = getEmotionById(emotionId)
                return (
                  <option key={emotionId} value={emotionId}>
                    {emotion?.label || emotionId}
                  </option>
                )
              })}
            </select>
          </div>
        )}

        {/* Tag Filter */}
        {uniqueTags.length > 0 && (
          <div className="journal-filter">
            <label htmlFor="tag-filter" className="journal-filter__label">
              Tag:
            </label>
            <select
              id="tag-filter"
              value={selectedTag}
              onChange={(e) => setSelectedTag(e.target.value)}
              className="journal-filter__select"
            >
              <option value="all">All Tags</option>
              {uniqueTags.map((tag) => (
                <option key={tag} value={tag}>
                  {tag}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Clear Filters Button */}
        {(selectedAuthor !== 'all' || selectedEmotion !== 'all' || selectedTag !== 'all' || dateFilter !== 'all' || searchQuery) && (
          <button
            onClick={() => {
              setSelectedAuthor('all')
              setSelectedEmotion('all')
              setSelectedTag('all')
              setDateFilter('all')
              setSearchQuery('')
            }}
            className="button-secondary journal-clear-filters"
          >
            Clear All Filters
          </button>
        )}
      </div>

      {filteredJournals.length === 0 && (searchQuery || selectedAuthor !== 'all' || selectedEmotion !== 'all' || selectedTag !== 'all' || dateFilter !== 'all') ? (
        <div className="journal-list-empty">
          <div className="journal-list-empty-icon">🔍</div>
          <p className="journal-list-empty-text">No journals match your filters</p>
          <button
            onClick={() => {
              setSearchQuery('')
              setSelectedAuthor('all')
              setSelectedEmotion('all')
              setSelectedTag('all')
              setDateFilter('all')
            }}
            className="button-secondary"
          >
            Clear All Filters
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
