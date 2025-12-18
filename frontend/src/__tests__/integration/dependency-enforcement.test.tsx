/**
 * Dependency Enforcement Integration Tests
 *
 * Tests template locking and cooldown enforcement:
 * 1. Prerequisite chain enforcement
 * 2. Cooldown timing validation
 * 3. Lock state transitions
 * 4. Completion tracking
 *
 * @module __tests__/integration/dependency-enforcement
 */

import { describe, it, expect } from 'vitest'
import type { FrameworkTemplate, UserFrameworkProgress } from '@/features/journal/types/framework.types'

// ============================================================================
// MOCK DATA AND UTILITIES
// ============================================================================

interface TemplateUnlockState {
  templateId: string
  isLocked: boolean
  reason: 'prerequisite' | 'cooldown' | null
  lockedMessage: string | null
  availableAt: Date | null
}

interface CycleCompletion {
  templateId: string
  journalId: string
  completedAt: string
  cyclePeriod?: string
}

interface FoundationCompletion {
  templateId: string
  journalId: string
  completedAt: string
}

/**
 * Create mock templates with prerequisites
 */
function createTemplatesWithPrerequisites(): FrameworkTemplate[] {
  return [
    {
      id: 'personal-charter',
      name: 'Personal Charter',
      description: 'Foundation template',
      categoryId: 'foundation',
      lifecycle: 'foundation',
      frequency: 'once',
      order: 1,
      icon: '📜',
      prerequisites: [],
      unlockedMessage: 'Start your journey!',
      content: { sections: [], fields: {} },
      version: 1,
    },
    {
      id: 'quarterly-review-plan',
      name: 'Quarterly Snapshot',
      description: 'Quarterly planning',
      categoryId: 'quarterly',
      lifecycle: 'recurring',
      frequency: 'quarterly',
      order: 1,
      icon: '📊',
      prerequisites: ['personal-charter'],
      cooldownDays: 80,
      lockedMessage: 'Complete your Personal Charter first',
      content: { sections: [], fields: {} },
      version: 1,
    },
    {
      id: 'weekly-scoreboard',
      name: 'Weekly Scoreboard',
      description: 'Weekly tracking',
      categoryId: 'weekly',
      lifecycle: 'recurring',
      frequency: 'weekly',
      order: 1,
      icon: '📈',
      prerequisites: ['quarterly-review-plan'],
      cooldownDays: 5,
      lockedMessage: 'Complete a Quarterly Review first',
      content: { sections: [], fields: {} },
      version: 1,
    },
    {
      id: 'reset-protocol',
      name: 'Reset Protocol',
      description: 'Reset when off track',
      categoryId: 'special',
      lifecycle: 'special',
      frequency: 'as_needed',
      order: 1,
      icon: '🔄',
      prerequisites: ['personal-charter'],
      lockedMessage: 'Complete your Personal Charter first',
      content: { sections: [], fields: {} },
      version: 1,
    },
    {
      id: 'advanced-review',
      name: 'Advanced Review',
      description: 'Multi-prerequisite template',
      categoryId: 'special',
      lifecycle: 'special',
      frequency: 'as_needed',
      order: 2,
      icon: '🎯',
      prerequisites: ['personal-charter', 'quarterly-review-plan'],
      lockedMessage: 'Complete Personal Charter and Quarterly Review first',
      content: { sections: [], fields: {} },
      version: 1,
    },
  ]
}

/**
 * Check if prerequisites are met for a template
 */
function checkPrerequisitesMet(
  template: FrameworkTemplate,
  progress: UserFrameworkProgress
): boolean {
  if (template.prerequisites.length === 0) {
    return true
  }

  return template.prerequisites.every(prereqId => {
    // Check foundation completions
    const foundationComplete = progress.foundationCompletions.some(
      c => c.templateId === prereqId
    )
    if (foundationComplete) return true

    // Check cycle completions for recurring templates
    const cycleComplete = progress.completedCycles.some(
      c => c.templateId === prereqId
    )
    return cycleComplete
  })
}

