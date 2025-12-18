/**
 * Data Binding Engine
 *
 * Resolves data bindings for templates by pulling values from
 * previous template entries and applying transforms.
 *
 * @module DataBindingEngine
 */

import type { FrameworkTemplate, DataBindingMapping } from '../../types/framework.types'
import type { JournalEntry } from '../../types/journal.types'
import {
  EntryDataResolver,
  createInMemoryResolver,
  type EntryProvider,
  type EntryScope,
  type EntryResolutionContext,
} from './EntryDataResolver'
import { parse, type ParsedBindingExpression } from './BindingExpressionParser'
import { applyTransform, hasTransform } from './transforms'

// ============================================================================
// TYPES
// ============================================================================

/**
 * Mode for how binding value is used
 */
export type BindingMode = 'readonly' | 'default' | 'hidden'

/**
 * Context for resolving bindings
 */
export interface BindingResolutionContext {
  /** User ID */
  userId: string
  /** Framework ID */
  frameworkId: string
  /** Space ID */
  spaceId: string
  /** Available entries (for in-memory resolution) */
  entries?: JournalEntry[]
  /** Specific entry IDs to use for 'specific' scope */
  specificEntries?: Record<string, string>
}

/**
 * A single resolved binding
 */
export interface ResolvedBinding {
  /** Target field ID */
  fieldId: string
  /** Resolved value */
  value: unknown
  /** Binding mode */
  mode: BindingMode
  /** Source template ID */
  sourceTemplateId?: string
  /** Source expression */
  sourceExpression: string
  /** Whether resolution was successful */
  success: boolean
  /** Error message if failed */
  error?: string
}

/**
 * Result of resolving all bindings for a template
 */
export interface ResolvedBindings {
  /** Resolved values by field ID */
  values: Record<string, unknown>
  /** Binding modes by field ID */
  modes: Record<string, BindingMode>
  /** All resolved bindings */
  bindings: ResolvedBinding[]
  /** Errors that occurred during resolution */
  errors: Array<{ fieldId: string; error: string }>
  /** Whether all bindings resolved successfully */
  allResolved: boolean
}

/**
 * Options for the data binding engine
 */
export interface DataBindingEngineOptions {
  /** Entry provider for fetching entries */
  provider?: EntryProvider
  /** Default scope for bindings without explicit scope */
  defaultScope?: EntryScope
  /** Whether to include failed bindings in result */
  includeFailures?: boolean
}

/**
 * Binding source configuration (enhanced from DataBindingMapping)
 */
export interface BindingSourceConfig {
  /** Template ID to pull data from */
  templateId: string
  /** Scope for entry selection */
  scope?: EntryScope
  /** Specific entry ID (for 'specific' scope) */
  entryId?: string
  /** Field mappings */
  mappings: Array<{
    /** Source expression */
    source: string
    /** Target field ID */
    target: string
    /** Binding mode */
    mode?: BindingMode
    /** Transform to apply */
    transform?: string
    /** Transform arguments */
    transformArgs?: Record<string, unknown>
    /** Fallback value */
    fallback?: unknown
  }>
}

// ============================================================================
// DATA BINDING ENGINE CLASS
// ============================================================================

/**
 * Data Binding Engine
 *
 * Resolves data bindings for templates, pulling values from previous
 * entries and applying transforms.
 */
export class DataBindingEngine {
  private readonly resolver: EntryDataResolver
  private readonly options: Required<DataBindingEngineOptions>

  constructor(options: DataBindingEngineOptions = {}) {
    this.resolver =
      options.provider != null
        ? new EntryDataResolver(options.provider)
        : createInMemoryResolver()
    this.options = {
      provider: options.provider!,
      defaultScope: options.defaultScope ?? 'latest',
      includeFailures: options.includeFailures ?? true,
    }
  }

