/**
 * Dependency Graph
 *
 * Represents template dependencies as a directed graph for efficient
 * traversal and cycle detection.
 *
 * @module DependencyGraph
 */

import type { Framework, FrameworkTemplate } from '../../types/framework.types'

// ============================================================================
// TYPES
// ============================================================================

/**
 * Node in the dependency graph
 */
export interface GraphNode {
  /** Template ID */
  id: string
  /** Direct dependencies (prerequisites) */
  dependencies: Set<string>
  /** Direct dependents (templates that depend on this) */
  dependents: Set<string>
  /** Reference to the template */
  template: FrameworkTemplate
}

/**
 * Result of cycle detection
 */
export interface CycleDetectionResult {
  /** Whether a cycle was detected */
  hasCycle: boolean
  /** The cycle path if found (e.g., ['a', 'b', 'c', 'a']) */
  cyclePath?: string[]
}

// ============================================================================
// DEPENDENCY GRAPH CLASS
// ============================================================================

/**
 * Dependency Graph
 *
 * Efficiently represents and traverses template dependencies.
 * Supports transitive dependency resolution and cycle detection.
 */
export class DependencyGraph {
  private nodes: Map<string, GraphNode> = new Map()
  private readonly framework: Framework

  constructor(framework: Framework) {
    this.framework = framework
    this.buildGraph()
  }

  /**
   * Build the graph from framework templates
   */
  private buildGraph(): void {
    // First pass: create all nodes
    for (const template of this.framework.templates) {
      this.nodes.set(template.id, {
        id: template.id,
        dependencies: new Set(template.prerequisites || []),
        dependents: new Set(),
        template,
      })
    }

    // Second pass: populate dependents (reverse edges)
    for (const [id, node] of this.nodes) {
      for (const depId of node.dependencies) {
        const depNode = this.nodes.get(depId)
        if (depNode) {
          depNode.dependents.add(id)
        }
      }
    }
  }

  /**
   * Get a node by template ID
   */
  getNode(templateId: string): GraphNode | undefined {
    return this.nodes.get(templateId)
  }

  /**
   * Get all nodes in the graph
   */
  getAllNodes(): GraphNode[] {
    return Array.from(this.nodes.values())
  }

  /**
   * Get direct dependencies (prerequisites) of a template
   */
  getDirectDependencies(templateId: string): string[] {
    const node = this.nodes.get(templateId)
    return node ? Array.from(node.dependencies) : []
  }

  /**
   * Get direct dependents of a template (templates that list this as prerequisite)
   */
  getDirectDependents(templateId: string): string[] {
    const node = this.nodes.get(templateId)
    return node ? Array.from(node.dependents) : []
  }

  /**
   * Get all ancestors (transitive dependencies) of a template
   * Uses BFS to traverse up the dependency tree
   */
  getAncestors(templateId: string): string[] {
    const ancestors: Set<string> = new Set()
    const queue: string[] = [...this.getDirectDependencies(templateId)]
    const visited: Set<string> = new Set()

    while (queue.length > 0) {
      const current = queue.shift()!
      if (visited.has(current)) continue
      visited.add(current)
      ancestors.add(current)

      const deps = this.getDirectDependencies(current)
      for (const dep of deps) {
        if (!visited.has(dep)) {
          queue.push(dep)
        }
      }
    }

    return Array.from(ancestors)
  }

  /**
   * Get all descendants (transitive dependents) of a template
   * Uses BFS to traverse down the dependency tree
   */
  getDescendants(templateId: string): string[] {
    const descendants: Set<string> = new Set()
    const queue: string[] = [...this.getDirectDependents(templateId)]
    const visited: Set<string> = new Set()

    while (queue.length > 0) {
      const current = queue.shift()!
      if (visited.has(current)) continue
      visited.add(current)
      descendants.add(current)

      const deps = this.getDirectDependents(current)
      for (const dep of deps) {
        if (!visited.has(dep)) {
          queue.push(dep)
        }
      }
    }

    return Array.from(descendants)
  }