/**
 * Check if a template is on cooldown
 */
function checkCooldown(
  template: FrameworkTemplate,
  progress: UserFrameworkProgress,
  now: Date
): { onCooldown: boolean; availableAt: Date | null } {
  if (!template.cooldownDays) {
    return { onCooldown: false, availableAt: null }
  }

  // Find the most recent completion of this template
  const recentCompletion = progress.completedCycles
    .filter(c => c.templateId === template.id)
    .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime())[0]

  if (!recentCompletion) {
    return { onCooldown: false, availableAt: null }
  }

  const completedAt = new Date(recentCompletion.completedAt)
  const availableAt = new Date(completedAt.getTime() + template.cooldownDays * 24 * 60 * 60 * 1000)

  if (now < availableAt) {
    return { onCooldown: true, availableAt }
  }

  return { onCooldown: false, availableAt: null }
}

/**
 * Get the full unlock state for a template
 */
function getTemplateUnlockState(
  template: FrameworkTemplate,
  progress: UserFrameworkProgress,
  now: Date
): TemplateUnlockState {
  // Check prerequisites first
  const prerequisitesMet = checkPrerequisitesMet(template, progress)
  if (!prerequisitesMet) {
    return {
      templateId: template.id,
      isLocked: true,
      reason: 'prerequisite',
      lockedMessage: template.lockedMessage || 'Complete prerequisite templates first',
      availableAt: null,
    }
  }

  // Check cooldown
  const cooldownState = checkCooldown(template, progress, now)
  if (cooldownState.onCooldown) {
    return {
      templateId: template.id,
      isLocked: true,
      reason: 'cooldown',
      lockedMessage: `Available ${cooldownState.availableAt!.toLocaleDateString()}`,
      availableAt: cooldownState.availableAt,
    }
  }

  return {
    templateId: template.id,
    isLocked: false,
    reason: null,
    lockedMessage: null,
    availableAt: null,
  }
}

/**
 * Create progress with specific completions
 */
function createProgress(
  foundationCompletions: FoundationCompletion[] = [],
  completedCycles: CycleCompletion[] = []
): UserFrameworkProgress {
  return {
    userId: 'user-1',
    frameworkId: 'charter-and-course',
    spaceId: 'space-1',
    startedAt: new Date().toISOString(),
    foundationCompletions,
    completedCycles,
    currentStreak: 0,
    longestStreak: 0,
    lastActivityAt: new Date().toISOString(),
    foundationComplete: foundationCompletions.length > 0,
  }
}

// ============================================================================
// PREREQUISITE ENFORCEMENT TESTS
// ============================================================================

