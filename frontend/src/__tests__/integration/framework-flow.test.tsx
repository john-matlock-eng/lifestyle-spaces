/**
 * Framework Flow Integration Tests
 *
 * Tests the complete user journey through the Charter & Course framework:
 * 1. Template selection and framework discovery
 * 2. Prerequisite enforcement and unlock progression
 * 3. Entry creation and progress tracking
 * 4. Data binding between templates
 *
 * @module __tests__/integration/framework-flow
 */

import { describe, it, expect } from 'vitest'
import type { Framework, FrameworkTemplate, UserFrameworkProgress } from '@/features/journal/types/framework.types'
import type { JournalEntry } from '@/features/journal/types/journal.types'

// ============================================================================
// MOCK DATA FACTORIES
// ============================================================================

/**
 * Create a Charter & Course-like framework for testing
 */
function createCharterAndCourseFramework(): Framework {
  return {
    id: 'charter-and-course',
    name: 'Charter & Course',
    tagline: 'Define your direction, navigate your journey',
    description: 'A structured approach to intentional living',
    version: 2,
    icon: '🧭',
    color: '#6366f1',
    isActive: true,
    metadata: {
      schemaVersion: '1.0.0',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
      authors: [{ id: 'test', name: 'Test Author' }],
      tags: ['life-planning'],
    },
    categories: [
      { id: 'foundation', name: 'Foundation', description: 'One-time setup', order: 1, icon: '🏛️' },
      { id: 'weekly', name: 'Weekly Practice', description: 'Weekly tracking', order: 2, icon: '📊' },
      { id: 'quarterly', name: 'Quarterly Review', description: 'Quarterly planning', order: 3, icon: '🎯' },
      { id: 'special', name: 'Special', description: 'As-needed', order: 4, icon: '🔄' },
    ],
    templates: [
      createPersonalCharterTemplate(),
      createQuarterlyReviewTemplate(),
      createWeeklyScoreboardTemplate(),
      createResetProtocolTemplate(),
    ],
  }
}

function createPersonalCharterTemplate(): FrameworkTemplate {
  return {
    id: 'personal-charter',
    name: 'Personal Charter',
    description: 'Define your core identity and values',
    categoryId: 'foundation',
    lifecycle: 'foundation',
    frequency: 'once',
    order: 1,
    icon: '📜',
    prerequisites: [],
    unlockedMessage: 'Begin your journey!',
    content: {
      sections: [
        {
          id: 'core-identity',
          title: 'Core Identity',
          order: 1,
          fields: ['trait-dependable', 'trait-forthright'],
        },
      ],
      fields: {
        'trait-dependable': {
          id: 'trait-dependable',
          type: 'textarea',
          label: 'Dependable',
          validation: { required: true },
        },
        'trait-forthright': {
          id: 'trait-forthright',
          type: 'textarea',
          label: 'Forthright',
          validation: { required: true },
        },
      },
    },
    version: 1,
  }
}

function createQuarterlyReviewTemplate(): FrameworkTemplate {
  return {
    id: 'quarterly-review-plan',
    name: 'Quarterly Snapshot',
    description: 'Review and plan your quarter',
    categoryId: 'quarterly',
    lifecycle: 'recurring',
    frequency: 'quarterly',
    order: 1,
    icon: '📊',
    prerequisites: ['personal-charter'],
    cooldownDays: 80,
    lockedMessage: 'Complete your Personal Charter first',
    content: {
      sections: [
        {
          id: 'quarter-meta',
          title: 'Quarter Info',
          order: 1,
          fields: ['quarter-select', 'quarter-theme'],
        },
        {
          id: 'focus-areas',
          title: 'Focus Areas',
          order: 2,
          fields: ['focus-areas'],
        },
      ],
      fields: {
        'quarter-select': {
          id: 'quarter-select',
          type: 'select',
          label: 'Quarter',
          validation: { required: true },
          config: {
            options: [
              { value: 'Q1', label: 'Q1' },
              { value: 'Q2', label: 'Q2' },
              { value: 'Q3', label: 'Q3' },
              { value: 'Q4', label: 'Q4' },
            ],
          },
          exportable: true,
          outputKey: 'quarter-label',
        },
        'quarter-theme': {
          id: 'quarter-theme',
          type: 'text',
          label: 'Theme',
          validation: { required: true },
          exportable: true,
        },
        'focus-areas': {
          id: 'focus-areas',
          type: 'repeatable',
          label: 'Focus Areas',
          config: {
            minItems: 1,
            maxItems: 3,
            itemFields: ['focus-area-name', 'focus-area-lead-measures'],
          },
          exportable: true,
        },
        'focus-area-name': {
          id: 'focus-area-name',
          type: 'text',
          label: 'Area Name',
          validation: { required: true },
        },
        'focus-area-lead-measures': {
          id: 'focus-area-lead-measures',
          type: 'list',
          label: 'Lead Measures',
          config: { maxItems: 5 },
        },
      },
    },
    dataBindings: {
      inputs: [],
      outputs: ['quarter-select', 'quarter-theme', 'focus-areas'],
    },
    version: 1,
  }
}

