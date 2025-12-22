import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { JournalCard, JournalCardSkeleton } from '../../../components/JournalCard'
import { journalApi } from '../services/journalApi'
import { JournalFilters, useJournalFilters } from '../../../components/journal/JournalFilters'
import { ThemeFilter } from '../../../components/journal/ThemeFilter'
import type { JournalCardEntry } from '../types/journal.types'
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
  const [journals, setJournals] = useState<JournalCardEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const pageSize = 9

  // AI Theme filter state
  const [selectedThemes, setSelectedThemes] = useState<string[]>([])

  // Use URL-synced filters hook
  const {
    filters,
    setSearch,
    setFramework,
    setDateRange,
    setAuthor,
    setEmotion,
    setTag,
    clearAll,
    hasActiveFilters,
    activeFilterCount,
  } = useJournalFilters()

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

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [filters, selectedThemes])

  // Theme filter handlers
  const handleThemeSelect = useCallback((theme: string) => {
    setSelectedThemes((prev) => [...prev, theme])
  }, [])

  const handleThemeDeselect = useCallback((theme: string) => {
    setSelectedThemes((prev) => prev.filter((t) => t !== theme))
  }, [])

  const handleClearThemes = useCallback(() => {
    setSelectedThemes([])
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
  const matchesDateFilter = useCallback((dateString: string): boolean => {
    if (filters.dateRange === 'all') return true

    const journalDate = new Date(dateString)
    const now = new Date()
    const dayInMs = 24 * 60 * 60 * 1000

    switch (filters.dateRange) {
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
  }, [filters.dateRange])

  // Helper function to check if framework matches filter
  const matchesFrameworkFilter = useCallback((journal: JournalCardEntry): boolean => {
    if (filters.framework === 'all') return true
    if (filters.framework === 'standalone') {
      // Show entries without a framework
      return !journal.frameworkId
    }
    // Show entries with specific framework
    return journal.frameworkId === filters.framework
  }, [filters.framework])

  // Filter journals based on search query and filters
  const filteredJournals = useMemo(() => {
    return journals.filter((journal) => {
      // Search query filter (uses title, AI synopsis, themes, tags, author)
      if (filters.search.trim()) {
        const query = filters.search.toLowerCase()
        const titleMatch = journal.title?.toLowerCase().includes(query) || false
        const synopsisMatch = journal.aiMetadata?.synopsis?.toLowerCase().includes(query) || false
        const themesMatch = journal.aiMetadata?.themes?.some((t) => t.toLowerCase().includes(query)) || false
        const tagsMatch = journal.tags?.some((tag) => tag.toLowerCase().includes(query)) || false
        const authorMatch = journal.author?.displayName?.toLowerCase().includes(query) || false

        if (!titleMatch && !synopsisMatch && !themesMatch && !tagsMatch && !authorMatch) {
          return false
        }
      }

      // Framework filter
      if (!matchesFrameworkFilter(journal)) {
        return false
      }

      // Author filter
      if (filters.author !== 'all' && journal.author?.displayName !== filters.author) {
        return false
      }

      // Emotion filter
      if (filters.emotion !== 'all' && !journal.emotions?.includes(filters.emotion)) {
        return false
      }

      // Tag filter
      if (filters.tag !== 'all' && !journal.tags?.includes(filters.tag)) {
        return false
      }

      // Date filter
      if (!matchesDateFilter(journal.createdAt)) {
        return false
      }

      // AI Theme filter
      if (selectedThemes.length > 0) {
        const journalThemes = journal.aiMetadata?.themes || []
        const hasMatchingTheme = selectedThemes.some((selectedTheme) =>
          journalThemes.some((t) => t.toLowerCase() === selectedTheme.toLowerCase())
        )
        if (!hasMatchingTheme) {
          return false
        }
      }

      return true
    })
  }, [journals, filters, matchesFrameworkFilter, matchesDateFilter, selectedThemes])

  // Handle theme click from card
  const handleCardThemeClick = useCallback((theme: string) => {
    if (!selectedThemes.includes(theme)) {
      setSelectedThemes((prev) => [...prev, theme])
    }
  }, [selectedThemes])

  // Handle tag click from card - use the existing setTag filter
  const handleCardTagClick = useCallback((tag: string) => {
    setTag(tag)
  }, [setTag])

  if (loading) {
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
          {Array.from({ length: 6 }).map((_, i) => (
            <JournalCardSkeleton key={i} />
          ))}
        </div>
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

  if (journals.length === 0 && !hasActiveFilters && selectedThemes.length === 0) {
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

      {/* New Filter Controls with Framework Filter */}
      <JournalFilters
        filters={filters}
        onSearchChange={setSearch}
        onFrameworkChange={setFramework}
        onDateRangeChange={setDateRange}
        onClearAll={clearAll}
        hasActiveFilters={hasActiveFilters}
        activeFilterCount={activeFilterCount}
        testId="journal-list-filters"
      />

      {/* Additional Filters (Author, Emotion, Tag) */}
      {(uniqueAuthors.length > 0 || uniqueEmotions.length > 0 || uniqueTags.length > 0) && (
        <div className="journal-list-filters" style={{ marginTop: '-8px' }}>
          {/* Author Filter */}
          {uniqueAuthors.length > 0 && (
            <div className="journal-filter">
              <label htmlFor="author-filter" className="journal-filter__label">
                Author:
              </label>
              <select
                id="author-filter"
                value={filters.author}
                onChange={(e) => setAuthor(e.target.value)}
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

          {/* Emotion Filter */}
          {uniqueEmotions.length > 0 && (
            <div className="journal-filter">
              <label htmlFor="emotion-filter" className="journal-filter__label">
                Feeling:
              </label>
              <select
                id="emotion-filter"
                value={filters.emotion}
                onChange={(e) => setEmotion(e.target.value)}
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
                value={filters.tag}
                onChange={(e) => setTag(e.target.value)}
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
        </div>
      )}

      {/* AI Theme Filter */}
      <ThemeFilter
        spaceId={spaceId}
        selectedThemes={selectedThemes}
        onThemeSelect={handleThemeSelect}
        onThemeDeselect={handleThemeDeselect}
        onClearAll={handleClearThemes}
      />

      {filteredJournals.length === 0 && (hasActiveFilters || selectedThemes.length > 0) ? (
        <div className="journal-list-empty">
          <div className="journal-list-empty-icon">🔍</div>
          <p className="journal-list-empty-text">No journals match your filters</p>
          <button
            onClick={() => {
              clearAll()
              handleClearThemes()
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
              onThemeClick={handleCardThemeClick}
              onTagClick={handleCardTagClick}
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