describe('Prerequisite Enforcement', () => {
  const templates = createTemplatesWithPrerequisites()

  describe('No Progress State', () => {
    const progress = createProgress()

    it('should unlock templates with no prerequisites', () => {
      const charter = templates.find(t => t.id === 'personal-charter')!
      const state = getTemplateUnlockState(charter, progress, new Date())

      expect(state.isLocked).toBe(false)
      expect(state.reason).toBeNull()
    })

    it('should lock templates with unmet prerequisites', () => {
      const quarterly = templates.find(t => t.id === 'quarterly-review-plan')!
      const state = getTemplateUnlockState(quarterly, progress, new Date())

      expect(state.isLocked).toBe(true)
      expect(state.reason).toBe('prerequisite')
      expect(state.lockedMessage).toBe('Complete your Personal Charter first')
    })

    it('should lock deeply nested prerequisites', () => {
      const weekly = templates.find(t => t.id === 'weekly-scoreboard')!
      const state = getTemplateUnlockState(weekly, progress, new Date())

      expect(state.isLocked).toBe(true)
      expect(state.reason).toBe('prerequisite')
    })
  })

  describe('Single Prerequisite Completion', () => {
    const progress = createProgress([
      {
        templateId: 'personal-charter',
        journalId: 'journal-1',
        completedAt: new Date().toISOString(),
      },
    ])

    it('should unlock templates after prerequisite completion', () => {
      const quarterly = templates.find(t => t.id === 'quarterly-review-plan')!
      const state = getTemplateUnlockState(quarterly, progress, new Date())

      expect(state.isLocked).toBe(false)
    })

    it('should unlock all templates with same prerequisite', () => {
      const reset = templates.find(t => t.id === 'reset-protocol')!
      const state = getTemplateUnlockState(reset, progress, new Date())

      expect(state.isLocked).toBe(false)
    })

    it('should keep templates locked with additional prerequisites', () => {
      const advanced = templates.find(t => t.id === 'advanced-review')!
      const state = getTemplateUnlockState(advanced, progress, new Date())

      expect(state.isLocked).toBe(true)
      expect(state.reason).toBe('prerequisite')
    })
  })

  describe('Multiple Prerequisite Completion', () => {
    const progress = createProgress(
      [
        {
          templateId: 'personal-charter',
          journalId: 'journal-1',
          completedAt: new Date().toISOString(),
        },
      ],
      [
        {
          templateId: 'quarterly-review-plan',
          journalId: 'journal-2',
          completedAt: new Date().toISOString(),
          cyclePeriod: 'Q1-2024',
        },
      ]
    )

    it('should unlock templates with all prerequisites met', () => {
      const advanced = templates.find(t => t.id === 'advanced-review')!
      const state = getTemplateUnlockState(advanced, progress, new Date())

      expect(state.isLocked).toBe(false)
    })

    it('should unlock chain-dependent templates', () => {
      const weekly = templates.find(t => t.id === 'weekly-scoreboard')!
      const state = getTemplateUnlockState(weekly, progress, new Date())

      expect(state.isLocked).toBe(false)
    })
  })

  describe('Prerequisite Chain Progression', () => {
    it('should enforce strict progression order', () => {
      const templates = createTemplatesWithPrerequisites()
      let progress = createProgress()

      // Step 1: Only Personal Charter is available
      const charterState1 = getTemplateUnlockState(
        templates.find(t => t.id === 'personal-charter')!,
        progress,
        new Date()
      )
      const quarterlyState1 = getTemplateUnlockState(
        templates.find(t => t.id === 'quarterly-review-plan')!,
        progress,
        new Date()
      )
      const weeklyState1 = getTemplateUnlockState(
        templates.find(t => t.id === 'weekly-scoreboard')!,
        progress,
        new Date()
      )

      expect(charterState1.isLocked).toBe(false)
      expect(quarterlyState1.isLocked).toBe(true)
      expect(weeklyState1.isLocked).toBe(true)

      // Step 2: Complete Personal Charter
      progress = createProgress([
        {
          templateId: 'personal-charter',
          journalId: 'journal-1',
          completedAt: new Date().toISOString(),
        },
      ])

      const quarterlyState2 = getTemplateUnlockState(
        templates.find(t => t.id === 'quarterly-review-plan')!,
        progress,
        new Date()
      )
      const weeklyState2 = getTemplateUnlockState(
        templates.find(t => t.id === 'weekly-scoreboard')!,
        progress,
        new Date()
      )

      expect(quarterlyState2.isLocked).toBe(false) // Now unlocked
      expect(weeklyState2.isLocked).toBe(true) // Still locked

      // Step 3: Complete Quarterly Review
      progress = createProgress(
        [
          {
            templateId: 'personal-charter',
            journalId: 'journal-1',
            completedAt: new Date().toISOString(),
          },
        ],
        [
          {
            templateId: 'quarterly-review-plan',
            journalId: 'journal-2',
            completedAt: new Date().toISOString(),
            cyclePeriod: 'Q1-2024',
          },
        ]
      )

      const weeklyState3 = getTemplateUnlockState(
        templates.find(t => t.id === 'weekly-scoreboard')!,
        progress,
        new Date()
      )

      expect(weeklyState3.isLocked).toBe(false) // Now unlocked
    })
  })
})

// ============================================================================
// COOLDOWN ENFORCEMENT TESTS
// ============================================================================

