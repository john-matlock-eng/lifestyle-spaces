/**
 * Cooldown Manager
 *
 * Manages template cooldown logic to determine when a user can create
 * new entries for recurring templates.
 *
 * @module CooldownManager
 */

import type { FrameworkTemplate } from '../../types/framework.types'
import type { JournalEntry } from '../../types/journal.types'

// ============================================================================
// TYPES
// ============================================================================

/**
 * Result of cooldown evaluation
 */
export interface CooldownResult {
  /** Whether the user is allowed to create a new entry */
  allowed: boolean
  /** Reason if not allowed */
  reason?: 'cooldown_active' | 'single_use_completed'
  /** Number of days remaining in cooldown (if applicable) */
  remainingDays?: number
  /** Date of the last entry for this template */
  lastEntryDate?: string
  /** When the cooldown expires and entry can be created */
  availableAt?: string
  /** Human-readable message explaining the status */
  message: string
}

/**
 * Options for cooldown evaluation
 */
export interface CooldownOptions {
  /** Current date/time (for testing purposes) */
  now?: Date
  /** Timezone to use for date calculations */
  timezone?: string
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get the start of day in a specific timezone
 * Handles DST transitions correctly by using locale-aware date operations
 */
function getStartOfDay(date: Date, timezone?: string): Date {
  // Use the local timezone if not specified
  const options: Intl.DateTimeFormatOptions = {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }

  const formatter = new Intl.DateTimeFormat('en-CA', options)
  const parts = formatter.formatToParts(date)

  const year = parseInt(parts.find((p) => p.type === 'year')?.value || '0')
  const month = parseInt(parts.find((p) => p.type === 'month')?.value || '0') - 1
  const day = parseInt(parts.find((p) => p.type === 'day')?.value || '0')

  // Create a date at midnight in UTC, then adjust
  return new Date(year, month, day, 0, 0, 0, 0)
}

/**
 * Calculate the number of days between two dates
 * Uses calendar days (not 24-hour periods)
 */
function getDaysBetween(date1: Date, date2: Date, timezone?: string): number {
  const start1 = getStartOfDay(date1, timezone)
  const start2 = getStartOfDay(date2, timezone)

  const diffMs = start2.getTime() - start1.getTime()
  return Math.floor(diffMs / (1000 * 60 * 60 * 24))
}

/**
 * Add days to a date
 */
function addDays(date: Date, days: number): Date {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}


// ============================================================================
// COOLDOWN MANAGER CLASS
// ============================================================================

/**
 * Cooldown Manager
 *
 * Evaluates whether a user can create a new entry for a template
 * based on cooldown rules and single-use restrictions.
 */
export class CooldownManager {
  private readonly options: CooldownOptions

  constructor(options: CooldownOptions = {}) {
    this.options = options
  }

  /**
   * Get the current date/time
   */
  private getNow(): Date {
    return this.options.now || new Date()
  }

  /**
   * Check if a template is a single-use template (foundation/once)
   */
  isSingleUse(template: FrameworkTemplate): boolean {
    return template.lifecycle === 'foundation' || template.frequency === 'once'
  }

  /**
   * Check if a template has a cooldown period
   */
  hasCooldown(template: FrameworkTemplate): boolean {
    return (
      template.cooldownDays !== undefined && template.cooldownDays > 0 && !this.isSingleUse(template)
    )
  }

  /**
   * Get the last entry for a specific template from a list of entries
   */
  getLastEntry(templateId: string, entries: JournalEntry[]): JournalEntry | null {
    const templateEntries = entries.filter((e) => e.templateId === templateId)

    if (templateEntries.length === 0) {
      return null
    }

    // Sort by createdAt descending and return the most recent
    return templateEntries.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )[0]
  }

  /**
   * Get the date of the last entry for a template
   */
  getLastEntryDate(templateId: string, entries: JournalEntry[]): Date | null {
    const lastEntry = this.getLastEntry(templateId, entries)
    return lastEntry ? new Date(lastEntry.createdAt) : null
  }

  /**
   * Get the count of entries for a template
   */
  getEntryCount(templateId: string, entries: JournalEntry[]): number {
    return entries.filter((e) => e.templateId === templateId).length
  }

  /**
   * Calculate remaining cooldown days
   */
  getRemainingCooldown(template: FrameworkTemplate, entries: JournalEntry[]): number {
    if (!this.hasCooldown(template)) {
      return 0
    }

    const lastEntryDate = this.getLastEntryDate(template.id, entries)
    if (!lastEntryDate) {
      return 0
    }

    const now = this.getNow()
    const daysSinceLastEntry = getDaysBetween(lastEntryDate, now, this.options.timezone)
    const cooldownDays = template.cooldownDays || 0
    const remaining = cooldownDays - daysSinceLastEntry

    return Math.max(0, remaining)
  }

