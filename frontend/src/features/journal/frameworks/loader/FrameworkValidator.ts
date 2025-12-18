/**
 * Framework Validator
 *
 * Validates framework JSON definitions against the schema and performs
 * additional semantic validation like cycle detection and reference checking.
 *
 * @module FrameworkValidator
 */

import Ajv from 'ajv'
import addFormats from 'ajv-formats'
import type { Framework } from '../../types/framework.types'
import frameworkSchema from '../../schemas/framework.schema.json'
import templateSchema from '../../schemas/template.schema.json'
import fieldSchema from '../../schemas/field.schema.json'

// ============================================================================
// VALIDATION RESULT TYPES
// ============================================================================

/**
 * Severity level for validation issues
 */
export type ValidationSeverity = 'error' | 'warning' | 'info'

/**
 * A single validation issue
 */
export interface ValidationIssue {
  /** Severity of the issue */
  severity: ValidationSeverity
  /** Error code for programmatic handling */
  code: string
  /** Human-readable message */
  message: string
  /** JSON path where the issue occurred */
  path?: string
  /** Additional context data */
  context?: Record<string, unknown>
}

/**
 * Result of framework validation
 */
export interface ValidationResult {
  /** Whether validation passed (no errors) */
  valid: boolean
  /** List of all issues found */
  issues: ValidationIssue[]
  /** Just the errors */
  errors: ValidationIssue[]
  /** Just the warnings */
  warnings: ValidationIssue[]
  /** The validated framework (if valid) */
  framework?: Framework
}

// ============================================================================
// VALIDATION ERROR CODES
// ============================================================================

export const ValidationErrorCodes = {
  // Schema validation errors
  SCHEMA_INVALID: 'SCHEMA_INVALID',
  MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD',
  INVALID_TYPE: 'INVALID_TYPE',
  INVALID_FORMAT: 'INVALID_FORMAT',
  INVALID_PATTERN: 'INVALID_PATTERN',

  // Reference validation errors
  INVALID_CATEGORY_REFERENCE: 'INVALID_CATEGORY_REFERENCE',
  INVALID_TEMPLATE_REFERENCE: 'INVALID_TEMPLATE_REFERENCE',
  INVALID_PREREQUISITE_REFERENCE: 'INVALID_PREREQUISITE_REFERENCE',
  DUPLICATE_TEMPLATE_ID: 'DUPLICATE_TEMPLATE_ID',
  DUPLICATE_CATEGORY_ID: 'DUPLICATE_CATEGORY_ID',

  // Dependency graph errors
  CIRCULAR_DEPENDENCY: 'CIRCULAR_DEPENDENCY',
  SELF_REFERENCE: 'SELF_REFERENCE',

  // Semantic validation errors
  FOUNDATION_WITH_PREREQUISITES: 'FOUNDATION_WITH_PREREQUISITES',
  ORPHAN_CATEGORY: 'ORPHAN_CATEGORY',
  MISSING_FOUNDATION: 'MISSING_FOUNDATION',
} as const

export type ValidationErrorCode = (typeof ValidationErrorCodes)[keyof typeof ValidationErrorCodes]

// ============================================================================
// FRAMEWORK VALIDATOR CLASS
// ============================================================================

/**
 * Framework Validator
 *
 * Validates framework JSON definitions against schema and performs
 * semantic validation including cycle detection.
 */
export class FrameworkValidator {
  private ajv: Ajv
  private validateSchema: ReturnType<Ajv['compile']>

  constructor() {
    this.ajv = new Ajv({
      allErrors: true,
      verbose: true,
      strict: false,
    })
    addFormats(this.ajv)

    // Add schemas
    this.ajv.addSchema(fieldSchema, 'field.schema.json')
    this.ajv.addSchema(templateSchema, 'template.schema.json')
    this.validateSchema = this.ajv.compile(frameworkSchema)
  }

  /**
   * Validate a framework JSON definition
   *
   * @param json - The JSON to validate (unknown type for safety)
   * @returns ValidationResult with issues and validated framework
   */
  validateFramework(json: unknown): ValidationResult {
    const issues: ValidationIssue[] = []

    // Step 1: JSON Schema validation
    const schemaValid = this.validateSchema(json)
    if (!schemaValid) {
      const schemaErrors = this.convertAjvErrors(this.validateSchema.errors || [])
      issues.push(...schemaErrors)
    }

    // If schema validation failed, return early with errors
    if (issues.some((i) => i.severity === 'error')) {
      return this.createResult(issues)
    }

    // Cast to Framework type for semantic validation
    const framework = json as Framework

    // Step 2: Reference validation
    const refIssues = this.validateReferences(framework)
    issues.push(...refIssues)

    // Step 3: Duplicate detection
    const dupIssues = this.validateDuplicates(framework)
    issues.push(...dupIssues)

    // Step 4: Dependency cycle detection
    const cycleIssues = this.validateDependencyCycles(framework)
    issues.push(...cycleIssues)

    // Step 5: Semantic validation
    const semanticIssues = this.validateSemantics(framework)
    issues.push(...semanticIssues)

    return this.createResult(issues, framework)
  }

