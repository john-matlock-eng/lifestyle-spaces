import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  FrameworkRegistry,
  frameworkRegistry,
  registerFramework,
  getFramework,
  getAllFrameworks,
  getTemplate,
} from './FrameworkRegistry'
import type { Framework } from '../../types/framework.types'

describe('FrameworkRegistry', () => {
  // Helper to create a test framework
  const createTestFramework = (id: string, overrides: Partial<Framework> = {}): Framework => ({
    id,
    name: `Test Framework ${id}`,
    tagline: 'Test tagline',
    description: 'Test description',
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
    categories: [
      { id: 'cat1', name: 'Category 1', description: 'Test', order: 1 },
    ],
    templates: [
      {
        id: `${id}-template1`,
        name: 'Template 1',
        description: 'Test template',
        categoryId: 'cat1',
        lifecycle: 'foundation',
        frequency: 'once',
        order: 1,
        prerequisites: [],
        content: {
          sections: [{ id: 'section1', title: 'Section 1', order: 1 }],
          fields: {},
        },
        version: 1,
      },
    ],
    ...overrides,
  })

  beforeEach(() => {
    // Reset the singleton before each test
    FrameworkRegistry.resetInstance()
  })

  afterEach(() => {
    // Clean up after each test
    FrameworkRegistry.resetInstance()
  })

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = FrameworkRegistry.getInstance()
      const instance2 = FrameworkRegistry.getInstance()

      expect(instance1).toBe(instance2)
    })

    it('should reset instance correctly', () => {
      const instance1 = FrameworkRegistry.getInstance()
      instance1.register(createTestFramework('test1'))

      FrameworkRegistry.resetInstance()
      const instance2 = FrameworkRegistry.getInstance()

      expect(instance2.getCount()).toBe(0)
    })

    it('should export singleton frameworkRegistry', () => {
      expect(frameworkRegistry).toBeDefined()
      expect(frameworkRegistry).toBeInstanceOf(FrameworkRegistry)
    })
  })

  describe('register', () => {
    it('should register a framework', () => {
      const registry = FrameworkRegistry.getInstance()
      const framework = createTestFramework('test1')

      registry.register(framework)

      expect(registry.has('test1')).toBe(true)
    })

    it('should throw when registering duplicate ID', () => {
      const registry = FrameworkRegistry.getInstance()
      const framework = createTestFramework('test1')

      registry.register(framework)

      expect(() => registry.register(framework)).toThrow("Framework with ID 'test1' is already registered")
    })

    it('should emit register event', () => {
      const registry = FrameworkRegistry.getInstance()
      const framework = createTestFramework('test1')
      const listener = vi.fn()

      registry.subscribe(listener)
      registry.register(framework)

      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'register',
          frameworkId: 'test1',
          framework,
        })
      )
    })
  })

  describe('registerOrReplace', () => {
    it('should register new framework', () => {
      const registry = FrameworkRegistry.getInstance()
      const framework = createTestFramework('test1')

      registry.registerOrReplace(framework)

      expect(registry.has('test1')).toBe(true)
    })

    it('should replace existing framework', () => {
      const registry = FrameworkRegistry.getInstance()
      const framework1 = createTestFramework('test1', { name: 'Original' })
      const framework2 = createTestFramework('test1', { name: 'Replacement' })

      registry.register(framework1)
      registry.registerOrReplace(framework2)

      expect(registry.get('test1')?.name).toBe('Replacement')
    })
  })

  describe('unregister', () => {
    it('should unregister a framework', () => {
      const registry = FrameworkRegistry.getInstance()
      const framework = createTestFramework('test1')

      registry.register(framework)
      const result = registry.unregister('test1')

      expect(result).toBe(true)
      expect(registry.has('test1')).toBe(false)
    })

    it('should return false for non-existent framework', () => {
      const registry = FrameworkRegistry.getInstance()

      const result = registry.unregister('nonexistent')

      expect(result).toBe(false)
    })

    it('should emit unregister event', () => {
      const registry = FrameworkRegistry.getInstance()
      const framework = createTestFramework('test1')
      const listener = vi.fn()

      registry.register(framework)
      registry.subscribe(listener)
      registry.unregister('test1')

      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'unregister',
          frameworkId: 'test1',
        })
      )
    })
  })

  describe('get', () => {
    it('should return registered framework', () => {
      const registry = FrameworkRegistry.getInstance()
      const framework = createTestFramework('test1')

      registry.register(framework)
      const result = registry.get('test1')

      expect(result).toEqual(framework)
    })

    it('should return undefined for non-existent framework', () => {
      const registry = FrameworkRegistry.getInstance()

      const result = registry.get('nonexistent')

      expect(result).toBeUndefined()
    })
  })

  describe('has', () => {
    it('should return true for registered framework', () => {
      const registry = FrameworkRegistry.getInstance()
      registry.register(createTestFramework('test1'))

      expect(registry.has('test1')).toBe(true)
    })

    it('should return false for non-existent framework', () => {
      const registry = FrameworkRegistry.getInstance()

      expect(registry.has('nonexistent')).toBe(false)
    })
  })

  describe('getAll', () => {
    it('should return all frameworks', () => {
      const registry = FrameworkRegistry.getInstance()
      registry.register(createTestFramework('test1'))
      registry.register(createTestFramework('test2'))

      const frameworks = registry.getAll()

      expect(frameworks).toHaveLength(2)
    })

    it('should return sorted by name', () => {
      const registry = FrameworkRegistry.getInstance()
      registry.register(createTestFramework('b', { name: 'Zeta' }))
      registry.register(createTestFramework('a', { name: 'Alpha' }))

      const frameworks = registry.getAll()

      expect(frameworks[0].name).toBe('Alpha')
      expect(frameworks[1].name).toBe('Zeta')
    })

    it('should filter by isActive', () => {
      const registry = FrameworkRegistry.getInstance()
      registry.register(createTestFramework('active', { isActive: true }))
      registry.register(createTestFramework('inactive', { isActive: false }))

      const active = registry.getAll({ isActive: true })
      const inactive = registry.getAll({ isActive: false })

      expect(active).toHaveLength(1)
      expect(active[0].id).toBe('active')
      expect(inactive).toHaveLength(1)
      expect(inactive[0].id).toBe('inactive')
    })

    it('should filter by tags', () => {
      const registry = FrameworkRegistry.getInstance()
      registry.register(
        createTestFramework('tagged', {
          metadata: {
            schemaVersion: '1.0.0',
            createdAt: '2024-01-01T00:00:00Z',
            updatedAt: '2024-01-01T00:00:00Z',
            authors: [],
            tags: ['special'],
          },
        })
      )
      registry.register(createTestFramework('untagged'))

      const result = registry.getAll({ tags: ['special'] })

      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('tagged')
    })

    it('should filter by authorId', () => {
      const registry = FrameworkRegistry.getInstance()
      registry.register(
        createTestFramework('by-author', {
          metadata: {
            schemaVersion: '1.0.0',
            createdAt: '2024-01-01T00:00:00Z',
            updatedAt: '2024-01-01T00:00:00Z',
            authors: [{ id: 'author1', name: 'Author 1' }],
            tags: [],
          },
        })
      )
      registry.register(createTestFramework('other'))

      const result = registry.getAll({ authorId: 'author1' })

      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('by-author')
    })
  })

  describe('getAllIds', () => {
    it('should return all framework IDs', () => {
      const registry = FrameworkRegistry.getInstance()
      registry.register(createTestFramework('test1'))
      registry.register(createTestFramework('test2'))

      const ids = registry.getAllIds()

      expect(ids).toContain('test1')
      expect(ids).toContain('test2')
    })
  })

  describe('getCount', () => {
    it('should return correct count', () => {
      const registry = FrameworkRegistry.getInstance()

      expect(registry.getCount()).toBe(0)

      registry.register(createTestFramework('test1'))
      expect(registry.getCount()).toBe(1)

      registry.register(createTestFramework('test2'))
      expect(registry.getCount()).toBe(2)
    })
  })

  describe('getByTag', () => {
    it('should return frameworks with matching tag', () => {
      const registry = FrameworkRegistry.getInstance()
      registry.register(
        createTestFramework('tagged1', {
          metadata: {
            schemaVersion: '1.0.0',
            createdAt: '2024-01-01T00:00:00Z',
            updatedAt: '2024-01-01T00:00:00Z',
            authors: [],
            tags: ['goals', 'productivity'],
          },
        })
      )
      registry.register(
        createTestFramework('tagged2', {
          metadata: {
            schemaVersion: '1.0.0',
            createdAt: '2024-01-01T00:00:00Z',
            updatedAt: '2024-01-01T00:00:00Z',
            authors: [],
            tags: ['goals'],
          },
        })
      )
      registry.register(createTestFramework('untagged'))

      const result = registry.getByTag('goals')

      expect(result).toHaveLength(2)
    })
  })

  describe('Template Methods', () => {
    it('getTemplateById should find template across frameworks', () => {
      const registry = FrameworkRegistry.getInstance()
      registry.register(createTestFramework('test1'))

      const result = registry.getTemplateById('test1-template1')

      expect(result).toBeDefined()
      expect(result?.frameworkId).toBe('test1')
      expect(result?.template.id).toBe('test1-template1')
    })

    it('getTemplateById should return undefined for non-existent template', () => {
      const registry = FrameworkRegistry.getInstance()

      const result = registry.getTemplateById('nonexistent')

      expect(result).toBeUndefined()
    })

    it('getTemplate should find template in specific framework', () => {
      const registry = FrameworkRegistry.getInstance()
      registry.register(createTestFramework('test1'))

      const result = registry.getTemplate('test1', 'test1-template1')

      expect(result).toBeDefined()
      expect(result?.id).toBe('test1-template1')
    })

    it('getTemplate should return undefined for non-existent framework', () => {
      const registry = FrameworkRegistry.getInstance()

      const result = registry.getTemplate('nonexistent', 'template1')

      expect(result).toBeUndefined()
    })

    it('getTemplates should return all templates for framework', () => {
      const registry = FrameworkRegistry.getInstance()
      registry.register(
        createTestFramework('test1', {
          templates: [
            {
              id: 't1',
              name: 'T1',
              description: 'Test',
              categoryId: 'cat1',
              lifecycle: 'foundation',
              frequency: 'once',
              order: 1,
              prerequisites: [],
              content: { sections: [], fields: {} },
              version: 1,
            },
            {
              id: 't2',
              name: 'T2',
              description: 'Test',
              categoryId: 'cat1',
              lifecycle: 'recurring',
              frequency: 'daily',
              order: 2,
              prerequisites: [],
              content: { sections: [], fields: {} },
              version: 1,
            },
          ],
        })
      )

      const templates = registry.getTemplates('test1')

      expect(templates).toHaveLength(2)
    })

    it('getTemplates should return empty array for non-existent framework', () => {
      const registry = FrameworkRegistry.getInstance()

      const templates = registry.getTemplates('nonexistent')

      expect(templates).toEqual([])
    })

    it('getTemplatesByLifecycle should filter correctly', () => {
      const registry = FrameworkRegistry.getInstance()
      registry.register(
        createTestFramework('test1', {
          templates: [
            {
              id: 't1',
              name: 'T1',
              description: 'Test',
              categoryId: 'cat1',
              lifecycle: 'foundation',
              frequency: 'once',
              order: 1,
              prerequisites: [],
              content: { sections: [], fields: {} },
              version: 1,
            },
            {
              id: 't2',
              name: 'T2',
              description: 'Test',
              categoryId: 'cat1',
              lifecycle: 'recurring',
              frequency: 'daily',
              order: 2,
              prerequisites: [],
              content: { sections: [], fields: {} },
              version: 1,
            },
          ],
        })
      )

      const foundations = registry.getTemplatesByLifecycle('test1', 'foundation')
      const recurring = registry.getTemplatesByLifecycle('test1', 'recurring')

      expect(foundations).toHaveLength(1)
      expect(recurring).toHaveLength(1)
    })

    it('getTemplatesByFrequency should filter correctly', () => {
      const registry = FrameworkRegistry.getInstance()
      registry.register(
        createTestFramework('test1', {
          templates: [
            {
              id: 't1',
              name: 'T1',
              description: 'Test',
              categoryId: 'cat1',
              lifecycle: 'foundation',
              frequency: 'once',
              order: 1,
              prerequisites: [],
              content: { sections: [], fields: {} },
              version: 1,
            },
            {
              id: 't2',
              name: 'T2',
              description: 'Test',
              categoryId: 'cat1',
              lifecycle: 'recurring',
              frequency: 'daily',
              order: 2,
              prerequisites: [],
              content: { sections: [], fields: {} },
              version: 1,
            },
          ],
        })
      )

      const once = registry.getTemplatesByFrequency('test1', 'once')
      const daily = registry.getTemplatesByFrequency('test1', 'daily')

      expect(once).toHaveLength(1)
      expect(daily).toHaveLength(1)
    })

    it('getFoundationTemplates should return sorted foundations', () => {
      const registry = FrameworkRegistry.getInstance()
      registry.register(
        createTestFramework('test1', {
          templates: [
            {
              id: 'f2',
              name: 'Foundation 2',
              description: 'Test',
              categoryId: 'cat1',
              lifecycle: 'foundation',
              frequency: 'once',
              order: 2,
              prerequisites: [],
              content: { sections: [], fields: {} },
              version: 1,
            },
            {
              id: 'f1',
              name: 'Foundation 1',
              description: 'Test',
              categoryId: 'cat1',
              lifecycle: 'foundation',
              frequency: 'once',
              order: 1,
              prerequisites: [],
              content: { sections: [], fields: {} },
              version: 1,
            },
          ],
        })
      )

      const foundations = registry.getFoundationTemplates('test1')

      expect(foundations[0].id).toBe('f1')
      expect(foundations[1].id).toBe('f2')
    })

    it('getTemplatesByCategory should return templates in category', () => {
      const registry = FrameworkRegistry.getInstance()
      registry.register(
        createTestFramework('test1', {
          categories: [
            { id: 'cat1', name: 'Cat 1', description: 'Test', order: 1 },
            { id: 'cat2', name: 'Cat 2', description: 'Test', order: 2 },
          ],
          templates: [
            {
              id: 't1',
              name: 'T1',
              description: 'Test',
              categoryId: 'cat1',
              lifecycle: 'foundation',
              frequency: 'once',
              order: 1,
              prerequisites: [],
              content: { sections: [], fields: {} },
              version: 1,
            },
            {
              id: 't2',
              name: 'T2',
              description: 'Test',
              categoryId: 'cat2',
              lifecycle: 'foundation',
              frequency: 'once',
              order: 1,
              prerequisites: [],
              content: { sections: [], fields: {} },
              version: 1,
            },
          ],
        })
      )

      const cat1Templates = registry.getTemplatesByCategory('test1', 'cat1')

      expect(cat1Templates).toHaveLength(1)
      expect(cat1Templates[0].id).toBe('t1')
    })
  })

  describe('getCategories', () => {
    it('should return categories for framework', () => {
      const registry = FrameworkRegistry.getInstance()
      registry.register(createTestFramework('test1'))

      const categories = registry.getCategories('test1')

      expect(categories).toHaveLength(1)
      expect(categories[0].id).toBe('cat1')
    })

    it('should return empty array for non-existent framework', () => {
      const registry = FrameworkRegistry.getInstance()

      const categories = registry.getCategories('nonexistent')

      expect(categories).toEqual([])
    })
  })

  describe('search', () => {
    it('should search by name', () => {
      const registry = FrameworkRegistry.getInstance()
      registry.register(createTestFramework('test1', { name: 'Charter Framework' }))
      registry.register(createTestFramework('test2', { name: 'Different Name' }))

      const results = registry.search('Charter')

      expect(results).toHaveLength(1)
      expect(results[0].id).toBe('test1')
    })

    it('should search by description', () => {
      const registry = FrameworkRegistry.getInstance()
      registry.register(createTestFramework('test1', { description: 'A unique description' }))

      const results = registry.search('unique')

      expect(results).toHaveLength(1)
    })

    it('should search by tagline', () => {
      const registry = FrameworkRegistry.getInstance()
      registry.register(createTestFramework('test1', { tagline: 'Special tagline' }))

      const results = registry.search('special')

      expect(results).toHaveLength(1)
    })

    it('should search by tags', () => {
      const registry = FrameworkRegistry.getInstance()
      registry.register(
        createTestFramework('test1', {
          metadata: {
            schemaVersion: '1.0.0',
            createdAt: '2024-01-01T00:00:00Z',
            updatedAt: '2024-01-01T00:00:00Z',
            authors: [],
            tags: ['productivity', 'goals'],
          },
        })
      )

      const results = registry.search('productivity')

      expect(results).toHaveLength(1)
    })

    it('should be case insensitive', () => {
      const registry = FrameworkRegistry.getInstance()
      registry.register(createTestFramework('test1', { name: 'UPPERCASE NAME' }))

      const results = registry.search('uppercase')

      expect(results).toHaveLength(1)
    })
  })

  describe('clear', () => {
    it('should remove all frameworks', () => {
      const registry = FrameworkRegistry.getInstance()
      registry.register(createTestFramework('test1'))
      registry.register(createTestFramework('test2'))

      registry.clear()

      expect(registry.getCount()).toBe(0)
    })

    it('should emit clear event', () => {
      const registry = FrameworkRegistry.getInstance()
      const listener = vi.fn()

      registry.subscribe(listener)
      registry.clear()

      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'clear' })
      )
    })

    it('should reset initialized state', () => {
      const registry = FrameworkRegistry.getInstance()
      registry.setInitialized(true)

      registry.clear()

      expect(registry.isInitialized()).toBe(false)
    })
  })

  describe('subscribe', () => {
    it('should return unsubscribe function', () => {
      const registry = FrameworkRegistry.getInstance()
      const listener = vi.fn()

      const unsubscribe = registry.subscribe(listener)
      registry.register(createTestFramework('test1'))

      expect(listener).toHaveBeenCalledTimes(1)

      unsubscribe()
      registry.register(createTestFramework('test2'))

      expect(listener).toHaveBeenCalledTimes(1)
    })

    it('should handle listener errors gracefully', () => {
      const registry = FrameworkRegistry.getInstance()
      const errorListener = vi.fn(() => {
        throw new Error('Listener error')
      })
      const normalListener = vi.fn()
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      registry.subscribe(errorListener)
      registry.subscribe(normalListener)

      // Should not throw
      expect(() => registry.register(createTestFramework('test1'))).not.toThrow()
      expect(normalListener).toHaveBeenCalled()

      consoleSpy.mockRestore()
    })
  })

  describe('Initialization', () => {
    it('should track initialization state', () => {
      const registry = FrameworkRegistry.getInstance()

      expect(registry.isInitialized()).toBe(false)

      registry.setInitialized(true)

      expect(registry.isInitialized()).toBe(true)
    })
  })

  describe('Standalone Functions', () => {
    it('registerFramework should work', () => {
      registerFramework(createTestFramework('standalone-test'))

      expect(frameworkRegistry.has('standalone-test')).toBe(true)
    })

    it('getFramework should work', () => {
      frameworkRegistry.register(createTestFramework('getfw-test'))

      const result = getFramework('getfw-test')

      expect(result).toBeDefined()
    })

    it('getAllFrameworks should work', () => {
      frameworkRegistry.register(createTestFramework('getall-test'))

      const result = getAllFrameworks()

      expect(result.length).toBeGreaterThan(0)
    })

    it('getTemplate should work', () => {
      frameworkRegistry.register(createTestFramework('gettemplate-test'))

      const result = getTemplate('gettemplate-test', 'gettemplate-test-template1')

      expect(result).toBeDefined()
    })
  })
})