describe('Cooldown Enforcement', () => {
  const templates = createTemplatesWithPrerequisites()

  describe('No Previous Completions', () => {
    const progress = createProgress(
      [
        {
          templateId: 'personal-charter',
          journalId: 'journal-1',
          completedAt: new Date().toISOString(),
        },
      ],
      [
        {
          templateId: 'quarterly-review-plan',
          journalId: 'journal-2',
          completedAt: new Date().toISOString(),
          cyclePeriod: 'Q1-2024',
        },
      ]
    )

    it('should allow first completion of recurring template', () => {
      const weekly = templates.find(t => t.id === 'weekly-scoreboard')!
      const state = getTemplateUnlockState(weekly, progress, new Date())

      expect(state.isLocked).toBe(false)
      expect(state.reason).toBeNull()
    })
  })

  describe('Within Cooldown Period', () => {
    it('should lock template during cooldown', () => {
      const now = new Date('2024-03-15T12:00:00Z')
      const completedAt = new Date('2024-03-13T12:00:00Z') // 2 days ago

      const progress = createProgress(
        [
          {
            templateId: 'personal-charter',
            journalId: 'journal-1',
            completedAt: new Date('2024-01-01').toISOString(),
          },
        ],
        [
          {
            templateId: 'quarterly-review-plan',
            journalId: 'journal-2',
            completedAt: new Date('2024-01-15').toISOString(),
            cyclePeriod: 'Q1-2024',
          },
          {
            templateId: 'weekly-scoreboard',
            journalId: 'journal-3',
            completedAt: completedAt.toISOString(),
            cyclePeriod: 'W11-Q1-2024',
          },
        ]
      )

      const weekly = templates.find(t => t.id === 'weekly-scoreboard')!
      const state = getTemplateUnlockState(weekly, progress, now)

      expect(state.isLocked).toBe(true)
      expect(state.reason).toBe('cooldown')
      expect(state.availableAt).not.toBeNull()
    })

    it('should calculate correct available date', () => {
      const now = new Date('2024-03-15T12:00:00Z')
      const completedAt = new Date('2024-03-13T12:00:00Z') // 2 days ago
      const expectedAvailable = new Date('2024-03-18T12:00:00Z') // 5 days cooldown

      const progress = createProgress(
        [
          {
            templateId: 'personal-charter',
            journalId: 'journal-1',
            completedAt: new Date('2024-01-01').toISOString(),
          },
        ],
        [
          {
            templateId: 'quarterly-review-plan',
            journalId: 'journal-2',
            completedAt: new Date('2024-01-15').toISOString(),
            cyclePeriod: 'Q1-2024',
          },
          {
            templateId: 'weekly-scoreboard',
            journalId: 'journal-3',
            completedAt: completedAt.toISOString(),
            cyclePeriod: 'W11-Q1-2024',
          },
        ]
      )

      const weekly = templates.find(t => t.id === 'weekly-scoreboard')!
      const state = getTemplateUnlockState(weekly, progress, now)

      expect(state.availableAt?.toISOString()).toBe(expectedAvailable.toISOString())
    })
  })

  describe('After Cooldown Period', () => {
    it('should unlock template after cooldown expires', () => {
      const completedAt = new Date('2024-03-10T12:00:00Z')
      const now = new Date('2024-03-20T12:00:00Z') // 10 days later (> 5 day cooldown)

      const progress = createProgress(
        [
          {
            templateId: 'personal-charter',
            journalId: 'journal-1',
            completedAt: new Date('2024-01-01').toISOString(),
          },
        ],
        [
          {
            templateId: 'quarterly-review-plan',
            journalId: 'journal-2',
            completedAt: new Date('2024-01-15').toISOString(),
            cyclePeriod: 'Q1-2024',
          },
          {
            templateId: 'weekly-scoreboard',
            journalId: 'journal-3',
            completedAt: completedAt.toISOString(),
            cyclePeriod: 'W10-Q1-2024',
          },
        ]
      )

      const weekly = templates.find(t => t.id === 'weekly-scoreboard')!
      const state = getTemplateUnlockState(weekly, progress, now)

      expect(state.isLocked).toBe(false)
      expect(state.reason).toBeNull()
    })

    it('should use most recent completion for cooldown calculation', () => {
      const firstCompletion = new Date('2024-03-01T12:00:00Z')
      const secondCompletion = new Date('2024-03-15T12:00:00Z')
      const now = new Date('2024-03-18T12:00:00Z') // 3 days after second

      const progress = createProgress(
        [
          {
            templateId: 'personal-charter',
            journalId: 'journal-1',
            completedAt: new Date('2024-01-01').toISOString(),
          },
        ],
        [
          {
            templateId: 'quarterly-review-plan',
            journalId: 'journal-2',
            completedAt: new Date('2024-01-15').toISOString(),
            cyclePeriod: 'Q1-2024',
          },
          {
            templateId: 'weekly-scoreboard',
            journalId: 'journal-3',
            completedAt: firstCompletion.toISOString(),
            cyclePeriod: 'W9-Q1-2024',
          },
          {
            templateId: 'weekly-scoreboard',
            journalId: 'journal-4',
            completedAt: secondCompletion.toISOString(),
            cyclePeriod: 'W11-Q1-2024',
          },
        ]
      )

      const weekly = templates.find(t => t.id === 'weekly-scoreboard')!
      const state = getTemplateUnlockState(weekly, progress, now)

      // Should be locked because 3 days < 5 day cooldown from second completion
      expect(state.isLocked).toBe(true)
      expect(state.reason).toBe('cooldown')
    })
  })

  describe('Quarterly Template Cooldown', () => {
    it('should enforce 80-day cooldown for quarterly templates', () => {
      const completedAt = new Date('2024-01-15T12:00:00Z')
      const now = new Date('2024-03-01T12:00:00Z') // 45 days later

      const progress = createProgress(
        [
          {
            templateId: 'personal-charter',
            journalId: 'journal-1',
            completedAt: new Date('2024-01-01').toISOString(),
          },
        ],
        [
          {
            templateId: 'quarterly-review-plan',
            journalId: 'journal-2',
            completedAt: completedAt.toISOString(),
            cyclePeriod: 'Q1-2024',
          },
        ]
      )

      const quarterly = templates.find(t => t.id === 'quarterly-review-plan')!
      const state = getTemplateUnlockState(quarterly, progress, now)

      expect(state.isLocked).toBe(true)
      expect(state.reason).toBe('cooldown')
    })

    it('should unlock quarterly after 80 days', () => {
      const completedAt = new Date('2024-01-01T12:00:00Z')
      const now = new Date('2024-03-25T12:00:00Z') // 84 days later

      const progress = createProgress(
        [
          {
            templateId: 'personal-charter',
            journalId: 'journal-1',
            completedAt: new Date('2024-01-01').toISOString(),
          },
        ],
        [
          {
            templateId: 'quarterly-review-plan',
            journalId: 'journal-2',
            completedAt: completedAt.toISOString(),
            cyclePeriod: 'Q1-2024',
          },
        ]
      )

      const quarterly = templates.find(t => t.id === 'quarterly-review-plan')!
      const state = getTemplateUnlockState(quarterly, progress, now)

      expect(state.isLocked).toBe(false)
    })
  })
})