  /**
   * Convert Ajv errors to ValidationIssues
   */
  private convertAjvErrors(errors: NonNullable<typeof this.validateSchema.errors>): ValidationIssue[] {
    return errors.map((error) => ({
      severity: 'error' as ValidationSeverity,
      code: this.mapAjvKeyword(error.keyword),
      message: this.formatAjvError(error),
      path: error.instancePath || '/',
      context: {
        keyword: error.keyword,
        params: error.params,
        schemaPath: error.schemaPath,
      },
    }))
  }

  /**
   * Map Ajv keywords to our error codes
   */
  private mapAjvKeyword(keyword: string): ValidationErrorCode {
    switch (keyword) {
      case 'required':
        return ValidationErrorCodes.MISSING_REQUIRED_FIELD
      case 'type':
        return ValidationErrorCodes.INVALID_TYPE
      case 'format':
        return ValidationErrorCodes.INVALID_FORMAT
      case 'pattern':
        return ValidationErrorCodes.INVALID_PATTERN
      default:
        return ValidationErrorCodes.SCHEMA_INVALID
    }
  }

  /**
   * Format Ajv error into human-readable message
   */
  private formatAjvError(error: NonNullable<typeof this.validateSchema.errors>[0]): string {
    const path = error.instancePath || 'root'
    switch (error.keyword) {
      case 'required':
        return `Missing required field '${error.params.missingProperty}' at ${path}`
      case 'type':
        return `Expected ${error.params.type} at ${path}, got ${typeof error.data}`
      case 'enum':
        return `Invalid value at ${path}. Expected one of: ${(error.params.allowedValues as string[]).join(', ')}`
      case 'pattern':
        return `Value at ${path} does not match pattern ${error.params.pattern}`
      case 'format':
        return `Invalid format at ${path}. Expected ${error.params.format}`
      case 'minItems':
        return `Array at ${path} must have at least ${error.params.limit} items`
      case 'minimum':
        return `Value at ${path} must be >= ${error.params.limit}`
      default:
        return error.message || `Validation error at ${path}`
    }
  }

  /**
   * Validate all references in the framework
   */
  private validateReferences(framework: Framework): ValidationIssue[] {
    const issues: ValidationIssue[] = []
    const categoryIds = new Set(framework.categories.map((c) => c.id))
    const templateIds = new Set(framework.templates.map((t) => t.id))

    // Validate template category references
    for (const template of framework.templates) {
      if (!categoryIds.has(template.categoryId)) {
        issues.push({
          severity: 'error',
          code: ValidationErrorCodes.INVALID_CATEGORY_REFERENCE,
          message: `Template '${template.id}' references non-existent category '${template.categoryId}'`,
          path: `/templates/${template.id}/categoryId`,
          context: { templateId: template.id, categoryId: template.categoryId },
        })
      }

      // Validate prerequisite references
      for (const prereq of template.prerequisites || []) {
        if (!templateIds.has(prereq)) {
          issues.push({
            severity: 'error',
            code: ValidationErrorCodes.INVALID_PREREQUISITE_REFERENCE,
            message: `Template '${template.id}' has prerequisite '${prereq}' which does not exist`,
            path: `/templates/${template.id}/prerequisites`,
            context: { templateId: template.id, prerequisiteId: prereq },
          })
        }

        // Check for self-reference
        if (prereq === template.id) {
          issues.push({
            severity: 'error',
            code: ValidationErrorCodes.SELF_REFERENCE,
            message: `Template '${template.id}' cannot be a prerequisite of itself`,
            path: `/templates/${template.id}/prerequisites`,
            context: { templateId: template.id },
          })
        }
      }

      // Validate unlock condition template references
      for (const condition of template.unlockConditions || []) {
        if (condition.templateId && !templateIds.has(condition.templateId)) {
          issues.push({
            severity: 'error',
            code: ValidationErrorCodes.INVALID_TEMPLATE_REFERENCE,
            message: `Template '${template.id}' unlock condition references non-existent template '${condition.templateId}'`,
            path: `/templates/${template.id}/unlockConditions`,
            context: { templateId: template.id, referencedTemplateId: condition.templateId },
          })
        }
      }
    }

    return issues
  }