  /**
   * Detect if there are any cycles in the dependency graph
   * Uses DFS with color marking (white/gray/black)
   */
  detectCycle(): CycleDetectionResult {
    const WHITE = 0 // Unvisited
    const GRAY = 1 // In progress (on current path)
    const BLACK = 2 // Completed

    const colors = new Map<string, number>()
    const parent = new Map<string, string | null>()

    // Initialize all nodes as white
    for (const id of this.nodes.keys()) {
      colors.set(id, WHITE)
      parent.set(id, null)
    }

    const reconstructCycle = (startId: string, endId: string): string[] => {
      const cycle: string[] = [endId]
      let current = startId
      while (current !== endId) {
        cycle.push(current)
        current = parent.get(current) || ''
        if (!current) break
      }
      cycle.push(endId)
      return cycle.reverse()
    }

    const dfs = (nodeId: string): CycleDetectionResult => {
      colors.set(nodeId, GRAY)

      const node = this.nodes.get(nodeId)
      if (node) {
        for (const depId of node.dependencies) {
          const depColor = colors.get(depId)

          if (depColor === GRAY) {
            // Found a back edge - cycle detected
            return {
              hasCycle: true,
              cyclePath: reconstructCycle(nodeId, depId),
            }
          }

          if (depColor === WHITE) {
            parent.set(depId, nodeId)
            const result = dfs(depId)
            if (result.hasCycle) {
              return result
            }
          }
        }
      }

      colors.set(nodeId, BLACK)
      return { hasCycle: false }
    }

    // Run DFS from all unvisited nodes
    for (const nodeId of this.nodes.keys()) {
      if (colors.get(nodeId) === WHITE) {
        const result = dfs(nodeId)
        if (result.hasCycle) {
          return result
        }
      }
    }

    return { hasCycle: false }
  }

  /**
   * Check if the graph has any cycles
   */
  hasCycle(): boolean {
    return this.detectCycle().hasCycle
  }

  /**
   * Get templates that have no dependencies (root nodes)
   */
  getRootTemplates(): string[] {
    const roots: string[] = []
    for (const [id, node] of this.nodes) {
      if (node.dependencies.size === 0) {
        roots.push(id)
      }
    }
    return roots
  }

  /**
   * Get templates that have no dependents (leaf nodes)
   */
  getLeafTemplates(): string[] {
    const leaves: string[] = []
    for (const [id, node] of this.nodes) {
      if (node.dependents.size === 0) {
        leaves.push(id)
      }
    }
    return leaves
  }

  /**
   * Get topological order of templates (dependencies before dependents)
   * Returns null if cycle exists
   */
  getTopologicalOrder(): string[] | null {
    if (this.hasCycle()) {
      return null
    }

    const visited: Set<string> = new Set()
    const result: string[] = []

    const visit = (nodeId: string): void => {
      if (visited.has(nodeId)) return
      visited.add(nodeId)

      // Visit all dependencies first
      const node = this.nodes.get(nodeId)
      if (node) {
        for (const depId of node.dependencies) {
          visit(depId)
        }
      }

      result.push(nodeId)
    }

    // Visit all nodes
    for (const nodeId of this.nodes.keys()) {
      visit(nodeId)
    }

    return result
  }

  /**
   * Get the depth of a template in the dependency tree
   * (maximum distance from any root node)
   */
  getDepth(templateId: string): number {
    const ancestors = this.getAncestors(templateId)
    if (ancestors.length === 0) return 0

    let maxDepth = 0
    for (const ancestorId of ancestors) {
      const ancestorDepth = this.getDepth(ancestorId)
      maxDepth = Math.max(maxDepth, ancestorDepth + 1)
    }

    return maxDepth
  }

  /**
   * Check if templateId depends on dependencyId (directly or transitively)
   */
  dependsOn(templateId: string, dependencyId: string): boolean {
    return this.getAncestors(templateId).includes(dependencyId)
  }

  /**
   * Get the framework this graph was built from
   */
  getFramework(): Framework {
    return this.framework
  }

  /**
   * Get the number of templates in the graph
   */
  size(): number {
    return this.nodes.size
  }
}

// ============================================================================
// FACTORY FUNCTION
// ============================================================================

/**
 * Build a dependency graph from a framework
 */
export function buildGraph(framework: Framework): DependencyGraph {
  return new DependencyGraph(framework)
}
