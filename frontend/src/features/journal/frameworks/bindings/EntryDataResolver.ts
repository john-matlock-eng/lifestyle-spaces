/**
 * Entry Data Resolver
 *
 * Resolves data from journal entries based on binding expressions.
 * Handles field extraction, path navigation, and wildcard expansion.
 *
 * @module EntryDataResolver
 */

import type { JournalEntry } from '../../types/journal.types'
import type { ParsedBindingExpression, PathSegment } from './BindingExpressionParser'
import { parse } from './BindingExpressionParser'

// ============================================================================
// TYPES
// ============================================================================

/**
 * Scope for entry lookup
 */
export type EntryScope = 'latest' | 'first' | 'specific'

/**
 * Context for resolving entry data
 */
export interface EntryResolutionContext {
  /** User ID for filtering entries */
  userId: string
  /** Framework ID for filtering entries */
  frameworkId: string
  /** Space ID for filtering entries */
  spaceId: string
}

/**
 * Provider interface for fetching entries
 * This allows the resolver to work with different data sources
 */
export interface EntryProvider {
  /** Get entries for a specific template */
  getEntriesForTemplate(
    context: EntryResolutionContext,
    templateId: string
  ): Promise<JournalEntry[]>
  /** Get a specific entry by ID */
  getEntryById(entryId: string): Promise<JournalEntry | null>
}

/**
 * Result of extracting a field value
 */
export interface ExtractionResult {
  /** Whether extraction was successful */
  success: boolean
  /** Extracted value (undefined if not found) */
  value: unknown
  /** Error message if extraction failed */
  error?: string
}

// ============================================================================
// DEFAULT IN-MEMORY PROVIDER
// ============================================================================

/**
 * In-memory entry provider for testing and simple use cases
 */
export class InMemoryEntryProvider implements EntryProvider {
  private entries: JournalEntry[] = []

  constructor(entries: JournalEntry[] = []) {
    this.entries = entries
  }

  setEntries(entries: JournalEntry[]): void {
    this.entries = entries
  }

  addEntry(entry: JournalEntry): void {
    this.entries.push(entry)
  }

  async getEntriesForTemplate(
    context: EntryResolutionContext,
    templateId: string
  ): Promise<JournalEntry[]> {
    return this.entries.filter(
      (e) =>
        e.userId === context.userId &&
        e.spaceId === context.spaceId &&
        e.frameworkId === context.frameworkId &&
        e.templateId === templateId
    )
  }

  async getEntryById(entryId: string): Promise<JournalEntry | null> {
    return this.entries.find((e) => e.journalId === entryId) || null
  }
}

// ============================================================================
// ENTRY DATA RESOLVER CLASS
// ============================================================================

/**
 * Entry Data Resolver
 *
 * Resolves data from journal entries using binding expressions.
 */
export class EntryDataResolver {
  private readonly provider: EntryProvider

  constructor(provider: EntryProvider) {
    this.provider = provider
  }

  /**
   * Get the latest entry for a template
   */
  async getLatestEntry(
    context: EntryResolutionContext,
    templateId: string
  ): Promise<JournalEntry | null> {
    const entries = await this.provider.getEntriesForTemplate(context, templateId)
    if (entries.length === 0) return null

    // Sort by createdAt descending
    const sorted = [...entries].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
    return sorted[0]
  }

