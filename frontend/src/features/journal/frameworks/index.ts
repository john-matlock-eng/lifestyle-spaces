/**
 * Framework System
 *
 * Central export point for the framework loading and registry system.
 *
 * @module frameworks
 *
 * @example
 * ```ts
 * // Import the registry (frameworks auto-load)
 * import { getFrameworkRegistry } from '@/features/journal/frameworks'
 *
 * const registry = getFrameworkRegistry()
 * const framework = registry.get('charter-and-course')
 * ```
 */

// ============================================================================
// LOADER EXPORTS
// ============================================================================

export {
  // Validator
  FrameworkValidator,
  frameworkValidator,
  validateFramework,
  ValidationErrorCodes,
  type ValidationSeverity,
  type ValidationIssue,
  type ValidationResult,
  type ValidationErrorCode,
  // Loader
  FrameworkLoader,
  FrameworkLoadError,
  frameworkLoader,
  loadFramework,
  loadFrameworks,
  type FrameworkLoaderOptions,
  // Registry
  FrameworkRegistry,
  frameworkRegistry,
  registerFramework,
  getFramework,
  getAllFrameworks,
  getTemplate,
  type RegistryEventType,
  type RegistryEvent,
  type RegistryEventListener,
} from './loader'

// ============================================================================
// DEFINITIONS EXPORTS
// ============================================================================

export {
  frameworkDefinitions,
  initializeFrameworks,
  ensureFrameworksInitialized,
  reloadFrameworks,
  getFrameworkRegistry,
  charterAndCourseFramework,
} from './definitions'

// ============================================================================
// DEPENDENCY RESOLUTION EXPORTS
// ============================================================================

export {
  // DependencyGraph
  DependencyGraph,
  buildGraph,
  type GraphNode,
  type CycleDetectionResult,
  // CooldownManager
  CooldownManager,
  cooldownManager,
  canCreateEntry,
  getRemainingCooldown,
  getLastEntryDate,
  type CooldownResult,
  type CooldownOptions,
  // DependencyResolver
  DependencyResolver,
  createResolver,
  evaluateUnlock,
  evaluateAllUnlocks,
  type DependencyResolverOptions,
  type UnlockSummary,
} from './dependencies'

// ============================================================================
// DATA BINDING EXPORTS
// ============================================================================

export {
  // Expression Parser
  BindingExpressionParser,
  bindingExpressionParser,
  parse,
  validate,
  isValidExpression,
  type PathSegmentType,
  type PathSegment,
  type ParsedBindingExpression,
  type ParserOptions,
  // Entry Data Resolver
  EntryDataResolver,
  InMemoryEntryProvider,
  createInMemoryResolver,
  type EntryScope,
  type EntryResolutionContext,
  type EntryProvider,
  type ExtractionResult,
  // Transforms
  BUILT_IN_TRANSFORMS,
  getTransform,
  getTransformDefinition,
  hasTransform,
  applyTransform,
  applyTransforms,
  getTransformNames,
  type TransformFunction,
  type TransformDefinition,
  // Data Binding Engine
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
} from './bindings'

// ============================================================================
// TYPE RE-EXPORTS (for convenience)
// ============================================================================

export type {
  Framework,
  FrameworkTemplate,
  FrameworkCategory,
  FrameworkMetadata,
  FrameworkAuthor,
  FrameworkFilter,
  TemplateFrequency,
  TemplateLifecycle,
  UnlockCondition,
  UnlockBlockReason,
  UnlockEvaluation,
  UserFrameworkProgress,
  FoundationCompletion,
  CompletedCycle,
  FrameworkCycle,
  FrameworkSummary,
} from '../types/framework.types'
