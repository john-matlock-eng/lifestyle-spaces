/**
 * Journal Filtering Integration Tests
 *
 * Tests the journal list filtering functionality:
 * 1. Filter by framework (Charter & Course, Stoic, etc.)
 * 2. Filter standalone entries (no framework)
 * 3. Combined filters (search + framework + date)
 * 4. URL persistence of filter state
 *
 * @module __tests__/integration/journal-filtering
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { JournalEntry } from '@/features/journal/types/journal.types'

// ============================================================================
// MOCK DATA
// ============================================================================

interface JournalFilterState {
  search: string
  framework: string
  dateRange: string
  author: string
  emotion: string
  tag: string
}

/**
 * Create mock journal entries for testing filters
 */
function createMockJournalEntries(): JournalEntry[] {
  return [
    // Charter & Course entries
    {
      journalId: 'journal-1',
      spaceId: 'space-1',
      userId: 'user-1',
      frameworkId: 'charter-and-course',
      templateId: 'personal-charter',
      title: 'My Personal Charter',
      content: 'I am dependable and forthright...',
      status: 'published',
      visibility: 'private',
      tags: ['charter', 'foundation'],
      createdAt: '2024-03-01T10:00:00Z',
      updatedAt: '2024-03-01T10:00:00Z',
      wordCount: 500,
      isPinned: true,
    },
    {
      journalId: 'journal-2',
      spaceId: 'space-1',
      userId: 'user-1',
      frameworkId: 'charter-and-course',
      templateId: 'quarterly-review-plan',
      title: 'Q1 2024 Review',
      content: 'Focus areas: Health, Career, Relationships',
      status: 'published',
      visibility: 'private',
      tags: ['quarterly', 'planning'],
      createdAt: '2024-03-10T10:00:00Z',
      updatedAt: '2024-03-10T10:00:00Z',
      wordCount: 1200,
      isPinned: false,
    },
    {
      journalId: 'journal-3',
      spaceId: 'space-1',
      userId: 'user-1',
      frameworkId: 'charter-and-course',
      templateId: 'weekly-scoreboard',
      title: 'Week 11 Scoreboard',
      content: 'Health: 4/5, Career: 3/5',
      status: 'published',
      visibility: 'private',
      tags: ['weekly', 'tracking'],
      createdAt: '2024-03-15T10:00:00Z',
      updatedAt: '2024-03-15T10:00:00Z',
      wordCount: 300,
      isPinned: false,
    },
    // Stoic Journal entries
    {
      journalId: 'journal-4',
      spaceId: 'space-1',
      userId: 'user-1',
      frameworkId: 'stoic-journal',
      templateId: 'morning-reflection',
      title: 'Morning Reflection - March 12',
      content: 'What is within my control today...',
      status: 'published',
      visibility: 'private',
      tags: ['morning', 'stoic'],
      createdAt: '2024-03-12T06:00:00Z',
      updatedAt: '2024-03-12T06:00:00Z',
      wordCount: 200,
      isPinned: false,
    },
    {
      journalId: 'journal-5',
      spaceId: 'space-1',
      userId: 'user-1',
      frameworkId: 'stoic-journal',
      templateId: 'evening-review',
      title: 'Evening Review - March 12',
      content: 'Three things I am grateful for...',
      status: 'published',
      visibility: 'private',
      tags: ['evening', 'stoic', 'gratitude'],
      createdAt: '2024-03-12T21:00:00Z',
      updatedAt: '2024-03-12T21:00:00Z',
      wordCount: 150,
      isPinned: false,
    },
    // Standalone entries (no framework)
    {
      journalId: 'journal-6',
      spaceId: 'space-1',
      userId: 'user-1',
      frameworkId: null,
      templateId: null,
      title: 'Random Thoughts',
      content: 'Just wanted to write some thoughts down...',
      status: 'published',
      visibility: 'private',
      tags: ['personal'],
      createdAt: '2024-03-08T14:00:00Z',
      updatedAt: '2024-03-08T14:00:00Z',
      wordCount: 400,
      isPinned: false,
    },
    {
      journalId: 'journal-7',
      spaceId: 'space-1',
      userId: 'user-1',
      frameworkId: null,
      templateId: null,
      title: 'Dream Journal Entry',
      content: 'Last night I dreamt about...',
      status: 'published',
      visibility: 'private',
      tags: ['dreams', 'personal'],
      createdAt: '2024-03-05T07:00:00Z',
      updatedAt: '2024-03-05T07:00:00Z',
      wordCount: 250,
      isPinned: false,
    },
    // Draft entry
    {
      journalId: 'journal-8',
      spaceId: 'space-1',
      userId: 'user-1',
      frameworkId: 'charter-and-course',
      templateId: 'reset-protocol',
      title: 'Reset Protocol Draft',
      content: 'Work in progress...',
      status: 'draft',
      visibility: 'private',
      tags: ['reset'],
      createdAt: '2024-03-14T10:00:00Z',
      updatedAt: '2024-03-14T10:00:00Z',
      wordCount: 50,
      isPinned: false,
    },
  ]
}

