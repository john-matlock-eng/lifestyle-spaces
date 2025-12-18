/**
 * Hook for fetching and computing framework progress data
 *
 * @module journal/hooks/useFrameworkProgress
 */

import { useState, useEffect, useCallback, useMemo } from 'react'
import { journalApi } from '../services/journalApi'
import { getFrameworkRegistry } from '../frameworks'
import type { Framework, TemplateFrequency } from '../types/framework.types'
import type { JournalEntry } from '../types/journal.types'

/**
 * Template completion status
 */
export interface TemplateProgress {
  templateId: string
  templateName: string
  lifecycle: 'foundation' | 'recurring' | 'milestone' | 'special'
  frequency: TemplateFrequency
  isCompleted: boolean
  completionCount: number
  lastCompletedAt?: string
  lastEntryId?: string
  isLocked: boolean
  missingPrerequisites: string[]
  // For recurring templates
  currentStreak?: number
  longestStreak?: number
  lastDueDate?: string
  nextDueDate?: string
  isOverdue?: boolean
}

/**
 * Framework progress summary
 */
export interface FrameworkProgress {
  frameworkId: string
  framework: Framework
  // Foundation progress
  foundationTotal: number
  foundationCompleted: number
  foundationPercent: number
  // Recurring progress
  recurringTotal: number
  recurringActive: number // Templates that have been started
  // Template details
  templates: TemplateProgress[]
  // Next action
  nextTemplate?: TemplateProgress
  // Activity
  totalEntries: number
  recentEntries: JournalEntry[]
  lastActivityAt?: string
  // Streaks
  dailyStreak: number
  weeklyStreak: number
  monthlyStreak: number
  // Status
  isStarted: boolean
  isFoundationComplete: boolean
}

/**
 * Calculate streak for a recurring template
 */
