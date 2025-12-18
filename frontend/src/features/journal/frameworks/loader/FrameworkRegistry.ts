/**
 * Framework Registry
 *
 * Singleton registry for managing loaded frameworks at runtime.
 * Provides fast access to frameworks and their templates.
 *
 * @module FrameworkRegistry
 */

import type {
  Framework,
  FrameworkTemplate,
  FrameworkCategory,
  FrameworkFilter,
} from '../../types/framework.types'

// ============================================================================
// REGISTRY EVENT TYPES
// ============================================================================

/**
 * Event types emitted by the registry
 */
export type RegistryEventType = 'register' | 'unregister' | 'clear' | 'reload'

/**
 * Event payload for registry events
 */
export interface RegistryEvent {
  type: RegistryEventType
  frameworkId?: string
  framework?: Framework
  timestamp: number
}

/**
 * Event listener callback
 */
export type RegistryEventListener = (event: RegistryEvent) => void

// ============================================================================
// FRAMEWORK REGISTRY CLASS
// ============================================================================

/**
 * Framework Registry
 *
 * Singleton registry that holds all loaded frameworks and provides
 * fast lookup methods.
 */
export class FrameworkRegistry {
  private static instance: FrameworkRegistry | null = null

  private frameworks: Map<string, Framework> = new Map()
  private templateIndex: Map<string, { frameworkId: string; template: FrameworkTemplate }> = new Map()
  private categoryIndex: Map<string, Framework[]> = new Map()
  private listeners: Set<RegistryEventListener> = new Set()
  private initialized = false

  /**
   * Private constructor for singleton pattern
   */
  private constructor() {
    // Private constructor to enforce singleton
  }

  /**
   * Get the singleton instance
   */
  static getInstance(): FrameworkRegistry {
    if (!FrameworkRegistry.instance) {
      FrameworkRegistry.instance = new FrameworkRegistry()
    }
    return FrameworkRegistry.instance
  }

  /**
   * Reset the singleton instance (mainly for testing)
   */
  static resetInstance(): void {
    if (FrameworkRegistry.instance) {
      FrameworkRegistry.instance.clear()
      FrameworkRegistry.instance = null
    }
  }

  /**
   * Check if registry has been initialized
   */
  isInitialized(): boolean {
    return this.initialized
  }

  /**
   * Mark registry as initialized
   */
  setInitialized(value: boolean = true): void {
    this.initialized = value
  }

  /**
   * Register a framework
   *
   * @param framework - The framework to register
   * @throws Error if framework with same ID already exists
   */
  register(framework: Framework): void {
    if (this.frameworks.has(framework.id)) {
      throw new Error(`Framework with ID '${framework.id}' is already registered`)
    }

    this.frameworks.set(framework.id, framework)
    this.indexFramework(framework)
    this.emit({ type: 'register', frameworkId: framework.id, framework })
  }

  /**
   * Register a framework, replacing if it already exists
   *
   * @param framework - The framework to register
   */
  registerOrReplace(framework: Framework): void {
    if (this.frameworks.has(framework.id)) {
      this.unregister(framework.id)
    }
    this.register(framework)
  }

  /**
   * Unregister a framework
   *
   * @param id - The framework ID to unregister
   * @returns true if framework was removed, false if not found
   */
  unregister(id: string): boolean {
    const framework = this.frameworks.get(id)
    if (!framework) {
      return false
    }

    this.frameworks.delete(id)
    this.removeFromIndex(framework)
    this.emit({ type: 'unregister', frameworkId: id })
    return true
  }

  /**
   * Get a framework by ID
   *
   * @param id - The framework ID
   * @returns The framework or undefined
   */
  get(id: string): Framework | undefined {
    return this.frameworks.get(id)
  }

  /**
   * Check if a framework exists
   *
   * @param id - The framework ID
   * @returns true if framework exists
   */
  has(id: string): boolean {
    return this.frameworks.has(id)
  }

  /**
   * Get all registered frameworks
   *
   * @param filter - Optional filter criteria
   * @returns Array of frameworks
   */
  getAll(filter?: FrameworkFilter): Framework[] {
    let frameworks = Array.from(this.frameworks.values())

    if (filter) {
      if (filter.isActive !== undefined) {
        frameworks = frameworks.filter((f) => f.isActive === filter.isActive)
      }
      if (filter.tags && filter.tags.length > 0) {
        frameworks = frameworks.filter((f) =>
          filter.tags!.some((tag) => f.metadata.tags.includes(tag))
        )
      }
      if (filter.authorId) {
        frameworks = frameworks.filter((f) =>
          f.metadata.authors.some((a) => a.id === filter.authorId)
        )
      }
    }

    // Sort by name for consistent ordering
    return frameworks.sort((a, b) => a.name.localeCompare(b.name))
  }

  /**
   * Get all framework IDs
   *
   * @returns Array of framework IDs
   */
  getAllIds(): string[] {
    return Array.from(this.frameworks.keys())
  }

  /**
   * Get the count of registered frameworks
   *
   * @returns Number of frameworks
   */
  getCount(): number {
    return this.frameworks.size
  }

  /**
   * Get frameworks by category tag
   *
   * @param categoryTag - The category tag to filter by
   * @returns Array of frameworks that have the category tag
   */
  getByTag(tag: string): Framework[] {
    return this.getAll().filter((f) => f.metadata.tags.includes(tag))
  }

  /**
   * Get a template by its ID (searches all frameworks)
   *
   * @param templateId - The template ID
   * @returns The template and its framework ID, or undefined
   */
  getTemplateById(templateId: string): { frameworkId: string; template: FrameworkTemplate } | undefined {
    return this.templateIndex.get(templateId)
  }

