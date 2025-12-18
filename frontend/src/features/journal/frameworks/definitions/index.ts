/**
 * Framework Definitions Index
 *
 * Imports all framework definitions and auto-registers them with the registry.
 * Import this module to ensure all frameworks are available.
 *
 * @module definitions
 */

import type { Framework } from '../../types/framework.types'
import { FrameworkRegistry } from '../loader/FrameworkRegistry'
import { charterAndCourseFramework } from './charter-and-course'

// ============================================================================
// FRAMEWORK DEFINITIONS
// ============================================================================

/**
 * All framework definitions
 */
export const frameworkDefinitions: Framework[] = [charterAndCourseFramework]

// ============================================================================
// AUTO-REGISTRATION
// ============================================================================

/**
 * Initialize all frameworks by registering them with the registry
 *
 * @returns The number of frameworks registered
 */
export function initializeFrameworks(): number {
  const registry = FrameworkRegistry.getInstance()

  // Skip if already initialized
  if (registry.isInitialized()) {
    return registry.getCount()
  }

  let registered = 0
  for (const framework of frameworkDefinitions) {
    try {
      registry.register(framework)
      registered++
    } catch (error) {
      console.error(`Failed to register framework '${framework.id}':`, error)
    }
  }

  registry.setInitialized(true)
  return registered
}

/**
 * Ensure frameworks are initialized (safe to call multiple times)
 */
export function ensureFrameworksInitialized(): void {
  const registry = FrameworkRegistry.getInstance()
  if (!registry.isInitialized()) {
    initializeFrameworks()
  }
}

/**
 * Reload all frameworks (useful for hot-reloading in development)
 */
export function reloadFrameworks(): number {
  const registry = FrameworkRegistry.getInstance()
  registry.clear()
  return initializeFrameworks()
}

// ============================================================================
// EXPORTS
// ============================================================================

// Export individual frameworks for direct access
export { charterAndCourseFramework }

// Auto-initialize on module load (lazy initialization)
// This ensures frameworks are available when the module is imported
let initialized = false

/**
 * Get the framework registry with frameworks loaded
 * This is the recommended way to access frameworks
 */
export function getFrameworkRegistry(): FrameworkRegistry {
  if (!initialized) {
    initializeFrameworks()
    initialized = true
  }
  return FrameworkRegistry.getInstance()
}