// ============================================================================
// LOCK STATE TRANSITIONS
// ============================================================================

describe('Lock State Transitions', () => {
  const templates = createTemplatesWithPrerequisites()

  it('should transition from prerequisite-locked to unlocked', () => {
    const quarterly = templates.find(t => t.id === 'quarterly-review-plan')!

    // Initial state: locked
    const progress1 = createProgress()
    const state1 = getTemplateUnlockState(quarterly, progress1, new Date())
    expect(state1.isLocked).toBe(true)
    expect(state1.reason).toBe('prerequisite')

    // After completion: unlocked
    const progress2 = createProgress([
      {
        templateId: 'personal-charter',
        journalId: 'journal-1',
        completedAt: new Date().toISOString(),
      },
    ])
    const state2 = getTemplateUnlockState(quarterly, progress2, new Date())
    expect(state2.isLocked).toBe(false)
  })

  it('should transition from unlocked to cooldown-locked after completion', () => {
    const weekly = templates.find(t => t.id === 'weekly-scoreboard')!
    const completedAt = new Date('2024-03-15T12:00:00Z')

    // After prerequisite completion but no weekly yet
    const progress1 = createProgress(
      [
        {
          templateId: 'personal-charter',
          journalId: 'journal-1',
          completedAt: new Date('2024-01-01').toISOString(),
        },
      ],
      [
        {
          templateId: 'quarterly-review-plan',
          journalId: 'journal-2',
          completedAt: new Date('2024-01-15').toISOString(),
          cyclePeriod: 'Q1-2024',
        },
      ]
    )
    const state1 = getTemplateUnlockState(weekly, progress1, completedAt)
    expect(state1.isLocked).toBe(false)

    // After completing weekly
    const progress2 = createProgress(
      [
        {
          templateId: 'personal-charter',
          journalId: 'journal-1',
          completedAt: new Date('2024-01-01').toISOString(),
        },
      ],
      [
        {
          templateId: 'quarterly-review-plan',
          journalId: 'journal-2',
          completedAt: new Date('2024-01-15').toISOString(),
          cyclePeriod: 'Q1-2024',
        },
        {
          templateId: 'weekly-scoreboard',
          journalId: 'journal-3',
          completedAt: completedAt.toISOString(),
          cyclePeriod: 'W11-Q1-2024',
        },
      ]
    )
    const now = new Date('2024-03-16T12:00:00Z') // 1 day later
    const state2 = getTemplateUnlockState(weekly, progress2, now)
    expect(state2.isLocked).toBe(true)
    expect(state2.reason).toBe('cooldown')
  })

  it('should transition from cooldown-locked back to unlocked', () => {
    const weekly = templates.find(t => t.id === 'weekly-scoreboard')!
    const completedAt = new Date('2024-03-10T12:00:00Z')

    const progress = createProgress(
      [
        {
          templateId: 'personal-charter',
          journalId: 'journal-1',
          completedAt: new Date('2024-01-01').toISOString(),
        },
      ],
      [
        {
          templateId: 'quarterly-review-plan',
          journalId: 'journal-2',
          completedAt: new Date('2024-01-15').toISOString(),
          cyclePeriod: 'Q1-2024',
        },
        {
          templateId: 'weekly-scoreboard',
          journalId: 'journal-3',
          completedAt: completedAt.toISOString(),
          cyclePeriod: 'W10-Q1-2024',
        },
      ]
    )

    // During cooldown
    const duringCooldown = new Date('2024-03-12T12:00:00Z')
    const state1 = getTemplateUnlockState(weekly, progress, duringCooldown)
    expect(state1.isLocked).toBe(true)
    expect(state1.reason).toBe('cooldown')

    // After cooldown
    const afterCooldown = new Date('2024-03-20T12:00:00Z')
    const state2 = getTemplateUnlockState(weekly, progress, afterCooldown)
    expect(state2.isLocked).toBe(false)
  })
})

