/**
 * Data Binding System Type Definitions
 *
 * Defines types for the data binding system that allows templates to reference
 * and pull data from other framework entries, user profiles, and computed values.
 *
 * @module data-binding.types
 */

import type { DataBindingSource, DataBindingMapping } from './framework.types'

// ============================================================================
// BINDING EXPRESSION PARSING
// ============================================================================

/**
 * Parsed representation of a binding expression
 *
 * A binding expression like "values_discovery.core_values[0]" would parse to:
 * - source: 'framework_entry'
 * - sourcePath: ['values_discovery', 'core_values']
 * - index: 0
 *
 * @example
 * ```ts
 * // Expression: "user.displayName"
 * const parsed: ParsedBindingExpression = {
 *   source: 'user_profile',
 *   sourcePath: ['user', 'displayName'],
 *   rawExpression: 'user.displayName'
 * }
 * ```
 */
export interface ParsedBindingExpression {
  /** The data source type */
  source: DataBindingSource
  /** Path segments to the target data */
  sourcePath: string[]
  /** Array index if accessing array element */
  index?: number
  /** Range for array slicing [start, end] */
  range?: [number, number]
  /** Transform function to apply */
  transform?: string
  /** Arguments for transform function */
  transformArgs?: Record<string, unknown>
  /** Original expression string */
  rawExpression: string
}

// ============================================================================
// BINDING RESOLUTION CONTEXT
// ============================================================================

/**
 * Context object provided during binding resolution
 *
 * Contains all available data sources that can be referenced in bindings.
 */
export interface BindingResolutionContext {
  /** Framework entries indexed by template ID */
  frameworkEntries: Record<string, FrameworkEntryData>
  /** User profile data */
  userProfile: UserProfileData
  /** Static/constant values */
  staticValues: Record<string, unknown>
  /** Computed values */
  computedValues: Record<string, unknown>
  /** Current date/time for time-based computations */
  currentDate: Date
  /** Current space ID */
  spaceId: string
  /** Current framework ID */
  frameworkId: string
}

/**
 * Data from a completed framework entry
 */
export interface FrameworkEntryData {
  /** The template ID this entry was created from */
  templateId: string
  /** The journal entry ID */
  journalId: string
  /** When this entry was created */
  createdAt: string
  /** When this entry was last updated */
  updatedAt: string
  /** Field values from this entry */
  values: Record<string, unknown>
}

/**
 * User profile data available for binding
 */
export interface UserProfileData {
  /** User ID */
  userId: string
  /** Display name */
  displayName: string
  /** Email address */
  email: string
  /** Username */
  username: string
  /** Profile creation date */
  createdAt: string
  /** Custom profile fields */
  customFields?: Record<string, unknown>
}

// ============================================================================
// RESOLVED BINDINGS
// ============================================================================

/**
 * Result of resolving a single binding
 */
export interface ResolvedBinding {
  /** The binding that was resolved */
  binding: DataBindingMapping
  /** The resolved value */
  value: unknown
  /** Whether resolution was successful */
  success: boolean
  /** Error message if resolution failed */
  error?: string
  /** Whether fallback value was used */
  usedFallback: boolean
  /** Source entry data that provided the value (if applicable) */
  sourceEntry?: FrameworkEntryData
}

/**
 * Collection of all resolved bindings for a template
 */
export interface ResolvedBindings {
  /** All resolved bindings keyed by target field ID */
  bindings: Record<string, ResolvedBinding>
  /** Field values ready to prefill */
  prefillValues: Record<string, unknown>
  /** Any bindings that failed to resolve */
  errors: BindingResolutionError[]
  /** Whether all required bindings were resolved */
  allRequiredResolved: boolean
  /** Missing required bindings */
  missingRequired: string[]
}

/**
 * Error during binding resolution
 */
export interface BindingResolutionError {
  /** The binding that failed */
  bindingId: string
  /** Target field ID */
  targetFieldId: string
  /** Error message */
  message: string
  /** Error code for programmatic handling */
  code: BindingErrorCode
  /** Source path that couldn't be resolved */
  sourcePath?: string
}

/**
 * Error codes for binding resolution failures
 */
export type BindingErrorCode =
  | 'SOURCE_NOT_FOUND' // Referenced source entry doesn't exist
  | 'PATH_NOT_FOUND' // Path within source doesn't exist
  | 'TRANSFORM_ERROR' // Transform function failed
  | 'TYPE_MISMATCH' // Value type doesn't match expected
  | 'REQUIRED_MISSING' // Required binding not resolvable
  | 'INVALID_EXPRESSION' // Expression couldn't be parsed
  | 'CIRCULAR_REFERENCE' // Circular dependency detected

// ============================================================================
// TRANSFORM REGISTRY
// ============================================================================

/**
 * Transform function signature
 */
export type TransformFunction = (
  value: unknown,
  args?: Record<string, unknown>
) => unknown

/**
 * Registry of available transform functions
 */
export interface TransformRegistry {
  /** Get a transform function by name */
  get: (name: string) => TransformFunction | undefined
  /** Register a new transform function */
  register: (name: string, fn: TransformFunction) => void
  /** Check if a transform exists */
  has: (name: string) => boolean
  /** Get all registered transform names */
  names: () => string[]
}

/**
 * Built-in transform function definitions
 */
