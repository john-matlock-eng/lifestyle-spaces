/**
 * Dependency Resolver
 *
 * Combines dependency graph traversal with cooldown management to
 * evaluate which templates are unlocked for a user.
 *
 * @module DependencyResolver
 */

import type {
  Framework,
  FrameworkTemplate,
  UserFrameworkProgress,
  UnlockEvaluation,
  UnlockBlockReason,
  UnlockCondition,
} from '../../types/framework.types'
import type { JournalEntry } from '../../types/journal.types'
import { DependencyGraph, buildGraph } from './DependencyGraph'
import { CooldownManager, type CooldownOptions, type CooldownResult } from './CooldownManager'

// ============================================================================
// TYPES
// ============================================================================

/**
 * Options for the dependency resolver
 */
export interface DependencyResolverOptions extends CooldownOptions {
  /** Whether to include detailed block reasons */
  includeDetails?: boolean
}

/**
 * Summary of all template unlock statuses
 */
export interface UnlockSummary {
  /** All template evaluations */
  evaluations: Map<string, UnlockEvaluation>
  /** Templates that are fully unlocked */
  unlockedTemplates: string[]
  /** Templates that are locked */
  lockedTemplates: string[]
  /** Templates in cooldown (unlocked but waiting) */
  cooldownTemplates: string[]
  /** Templates with missing prerequisites */
  blockedByPrerequisites: string[]
  /** Foundation templates that are incomplete */
  incompleteFoundations: string[]
  /** Completion percentage */
  completionPercent: number
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Check if a template has been completed (has at least one entry)
 */
function hasEntry(templateId: string, entries: JournalEntry[]): boolean {
  return entries.some((e) => e.templateId === templateId)
}

/**
 * Get all entries for a template
 */
function getEntriesForTemplate(templateId: string, entries: JournalEntry[]): JournalEntry[] {
  return entries.filter((e) => e.templateId === templateId)
}

/**
 * Count entries for a template
 */
function countEntries(templateId: string, entries: JournalEntry[]): number {
  return getEntriesForTemplate(templateId, entries).length
}

/**
 * Get the latest entry for a template
 */
function getLatestEntry(templateId: string, entries: JournalEntry[]): JournalEntry | undefined {
  const templateEntries = getEntriesForTemplate(templateId, entries)
  if (templateEntries.length === 0) return undefined
  return templateEntries.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )[0]
}

/**
 * Calculate days elapsed since a date
 */
function daysElapsedSince(date: Date, now: Date): number {
  const diffMs = now.getTime() - date.getTime()
  return Math.floor(diffMs / (1000 * 60 * 60 * 24))
}

// ============================================================================
// DEPENDENCY RESOLVER CLASS
// ============================================================================

/**
 * Dependency Resolver
 *
 * Main class for evaluating template unlock status based on
 * prerequisites, cooldowns, and custom unlock conditions.
 */
export class DependencyResolver {
  private readonly framework: Framework
  private readonly graph: DependencyGraph
  private readonly cooldownManager: CooldownManager
  private readonly options: DependencyResolverOptions
  private readonly templateMap: Map<string, FrameworkTemplate>

  constructor(framework: Framework, options: DependencyResolverOptions = {}) {
    this.framework = framework
    this.graph = buildGraph(framework)
    this.cooldownManager = new CooldownManager(options)
    this.options = options
    this.templateMap = new Map(
      framework.templates
        .filter((t) => t.templateId || t.id)
        .map((t) => [t.templateId || t.id || '', t as FrameworkTemplate])
    )
  }

  /**
   * Get the dependency graph
   */
  getGraph(): DependencyGraph {
    return this.graph
  }

  /**
   * Get a template by ID
   */
  getTemplate(templateId: string): FrameworkTemplate | undefined {
    return this.templateMap.get(templateId)
  }