// ============================================================================
// COMPLETION TRACKING
// ============================================================================

describe('Completion Tracking', () => {
  it('should track foundation completions separately from cycles', () => {
    const progress = createProgress(
      [
        {
          templateId: 'personal-charter',
          journalId: 'journal-1',
          completedAt: '2024-01-15T12:00:00Z',
        },
      ],
      [
        {
          templateId: 'quarterly-review-plan',
          journalId: 'journal-2',
          completedAt: '2024-01-20T12:00:00Z',
          cyclePeriod: 'Q1-2024',
        },
      ]
    )

    expect(progress.foundationCompletions).toHaveLength(1)
    expect(progress.completedCycles).toHaveLength(1)
    expect(progress.foundationComplete).toBe(true)
  })

  it('should identify incomplete foundations', () => {
    const progress = createProgress()

    expect(progress.foundationCompletions).toHaveLength(0)
    expect(progress.foundationComplete).toBe(false)
  })

  it('should track multiple cycle completions', () => {
    const progress = createProgress(
      [
        {
          templateId: 'personal-charter',
          journalId: 'journal-1',
          completedAt: '2024-01-01T12:00:00Z',
        },
      ],
      [
        {
          templateId: 'weekly-scoreboard',
          journalId: 'journal-2',
          completedAt: '2024-03-01T12:00:00Z',
          cyclePeriod: 'W9-Q1-2024',
        },
        {
          templateId: 'weekly-scoreboard',
          journalId: 'journal-3',
          completedAt: '2024-03-08T12:00:00Z',
          cyclePeriod: 'W10-Q1-2024',
        },
        {
          templateId: 'weekly-scoreboard',
          journalId: 'journal-4',
          completedAt: '2024-03-15T12:00:00Z',
          cyclePeriod: 'W11-Q1-2024',
        },
      ]
    )

    const weeklyCompletions = progress.completedCycles.filter(
      c => c.templateId === 'weekly-scoreboard'
    )
    expect(weeklyCompletions).toHaveLength(3)
  })
})