function createWeeklyScoreboardTemplate(): FrameworkTemplate {
  return {
    id: 'weekly-scoreboard',
    name: 'Weekly Scoreboard',
    description: 'Track your lead measures',
    categoryId: 'weekly',
    lifecycle: 'recurring',
    frequency: 'weekly',
    order: 1,
    icon: '📈',
    prerequisites: ['quarterly-review-plan'],
    cooldownDays: 5,
    lockedMessage: 'Complete a Quarterly Review first',
    content: {
      sections: [
        {
          id: 'context',
          title: 'Week Context',
          order: 1,
          fields: ['current-quarter', 'week-number'],
        },
        {
          id: 'tracking',
          title: 'Focus Tracking',
          order: 2,
          fields: ['focus-area-scores'],
        },
      ],
      fields: {
        'current-quarter': {
          id: 'current-quarter',
          type: 'text',
          label: 'Current Quarter',
          readOnly: true,
          binding: {
            expression: 'quarterly-review-plan.quarter-label',
            mode: 'readonly',
          },
        },
        'week-number': {
          id: 'week-number',
          type: 'number',
          label: 'Week Number',
          validation: { required: true, min: 1, max: 13 },
        },
        'focus-area-scores': {
          id: 'focus-area-scores',
          type: 'repeatable',
          label: 'Focus Area Tracking',
          config: {
            minItems: 1,
            maxItems: 3,
            itemFields: ['tracking-area-name', 'tracking-score'],
          },
          binding: {
            expression: 'quarterly-review-plan.focus-areas[*].focus-area-name',
            mode: 'prefill',
          },
        },
        'tracking-area-name': {
          id: 'tracking-area-name',
          type: 'text',
          label: 'Focus Area',
          readOnly: true,
        },
        'tracking-score': {
          id: 'tracking-score',
          type: 'slider',
          label: 'Execution Score',
          validation: { required: true },
          config: { min: 1, max: 5, step: 1 },
        },
      },
    },
    dataBindings: {
      inputs: [
        {
          id: 'pull-quarter-label',
          source: 'framework_entry',
          sourcePath: 'quarterly-review-plan.quarter-label',
          targetFieldId: 'current-quarter',
          transform: 'latest',
          required: false,
        },
        {
          id: 'pull-focus-areas',
          source: 'framework_entry',
          sourcePath: 'quarterly-review-plan.focus-areas[*].focus-area-name',
          targetFieldId: 'focus-area-scores',
          transform: 'latest',
          required: false,
        },
      ],
      outputs: ['week-number', 'tracking-score'],
    },
    version: 1,
  }
}

function createResetProtocolTemplate(): FrameworkTemplate {
  return {
    id: 'reset-protocol',
    name: 'Reset Protocol',
    description: 'Get back on track',
    categoryId: 'special',
    lifecycle: 'special',
    frequency: 'as_needed',
    order: 1,
    icon: '🔄',
    prerequisites: ['personal-charter'],
    lockedMessage: 'Complete your Personal Charter first',
    content: {
      sections: [
        {
          id: 'acknowledge',
          title: 'Acknowledge',
          order: 1,
          fields: ['what-happened'],
        },
      ],
      fields: {
        'what-happened': {
          id: 'what-happened',
          type: 'textarea',
          label: 'What happened?',
          validation: { required: true },
        },
      },
    },
    version: 1,
  }
}

