/**
 * useJournalFilters Hook
 *
 * Manages journal filter state with URL parameter persistence.
 * Syncs filter values bidirectionally with URL search params.
 *
 * @module journal/JournalFilters/useJournalFilters
 */

import { useState, useCallback, useEffect, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import type { FrameworkFilterValue } from './FrameworkFilter'

/**
 * Date range filter options
 */
export type DateRangeFilterValue = 'all' | 'today' | 'week' | 'month' | 'year'

/**
 * Filter state interface
 */
export interface JournalFilterState {
  search: string
  framework: FrameworkFilterValue
  dateRange: DateRangeFilterValue
  author: string
  emotion: string
  tag: string
}

/**
 * Default filter state
 */
const defaultFilterState: JournalFilterState = {
  search: '',
  framework: 'all',
  dateRange: 'all',
  author: 'all',
  emotion: 'all',
  tag: 'all',
}

/**
 * URL param keys
 */
const URL_PARAMS = {
  search: 'search',
  framework: 'framework',
  dateRange: 'date',
  author: 'author',
  emotion: 'emotion',
  tag: 'tag',
} as const

/**
 * Hook return type
 */
export interface UseJournalFiltersReturn {
  /** Current filter state */
  filters: JournalFilterState
  /** Update search query */
  setSearch: (value: string) => void
  /** Update framework filter */
  setFramework: (value: FrameworkFilterValue) => void
  /** Update date range filter */
  setDateRange: (value: DateRangeFilterValue) => void
  /** Update author filter */
  setAuthor: (value: string) => void
  /** Update emotion filter */
  setEmotion: (value: string) => void
  /** Update tag filter */
  setTag: (value: string) => void
  /** Clear all filters */
  clearAll: () => void
  /** Check if any filters are active */
  hasActiveFilters: boolean
  /** Count of active filters */
  activeFilterCount: number
}

/**
 * Journal filters hook with URL persistence
 *
 * Features:
 * - Bidirectional sync with URL search params
 * - Persists filter state across navigation
 * - Easy sharing of filtered views via URL
 * - Clear all filters function
 * - Active filter detection
 *
 * @example
 * ```tsx
 * const {
 *   filters,
 *   setSearch,
 *   setFramework,
 *   setDateRange,
 *   clearAll,
 *   hasActiveFilters
 * } = useJournalFilters()
 *
 * // URL: /journal?framework=charter-and-course&search=weekly
 * // filters.framework = 'charter-and-course'
 * // filters.search = 'weekly'
 * ```
 */
export function useJournalFilters(): UseJournalFiltersReturn {
  const [searchParams, setSearchParams] = useSearchParams()

  // Initialize state from URL params
  const [filters, setFilters] = useState<JournalFilterState>(() => ({
    search: searchParams.get(URL_PARAMS.search) || defaultFilterState.search,
    framework: (searchParams.get(URL_PARAMS.framework) as FrameworkFilterValue) || defaultFilterState.framework,
    dateRange: (searchParams.get(URL_PARAMS.dateRange) as DateRangeFilterValue) || defaultFilterState.dateRange,
    author: searchParams.get(URL_PARAMS.author) || defaultFilterState.author,
    emotion: searchParams.get(URL_PARAMS.emotion) || defaultFilterState.emotion,
    tag: searchParams.get(URL_PARAMS.tag) || defaultFilterState.tag,
  }))

  // Sync state to URL params
  useEffect(() => {
    const newParams = new URLSearchParams()

    // Only add non-default values to URL
    if (filters.search) {
      newParams.set(URL_PARAMS.search, filters.search)
    }
    if (filters.framework !== 'all') {
      newParams.set(URL_PARAMS.framework, filters.framework)
    }
    if (filters.dateRange !== 'all') {
      newParams.set(URL_PARAMS.dateRange, filters.dateRange)
    }
    if (filters.author !== 'all') {
      newParams.set(URL_PARAMS.author, filters.author)
    }
    if (filters.emotion !== 'all') {
      newParams.set(URL_PARAMS.emotion, filters.emotion)
    }
    if (filters.tag !== 'all') {
      newParams.set(URL_PARAMS.tag, filters.tag)
    }

    // Only update if params actually changed
    const currentParams = searchParams.toString()
    const newParamsString = newParams.toString()
    if (currentParams !== newParamsString) {
      setSearchParams(newParams, { replace: true })
    }
  }, [filters, searchParams, setSearchParams])

  // Update individual filter values
  const setSearch = useCallback((value: string) => {
    setFilters((prev) => ({ ...prev, search: value }))
  }, [])

  const setFramework = useCallback((value: FrameworkFilterValue) => {
    setFilters((prev) => ({ ...prev, framework: value }))
  }, [])

  const setDateRange = useCallback((value: DateRangeFilterValue) => {
    setFilters((prev) => ({ ...prev, dateRange: value }))
  }, [])

  const setAuthor = useCallback((value: string) => {
    setFilters((prev) => ({ ...prev, author: value }))
  }, [])

  const setEmotion = useCallback((value: string) => {
    setFilters((prev) => ({ ...prev, emotion: value }))
  }, [])

  const setTag = useCallback((value: string) => {
    setFilters((prev) => ({ ...prev, tag: value }))
  }, [])

  // Clear all filters
  const clearAll = useCallback(() => {
    setFilters(defaultFilterState)
  }, [])

  // Calculate active filter count
  const activeFilterCount = useMemo(() => {
    let count = 0
    if (filters.search) count++
    if (filters.framework !== 'all') count++
    if (filters.dateRange !== 'all') count++
    if (filters.author !== 'all') count++
    if (filters.emotion !== 'all') count++
    if (filters.tag !== 'all') count++
    return count
  }, [filters])

  const hasActiveFilters = activeFilterCount > 0

  return {
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
  }
}

export default useJournalFilters