  /**
   * Check if all prerequisites for a template are satisfied
   */
  private checkPrerequisites(
    template: FrameworkTemplate,
    entries: JournalEntry[]
  ): {
    satisfied: boolean
    missing: string[]
    blockReasons: UnlockBlockReason[]
  } {
    const missing: string[] = []
    const blockReasons: UnlockBlockReason[] = []

    // Get all transitive dependencies (ancestors)
    const allDependencies = this.graph.getAncestors(template.id)
    const directDependencies = this.graph.getDirectDependencies(template.id)

    // Check each direct prerequisite
    for (const prereqId of directDependencies) {
      if (!hasEntry(prereqId, entries)) {
        missing.push(prereqId)
        const prereqTemplate = this.templateMap.get(prereqId)
        blockReasons.push({
          type: 'prerequisite',
          templateId: prereqId,
          message: prereqTemplate
            ? `Complete "${prereqTemplate.name}" first.`
            : `Complete prerequisite "${prereqId}" first.`,
          progress: 0,
        })
      }
    }

    // Also check transitive dependencies that aren't direct prerequisites
    for (const ancestorId of allDependencies) {
      if (!directDependencies.includes(ancestorId) && !hasEntry(ancestorId, entries)) {
        // This is a transitive dependency that's missing
        const ancestorTemplate = this.templateMap.get(ancestorId)
        if (!missing.includes(ancestorId)) {
          missing.push(ancestorId)
          blockReasons.push({
            type: 'prerequisite',
            templateId: ancestorId,
            message: ancestorTemplate
              ? `"${ancestorTemplate.name}" is also required (transitive dependency).`
              : `"${ancestorId}" is also required (transitive dependency).`,
            progress: 0,
          })
        }
      }
    }

    return {
      satisfied: missing.length === 0,
      missing,
      blockReasons,
    }
  }

  /**
   * Evaluate a custom unlock condition
   */
  private evaluateCondition(
    condition: UnlockCondition,
    entries: JournalEntry[],
    now: Date
  ): {
    satisfied: boolean
    blockReason?: UnlockBlockReason
  } {
    switch (condition.type) {
      case 'template_count': {
        if (!condition.templateId || !condition.minCount) {
          return { satisfied: true }
        }
        const count = countEntries(condition.templateId, entries)
        const satisfied = count >= condition.minCount
        if (!satisfied) {
          return {
            satisfied: false,
            blockReason: {
              type: 'condition',
              templateId: condition.templateId,
              message: condition.description,
              progress: Math.round((count / condition.minCount) * 100),
            },
          }
        }
        return { satisfied: true }
      }

      case 'days_elapsed': {
        if (!condition.templateId || !condition.minDays) {
          return { satisfied: true }
        }
        const latestEntry = getLatestEntry(condition.templateId, entries)
        if (!latestEntry) {
          return {
            satisfied: false,
            blockReason: {
              type: 'condition',
              templateId: condition.templateId,
              message: condition.description,
              progress: 0,
            },
          }
        }
        const daysElapsed = daysElapsedSince(new Date(latestEntry.createdAt), now)
        const satisfied = daysElapsed >= condition.minDays
        if (!satisfied) {
          return {
            satisfied: false,
            blockReason: {
              type: 'condition',
              templateId: condition.templateId,
              message: condition.description,
              progress: Math.round((daysElapsed / condition.minDays) * 100),
            },
          }
        }
        return { satisfied: true }
      }

      case 'streak': {
        // Streak conditions would need more complex logic
        // For now, just check if minCount entries exist
        if (!condition.minCount) {
          return { satisfied: true }
        }
        // Simplified: check if there are at least minCount total entries
        const totalEntries = entries.length
        const satisfied = totalEntries >= condition.minCount
        if (!satisfied) {
          return {
            satisfied: false,
            blockReason: {
              type: 'condition',
              message: condition.description,
              progress: Math.round((totalEntries / condition.minCount) * 100),
            },
          }
        }
        return { satisfied: true }
      }

      case 'field_value': {
        // Field value conditions require access to entry data
        // This is a simplified implementation
        if (!condition.templateId || !condition.fieldId) {
          return { satisfied: true }
        }
        const latestEntry = getLatestEntry(condition.templateId, entries)
        if (!latestEntry) {
          return {
            satisfied: false,
            blockReason: {
              type: 'condition',
              templateId: condition.templateId,
              message: condition.description,
              progress: 0,
            },
          }
        }
        // Would need to parse entry content to check field value
        // For now, treat as satisfied if entry exists
        return { satisfied: true }
      }

      case 'custom': {
        // Custom conditions would need a registry of evaluators
        // For now, treat as satisfied
        return { satisfied: true }
      }

      default:
        return { satisfied: true }
    }
  }

