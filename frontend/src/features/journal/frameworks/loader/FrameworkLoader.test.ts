import { describe, it, expect, beforeEach } from 'vitest'
import {
  FrameworkLoader,
  FrameworkLoadError,
  loadFramework,
  loadFrameworks,
} from './FrameworkLoader'

describe('FrameworkLoader', () => {
  let loader: FrameworkLoader

  // Helper to create a minimal valid template
  const createValidTemplate = (id: string, overrides: Record<string, unknown> = {}) => ({
    id,
    name: `Template ${id}`,
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
    ...overrides,
  })

  // Helper to create a minimal valid framework
  const createValidFramework = (overrides: Record<string, unknown> = {}) => ({
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
    categories: [
      { id: 'cat1', name: 'Category 1', description: 'Test category', order: 1 },
    ],
    templates: [createValidTemplate('template1')],
    ...overrides,
  })

  beforeEach(() => {
    loader = new FrameworkLoader()
  })

  describe('loadFramework', () => {
    it('should load a valid framework', () => {
      const json = createValidFramework()
      const framework = loader.loadFramework(json)

      expect(framework.id).toBe('test-framework')
      expect(framework.name).toBe('Test Framework')
    })

    it('should throw FrameworkLoadError for invalid input', () => {
      expect(() => loader.loadFramework({})).toThrow(FrameworkLoadError)
    })

    it('should throw FrameworkLoadError for null input', () => {
      expect(() => loader.loadFramework(null)).toThrow(FrameworkLoadError)
    })

    it('should include validation errors in exception', () => {
      try {
        loader.loadFramework({})
        expect.fail('Should have thrown')
      } catch (error) {
        expect(error).toBeInstanceOf(FrameworkLoadError)
        const loadError = error as FrameworkLoadError
        expect(loadError.validationResult.errors.length).toBeGreaterThan(0)
      }
    })

    it('should preserve original JSON in exception', () => {
      const json = { invalid: true }
      try {
        loader.loadFramework(json)
        expect.fail('Should have thrown')
      } catch (error) {
        expect(error).toBeInstanceOf(FrameworkLoadError)
        const loadError = error as FrameworkLoadError
        expect(loadError.originalJson).toEqual(json)
      }
    })
  })

  describe('loadFramework with normalization', () => {
    it('should sort categories by order', () => {
      const json = createValidFramework({
        categories: [
          { id: 'cat2', name: 'Category 2', description: 'Second', order: 2 },
          { id: 'cat1', name: 'Category 1', description: 'First', order: 1 },
        ],
        templates: [
          createValidTemplate('t1', { categoryId: 'cat1' }),
          createValidTemplate('t2', { categoryId: 'cat2', order: 2 }),
        ],
      })

      const framework = loader.loadFramework(json)

      expect(framework.categories[0].id).toBe('cat1')
      expect(framework.categories[1].id).toBe('cat2')
    })

    it('should ensure arrays exist', () => {
      const json = createValidFramework({
        templates: [createValidTemplate('template1')],
      })

      const framework = loader.loadFramework(json)

      expect(framework.templates[0].prerequisites).toEqual([])
      expect(framework.templates[0].unlockConditions).toEqual([])
    })

    it('should set default values for optional fields', () => {
      const json = createValidFramework()
      const framework = loader.loadFramework(json)

      expect(framework.templates[0].version).toBe(1)
      expect(framework.templates[0].icon).toBeDefined()
    })
  })

  describe('loadFramework without normalization', () => {
    it('should skip normalization when disabled', () => {
      const loaderNoNorm = new FrameworkLoader({ normalize: false })
      const json = createValidFramework({
        categories: [
          { id: 'cat2', name: 'Category 2', description: 'Second', order: 2 },
          { id: 'cat1', name: 'Category 1', description: 'First', order: 1 },
        ],
        templates: [
          createValidTemplate('t1', { categoryId: 'cat1' }),
          createValidTemplate('t2', { categoryId: 'cat2', order: 2 }),
        ],
      })

      const framework = loaderNoNorm.loadFramework(json)

      // Categories should retain original order
      expect(framework.categories[0].id).toBe('cat2')
    })
  })

  describe('loadFramework in strict mode', () => {
    it('should throw on warnings in strict mode', () => {
      const strictLoader = new FrameworkLoader({ strictMode: true })
      // Create framework with orphan category (generates warning)
      const json = createValidFramework({
        categories: [
          { id: 'cat1', name: 'Category 1', description: 'Test', order: 1 },
          { id: 'cat2', name: 'Orphan Category', description: 'Unused', order: 2 },
        ],
      })

      expect(() => strictLoader.loadFramework(json)).toThrow(FrameworkLoadError)
    })

    it('should not throw on warnings in normal mode', () => {
      const json = createValidFramework({
        categories: [
          { id: 'cat1', name: 'Category 1', description: 'Test', order: 1 },
          { id: 'cat2', name: 'Orphan Category', description: 'Unused', order: 2 },
        ],
      })

      expect(() => loader.loadFramework(json)).not.toThrow()
    })
  })

  describe('loadFramework with ID prefix', () => {
    it('should apply ID prefix to all IDs', () => {
      const prefixLoader = new FrameworkLoader({ idPrefix: 'prefix-' })
      const json = createValidFramework({
        templates: [
          createValidTemplate('a', { order: 1 }),
          createValidTemplate('b', { order: 2, prerequisites: ['a'] }),
        ],
      })

      const framework = prefixLoader.loadFramework(json)

      expect(framework.id).toBe('prefix-test-framework')
      expect(framework.categories[0].id).toBe('prefix-cat1')
      expect(framework.templates[0].id).toBe('prefix-a')
      expect(framework.templates[0].categoryId).toBe('prefix-cat1')
      expect(framework.templates[1].prerequisites).toContain('prefix-a')
    })

    it('should apply ID prefix to unlock condition template references', () => {
      const prefixLoader = new FrameworkLoader({ idPrefix: 'p-' })
      const json = createValidFramework({
        templates: [
          createValidTemplate('a', { order: 1 }),
          createValidTemplate('b', {
            order: 2,
            lifecycle: 'recurring',
            frequency: 'daily',
            unlockConditions: [
              {
                type: 'template_count',
                templateId: 'a',
                minCount: 1,
                description: 'Complete A',
              },
            ],
          }),
        ],
      })

      const framework = prefixLoader.loadFramework(json)

      expect(framework.templates[1].unlockConditions?.[0].templateId).toBe('p-a')
    })
  })

  describe('loadFrameworks', () => {
    it('should load multiple frameworks', () => {
      const frameworks = loader.loadFrameworks([
        createValidFramework({ id: 'framework-1' }),
        createValidFramework({ id: 'framework-2' }),
      ])

      expect(frameworks).toHaveLength(2)
      expect(frameworks[0].id).toBe('framework-1')
      expect(frameworks[1].id).toBe('framework-2')
    })

    it('should throw with index information on error', () => {
      try {
        loader.loadFrameworks([
          createValidFramework({ id: 'framework-1' }),
          { invalid: true },
        ])
        expect.fail('Should have thrown')
      } catch (error) {
        expect(error).toBeInstanceOf(FrameworkLoadError)
        expect((error as Error).message).toContain('index 1')
      }
    })

    it('should load empty array', () => {
      const frameworks = loader.loadFrameworks([])

      expect(frameworks).toHaveLength(0)
    })
  })

  describe('tryLoadFramework', () => {
    it('should return success result for valid framework', () => {
      const result = loader.tryLoadFramework(createValidFramework())

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.framework.id).toBe('test-framework')
      }
    })

    it('should return error result for invalid framework', () => {
      const result = loader.tryLoadFramework({})

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBeInstanceOf(FrameworkLoadError)
      }
    })
  })

  describe('FrameworkLoadError', () => {
    it('should have correct name', () => {
      try {
        loader.loadFramework({})
      } catch (error) {
        expect((error as Error).name).toBe('FrameworkLoadError')
      }
    })

    it('should provide detailed message', () => {
      try {
        loader.loadFramework({})
      } catch (error) {
        const loadError = error as FrameworkLoadError
        const detailed = loadError.getDetailedMessage()

        expect(detailed).toContain('Validation errors:')
      }
    })

    it('should include warnings in detailed message', () => {
      try {
        const strictLoader = new FrameworkLoader({ strictMode: true })
        strictLoader.loadFramework(
          createValidFramework({
            categories: [
              { id: 'cat1', name: 'Cat 1', description: 'Test', order: 1 },
              { id: 'cat2', name: 'Orphan', description: 'Test', order: 2 },
            ],
          })
        )
      } catch (error) {
        const loadError = error as FrameworkLoadError
        const detailed = loadError.getDetailedMessage()

        expect(detailed).toContain('Warnings:')
      }
    })
  })

  describe('Standalone functions', () => {
    it('loadFramework should work as standalone function', () => {
      const framework = loadFramework(createValidFramework())

      expect(framework.id).toBe('test-framework')
    })

    it('loadFramework should accept options', () => {
      const framework = loadFramework(createValidFramework(), { idPrefix: 'test-' })

      expect(framework.id).toBe('test-test-framework')
    })

    it('loadFrameworks should work as standalone function', () => {
      const frameworks = loadFrameworks([
        createValidFramework({ id: 'f1' }),
        createValidFramework({ id: 'f2' }),
      ])

      expect(frameworks).toHaveLength(2)
    })
  })

  describe('Performance', () => {
    it('should load 10 frameworks in under 100ms', () => {
      const frameworks = Array.from({ length: 10 }, (_, i) =>
        createValidFramework({ id: `framework-${i}` })
      )

      const start = performance.now()
      loader.loadFrameworks(frameworks)
      const duration = performance.now() - start

      expect(duration).toBeLessThan(100)
    })
  })
})