// ============================================================================
// FILTER FUNCTIONS
// ============================================================================

/**
 * Apply filters to journal entries
 */
function applyFilters(
  entries: JournalEntry[],
  filters: JournalFilterState
): JournalEntry[] {
  return entries.filter(entry => {
    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase()
      const matchesTitle = entry.title.toLowerCase().includes(searchLower)
      const matchesContent = entry.content.toLowerCase().includes(searchLower)
      const matchesTags = entry.tags?.some(tag => tag.toLowerCase().includes(searchLower))
      if (!matchesTitle && !matchesContent && !matchesTags) {
        return false
      }
    }

    // Framework filter
    if (filters.framework !== 'all') {
      if (filters.framework === 'standalone') {
        if (entry.frameworkId !== null) {
          return false
        }
      } else {
        if (entry.frameworkId !== filters.framework) {
          return false
        }
      }
    }

    // Date range filter
    if (filters.dateRange !== 'all') {
      const entryDate = new Date(entry.createdAt)
      const now = new Date('2024-03-16T12:00:00Z') // Fixed reference date for testing

      switch (filters.dateRange) {
        case 'today': {
          const startOfToday = new Date(now)
          startOfToday.setHours(0, 0, 0, 0)
          if (entryDate < startOfToday) {
            return false
          }
          break
        }
        case 'week': {
          const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
          if (entryDate < oneWeekAgo) {
            return false
          }
          break
        }
        case 'month': {
          const oneMonthAgo = new Date(now)
          oneMonthAgo.setMonth(now.getMonth() - 1)
          if (entryDate < oneMonthAgo) {
            return false
          }
          break
        }
        case 'quarter': {
          const threeMonthsAgo = new Date(now)
          threeMonthsAgo.setMonth(now.getMonth() - 3)
          if (entryDate < threeMonthsAgo) {
            return false
          }
          break
        }
        case 'year': {
          const oneYearAgo = new Date(now)
          oneYearAgo.setFullYear(now.getFullYear() - 1)
          if (entryDate < oneYearAgo) {
            return false
          }
          break
        }
      }
    }

    return true
  })
}

/**
 * Count entries by framework
 */
function countByFramework(entries: JournalEntry[]): Record<string, number> {
  const counts: Record<string, number> = {
    all: entries.length,
    standalone: 0,
  }

  for (const entry of entries) {
    if (entry.frameworkId === null) {
      counts.standalone++
    } else {
      counts[entry.frameworkId] = (counts[entry.frameworkId] || 0) + 1
    }
  }

  return counts
}

/**
 * Calculate active filter count
 */
function getActiveFilterCount(filters: JournalFilterState): number {
  let count = 0
  if (filters.search) count++
  if (filters.framework !== 'all') count++
  if (filters.dateRange !== 'all') count++
  if (filters.author !== 'all') count++
  if (filters.emotion !== 'all') count++
  if (filters.tag !== 'all') count++
  return count
}

