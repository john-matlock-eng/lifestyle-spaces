/**
 * JournalFilters Component Tests
 *
 * Comprehensive tests for journal filtering functionality.
 *
 * @module journal/JournalFilters/tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { JournalFilters } from './index'
import { FrameworkFilter } from './FrameworkFilter'
import { FrameworkBadge } from './FrameworkBadge'
import type { JournalFilterState } from './useJournalFilters'

// Mock the framework registry
vi.mock('@/features/journal/frameworks', () => {
  const mockRegistry = {
    getAll: vi.fn(() => [
      {
        id: 'charter-and-course',
        name: 'Charter & Course',
        icon: '🧭',
        description: 'A framework for intentional living',
        isActive: true,
        templates: [
          { id: 'weekly-scoreboard', name: 'Weekly Scoreboard' },
          { id: 'quarterly-plan', name: 'Quarterly Plan' },
        ],
      },
      {
        id: 'stoic-journal',
        name: 'Stoic Journal',
        icon: '📜',
        description: 'Daily stoic practices',
        isActive: true,
        templates: [{ id: 'morning-reflection', name: 'Morning Reflection' }],
      },
    ]),
    get: vi.fn((id: string) => {
      if (id === 'charter-and-course') {
        return {
          id: 'charter-and-course',
          name: 'Charter & Course',
          icon: '🧭',
          templates: [
            { id: 'weekly-scoreboard', name: 'Weekly Scoreboard' },
            { id: 'quarterly-plan', name: 'Quarterly Plan' },
          ],
        }
      }
      if (id === 'stoic-journal') {
        return {
          id: 'stoic-journal',
          name: 'Stoic Journal',
          icon: '📜',
          templates: [{ id: 'morning-reflection', name: 'Morning Reflection' }],
        }
      }
      return undefined
    }),
  }
  return {
    frameworkRegistry: mockRegistry,
    getFrameworkRegistry: vi.fn(() => mockRegistry),
  }
})

// ============================================================================
// TEST HELPERS
// ============================================================================

const defaultFilters: JournalFilterState = {
  search: '',
  framework: 'all',
  dateRange: 'all',
  author: 'all',
  emotion: 'all',
  tag: 'all',
}

const renderWithRouter = (ui: React.ReactElement) => {
  return render(<MemoryRouter>{ui}</MemoryRouter>)
}

// ============================================================================
// FRAMEWORK FILTER TESTS
// ============================================================================

describe('FrameworkFilter', () => {
  const mockOnChange = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders with default value', () => {
    renderWithRouter(
      <FrameworkFilter
        value="all"
        onChange={mockOnChange}
        testId="test-filter"
      />
    )

    expect(screen.getByTestId('test-filter-select')).toHaveValue('all')
  })

  it('displays framework options from registry', () => {
    renderWithRouter(
      <FrameworkFilter
        value="all"
        onChange={mockOnChange}
        testId="test-filter"
      />
    )

    const select = screen.getByTestId('test-filter-select')
    expect(select).toContainHTML('Charter & Course')
    expect(select).toContainHTML('Stoic Journal')
  })

  it('includes standalone option', () => {
    renderWithRouter(
      <FrameworkFilter
        value="all"
        onChange={mockOnChange}
        testId="test-filter"
      />
    )

    const select = screen.getByTestId('test-filter-select')
    expect(select).toContainHTML('Standalone')
  })

  it('calls onChange when selection changes', async () => {
    renderWithRouter(
      <FrameworkFilter
        value="all"
        onChange={mockOnChange}
        testId="test-filter"
      />
    )

    const select = screen.getByTestId('test-filter-select')
    await userEvent.selectOptions(select, 'charter-and-course')

    expect(mockOnChange).toHaveBeenCalledWith('charter-and-course')
  })

  it('renders selected framework value', () => {
    renderWithRouter(
      <FrameworkFilter
        value="charter-and-course"
        onChange={mockOnChange}
        testId="test-filter"
      />
    )

    expect(screen.getByTestId('test-filter-select')).toHaveValue('charter-and-course')
  })

  it('can be disabled', () => {
    renderWithRouter(
      <FrameworkFilter
        value="all"
        onChange={mockOnChange}
        disabled
        testId="test-filter"
      />
    )

    expect(screen.getByTestId('test-filter-select')).toBeDisabled()
  })

  it('uses provided frameworks when available', () => {
    const customFrameworks = [
      { id: 'custom-1', name: 'Custom Framework', icon: '✨' },
    ]

    renderWithRouter(
      <FrameworkFilter
        value="all"
        onChange={mockOnChange}
        frameworks={customFrameworks}
        testId="test-filter"
      />
    )

    const select = screen.getByTestId('test-filter-select')
    expect(select).toContainHTML('Custom Framework')
    expect(select).not.toContainHTML('Charter & Course')
  })
})

// ============================================================================
// FRAMEWORK BADGE TESTS
// ============================================================================

describe('FrameworkBadge', () => {
  it('renders standalone badge when no frameworkId', () => {
    renderWithRouter(<FrameworkBadge frameworkId={null} testId="test-badge" />)

    expect(screen.getByTestId('test-badge')).toHaveTextContent('Standalone')
    expect(screen.getByTestId('test-badge')).toHaveClass('journal-card-framework-badge--standalone')
  })

  it('renders framework badge with icon and name', () => {
    renderWithRouter(
      <FrameworkBadge
        frameworkId="charter-and-course"
        testId="test-badge"
      />
    )

    expect(screen.getByTestId('test-badge')).toHaveTextContent('🧭')
    expect(screen.getByTestId('test-badge')).toHaveTextContent('Charter & Course')
  })

  it('renders template name when provided', () => {
    renderWithRouter(
      <FrameworkBadge
        frameworkId="charter-and-course"
        templateId="weekly-scoreboard"
        testId="test-badge"
      />
    )

    expect(screen.getByTestId('test-badge')).toHaveTextContent('Weekly Scoreboard')
  })

  it('renders frequency context when provided', () => {
    renderWithRouter(
      <FrameworkBadge
        frameworkId="charter-and-course"
        frequencyContext="Week 8 of Q4"
        testId="test-badge"
      />
    )

    expect(screen.getByTestId('test-badge')).toHaveTextContent('Week 8 of Q4')
  })

  it('renders compact mode with abbreviated name', () => {
    renderWithRouter(
      <FrameworkBadge
        frameworkId="charter-and-course"
        compact
        testId="test-badge"
      />
    )

    // Compact mode shows initials: "Charter & Course" -> "C&C" or similar
    expect(screen.getByTestId('test-badge')).toHaveTextContent('🧭')
    // Should NOT show template name in compact mode
    expect(screen.queryByText('Weekly Scoreboard')).not.toBeInTheDocument()
  })

  it('falls back to frameworkId if framework not in registry', () => {
    renderWithRouter(
      <FrameworkBadge
        frameworkId="unknown-framework"
        testId="test-badge"
      />
    )

    expect(screen.getByTestId('test-badge')).toHaveTextContent('unknown-framework')
  })
})

// ============================================================================
// JOURNAL FILTERS COMPONENT TESTS
// ============================================================================

describe('JournalFilters', () => {
  const mockOnSearchChange = vi.fn()
  const mockOnFrameworkChange = vi.fn()
  const mockOnDateRangeChange = vi.fn()
  const mockOnClearAll = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  const defaultProps = {
    filters: defaultFilters,
    onSearchChange: mockOnSearchChange,
    onFrameworkChange: mockOnFrameworkChange,
    onDateRangeChange: mockOnDateRangeChange,
    onClearAll: mockOnClearAll,
    hasActiveFilters: false,
    activeFilterCount: 0,
    testId: 'test-filters',
  }

  it('renders all filter components', () => {
    renderWithRouter(<JournalFilters {...defaultProps} />)

    expect(screen.getByTestId('test-filters')).toBeInTheDocument()
    expect(screen.getByTestId('test-filters-search')).toBeInTheDocument()
    expect(screen.getByTestId('test-filters-framework-select')).toBeInTheDocument()
    expect(screen.getByTestId('test-filters-date')).toBeInTheDocument()
  })

  it('calls onSearchChange when search input changes', async () => {
    renderWithRouter(<JournalFilters {...defaultProps} />)

    const searchInput = screen.getByTestId('test-filters-search')
    await userEvent.type(searchInput, 'test query')

    expect(mockOnSearchChange).toHaveBeenCalled()
  })

  it('shows clear button when search has value', async () => {
    renderWithRouter(
      <JournalFilters
        {...defaultProps}
        filters={{ ...defaultFilters, search: 'test' }}
      />
    )

    expect(screen.getByTestId('test-filters-search-clear')).toBeInTheDocument()
  })

  it('clears search when clear button clicked', async () => {
    renderWithRouter(
      <JournalFilters
        {...defaultProps}
        filters={{ ...defaultFilters, search: 'test' }}
      />
    )

    await userEvent.click(screen.getByTestId('test-filters-search-clear'))
    expect(mockOnSearchChange).toHaveBeenCalledWith('')
  })

  it('calls onFrameworkChange when framework filter changes', async () => {
    renderWithRouter(<JournalFilters {...defaultProps} />)

    const frameworkSelect = screen.getByTestId('test-filters-framework-select')
    await userEvent.selectOptions(frameworkSelect, 'charter-and-course')

    expect(mockOnFrameworkChange).toHaveBeenCalledWith('charter-and-course')
  })

  it('calls onDateRangeChange when date filter changes', async () => {
    renderWithRouter(<JournalFilters {...defaultProps} />)

    const dateSelect = screen.getByTestId('test-filters-date')
    await userEvent.selectOptions(dateSelect, 'week')

    expect(mockOnDateRangeChange).toHaveBeenCalledWith('week')
  })

  it('shows active filter count when filters are active', () => {
    renderWithRouter(
      <JournalFilters
        {...defaultProps}
        hasActiveFilters={true}
        activeFilterCount={3}
      />
    )

    expect(screen.getByTestId('test-filters-active-count')).toHaveTextContent('3 filters active')
  })

  it('shows singular "filter" when only one active', () => {
    renderWithRouter(
      <JournalFilters
        {...defaultProps}
        hasActiveFilters={true}
        activeFilterCount={1}
      />
    )

    expect(screen.getByTestId('test-filters-active-count')).toHaveTextContent('1 filter active')
  })

  it('shows clear all button when filters are active', () => {
    renderWithRouter(
      <JournalFilters
        {...defaultProps}
        hasActiveFilters={true}
        activeFilterCount={1}
      />
    )

    expect(screen.getByTestId('test-filters-clear')).toBeInTheDocument()
  })

  it('calls onClearAll when clear all button clicked', async () => {
    renderWithRouter(
      <JournalFilters
        {...defaultProps}
        hasActiveFilters={true}
        activeFilterCount={1}
      />
    )

    await userEvent.click(screen.getByTestId('test-filters-clear'))
    expect(mockOnClearAll).toHaveBeenCalledTimes(1)
  })

  it('does not show clear button or count when no filters active', () => {
    renderWithRouter(<JournalFilters {...defaultProps} />)

    expect(screen.queryByTestId('test-filters-active-count')).not.toBeInTheDocument()
    expect(screen.queryByTestId('test-filters-clear')).not.toBeInTheDocument()
  })

  it('displays correct filter values', () => {
    renderWithRouter(
      <JournalFilters
        {...defaultProps}
        filters={{
          ...defaultFilters,
          search: 'test search',
          framework: 'charter-and-course',
          dateRange: 'week',
        }}
      />
    )

    expect(screen.getByTestId('test-filters-search')).toHaveValue('test search')
    expect(screen.getByTestId('test-filters-framework-select')).toHaveValue('charter-and-course')
    expect(screen.getByTestId('test-filters-date')).toHaveValue('week')
  })
})

// ============================================================================
// URL PERSISTENCE TESTS (useJournalFilters)
// ============================================================================

describe('useJournalFilters URL persistence', () => {
  // Note: These tests would require more complex setup with actual router state
  // For now, we test the component integration

  it('initial state matches default filters', () => {
    renderWithRouter(
      <JournalFilters
        filters={defaultFilters}
        onSearchChange={vi.fn()}
        onFrameworkChange={vi.fn()}
        onDateRangeChange={vi.fn()}
        onClearAll={vi.fn()}
        hasActiveFilters={false}
        activeFilterCount={0}
      />
    )

    expect(screen.getByRole('textbox')).toHaveValue('')
    expect(screen.getByLabelText('Filter by framework')).toHaveValue('all')
    expect(screen.getByLabelText('Filter by date range')).toHaveValue('all')
  })
})

// ============================================================================
// FILTER COMBINATION TESTS
// ============================================================================

describe('Filter combinations', () => {
  it('displays all filter values correctly when multiple are set', () => {
    const activeFilters: JournalFilterState = {
      search: 'weekly',
      framework: 'charter-and-course',
      dateRange: 'month',
      author: 'all',
      emotion: 'all',
      tag: 'all',
    }

    renderWithRouter(
      <JournalFilters
        filters={activeFilters}
        onSearchChange={vi.fn()}
        onFrameworkChange={vi.fn()}
        onDateRangeChange={vi.fn()}
        onClearAll={vi.fn()}
        hasActiveFilters={true}
        activeFilterCount={3}
        testId="test-filters"
      />
    )

    expect(screen.getByTestId('test-filters-search')).toHaveValue('weekly')
    expect(screen.getByTestId('test-filters-framework-select')).toHaveValue('charter-and-course')
    expect(screen.getByTestId('test-filters-date')).toHaveValue('month')
    expect(screen.getByTestId('test-filters-active-count')).toHaveTextContent('3 filters active')
  })
})

// ============================================================================
// ACCESSIBILITY TESTS
// ============================================================================

describe('Accessibility', () => {
  it('has proper aria labels on inputs', () => {
    renderWithRouter(
      <JournalFilters
        filters={defaultFilters}
        onSearchChange={vi.fn()}
        onFrameworkChange={vi.fn()}
        onDateRangeChange={vi.fn()}
        onClearAll={vi.fn()}
        hasActiveFilters={false}
        activeFilterCount={0}
      />
    )

    expect(screen.getByLabelText('Search journals')).toBeInTheDocument()
    expect(screen.getByLabelText('Filter by framework')).toBeInTheDocument()
    expect(screen.getByLabelText('Filter by date range')).toBeInTheDocument()
  })

  it('clear search button has aria label', () => {
    renderWithRouter(
      <JournalFilters
        filters={{ ...defaultFilters, search: 'test' }}
        onSearchChange={vi.fn()}
        onFrameworkChange={vi.fn()}
        onDateRangeChange={vi.fn()}
        onClearAll={vi.fn()}
        hasActiveFilters={true}
        activeFilterCount={1}
      />
    )

    expect(screen.getByLabelText('Clear search')).toBeInTheDocument()
  })
})