  /**
   * Validate no duplicate IDs
   */
  private validateDuplicates(framework: Framework): ValidationIssue[] {
    const issues: ValidationIssue[] = []

    // Check duplicate category IDs
    const categoryIds = new Map<string, number>()
    for (const category of framework.categories) {
      const count = (categoryIds.get(category.id) || 0) + 1
      categoryIds.set(category.id, count)
    }
    for (const [id, count] of categoryIds) {
      if (count > 1) {
        issues.push({
          severity: 'error',
          code: ValidationErrorCodes.DUPLICATE_CATEGORY_ID,
          message: `Duplicate category ID '${id}' found ${count} times`,
          path: '/categories',
          context: { categoryId: id, count },
        })
      }
    }

    // Check duplicate template IDs
    const templateIds = new Map<string, number>()
    for (const template of framework.templates) {
      const count = (templateIds.get(template.id) || 0) + 1
      templateIds.set(template.id, count)
    }
    for (const [id, count] of templateIds) {
      if (count > 1) {
        issues.push({
          severity: 'error',
          code: ValidationErrorCodes.DUPLICATE_TEMPLATE_ID,
          message: `Duplicate template ID '${id}' found ${count} times`,
          path: '/templates',
          context: { templateId: id, count },
        })
      }
    }

    return issues
  }

  /**
   * Validate no circular dependencies in prerequisites
   */
  private validateDependencyCycles(framework: Framework): ValidationIssue[] {
    const issues: ValidationIssue[] = []

    // Build adjacency list
    const graph = new Map<string, string[]>()
    for (const template of framework.templates) {
      graph.set(template.id, template.prerequisites || [])
    }

    // Detect cycles using DFS
    const visited = new Set<string>()
    const recursionStack = new Set<string>()
    const cyclePath: string[] = []

    const detectCycle = (nodeId: string): boolean => {
      visited.add(nodeId)
      recursionStack.add(nodeId)
      cyclePath.push(nodeId)

      const neighbors = graph.get(nodeId) || []
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          if (detectCycle(neighbor)) {
            return true
          }
        } else if (recursionStack.has(neighbor)) {
          // Found a cycle
          const cycleStart = cyclePath.indexOf(neighbor)
          const cycle = cyclePath.slice(cycleStart)
          cycle.push(neighbor) // Complete the cycle
          issues.push({
            severity: 'error',
            code: ValidationErrorCodes.CIRCULAR_DEPENDENCY,
            message: `Circular dependency detected: ${cycle.join(' -> ')}`,
            path: '/templates',
            context: { cycle },
          })
          return true
        }
      }

      recursionStack.delete(nodeId)
      cyclePath.pop()
      return false
    }

    for (const template of framework.templates) {
      if (!visited.has(template.id)) {
        detectCycle(template.id)
      }
    }

    return issues
  }

  /**
   * Perform semantic validation
   */
  private validateSemantics(framework: Framework): ValidationIssue[] {
    const issues: ValidationIssue[] = []

    // Check for foundation templates
    const foundationTemplates = framework.templates.filter((t) => t.lifecycle === 'foundation')
    if (foundationTemplates.length === 0) {
      issues.push({
        severity: 'warning',
        code: ValidationErrorCodes.MISSING_FOUNDATION,
        message: 'Framework has no foundation templates. Users may not have a clear starting point.',
        path: '/templates',
      })
    }

    // Check that first foundation has no prerequisites
    const sortedFoundations = [...foundationTemplates].sort((a, b) => a.order - b.order)
    if (sortedFoundations.length > 0) {
      const firstFoundation = sortedFoundations[0]
      if (firstFoundation.prerequisites && firstFoundation.prerequisites.length > 0) {
        issues.push({
          severity: 'warning',
          code: ValidationErrorCodes.FOUNDATION_WITH_PREREQUISITES,
          message: `First foundation template '${firstFoundation.id}' has prerequisites. This may block users from starting.`,
          path: `/templates/${firstFoundation.id}/prerequisites`,
          context: { templateId: firstFoundation.id },
        })
      }
    }

    // Check for orphan categories (categories with no templates)
    const usedCategories = new Set(framework.templates.map((t) => t.categoryId))
    for (const category of framework.categories) {
      if (!usedCategories.has(category.id)) {
        issues.push({
          severity: 'warning',
          code: ValidationErrorCodes.ORPHAN_CATEGORY,
          message: `Category '${category.id}' has no templates`,
          path: `/categories/${category.id}`,
          context: { categoryId: category.id },
        })
      }
    }

    return issues
  }

  /**
   * Create the validation result
   */
  private createResult(issues: ValidationIssue[], framework?: Framework): ValidationResult {
    const errors = issues.filter((i) => i.severity === 'error')
    const warnings = issues.filter((i) => i.severity === 'warning')

    return {
      valid: errors.length === 0,
      issues,
      errors,
      warnings,
      framework: errors.length === 0 ? framework : undefined,
    }
  }
}

// Export singleton instance for convenience
export const frameworkValidator = new FrameworkValidator()

/**
 * Convenience function for validating frameworks
 */
export function validateFramework(json: unknown): ValidationResult {
  return frameworkValidator.validateFramework(json)
}