  /**
   * Get the date when the cooldown expires
   */
  getCooldownExpiryDate(template: FrameworkTemplate, entries: JournalEntry[]): Date | null {
    if (!this.hasCooldown(template)) {
      return null
    }

    const lastEntryDate = this.getLastEntryDate(template.id, entries)
    if (!lastEntryDate) {
      return null
    }

    const cooldownDays = template.cooldownDays || 0
    return addDays(getStartOfDay(lastEntryDate, this.options.timezone), cooldownDays)
  }

  /**
   * Evaluate whether a user can create a new entry for a template
   */
  canCreateEntry(template: FrameworkTemplate, entries: JournalEntry[]): CooldownResult {
    const now = this.getNow()
    const lastEntry = this.getLastEntry(template.id, entries)
    const lastEntryDate = lastEntry ? lastEntry.createdAt : undefined

    // Check single-use restriction
    if (this.isSingleUse(template)) {
      const entryCount = this.getEntryCount(template.id, entries)
      if (entryCount > 0) {
        return {
          allowed: false,
          reason: 'single_use_completed',
          lastEntryDate,
          message: `This is a one-time template that has already been completed.`,
        }
      }

      return {
        allowed: true,
        message: 'This is a one-time template ready to be completed.',
      }
    }

    // Check cooldown for recurring templates
    if (this.hasCooldown(template)) {
      const remainingDays = this.getRemainingCooldown(template, entries)

      if (remainingDays > 0) {
        const expiryDate = this.getCooldownExpiryDate(template, entries)
        return {
          allowed: false,
          reason: 'cooldown_active',
          remainingDays,
          lastEntryDate,
          availableAt: expiryDate ? expiryDate.toISOString() : undefined,
          message: `Available in ${remainingDays} ${remainingDays === 1 ? 'day' : 'days'}.`,
        }
      }
    }

    // No restrictions - entry allowed
    if (lastEntryDate) {
      const daysSince = getDaysBetween(new Date(lastEntryDate), now, this.options.timezone)
      if (daysSince === 0) {
        return {
          allowed: true,
          lastEntryDate,
          message: 'You can create another entry. Last entry was today.',
        }
      } else if (daysSince === 1) {
        return {
          allowed: true,
          lastEntryDate,
          message: 'You can create a new entry. Last entry was yesterday.',
        }
      } else {
        return {
          allowed: true,
          lastEntryDate,
          message: `You can create a new entry. Last entry was ${daysSince} days ago.`,
        }
      }
    }

    return {
      allowed: true,
      message: 'Ready to create your first entry for this template.',
    }
  }

  /**
   * Get a summary of cooldown status for multiple templates
   */
  evaluateAll(
    templates: FrameworkTemplate[],
    entries: JournalEntry[]
  ): Map<string, CooldownResult> {
    const results = new Map<string, CooldownResult>()

    for (const template of templates) {
      results.set(template.id, this.canCreateEntry(template, entries))
    }

    return results
  }

  /**
   * Get templates that are available now (not in cooldown)
   */
  getAvailableTemplates(templates: FrameworkTemplate[], entries: JournalEntry[]): string[] {
    return templates
      .filter((t) => this.canCreateEntry(t, entries).allowed)
      .map((t) => t.id)
  }

  /**
   * Get templates that are in cooldown
   */
  getTemplatesInCooldown(templates: FrameworkTemplate[], entries: JournalEntry[]): string[] {
    return templates
      .filter((t) => {
        const result = this.canCreateEntry(t, entries)
        return !result.allowed && result.reason === 'cooldown_active'
      })
      .map((t) => t.id)
  }

  /**
   * Get templates that are single-use and completed
   */
  getCompletedSingleUseTemplates(
    templates: FrameworkTemplate[],
    entries: JournalEntry[]
  ): string[] {
    return templates
      .filter((t) => {
        const result = this.canCreateEntry(t, entries)
        return !result.allowed && result.reason === 'single_use_completed'
      })
      .map((t) => t.id)
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

/** Default cooldown manager instance */
export const cooldownManager = new CooldownManager()

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

/**
 * Check if a user can create an entry for a template
 */
export function canCreateEntry(
  template: FrameworkTemplate,
  entries: JournalEntry[],
  options?: CooldownOptions
): CooldownResult {
  const manager = options ? new CooldownManager(options) : cooldownManager
  return manager.canCreateEntry(template, entries)
}

/**
 * Get remaining cooldown days for a template
 */
export function getRemainingCooldown(
  template: FrameworkTemplate,
  entries: JournalEntry[],
  options?: CooldownOptions
): number {
  const manager = options ? new CooldownManager(options) : cooldownManager
  return manager.getRemainingCooldown(template, entries)
}

/**
 * Get the last entry date for a template
 */
export function getLastEntryDate(
  templateId: string,
  entries: JournalEntry[],
  options?: CooldownOptions
): Date | null {
  const manager = options ? new CooldownManager(options) : cooldownManager
  return manager.getLastEntryDate(templateId, entries)
}
