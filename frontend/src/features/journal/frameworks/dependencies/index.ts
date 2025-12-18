/**
 * Dependency Resolution Module
 *
 * Provides tools for evaluating template dependencies, cooldowns,
 * and unlock conditions.
 *
 * @module dependencies
 *
 * @example
 * ```ts
 * import { createResolver, evaluateUnlock } from '@/features/journal/frameworks/dependencies'
 *
 * // Create a resolver for a framework
 * const resolver = createResolver(framework)
 *
 * // Check if a specific template is unlocked
 * const evaluation = resolver.evaluateUnlock('weekly-review', progress, entries)
 * if (evaluation.isUnlocked) {
 *   // Template is available
 * } else {
 *   console.log(evaluation.blockReasons)
 * }
 *
 * // Get next recommended template
 * const nextTemplate = resolver.getNextRecommended(progress, entries)
 * ```
 */

// ============================================================================
// DEPENDENCY GRAPH
// ============================================================================

export {
  DependencyGraph,
  buildGraph,
  type GraphNode,
  type CycleDetectionResult,
} from './DependencyGraph'

// ============================================================================
// COOLDOWN MANAGER
// ============================================================================

export {
  CooldownManager,
  cooldownManager,
  canCreateEntry,
  getRemainingCooldown,
  getLastEntryDate,
  type CooldownResult,
  type CooldownOptions,
} from './CooldownManager'

// ============================================================================
// DEPENDENCY RESOLVER
// ============================================================================

export {
  DependencyResolver,
  createResolver,
  evaluateUnlock,
  evaluateAllUnlocks,
  type DependencyResolverOptions,
  type UnlockSummary,
} from './DependencyResolver'
