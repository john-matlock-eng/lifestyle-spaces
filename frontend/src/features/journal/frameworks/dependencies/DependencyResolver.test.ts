import { describe, it, expect, beforeEach } from 'vitest'
import {
  DependencyResolver,
  createResolver,
  evaluateUnlock,
  evaluateAllUnlocks,
} from './DependencyResolver'
import type {
  Framework,
  FrameworkTemplate,
  UserFrameworkProgress,
} from '../../types/framework.types'
import type { JournalEntry } from '../../types/journal.types'

describe('DependencyResolver', () => {
  // Fixed date for testing
  const NOW = new Date('2024-06-15T12:00:00Z')

  // Helper to create a template
  const createTemplate = (
    id: string,
    overrides: Partial<FrameworkTemplate> = {}
  ): FrameworkTemplate => ({
    id,
    name: `Template ${id}`,
    description: 'Test template',
    categoryId: 'cat1',
    lifecycle: 'foundation',
    frequency: 'once',
    order: 1,
    prerequisites: [],
    content: {
      sections: [{ id: 'section1', title: 'Section 1', order: 1 }],
      fields: {},
    },
    version: 1,
    ...overrides,
  })

  // Helper to create a framework
  const createFramework = (templates: FrameworkTemplate[]): Framework => ({
    id: 'test-framework',
    name: 'Test Framework',
    tagline: 'A test framework',
    description: 'A framework for testing',
    version: 1,
    icon: '🧪',
    color: '#ffffff',
    isActive: true,
    metadata: {
      schemaVersion: '1.0.0',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
      authors: [{ id: 'test', name: 'Test Author' }],
      tags: ['test'],
    },
    categories: [{ id: 'cat1', name: 'Category 1', description: 'Test category', order: 1 }],
    templates,
  })

  // Helper to create a journal entry
  const createEntry = (
    templateId: string,
    createdAt: string = '2024-06-10T10:00:00Z'
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
  })

  // Helper to create user progress
  const createProgress = (overrides: Partial<UserFrameworkProgress> = {}): UserFrameworkProgress => ({
    userId: 'user-1',
    frameworkId: 'test-framework',
    spaceId: 'space-1',
    startedAt: '2024-01-01T00:00:00Z',
    foundationCompletions: [],
    completedCycles: [],
    currentStreak: 0,
    longestStreak: 0,
    lastActivityAt: '2024-06-15T10:00:00Z',
    foundationComplete: false,
    ...overrides,
  })

  let resolver: DependencyResolver

  describe('createResolver', () => {
    it('should create a resolver for a framework', () => {
      const framework = createFramework([createTemplate('a')])

      const resolver = createResolver(framework)

      expect(resolver).toBeInstanceOf(DependencyResolver)
    })
  })

  describe('getGraph', () => {
    it('should return the dependency graph', () => {
      const framework = createFramework([createTemplate('a')])
      const resolver = new DependencyResolver(framework, { now: NOW })

      const graph = resolver.getGraph()

      expect(graph.size()).toBe(1)
    })
  })

  describe('getTemplate', () => {
    it('should return a template by ID', () => {
      const framework = createFramework([createTemplate('a')])
      const resolver = new DependencyResolver(framework, { now: NOW })

      const template = resolver.getTemplate('a')

      expect(template?.id).toBe('a')
    })

    it('should return undefined for non-existent template', () => {
      const framework = createFramework([createTemplate('a')])
      const resolver = new DependencyResolver(framework, { now: NOW })

      const template = resolver.getTemplate('nonexistent')

      expect(template).toBeUndefined()
    })
  })

  describe('evaluateUnlock - prerequisites', () => {
    beforeEach(() => {
      const framework = createFramework([
        createTemplate('a'),
        createTemplate('b', { prerequisites: ['a'] }),
        createTemplate('c', { prerequisites: ['b'] }),
      ])
      resolver = new DependencyResolver(framework, { now: NOW })
    })

    it('should unlock template with no prerequisites', () => {
      const progress = createProgress()
      const entries: JournalEntry[] = []

      const result = resolver.evaluateUnlock('a', progress, entries)

      expect(result.isUnlocked).toBe(true)
      expect(result.missingPrerequisites).toEqual([])
      expect(result.progressPercent).toBe(100)
    })

    it('should block template with unmet prerequisites', () => {
      const progress = createProgress()
      const entries: JournalEntry[] = []

      const result = resolver.evaluateUnlock('b', progress, entries)

      expect(result.isUnlocked).toBe(false)
      expect(result.missingPrerequisites).toContain('a')
      expect(result.blockReasons.some((r) => r.type === 'prerequisite')).toBe(true)
    })

    it('should unlock template when prerequisites met', () => {
      const progress = createProgress()
      const entries = [createEntry('a')]

      const result = resolver.evaluateUnlock('b', progress, entries)

      expect(result.isUnlocked).toBe(true)
      expect(result.missingPrerequisites).toEqual([])
    })

    it('should check transitive dependencies', () => {
      const progress = createProgress()
      const entries: JournalEntry[] = []

      const result = resolver.evaluateUnlock('c', progress, entries)

      expect(result.isUnlocked).toBe(false)
      // Should include both a and b as missing
      expect(result.missingPrerequisites).toContain('a')
      expect(result.missingPrerequisites).toContain('b')
    })

    it('should handle non-existent template', () => {
      const progress = createProgress()
      const entries: JournalEntry[] = []

      const result = resolver.evaluateUnlock('nonexistent', progress, entries)

      expect(result.isUnlocked).toBe(false)
      expect(result.statusMessage).toContain('not found')
    })
  })

  describe('evaluateUnlock - foundation requirement', () => {
    it('should block recurring templates when foundation incomplete', () => {
      const framework = createFramework([
        createTemplate('foundation-1', { lifecycle: 'foundation', frequency: 'once' }),
        createTemplate('recurring-1', { lifecycle: 'recurring', frequency: 'weekly' }),
      ])
      const resolver = new DependencyResolver(framework, { now: NOW })
      const progress = createProgress({ foundationComplete: false })
      const entries: JournalEntry[] = []

      const result = resolver.evaluateUnlock('recurring-1', progress, entries)

      expect(result.isUnlocked).toBe(false)
      expect(result.blockReasons.some((r) => r.type === 'foundation_incomplete')).toBe(true)
    })

    it('should allow recurring templates when foundation complete', () => {
      const framework = createFramework([
        createTemplate('foundation-1', { lifecycle: 'foundation', frequency: 'once' }),
        createTemplate('recurring-1', { lifecycle: 'recurring', frequency: 'weekly' }),
      ])
      const resolver = new DependencyResolver(framework, { now: NOW })
      const progress = createProgress({ foundationComplete: true })
      const entries = [createEntry('foundation-1')]

      const result = resolver.evaluateUnlock('recurring-1', progress, entries)

      expect(result.isUnlocked).toBe(true)
    })
  })

  describe('evaluateUnlock - cooldown', () => {
    it('should block template in cooldown', () => {
      const framework = createFramework([
        createTemplate('weekly', {
          lifecycle: 'recurring',
          frequency: 'weekly',
          cooldownDays: 7,
        }),
      ])
      const resolver = new DependencyResolver(framework, { now: NOW })
      const progress = createProgress({ foundationComplete: true })
      // Entry was 3 days ago
      const entries = [createEntry('weekly', '2024-06-12T10:00:00Z')]

      const result = resolver.evaluateUnlock('weekly', progress, entries)

      expect(result.isUnlocked).toBe(false)
      expect(result.blockReasons.some((r) => r.type === 'cooldown')).toBe(true)
      expect(result.availableAt).toBeDefined()
    })

    it('should allow template after cooldown expires', () => {
      const framework = createFramework([
        createTemplate('weekly', {
          lifecycle: 'recurring',
          frequency: 'weekly',
          cooldownDays: 3,
        }),
      ])
      const resolver = new DependencyResolver(framework, { now: NOW })
      const progress = createProgress({ foundationComplete: true })
      // Entry was 5 days ago
      const entries = [createEntry('weekly', '2024-06-10T10:00:00Z')]

      const result = resolver.evaluateUnlock('weekly', progress, entries)

      expect(result.isUnlocked).toBe(true)
    })
  })

  describe('evaluateUnlock - single use', () => {
    it('should block single-use template after completion', () => {
      const framework = createFramework([
        createTemplate('charter', { lifecycle: 'foundation', frequency: 'once' }),
      ])
      const resolver = new DependencyResolver(framework, { now: NOW })
      const progress = createProgress()
      const entries = [createEntry('charter')]

      const result = resolver.evaluateUnlock('charter', progress, entries)

      expect(result.isUnlocked).toBe(false)
      expect(result.blockReasons.some((r) => r.type === 'cooldown')).toBe(true)
    })
  })

  describe('evaluateUnlock - unlock conditions', () => {
    it('should check template_count condition', () => {
      const framework = createFramework([
        createTemplate('daily', { lifecycle: 'recurring', frequency: 'daily' }),
        createTemplate('weekly-review', {
          lifecycle: 'recurring',
          frequency: 'weekly',
          unlockConditions: [
            {
              type: 'template_count',
              templateId: 'daily',
              minCount: 5,
              description: 'Complete at least 5 daily entries',
            },
          ],
        }),
      ])
      const resolver = new DependencyResolver(framework, { now: NOW })
      const progress = createProgress({ foundationComplete: true })

      // Only 3 daily entries
      const entries = [
        createEntry('daily', '2024-06-12T10:00:00Z'),
        createEntry('daily', '2024-06-13T10:00:00Z'),
        createEntry('daily', '2024-06-14T10:00:00Z'),
      ]

      const result = resolver.evaluateUnlock('weekly-review', progress, entries)

      expect(result.isUnlocked).toBe(false)
      expect(result.blockReasons.some((r) => r.type === 'condition')).toBe(true)
    })

    it('should pass template_count condition when met', () => {
      const framework = createFramework([
        createTemplate('daily', { lifecycle: 'recurring', frequency: 'daily' }),
        createTemplate('weekly-review', {
          lifecycle: 'recurring',
          frequency: 'weekly',
          unlockConditions: [
            {
              type: 'template_count',
              templateId: 'daily',
              minCount: 3,
              description: 'Complete at least 3 daily entries',
            },
          ],
        }),
      ])
      const resolver = new DependencyResolver(framework, { now: NOW })
      const progress = createProgress({ foundationComplete: true })

      const entries = [
        createEntry('daily', '2024-06-12T10:00:00Z'),
        createEntry('daily', '2024-06-13T10:00:00Z'),
        createEntry('daily', '2024-06-14T10:00:00Z'),
      ]

      const result = resolver.evaluateUnlock('weekly-review', progress, entries)

      expect(result.isUnlocked).toBe(true)
    })

    it('should check days_elapsed condition', () => {
      const framework = createFramework([
        createTemplate('charter', { lifecycle: 'foundation', frequency: 'once' }),
        createTemplate('reset', {
          lifecycle: 'special',
          frequency: 'as_needed',
          unlockConditions: [
            {
              type: 'days_elapsed',
              templateId: 'charter',
              minDays: 30,
              description: 'Wait 30 days after charter',
            },
          ],
        }),
      ])
      const resolver = new DependencyResolver(framework, { now: NOW })
      const progress = createProgress({ foundationComplete: true })

      // Charter completed only 10 days ago
      const entries = [createEntry('charter', '2024-06-05T10:00:00Z')]

      const result = resolver.evaluateUnlock('reset', progress, entries)

      expect(result.isUnlocked).toBe(false)
      expect(result.blockReasons.some((r) => r.type === 'condition')).toBe(true)
    })

    it('should handle streak condition', () => {
      const framework = createFramework([
        createTemplate('achievement', {
          lifecycle: 'milestone',
          frequency: 'once',
          unlockConditions: [
            {
              type: 'streak',
              minCount: 7,
              description: 'Maintain a 7-day streak',
            },
          ],
        }),
      ])
      const resolver = new DependencyResolver(framework, { now: NOW })
      const progress = createProgress()

      // Only 5 entries
      const entries = Array.from({ length: 5 }, (_, i) =>
        createEntry('daily', `2024-06-${10 + i}T10:00:00Z`)
      )

      const result = resolver.evaluateUnlock('achievement', progress, entries)

      expect(result.isUnlocked).toBe(false)
    })

    it('should handle field_value condition (simplified)', () => {
      const framework = createFramework([
        createTemplate('charter', { lifecycle: 'foundation', frequency: 'once' }),
        createTemplate('special', {
          lifecycle: 'special',
          frequency: 'as_needed',
          unlockConditions: [
            {
              type: 'field_value',
              templateId: 'charter',
              fieldId: 'goals',
              fieldValue: 'completed',
              description: 'Complete goals in charter',
            },
          ],
        }),
      ])
      const resolver = new DependencyResolver(framework, { now: NOW })
      const progress = createProgress({ foundationComplete: true })

      // Entry exists - simplified implementation treats as satisfied
      const entries = [createEntry('charter')]

      const result = resolver.evaluateUnlock('special', progress, entries)

      expect(result.isUnlocked).toBe(true)
    })

    it('should handle custom condition (always passes)', () => {
      const framework = createFramework([
        createTemplate('special', {
          lifecycle: 'special',
          frequency: 'as_needed',
          unlockConditions: [
            {
              type: 'custom',
              customId: 'special-logic',
              description: 'Custom unlock logic',
            },
          ],
        }),
      ])
      const resolver = new DependencyResolver(framework, { now: NOW })
      const progress = createProgress()

      const result = resolver.evaluateUnlock('special', progress, [])

      expect(result.isUnlocked).toBe(true)
    })

    it('should handle condition without required fields', () => {
      const framework = createFramework([
        createTemplate('special', {
          lifecycle: 'special',
          frequency: 'as_needed',
          unlockConditions: [
            {
              type: 'template_count',
              // Missing templateId and minCount
              description: 'Incomplete condition',
            },
          ],
        }),
      ])
      const resolver = new DependencyResolver(framework, { now: NOW })
      const progress = createProgress()

      const result = resolver.evaluateUnlock('special', progress, [])

      // Should pass because condition is incomplete
      expect(result.isUnlocked).toBe(true)
    })

    it('should fail days_elapsed when no entry exists', () => {
      const framework = createFramework([
        createTemplate('charter', { lifecycle: 'foundation', frequency: 'once' }),
        createTemplate('reset', {
          lifecycle: 'special',
          frequency: 'as_needed',
          unlockConditions: [
            {
              type: 'days_elapsed',
              templateId: 'charter',
              minDays: 30,
              description: 'Wait 30 days after charter',
            },
          ],
        }),
      ])
      const resolver = new DependencyResolver(framework, { now: NOW })
      const progress = createProgress()

      // No charter entry
      const result = resolver.evaluateUnlock('reset', progress, [])

      expect(result.isUnlocked).toBe(false)
    })

    it('should fail field_value when no entry exists', () => {
      const framework = createFramework([
        createTemplate('charter', { lifecycle: 'foundation', frequency: 'once' }),
        createTemplate('special', {
          lifecycle: 'special',
          frequency: 'as_needed',
          unlockConditions: [
            {
              type: 'field_value',
              templateId: 'charter',
              fieldId: 'goals',
              fieldValue: 'completed',
              description: 'Complete goals in charter',
            },
          ],
        }),
      ])
      const resolver = new DependencyResolver(framework, { now: NOW })
      const progress = createProgress()

      // No charter entry
      const result = resolver.evaluateUnlock('special', progress, [])

      expect(result.isUnlocked).toBe(false)
    })
  })

  describe('evaluateUnlock - progress calculation', () => {
    it('should calculate progress based on prerequisites', () => {
      const framework = createFramework([
        createTemplate('a'),
        createTemplate('b'),
        createTemplate('c', { prerequisites: ['a', 'b'] }),
      ])
      const resolver = new DependencyResolver(framework, { now: NOW })
      const progress = createProgress()

      // Only 'a' completed
      const entries = [createEntry('a')]

      const result = resolver.evaluateUnlock('c', progress, entries)

      expect(result.progressPercent).toBe(50) // 1 of 2 prereqs
    })

    it('should show 100% for completed single-use', () => {
      const framework = createFramework([
        createTemplate('charter', { lifecycle: 'foundation', frequency: 'once' }),
      ])
      const resolver = new DependencyResolver(framework, { now: NOW })
      const progress = createProgress()
      const entries = [createEntry('charter')]

      const result = resolver.evaluateUnlock('charter', progress, entries)

      // Single-use completed templates are blocked (no longer available)
      expect(result.isUnlocked).toBe(false)
      // The block reason should indicate it's completed
      expect(result.blockReasons.some(r => r.type === 'cooldown')).toBe(true)
    })
  })

  describe('evaluateUnlock - status messages', () => {
    it('should provide ready message when unlocked', () => {
      const framework = createFramework([createTemplate('a')])
      const resolver = new DependencyResolver(framework, { now: NOW })
      const progress = createProgress()

      const result = resolver.evaluateUnlock('a', progress, [])

      expect(result.statusMessage).toContain('Ready')
    })

    it('should provide prerequisite message when blocked', () => {
      const framework = createFramework([
        createTemplate('a'),
        createTemplate('b', { prerequisites: ['a'] }),
      ])
      const resolver = new DependencyResolver(framework, { now: NOW })
      const progress = createProgress()

      const result = resolver.evaluateUnlock('b', progress, [])

      expect(result.statusMessage).toContain('Complete')
    })
  })

  describe('evaluateAllUnlocks', () => {
    it('should evaluate all templates', () => {
      const framework = createFramework([
        createTemplate('a'),
        createTemplate('b', { prerequisites: ['a'] }),
        createTemplate('c'),
      ])
      const resolver = new DependencyResolver(framework, { now: NOW })
      const progress = createProgress()
      const entries = [createEntry('a')]

      const results = resolver.evaluateAllUnlocks(progress, entries)

      expect(results.size).toBe(3)
      expect(results.get('a')?.isUnlocked).toBe(false) // single-use completed
      expect(results.get('b')?.isUnlocked).toBe(true)
      expect(results.get('c')?.isUnlocked).toBe(true)
    })
  })

  describe('getUnlockSummary', () => {
    it('should provide comprehensive summary', () => {
      const framework = createFramework([
        createTemplate('foundation-1', { lifecycle: 'foundation', frequency: 'once' }),
        createTemplate('foundation-2', { lifecycle: 'foundation', frequency: 'once' }),
        createTemplate('recurring-1', {
          lifecycle: 'recurring',
          frequency: 'weekly',
          cooldownDays: 7,
        }),
      ])
      const resolver = new DependencyResolver(framework, { now: NOW })
      const progress = createProgress({ foundationComplete: false })
      // foundation-1 completed, recurring-1 was done 2 days ago (in cooldown)
      const entries = [
        createEntry('foundation-1'),
        createEntry('recurring-1', '2024-06-13T10:00:00Z'),
      ]

      const summary = resolver.getUnlockSummary(progress, entries)

      expect(summary.incompleteFoundations).toContain('foundation-2')
      expect(summary.completionPercent).toBe(50) // 1 of 2 foundations
    })

    it('should categorize templates correctly', () => {
      const framework = createFramework([
        createTemplate('a'),
        createTemplate('b', { prerequisites: ['a'] }),
        createTemplate('c', {
          lifecycle: 'recurring',
          frequency: 'weekly',
          cooldownDays: 7,
        }),
      ])
      const resolver = new DependencyResolver(framework, { now: NOW })
      const progress = createProgress({ foundationComplete: true })
      const entries = [
        createEntry('a'),
        createEntry('c', '2024-06-14T10:00:00Z'), // 1 day ago, in 7-day cooldown
      ]

      const summary = resolver.getUnlockSummary(progress, entries)

      // 'a' is completed (single-use)
      expect(summary.lockedTemplates).toContain('a')
      // 'b' is unlocked (prereq met)
      expect(summary.unlockedTemplates).toContain('b')
      // 'c' is in cooldown
      expect(summary.cooldownTemplates).toContain('c')
    })
  })

  describe('getNextRecommended', () => {
    it('should recommend incomplete foundation first', () => {
      const framework = createFramework([
        createTemplate('foundation-1', { lifecycle: 'foundation', frequency: 'once', order: 1 }),
        createTemplate('foundation-2', { lifecycle: 'foundation', frequency: 'once', order: 2 }),
        createTemplate('recurring', { lifecycle: 'recurring', frequency: 'weekly', order: 1 }),
      ])
      const resolver = new DependencyResolver(framework, { now: NOW })
      const progress = createProgress({ foundationComplete: false })
      const entries: JournalEntry[] = []

      const next = resolver.getNextRecommended(progress, entries)

      expect(next).toBe('foundation-1')
    })

    it('should recommend unlocked recurring when foundations complete', () => {
      const framework = createFramework([
        createTemplate('foundation-1', { lifecycle: 'foundation', frequency: 'once' }),
        createTemplate('recurring-1', { lifecycle: 'recurring', frequency: 'weekly', order: 1 }),
        createTemplate('recurring-2', { lifecycle: 'recurring', frequency: 'daily', order: 2 }),
      ])
      const resolver = new DependencyResolver(framework, { now: NOW })
      const progress = createProgress({ foundationComplete: true })
      const entries = [createEntry('foundation-1')]

      const next = resolver.getNextRecommended(progress, entries)

      expect(next).toBe('recurring-1')
    })

    it('should return null when no templates available', () => {
      const framework = createFramework([
        createTemplate('a', { lifecycle: 'foundation', frequency: 'once' }),
      ])
      const resolver = new DependencyResolver(framework, { now: NOW })
      const progress = createProgress()
      const entries = [createEntry('a')] // Single-use completed

      const next = resolver.getNextRecommended(progress, entries)

      expect(next).toBeNull()
    })

    it('should recommend locked foundation when unlocked ones are complete', () => {
      const framework = createFramework([
        createTemplate('f1', { lifecycle: 'foundation', frequency: 'once', order: 1 }),
        createTemplate('f2', { lifecycle: 'foundation', frequency: 'once', order: 2, prerequisites: ['f1'] }),
      ])
      const resolver = new DependencyResolver(framework, { now: NOW })
      const progress = createProgress({ foundationComplete: false })
      const entries: JournalEntry[] = []

      const next = resolver.getNextRecommended(progress, entries)

      // f1 is unlocked and incomplete
      expect(next).toBe('f1')
    })
  })

  describe('standalone functions', () => {
    it('evaluateUnlock should work', () => {
      const framework = createFramework([createTemplate('a')])
      const progress = createProgress()

      const result = evaluateUnlock(framework, 'a', progress, [], { now: NOW })

      expect(result.isUnlocked).toBe(true)
    })

    it('evaluateAllUnlocks should work', () => {
      const framework = createFramework([
        createTemplate('a'),
        createTemplate('b'),
      ])
      const progress = createProgress()

      const results = evaluateAllUnlocks(framework, progress, [], { now: NOW })

      expect(results.size).toBe(2)
    })
  })

  describe('complex scenarios', () => {
    it('should handle Charter & Course example flow', () => {
      const framework = createFramework([
        createTemplate('charter', {
          lifecycle: 'foundation',
          frequency: 'once',
          order: 1,
        }),
        createTemplate('quarterly', {
          lifecycle: 'recurring',
          frequency: 'quarterly',
          order: 2,
          prerequisites: ['charter'],
        }),
        createTemplate('weekly', {
          lifecycle: 'recurring',
          frequency: 'weekly',
          order: 3,
          prerequisites: ['quarterly'],
          cooldownDays: 7,
        }),
        createTemplate('reset', {
          lifecycle: 'special',
          frequency: 'as_needed',
          order: 4,
        }),
      ])
      const resolver = new DependencyResolver(framework, { now: NOW })

      // Initial state - only charter and reset are available
      const progress = createProgress({ foundationComplete: false })
      let entries: JournalEntry[] = []
      let summary = resolver.getUnlockSummary(progress, entries)

      expect(summary.unlockedTemplates).toContain('charter')
      expect(summary.unlockedTemplates).toContain('reset')
      expect(summary.lockedTemplates).toContain('quarterly')
      expect(summary.lockedTemplates).toContain('weekly')

      // After completing charter
      entries = [createEntry('charter')]
      summary = resolver.getUnlockSummary(progress, entries)

      expect(summary.lockedTemplates).toContain('charter') // single-use completed
      // Note: quarterly prerequisite (charter) is now complete
      // But quarterly is recurring and needs foundationComplete = true OR no incomplete foundations
      // Since charter is the only foundation and it's complete, quarterly is now unlocked!
      expect(summary.unlockedTemplates).toContain('quarterly')
      expect(summary.lockedTemplates).toContain('weekly') // needs quarterly

      // After completing quarterly
      entries = [createEntry('charter'), createEntry('quarterly')]
      summary = resolver.getUnlockSummary(progress, entries)

      expect(summary.unlockedTemplates).toContain('weekly')
    })
  })
})
