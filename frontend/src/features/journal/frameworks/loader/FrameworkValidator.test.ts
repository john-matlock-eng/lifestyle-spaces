import { describe, it, expect, beforeEach } from 'vitest'
import {
  FrameworkValidator,
  validateFramework,
  ValidationErrorCodes,
} from './FrameworkValidator'

describe('FrameworkValidator', () => {
  let validator: FrameworkValidator

  beforeEach(() => {
    validator = new FrameworkValidator()
  })

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

  describe('validateFramework', () => {
    it('should validate a correct framework', () => {
      const result = validator.validateFramework(createValidFramework())

      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
      expect(result.framework).toBeDefined()
    })

    it('should return framework when valid', () => {
      const framework = createValidFramework()
      const result = validator.validateFramework(framework)

      expect(result.framework).toEqual(framework)
    })

    it('should not return framework when invalid', () => {
      const result = validator.validateFramework({})

      expect(result.valid).toBe(false)
      expect(result.framework).toBeUndefined()
    })
  })

  describe('Schema Validation', () => {
    it('should reject null input', () => {
      const result = validator.validateFramework(null)

      expect(result.valid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
    })

    it('should reject undefined input', () => {
      const result = validator.validateFramework(undefined)

      expect(result.valid).toBe(false)
    })

    it('should reject empty object', () => {
      const result = validator.validateFramework({})

      expect(result.valid).toBe(false)
      expect(result.errors.some((e) => e.code === ValidationErrorCodes.MISSING_REQUIRED_FIELD)).toBe(
        true
      )
    })

    it('should reject missing required fields', () => {
      const result = validator.validateFramework({ id: 'test' })

      expect(result.valid).toBe(false)
      expect(result.errors.some((e) => e.code === ValidationErrorCodes.MISSING_REQUIRED_FIELD)).toBe(
        true
      )
    })

    it('should reject invalid id pattern', () => {
      const framework = createValidFramework({ id: 'Invalid ID With Spaces' })
      const result = validator.validateFramework(framework)

      expect(result.valid).toBe(false)
      expect(result.errors.some((e) => e.code === ValidationErrorCodes.INVALID_PATTERN)).toBe(true)
    })

    it('should reject invalid color format', () => {
      const framework = createValidFramework({ color: 'not-a-color' })
      const result = validator.validateFramework(framework)

      expect(result.valid).toBe(false)
    })

    it('should reject invalid version type', () => {
      const framework = createValidFramework({ version: '1' })
      const result = validator.validateFramework(framework)

      expect(result.valid).toBe(false)
      expect(result.errors.some((e) => e.code === ValidationErrorCodes.INVALID_TYPE)).toBe(true)
    })

    it('should reject invalid lifecycle value', () => {
      const framework = createValidFramework({
        templates: [createValidTemplate('template1', { lifecycle: 'invalid' })],
      })
      const result = validator.validateFramework(framework)

      expect(result.valid).toBe(false)
    })

    it('should reject invalid frequency value', () => {
      const framework = createValidFramework({
        templates: [createValidTemplate('template1', { frequency: 'hourly' })],
      })
      const result = validator.validateFramework(framework)

      expect(result.valid).toBe(false)
    })
  })

  describe('Reference Validation', () => {
    it('should detect invalid category reference', () => {
      const framework = createValidFramework({
        templates: [createValidTemplate('template1', { categoryId: 'nonexistent-category' })],
      })
      const result = validator.validateFramework(framework)

      expect(result.valid).toBe(false)
      expect(
        result.errors.some((e) => e.code === ValidationErrorCodes.INVALID_CATEGORY_REFERENCE)
      ).toBe(true)
    })

    it('should detect invalid prerequisite reference', () => {
      const framework = createValidFramework({
        templates: [createValidTemplate('template1', { prerequisites: ['nonexistent-template'] })],
      })
      const result = validator.validateFramework(framework)

      expect(result.valid).toBe(false)
      expect(
        result.errors.some((e) => e.code === ValidationErrorCodes.INVALID_PREREQUISITE_REFERENCE)
      ).toBe(true)
    })

    it('should detect self-reference in prerequisites', () => {
      const framework = createValidFramework({
        templates: [createValidTemplate('template1', { prerequisites: ['template1'] })],
      })
      const result = validator.validateFramework(framework)

      expect(result.valid).toBe(false)
      expect(result.errors.some((e) => e.code === ValidationErrorCodes.SELF_REFERENCE)).toBe(true)
    })

    it('should detect invalid template reference in unlock conditions', () => {
      const framework = createValidFramework({
        templates: [
          createValidTemplate('template1', {
            unlockConditions: [
              {
                type: 'template_count',
                templateId: 'nonexistent',
                minCount: 1,
                description: 'Test condition',
              },
            ],
          }),
        ],
      })
      const result = validator.validateFramework(framework)

      expect(result.valid).toBe(false)
      expect(
        result.errors.some((e) => e.code === ValidationErrorCodes.INVALID_TEMPLATE_REFERENCE)
      ).toBe(true)
    })
  })

  describe('Duplicate Detection', () => {
    it('should detect duplicate category IDs', () => {
      const framework = createValidFramework({
        categories: [
          { id: 'cat1', name: 'Category 1', description: 'Test', order: 1 },
          { id: 'cat1', name: 'Category 1 Duplicate', description: 'Test', order: 2 },
        ],
      })
      const result = validator.validateFramework(framework)

      expect(result.valid).toBe(false)
      expect(
        result.errors.some((e) => e.code === ValidationErrorCodes.DUPLICATE_CATEGORY_ID)
      ).toBe(true)
    })

    it('should detect duplicate template IDs', () => {
      const framework = createValidFramework({
        templates: [
          createValidTemplate('template1', { order: 1 }),
          createValidTemplate('template1', { order: 2, name: 'Duplicate' }),
        ],
      })
      const result = validator.validateFramework(framework)

      expect(result.valid).toBe(false)
      expect(
        result.errors.some((e) => e.code === ValidationErrorCodes.DUPLICATE_TEMPLATE_ID)
      ).toBe(true)
    })
  })

  describe('Circular Dependency Detection', () => {
    it('should detect simple circular dependency', () => {
      const framework = createValidFramework({
        templates: [
          createValidTemplate('template1', { order: 1, prerequisites: ['template2'] }),
          createValidTemplate('template2', { order: 2, prerequisites: ['template1'] }),
        ],
      })
      const result = validator.validateFramework(framework)

      expect(result.valid).toBe(false)
      expect(result.errors.some((e) => e.code === ValidationErrorCodes.CIRCULAR_DEPENDENCY)).toBe(
        true
      )
    })

    it('should detect complex circular dependency (A -> B -> C -> A)', () => {
      const framework = createValidFramework({
        templates: [
          createValidTemplate('a', { order: 1, prerequisites: ['b'] }),
          createValidTemplate('b', { order: 2, prerequisites: ['c'] }),
          createValidTemplate('c', { order: 3, prerequisites: ['a'] }),
        ],
      })
      const result = validator.validateFramework(framework)

      expect(result.valid).toBe(false)
      expect(result.errors.some((e) => e.code === ValidationErrorCodes.CIRCULAR_DEPENDENCY)).toBe(
        true
      )
    })

    it('should allow valid dependency chains', () => {
      const framework = createValidFramework({
        templates: [
          createValidTemplate('a', { order: 1, prerequisites: [] }),
          createValidTemplate('b', { order: 2, prerequisites: ['a'] }),
          createValidTemplate('c', { order: 3, prerequisites: ['a', 'b'] }),
        ],
      })
      const result = validator.validateFramework(framework)

      expect(result.valid).toBe(true)
    })
  })

  describe('Semantic Validation', () => {
    it('should warn about missing foundation templates', () => {
      const framework = createValidFramework({
        templates: [
          createValidTemplate('template1', { lifecycle: 'recurring', frequency: 'daily' }),
        ],
      })
      const result = validator.validateFramework(framework)

      expect(result.valid).toBe(true)
      expect(result.warnings.some((w) => w.code === ValidationErrorCodes.MISSING_FOUNDATION)).toBe(
        true
      )
    })

    it('should warn about orphan categories', () => {
      const framework = createValidFramework({
        categories: [
          { id: 'cat1', name: 'Category 1', description: 'Test', order: 1 },
          { id: 'cat2', name: 'Category 2', description: 'Unused', order: 2 },
        ],
      })
      const result = validator.validateFramework(framework)

      expect(result.valid).toBe(true)
      expect(result.warnings.some((w) => w.code === ValidationErrorCodes.ORPHAN_CATEGORY)).toBe(
        true
      )
    })

    it('should warn about first foundation with prerequisites', () => {
      const framework = createValidFramework({
        templates: [
          createValidTemplate('prereq', { lifecycle: 'recurring', frequency: 'daily', order: 1 }),
          createValidTemplate('foundation', {
            lifecycle: 'foundation',
            frequency: 'once',
            order: 2,
            prerequisites: ['prereq'],
          }),
        ],
      })
      const result = validator.validateFramework(framework)

      expect(result.valid).toBe(true)
      expect(
        result.warnings.some((w) => w.code === ValidationErrorCodes.FOUNDATION_WITH_PREREQUISITES)
      ).toBe(true)
    })
  })

  describe('validateFramework function', () => {
    it('should work as standalone function', () => {
      const result = validateFramework(createValidFramework())

      expect(result.valid).toBe(true)
    })
  })
})