export interface BuiltInTransforms {
  /** Get first item from array */
  first: TransformFunction
  /** Get last item from array */
  last: TransformFunction
  /** Get item at specific index */
  at: TransformFunction
  /** Join array into string */
  join: TransformFunction
  /** Count items in array */
  count: TransformFunction
  /** Get most recent item by date field */
  latest: TransformFunction
  /** Filter array by condition */
  filter: TransformFunction
  /** Map array values */
  map: TransformFunction
  /** Take first N items */
  take: TransformFunction
  /** Skip first N items */
  skip: TransformFunction
  /** Format date */
  formatDate: TransformFunction
  /** Format number */
  formatNumber: TransformFunction
  /** Uppercase string */
  uppercase: TransformFunction
  /** Lowercase string */
  lowercase: TransformFunction
  /** Capitalize string */
  capitalize: TransformFunction
  /** Truncate string */
  truncate: TransformFunction
  /** Get default if null/undefined */
  default: TransformFunction
}

// ============================================================================
// BINDING UTILITIES
// ============================================================================

/**
 * Options for the binding parser
 */
export interface BindingParserOptions {
  /** Whether to allow complex expressions with transforms */
  allowTransforms?: boolean
  /** Whether to allow array indexing */
  allowIndexing?: boolean
  /** Whether to allow array ranges */
  allowRanges?: boolean
  /** Custom source type mappings */
  sourceTypeMappings?: Record<string, DataBindingSource>
}

/**
 * Options for the binding resolver
 */
export interface BindingResolverOptions {
  /** Whether to throw on resolution errors */
  throwOnError?: boolean
  /** Whether to use fallback values */
  useFallbacks?: boolean
  /** Custom transform registry */
  transforms?: TransformRegistry
  /** Whether to resolve circular references (throws if detected) */
  detectCircular?: boolean
  /** Maximum depth for nested resolution */
  maxDepth?: number
}

// ============================================================================
// OUTPUT BINDING TYPES
// ============================================================================

/**
 * Definition of an output binding (field exposed for other templates)
 */
export interface OutputBindingDefinition {
  /** Field ID to expose */
  fieldId: string
  /** Key used to reference this output */
  outputKey: string
  /** Human-readable description */
  description?: string
  /** Expected value type */
  valueType: 'string' | 'number' | 'boolean' | 'array' | 'object'
  /** Whether this output is always available */
  guaranteed?: boolean
}

/**
 * Captured output values from a completed entry
 */
export interface CapturedOutputs {
  /** Template ID this output came from */
  templateId: string
  /** Journal entry ID */
  journalId: string
  /** When outputs were captured */
  capturedAt: string
  /** Output values keyed by output key */
  values: Record<string, unknown>
}

// ============================================================================
// TYPE GUARDS
// ============================================================================

/**
 * Type guard for ParsedBindingExpression
 */
export function isParsedBindingExpression(
  value: unknown
): value is ParsedBindingExpression {
  if (typeof value !== 'object' || value === null) return false
  const obj = value as Record<string, unknown>
  return (
    typeof obj.source === 'string' &&
    Array.isArray(obj.sourcePath) &&
    obj.sourcePath.every((p) => typeof p === 'string') &&
    typeof obj.rawExpression === 'string'
  )
}

/**
 * Type guard for ResolvedBinding
 */
export function isResolvedBinding(value: unknown): value is ResolvedBinding {
  if (typeof value !== 'object' || value === null) return false
  const obj = value as Record<string, unknown>
  return (
    typeof obj.binding === 'object' &&
    obj.binding !== null &&
    typeof obj.success === 'boolean' &&
    typeof obj.usedFallback === 'boolean'
  )
}

/**
 * Type guard for BindingResolutionError
 */
export function isBindingResolutionError(
  value: unknown
): value is BindingResolutionError {
  if (typeof value !== 'object' || value === null) return false
  const obj = value as Record<string, unknown>
  return (
    typeof obj.bindingId === 'string' &&
    typeof obj.targetFieldId === 'string' &&
    typeof obj.message === 'string' &&
    typeof obj.code === 'string'
  )
}

/**
 * All valid binding error codes
 */
const BINDING_ERROR_CODES: BindingErrorCode[] = [
  'SOURCE_NOT_FOUND',
  'PATH_NOT_FOUND',
  'TRANSFORM_ERROR',
  'TYPE_MISMATCH',
  'REQUIRED_MISSING',
  'INVALID_EXPRESSION',
  'CIRCULAR_REFERENCE',
]

/**
 * Type guard for BindingErrorCode
 */
export function isBindingErrorCode(value: unknown): value is BindingErrorCode {
  return typeof value === 'string' && BINDING_ERROR_CODES.includes(value as BindingErrorCode)
}

/**
 * Type guard for FrameworkEntryData
 */
export function isFrameworkEntryData(
  value: unknown
): value is FrameworkEntryData {
  if (typeof value !== 'object' || value === null) return false
  const obj = value as Record<string, unknown>
  return (
    typeof obj.templateId === 'string' &&
    typeof obj.journalId === 'string' &&
    typeof obj.createdAt === 'string' &&
    typeof obj.updatedAt === 'string' &&
    typeof obj.values === 'object' &&
    obj.values !== null
  )
}

/**
 * Type guard for CapturedOutputs
 */
export function isCapturedOutputs(value: unknown): value is CapturedOutputs {
  if (typeof value !== 'object' || value === null) return false
  const obj = value as Record<string, unknown>
  return (
    typeof obj.templateId === 'string' &&
    typeof obj.journalId === 'string' &&
    typeof obj.capturedAt === 'string' &&
    typeof obj.values === 'object' &&
    obj.values !== null
  )
}