  /**
   * Check all unlock conditions for a template
   */
  private checkUnlockConditions(
    template: FrameworkTemplate,
    entries: JournalEntry[],
    now: Date
  ): {
    satisfied: boolean
    blockReasons: UnlockBlockReason[]
  } {
    if (!template.unlockConditions || template.unlockConditions.length === 0) {
      return { satisfied: true, blockReasons: [] }
    }

    const blockReasons: UnlockBlockReason[] = []

    for (const condition of template.unlockConditions) {
      const result = this.evaluateCondition(condition, entries, now)
      if (!result.satisfied && result.blockReason) {
        blockReasons.push(result.blockReason)
      }
    }

    return {
      satisfied: blockReasons.length === 0,
      blockReasons,
    }
  }

  /**
   * Evaluate the unlock status of a single template
   */
  evaluateUnlock(
    templateId: string,
    progress: UserFrameworkProgress,
    entries: JournalEntry[]
  ): UnlockEvaluation {
    const template = this.templateMap.get(templateId)
    if (!template) {
      return {
        isUnlocked: false,
        blockReasons: [
          {
            type: 'prerequisite',
            message: `Template "${templateId}" not found in framework.`,
          },
        ],
        missingPrerequisites: [],
        progressPercent: 0,
        statusMessage: `Template not found.`,
      }
    }

    const now = this.options.now || new Date()
    const blockReasons: UnlockBlockReason[] = []
    const missingPrerequisites: string[] = []

    // 1. Check foundation status if this is a recurring template
    if (template.lifecycle === 'recurring' && !progress.foundationComplete) {
      const foundationTemplates = this.framework.templates.filter(
        (t) => t.lifecycle === 'foundation'
      )
      const incompleteFoundations = foundationTemplates.filter(
        (t) => !hasEntry(t.templateId || t.id || '', entries)
      )

      if (incompleteFoundations.length > 0) {
        blockReasons.push({
          type: 'foundation_incomplete',
          message: `Complete all foundation templates first (${incompleteFoundations.length} remaining).`,
          progress: Math.round(
            ((foundationTemplates.length - incompleteFoundations.length) /
              foundationTemplates.length) *
              100
          ),
        })
      }
    }

    // 2. Check prerequisites
    const prereqResult = this.checkPrerequisites(template, entries)
    if (!prereqResult.satisfied) {
      missingPrerequisites.push(...prereqResult.missing)
      blockReasons.push(...prereqResult.blockReasons)
    }

    // 3. Check unlock conditions
    const conditionResult = this.checkUnlockConditions(template, entries, now)
    if (!conditionResult.satisfied) {
      blockReasons.push(...conditionResult.blockReasons)
    }

    // 4. Check cooldown
    const cooldownResult = this.cooldownManager.canCreateEntry(template, entries)
    if (!cooldownResult.allowed) {
      if (cooldownResult.reason === 'cooldown_active') {
        blockReasons.push({
          type: 'cooldown',
          message: cooldownResult.message,
          progress: this.calculateCooldownProgress(template, entries),
        })
      } else if (cooldownResult.reason === 'single_use_completed') {
        blockReasons.push({
          type: 'cooldown',
          message: cooldownResult.message,
          progress: 100,
        })
      }
    }

    // Calculate overall progress
    const progressPercent = this.calculateProgress(
      template,
      entries,
      missingPrerequisites,
      cooldownResult
    )

    // Determine if unlocked
    const isUnlocked = blockReasons.length === 0

    // Generate status message
    const statusMessage = this.generateStatusMessage(
      template,
      isUnlocked,
      blockReasons,
      cooldownResult
    )

    return {
      isUnlocked,
      blockReasons,
      missingPrerequisites,
      progressPercent,
      statusMessage,
      availableAt: cooldownResult.availableAt,
    }
  }