// ============================================================================
// URL PERSISTENCE UTILITIES
// ============================================================================

/**
 * Convert filters to URL search params
 */
function filtersToSearchParams(filters: JournalFilterState): URLSearchParams {
  const params = new URLSearchParams()

  if (filters.search) {
    params.set('q', filters.search)
  }
  if (filters.framework !== 'all') {
    params.set('framework', filters.framework)
  }
  if (filters.dateRange !== 'all') {
    params.set('date', filters.dateRange)
  }
  if (filters.author !== 'all') {
    params.set('author', filters.author)
  }
  if (filters.emotion !== 'all') {
    params.set('emotion', filters.emotion)
  }
  if (filters.tag !== 'all') {
    params.set('tag', filters.tag)
  }

  return params
}

/**
 * Parse URL search params to filters
 */
function searchParamsToFilters(params: URLSearchParams): JournalFilterState {
  return {
    search: params.get('q') || '',
    framework: params.get('framework') || 'all',
    dateRange: params.get('date') || 'all',
    author: params.get('author') || 'all',
    emotion: params.get('emotion') || 'all',
    tag: params.get('tag') || 'all',
  }
}

// ============================================================================
// FILTER BY FRAMEWORK TESTS
// ============================================================================

describe('Filter by Framework', () => {
  const entries = createMockJournalEntries()
  const defaultFilters: JournalFilterState = {
    search: '',
    framework: 'all',
    dateRange: 'all',
    author: 'all',
    emotion: 'all',
    tag: 'all',
  }

  it('should return all entries with no filter', () => {
    const result = applyFilters(entries, defaultFilters)
    expect(result).toHaveLength(8)
  })

  it('should filter by Charter & Course framework', () => {
    const filters = { ...defaultFilters, framework: 'charter-and-course' }
    const result = applyFilters(entries, filters)

    expect(result).toHaveLength(4) // 3 published + 1 draft
    expect(result.every(e => e.frameworkId === 'charter-and-course')).toBe(true)
  })

  it('should filter by Stoic Journal framework', () => {
    const filters = { ...defaultFilters, framework: 'stoic-journal' }
    const result = applyFilters(entries, filters)

    expect(result).toHaveLength(2)
    expect(result.every(e => e.frameworkId === 'stoic-journal')).toBe(true)
  })

  it('should filter standalone entries', () => {
    const filters = { ...defaultFilters, framework: 'standalone' }
    const result = applyFilters(entries, filters)

    expect(result).toHaveLength(2)
    expect(result.every(e => e.frameworkId === null)).toBe(true)
  })

  it('should count entries by framework', () => {
    const counts = countByFramework(entries)

    expect(counts.all).toBe(8)
    expect(counts['charter-and-course']).toBe(4)
    expect(counts['stoic-journal']).toBe(2)
    expect(counts.standalone).toBe(2)
  })
})

// ============================================================================
// SEARCH FILTER TESTS
// ============================================================================

describe('Search Filter', () => {
  const entries = createMockJournalEntries()
  const defaultFilters: JournalFilterState = {
    search: '',
    framework: 'all',
    dateRange: 'all',
    author: 'all',
    emotion: 'all',
    tag: 'all',
  }

  it('should search by title', () => {
    const filters = { ...defaultFilters, search: 'Charter' }
    const result = applyFilters(entries, filters)

    expect(result.length).toBeGreaterThan(0)
    expect(result.some(e => e.title.includes('Charter'))).toBe(true)
  })

  it('should search by content', () => {
    const filters = { ...defaultFilters, search: 'Health' }
    const result = applyFilters(entries, filters)

    expect(result.length).toBeGreaterThan(0)
    expect(result.some(e => e.content.includes('Health'))).toBe(true)
  })

  it('should search by tags', () => {
    const filters = { ...defaultFilters, search: 'gratitude' }
    const result = applyFilters(entries, filters)

    expect(result).toHaveLength(1)
    expect(result[0].tags).toContain('gratitude')
  })

  it('should be case insensitive', () => {
    const filters1 = { ...defaultFilters, search: 'CHARTER' }
    const filters2 = { ...defaultFilters, search: 'charter' }

    const result1 = applyFilters(entries, filters1)
    const result2 = applyFilters(entries, filters2)

    expect(result1).toHaveLength(result2.length)
  })

  it('should return empty for no matches', () => {
    const filters = { ...defaultFilters, search: 'xyznonexistent' }
    const result = applyFilters(entries, filters)

    expect(result).toHaveLength(0)
  })
})