  /**
   * Get the first entry for a template
   */
  async getFirstEntry(
    context: EntryResolutionContext,
    templateId: string
  ): Promise<JournalEntry | null> {
    const entries = await this.provider.getEntriesForTemplate(context, templateId)
    if (entries.length === 0) return null

    // Sort by createdAt ascending
    const sorted = [...entries].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    )
    return sorted[0]
  }

  /**
   * Get a specific entry by ID
   */
  async getEntryById(entryId: string): Promise<JournalEntry | null> {
    return this.provider.getEntryById(entryId)
  }

  /**
   * Get an entry based on scope
   */
  async getEntry(
    context: EntryResolutionContext,
    templateId: string,
    scope: EntryScope,
    entryId?: string
  ): Promise<JournalEntry | null> {
    switch (scope) {
      case 'latest':
        return this.getLatestEntry(context, templateId)
      case 'first':
        return this.getFirstEntry(context, templateId)
      case 'specific':
        if (!entryId) return null
        return this.getEntryById(entryId)
      default:
        return null
    }
  }

  /**
   * Extract field data from an entry's content
   * Entries store field data in contentTiptap or as structured data
   */
  getEntryFieldData(entry: JournalEntry): Record<string, unknown> {
    // First try contentTiptap which may contain structured field data
    if (entry.contentTiptap && typeof entry.contentTiptap === 'object') {
      // Look for a 'fields' or 'data' property
      const tiptap = entry.contentTiptap as Record<string, unknown>
      if (tiptap.fields && typeof tiptap.fields === 'object') {
        return tiptap.fields as Record<string, unknown>
      }
      if (tiptap.data && typeof tiptap.data === 'object') {
        return tiptap.data as Record<string, unknown>
      }
      // Return the entire tiptap content if it looks like field data
      if (!tiptap.type && !tiptap.content) {
        return tiptap
      }
    }

    // Fall back to parsing content if it contains JSON
    if (entry.content) {
      try {
        // Check if content is JSON
        if (entry.content.trim().startsWith('{')) {
          const parsed = JSON.parse(entry.content)
          if (typeof parsed === 'object' && parsed !== null) {
            return parsed
          }
        }
      } catch {
        // Not JSON, return empty
      }
    }

    return {}
  }

  /**
   * Extract a field value from entry data using a parsed expression
   */
  extractFieldValue(
    entry: JournalEntry,
    expression: ParsedBindingExpression | string
  ): ExtractionResult {
    // Parse expression if string
    const parsed = typeof expression === 'string' ? parse(expression) : expression

    if (!parsed.isValid) {
      return {
        success: false,
        value: undefined,
        error: parsed.error,
      }
    }

    // Get field data from entry
    const fieldData = this.getEntryFieldData(entry)

    // Navigate the path
    try {
      const value = this.navigatePath(fieldData, parsed.segments)
      return {
        success: true,
        value,
      }
    } catch (error) {
      return {
        success: false,
        value: undefined,
        error: error instanceof Error ? error.message : 'Unknown extraction error',
      }
    }
  }

  /**
   * Navigate a path through data, handling wildcards
   */
  private navigatePath(data: unknown, segments: PathSegment[]): unknown {
    if (segments.length === 0) {
      return data
    }

    const [current, ...rest] = segments

    switch (current.type) {
      case 'property':
        return this.navigateProperty(data, current.name!, rest)
      case 'index':
        return this.navigateIndex(data, current.index!, rest)
      case 'wildcard':
        return this.navigateWildcard(data, rest)
      default:
        return undefined
    }
  }

  /**
   * Navigate to a property
   */
  private navigateProperty(data: unknown, name: string, rest: PathSegment[]): unknown {
    if (data === null || data === undefined) {
      return undefined
    }

    if (typeof data !== 'object') {
      return undefined
    }

    const obj = data as Record<string, unknown>
    const value = obj[name]

    if (rest.length === 0) {
      return value
    }

    return this.navigatePath(value, rest)
  }

  /**
   * Navigate to an array index
   */
  private navigateIndex(data: unknown, index: number, rest: PathSegment[]): unknown {
    if (!Array.isArray(data)) {
      return undefined
    }

    if (index < 0 || index >= data.length) {
      return undefined
    }

    const value = data[index]

    if (rest.length === 0) {
      return value
    }

    return this.navigatePath(value, rest)
  }

  /**
   * Navigate with wildcard (collect all array items)
   */
  private navigateWildcard(data: unknown, rest: PathSegment[]): unknown {
    if (!Array.isArray(data)) {
      return undefined
    }

    if (rest.length === 0) {
      return data
    }

    // Map over all items and collect results
    const results = data.map((item) => this.navigatePath(item, rest))

    // Filter out undefined values
    return results.filter((r) => r !== undefined)
  }

  /**
   * Check if a path exists in entry data
   */
  hasPath(entry: JournalEntry, expression: string): boolean {
    const result = this.extractFieldValue(entry, expression)
    return result.success && result.value !== undefined
  }

  /**
   * Get all available field paths from an entry
   */
  getAvailablePaths(entry: JournalEntry, maxDepth: number = 5): string[] {
    const fieldData = this.getEntryFieldData(entry)
    const paths: string[] = []

    this.collectPaths(fieldData, '', paths, 0, maxDepth)

    return paths
  }

  /**
   * Recursively collect all paths in data
   */
  private collectPaths(
    data: unknown,
    prefix: string,
    paths: string[],
    depth: number,
    maxDepth: number
  ): void {
    if (depth >= maxDepth) return
    if (data === null || data === undefined) return

    if (Array.isArray(data)) {
      // Add wildcard path
      if (prefix) {
        paths.push(`${prefix}[*]`)
      }
      // Recurse into first element as sample
      if (data.length > 0) {
        this.collectPaths(data[0], `${prefix}[0]`, paths, depth + 1, maxDepth)
      }
    } else if (typeof data === 'object') {
      for (const [key, value] of Object.entries(data)) {
        const newPath = prefix ? `${prefix}.${key}` : key
        paths.push(newPath)
        this.collectPaths(value, newPath, paths, depth + 1, maxDepth)
      }
    }
  }
}

// ============================================================================
// FACTORY FUNCTIONS
// ============================================================================

/**
 * Create an entry data resolver with an in-memory provider
 */
export function createInMemoryResolver(entries: JournalEntry[] = []): EntryDataResolver {
  return new EntryDataResolver(new InMemoryEntryProvider(entries))
}

/**
 * Create an entry data resolver with a custom provider
 */
export function createResolver(provider: EntryProvider): EntryDataResolver {
  return new EntryDataResolver(provider)
}