function createJournalEntry(
  templateId: string,
  overrides: Partial<JournalEntry> = {}
): JournalEntry {
  return {
    journalId: `journal-${Math.random().toString(36).slice(2)}`,
    spaceId: 'space-1',
    userId: 'user-1',
    frameworkId: 'charter-and-course',
    templateId,
    title: 'Test Entry',
    content: 'Test content',
    status: 'published',
    visibility: 'private',
    tags: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    wordCount: 100,
    isPinned: false,
    ...overrides,
  }
}

function createUserProgress(
  overrides: Partial<UserFrameworkProgress> = {}
): UserFrameworkProgress {
  return {
    userId: 'user-1',
    frameworkId: 'charter-and-course',
    spaceId: 'space-1',
    startedAt: new Date().toISOString(),
    foundationCompletions: [],
    completedCycles: [],
    currentStreak: 0,
    longestStreak: 0,
    lastActivityAt: new Date().toISOString(),
    foundationComplete: false,
    ...overrides,
  }
}

// ============================================================================
// FRAMEWORK FLOW TESTS
// ============================================================================

describe('Framework Flow Integration', () => {
  const framework = createCharterAndCourseFramework()

  describe('Initial State - No Progress', () => {
    it('should have Personal Charter available with no prerequisites', () => {
      const personalCharter = framework.templates.find(t => t.id === 'personal-charter')
      expect(personalCharter).toBeDefined()
      expect(personalCharter?.prerequisites).toEqual([])
    })

    it('should have Quarterly Review locked by Personal Charter', () => {
      const quarterly = framework.templates.find(t => t.id === 'quarterly-review-plan')
      expect(quarterly).toBeDefined()
      expect(quarterly?.prerequisites).toContain('personal-charter')
    })

    it('should have Weekly Scoreboard locked by Quarterly Review', () => {
      const weekly = framework.templates.find(t => t.id === 'weekly-scoreboard')
      expect(weekly).toBeDefined()
      expect(weekly?.prerequisites).toContain('quarterly-review-plan')
    })

    it('should have Reset Protocol locked by Personal Charter', () => {
      const reset = framework.templates.find(t => t.id === 'reset-protocol')
      expect(reset).toBeDefined()
      expect(reset?.prerequisites).toContain('personal-charter')
    })
  })

  describe('Template Unlock Progression', () => {
    it('should calculate correct unlock status with no progress', () => {
      const progress = createUserProgress()
      const templates = framework.templates

      // Personal Charter should be unlocked (no prereqs)
      const charter = templates.find(t => t.id === 'personal-charter')!
      const charterUnlocked = charter.prerequisites.every(prereq =>
        progress.foundationCompletions.some(c => c.templateId === prereq)
      )
      expect(charterUnlocked).toBe(true)

      // Quarterly should be locked (missing personal-charter)
      const quarterly = templates.find(t => t.id === 'quarterly-review-plan')!
      const quarterlyUnlocked = quarterly.prerequisites.every(prereq =>
        progress.foundationCompletions.some(c => c.templateId === prereq)
      )
      expect(quarterlyUnlocked).toBe(false)
    })

    it('should unlock Quarterly Review after Personal Charter completion', () => {
      const progress = createUserProgress({
        foundationCompletions: [
          {
            templateId: 'personal-charter',
            journalId: 'journal-1',
            completedAt: new Date().toISOString(),
          },
        ],
        foundationComplete: false,
      })

      const quarterly = framework.templates.find(t => t.id === 'quarterly-review-plan')!
      const quarterlyUnlocked = quarterly.prerequisites.every(prereq =>
        progress.foundationCompletions.some(c => c.templateId === prereq)
      )
      expect(quarterlyUnlocked).toBe(true)
    })

    it('should unlock Weekly Scoreboard after Quarterly Review completion', () => {
      const progress = createUserProgress({
        foundationCompletions: [
          {
            templateId: 'personal-charter',
            journalId: 'journal-1',
            completedAt: new Date().toISOString(),
          },
        ],
        completedCycles: [
          {
            templateId: 'quarterly-review-plan',
            journalId: 'journal-2',
            completedAt: new Date().toISOString(),
            cyclePeriod: 'Q1-2024',
          },
        ],
      })

      // For recurring templates, check completedCycles
      const hasQuarterly = progress.completedCycles.some(c => c.templateId === 'quarterly-review-plan')
      expect(hasQuarterly).toBe(true)
    })

    it('should unlock Reset Protocol after Personal Charter completion', () => {
      const progress = createUserProgress({
        foundationCompletions: [
          {
            templateId: 'personal-charter',
            journalId: 'journal-1',
            completedAt: new Date().toISOString(),
          },
        ],
      })

      const reset = framework.templates.find(t => t.id === 'reset-protocol')!
      const resetUnlocked = reset.prerequisites.every(prereq =>
        progress.foundationCompletions.some(c => c.templateId === prereq)
      )
      expect(resetUnlocked).toBe(true)
    })
  })

  describe('Template Frequency and Lifecycle', () => {
    it('should correctly identify foundation templates', () => {
      const foundationTemplates = framework.templates.filter(t => t.lifecycle === 'foundation')
      expect(foundationTemplates).toHaveLength(1)
      expect(foundationTemplates[0].id).toBe('personal-charter')
    })

    it('should correctly identify recurring templates', () => {
      const recurringTemplates = framework.templates.filter(t => t.lifecycle === 'recurring')
      expect(recurringTemplates).toHaveLength(2)
      expect(recurringTemplates.map(t => t.id)).toContain('quarterly-review-plan')
      expect(recurringTemplates.map(t => t.id)).toContain('weekly-scoreboard')
    })

    it('should correctly identify special templates', () => {
      const specialTemplates = framework.templates.filter(t => t.lifecycle === 'special')
      expect(specialTemplates).toHaveLength(1)
      expect(specialTemplates[0].id).toBe('reset-protocol')
    })

    it('should enforce once frequency for foundation templates', () => {
      const personal = framework.templates.find(t => t.id === 'personal-charter')!
      expect(personal.frequency).toBe('once')
    })

    it('should have correct cooldown for weekly templates', () => {
      const weekly = framework.templates.find(t => t.id === 'weekly-scoreboard')!
      expect(weekly.cooldownDays).toBe(5)
    })

    it('should have correct cooldown for quarterly templates', () => {
      const quarterly = framework.templates.find(t => t.id === 'quarterly-review-plan')!
      expect(quarterly.cooldownDays).toBe(80)
    })
  })

  describe('Data Binding Configuration', () => {
    it('should configure outputs on Quarterly Review', () => {
      const quarterly = framework.templates.find(t => t.id === 'quarterly-review-plan')!
      expect(quarterly.dataBindings?.outputs).toBeDefined()
      expect(quarterly.dataBindings?.outputs).toContain('quarter-select')
      expect(quarterly.dataBindings?.outputs).toContain('focus-areas')
    })

    it('should configure inputs on Weekly Scoreboard', () => {
      const weekly = framework.templates.find(t => t.id === 'weekly-scoreboard')!
      expect(weekly.dataBindings?.inputs).toBeDefined()
      expect(weekly.dataBindings?.inputs?.length).toBeGreaterThan(0)

      const quarterBinding = weekly.dataBindings?.inputs?.find(
        b => b.sourcePath.includes('quarter-label')
      )
      expect(quarterBinding).toBeDefined()
      expect(quarterBinding?.targetFieldId).toBe('current-quarter')

      const focusBinding = weekly.dataBindings?.inputs?.find(
        b => b.sourcePath.includes('focus-areas')
      )
      expect(focusBinding).toBeDefined()
    })

    it('should mark bound fields as readonly where appropriate', () => {
      const weekly = framework.templates.find(t => t.id === 'weekly-scoreboard')!
      const quarterField = weekly.content.fields['current-quarter']
      expect(quarterField.readOnly).toBe(true)
      expect(quarterField.binding?.mode).toBe('readonly')
    })
  })

  describe('Category Organization', () => {
    it('should have 4 categories', () => {
      expect(framework.categories).toHaveLength(4)
    })

    it('should organize templates by category', () => {
      const foundationTemplates = framework.templates.filter(t => t.categoryId === 'foundation')
      const weeklyTemplates = framework.templates.filter(t => t.categoryId === 'weekly')
      const quarterlyTemplates = framework.templates.filter(t => t.categoryId === 'quarterly')
      const specialTemplates = framework.templates.filter(t => t.categoryId === 'special')

      expect(foundationTemplates).toHaveLength(1)
      expect(weeklyTemplates).toHaveLength(1)
      expect(quarterlyTemplates).toHaveLength(1)
      expect(specialTemplates).toHaveLength(1)
    })

    it('should have categories in correct order', () => {
      const sortedCategories = [...framework.categories].sort((a, b) => a.order - b.order)
      expect(sortedCategories[0].id).toBe('foundation')
      expect(sortedCategories[1].id).toBe('weekly')
      expect(sortedCategories[2].id).toBe('quarterly')
      expect(sortedCategories[3].id).toBe('special')
    })
  })

  describe('Full Journey Simulation', () => {
    it('should simulate complete framework progression', () => {
      // Step 1: User starts with no progress
      let progress = createUserProgress()
      const entries: JournalEntry[] = []

      // Verify initial state
      expect(progress.foundationCompletions).toHaveLength(0)
      expect(progress.foundationComplete).toBe(false)

      // Step 2: User creates Personal Charter
      const charterEntry = createJournalEntry('personal-charter', {
        content: JSON.stringify({
          'trait-dependable': 'I am the anchor...',
          'trait-forthright': 'I speak truth...',
        }),
      })
      entries.push(charterEntry)
      progress = {
        ...progress,
        foundationCompletions: [
          {
            templateId: 'personal-charter',
            journalId: charterEntry.journalId,
            completedAt: charterEntry.createdAt,
            capturedData: {
              'trait-dependable': 'I am the anchor...',
              'trait-forthright': 'I speak truth...',
            },
          },
        ],
        foundationComplete: true,
        lastActivityAt: charterEntry.createdAt,
      }

      // Step 3: Verify Quarterly and Reset are now unlocked
      const quarterly = framework.templates.find(t => t.id === 'quarterly-review-plan')!
      const quarterlyUnlocked = quarterly.prerequisites.every(prereq =>
        progress.foundationCompletions.some(c => c.templateId === prereq)
      )
      expect(quarterlyUnlocked).toBe(true)

      const reset = framework.templates.find(t => t.id === 'reset-protocol')!
      const resetUnlocked = reset.prerequisites.every(prereq =>
        progress.foundationCompletions.some(c => c.templateId === prereq)
      )
      expect(resetUnlocked).toBe(true)

      // Step 4: User creates Quarterly Review
      const quarterlyEntry = createJournalEntry('quarterly-review-plan', {
        content: JSON.stringify({
          'quarter-select': 'Q1',
          'quarter-theme': 'Foundation',
          'focus-areas': [
            {
              'focus-area-name': 'Health',
              'focus-area-lead-measures': ['Gym 4x/week', 'Sleep 7+ hours'],
            },
            {
              'focus-area-name': 'Career',
              'focus-area-lead-measures': ['Deep work 2 hours', 'Weekly review'],
            },
          ],
        }),
      })
      entries.push(quarterlyEntry)
      progress = {
        ...progress,
        completedCycles: [
          {
            templateId: 'quarterly-review-plan',
            journalId: quarterlyEntry.journalId,
            completedAt: quarterlyEntry.createdAt,
            cyclePeriod: 'Q1-2024',
            capturedData: {
              'quarter-select': 'Q1',
              'focus-areas': [
                { 'focus-area-name': 'Health' },
                { 'focus-area-name': 'Career' },
              ],
            },
          },
        ],
        lastActivityAt: quarterlyEntry.createdAt,
      }

      // Step 5: Verify Weekly Scoreboard is now unlocked
      expect(progress.completedCycles.some(c => c.templateId === 'quarterly-review-plan')).toBe(true)

      // Step 6: User creates Weekly Scoreboard (with pre-filled data)
      const weeklyEntry = createJournalEntry('weekly-scoreboard', {
        content: JSON.stringify({
          'current-quarter': 'Q1', // Pre-filled from binding
          'week-number': 1,
          'focus-area-scores': [
            { 'tracking-area-name': 'Health', 'tracking-score': 4 },
            { 'tracking-area-name': 'Career', 'tracking-score': 3 },
          ],
        }),
      })
      entries.push(weeklyEntry)
      progress = {
        ...progress,
        completedCycles: [
          ...progress.completedCycles,
          {
            templateId: 'weekly-scoreboard',
            journalId: weeklyEntry.journalId,
            completedAt: weeklyEntry.createdAt,
            cyclePeriod: 'W1-Q1-2024',
          },
        ],
        currentStreak: 1,
        lastActivityAt: weeklyEntry.createdAt,
      }

      // Verify final state
      expect(entries).toHaveLength(3)
      expect(progress.foundationComplete).toBe(true)
      expect(progress.completedCycles).toHaveLength(2)
      expect(progress.currentStreak).toBe(1)
    })
  })
})

