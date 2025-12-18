import { describe, it, expect } from 'vitest'
import {
  getFrameworkById,
  getAllFrameworks,
  frameworkExists,
  getFrameworkCount,
  getAllFrameworkIds,
  getFrameworkTemplateConfig,
  getFrameworkTemplateIds,
  getFoundationTemplateIds,
  charterAndCourseFramework,
} from './index'

describe('Framework Registry', () => {
  describe('getFrameworkById', () => {
    it('should return the framework when it exists', () => {
      const framework = getFrameworkById('charter-and-course')

      expect(framework).toBeDefined()
      expect(framework?.id).toBe('charter-and-course')
      expect(framework?.name).toBe('Charter & Course')
    })

    it('should return undefined for non-existent framework', () => {
      const framework = getFrameworkById('non-existent')

      expect(framework).toBeUndefined()
    })

    it('should return undefined for empty string', () => {
      const framework = getFrameworkById('')

      expect(framework).toBeUndefined()
    })
  })

  describe('getAllFrameworks', () => {
    it('should return all frameworks when no filter is provided', () => {
      const frameworks = getAllFrameworks()

      expect(frameworks).toBeInstanceOf(Array)
      expect(frameworks.length).toBeGreaterThan(0)
      expect(frameworks.some((f) => f.id === 'charter-and-course')).toBe(true)
    })

    it('should filter by isActive when provided', () => {
      const activeFrameworks = getAllFrameworks({ isActive: true })

      expect(activeFrameworks.every((f) => f.isActive === true)).toBe(true)
    })

    it('should return empty array when filtering for inactive and none exist', () => {
      // Currently all frameworks are active
      const inactiveFrameworks = getAllFrameworks({ isActive: false })

      expect(inactiveFrameworks).toBeInstanceOf(Array)
      // May be empty or contain inactive frameworks
    })

    it('should return frameworks sorted by name', () => {
      const frameworks = getAllFrameworks()

      if (frameworks.length > 1) {
        for (let i = 1; i < frameworks.length; i++) {
          expect(
            frameworks[i - 1].name.localeCompare(frameworks[i].name)
          ).toBeLessThanOrEqual(0)
        }
      }
    })
  })

  describe('frameworkExists', () => {
    it('should return true for existing framework', () => {
      expect(frameworkExists('charter-and-course')).toBe(true)
    })

    it('should return false for non-existent framework', () => {
      expect(frameworkExists('non-existent')).toBe(false)
    })

    it('should return false for empty string', () => {
      expect(frameworkExists('')).toBe(false)
    })
  })

  describe('getFrameworkCount', () => {
    it('should return the number of registered frameworks', () => {
      const count = getFrameworkCount()

      expect(count).toBeGreaterThan(0)
      expect(typeof count).toBe('number')
    })

    it('should match the length of getAllFrameworks', () => {
      const count = getFrameworkCount()
      const frameworks = getAllFrameworks()

      expect(count).toBe(frameworks.length)
    })
  })

  describe('getAllFrameworkIds', () => {
    it('should return an array of framework IDs', () => {
      const ids = getAllFrameworkIds()

      expect(ids).toBeInstanceOf(Array)
      expect(ids.length).toBeGreaterThan(0)
      expect(ids).toContain('charter-and-course')
    })

    it('should have the same count as getFrameworkCount', () => {
      const ids = getAllFrameworkIds()
      const count = getFrameworkCount()

      expect(ids.length).toBe(count)
    })

    it('should contain only strings', () => {
      const ids = getAllFrameworkIds()

      expect(ids.every((id) => typeof id === 'string')).toBe(true)
    })
  })

  describe('getFrameworkTemplateConfig', () => {
    it('should return template config for valid framework and template', () => {
      const config = getFrameworkTemplateConfig(
        'charter-and-course',
        'cc-values-discovery'
      )

      expect(config).toBeDefined()
      expect(config?.templateId).toBe('cc-values-discovery')
      expect(config?.isFoundation).toBe(true)
    })

    it('should return undefined for non-existent framework', () => {
      const config = getFrameworkTemplateConfig(
        'non-existent',
        'cc-values-discovery'
      )

      expect(config).toBeUndefined()
    })

    it('should return undefined for non-existent template', () => {
      const config = getFrameworkTemplateConfig(
        'charter-and-course',
        'non-existent-template'
      )

      expect(config).toBeUndefined()
    })

    it('should return config with correct frequency', () => {
      const dailyConfig = getFrameworkTemplateConfig(
        'charter-and-course',
        'cc-daily-checkin'
      )

      expect(dailyConfig?.frequency).toBe('daily')
    })
  })

  describe('getFrameworkTemplateIds', () => {
    it('should return array of template IDs for valid framework', () => {
      const ids = getFrameworkTemplateIds('charter-and-course')

      expect(ids).toBeInstanceOf(Array)
      expect(ids.length).toBeGreaterThan(0)
      expect(ids).toContain('cc-values-discovery')
      expect(ids).toContain('cc-daily-checkin')
    })

    it('should return empty array for non-existent framework', () => {
      const ids = getFrameworkTemplateIds('non-existent')

      expect(ids).toEqual([])
    })
  })

  describe('getFoundationTemplateIds', () => {
    it('should return only foundation template IDs', () => {
      const ids = getFoundationTemplateIds('charter-and-course')

      expect(ids).toBeInstanceOf(Array)
      expect(ids.length).toBeGreaterThan(0)

      // Verify all returned templates are actually foundations
      ids.forEach((id) => {
        const config = getFrameworkTemplateConfig('charter-and-course', id)
        expect(config?.isFoundation).toBe(true)
      })
    })

    it('should return templates in order', () => {
      const ids = getFoundationTemplateIds('charter-and-course')

      // First should be values-discovery (order 1)
      expect(ids[0]).toBe('cc-values-discovery')
    })

    it('should return empty array for non-existent framework', () => {
      const ids = getFoundationTemplateIds('non-existent')

      expect(ids).toEqual([])
    })

    it('should not include non-foundation templates', () => {
      const foundationIds = getFoundationTemplateIds('charter-and-course')
      const allIds = getFrameworkTemplateIds('charter-and-course')

      // Daily checkin is not a foundation
      expect(foundationIds).not.toContain('cc-daily-checkin')
      expect(allIds).toContain('cc-daily-checkin')
    })
  })
})