// ============================================================================
// DATE RANGE FILTER TESTS
// ============================================================================

describe('Date Range Filter', () => {
  const entries = createMockJournalEntries()
  const defaultFilters: JournalFilterState = {
    search: '',
    framework: 'all',
    dateRange: 'all',
    author: 'all',
    emotion: 'all',
    tag: 'all',
  }

  // Using reference date: 2024-03-16T12:00:00Z

  it('should filter entries from last week', () => {
    const filters = { ...defaultFilters, dateRange: 'week' }
    const result = applyFilters(entries, filters)

    // Entries from March 9-16 should be included
    expect(result.length).toBeGreaterThan(0)
    result.forEach(entry => {
      const entryDate = new Date(entry.createdAt)
      const weekAgo = new Date('2024-03-09T12:00:00Z')
      expect(entryDate >= weekAgo).toBe(true)
    })
  })

  it('should filter entries from last month', () => {
    const filters = { ...defaultFilters, dateRange: 'month' }
    const result = applyFilters(entries, filters)

    // All entries are from March 2024, should be included
    expect(result).toHaveLength(8)
  })

  it('should return no entries for today filter with old data', () => {
    const filters = { ...defaultFilters, dateRange: 'today' }
    const result = applyFilters(entries, filters)

    // No entries from March 16, 2024
    expect(result).toHaveLength(0)
  })
})

// ============================================================================
// COMBINED FILTERS TESTS
// ============================================================================

describe('Combined Filters', () => {
  const entries = createMockJournalEntries()
  const defaultFilters: JournalFilterState = {
    search: '',
    framework: 'all',
    dateRange: 'all',
    author: 'all',
    emotion: 'all',
    tag: 'all',
  }

  it('should combine search and framework filters', () => {
    const filters = {
      ...defaultFilters,
      search: 'Week',
      framework: 'charter-and-course',
    }
    const result = applyFilters(entries, filters)

    expect(result).toHaveLength(1)
    expect(result[0].title).toBe('Week 11 Scoreboard')
  })

  it('should combine framework and date range filters', () => {
    const filters = {
      ...defaultFilters,
      framework: 'charter-and-course',
      dateRange: 'week',
    }
    const result = applyFilters(entries, filters)

    // Only Charter & Course entries from last week
    expect(result.every(e => e.frameworkId === 'charter-and-course')).toBe(true)
    result.forEach(entry => {
      const entryDate = new Date(entry.createdAt)
      const weekAgo = new Date('2024-03-09T12:00:00Z')
      expect(entryDate >= weekAgo).toBe(true)
    })
  })

  it('should combine all three filters', () => {
    const filters = {
      ...defaultFilters,
      search: 'Scoreboard',
      framework: 'charter-and-course',
      dateRange: 'week',
    }
    const result = applyFilters(entries, filters)

    expect(result).toHaveLength(1)
    expect(result[0].journalId).toBe('journal-3')
  })

  it('should return empty when combined filters have no matches', () => {
    const filters = {
      ...defaultFilters,
      search: 'stoic',
      framework: 'charter-and-course', // Stoic content won't be in Charter framework
    }
    const result = applyFilters(entries, filters)

    expect(result).toHaveLength(0)
  })
})

// ============================================================================
// ACTIVE FILTER COUNT TESTS
// ============================================================================

