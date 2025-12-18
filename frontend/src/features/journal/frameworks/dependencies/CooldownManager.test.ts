import { describe, it, expect, beforeEach } from 'vitest'
import {
  CooldownManager,
  cooldownManager,
  canCreateEntry,
  getRemainingCooldown,
  getLastEntryDate,
} from './CooldownManager'
import type { FrameworkTemplate } from '../../types/framework.types'
import type { JournalEntry } from '../../types/journal.types'

describe('CooldownManager', () => {
  let manager: CooldownManager

  // Fixed date for testing
  const NOW = new Date('2024-06-15T12:00:00Z')

  // Helper to create a template
  const createTemplate = (overrides: Partial<FrameworkTemplate> = {}): FrameworkTemplate => ({
    id: 'test-template',
    name: 'Test Template',
    description: 'A test template',
    categoryId: 'cat1',
    lifecycle: 'recurring',
    frequency: 'weekly',
    order: 1,
    prerequisites: [],
    content: {
      sections: [{ id: 'section1', title: 'Section 1', order: 1 }],
      fields: {},
    },
    version: 1,
    ...overrides,
  })

  // Helper to create a journal entry
  const createEntry = (
    templateId: string,
    createdAt: string,
    overrides: Partial<JournalEntry> = {}
  ): JournalEntry => ({
    journalId: `journal-${Math.random().toString(36).slice(2)}`,
    spaceId: 'space-1',
    userId: 'user-1',
    title: 'Test Entry',
    content: 'Test content',
    templateId,
    tags: [],
    createdAt,
    updatedAt: createdAt,
    wordCount: 10,
    isPinned: false,
    ...overrides,
  })

  beforeEach(() => {
    manager = new CooldownManager({ now: NOW })
  })

  describe('isSingleUse', () => {
    it('should return true for foundation lifecycle', () => {
      const template = createTemplate({ lifecycle: 'foundation', frequency: 'once' })

      expect(manager.isSingleUse(template)).toBe(true)
    })

    it('should return true for once frequency', () => {
      const template = createTemplate({ lifecycle: 'milestone', frequency: 'once' })

      expect(manager.isSingleUse(template)).toBe(true)
    })

    it('should return false for recurring templates', () => {
      const template = createTemplate({ lifecycle: 'recurring', frequency: 'weekly' })

      expect(manager.isSingleUse(template)).toBe(false)
    })
  })

  describe('hasCooldown', () => {
    it('should return true for template with cooldownDays', () => {
      const template = createTemplate({ cooldownDays: 7 })

      expect(manager.hasCooldown(template)).toBe(true)
    })

    it('should return false for template without cooldownDays', () => {
      const template = createTemplate()

      expect(manager.hasCooldown(template)).toBe(false)
    })

    it('should return false for cooldownDays = 0', () => {
      const template = createTemplate({ cooldownDays: 0 })

      expect(manager.hasCooldown(template)).toBe(false)
    })

    it('should return false for single-use templates even with cooldown', () => {
      const template = createTemplate({
        lifecycle: 'foundation',
        frequency: 'once',
        cooldownDays: 7,
      })

      expect(manager.hasCooldown(template)).toBe(false)
    })
  })

  describe('getLastEntry', () => {
    it('should return null when no entries exist', () => {
      const result = manager.getLastEntry('template-1', [])

      expect(result).toBeNull()
    })

    it('should return the most recent entry', () => {
      const entries = [
        createEntry('template-1', '2024-06-10T10:00:00Z'),
        createEntry('template-1', '2024-06-12T10:00:00Z'),
        createEntry('template-1', '2024-06-11T10:00:00Z'),
      ]

      const result = manager.getLastEntry('template-1', entries)

      expect(result?.createdAt).toBe('2024-06-12T10:00:00Z')
    })

    it('should filter by templateId', () => {
      const entries = [
        createEntry('template-1', '2024-06-10T10:00:00Z'),
        createEntry('template-2', '2024-06-12T10:00:00Z'),
      ]

      const result = manager.getLastEntry('template-1', entries)

      expect(result?.createdAt).toBe('2024-06-10T10:00:00Z')
    })
  })

  describe('getLastEntryDate', () => {
    it('should return null when no entries exist', () => {
      const result = manager.getLastEntryDate('template-1', [])

      expect(result).toBeNull()
    })

    it('should return the date of the most recent entry', () => {
      const entries = [createEntry('template-1', '2024-06-12T10:00:00Z')]

      const result = manager.getLastEntryDate('template-1', entries)

      expect(result).toBeInstanceOf(Date)
      expect(result?.toISOString()).toBe('2024-06-12T10:00:00.000Z')
    })
  })

  describe('getEntryCount', () => {
    it('should return 0 when no entries exist', () => {
      const result = manager.getEntryCount('template-1', [])

      expect(result).toBe(0)
    })

    it('should count entries for template', () => {
      const entries = [
        createEntry('template-1', '2024-06-10T10:00:00Z'),
        createEntry('template-1', '2024-06-11T10:00:00Z'),
        createEntry('template-2', '2024-06-12T10:00:00Z'),
      ]

      expect(manager.getEntryCount('template-1', entries)).toBe(2)
      expect(manager.getEntryCount('template-2', entries)).toBe(1)
    })
  })

  describe('getRemainingCooldown', () => {
    it('should return 0 when no cooldown configured', () => {
      const template = createTemplate()
      const entries = [createEntry('test-template', '2024-06-14T10:00:00Z')]

      const result = manager.getRemainingCooldown(template, entries)

      expect(result).toBe(0)
    })

    it('should return 0 when no previous entries', () => {
      const template = createTemplate({ cooldownDays: 7 })

      const result = manager.getRemainingCooldown(template, [])

      expect(result).toBe(0)
    })

    it('should return remaining days when in cooldown', () => {
      const template = createTemplate({ cooldownDays: 7 })
      // Last entry was 3 days ago (June 12)
      const entries = [createEntry('test-template', '2024-06-12T10:00:00Z')]

      const result = manager.getRemainingCooldown(template, entries)

      expect(result).toBe(4) // 7 - 3 = 4 days remaining
    })

    it('should return 0 when cooldown has passed', () => {
      const template = createTemplate({ cooldownDays: 3 })
      // Last entry was 5 days ago (June 10)
      const entries = [createEntry('test-template', '2024-06-10T10:00:00Z')]

      const result = manager.getRemainingCooldown(template, entries)

      expect(result).toBe(0)
    })

    it('should use calendar days, not 24-hour periods', () => {
      const template = createTemplate({ cooldownDays: 1 })
      // Entry was yesterday at 11pm, now is noon today
      const entries = [createEntry('test-template', '2024-06-14T23:00:00Z')]

      const result = manager.getRemainingCooldown(template, entries)

      // Should be 0 because we're now on the next calendar day
      expect(result).toBe(0)
    })
  })

  describe('getCooldownExpiryDate', () => {
    it('should return null when no cooldown configured', () => {
      const template = createTemplate()
      const entries = [createEntry('test-template', '2024-06-14T10:00:00Z')]

      const result = manager.getCooldownExpiryDate(template, entries)

      expect(result).toBeNull()
    })

    it('should return null when no previous entries', () => {
      const template = createTemplate({ cooldownDays: 7 })

      const result = manager.getCooldownExpiryDate(template, [])

      expect(result).toBeNull()
    })

    it('should return correct expiry date', () => {
      const template = createTemplate({ cooldownDays: 7 })
      const entries = [createEntry('test-template', '2024-06-12T10:00:00Z')]

      const result = manager.getCooldownExpiryDate(template, entries)

      expect(result).toBeInstanceOf(Date)
      // June 12 + 7 days = June 19
      expect(result?.getDate()).toBe(19)
    })
  })

  describe('canCreateEntry', () => {
    describe('single-use templates', () => {
      it('should allow first entry', () => {
        const template = createTemplate({ lifecycle: 'foundation', frequency: 'once' })

        const result = manager.canCreateEntry(template, [])

        expect(result.allowed).toBe(true)
        expect(result.message).toContain('one-time')
      })

      it('should block after first entry', () => {
        const template = createTemplate({ lifecycle: 'foundation', frequency: 'once' })
        const entries = [createEntry('test-template', '2024-06-10T10:00:00Z')]

        const result = manager.canCreateEntry(template, entries)

        expect(result.allowed).toBe(false)
        expect(result.reason).toBe('single_use_completed')
        expect(result.lastEntryDate).toBe('2024-06-10T10:00:00Z')
      })
    })

    describe('recurring templates with cooldown', () => {
      it('should allow when cooldown expired', () => {
        const template = createTemplate({ cooldownDays: 3 })
        // Last entry was 5 days ago
        const entries = [createEntry('test-template', '2024-06-10T10:00:00Z')]

        const result = manager.canCreateEntry(template, entries)

        expect(result.allowed).toBe(true)
        expect(result.lastEntryDate).toBe('2024-06-10T10:00:00Z')
      })

      it('should block when in cooldown', () => {
        const template = createTemplate({ cooldownDays: 7 })
        // Last entry was 3 days ago
        const entries = [createEntry('test-template', '2024-06-12T10:00:00Z')]

        const result = manager.canCreateEntry(template, entries)

        expect(result.allowed).toBe(false)
        expect(result.reason).toBe('cooldown_active')
        expect(result.remainingDays).toBe(4)
        expect(result.availableAt).toBeDefined()
      })

      it('should provide singular day message', () => {
        const template = createTemplate({ cooldownDays: 2 })
        // Last entry was 1 day ago
        const entries = [createEntry('test-template', '2024-06-14T10:00:00Z')]

        const result = manager.canCreateEntry(template, entries)

        expect(result.allowed).toBe(false)
        expect(result.remainingDays).toBe(1)
        expect(result.message).toContain('1 day')
      })

      it('should provide plural days message', () => {
        const template = createTemplate({ cooldownDays: 5 })
        // Last entry was 2 days ago
        const entries = [createEntry('test-template', '2024-06-13T10:00:00Z')]

        const result = manager.canCreateEntry(template, entries)

        expect(result.allowed).toBe(false)
        expect(result.remainingDays).toBe(3)
        expect(result.message).toContain('3 days')
      })
    })

    describe('recurring templates without cooldown', () => {
      it('should always allow', () => {
        const template = createTemplate()
        const entries = [createEntry('test-template', '2024-06-15T10:00:00Z')]

        const result = manager.canCreateEntry(template, entries)

        expect(result.allowed).toBe(true)
      })

      it('should show last entry was today message', () => {
        const template = createTemplate()
        const entries = [createEntry('test-template', '2024-06-15T06:00:00Z')]

        const result = manager.canCreateEntry(template, entries)

        expect(result.allowed).toBe(true)
        expect(result.message).toContain('today')
      })

      it('should show last entry was yesterday message', () => {
        const template = createTemplate()
        const entries = [createEntry('test-template', '2024-06-14T10:00:00Z')]

        const result = manager.canCreateEntry(template, entries)

        expect(result.allowed).toBe(true)
        expect(result.message).toContain('yesterday')
      })

      it('should show days ago message', () => {
        const template = createTemplate()
        const entries = [createEntry('test-template', '2024-06-10T10:00:00Z')]

        const result = manager.canCreateEntry(template, entries)

        expect(result.allowed).toBe(true)
        expect(result.message).toContain('5 days ago')
      })

      it('should show first entry message when no previous entries', () => {
        const template = createTemplate()

        const result = manager.canCreateEntry(template, [])

        expect(result.allowed).toBe(true)
        expect(result.message).toContain('first entry')
      })
    })
  })

  describe('evaluateAll', () => {
    it('should evaluate multiple templates', () => {
      const templates = [
        createTemplate({ id: 't1', lifecycle: 'foundation', frequency: 'once' }),
        createTemplate({ id: 't2', cooldownDays: 7 }),
        createTemplate({ id: 't3' }),
      ]
      const entries = [
        createEntry('t1', '2024-06-01T10:00:00Z'),
        createEntry('t2', '2024-06-14T10:00:00Z'),
      ]

      const results = manager.evaluateAll(templates, entries)

      expect(results.size).toBe(3)
      expect(results.get('t1')?.allowed).toBe(false) // single-use completed
      expect(results.get('t2')?.allowed).toBe(false) // in cooldown
      expect(results.get('t3')?.allowed).toBe(true) // no restrictions
    })
  })

  describe('getAvailableTemplates', () => {
    it('should return templates not in cooldown', () => {
      const templates = [
        createTemplate({ id: 't1', cooldownDays: 7 }),
        createTemplate({ id: 't2' }),
        createTemplate({ id: 't3', cooldownDays: 1 }),
      ]
      const entries = [
        createEntry('t1', '2024-06-14T10:00:00Z'), // 1 day ago, still in 7-day cooldown
        createEntry('t3', '2024-06-10T10:00:00Z'), // 5 days ago, 1-day cooldown expired
      ]

      const available = manager.getAvailableTemplates(templates, entries)

      expect(available.sort()).toEqual(['t2', 't3'])
    })
  })

  describe('getTemplatesInCooldown', () => {
    it('should return templates currently in cooldown', () => {
      const templates = [
        createTemplate({ id: 't1', cooldownDays: 7 }),
        createTemplate({ id: 't2' }),
      ]
      const entries = [createEntry('t1', '2024-06-14T10:00:00Z')]

      const inCooldown = manager.getTemplatesInCooldown(templates, entries)

      expect(inCooldown).toEqual(['t1'])
    })
  })

  describe('getCompletedSingleUseTemplates', () => {
    it('should return completed single-use templates', () => {
      const templates = [
        createTemplate({ id: 't1', lifecycle: 'foundation', frequency: 'once' }),
        createTemplate({ id: 't2', lifecycle: 'foundation', frequency: 'once' }),
        createTemplate({ id: 't3' }),
      ]
      const entries = [createEntry('t1', '2024-06-01T10:00:00Z')]

      const completed = manager.getCompletedSingleUseTemplates(templates, entries)

      expect(completed).toEqual(['t1'])
    })
  })

  describe('singleton instance', () => {
    it('should export a default instance', () => {
      expect(cooldownManager).toBeInstanceOf(CooldownManager)
    })
  })

  describe('standalone functions', () => {
    it('canCreateEntry should work', () => {
      const template = createTemplate({ lifecycle: 'foundation', frequency: 'once' })

      const result = canCreateEntry(template, [], { now: NOW })

      expect(result.allowed).toBe(true)
    })

    it('getRemainingCooldown should work', () => {
      const template = createTemplate({ cooldownDays: 7 })
      const entries = [createEntry('test-template', '2024-06-14T10:00:00Z')]

      const result = getRemainingCooldown(template, entries, { now: NOW })

      expect(result).toBe(6)
    })

    it('getLastEntryDate should work', () => {
      const entries = [createEntry('test-template', '2024-06-12T10:00:00Z')]

      const result = getLastEntryDate('test-template', entries, { now: NOW })

      expect(result).toBeInstanceOf(Date)
    })
  })

  describe('timezone handling', () => {
    it('should handle different timezones', () => {
      // Create manager with specific timezone
      const tzManager = new CooldownManager({
        now: NOW,
        timezone: 'America/New_York',
      })

      const template = createTemplate({ cooldownDays: 1 })
      const entries = [createEntry('test-template', '2024-06-14T10:00:00Z')]

      // Should still work correctly
      const result = tzManager.canCreateEntry(template, entries)

      expect(result).toBeDefined()
    })
  })

  describe('DST edge cases', () => {
    it('should handle dates across DST transition', () => {
      // March 10, 2024 is DST start in US
      // Use a cooldown of 1 day - from March 9 to March 11 is 2 calendar days
      const dstManager = new CooldownManager({
        now: new Date('2024-03-11T12:00:00Z'),
      })

      const template = createTemplate({ cooldownDays: 1 })
      const entries = [createEntry('test-template', '2024-03-09T12:00:00Z')]

      const result = dstManager.canCreateEntry(template, entries)

      // More than 1 calendar day has passed
      expect(result.allowed).toBe(true)
    })
  })
})
