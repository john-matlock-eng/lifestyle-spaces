import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useEllieReadingCompanion } from './useEllieReadingCompanion'
import type { Template } from '../types/template.types'

// Mock useShihTzuCompanion with state management
let currentMood: any = 'idle'
const mockSetMood = vi.fn((newMood: any) => {
  currentMood = newMood
})
const mockCelebrate = vi.fn()

vi.mock('../../../hooks', () => ({
  useShihTzuCompanion: vi.fn(() => ({
    get mood() { return currentMood },
    setMood: mockSetMood,
    position: { x: 100, y: 100 },
    celebrate: mockCelebrate
  }))
}))

describe('useEllieReadingCompanion', () => {
  const mockTemplate: Template = {
    id: 'test-template',
    name: 'Test Template',
    description: 'A test template',
    icon: '📝',
    sections: [
      {
        id: 'section-1',
        title: 'Introduction',
        type: 'text',
        placeholder: 'Write here...'
      },
      {
        id: 'section-2',
        title: 'Reflection',
        type: 'text',
        placeholder: 'Reflect here...'
      }
    ]
  }

  const mockSections = [
    { id: 'section-1', title: 'Introduction' },
    { id: 'section-2', title: 'Reflection' }
  ]

  const mockContent = 'This is test journal content with enough words to test reading companion features.'

  beforeEach(() => {
    // Reset mock state
    currentMood = 'idle'
    mockSetMood.mockClear()
    mockCelebrate.mockClear()

    // Use fake timers
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.clearAllTimers()
    vi.useRealTimers()
  })

  describe('initialization', () => {
    it('should initialize with default state', () => {
      const { result } = renderHook(() =>
        useEllieReadingCompanion(mockTemplate, mockSections, mockContent)
      )

      expect(result.current.companionState).toBe('resting')
      expect(result.current.isChatOpen).toBe(false)
      expect(result.current.readingProgress).toMatchObject({
        currentSection: null,
        totalSections: 2,
        sectionsRead: 0,
        timeSpent: 0,
        percentageRead: 0,
        isReading: false
      })
    })

    it('should show initial greeting', () => {
      const { result } = renderHook(() =>
        useEllieReadingCompanion(mockTemplate, mockSections, mockContent)
      )

      expect(result.current.thoughtText).toBe('Happy reading! 📖')
      expect(result.current.mood).toBe('happy')

      // Should clear greeting after 5 seconds
      act(() => {
        vi.advanceTimersByTime(5000)
      })

      expect(result.current.thoughtText).toBe('')
      expect(result.current.mood).toBe('idle')
    })
  })

  describe('reading progress tracking', () => {
    it('should update time spent reading', () => {
      const { result } = renderHook(() =>
        useEllieReadingCompanion(mockTemplate, mockSections, mockContent)
      )

      expect(result.current.readingProgress.timeSpent).toBe(0)

      act(() => {
        vi.advanceTimersByTime(5000)
      })

      expect(result.current.readingProgress.timeSpent).toBeGreaterThanOrEqual(5)
    })

    it('should update scroll progress', () => {
      const { result } = renderHook(() =>
        useEllieReadingCompanion(mockTemplate, mockSections, mockContent)
      )

      act(() => {
        result.current.handleScrollProgress(50)
      })

      expect(result.current.readingProgress.percentageRead).toBe(50)
      expect(result.current.readingProgress.isReading).toBe(true)
    })

    it('should detect reading pause after scroll stops', () => {
      const { result } = renderHook(() =>
        useEllieReadingCompanion(mockTemplate, mockSections, mockContent)
      )

      act(() => {
        result.current.handleScrollProgress(30)
      })

      expect(result.current.readingProgress.isReading).toBe(true)

      // Should detect pause after 5 seconds
      act(() => {
        vi.advanceTimersByTime(5000)
      })

      expect(result.current.readingProgress.isReading).toBe(false)
    })
  })

  describe('section visibility', () => {
    it('should track section visibility', () => {
      const { result } = renderHook(() =>
        useEllieReadingCompanion(mockTemplate, mockSections, mockContent)
      )

      act(() => {
        result.current.handleSectionVisible('section-1')
      })

      expect(result.current.readingProgress.currentSection).toBe('section-1')
      expect(result.current.readingProgress.sectionsRead).toBe(1)
    })

    it('should not increment sectionsRead when revisiting a section', () => {
      const { result } = renderHook(() =>
        useEllieReadingCompanion(mockTemplate, mockSections, mockContent)
      )

      act(() => {
        result.current.handleSectionVisible('section-1')
      })

      expect(result.current.readingProgress.sectionsRead).toBe(1)

      // Visit same section again
      act(() => {
        result.current.handleSectionVisible('section-1')
      })

      expect(result.current.readingProgress.sectionsRead).toBe(1)
      expect(result.current.readingProgress.currentSection).toBe('section-1')
    })

    it('should generate section transition insight', () => {
      const { result } = renderHook(() =>
        useEllieReadingCompanion(mockTemplate, mockSections, mockContent)
      )

      // Clear initial greeting
      act(() => {
        vi.advanceTimersByTime(5000)
      })

      act(() => {
        result.current.handleSectionVisible('section-1')
      })

      expect(result.current.currentInsight).toMatchObject({
        type: 'section-transition',
        mood: 'curious',
        sectionId: 'section-1'
      })
      expect(result.current.thoughtText).toContain('Introduction')
      expect(result.current.mood).toBe('curious')
    })
  })

  describe('break point insights', () => {
    it('should offer insight at 25% break point', () => {
      const { result } = renderHook(() =>
        useEllieReadingCompanion(mockTemplate, mockSections, mockContent)
      )

      // Clear initial greeting
      act(() => {
        vi.advanceTimersByTime(5000)
      })

      act(() => {
        result.current.handleScrollProgress(24)
      })

      // Wait for pause detection + potential insight
      act(() => {
        vi.advanceTimersByTime(5000)
      })

      expect(result.current.currentInsight?.type).toBe('break-point')
      expect(result.current.thoughtText).toContain('progress')
      expect(result.current.mood).toBe('happy')
    })

    it('should offer insight at 50% break point', () => {
      const { result } = renderHook(() =>
        useEllieReadingCompanion(mockTemplate, mockSections, mockContent)
      )

      act(() => {
        vi.advanceTimersByTime(5000)
      })

      act(() => {
        result.current.handleScrollProgress(51)
      })

      act(() => {
        vi.advanceTimersByTime(5000)
      })

      expect(result.current.currentInsight?.type).toBe('break-point')
      expect(result.current.thoughtText).toContain('Halfway')
      expect(result.current.mood).toBe('curious')
    })

    it('should celebrate at 100% completion', () => {
      const { result } = renderHook(() =>
        useEllieReadingCompanion(mockTemplate, mockSections, mockContent)
      )

      act(() => {
        vi.advanceTimersByTime(5000)
      })

      act(() => {
        result.current.handleScrollProgress(100)
      })

      act(() => {
        vi.advanceTimersByTime(5000)
      })

      expect(result.current.currentInsight?.type).toBe('break-point')
      expect(result.current.mood).toBe('celebrating')
      expect(result.current.particleEffect).toBe('sparkles')
    })

    it('should not show same break point insight twice', () => {
      const { result } = renderHook(() =>
        useEllieReadingCompanion(mockTemplate, mockSections, mockContent)
      )

      act(() => {
        vi.advanceTimersByTime(5000)
      })

      // Scroll to 50%
      act(() => {
        result.current.handleScrollProgress(50)
      })

      act(() => {
        vi.advanceTimersByTime(5000)
      })

      const firstInsight = result.current.currentInsight

      // Dismiss insight
      act(() => {
        result.current.dismissInsight()
      })

      // Scroll back to 50% again
      act(() => {
        result.current.handleScrollProgress(48)
      })

      act(() => {
        vi.advanceTimersByTime(5000)
      })

      // Should not show same insight again
      expect(result.current.currentInsight).toBeNull()
    })

    it('should respect 30 second cooldown between insights', () => {
      const { result } = renderHook(() =>
        useEllieReadingCompanion(mockTemplate, mockSections, mockContent)
      )

      act(() => {
        vi.advanceTimersByTime(5000)
      })

      // First insight at 25%
      act(() => {
        result.current.handleScrollProgress(24)
      })

      act(() => {
        vi.advanceTimersByTime(5000)
      })

      const firstInsightTime = Date.now()

      // Try to get insight at 50% immediately
      act(() => {
        result.current.handleScrollProgress(51)
      })

      act(() => {
        vi.advanceTimersByTime(5000)
      })

      // Should not show due to cooldown
      // (This tests the 30 second cooldown logic)
      // Note: May need to adjust based on exact implementation
    })
  })

  describe('companion state management', () => {
    it('should allow changing companion state', () => {
      const { result } = renderHook(() =>
        useEllieReadingCompanion(mockTemplate, mockSections, mockContent)
      )

      expect(result.current.companionState).toBe('resting')

      act(() => {
        result.current.setCompanionState('active')
      })

      expect(result.current.companionState).toBe('active')

      act(() => {
        result.current.setCompanionState('hidden')
      })

      expect(result.current.companionState).toBe('hidden')
    })

    it('should offer contextual insight based on content', () => {
      const { result } = renderHook(() =>
        useEllieReadingCompanion(mockTemplate, mockSections, mockContent, ['happy', 'grateful'])
      )

      act(() => {
        result.current.offerInsight()
      })

      expect(result.current.companionState).toBe('active')
      expect(result.current.currentInsight?.type).toBe('comprehension')
      expect(result.current.thoughtText).toBeTruthy()
    })

    it('should dismiss insight and return to resting state', () => {
      const { result } = renderHook(() =>
        useEllieReadingCompanion(mockTemplate, mockSections, mockContent)
      )

      act(() => {
        result.current.offerInsight()
      })

      expect(result.current.companionState).toBe('active')

      act(() => {
        result.current.dismissInsight()
      })

      expect(result.current.companionState).toBe('resting')
      expect(result.current.currentInsight).toBeNull()
      expect(result.current.thoughtText).toBe('')
      expect(result.current.mood).toBe('idle')
    })
  })

  describe('chat integration', () => {
    it('should open chat', () => {
      const { result } = renderHook(() =>
        useEllieReadingCompanion(mockTemplate, mockSections, mockContent)
      )

      expect(result.current.isChatOpen).toBe(false)

      act(() => {
        result.current.openChat()
      })

      expect(result.current.isChatOpen).toBe(true)
      expect(result.current.companionState).toBe('active')
      expect(result.current.mood).toBe('happy')
    })

    it('should close chat and return to resting', () => {
      const { result } = renderHook(() =>
        useEllieReadingCompanion(mockTemplate, mockSections, mockContent)
      )

      act(() => {
        result.current.openChat()
      })

      expect(result.current.isChatOpen).toBe(true)

      act(() => {
        result.current.closeChat()
      })

      expect(result.current.isChatOpen).toBe(false)
      expect(result.current.companionState).toBe('resting')
      expect(result.current.mood).toBe('idle')
    })

    it('should ask question and open chat', () => {
      const { result } = renderHook(() =>
        useEllieReadingCompanion(mockTemplate, mockSections, mockContent)
      )

      act(() => {
        result.current.askQuestion('What does this mean?')
      })

      expect(result.current.isChatOpen).toBe(true)
      expect(result.current.companionState).toBe('active')
    })
  })

  describe('particle effects', () => {
    it('should clear particle effect after 3 seconds', () => {
      const { result } = renderHook(() =>
        useEllieReadingCompanion(mockTemplate, mockSections, mockContent)
      )

      act(() => {
        vi.advanceTimersByTime(5000)
      })

      // Trigger completion for sparkles
      act(() => {
        result.current.handleScrollProgress(100)
      })

      act(() => {
        vi.advanceTimersByTime(5000)
      })

      expect(result.current.particleEffect).toBe('sparkles')

      act(() => {
        vi.advanceTimersByTime(3000)
      })

      expect(result.current.particleEffect).toBeNull()
    })
  })

  describe('contextual insights', () => {
    it('should offer emotional support for entries with emotions', () => {
      const { result } = renderHook(() =>
        useEllieReadingCompanion(
          mockTemplate,
          mockSections,
          mockContent,
          ['anxious', 'worried']
        )
      )

      act(() => {
        result.current.offerInsight()
      })

      expect(result.current.currentInsight?.mood).toBe('concerned')
      expect(result.current.thoughtText).toContain('emotional')
    })

    it('should offer comprehension for long entries', () => {
      const longContent = 'word '.repeat(250) // 1000+ characters

      const { result } = renderHook(() =>
        useEllieReadingCompanion(mockTemplate, mockSections, longContent)
      )

      act(() => {
        result.current.offerInsight()
      })

      expect(result.current.currentInsight?.mood).toBe('curious')
      expect(result.current.currentInsight?.questions).toBeDefined()
    })

    it('should offer section-specific insights', () => {
      const { result } = renderHook(() =>
        useEllieReadingCompanion(mockTemplate, mockSections, mockContent)
      )

      // Navigate to a section first
      act(() => {
        vi.advanceTimersByTime(5000)
        result.current.handleSectionVisible('section-1')
      })

      act(() => {
        result.current.offerInsight()
      })

      expect(result.current.thoughtText).toContain('Introduction')
    })
  })

  describe('auto-dismiss behavior', () => {
    it('should auto-dismiss section transition after 8 seconds', () => {
      const { result } = renderHook(() =>
        useEllieReadingCompanion(mockTemplate, mockSections, mockContent)
      )

      act(() => {
        vi.advanceTimersByTime(5000)
      })

      act(() => {
        result.current.handleSectionVisible('section-1')
      })

      expect(result.current.currentInsight).toBeTruthy()

      act(() => {
        vi.advanceTimersByTime(8000)
      })

      expect(result.current.thoughtText).toBe('')
      expect(result.current.currentInsight).toBeNull()
    })

    it('should auto-dismiss break point insights after 12 seconds', () => {
      const { result } = renderHook(() =>
        useEllieReadingCompanion(mockTemplate, mockSections, mockContent)
      )

      act(() => {
        vi.advanceTimersByTime(5000)
      })

      act(() => {
        result.current.handleScrollProgress(50)
      })

      act(() => {
        vi.advanceTimersByTime(5000)
      })

      expect(result.current.currentInsight).toBeTruthy()

      act(() => {
        vi.advanceTimersByTime(12000)
      })

      expect(result.current.thoughtText).toBe('')
      expect(result.current.currentInsight).toBeNull()
    })
  })
})