  /**
   * Calculate cooldown progress (how much of the cooldown has elapsed)
   */
  private calculateCooldownProgress(
    template: FrameworkTemplate,
    entries: JournalEntry[]
  ): number {
    if (!template.cooldownDays) return 100

    const remaining = this.cooldownManager.getRemainingCooldown(template, entries)
    const elapsed = template.cooldownDays - remaining
    return Math.round((elapsed / template.cooldownDays) * 100)
  }

  /**
   * Calculate overall progress toward unlocking a template
   */
  private calculateProgress(
    template: FrameworkTemplate,
    entries: JournalEntry[],
    missingPrerequisites: string[],
    cooldownResult: CooldownResult
  ): number {
    const totalPrereqs = this.graph.getDirectDependencies(template.id).length

    // If no prerequisites and no cooldown, it's 100% if allowed
    if (totalPrereqs === 0 && !template.cooldownDays) {
      return cooldownResult.allowed ? 100 : 0
    }

    // Calculate prerequisite progress
    let prereqProgress = 100
    if (totalPrereqs > 0) {
      const completedPrereqs = totalPrereqs - missingPrerequisites.length
      prereqProgress = Math.round((completedPrereqs / totalPrereqs) * 100)
    }

    // If prerequisites aren't complete, that's the limiting factor
    if (prereqProgress < 100) {
      return prereqProgress
    }

    // Prerequisites complete, check cooldown
    if (cooldownResult.reason === 'cooldown_active') {
      return this.calculateCooldownProgress(template, entries)
    }

    // Single-use completed
    if (cooldownResult.reason === 'single_use_completed') {
      return 100
    }

    return 100
  }

  /**
   * Generate a user-friendly status message
   */
  private generateStatusMessage(
    template: FrameworkTemplate,
    isUnlocked: boolean,
    blockReasons: UnlockBlockReason[],
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _cooldownResult: CooldownResult
  ): string {
    if (isUnlocked) {
      return `Ready to complete "${template.name}".`
    }

    // Priority: prerequisites > foundation > conditions > cooldown
    const prereqBlock = blockReasons.find((r) => r.type === 'prerequisite')
    if (prereqBlock) {
      return prereqBlock.message
    }

    const foundationBlock = blockReasons.find((r) => r.type === 'foundation_incomplete')
    if (foundationBlock) {
      return foundationBlock.message
    }

    const conditionBlock = blockReasons.find((r) => r.type === 'condition')
    if (conditionBlock) {
      return conditionBlock.message
    }

    const cooldownBlock = blockReasons.find((r) => r.type === 'cooldown')
    if (cooldownBlock) {
      return cooldownBlock.message
    }

    return `"${template.name}" is currently locked.`
  }

  /**
   * Evaluate all templates in the framework
   */
  evaluateAllUnlocks(
    progress: UserFrameworkProgress,
    entries: JournalEntry[]
  ): Map<string, UnlockEvaluation> {
    const results = new Map<string, UnlockEvaluation>()

    for (const template of this.framework.templates) {
      const templateId = template.templateId || template.id || ''
      if (!templateId) continue
      results.set(templateId, this.evaluateUnlock(templateId, progress, entries))
    }

    return results
  }

