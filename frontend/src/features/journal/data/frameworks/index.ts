/**
 * Framework Registry
 *
 * Central registry for all frameworks in the application.
 * Provides helper functions for accessing framework data.
 */

import type { Framework, FrameworkFilter } from '../../types/framework.types'
import { charterAndCourseFramework } from './charter-and-course'

/**
 * Registry of all available frameworks
 * Add new frameworks here as they are created
 */
const frameworkRegistry: Map<string, Framework> = new Map([
  [charterAndCourseFramework.id, charterAndCourseFramework],
])

/**
 * Get a framework by its ID
 *
 * @param id - The framework ID to look up
 * @returns The framework if found, undefined otherwise
 *
 * @example
 * ```ts
 * const framework = getFrameworkById('charter-and-course')
 * if (framework) {
 *   console.log(framework.name) // "Charter & Course"
 * }
 * ```
 */
export function getFrameworkById(id: string): Framework | undefined {
  return frameworkRegistry.get(id)
}

/**
 * Get all frameworks, optionally filtered
 *
 * @param filter - Optional filter criteria
 * @returns Array of frameworks matching the filter
 *
 * @example
 * ```ts
 * // Get all frameworks
 * const all = getAllFrameworks()
 *
 * // Get only active frameworks
 * const active = getAllFrameworks({ isActive: true })
 * ```
 */
export function getAllFrameworks(filter?: FrameworkFilter): Framework[] {
  let frameworks = Array.from(frameworkRegistry.values())

  if (filter) {
    if (filter.isActive !== undefined) {
      frameworks = frameworks.filter((f) => f.isActive === filter.isActive)
    }
  }

  // Sort by name for consistent ordering
  return frameworks.sort((a, b) => a.name.localeCompare(b.name))
}

/**
 * Check if a framework exists
 *
 * @param id - The framework ID to check
 * @returns true if the framework exists
 *
 * @example
 * ```ts
 * if (frameworkExists('charter-and-course')) {
 *   // Framework is available
 * }
 * ```
 */
export function frameworkExists(id: string): boolean {
  return frameworkRegistry.has(id)
}

/**
 * Get the total number of registered frameworks
 *
 * @returns The count of frameworks in the registry
 */
export function getFrameworkCount(): number {
  return frameworkRegistry.size
}

/**
 * Get all framework IDs
 *
 * @returns Array of all registered framework IDs
 */
export function getAllFrameworkIds(): string[] {
  return Array.from(frameworkRegistry.keys())
}

/**
 * Get a template configuration from a framework
 *
 * @param frameworkId - The framework ID
 * @param templateId - The template ID to find
 * @returns The template config if found, undefined otherwise
 *
 * @example
 * ```ts
 * const config = getFrameworkTemplateConfig('charter-and-course', 'cc-daily-checkin')
 * if (config) {
 *   console.log(config.frequency) // "daily"
 * }
 * ```
 */
export function getFrameworkTemplateConfig(
  frameworkId: string,
  templateId: string
) {
  const framework = getFrameworkById(frameworkId)
  if (!framework) return undefined

  return framework.templates.find((t) => t.templateId === templateId)
}

/**
 * Get all template IDs for a framework
 *
 * @param frameworkId - The framework ID
 * @returns Array of template IDs, or empty array if framework not found
 */
export function getFrameworkTemplateIds(frameworkId: string): string[] {
  const framework = getFrameworkById(frameworkId)
  if (!framework) return []

  return framework.templates.map((t) => t.templateId)
}

/**
 * Get foundation template IDs for a framework
 *
 * @param frameworkId - The framework ID
 * @returns Array of foundation template IDs in order
 */
export function getFoundationTemplateIds(frameworkId: string): string[] {
  const framework = getFrameworkById(frameworkId)
  if (!framework) return []

  return framework.templates
    .filter((t) => t.isFoundation)
    .sort((a, b) => a.order - b.order)
    .map((t) => t.templateId)
}

// Re-export the framework for direct access if needed
export { charterAndCourseFramework }