  /**
   * Resolve all bindings for a template
   */
  async resolveBindings(
    template: FrameworkTemplate,
    context: BindingResolutionContext
  ): Promise<ResolvedBindings> {
    const bindings: ResolvedBinding[] = []
    const values: Record<string, unknown> = {}
    const modes: Record<string, BindingMode> = {}
    const errors: Array<{ fieldId: string; error: string }> = []

    // If no data bindings configured, return empty result
    if (!template.dataBindings?.inputs || template.dataBindings.inputs.length === 0) {
      return {
        values,
        modes,
        bindings,
        errors,
        allResolved: true,
      }
    }

    // Create in-memory resolver if entries provided
    const resolver =
      context.entries != null
        ? createInMemoryResolver(context.entries)
        : this.resolver

    // Process each binding
    for (const mapping of template.dataBindings.inputs) {
      const result = await this.resolveMapping(mapping, context, resolver)
      bindings.push(result)

      if (result.success) {
        values[result.fieldId] = result.value
        modes[result.fieldId] = result.mode
      } else {
        if (this.options.includeFailures) {
          errors.push({ fieldId: result.fieldId, error: result.error || 'Unknown error' })
        }
      }
    }

    return {
      values,
      modes,
      bindings,
      errors,
      allResolved: errors.length === 0,
    }
  }

  /**
   * Resolve a single binding mapping
   */
  private async resolveMapping(
    mapping: DataBindingMapping,
    context: BindingResolutionContext,
    resolver: EntryDataResolver
  ): Promise<ResolvedBinding> {
    const fieldId = mapping.targetFieldId
    const sourceExpression = mapping.sourcePath

    try {
      // Determine source based on binding source type
      let value: unknown
      let sourceTemplateId: string | undefined

      switch (mapping.source) {
        case 'framework_entry': {
          // Parse the source path to extract template ID and field path
          const { templateId, fieldPath } = this.parseFrameworkEntryPath(sourceExpression)
          sourceTemplateId = templateId

          if (!templateId) {
            return this.createFailedBinding(
              fieldId,
              sourceExpression,
              'Invalid source path: missing template ID'
            )
          }

          // Get entry based on scope (default to latest)
          const entryContext: EntryResolutionContext = {
            userId: context.userId,
            frameworkId: context.frameworkId,
            spaceId: context.spaceId,
          }

          const entry = await resolver.getLatestEntry(entryContext, templateId)
          if (!entry) {
            // No entry found - use fallback if provided
            if (mapping.fallback !== undefined) {
              value = mapping.fallback
            } else {
              value = undefined
            }
          } else {
            // Extract field value
            const extraction = resolver.extractFieldValue(entry, fieldPath)
            if (extraction.success) {
              value = extraction.value
            } else {
              if (mapping.fallback !== undefined) {
                value = mapping.fallback
              } else {
                value = undefined
              }
            }
          }
          break
        }

        case 'user_profile': {
          // User profile bindings would be handled differently
          // For now, return undefined
          value = mapping.fallback
          break
        }

        case 'computed': {
          // Computed bindings require a compute function
          // For now, return undefined
          value = mapping.fallback
          break
        }

        case 'static': {
          // Static bindings use the fallback as the value
          value = mapping.fallback
          break
        }

        default:
          value = mapping.fallback
      }

      // Apply transform if specified
      if (mapping.transform && value !== undefined) {
        if (hasTransform(mapping.transform)) {
          value = applyTransform(mapping.transform, value, mapping.transformArgs)
        }
      }

      // Determine mode (default to 'default')
      const mode: BindingMode = 'default'

      return {
        fieldId,
        value,
        mode,
        sourceTemplateId,
        sourceExpression,
        success: true,
      }
    } catch (error) {
      return this.createFailedBinding(
        fieldId,
        sourceExpression,
        error instanceof Error ? error.message : 'Unknown error'
      )
    }
  }

  /**
   * Parse a framework entry source path
   * Format: "template-id.field.path" or "template-id.field[0].subfield"
   */
  private parseFrameworkEntryPath(path: string): { templateId: string; fieldPath: string } {
    // Split on first dot
    const dotIndex = path.indexOf('.')
    if (dotIndex === -1) {
      // Just a template ID, no field path
      return { templateId: path, fieldPath: '' }
    }

    const templateId = path.slice(0, dotIndex)
    const fieldPath = path.slice(dotIndex + 1)

    return { templateId, fieldPath }
  }

  /**
   * Create a failed binding result
   */
  private createFailedBinding(
    fieldId: string,
    sourceExpression: string,
    error: string
  ): ResolvedBinding {
    return {
      fieldId,
      value: undefined,
      mode: 'default',
      sourceExpression,
      success: false,
      error,
    }
  }

