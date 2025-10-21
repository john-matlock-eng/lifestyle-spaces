import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useEllieJournalGuide } from './useEllieJournalGuide'
import type { Template } from '../types/template.types'

// Create mocks that will be reassigned per test
let mockSetMood = vi.fn()
let mockCelebrate = vi.fn()
let currentMood = 'curious'

// Mock the useShihTzuCompanion hook with stateful mood
vi.mock('../../../hooks', () => ({
  useShihTzuCompanion: vi.fn(() => ({
    mood: currentMood,
    setMood: mockSetMood,
    position: { x: 100, y: 120 },
    celebrate: mockCelebrate
  }))
}))

describe('useEllieJournalGuide', () => {
  let mockTemplate: Template

  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()

    // Reset mocks
    currentMood = 'curious'
    mockSetMood = vi.fn((newMood) => {
      currentMood = newMood
    })
    mockCelebrate = vi.fn()

    // Create a mock template with Ellie guidance
    mockTemplate = {
      id: 'test_template',
      name: 'Test Template',
      description: 'A test template',
      icon: '📝',
      category: 'general',
      version: 1,
      sections: [
        {
          id: 'intro',
          title: 'Introduction',
          type: 'paragraph',
          placeholder: 'Write your introduction...',
          ellie: {
            onStart: {
              mood: 'excited',
              message: 'Let\'s start with an introduction! ✨'
            },
            onComplete: {
              mood: 'proud',
              message: 'Great intro!',
              particleEffect: 'hearts'
            },
            hints: ['Be authentic', 'Keep it simple'],
            encouragement: {
              wordCount: {
                50: {
                  mood: 'happy',
                  message: '50 words! You\'re on fire! 🔥'
                },
                100: {
                  mood: 'celebrating',
                  message: '100 words milestone! 🎉',
                  particleEffect: 'sparkles'
                }
              }
            }
          }
        },
        {
          id: 'reflection',
          title: 'Reflection',
          type: 'q_and_a',
          placeholder: 'Reflect on your day...',
          ellie: {
            onStart: {
              mood: 'curious',
              message: 'Time to reflect deeply 🤔'
            },
            encouragement: {
              itemCount: {
                3: {
                  mood: 'excited',
                  message: 'Three questions answered! Keep going! 💪'
                }
              }
            }
          }
        }
      ],
      ellie: {
        onSelect: {
          mood: 'curious',
          message: 'Great choice! This template will help you organize your thoughts 💭'
        },
        onStart: {
          mood: 'excited',
          message: 'Let\'s begin your journaling journey! 🚀'
        },
        onComplete: {
          mood: 'celebrating',
          message: 'You\'ve completed all sections! Amazing work! 🌟',
          particleEffect: 'hearts'
        },
        onSave: {
          mood: 'celebrating',
          message: 'Journal saved successfully! 📖✨',
          particleEffect: 'sparkles',
          delay: 500
        },
        theme: {
          supportive: true,
          energetic: true
        }
      }
    }
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('Initialization', () => {
    it('should initialize with default state when no template', () => {
      const { result } = renderHook(() => useEllieJournalGuide(null))

      expect(result.current.mood).toBe('curious')
      expect(result.current.thoughtText).toBe('')
      expect(result.current.particleEffect).toBe(null)
      expect(result.current.sectionProgress.size).toBe(0)
      expect(result.current.isTemplateComplete).toBe(false)
    })

    it('should initialize with template-specific mood when template provided', () => {
      const { result } = renderHook(() => useEllieJournalGuide(mockTemplate))

      // Should use onSelect mood from template
      expect(result.current.mood).toBe('curious')
    })

    it('should initialize position based on window width', () => {
      const { result } = renderHook(() => useEllieJournalGuide(mockTemplate))

      expect(result.current.position).toHaveProperty('x')
      expect(result.current.position).toHaveProperty('y')
      expect(result.current.position.y).toBe(120)
    })
  })

  describe('Template Selection', () => {
    it('should apply onSelect guidance when handleTemplateSelect is called', () => {
      const { result } = renderHook(() => useEllieJournalGuide(mockTemplate))

      act(() => {
        result.current.handleTemplateSelect()
      })

      expect(result.current.thoughtText).toBe(mockTemplate.ellie?.onSelect?.message)
    })

    it('should not apply guidance if template has no onSelect', () => {
      const templateWithoutSelect = { ...mockTemplate, ellie: undefined }
      const { result } = renderHook(() => useEllieJournalGuide(templateWithoutSelect))

      act(() => {
        result.current.handleTemplateSelect()
      })

      expect(result.current.thoughtText).toBe('')
    })
  })

  describe('Journal Start', () => {
    it('should apply onStart guidance when handleJournalStart is called', () => {
      const { result } = renderHook(() => useEllieJournalGuide(mockTemplate))

      act(() => {
        result.current.handleJournalStart()
      })

      expect(result.current.thoughtText).toBe(mockTemplate.ellie?.onStart?.message)
    })
  })

  describe('Section Management', () => {
    it('should apply section onStart guidance when handleSectionStart is called', () => {
      const { result } = renderHook(() => useEllieJournalGuide(mockTemplate, 'intro'))

      act(() => {
        result.current.handleSectionStart('intro')
      })

      expect(result.current.thoughtText).toBe('Let\'s start with an introduction! ✨')
      const progress = result.current.sectionProgress.get('intro')
      expect(progress).toBeDefined()
      expect(progress?.sectionId).toBe('intro')
      expect(progress?.isComplete).toBe(false)
      expect(progress?.startTime).toBeDefined()
    })

    it('should start time tracking when section starts', () => {
      const { result } = renderHook(() => useEllieJournalGuide(mockTemplate))

      act(() => {
        result.current.handleSectionStart('intro')
      })

      const progress = result.current.sectionProgress.get('intro')
      expect(progress?.startTime).toBeDefined()
      expect(typeof progress?.startTime).toBe('number')
    })

    it('should mark section as complete when handleSectionComplete is called', () => {
      const { result } = renderHook(() => useEllieJournalGuide(mockTemplate))

      act(() => {
        result.current.handleSectionStart('intro')
      })

      act(() => {
        result.current.handleSectionComplete('intro')
      })

      expect(result.current.thoughtText).toBe('Great intro!')
      expect(result.current.particleEffect).toBe('hearts')
      expect(result.current.sectionProgress.get('intro')?.isComplete).toBe(true)
    })

    it('should not apply duplicate guidance for the same section event', () => {
      const { result } = renderHook(() => useEllieJournalGuide(mockTemplate))

      act(() => {
        result.current.handleSectionStart('intro')
      })

      const firstMessage = result.current.thoughtText

      act(() => {
        result.current.handleSectionStart('intro')
      })

      // Message should not change on duplicate call
      expect(result.current.thoughtText).toBe(firstMessage)
    })
  })

  describe('Progress Tracking', () => {
    it('should update word count progress', () => {
      const { result } = renderHook(() => useEllieJournalGuide(mockTemplate))

      act(() => {
        result.current.handleSectionStart('intro')
      })

      act(() => {
        result.current.updateSectionProgress('intro', { wordCount: 25 })
      })

      expect(result.current.sectionProgress.get('intro')?.wordCount).toBe(25)
    })

    it('should trigger word count milestone guidance', () => {
      const { result } = renderHook(() => useEllieJournalGuide(mockTemplate, 'intro'))

      act(() => {
        result.current.handleSectionStart('intro')
      })

      act(() => {
        result.current.updateSectionProgress('intro', { wordCount: 50 })
      })

      expect(result.current.thoughtText).toBe('50 words! You\'re on fire! 🔥')
      expect(mockSetMood).toHaveBeenCalledWith('happy')
    })

    it('should trigger higher word count milestone', () => {
      const { result } = renderHook(() => useEllieJournalGuide(mockTemplate, 'intro'))

      act(() => {
        result.current.handleSectionStart('intro')
      })

      act(() => {
        result.current.updateSectionProgress('intro', { wordCount: 100 })
      })

      expect(result.current.thoughtText).toBe('100 words milestone! 🎉')
      expect(result.current.particleEffect).toBe('sparkles')
    })

    it('should update item count progress for Q&A sections', () => {
      const { result } = renderHook(() => useEllieJournalGuide(mockTemplate, 'reflection'))

      act(() => {
        result.current.handleSectionStart('reflection')
      })

      act(() => {
        result.current.updateSectionProgress('reflection', { itemCount: 2 })
      })

      expect(result.current.sectionProgress.get('reflection')?.itemCount).toBe(2)
    })

    it('should trigger item count milestone guidance', () => {
      const { result } = renderHook(() => useEllieJournalGuide(mockTemplate, 'reflection'))

      act(() => {
        result.current.handleSectionStart('reflection')
      })

      act(() => {
        result.current.updateSectionProgress('reflection', { itemCount: 3 })
      })

      expect(result.current.thoughtText).toBe('Three questions answered! Keep going! 💪')
    })

    it('should calculate time spent correctly', () => {
      const { result } = renderHook(() => useEllieJournalGuide(mockTemplate, 'intro'))

      act(() => {
        result.current.handleSectionStart('intro')
      })

      // Advance time by 5 seconds (need to run timers to trigger interval)
      act(() => {
        vi.advanceTimersByTime(5000)
      })

      // The useEffect interval should have updated timeSpent
      const progress = result.current.sectionProgress.get('intro')
      // timeSpent should be set by the interval (approximately 5 seconds, accounting for potential timing)
      expect(progress?.timeSpent).toBeGreaterThanOrEqual(4)
    })

    it('should not trigger milestone twice for same value', () => {
      const { result } = renderHook(() => useEllieJournalGuide(mockTemplate, 'intro'))

      act(() => {
        result.current.handleSectionStart('intro')
      })

      act(() => {
        result.current.updateSectionProgress('intro', { wordCount: 50 })
      })

      const firstMessage = result.current.thoughtText

      act(() => {
        result.current.updateSectionProgress('intro', { wordCount: 50 })
      })

      // Message should remain the same (not triggered again)
      expect(result.current.thoughtText).toBe(firstMessage)
    })
  })

  describe('Hints', () => {
    it('should return a random hint for current section', () => {
      const { result } = renderHook(() => useEllieJournalGuide(mockTemplate, 'intro'))

      const hint = result.current.getHint()

      expect(hint).toBeDefined()
      expect(['Be authentic', 'Keep it simple']).toContain(hint)
    })

    it('should return null when no hints available', () => {
      const { result } = renderHook(() => useEllieJournalGuide(mockTemplate, 'reflection'))

      const hint = result.current.getHint()

      expect(hint).toBeNull()
    })

    it('should return null when no current section', () => {
      const { result } = renderHook(() => useEllieJournalGuide(mockTemplate))

      const hint = result.current.getHint()

      expect(hint).toBeNull()
    })
  })

  describe('Save Handling', () => {
    it('should apply save guidance with delay', async () => {
      const { result } = renderHook(() => useEllieJournalGuide(mockTemplate))

      act(() => {
        result.current.handleSave()
      })

      // Should not apply immediately due to delay
      expect(result.current.thoughtText).toBe('')

      // Advance timers by delay amount
      await act(async () => {
        await vi.advanceTimersByTimeAsync(500)
      })

      expect(result.current.thoughtText).toBe('Journal saved successfully! 📖✨')
      expect(result.current.particleEffect).toBe('sparkles')
    })

    it('should apply save guidance immediately when no delay', () => {
      const templateNoDelay = {
        ...mockTemplate,
        ellie: {
          ...mockTemplate.ellie,
          onSave: {
            mood: 'celebrating',
            message: 'Saved!',
            particleEffect: 'hearts'
          }
        }
      }

      const { result } = renderHook(() => useEllieJournalGuide(templateNoDelay))

      act(() => {
        result.current.handleSave()
      })

      expect(result.current.thoughtText).toBe('Saved!')
      expect(result.current.particleEffect).toBe('hearts')
    })
  })

  describe('Template Completion', () => {
    it('should detect when all sections are complete', () => {
      const { result } = renderHook(() => useEllieJournalGuide(mockTemplate))

      act(() => {
        result.current.handleSectionStart('intro')
      })
      act(() => {
        result.current.handleSectionComplete('intro')
      })

      act(() => {
        result.current.handleSectionStart('reflection')
      })
      act(() => {
        result.current.handleSectionComplete('reflection')
      })

      expect(result.current.isTemplateComplete).toBe(true)
    })

    it('should not be complete when some sections incomplete', () => {
      const { result } = renderHook(() => useEllieJournalGuide(mockTemplate))

      act(() => {
        result.current.handleSectionStart('intro')
      })
      act(() => {
        result.current.handleSectionComplete('intro')
      })

      expect(result.current.isTemplateComplete).toBe(false)
    })

    it('should apply template completion guidance when all done', async () => {
      const { result } = renderHook(() => useEllieJournalGuide(mockTemplate))

      act(() => {
        result.current.handleSectionStart('intro')
      })
      act(() => {
        result.current.handleSectionComplete('intro')
      })

      act(() => {
        result.current.handleSectionStart('reflection')
      })
      act(() => {
        result.current.handleSectionComplete('reflection')
      })

      // Template completion has a 1500ms delay
      await act(async () => {
        await vi.advanceTimersByTimeAsync(1500)
      })

      // Template completion should trigger guidance
      expect(result.current.thoughtText).toBe('You\'ve completed all sections! Amazing work! 🌟')
    })
  })

  describe('Particle Effects', () => {
    it('should clear particle effect after applying', async () => {
      const { result } = renderHook(() => useEllieJournalGuide(mockTemplate, 'intro'))

      act(() => {
        result.current.handleSectionStart('intro')
      })

      act(() => {
        result.current.handleSectionComplete('intro')
      })

      expect(result.current.particleEffect).toBe('hearts')

      // Particle effects should clear after 3 seconds (as per useEffect in hook)
      await act(async () => {
        await vi.advanceTimersByTimeAsync(3000)
      })

      expect(result.current.particleEffect).toBe(null)
    })
  })

  describe('Edge Cases', () => {
    it('should handle template with no ellie metadata', () => {
      const minimalTemplate: Template = {
        id: 'minimal',
        name: 'Minimal',
        description: 'No Ellie guidance',
        icon: '📝',
        category: 'general',
        version: 1,
        sections: [
          {
            id: 'section1',
            title: 'Section 1',
            type: 'paragraph',
            placeholder: 'Write...'
          }
        ]
      }

      const { result } = renderHook(() => useEllieJournalGuide(minimalTemplate))

      act(() => {
        result.current.handleTemplateSelect()
        result.current.handleJournalStart()
        result.current.handleSectionStart('section1')
        result.current.handleSectionComplete('section1')
      })

      // Should not error, just not apply any guidance
      expect(result.current.thoughtText).toBe('')
    })

    it('should handle section not in template', () => {
      const { result } = renderHook(() => useEllieJournalGuide(mockTemplate))

      act(() => {
        result.current.handleSectionStart('nonexistent')
      })

      // Should not error
      expect(result.current.thoughtText).toBe('')
    })

    it('should handle updateSectionProgress without section being started', () => {
      const { result } = renderHook(() => useEllieJournalGuide(mockTemplate))

      act(() => {
        result.current.updateSectionProgress('intro', { wordCount: 50 })
      })

      // Should create progress entry
      expect(result.current.sectionProgress.get('intro')).toBeDefined()
    })
  })

  describe('Multiple Sections Workflow', () => {
    it('should track progress across multiple sections', () => {
      const { result } = renderHook(() => useEllieJournalGuide(mockTemplate))

      // Work on first section
      act(() => {
        result.current.handleSectionStart('intro')
      })
      act(() => {
        result.current.updateSectionProgress('intro', { wordCount: 75 })
      })

      // Switch to second section
      act(() => {
        result.current.handleSectionStart('reflection')
      })
      act(() => {
        result.current.updateSectionProgress('reflection', { itemCount: 2 })
      })

      // Both sections should have progress
      expect(result.current.sectionProgress.size).toBe(2)
      expect(result.current.sectionProgress.get('intro')?.wordCount).toBe(75)
      expect(result.current.sectionProgress.get('reflection')?.itemCount).toBe(2)
    })
  })
})