describe('Active Filter Count', () => {
  it('should count zero with default filters', () => {
    const filters: JournalFilterState = {
      search: '',
      framework: 'all',
      dateRange: 'all',
      author: 'all',
      emotion: 'all',
      tag: 'all',
    }

    expect(getActiveFilterCount(filters)).toBe(0)
  })

  it('should count one active filter', () => {
    const filters: JournalFilterState = {
      search: '',
      framework: 'charter-and-course',
      dateRange: 'all',
      author: 'all',
      emotion: 'all',
      tag: 'all',
    }

    expect(getActiveFilterCount(filters)).toBe(1)
  })

  it('should count multiple active filters', () => {
    const filters: JournalFilterState = {
      search: 'test',
      framework: 'charter-and-course',
      dateRange: 'week',
      author: 'all',
      emotion: 'all',
      tag: 'all',
    }

    expect(getActiveFilterCount(filters)).toBe(3)
  })

  it('should count all active filters', () => {
    const filters: JournalFilterState = {
      search: 'test',
      framework: 'charter-and-course',
      dateRange: 'week',
      author: 'user-1',
      emotion: 'happy',
      tag: 'planning',
    }

    expect(getActiveFilterCount(filters)).toBe(6)
  })
})

// ============================================================================
// URL PERSISTENCE TESTS
// ============================================================================

describe('URL Persistence', () => {
  it('should convert filters to URL params', () => {
    const filters: JournalFilterState = {
      search: 'test query',
      framework: 'charter-and-course',
      dateRange: 'week',
      author: 'all',
      emotion: 'all',
      tag: 'all',
    }

    const params = filtersToSearchParams(filters)

    expect(params.get('q')).toBe('test query')
    expect(params.get('framework')).toBe('charter-and-course')
    expect(params.get('date')).toBe('week')
    expect(params.has('author')).toBe(false) // 'all' should not be included
  })

  it('should parse URL params to filters', () => {
    const params = new URLSearchParams('?q=search+term&framework=stoic-journal&date=month')
    const filters = searchParamsToFilters(params)

    expect(filters.search).toBe('search term')
    expect(filters.framework).toBe('stoic-journal')
    expect(filters.dateRange).toBe('month')
    expect(filters.author).toBe('all')
  })

  it('should handle empty URL params', () => {
    const params = new URLSearchParams('')
    const filters = searchParamsToFilters(params)

    expect(filters.search).toBe('')
    expect(filters.framework).toBe('all')
    expect(filters.dateRange).toBe('all')
  })

  it('should round-trip filters through URL params', () => {
    const originalFilters: JournalFilterState = {
      search: 'my search',
      framework: 'charter-and-course',
      dateRange: 'quarter',
      author: 'all',
      emotion: 'all',
      tag: 'all',
    }

    const params = filtersToSearchParams(originalFilters)
    const parsedFilters = searchParamsToFilters(params)

    expect(parsedFilters.search).toBe(originalFilters.search)
    expect(parsedFilters.framework).toBe(originalFilters.framework)
    expect(parsedFilters.dateRange).toBe(originalFilters.dateRange)
  })

  it('should handle special characters in search', () => {
    const filters: JournalFilterState = {
      search: 'test & "quotes" + special',
      framework: 'all',
      dateRange: 'all',
      author: 'all',
      emotion: 'all',
      tag: 'all',
    }

    const params = filtersToSearchParams(filters)
    const parsed = searchParamsToFilters(params)

    expect(parsed.search).toBe(filters.search)
  })
})

// ============================================================================
// FILTER CLEAR TESTS
// ============================================================================

