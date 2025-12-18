/**
 * Framework Loader
 *
 * Loads, validates, and normalizes framework JSON definitions.
 *
 * @module FrameworkLoader
 */

import type { Framework, FrameworkTemplate, FrameworkCategory } from '../../types/framework.types'
import { validateFramework, type ValidationResult } from './FrameworkValidator'

// ============================================================================
// ERROR TYPES
// ============================================================================

/**
 * Error thrown when framework loading fails
 */
export class FrameworkLoadError extends Error {
  /** Validation result with detailed issues */
  readonly validationResult: ValidationResult
  /** The original JSON that failed to load */
  readonly originalJson: unknown

  constructor(message: string, validationResult: ValidationResult, originalJson: unknown) {
    super(message)
    this.name = 'FrameworkLoadError'
    this.validationResult = validationResult
    this.originalJson = originalJson

    // Maintain proper stack trace in V8 environments
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, FrameworkLoadError)
    }
  }

  /**
   * Get a formatted error message with all issues
   */
  getDetailedMessage(): string {
    const lines = [this.message, '', 'Validation errors:']
    for (const error of this.validationResult.errors) {
      lines.push(`  - [${error.code}] ${error.message}`)
      if (error.path) {
        lines.push(`    at: ${error.path}`)
      }
    }
    if (this.validationResult.warnings.length > 0) {
      lines.push('', 'Warnings:')
      for (const warning of this.validationResult.warnings) {
        lines.push(`  - [${warning.code}] ${warning.message}`)
      }
    }
    return lines.join('\n')
  }
}

// ============================================================================
// LOADER OPTIONS
// ============================================================================

/**
 * Options for the framework loader
 */
export interface FrameworkLoaderOptions {
  /** Whether to throw on validation warnings */
  strictMode?: boolean
  /** Whether to normalize the framework structure */
  normalize?: boolean
  /** Custom ID prefix to add to all template IDs */
  idPrefix?: string
}

const DEFAULT_OPTIONS: Required<FrameworkLoaderOptions> = {
  strictMode: false,
  normalize: true,
  idPrefix: '',
}

// ============================================================================
// FRAMEWORK LOADER CLASS
// ============================================================================

/**
 * Framework Loader
 *
 * Loads and validates framework JSON definitions, normalizing them
 * for runtime use.
 */
export class FrameworkLoader {
  private options: Required<FrameworkLoaderOptions>

