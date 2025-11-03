import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useSectionCollapse } from './useSectionCollapse'

describe('useSectionCollapse', () => {
  beforeEach(() => {
    // Clear sessionStorage before each test
    sessionStorage.clear()
    vi.clearAllMocks()
    vi.spyOn(console, 'warn').mockImplementation(() => {})

    // Mock window.scrollTo and requestAnimationFrame
    global.window.scrollTo = vi.fn()
    global.requestAnimationFrame = vi.fn((cb) => {
      cb(0)
      return 0
    })
  })

  afterEach(() => {
    sessionStorage.clear()
    vi.restoreAllMocks()
  })

  describe('Initialization', () => {
    it('should initialize with empty collapsed sections', () => {
      const { result } = renderHook(() => useSectionCollapse())

      expect(result.current.collapsedSections).toEqual([])
    })

    it('should initialize without storage key', () => {
      const { result } = renderHook(() => useSectionCollapse())

      expect(result.current.collapsedSections).toEqual([])
      expect(sessionStorage.getItem('test-key')).toBeNull()
    })

    it('should load from sessionStorage when key is provided', () => {
      sessionStorage.setItem('test-sections', JSON.stringify(['section-1', 'section-2']))

      const { result } = renderHook(() => useSectionCollapse('test-sections'))

      expect(result.current.collapsedSections).toEqual(['section-1', 'section-2'])
    })

    it('should handle empty sessionStorage', () => {
      const { result } = renderHook(() => useSectionCollapse('test-sections'))

      expect(result.current.collapsedSections).toEqual([])
    })

    it('should handle invalid JSON in sessionStorage', () => {
      sessionStorage.setItem('test-sections', 'invalid-json{')

      const { result } = renderHook(() => useSectionCollapse('test-sections'))

      expect(result.current.collapsedSections).toEqual([])
      expect(console.warn).toHaveBeenCalled()
    })

    it('should handle non-array data in sessionStorage', () => {
      sessionStorage.setItem('test-sections', JSON.stringify({ not: 'array' }))

      const { result } = renderHook(() => useSectionCollapse('test-sections'))

      // Will attempt to create Set from object, resulting in empty set
      expect(result.current.collapsedSections).toEqual([])
    })
  })

  describe('isCollapsed', () => {
    it('should return false for section that is not collapsed', () => {
      const { result } = renderHook(() => useSectionCollapse())

      expect(result.current.isCollapsed('section-1')).toBe(false)
    })

    it('should return true for section that is collapsed', () => {
      const { result } = renderHook(() => useSectionCollapse())

      act(() => {
        result.current.collapseSection('section-1')
      })

      expect(result.current.isCollapsed('section-1')).toBe(true)
    })

    it('should update when section collapse state changes', () => {
      const { result } = renderHook(() => useSectionCollapse())

      expect(result.current.isCollapsed('section-1')).toBe(false)

      act(() => {
        result.current.collapseSection('section-1')
      })

      expect(result.current.isCollapsed('section-1')).toBe(true)

      act(() => {
        result.current.expandSection('section-1')
      })

      expect(result.current.isCollapsed('section-1')).toBe(false)
    })
  })

  describe('toggleCollapse', () => {
    it('should collapse an expanded section', () => {
      const { result } = renderHook(() => useSectionCollapse())

      act(() => {
        result.current.toggleCollapse('section-1')
      })

      expect(result.current.isCollapsed('section-1')).toBe(true)
    })

    it('should expand a collapsed section', () => {
      const { result } = renderHook(() => useSectionCollapse())

      act(() => {
        result.current.collapseSection('section-1')
      })

      expect(result.current.isCollapsed('section-1')).toBe(true)

      act(() => {
        result.current.toggleCollapse('section-1')
      })

      expect(result.current.isCollapsed('section-1')).toBe(false)
    })

    it('should toggle multiple times', () => {
      const { result } = renderHook(() => useSectionCollapse())

      act(() => {
        result.current.toggleCollapse('section-1')
      })
      expect(result.current.isCollapsed('section-1')).toBe(true)

      act(() => {
        result.current.toggleCollapse('section-1')
      })
      expect(result.current.isCollapsed('section-1')).toBe(false)

      act(() => {
        result.current.toggleCollapse('section-1')
      })
      expect(result.current.isCollapsed('section-1')).toBe(true)
    })

    it('should preserve scroll position when toggling', () => {
      Object.defineProperty(window, 'scrollY', { value: 500, writable: true })

      const { result } = renderHook(() => useSectionCollapse())

      act(() => {
        result.current.toggleCollapse('section-1')
      })

      expect(requestAnimationFrame).toHaveBeenCalled()
      expect(window.scrollTo).toHaveBeenCalledWith(0, 500)
    })
  })

  describe('collapseSection', () => {
    it('should collapse a section', () => {
      const { result } = renderHook(() => useSectionCollapse())

      act(() => {
        result.current.collapseSection('section-1')
      })

      expect(result.current.isCollapsed('section-1')).toBe(true)
    })

    it('should handle collapsing already collapsed section', () => {
      const { result } = renderHook(() => useSectionCollapse())

      act(() => {
        result.current.collapseSection('section-1')
      })

      expect(result.current.isCollapsed('section-1')).toBe(true)

      act(() => {
        result.current.collapseSection('section-1')
      })

      // Should still be collapsed
      expect(result.current.isCollapsed('section-1')).toBe(true)
    })

    it('should collapse multiple sections independently', () => {
      const { result } = renderHook(() => useSectionCollapse())

      act(() => {
        result.current.collapseSection('section-1')
        result.current.collapseSection('section-2')
      })

      expect(result.current.isCollapsed('section-1')).toBe(true)
      expect(result.current.isCollapsed('section-2')).toBe(true)
      expect(result.current.isCollapsed('section-3')).toBe(false)
    })
  })

  describe('expandSection', () => {
    it('should expand a collapsed section', () => {
      const { result } = renderHook(() => useSectionCollapse())

      act(() => {
        result.current.collapseSection('section-1')
      })

      expect(result.current.isCollapsed('section-1')).toBe(true)

      act(() => {
        result.current.expandSection('section-1')
      })

      expect(result.current.isCollapsed('section-1')).toBe(false)
    })

    it('should handle expanding already expanded section', () => {
      const { result } = renderHook(() => useSectionCollapse())

      act(() => {
        result.current.expandSection('section-1')
      })

      expect(result.current.isCollapsed('section-1')).toBe(false)
    })

    it('should preserve scroll position when expanding', () => {
      Object.defineProperty(window, 'scrollY', { value: 750, writable: true })

      const { result } = renderHook(() => useSectionCollapse())

      act(() => {
        result.current.collapseSection('section-1')
      })

      act(() => {
        result.current.expandSection('section-1')
      })

      expect(requestAnimationFrame).toHaveBeenCalled()
      expect(window.scrollTo).toHaveBeenCalledWith(0, 750)
    })
  })

  describe('collapseAll', () => {
    it('should collapse all provided sections', () => {
      const { result } = renderHook(() => useSectionCollapse())

      const sectionIds = ['section-1', 'section-2', 'section-3']

      act(() => {
        result.current.collapseAll(sectionIds)
      })

      expect(result.current.isCollapsed('section-1')).toBe(true)
      expect(result.current.isCollapsed('section-2')).toBe(true)
      expect(result.current.isCollapsed('section-3')).toBe(true)
    })

    it('should handle empty array', () => {
      const { result } = renderHook(() => useSectionCollapse())

      act(() => {
        result.current.collapseSection('section-1')
      })

      expect(result.current.isCollapsed('section-1')).toBe(true)

      act(() => {
        result.current.collapseAll([])
      })

      // All sections should be expanded now (empty set)
      expect(result.current.isCollapsed('section-1')).toBe(false)
    })

    it('should replace existing collapsed sections', () => {
      const { result } = renderHook(() => useSectionCollapse())

      act(() => {
        result.current.collapseSection('section-1')
        result.current.collapseSection('section-2')
      })

      expect(result.current.collapsedSections).toEqual(expect.arrayContaining(['section-1', 'section-2']))

      act(() => {
        result.current.collapseAll(['section-3', 'section-4'])
      })

      expect(result.current.collapsedSections).toEqual(expect.arrayContaining(['section-3', 'section-4']))
      expect(result.current.isCollapsed('section-1')).toBe(false)
      expect(result.current.isCollapsed('section-2')).toBe(false)
    })
  })

  describe('expandAll', () => {
    it('should expand all sections', () => {
      const { result } = renderHook(() => useSectionCollapse())

      act(() => {
        result.current.collapseSection('section-1')
        result.current.collapseSection('section-2')
        result.current.collapseSection('section-3')
      })

      expect(result.current.collapsedSections).toHaveLength(3)

      act(() => {
        result.current.expandAll()
      })

      expect(result.current.collapsedSections).toEqual([])
      expect(result.current.isCollapsed('section-1')).toBe(false)
      expect(result.current.isCollapsed('section-2')).toBe(false)
      expect(result.current.isCollapsed('section-3')).toBe(false)
    })

    it('should work when no sections are collapsed', () => {
      const { result } = renderHook(() => useSectionCollapse())

      act(() => {
        result.current.expandAll()
      })

      expect(result.current.collapsedSections).toEqual([])
    })
  })

  describe('getWordCount', () => {
    it('should calculate word count correctly', () => {
      const { result } = renderHook(() => useSectionCollapse())

      const wordCount = result.current.getWordCount('This is a test sentence with seven words')

      expect(wordCount).toBe(8)
    })

    it('should handle empty string', () => {
      const { result } = renderHook(() => useSectionCollapse())

      expect(result.current.getWordCount('')).toBe(0)
    })

    it('should handle markdown formatting', () => {
      const { result } = renderHook(() => useSectionCollapse())

      const markdown = '# Heading\n\nThis is **bold** and this is *italic* text.'
      const wordCount = result.current.getWordCount(markdown)

      // "Heading This is bold and this is italic text" = 9 words
      expect(wordCount).toBe(9)
    })

    it('should handle links correctly', () => {
      const { result } = renderHook(() => useSectionCollapse())

      const markdown = 'Check out [this link](https://example.com) for more info.'
      const wordCount = result.current.getWordCount(markdown)

      // "Check out this link for more info" = 7 words
      expect(wordCount).toBe(7)
    })

    it('should remove images', () => {
      const { result } = renderHook(() => useSectionCollapse())

      const markdown = 'Here is an image ![alt text](image.jpg) and some text.'
      const wordCount = result.current.getWordCount(markdown)

      // "Here is an image alt text and some text" = 9 words
      // The regex removes the image syntax but keeps "alt text"
      expect(wordCount).toBe(9)
    })

    it('should handle multiple spaces', () => {
      const { result } = renderHook(() => useSectionCollapse())

      const text = 'This   has    multiple     spaces'
      const wordCount = result.current.getWordCount(text)

      expect(wordCount).toBe(4)
    })

    it('should handle null input', () => {
      const { result } = renderHook(() => useSectionCollapse())

      expect(result.current.getWordCount(null as any)).toBe(0)
    })

    it('should handle undefined input', () => {
      const { result } = renderHook(() => useSectionCollapse())

      expect(result.current.getWordCount(undefined as any)).toBe(0)
    })

    it('should handle non-string input', () => {
      const { result } = renderHook(() => useSectionCollapse())

      expect(result.current.getWordCount(123 as any)).toBe(0)
    })

    it('should handle newlines and tabs', () => {
      const { result } = renderHook(() => useSectionCollapse())

      const text = 'Line one\nLine two\tLine three'
      const wordCount = result.current.getWordCount(text)

      expect(wordCount).toBe(6)
    })
  })

  describe('getCollapsedInfo', () => {
    it('should return null for expanded section', () => {
      const { result } = renderHook(() => useSectionCollapse())

      const info = result.current.getCollapsedInfo('section-1', 'Some content here')

      expect(info).toBeNull()
    })

    it('should return info for collapsed section', () => {
      const { result } = renderHook(() => useSectionCollapse())

      act(() => {
        result.current.collapseSection('section-1')
      })

      const info = result.current.getCollapsedInfo('section-1', 'This has four words')

      expect(info).toEqual({
        wordCount: 4,
        isCollapsed: true
      })
    })

    it('should calculate word count for collapsed section', () => {
      const { result } = renderHook(() => useSectionCollapse())

      act(() => {
        result.current.collapseSection('section-1')
      })

      const info = result.current.getCollapsedInfo('section-1', 'A longer piece of content with several words included here')

      expect(info).not.toBeNull()
      expect(info?.wordCount).toBe(10)
      expect(info?.isCollapsed).toBe(true)
    })
  })

  describe('SessionStorage Persistence', () => {
    it('should save to sessionStorage when key is provided', async () => {
      const { result } = renderHook(() => useSectionCollapse('test-sections'))

      act(() => {
        result.current.collapseSection('section-1')
      })

      await waitFor(() => {
        const stored = sessionStorage.getItem('test-sections')
        expect(stored).toBe(JSON.stringify(['section-1']))
      })
    })

    it('should not save to sessionStorage when key is not provided', () => {
      const { result } = renderHook(() => useSectionCollapse())

      act(() => {
        result.current.collapseSection('section-1')
      })

      expect(sessionStorage.length).toBe(0)
    })

    it('should update sessionStorage when sections change', async () => {
      const { result } = renderHook(() => useSectionCollapse('test-sections'))

      act(() => {
        result.current.collapseSection('section-1')
      })

      await waitFor(() => {
        expect(sessionStorage.getItem('test-sections')).toBe(JSON.stringify(['section-1']))
      })

      act(() => {
        result.current.collapseSection('section-2')
      })

      await waitFor(() => {
        const stored = JSON.parse(sessionStorage.getItem('test-sections') || '[]')
        expect(stored).toEqual(expect.arrayContaining(['section-1', 'section-2']))
      })
    })

    it('should restore state from sessionStorage on mount', () => {
      sessionStorage.setItem('test-sections', JSON.stringify(['section-1', 'section-2', 'section-3']))

      const { result } = renderHook(() => useSectionCollapse('test-sections'))

      expect(result.current.isCollapsed('section-1')).toBe(true)
      expect(result.current.isCollapsed('section-2')).toBe(true)
      expect(result.current.isCollapsed('section-3')).toBe(true)
      expect(result.current.isCollapsed('section-4')).toBe(false)
    })

    it('should handle sessionStorage errors gracefully on save', async () => {
      const mockSetItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('QuotaExceededError')
      })

      const { result } = renderHook(() => useSectionCollapse('test-sections'))

      act(() => {
        result.current.collapseSection('section-1')
      })

      await waitFor(() => {
        expect(console.warn).toHaveBeenCalled()
      })

      mockSetItem.mockRestore()
    })

    it('should handle sessionStorage errors gracefully on load', () => {
      const mockGetItem = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
        throw new Error('SecurityError')
      })

      const { result } = renderHook(() => useSectionCollapse('test-sections'))

      expect(result.current.collapsedSections).toEqual([])
      expect(console.warn).toHaveBeenCalled()

      mockGetItem.mockRestore()
    })

    it('should clear sessionStorage when all sections are expanded', async () => {
      const { result } = renderHook(() => useSectionCollapse('test-sections'))

      act(() => {
        result.current.collapseSection('section-1')
        result.current.collapseSection('section-2')
      })

      await waitFor(() => {
        expect(sessionStorage.getItem('test-sections')).not.toBeNull()
      })

      act(() => {
        result.current.expandAll()
      })

      await waitFor(() => {
        expect(sessionStorage.getItem('test-sections')).toBe(JSON.stringify([]))
      })
    })
  })

  describe('Edge Cases', () => {
    it('should handle section IDs with special characters', () => {
      const { result } = renderHook(() => useSectionCollapse())

      const sectionId = 'section-with-dashes_and_underscores.123'

      act(() => {
        result.current.collapseSection(sectionId)
      })

      expect(result.current.isCollapsed(sectionId)).toBe(true)
    })

    it('should handle very long section IDs', () => {
      const { result } = renderHook(() => useSectionCollapse())

      const longId = 'a'.repeat(1000)

      act(() => {
        result.current.collapseSection(longId)
      })

      expect(result.current.isCollapsed(longId)).toBe(true)
    })

    it('should handle many collapsed sections', () => {
      const { result } = renderHook(() => useSectionCollapse())

      const sectionIds = Array.from({ length: 100 }, (_, i) => `section-${i}`)

      act(() => {
        result.current.collapseAll(sectionIds)
      })

      expect(result.current.collapsedSections).toHaveLength(100)
      sectionIds.forEach(id => {
        expect(result.current.isCollapsed(id)).toBe(true)
      })
    })

    it('should handle content with only whitespace', () => {
      const { result } = renderHook(() => useSectionCollapse())

      expect(result.current.getWordCount('   \n\t   ')).toBe(0)
    })

    it('should handle content with emojis', () => {
      const { result } = renderHook(() => useSectionCollapse())

      const content = 'Hello 👋 world 🌍 test 🧪'
      const wordCount = result.current.getWordCount(content)

      expect(wordCount).toBe(6)
    })

    it('should handle rapid state changes', () => {
      const { result } = renderHook(() => useSectionCollapse())

      act(() => {
        for (let i = 0; i < 10; i++) {
          result.current.toggleCollapse('section-1')
        }
      })

      // After even number of toggles, should be back to expanded
      expect(result.current.isCollapsed('section-1')).toBe(false)
    })
  })

  describe('Function Stability', () => {
    it('should return stable function references', () => {
      const { result, rerender } = renderHook(() => useSectionCollapse())

      const {
        toggleCollapse: toggle1,
        collapseSection: collapse1,
        expandSection: expand1,
        collapseAll: collapseAll1,
        expandAll: expandAll1,
        getWordCount: getWordCount1,
        getCollapsedInfo: getCollapsedInfo1
      } = result.current

      rerender()

      expect(result.current.toggleCollapse).toBe(toggle1)
      expect(result.current.collapseSection).toBe(collapse1)
      expect(result.current.expandSection).toBe(expand1)
      expect(result.current.collapseAll).toBe(collapseAll1)
      expect(result.current.expandAll).toBe(expandAll1)
      expect(result.current.getWordCount).toBe(getWordCount1)
      expect(result.current.getCollapsedInfo).toBe(getCollapsedInfo1)
    })
  })
})