  /**
   * Resolve bindings from a source configuration
   */
  async resolveFromSource(
    source: BindingSourceConfig,
    context: BindingResolutionContext
  ): Promise<ResolvedBindings> {
    const bindings: ResolvedBinding[] = []
    const values: Record<string, unknown> = {}
    const modes: Record<string, BindingMode> = {}
    const errors: Array<{ fieldId: string; error: string }> = []

    // Create resolver
    const resolver =
      context.entries != null
        ? createInMemoryResolver(context.entries)
        : this.resolver

    // Get entry based on scope
    const entryContext: EntryResolutionContext = {
      userId: context.userId,
      frameworkId: context.frameworkId,
      spaceId: context.spaceId,
    }

    const scope = source.scope ?? this.options.defaultScope
    const entry = await resolver.getEntry(
      entryContext,
      source.templateId,
      scope,
      source.entryId
    )

    // Process each mapping
    for (const mapping of source.mappings) {
      const result = await this.resolveSingleMapping(
        mapping,
        entry,
        source.templateId,
        resolver
      )
      bindings.push(result)

      if (result.success) {
        values[result.fieldId] = result.value
        modes[result.fieldId] = result.mode
      } else {
        errors.push({ fieldId: result.fieldId, error: result.error || 'Unknown error' })
      }
    }

    return {
      values,
      modes,
      bindings,
      errors,
      allResolved: errors.length === 0,
    }
  }

  /**
   * Resolve a single mapping from source config
   */
  private async resolveSingleMapping(
    mapping: BindingSourceConfig['mappings'][0],
    entry: JournalEntry | null,
    sourceTemplateId: string,
    resolver: EntryDataResolver
  ): Promise<ResolvedBinding> {
    const fieldId = mapping.target
    const sourceExpression = mapping.source
    const mode = mapping.mode ?? 'default'

    try {
      let value: unknown

      if (!entry) {
        // No entry - use fallback
        value = mapping.fallback
      } else {
        // Parse and extract value
        const parsed = parse(sourceExpression)
        if (!parsed.isValid) {
          return this.createFailedBinding(fieldId, sourceExpression, parsed.error || 'Invalid expression')
        }

        const extraction = resolver.extractFieldValue(entry, parsed)
        if (extraction.success) {
          value = extraction.value
        } else {
          value = mapping.fallback
        }
      }

      // Apply transform
      if (mapping.transform && value !== undefined && hasTransform(mapping.transform)) {
        value = applyTransform(mapping.transform, value, mapping.transformArgs)
      }

      return {
        fieldId,
        value,
        mode,
        sourceTemplateId,
        sourceExpression,
        success: true,
      }
    } catch (error) {
      return this.createFailedBinding(
        fieldId,
        sourceExpression,
        error instanceof Error ? error.message : 'Unknown error'
      )
    }
  }

  /**
   * Check if a template has any bindings
   */
  hasBindings(template: FrameworkTemplate): boolean {
    return (template.dataBindings?.inputs?.length ?? 0) > 0
  }

  /**
   * Get the template IDs that a template depends on through bindings
   */
  getBindingDependencies(template: FrameworkTemplate): string[] {
    if (!template.dataBindings?.inputs) {
      return []
    }

    const dependencies = new Set<string>()

    for (const mapping of template.dataBindings.inputs) {
      if (mapping.source === 'framework_entry') {
        const { templateId } = this.parseFrameworkEntryPath(mapping.sourcePath)
        if (templateId) {
          dependencies.add(templateId)
        }
      }
    }

    return Array.from(dependencies)
  }
}

// ============================================================================
// FACTORY FUNCTIONS
// ============================================================================

/**
 * Create a data binding engine with in-memory entries
 */
export function createBindingEngine(
  entries: JournalEntry[] = [],
  options?: Omit<DataBindingEngineOptions, 'provider'>
): DataBindingEngine {
  return new DataBindingEngine({
    ...options,
  })
}

/**
 * Create a data binding engine with a custom provider
 */
export function createBindingEngineWithProvider(
  provider: EntryProvider,
  options?: Omit<DataBindingEngineOptions, 'provider'>
): DataBindingEngine {
  return new DataBindingEngine({
    ...options,
    provider,
  })
}

/**
 * Resolve bindings for a template (convenience function)
 */
export async function resolveBindings(
  template: FrameworkTemplate,
  context: BindingResolutionContext,
  options?: DataBindingEngineOptions
): Promise<ResolvedBindings> {
  const engine = new DataBindingEngine(options)
  return engine.resolveBindings(template, context)
}