  /**
   * Get a summary of all unlock statuses
   */
  getUnlockSummary(progress: UserFrameworkProgress, entries: JournalEntry[]): UnlockSummary {
    const evaluations = this.evaluateAllUnlocks(progress, entries)

    const unlockedTemplates: string[] = []
    const lockedTemplates: string[] = []
    const cooldownTemplates: string[] = []
    const blockedByPrerequisites: string[] = []
    const incompleteFoundations: string[] = []

    for (const [templateId, evaluation] of evaluations) {
      const template = this.templateMap.get(templateId)
      if (!template) continue

      if (evaluation.isUnlocked) {
        unlockedTemplates.push(templateId)
      } else {
        lockedTemplates.push(templateId)

        // Categorize the lock reason
        const hasCooldown = evaluation.blockReasons.some((r) => r.type === 'cooldown')
        const hasPrereq = evaluation.blockReasons.some((r) => r.type === 'prerequisite')

        if (hasCooldown && !hasPrereq) {
          cooldownTemplates.push(templateId)
        }

        if (hasPrereq) {
          blockedByPrerequisites.push(templateId)
        }
      }

      // Track incomplete foundations
      if (template.lifecycle === 'foundation' && !hasEntry(templateId, entries)) {
        incompleteFoundations.push(templateId)
      }
    }

    // Calculate completion percentage (based on foundation templates)
    const totalFoundations = this.framework.templates.filter(
      (t) => t.lifecycle === 'foundation'
    ).length
    const completedFoundations = totalFoundations - incompleteFoundations.length
    const completionPercent =
      totalFoundations > 0 ? Math.round((completedFoundations / totalFoundations) * 100) : 100

    return {
      evaluations,
      unlockedTemplates,
      lockedTemplates,
      cooldownTemplates,
      blockedByPrerequisites,
      incompleteFoundations,
      completionPercent,
    }
  }

  /**
   * Get the next recommended template to complete
   */
  getNextRecommended(progress: UserFrameworkProgress, entries: JournalEntry[]): string | null {
    const summary = this.getUnlockSummary(progress, entries)

    // Priority 1: Incomplete foundation templates
    if (summary.incompleteFoundations.length > 0) {
      // Find the first foundation template that is unlocked
      for (const templateId of summary.incompleteFoundations) {
        if (summary.unlockedTemplates.includes(templateId)) {
          return templateId
        }
      }
      // If none are unlocked, return the first in order
      const foundationTemplates = this.framework.templates
        .filter((t) => summary.incompleteFoundations.includes(t.templateId || t.id || ''))
        .sort((a, b) => a.order - b.order)
      const firstFoundation = foundationTemplates[0]
      return firstFoundation ? (firstFoundation.templateId || firstFoundation.id || null) : null
    }

    // Priority 2: Recurring templates that are unlocked
    const recurringUnlocked = this.framework.templates
      .filter(
        (t) => t.lifecycle === 'recurring' && summary.unlockedTemplates.includes(t.templateId || t.id || '')
      )
      .sort((a, b) => a.order - b.order)

    if (recurringUnlocked.length > 0) {
      return recurringUnlocked[0].templateId || recurringUnlocked[0].id || null
    }

    // Priority 3: Any unlocked template
    if (summary.unlockedTemplates.length > 0) {
      const unlocked = this.framework.templates
        .filter((t) => summary.unlockedTemplates.includes(t.templateId || t.id || ''))
        .sort((a, b) => a.order - b.order)
      const firstUnlocked = unlocked[0]
      return firstUnlocked ? (firstUnlocked.templateId || firstUnlocked.id || null) : null
    }

    return null
  }
}

// ============================================================================
// FACTORY FUNCTIONS
// ============================================================================

/**
 * Create a dependency resolver for a framework
 */
export function createResolver(
  framework: Framework,
  options?: DependencyResolverOptions
): DependencyResolver {
  return new DependencyResolver(framework, options)
}

/**
 * Evaluate unlock status for a single template
 */
export function evaluateUnlock(
  framework: Framework,
  templateId: string,
  progress: UserFrameworkProgress,
  entries: JournalEntry[],
  options?: DependencyResolverOptions
): UnlockEvaluation {
  const resolver = new DependencyResolver(framework, options)
  return resolver.evaluateUnlock(templateId, progress, entries)
}

/**
 * Evaluate unlock status for all templates
 */
export function evaluateAllUnlocks(
  framework: Framework,
  progress: UserFrameworkProgress,
  entries: JournalEntry[],
  options?: DependencyResolverOptions
): Map<string, UnlockEvaluation> {
  const resolver = new DependencyResolver(framework, options)
  return resolver.evaluateAllUnlocks(progress, entries)
}