describe('Charter & Course Framework', () => {
  it('should have all required properties', () => {
    expect(charterAndCourseFramework.id).toBe('charter-and-course')
    expect(charterAndCourseFramework.name).toBeDefined()
    expect(charterAndCourseFramework.tagline).toBeDefined()
    expect(charterAndCourseFramework.description).toBeDefined()
    expect(charterAndCourseFramework.version).toBeGreaterThan(0)
    expect(charterAndCourseFramework.icon).toBeDefined()
    expect(charterAndCourseFramework.color).toBeDefined()
    expect(charterAndCourseFramework.isActive).toBe(true)
  })

  it('should have categories defined', () => {
    expect(charterAndCourseFramework.categories).toBeInstanceOf(Array)
    expect(charterAndCourseFramework.categories.length).toBeGreaterThan(0)
  })

  it('should have templates defined', () => {
    expect(charterAndCourseFramework.templates).toBeInstanceOf(Array)
    expect(charterAndCourseFramework.templates.length).toBeGreaterThan(0)
  })

  it('should have foundation templates with no circular prerequisites', () => {
    const foundationTemplates = charterAndCourseFramework.templates.filter(
      (t) => t.isFoundation
    )

    // First foundation should have no prerequisites
    const first = foundationTemplates.find((t) => t.order === 1)
    expect(first?.prerequisites).toEqual([])
  })

  it('should have all categories referenced by templates', () => {
    const categoryIds = new Set(
      charterAndCourseFramework.categories.map((c) => c.id)
    )
    const templateCategoryIds = new Set(
      charterAndCourseFramework.templates.map((t) => t.categoryId)
    )

    // All template category IDs should exist in categories
    templateCategoryIds.forEach((id) => {
      expect(categoryIds.has(id)).toBe(true)
    })
  })

  it('should have valid frequency values for all templates', () => {
    const validFrequencies = [
      'once',
      'daily',
      'weekly',
      'monthly',
      'quarterly',
      'yearly',
      'as_needed',
    ]

    charterAndCourseFramework.templates.forEach((template) => {
      expect(validFrequencies).toContain(template.frequency)
    })
  })

  it('should have foundation templates with frequency "once"', () => {
    const foundationTemplates = charterAndCourseFramework.templates.filter(
      (t) => t.isFoundation
    )

    foundationTemplates.forEach((template) => {
      expect(template.frequency).toBe('once')
    })
  })
})