// ============================================================================
// EDGE CASES
// ============================================================================

describe('Edge Cases', () => {
  const templates = createTemplatesWithPrerequisites()

  it('should handle templates with no cooldown', () => {
    const reset = templates.find(t => t.id === 'reset-protocol')!

    const progress = createProgress(
      [
        {
          templateId: 'personal-charter',
          journalId: 'journal-1',
          completedAt: new Date().toISOString(),
        },
      ],
      [
        {
          templateId: 'reset-protocol',
          journalId: 'journal-2',
          completedAt: new Date().toISOString(),
        },
      ]
    )

    const state = getTemplateUnlockState(reset, progress, new Date())

    // Reset Protocol has no cooldown, should always be available after prereqs
    expect(state.isLocked).toBe(false)
  })

  it('should handle simultaneous prerequisite and cooldown checks', () => {
    const quarterly = templates.find(t => t.id === 'quarterly-review-plan')!
    const completedAt = new Date('2024-01-15T12:00:00Z')
    const now = new Date('2024-01-20T12:00:00Z') // 5 days later

    // Has prerequisite completed AND has a recent completion
    const progress = createProgress(
      [
        {
          templateId: 'personal-charter',
          journalId: 'journal-1',
          completedAt: '2024-01-01T12:00:00Z',
        },
      ],
      [
        {
          templateId: 'quarterly-review-plan',
          journalId: 'journal-2',
          completedAt: completedAt.toISOString(),
          cyclePeriod: 'Q1-2024',
        },
      ]
    )

    const state = getTemplateUnlockState(quarterly, progress, now)

    // Prerequisite is met, but cooldown is active
    expect(state.isLocked).toBe(true)
    expect(state.reason).toBe('cooldown')
  })

  it('should handle empty prerequisite arrays', () => {
    const charter = templates.find(t => t.id === 'personal-charter')!
    expect(charter.prerequisites).toEqual([])

    const progress = createProgress()
    const state = getTemplateUnlockState(charter, progress, new Date())

    expect(state.isLocked).toBe(false)
  })

  it('should handle zero cooldown days', () => {
    const templateWithZeroCooldown: FrameworkTemplate = {
      id: 'instant-repeat',
      name: 'Instant Repeat',
      description: 'No cooldown template',
      categoryId: 'special',
      lifecycle: 'special',
      frequency: 'as_needed',
      order: 1,
      icon: '⚡',
      prerequisites: [],
      cooldownDays: 0,
      content: { sections: [], fields: {} },
      version: 1,
    }

    const progress = createProgress([], [
      {
        templateId: 'instant-repeat',
        journalId: 'journal-1',
        completedAt: new Date().toISOString(),
      },
    ])

    const cooldownState = checkCooldown(templateWithZeroCooldown, progress, new Date())
    expect(cooldownState.onCooldown).toBe(false)
  })
})
