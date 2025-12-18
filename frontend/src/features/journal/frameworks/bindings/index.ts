/**
 * Data Binding Module
 *
 * Provides tools for resolving data bindings between templates.
 *
 * @module bindings
 *
 * @example
 * ```ts
 * import {
 *   DataBindingEngine,
 *   parse,
 *   applyTransform
 * } from '@/features/journal/frameworks/bindings'
 *
 * // Parse a binding expression
 * const parsed = parse('focus-areas[*].name')
 * console.log(parsed.hasWildcard) // true
 *
 * // Create a binding engine and resolve
 * const engine = new DataBindingEngine()
 * const result = await engine.resolveBindings(template, context)
 *
 * // Apply a transform
 * const joined = applyTransform('join', ['a', 'b', 'c'], { separator: ', ' })
 * console.log(joined) // "a, b, c"
 * ```
 */

// ============================================================================
// EXPRESSION PARSER
// ============================================================================

export {
  BindingExpressionParser,
  bindingExpressionParser,
  parse,
  validate,
  isValidExpression,
  type PathSegmentType,
  type PathSegment,
  type ParsedBindingExpression,
  type ParserOptions,
} from './BindingExpressionParser'

// ============================================================================
// ENTRY DATA RESOLVER
// ============================================================================

export {
  EntryDataResolver,
  InMemoryEntryProvider,
  createInMemoryResolver,
  createResolver,
  type EntryScope,
  type EntryResolutionContext,
  type EntryProvider,
  type ExtractionResult,
} from './EntryDataResolver'

// ============================================================================
// TRANSFORMS
// ============================================================================

export {
  BUILT_IN_TRANSFORMS,
  getTransform,
  getTransformDefinition,
  hasTransform,
  applyTransform,
  applyTransforms,
  getTransformNames,
  type TransformFunction,
  type TransformDefinition,
} from './transforms'

// ============================================================================
// DATA BINDING ENGINE
// ============================================================================

export {
  DataBindingEngine,
  createBindingEngine,
  createBindingEngineWithProvider,
  resolveBindings,
  type BindingMode,
  type BindingResolutionContext,
  type ResolvedBinding,
  type ResolvedBindings,
  type DataBindingEngineOptions,
  type BindingSourceConfig,
} from './DataBindingEngine'