describe('Filter Clear Functionality', () => {
  it('should clear all filters', () => {
    const activeFilters: JournalFilterState = {
      search: 'test',
      framework: 'charter-and-course',
      dateRange: 'week',
      author: 'user-1',
      emotion: 'happy',
      tag: 'planning',
    }

    const clearedFilters: JournalFilterState = {
      search: '',
      framework: 'all',
      dateRange: 'all',
      author: 'all',
      emotion: 'all',
      tag: 'all',
    }

    expect(getActiveFilterCount(activeFilters)).toBe(6)
    expect(getActiveFilterCount(clearedFilters)).toBe(0)
  })

  it('should clear individual filters', () => {
    const filters: JournalFilterState = {
      search: 'test',
      framework: 'charter-and-course',
      dateRange: 'week',
      author: 'all',
      emotion: 'all',
      tag: 'all',
    }

    // Clear search
    const clearedSearch = { ...filters, search: '' }
    expect(getActiveFilterCount(clearedSearch)).toBe(2)

    // Clear framework
    const clearedFramework = { ...filters, framework: 'all' }
    expect(getActiveFilterCount(clearedFramework)).toBe(2)

    // Clear date range
    const clearedDate = { ...filters, dateRange: 'all' }
    expect(getActiveFilterCount(clearedDate)).toBe(2)
  })
})

// ============================================================================
// SORTING TESTS
// ============================================================================

describe('Entry Sorting', () => {
  const entries = createMockJournalEntries()

  it('should sort by date descending (newest first)', () => {
    const sorted = [...entries].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )

    expect(sorted[0].createdAt).toBe('2024-03-15T10:00:00Z') // Week 11 Scoreboard
    expect(sorted[sorted.length - 1].createdAt).toBe('2024-03-01T10:00:00Z') // Personal Charter
  })

  it('should sort by date ascending (oldest first)', () => {
    const sorted = [...entries].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    )

    expect(sorted[0].createdAt).toBe('2024-03-01T10:00:00Z') // Personal Charter
  })

  it('should sort by title alphabetically', () => {
    const sorted = [...entries].sort((a, b) => a.title.localeCompare(b.title))

    expect(sorted[0].title).toBe('Dream Journal Entry')
    expect(sorted[sorted.length - 1].title).toBe('Week 11 Scoreboard')
  })

  it('should prioritize pinned entries', () => {
    const sorted = [...entries].sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1
      if (!a.isPinned && b.isPinned) return 1
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    })

    expect(sorted[0].isPinned).toBe(true)
    expect(sorted[0].title).toBe('My Personal Charter')
  })
})

// ============================================================================
// FRAMEWORK BADGE DISPLAY TESTS
// ============================================================================

describe('Framework Badge Display', () => {
  const mockFrameworks = [
    { id: 'charter-and-course', name: 'Charter & Course', icon: '🧭' },
    { id: 'stoic-journal', name: 'Stoic Journal', icon: '📜' },
  ]

  it('should get framework info for entry with framework', () => {
    const entry = createMockJournalEntries()[0] // Charter entry
    const framework = mockFrameworks.find(f => f.id === entry.frameworkId)

    expect(framework).toBeDefined()
    expect(framework?.name).toBe('Charter & Course')
    expect(framework?.icon).toBe('🧭')
  })

  it('should return null for standalone entry', () => {
    const entry = createMockJournalEntries()[5] // Standalone entry
    const framework = mockFrameworks.find(f => f.id === entry.frameworkId)

    expect(framework).toBeUndefined()
  })

  it('should display correct badge based on framework', () => {
    const entries = createMockJournalEntries()

    const getBadgeInfo = (entry: JournalEntry) => {
      if (!entry.frameworkId) {
        return { label: 'Standalone', icon: '📝' }
      }
      const framework = mockFrameworks.find(f => f.id === entry.frameworkId)
      return framework
        ? { label: framework.name, icon: framework.icon }
        : { label: entry.frameworkId, icon: '📄' }
    }

    expect(getBadgeInfo(entries[0])).toEqual({ label: 'Charter & Course', icon: '🧭' })
    expect(getBadgeInfo(entries[3])).toEqual({ label: 'Stoic Journal', icon: '📜' })
    expect(getBadgeInfo(entries[5])).toEqual({ label: 'Standalone', icon: '📝' })
  })
})