function calculateStreak(
  entries: JournalEntry[],
  templateId: string,
  frequency: TemplateFrequency
): { current: number; longest: number; isOverdue: boolean; nextDue?: string } {
  const templateEntries = entries
    .filter(e => e.templateId === templateId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  if (templateEntries.length === 0) {
    return { current: 0, longest: 0, isOverdue: false }
  }

  const now = new Date()
  const lastEntry = new Date(templateEntries[0].createdAt)

  // Calculate expected interval in days
  const intervalDays: Record<TemplateFrequency, number> = {
    'once': Infinity,
    'daily': 1,
    'weekly': 7,
    'monthly': 30,
    'quarterly': 90,
    'yearly': 365,
    'as_needed': Infinity,
  }

  const interval = intervalDays[frequency] || Infinity
  if (interval === Infinity) {
    return { current: templateEntries.length, longest: templateEntries.length, isOverdue: false }
  }

  // Calculate if overdue
  const daysSinceLastEntry = Math.floor((now.getTime() - lastEntry.getTime()) / (1000 * 60 * 60 * 24))
  const isOverdue = daysSinceLastEntry > interval * 1.5 // Give 50% grace period

  // Calculate next due date
  const nextDue = new Date(lastEntry)
  nextDue.setDate(nextDue.getDate() + interval)

  // Calculate current streak
  let currentStreak = 0
  let longestStreak = 0
  let tempStreak = 0
  let previousDate: Date | null = null

  for (const entry of templateEntries) {
    const entryDate = new Date(entry.createdAt)

    if (!previousDate) {
      tempStreak = 1
    } else {
      const daysBetween = Math.floor((previousDate.getTime() - entryDate.getTime()) / (1000 * 60 * 60 * 24))

      if (daysBetween <= interval * 1.5) {
        tempStreak++
      } else {
        // Streak broken
        if (currentStreak === 0) {
          currentStreak = tempStreak
        }
        longestStreak = Math.max(longestStreak, tempStreak)
        tempStreak = 1
      }
    }

    previousDate = entryDate
  }

  // Finalize streaks
  if (currentStreak === 0 && !isOverdue) {
    currentStreak = tempStreak
  }
  longestStreak = Math.max(longestStreak, tempStreak)

  return {
    current: isOverdue ? 0 : currentStreak,
    longest: longestStreak,
    isOverdue,
    nextDue: nextDue.toISOString(),
  }
}

/**
 * Hook for fetching framework progress
 */
export function useFrameworkProgress(spaceId: string | undefined) {
  const [frameworkProgress, setFrameworkProgress] = useState<FrameworkProgress[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadProgress = useCallback(async () => {
    if (!spaceId) {
      setFrameworkProgress([])
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Fetch all journals for this space
      const response = await journalApi.getSpaceJournals(spaceId, { pageSize: 500 })
      const journals = response.journals

      // Get all frameworks
      const registry = getFrameworkRegistry()
      const frameworks = registry.getAll()

      // Calculate progress for each framework
      const progress: FrameworkProgress[] = frameworks.map(framework => {
        // Filter journals for this framework
        const frameworkJournals = journals.filter(j => j.frameworkId === framework.id)

        // Build completion map
        const completedTemplates = new Set<string>()
        const templateEntries: Record<string, JournalEntry[]> = {}

        for (const journal of frameworkJournals) {
          if (journal.templateId) {
            completedTemplates.add(journal.templateId)
            if (!templateEntries[journal.templateId]) {
              templateEntries[journal.templateId] = []
            }
            templateEntries[journal.templateId].push(journal)
          }
        }

        // Calculate template progress
        const templates: TemplateProgress[] = framework.templates.map(template => {
          const templateId = template.templateId || template.id || ''
          const entries = templateEntries[templateId] || []
          const isCompleted = completedTemplates.has(templateId)

          // Check prerequisites
          const missingPrerequisites = (template.prerequisites || []).filter(
            prereqId => !completedTemplates.has(prereqId)
          )
          const isLocked = missingPrerequisites.length > 0

          // Calculate streaks for recurring templates
          const frequency = template.frequency || 'once'
          const streakData = template.lifecycle === 'recurring' || template.lifecycle === 'foundation'
            ? calculateStreak(frameworkJournals, templateId, frequency)
            : { current: 0, longest: 0, isOverdue: false }

          const lastEntry = entries.sort((a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          )[0]

          return {
            templateId,
            templateName: template.name || 'Untitled',
            lifecycle: template.lifecycle || 'recurring',
            frequency,
            isCompleted,
            completionCount: entries.length,
            lastCompletedAt: lastEntry?.createdAt,
            lastEntryId: lastEntry?.journalId,
            isLocked,
            missingPrerequisites,
            currentStreak: streakData.current,
            longestStreak: streakData.longest,
            isOverdue: streakData.isOverdue,
            nextDueDate: streakData.nextDue,
          }
        })

        // Calculate foundation progress
        const foundationTemplates = templates.filter(t => t.lifecycle === 'foundation')
        const foundationCompleted = foundationTemplates.filter(t => t.isCompleted).length

        // Calculate recurring stats
        const recurringTemplates = templates.filter(t => t.lifecycle === 'recurring')
        const recurringActive = recurringTemplates.filter(t => t.completionCount > 0).length

        // Find next template to work on
        const nextTemplate = templates.find(t => !t.isLocked && !t.isCompleted && t.lifecycle === 'foundation')
          || templates.find(t => !t.isLocked && t.lifecycle === 'recurring' && t.isOverdue)
          || templates.find(t => !t.isLocked && t.lifecycle === 'recurring')

        // Calculate overall streaks
        const dailyTemplates = templates.filter(t => t.frequency === 'daily')
        const weeklyTemplates = templates.filter(t => t.frequency === 'weekly')
        const monthlyTemplates = templates.filter(t => t.frequency === 'monthly')

        const dailyStreak = dailyTemplates.length > 0
          ? Math.min(...dailyTemplates.map(t => t.currentStreak || 0))
          : 0
        const weeklyStreak = weeklyTemplates.length > 0
          ? Math.min(...weeklyTemplates.map(t => t.currentStreak || 0))
          : 0
        const monthlyStreak = monthlyTemplates.length > 0
          ? Math.min(...monthlyTemplates.map(t => t.currentStreak || 0))
          : 0

        // Recent entries (last 5)
        const recentEntries = frameworkJournals
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .slice(0, 5)

        return {
          frameworkId: framework.id,
          framework,
          foundationTotal: foundationTemplates.length,
          foundationCompleted,
          foundationPercent: foundationTemplates.length > 0
            ? Math.round((foundationCompleted / foundationTemplates.length) * 100)
            : 0,
          recurringTotal: recurringTemplates.length,
          recurringActive,
          templates,
          nextTemplate,
          totalEntries: frameworkJournals.length,
          recentEntries,
          lastActivityAt: recentEntries[0]?.createdAt,
          dailyStreak,
          weeklyStreak,
          monthlyStreak,
          isStarted: frameworkJournals.length > 0,
          isFoundationComplete: foundationCompleted === foundationTemplates.length && foundationTemplates.length > 0,
        }
      })

      // Sort: started frameworks first, then by last activity
      progress.sort((a, b) => {
        if (a.isStarted && !b.isStarted) return -1
        if (!a.isStarted && b.isStarted) return 1
        if (a.lastActivityAt && b.lastActivityAt) {
          return new Date(b.lastActivityAt).getTime() - new Date(a.lastActivityAt).getTime()
        }
        return 0
      })

      setFrameworkProgress(progress)
    } catch (err) {
      console.error('Failed to load framework progress:', err)
      setError(err instanceof Error ? err.message : 'Failed to load framework progress')
    } finally {
      setLoading(false)
    }
  }, [spaceId])

  useEffect(() => {
    loadProgress()
  }, [loadProgress])

  // Memoize active frameworks (started ones)
  const activeFrameworks = useMemo(
    () => frameworkProgress.filter(fp => fp.isStarted),
    [frameworkProgress]
  )

  // Memoize available frameworks (not started)
  const availableFrameworks = useMemo(
    () => frameworkProgress.filter(fp => !fp.isStarted),
    [frameworkProgress]
  )

  return {
    frameworkProgress,
    activeFrameworks,
    availableFrameworks,
    loading,
    error,
    refresh: loadProgress,
  }
}