  constructor(options: FrameworkLoaderOptions = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options }
  }

  /**
   * Load a framework from JSON
   *
   * @param json - The JSON to load (unknown type for safety)
   * @returns The validated and normalized Framework
   * @throws FrameworkLoadError if validation fails
   */
  loadFramework(json: unknown): Framework {
    // Validate the JSON
    const result = validateFramework(json)

    // Check for errors
    if (!result.valid) {
      throw new FrameworkLoadError(
        `Failed to load framework: ${result.errors.length} validation error(s)`,
        result,
        json
      )
    }

    // Check for warnings in strict mode
    if (this.options.strictMode && result.warnings.length > 0) {
      throw new FrameworkLoadError(
        `Framework has ${result.warnings.length} warning(s) (strict mode enabled)`,
        result,
        json
      )
    }

    // Get the validated framework
    let framework = result.framework!

    // Normalize if requested
    if (this.options.normalize) {
      framework = this.normalizeFramework(framework)
    }

    // Apply ID prefix if specified
    if (this.options.idPrefix) {
      framework = this.applyIdPrefix(framework, this.options.idPrefix)
    }

    return framework
  }

  /**
   * Load multiple frameworks from JSON array
   *
   * @param jsonArray - Array of framework JSON definitions
   * @returns Array of validated and normalized Frameworks
   * @throws FrameworkLoadError if any framework fails validation
   */
  loadFrameworks(jsonArray: unknown[]): Framework[] {
    return jsonArray.map((json, index) => {
      try {
        return this.loadFramework(json)
      } catch (error) {
        if (error instanceof FrameworkLoadError) {
          throw new FrameworkLoadError(
            `Failed to load framework at index ${index}: ${error.message}`,
            error.validationResult,
            error.originalJson
          )
        }
        throw error
      }
    })
  }

  /**
   * Try to load a framework, returning result instead of throwing
   *
   * @param json - The JSON to load
   * @returns Object with either framework or error
   */
  tryLoadFramework(json: unknown): { success: true; framework: Framework } | { success: false; error: FrameworkLoadError } {
    try {
      const framework = this.loadFramework(json)
      return { success: true, framework }
    } catch (error) {
      if (error instanceof FrameworkLoadError) {
        return { success: false, error }
      }
      throw error
    }
  }

  /**
   * Normalize a framework structure
   */
  private normalizeFramework(framework: Framework): Framework {
    return {
      ...framework,
      // Sort categories by order
      categories: this.normalizeCategories(framework.categories),
      // Sort and normalize templates
      templates: this.normalizeTemplates(framework.templates),
      // Ensure metadata has defaults
      metadata: this.normalizeMetadata(framework.metadata),
    }
  }

  /**
   * Normalize categories
   */
  private normalizeCategories(categories: FrameworkCategory[]): FrameworkCategory[] {
    return [...categories]
      .sort((a, b) => a.order - b.order)
      .map((category) => ({
        ...category,
        // Ensure optional fields have defaults
        icon: category.icon || '',
        color: category.color || '',
      }))
  }

  /**
   * Normalize templates
   */
  private normalizeTemplates(templates: FrameworkTemplate[]): FrameworkTemplate[] {
    return [...templates]
      .sort((a, b) => {
        // Sort by category first, then by order
        if (a.categoryId !== b.categoryId) {
          return a.categoryId.localeCompare(b.categoryId)
        }
        return a.order - b.order
      })
      .map((template) => ({
        ...template,
        // Ensure arrays exist
        prerequisites: template.prerequisites || [],
        unlockConditions: template.unlockConditions || [],
        // Ensure optional fields have defaults
        icon: template.icon || '',
        color: template.color || '',
        guidance: template.guidance || '',
        lockedMessage: template.lockedMessage || '',
        unlockedMessage: template.unlockedMessage || '',
        version: template.version || 1,
        // Ensure content structure
        content: {
          sections: template.content?.sections || [],
          fields: template.content?.fields || {},
        },
      }))
  }

  /**
   * Normalize metadata
   */
  private normalizeMetadata(metadata: Framework['metadata']): Framework['metadata'] {
    return {
      ...metadata,
      tags: metadata.tags || [],
      authors: metadata.authors || [],
      schemaVersion: metadata.schemaVersion || '1.0.0',
      createdAt: metadata.createdAt || new Date().toISOString(),
      updatedAt: metadata.updatedAt || new Date().toISOString(),
    }
  }

  /**
   * Apply ID prefix to all IDs in the framework
   */
  private applyIdPrefix(framework: Framework, prefix: string): Framework {
    const prefixId = (id: string) => `${prefix}${id}`

    return {
      ...framework,
      id: prefixId(framework.id),
      categories: framework.categories.map((c) => ({
        ...c,
        id: prefixId(c.id),
      })),
      templates: framework.templates.map((t) => ({
        ...t,
        id: prefixId(t.id),
        categoryId: prefixId(t.categoryId),
        prerequisites: t.prerequisites.map(prefixId),
        unlockConditions: t.unlockConditions?.map((cond) => ({
          ...cond,
          templateId: cond.templateId ? prefixId(cond.templateId) : undefined,
        })),
      })),
    }
  }
}

// Export singleton instance for convenience
export const frameworkLoader = new FrameworkLoader()

/**
 * Convenience function for loading frameworks
 */
export function loadFramework(json: unknown, options?: FrameworkLoaderOptions): Framework {
  const loader = options ? new FrameworkLoader(options) : frameworkLoader
  return loader.loadFramework(json)
}

/**
 * Convenience function for loading multiple frameworks
 */
export function loadFrameworks(jsonArray: unknown[], options?: FrameworkLoaderOptions): Framework[] {
  const loader = options ? new FrameworkLoader(options) : frameworkLoader
  return loader.loadFrameworks(jsonArray)
}
