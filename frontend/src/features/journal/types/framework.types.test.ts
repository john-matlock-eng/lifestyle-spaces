import { describe, it, expect } from 'vitest'
import {
  isTemplateFrequency,
  isTemplateLifecycle,
  isDataBindingSource,
  isFramework,
  isFrameworkTemplate,
} from './framework.types'

describe('Framework Type Guards', () => {
  describe('isTemplateFrequency', () => {
    it('should return true for valid frequencies', () => {
      const validFrequencies = [
        'once',
        'daily',
        'weekly',
        'monthly',
        'quarterly',
        'yearly',
        'as_needed',
      ]

      validFrequencies.forEach((freq) => {
        expect(isTemplateFrequency(freq)).toBe(true)
      })
    })

    it('should return false for invalid frequencies', () => {
      expect(isTemplateFrequency('hourly')).toBe(false)
      expect(isTemplateFrequency('biweekly')).toBe(false)
      expect(isTemplateFrequency('')).toBe(false)
      expect(isTemplateFrequency(null)).toBe(false)
      expect(isTemplateFrequency(undefined)).toBe(false)
      expect(isTemplateFrequency(123)).toBe(false)
      expect(isTemplateFrequency({})).toBe(false)
      expect(isTemplateFrequency([])).toBe(false)
    })
  })

  describe('isTemplateLifecycle', () => {
    it('should return true for valid lifecycles', () => {
      const validLifecycles = ['foundation', 'recurring', 'milestone', 'special']

      validLifecycles.forEach((lifecycle) => {
        expect(isTemplateLifecycle(lifecycle)).toBe(true)
      })
    })

    it('should return false for invalid lifecycles', () => {
      expect(isTemplateLifecycle('setup')).toBe(false)
      expect(isTemplateLifecycle('onetime')).toBe(false)
      expect(isTemplateLifecycle('')).toBe(false)
      expect(isTemplateLifecycle(null)).toBe(false)
      expect(isTemplateLifecycle(undefined)).toBe(false)
      expect(isTemplateLifecycle(42)).toBe(false)
      expect(isTemplateLifecycle({})).toBe(false)
    })
  })

  describe('isDataBindingSource', () => {
    it('should return true for valid sources', () => {
      const validSources = ['framework_entry', 'user_profile', 'computed', 'static']

      validSources.forEach((source) => {
        expect(isDataBindingSource(source)).toBe(true)
      })
    })

    it('should return false for invalid sources', () => {
      expect(isDataBindingSource('external')).toBe(false)
      expect(isDataBindingSource('api')).toBe(false)
      expect(isDataBindingSource('')).toBe(false)
      expect(isDataBindingSource(null)).toBe(false)
      expect(isDataBindingSource(undefined)).toBe(false)
      expect(isDataBindingSource(100)).toBe(false)
    })
  })

  describe('isFramework', () => {
    it('should return true for valid framework objects', () => {
      const validFramework = {
        id: 'test-framework',
        name: 'Test Framework',
        version: 1,
        categories: [],
        templates: [],
      }

      expect(isFramework(validFramework)).toBe(true)
    })

    it('should return true for complete framework objects', () => {
      const completeFramework = {
        id: 'charter-and-course',
        name: 'Charter & Course',
        tagline: 'Define your direction',
        description: 'A comprehensive framework',
        version: 1,
        icon: '🧭',
        color: '#6366f1',
        categories: [{ id: 'foundation', name: 'Foundation' }],
        templates: [{ id: 'cc-values', name: 'Values Discovery' }],
        metadata: { schemaVersion: '1.0.0' },
        isActive: true,
      }

      expect(isFramework(completeFramework)).toBe(true)
    })

    it('should return false for invalid framework objects', () => {
      // Missing id
      expect(isFramework({ name: 'Test', version: 1, categories: [], templates: [] })).toBe(false)

      // Missing name
      expect(isFramework({ id: 'test', version: 1, categories: [], templates: [] })).toBe(false)

      // Missing version
      expect(isFramework({ id: 'test', name: 'Test', categories: [], templates: [] })).toBe(false)

      // Invalid version type
      expect(
        isFramework({ id: 'test', name: 'Test', version: '1', categories: [], templates: [] })
      ).toBe(false)

      // Missing categories
      expect(isFramework({ id: 'test', name: 'Test', version: 1, templates: [] })).toBe(false)

      // Missing templates
      expect(isFramework({ id: 'test', name: 'Test', version: 1, categories: [] })).toBe(false)

      // Categories not an array
      expect(
        isFramework({ id: 'test', name: 'Test', version: 1, categories: {}, templates: [] })
      ).toBe(false)

      // Templates not an array
      expect(
        isFramework({ id: 'test', name: 'Test', version: 1, categories: [], templates: {} })
      ).toBe(false)
    })

    it('should return false for non-objects', () => {
      expect(isFramework(null)).toBe(false)
      expect(isFramework(undefined)).toBe(false)
      expect(isFramework('framework')).toBe(false)
      expect(isFramework(123)).toBe(false)
      expect(isFramework([])).toBe(false)
    })
  })

  describe('isFrameworkTemplate', () => {
    it('should return true for valid template objects', () => {
      const validTemplate = {
        id: 'cc-values-discovery',
        name: 'Values Discovery',
        categoryId: 'foundation',
        lifecycle: 'foundation',
        frequency: 'once',
        content: { sections: [], fields: {} },
      }

      expect(isFrameworkTemplate(validTemplate)).toBe(true)
    })

    it('should return true for complete template objects', () => {
      const completeTemplate = {
        id: 'cc-daily-checkin',
        name: 'Daily Check-in',
        description: 'Quick daily reflection',
        guidance: 'Start your day with intention',
        categoryId: 'daily',
        lifecycle: 'recurring',
        frequency: 'daily',
        order: 1,
        icon: '☀️',
        color: '#fbbf24',
        prerequisites: [],
        cooldownDays: 0,
        content: {
          sections: [{ id: 'main', title: 'Main', order: 1 }],
          fields: { mood: { id: 'mood', type: 'rating', label: 'Mood' } },
        },
        version: 1,
      }

      expect(isFrameworkTemplate(completeTemplate)).toBe(true)
    })

    it('should return false for invalid template objects', () => {
      // Missing id
      expect(
        isFrameworkTemplate({
          name: 'Test',
          categoryId: 'test',
          lifecycle: 'foundation',
          frequency: 'once',
          content: {},
        })
      ).toBe(false)

      // Missing name
      expect(
        isFrameworkTemplate({
          id: 'test',
          categoryId: 'test',
          lifecycle: 'foundation',
          frequency: 'once',
          content: {},
        })
      ).toBe(false)

      // Missing categoryId
      expect(
        isFrameworkTemplate({
          id: 'test',
          name: 'Test',
          lifecycle: 'foundation',
          frequency: 'once',
          content: {},
        })
      ).toBe(false)

      // Invalid lifecycle
      expect(
        isFrameworkTemplate({
          id: 'test',
          name: 'Test',
          categoryId: 'test',
          lifecycle: 'invalid',
          frequency: 'once',
          content: {},
        })
      ).toBe(false)

      // Invalid frequency
      expect(
        isFrameworkTemplate({
          id: 'test',
          name: 'Test',
          categoryId: 'test',
          lifecycle: 'foundation',
          frequency: 'invalid',
          content: {},
        })
      ).toBe(false)

      // Missing content
      expect(
        isFrameworkTemplate({
          id: 'test',
          name: 'Test',
          categoryId: 'test',
          lifecycle: 'foundation',
          frequency: 'once',
        })
      ).toBe(false)

      // Content not an object
      expect(
        isFrameworkTemplate({
          id: 'test',
          name: 'Test',
          categoryId: 'test',
          lifecycle: 'foundation',
          frequency: 'once',
          content: 'string',
        })
      ).toBe(false)
    })

    it('should return false for non-objects', () => {
      expect(isFrameworkTemplate(null)).toBe(false)
      expect(isFrameworkTemplate(undefined)).toBe(false)
      expect(isFrameworkTemplate('template')).toBe(false)
      expect(isFrameworkTemplate(456)).toBe(false)
      expect(isFrameworkTemplate([])).toBe(false)
    })
  })
})