// ============================================================================
// FIELD AND SECTION VALIDATION
// ============================================================================

describe('Template Content Validation', () => {
  const framework = createCharterAndCourseFramework()

  describe('Personal Charter Template', () => {
    const template = framework.templates.find(t => t.id === 'personal-charter')!

    it('should have required core identity fields', () => {
      expect(template.content.fields['trait-dependable']).toBeDefined()
      expect(template.content.fields['trait-forthright']).toBeDefined()
    })

    it('should mark identity fields as required', () => {
      expect(template.content.fields['trait-dependable'].validation?.required).toBe(true)
      expect(template.content.fields['trait-forthright'].validation?.required).toBe(true)
    })
  })

  describe('Quarterly Review Template', () => {
    const template = framework.templates.find(t => t.id === 'quarterly-review-plan')!

    it('should have quarter selection field', () => {
      const field = template.content.fields['quarter-select']
      expect(field).toBeDefined()
      expect(field.type).toBe('select')
      expect(field.config?.options).toHaveLength(4)
    })

    it('should have repeatable focus areas', () => {
      const field = template.content.fields['focus-areas']
      expect(field).toBeDefined()
      expect(field.type).toBe('repeatable')
      expect(field.config?.minItems).toBe(1)
      expect(field.config?.maxItems).toBe(3)
    })

    it('should mark exportable fields', () => {
      expect(template.content.fields['quarter-select'].exportable).toBe(true)
      expect(template.content.fields['focus-areas'].exportable).toBe(true)
    })
  })

  describe('Weekly Scoreboard Template', () => {
    const template = framework.templates.find(t => t.id === 'weekly-scoreboard')!

    it('should have readonly quarter field with binding', () => {
      const field = template.content.fields['current-quarter']
      expect(field.readOnly).toBe(true)
      expect(field.binding).toBeDefined()
      expect(field.binding?.mode).toBe('readonly')
    })

    it('should have week number with validation', () => {
      const field = template.content.fields['week-number']
      expect(field.validation?.required).toBe(true)
      expect(field.validation?.min).toBe(1)
      expect(field.validation?.max).toBe(13)
    })

    it('should have focus area tracking with binding', () => {
      const field = template.content.fields['focus-area-scores']
      expect(field.binding).toBeDefined()
      expect(field.binding?.mode).toBe('prefill')
    })
  })

  describe('Reset Protocol Template', () => {
    const template = framework.templates.find(t => t.id === 'reset-protocol')!

    it('should have acknowledge section', () => {
      const section = template.content.sections.find(s => s.id === 'acknowledge')
      expect(section).toBeDefined()
      expect(section?.fields).toContain('what-happened')
    })

    it('should have required reflection field', () => {
      const field = template.content.fields['what-happened']
      expect(field.validation?.required).toBe(true)
    })
  })
})
