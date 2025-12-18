import { describe, it, expect } from 'vitest'
import { DependencyGraph, buildGraph } from './DependencyGraph'
import type { Framework, FrameworkTemplate } from '../../types/framework.types'

describe('DependencyGraph', () => {
  // Helper to create a minimal valid template
  const createTemplate = (
    id: string,
    prerequisites: string[] = [],
    overrides: Partial<FrameworkTemplate> = {}
  ): FrameworkTemplate => ({
    id,
    name: `Template ${id}`,
    description: 'Test template',
    categoryId: 'cat1',
    lifecycle: 'foundation',
    frequency: 'once',
    order: 1,
    prerequisites,
    content: {
      sections: [{ id: 'section1', title: 'Section 1', order: 1 }],
      fields: {},
    },
    version: 1,
    ...overrides,
  })

  // Helper to create a minimal framework
  const createFramework = (templates: FrameworkTemplate[]): Framework => ({
    id: 'test-framework',
    name: 'Test Framework',
    tagline: 'A test framework',
    description: 'A framework for testing',
    version: 1,
    icon: '🧪',
    color: '#ffffff',
    isActive: true,
    metadata: {
      schemaVersion: '1.0.0',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
      authors: [{ id: 'test', name: 'Test Author' }],
      tags: ['test'],
    },
    categories: [{ id: 'cat1', name: 'Category 1', description: 'Test category', order: 1 }],
    templates,
  })

  describe('buildGraph', () => {
    it('should build a graph from a framework', () => {
      const framework = createFramework([
        createTemplate('a'),
        createTemplate('b', ['a']),
      ])

      const graph = buildGraph(framework)

      expect(graph).toBeInstanceOf(DependencyGraph)
      expect(graph.size()).toBe(2)
    })

    it('should handle empty framework', () => {
      const framework = createFramework([])

      const graph = buildGraph(framework)

      expect(graph.size()).toBe(0)
    })
  })

  describe('getNode', () => {
    it('should return a node by ID', () => {
      const framework = createFramework([createTemplate('a')])
      const graph = new DependencyGraph(framework)

      const node = graph.getNode('a')

      expect(node).toBeDefined()
      expect(node?.id).toBe('a')
    })

    it('should return undefined for non-existent node', () => {
      const framework = createFramework([createTemplate('a')])
      const graph = new DependencyGraph(framework)

      const node = graph.getNode('nonexistent')

      expect(node).toBeUndefined()
    })
  })

  describe('getAllNodes', () => {
    it('should return all nodes', () => {
      const framework = createFramework([
        createTemplate('a'),
        createTemplate('b'),
        createTemplate('c'),
      ])
      const graph = new DependencyGraph(framework)

      const nodes = graph.getAllNodes()

      expect(nodes).toHaveLength(3)
      expect(nodes.map((n) => n.id).sort()).toEqual(['a', 'b', 'c'])
    })
  })

  describe('getDirectDependencies', () => {
    it('should return direct dependencies', () => {
      const framework = createFramework([
        createTemplate('a'),
        createTemplate('b', ['a']),
        createTemplate('c', ['a', 'b']),
      ])
      const graph = new DependencyGraph(framework)

      expect(graph.getDirectDependencies('a')).toEqual([])
      expect(graph.getDirectDependencies('b')).toEqual(['a'])
      expect(graph.getDirectDependencies('c').sort()).toEqual(['a', 'b'])
    })

    it('should return empty array for non-existent node', () => {
      const framework = createFramework([createTemplate('a')])
      const graph = new DependencyGraph(framework)

      expect(graph.getDirectDependencies('nonexistent')).toEqual([])
    })
  })

  describe('getDirectDependents', () => {
    it('should return direct dependents', () => {
      const framework = createFramework([
        createTemplate('a'),
        createTemplate('b', ['a']),
        createTemplate('c', ['a']),
      ])
      const graph = new DependencyGraph(framework)

      expect(graph.getDirectDependents('a').sort()).toEqual(['b', 'c'])
      expect(graph.getDirectDependents('b')).toEqual([])
      expect(graph.getDirectDependents('c')).toEqual([])
    })

    it('should return empty array for non-existent node', () => {
      const framework = createFramework([createTemplate('a')])
      const graph = new DependencyGraph(framework)

      expect(graph.getDirectDependents('nonexistent')).toEqual([])
    })
  })

  describe('getAncestors', () => {
    it('should return all transitive dependencies', () => {
      const framework = createFramework([
        createTemplate('a'),
        createTemplate('b', ['a']),
        createTemplate('c', ['b']),
        createTemplate('d', ['c']),
      ])
      const graph = new DependencyGraph(framework)

      expect(graph.getAncestors('a')).toEqual([])
      expect(graph.getAncestors('b')).toEqual(['a'])
      expect(graph.getAncestors('c').sort()).toEqual(['a', 'b'])
      expect(graph.getAncestors('d').sort()).toEqual(['a', 'b', 'c'])
    })

    it('should handle diamond dependencies', () => {
      // a -> b, a -> c, b -> d, c -> d
      const framework = createFramework([
        createTemplate('a'),
        createTemplate('b', ['a']),
        createTemplate('c', ['a']),
        createTemplate('d', ['b', 'c']),
      ])
      const graph = new DependencyGraph(framework)

      expect(graph.getAncestors('d').sort()).toEqual(['a', 'b', 'c'])
    })

    it('should handle non-existent template', () => {
      const framework = createFramework([createTemplate('a')])
      const graph = new DependencyGraph(framework)

      expect(graph.getAncestors('nonexistent')).toEqual([])
    })
  })

  describe('getDescendants', () => {
    it('should return all transitive dependents', () => {
      const framework = createFramework([
        createTemplate('a'),
        createTemplate('b', ['a']),
        createTemplate('c', ['b']),
        createTemplate('d', ['c']),
      ])
      const graph = new DependencyGraph(framework)

      expect(graph.getDescendants('a').sort()).toEqual(['b', 'c', 'd'])
      expect(graph.getDescendants('b').sort()).toEqual(['c', 'd'])
      expect(graph.getDescendants('c')).toEqual(['d'])
      expect(graph.getDescendants('d')).toEqual([])
    })

    it('should handle diamond dependencies', () => {
      const framework = createFramework([
        createTemplate('a'),
        createTemplate('b', ['a']),
        createTemplate('c', ['a']),
        createTemplate('d', ['b', 'c']),
      ])
      const graph = new DependencyGraph(framework)

      expect(graph.getDescendants('a').sort()).toEqual(['b', 'c', 'd'])
    })
  })

  describe('detectCycle', () => {
    it('should detect no cycle in acyclic graph', () => {
      const framework = createFramework([
        createTemplate('a'),
        createTemplate('b', ['a']),
        createTemplate('c', ['b']),
      ])
      const graph = new DependencyGraph(framework)

      const result = graph.detectCycle()

      expect(result.hasCycle).toBe(false)
      expect(result.cyclePath).toBeUndefined()
    })

    it('should detect simple cycle (a -> b -> a)', () => {
      const framework = createFramework([
        createTemplate('a', ['b']),
        createTemplate('b', ['a']),
      ])
      const graph = new DependencyGraph(framework)

      const result = graph.detectCycle()

      expect(result.hasCycle).toBe(true)
      expect(result.cyclePath).toBeDefined()
      expect(result.cyclePath?.length).toBeGreaterThanOrEqual(2)
    })

    it('should detect complex cycle (a -> b -> c -> a)', () => {
      const framework = createFramework([
        createTemplate('a', ['c']),
        createTemplate('b', ['a']),
        createTemplate('c', ['b']),
      ])
      const graph = new DependencyGraph(framework)

      const result = graph.detectCycle()

      expect(result.hasCycle).toBe(true)
    })

    it('should detect self-reference cycle', () => {
      const framework = createFramework([createTemplate('a', ['a'])])
      const graph = new DependencyGraph(framework)

      const result = graph.detectCycle()

      expect(result.hasCycle).toBe(true)
    })
  })

  describe('hasCycle', () => {
    it('should return false for acyclic graph', () => {
      const framework = createFramework([
        createTemplate('a'),
        createTemplate('b', ['a']),
      ])
      const graph = new DependencyGraph(framework)

      expect(graph.hasCycle()).toBe(false)
    })

    it('should return true for cyclic graph', () => {
      const framework = createFramework([
        createTemplate('a', ['b']),
        createTemplate('b', ['a']),
      ])
      const graph = new DependencyGraph(framework)

      expect(graph.hasCycle()).toBe(true)
    })
  })

  describe('getRootTemplates', () => {
    it('should return templates with no dependencies', () => {
      const framework = createFramework([
        createTemplate('a'),
        createTemplate('b', ['a']),
        createTemplate('c'),
      ])
      const graph = new DependencyGraph(framework)

      const roots = graph.getRootTemplates()

      expect(roots.sort()).toEqual(['a', 'c'])
    })

    it('should return all templates when none have dependencies', () => {
      const framework = createFramework([
        createTemplate('a'),
        createTemplate('b'),
      ])
      const graph = new DependencyGraph(framework)

      const roots = graph.getRootTemplates()

      expect(roots.sort()).toEqual(['a', 'b'])
    })

    it('should return empty when all have dependencies', () => {
      const framework = createFramework([
        createTemplate('a', ['b']),
        createTemplate('b', ['a']),
      ])
      const graph = new DependencyGraph(framework)

      const roots = graph.getRootTemplates()

      expect(roots).toEqual([])
    })
  })

  describe('getLeafTemplates', () => {
    it('should return templates with no dependents', () => {
      const framework = createFramework([
        createTemplate('a'),
        createTemplate('b', ['a']),
        createTemplate('c', ['a']),
      ])
      const graph = new DependencyGraph(framework)

      const leaves = graph.getLeafTemplates()

      expect(leaves.sort()).toEqual(['b', 'c'])
    })
  })

  describe('getTopologicalOrder', () => {
    it('should return topological order for acyclic graph', () => {
      const framework = createFramework([
        createTemplate('c', ['b']),
        createTemplate('a'),
        createTemplate('b', ['a']),
      ])
      const graph = new DependencyGraph(framework)

      const order = graph.getTopologicalOrder()

      expect(order).not.toBeNull()
      expect(order).toHaveLength(3)
      // a must come before b, b must come before c
      const aIndex = order!.indexOf('a')
      const bIndex = order!.indexOf('b')
      const cIndex = order!.indexOf('c')
      expect(aIndex).toBeLessThan(bIndex)
      expect(bIndex).toBeLessThan(cIndex)
    })

    it('should return null for cyclic graph', () => {
      const framework = createFramework([
        createTemplate('a', ['b']),
        createTemplate('b', ['a']),
      ])
      const graph = new DependencyGraph(framework)

      const order = graph.getTopologicalOrder()

      expect(order).toBeNull()
    })
  })

  describe('getDepth', () => {
    it('should return 0 for root templates', () => {
      const framework = createFramework([
        createTemplate('a'),
        createTemplate('b', ['a']),
      ])
      const graph = new DependencyGraph(framework)

      expect(graph.getDepth('a')).toBe(0)
    })

    it('should return correct depth for nested templates', () => {
      const framework = createFramework([
        createTemplate('a'),
        createTemplate('b', ['a']),
        createTemplate('c', ['b']),
        createTemplate('d', ['c']),
      ])
      const graph = new DependencyGraph(framework)

      expect(graph.getDepth('b')).toBe(1)
      expect(graph.getDepth('c')).toBe(2)
      expect(graph.getDepth('d')).toBe(3)
    })
  })

  describe('dependsOn', () => {
    it('should return true for direct dependency', () => {
      const framework = createFramework([
        createTemplate('a'),
        createTemplate('b', ['a']),
      ])
      const graph = new DependencyGraph(framework)

      expect(graph.dependsOn('b', 'a')).toBe(true)
    })

    it('should return true for transitive dependency', () => {
      const framework = createFramework([
        createTemplate('a'),
        createTemplate('b', ['a']),
        createTemplate('c', ['b']),
      ])
      const graph = new DependencyGraph(framework)

      expect(graph.dependsOn('c', 'a')).toBe(true)
    })

    it('should return false when no dependency', () => {
      const framework = createFramework([
        createTemplate('a'),
        createTemplate('b'),
      ])
      const graph = new DependencyGraph(framework)

      expect(graph.dependsOn('a', 'b')).toBe(false)
      expect(graph.dependsOn('b', 'a')).toBe(false)
    })
  })

  describe('getFramework', () => {
    it('should return the original framework', () => {
      const framework = createFramework([createTemplate('a')])
      const graph = new DependencyGraph(framework)

      expect(graph.getFramework()).toBe(framework)
    })
  })

  describe('size', () => {
    it('should return the number of templates', () => {
      const framework = createFramework([
        createTemplate('a'),
        createTemplate('b'),
        createTemplate('c'),
      ])
      const graph = new DependencyGraph(framework)

      expect(graph.size()).toBe(3)
    })

    it('should return 0 for empty framework', () => {
      const framework = createFramework([])
      const graph = new DependencyGraph(framework)

      expect(graph.size()).toBe(0)
    })
  })

  describe('edge cases', () => {
    it('should handle missing prerequisite references gracefully', () => {
      // b references 'nonexistent' which doesn't exist
      const framework = createFramework([
        createTemplate('a'),
        createTemplate('b', ['nonexistent']),
      ])
      const graph = new DependencyGraph(framework)

      // Should still build the graph
      expect(graph.size()).toBe(2)
      // b should have 'nonexistent' as dependency
      expect(graph.getDirectDependencies('b')).toContain('nonexistent')
      // But no node exists for it
      expect(graph.getNode('nonexistent')).toBeUndefined()
    })

    it('should handle multiple roots and leaves', () => {
      const framework = createFramework([
        createTemplate('a'),
        createTemplate('b'),
        createTemplate('c', ['a', 'b']),
        createTemplate('d', ['a', 'b']),
      ])
      const graph = new DependencyGraph(framework)

      expect(graph.getRootTemplates().sort()).toEqual(['a', 'b'])
      expect(graph.getLeafTemplates().sort()).toEqual(['c', 'd'])
    })
  })
})
