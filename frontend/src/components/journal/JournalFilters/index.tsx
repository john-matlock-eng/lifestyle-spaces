/**
 * JournalFilters Component
 *
 * Combined filter bar for journal list page.
 * Includes search, framework filter, and date range filter.
 *
 * @module journal/JournalFilters
 */

import { FrameworkFilter } from './FrameworkFilter'
import type { FrameworkFilterValue } from './FrameworkFilter'
import type { DateRangeFilterValue, JournalFilterState } from './useJournalFilters'
import './journal-filters.css'

/**
 * Props for JournalFilters component
 */
export interface JournalFiltersProps {
  /** Current filter values */
  filters: JournalFilterState
  /** Callback when search changes */
  onSearchChange: (value: string) => void
  /** Callback when framework filter changes */
  onFrameworkChange: (value: FrameworkFilterValue) => void
  /** Callback when date range changes */
  onDateRangeChange: (value: DateRangeFilterValue) => void
  /** Callback to clear all filters */
  onClearAll: () => void
  /** Whether any filters are active */
  hasActiveFilters: boolean
  /** Number of active filters */
  activeFilterCount: number
  /** Test ID prefix */
  testId?: string
}

/**
 * Combined journal filters bar
 *
 * Layout: [Search] [Framework ▼] [Date Range ▼] [Clear]
 *
 * Features:
 * - Search input with clear button
 * - Framework filter dropdown
 * - Date range filter dropdown
 * - Clear all filters button
 * - Active filter count indicator
 * - Glassmorphism styling
 * - Mobile responsive
 *
 * @example
 * ```tsx
 * const {
 *   filters,
 *   setSearch,
 *   setFramework,
 *   setDateRange,
 *   clearAll,
 *   hasActiveFilters,
 *   activeFilterCount
 * } = useJournalFilters()
 *
 * <JournalFilters
 *   filters={filters}
 *   onSearchChange={setSearch}
 *   onFrameworkChange={setFramework}
 *   onDateRangeChange={setDateRange}
 *   onClearAll={clearAll}
 *   hasActiveFilters={hasActiveFilters}
 *   activeFilterCount={activeFilterCount}
 * />
 * ```
 */
export function JournalFilters({
  filters,
  onSearchChange,
  onFrameworkChange,
  onDateRangeChange,
  onClearAll,
  hasActiveFilters,
  activeFilterCount,
  testId = 'journal-filters',
}: JournalFiltersProps): JSX.Element {
  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    onSearchChange(event.target.value)
  }

  const handleSearchClear = () => {
    onSearchChange('')
  }

  const handleDateRangeChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    onDateRangeChange(event.target.value as DateRangeFilterValue)
  }

  return (
    <div className="journal-filters-container" data-testid={testId}>
      {/* Search Input */}
      <div className="journal-filters-search">
        <div className="journal-filters-search__wrapper">
          <span className="journal-filters-search__icon" aria-hidden="true">
            🔍
          </span>
          <input
            type="text"
            className="journal-filters-search__input"
            placeholder="Search journals..."
            value={filters.search}
            onChange={handleSearchChange}
            aria-label="Search journals"
            data-testid={`${testId}-search`}
          />
          {filters.search && (
            <button
              type="button"
              className="journal-filters-search__clear"
              onClick={handleSearchClear}
              aria-label="Clear search"
              data-testid={`${testId}-search-clear`}
            >
              ×
            </button>
          )}
        </div>
      </div>

      {/* Framework Filter */}
      <FrameworkFilter
        value={filters.framework}
        onChange={onFrameworkChange}
        testId={`${testId}-framework`}
      />

      {/* Date Range Filter */}
      <div className="date-range-filter">
        <label
          htmlFor={`${testId}-date-select`}
          className="date-range-filter__label"
        >
          Date:
        </label>
        <select
          id={`${testId}-date-select`}
          className="date-range-filter__select"
          value={filters.dateRange}
          onChange={handleDateRangeChange}
          aria-label="Filter by date range"
          data-testid={`${testId}-date`}
        >
          <option value="all">All Time</option>
          <option value="today">Today</option>
          <option value="week">Past Week</option>
          <option value="month">Past Month</option>
          <option value="year">Past Year</option>
        </select>
      </div>

      {/* Active Filter Indicator */}
      {hasActiveFilters && (
        <span
          className="journal-filters-active-count"
          data-testid={`${testId}-active-count`}
        >
          {activeFilterCount} filter{activeFilterCount !== 1 ? 's' : ''} active
        </span>
      )}

      {/* Clear All Button */}
      {hasActiveFilters && (
        <button
          type="button"
          className="journal-filters-clear"
          onClick={onClearAll}
          data-testid={`${testId}-clear`}
        >
          Clear All
        </button>
      )}
    </div>
  )
}

// Re-export types and components
export { FrameworkFilter } from './FrameworkFilter'
export type { FrameworkFilterValue, FrameworkFilterProps } from './FrameworkFilter'
export { FrameworkBadge } from './FrameworkBadge'
export type { FrameworkBadgeProps } from './FrameworkBadge'
export { useJournalFilters } from './useJournalFilters'
export type { DateRangeFilterValue, JournalFilterState, UseJournalFiltersReturn } from './useJournalFilters'

export default JournalFilters