  /**
   * Get a template from a specific framework
   *
   * @param frameworkId - The framework ID
   * @param templateId - The template ID
   * @returns The template or undefined
   */
  getTemplate(frameworkId: string, templateId: string): FrameworkTemplate | undefined {
    const framework = this.frameworks.get(frameworkId)
    if (!framework) {
      return undefined
    }
    return framework.templates.find((t) => t.id === templateId)
  }

  /**
   * Get all templates for a framework
   *
   * @param frameworkId - The framework ID
   * @returns Array of templates or empty array
   */
  getTemplates(frameworkId: string): FrameworkTemplate[] {
    const framework = this.frameworks.get(frameworkId)
    return framework?.templates || []
  }

  /**
   * Get all categories for a framework
   *
   * @param frameworkId - The framework ID
   * @returns Array of categories or empty array
   */
  getCategories(frameworkId: string): FrameworkCategory[] {
    const framework = this.frameworks.get(frameworkId)
    return framework?.categories || []
  }

  /**
   * Get templates by lifecycle phase
   *
   * @param frameworkId - The framework ID
   * @param lifecycle - The lifecycle phase
   * @returns Array of matching templates
   */
  getTemplatesByLifecycle(
    frameworkId: string,
    lifecycle: FrameworkTemplate['lifecycle']
  ): FrameworkTemplate[] {
    return this.getTemplates(frameworkId).filter((t) => t.lifecycle === lifecycle)
  }

  /**
   * Get templates by frequency
   *
   * @param frameworkId - The framework ID
   * @param frequency - The template frequency
   * @returns Array of matching templates
   */
  getTemplatesByFrequency(
    frameworkId: string,
    frequency: FrameworkTemplate['frequency']
  ): FrameworkTemplate[] {
    return this.getTemplates(frameworkId).filter((t) => t.frequency === frequency)
  }

  /**
   * Get foundation templates for a framework
   *
   * @param frameworkId - The framework ID
   * @returns Array of foundation templates in order
   */
  getFoundationTemplates(frameworkId: string): FrameworkTemplate[] {
    return this.getTemplatesByLifecycle(frameworkId, 'foundation').sort(
      (a, b) => a.order - b.order
    )
  }

  /**
   * Get templates by category
   *
   * @param frameworkId - The framework ID
   * @param categoryId - The category ID
   * @returns Array of templates in the category
   */
  getTemplatesByCategory(frameworkId: string, categoryId: string): FrameworkTemplate[] {
    return this.getTemplates(frameworkId)
      .filter((t) => t.categoryId === categoryId)
      .sort((a, b) => a.order - b.order)
  }

  /**
   * Search frameworks by name or description
   *
   * @param query - Search query string
   * @returns Array of matching frameworks
   */
  search(query: string): Framework[] {
    const lowerQuery = query.toLowerCase()
    return this.getAll().filter(
      (f) =>
        f.name.toLowerCase().includes(lowerQuery) ||
        f.description.toLowerCase().includes(lowerQuery) ||
        f.tagline.toLowerCase().includes(lowerQuery) ||
        f.metadata.tags.some((t) => t.toLowerCase().includes(lowerQuery))
    )
  }

  /**
   * Clear all registered frameworks
   */
  clear(): void {
    this.frameworks.clear()
    this.templateIndex.clear()
    this.categoryIndex.clear()
    this.initialized = false
    this.emit({ type: 'clear' })
  }

  /**
   * Add an event listener
   *
   * @param listener - The listener callback
   * @returns Unsubscribe function
   */
  subscribe(listener: RegistryEventListener): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  /**
   * Index a framework for fast lookups
   */
  private indexFramework(framework: Framework): void {
    // Index templates
    for (const template of framework.templates) {
      this.templateIndex.set(template.id, {
        frameworkId: framework.id,
        template,
      })
    }

    // Index by tags
    for (const tag of framework.metadata.tags) {
      const existing = this.categoryIndex.get(tag) || []
      existing.push(framework)
      this.categoryIndex.set(tag, existing)
    }
  }

  /**
   * Remove a framework from indexes
   */
  private removeFromIndex(framework: Framework): void {
    // Remove templates from index
    for (const template of framework.templates) {
      this.templateIndex.delete(template.id)
    }

    // Remove from tag index
    for (const tag of framework.metadata.tags) {
      const existing = this.categoryIndex.get(tag) || []
      const filtered = existing.filter((f) => f.id !== framework.id)
      if (filtered.length > 0) {
        this.categoryIndex.set(tag, filtered)
      } else {
        this.categoryIndex.delete(tag)
      }
    }
  }

  /**
   * Emit an event to all listeners
   */
  private emit(event: Omit<RegistryEvent, 'timestamp'>): void {
    const fullEvent: RegistryEvent = {
      ...event,
      timestamp: Date.now(),
    }
    for (const listener of this.listeners) {
      try {
        listener(fullEvent)
      } catch (error) {
        console.error('Error in registry event listener:', error)
      }
    }
  }
}

// Export the singleton instance
export const frameworkRegistry = FrameworkRegistry.getInstance()

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

/**
 * Register a framework with the global registry
 */
export function registerFramework(framework: Framework): void {
  frameworkRegistry.register(framework)
}

/**
 * Get a framework from the global registry
 */
export function getFramework(id: string): Framework | undefined {
  return frameworkRegistry.get(id)
}

/**
 * Get all frameworks from the global registry
 */
export function getAllFrameworks(filter?: FrameworkFilter): Framework[] {
  return frameworkRegistry.getAll(filter)
}

/**
 * Get a template from the global registry
 */
export function getTemplate(frameworkId: string, templateId: string): FrameworkTemplate | undefined {
  return frameworkRegistry.getTemplate(frameworkId, templateId)
}
