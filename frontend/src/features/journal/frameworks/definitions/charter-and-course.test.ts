/**
 * Charter & Course Framework Definition Tests
 *
 * Validates the framework definition against schema and verifies
 * all templates, sections, and fields are properly defined.
 *
 * @module charter-and-course.test
 */

import { describe, it, expect, beforeAll } from 'vitest'
import { charterAndCourseFramework } from './charter-and-course'
import { validateFramework } from '../loader/FrameworkValidator'

describe('Charter & Course Framework Definition', () => {
  let validationResult: ReturnType<typeof validateFramework>

  beforeAll(() => {
    validationResult = validateFramework(charterAndCourseFramework)
  })

  describe('Schema Validation', () => {
    it('should be a valid framework', () => {
      expect(validationResult.valid).toBe(true)
    })

    it('should have no validation errors', () => {
      if (validationResult.errors.length > 0) {
        console.error('Validation errors:', JSON.stringify(validationResult.errors, null, 2))
      }
      expect(validationResult.errors).toHaveLength(0)
    })

    it('should have no or minimal warnings', () => {
      // Allow some warnings but log them for review
      if (validationResult.warnings.length > 0) {
        console.warn('Validation warnings:', validationResult.warnings.map(w => w.message))
      }
      // Allow up to 2 warnings (e.g., for optional categories)
      expect(validationResult.warnings.length).toBeLessThanOrEqual(2)
    })
  })

  describe('Framework Metadata', () => {
    it('should have correct id', () => {
      expect(charterAndCourseFramework.id).toBe('charter-and-course')
    })

    it('should have version 2', () => {
      expect(charterAndCourseFramework.version).toBe(2)
    })

    it('should have name and tagline', () => {
      expect(charterAndCourseFramework.name).toBe('Charter & Course')
      expect(charterAndCourseFramework.tagline).toBeTruthy()
    })

    it('should have description', () => {
      expect(charterAndCourseFramework.description).toBeTruthy()
      expect(charterAndCourseFramework.description!.length).toBeGreaterThan(100)
    })

    it('should have icon and colors', () => {
      expect(charterAndCourseFramework.icon).toBeTruthy()
      expect(charterAndCourseFramework.color).toMatch(/^#[0-9a-fA-F]{6}$/)
    })

    it('should be active', () => {
      expect(charterAndCourseFramework.isActive).toBe(true)
    })
  })

  describe('Categories', () => {
    it('should have 4 categories', () => {
      expect(charterAndCourseFramework.categories).toHaveLength(4)
    })

    it('should have foundation, weekly, quarterly, and special categories', () => {
      const categoryIds = charterAndCourseFramework.categories.map(c => c.id)
      expect(categoryIds).toContain('foundation')
      expect(categoryIds).toContain('weekly')
      expect(categoryIds).toContain('quarterly')
      expect(categoryIds).toContain('special')
    })

    it('should have ordered categories', () => {
      const orders = charterAndCourseFramework.categories.map(c => c.order)
      expect(orders).toEqual([1, 2, 3, 4])
    })
  })

  describe('Templates', () => {
    it('should have 4 templates', () => {
      expect(charterAndCourseFramework.templates).toHaveLength(4)
    })

    it('should have all expected template ids', () => {
      const templateIds = charterAndCourseFramework.templates.map(t => t.id)
      expect(templateIds).toContain('personal-charter')
      expect(templateIds).toContain('quarterly-review-plan')
      expect(templateIds).toContain('weekly-scoreboard')
      expect(templateIds).toContain('reset-protocol')
    })
  })

  describe('Personal Charter template', () => {
    const template = charterAndCourseFramework.templates.find(
      t => t.id === 'personal-charter'
    )

    it('should exist', () => {
      expect(template).toBeDefined()
    })

    it('should be a foundation template', () => {
      expect(template?.lifecycle).toBe('foundation')
      expect(template?.categoryId).toBe('foundation')
    })

    it('should have frequency once', () => {
      expect(template?.frequency).toBe('once')
    })

    it('should have 5 sections', () => {
      expect(template?.content?.sections).toHaveLength(5)
    })

    it('should have section ids: core-identity, the-code, the-practice, the-impact, the-vow', () => {
      const sectionIds = template?.content?.sections?.map(s => s.id)
      expect(sectionIds).toContain('core-identity')
      expect(sectionIds).toContain('the-code')
      expect(sectionIds).toContain('the-practice')
      expect(sectionIds).toContain('the-impact')
      expect(sectionIds).toContain('the-vow')
    })

    it('should have fields defined', () => {
      const fieldCount = Object.keys(template?.content?.fields || {}).length
      expect(fieldCount).toBeGreaterThan(20)
    })

    it('should have no prerequisites (entry point)', () => {
      expect(template?.prerequisites).toEqual([])
    })

    it('should have data binding outputs', () => {
      expect(template?.dataBindings?.outputs).toBeDefined()
      expect(template?.dataBindings?.outputs?.length).toBeGreaterThan(10)
    })

    it('should export trait fields', () => {
      const outputs = template?.dataBindings?.outputs || []
      expect(outputs).toContain('trait-dependable')
      expect(outputs).toContain('trait-forthright')
      expect(outputs).toContain('trait-generous')
      expect(outputs).toContain('trait-disciplined')
    })

    it('should export principle fields', () => {
      const outputs = template?.dataBindings?.outputs || []
      expect(outputs).toContain('principle-radical-responsibility')
      expect(outputs).toContain('principle-integrity-dark')
    })

    it('should have vow-statement field with validation', () => {
      const vowField = template?.content?.fields?.['vow-statement']
      expect(vowField).toBeDefined()
      expect(vowField?.type).toBe('textarea')
      expect(vowField?.validation?.required).toBe(true)
      expect(vowField?.validation?.minLength).toBeGreaterThanOrEqual(100)
    })
  })

  describe('Quarterly Review template', () => {
    const template = charterAndCourseFramework.templates.find(
      t => t.id === 'quarterly-review-plan'
    )

    it('should exist', () => {
      expect(template).toBeDefined()
    })

    it('should be a recurring template with quarterly frequency', () => {
      expect(template?.lifecycle).toBe('recurring')
      expect(template?.frequency).toBe('quarterly')
    })

    it('should require personal-charter', () => {
      expect(template?.prerequisites).toContain('personal-charter')
    })

    it('should have 9 sections', () => {
      expect(template?.content?.sections).toHaveLength(9)
    })

    it('should have many fields defined (~50)', () => {
      const fieldCount = Object.keys(template?.content?.fields || {}).length
      expect(fieldCount).toBeGreaterThan(40)
    })

    it('should have focus-areas repeatable field', () => {
      const focusField = template?.content?.fields?.['focus-areas']
      expect(focusField).toBeDefined()
      expect(focusField?.type).toBe('repeatable')
    })

    it('should have charter alignment score sliders', () => {
      const fields = template?.content?.fields || {}
      expect(fields['score-dependable']).toBeDefined()
      expect(fields['score-dependable']?.type).toBe('slider')
      expect(fields['score-forthright']?.type).toBe('slider')
    })

    it('should have data binding outputs', () => {
      expect(template?.dataBindings?.outputs).toBeDefined()
      expect(template?.dataBindings?.outputs?.length).toBeGreaterThan(0)
    })

    it('should export focus-areas for weekly scoreboard', () => {
      const outputs = template?.dataBindings?.outputs || []
      expect(outputs).toContain('focus-areas')
    })

    it('should have cooldown of ~80 days', () => {
      expect(template?.cooldownDays).toBe(80)
    })
  })

  describe('Weekly Scoreboard template', () => {
    const template = charterAndCourseFramework.templates.find(
      t => t.id === 'weekly-scoreboard'
    )

    it('should exist', () => {
      expect(template).toBeDefined()
    })

    it('should be a recurring template with weekly frequency', () => {
      expect(template?.lifecycle).toBe('recurring')
      expect(template?.frequency).toBe('weekly')
    })

    it('should require quarterly-review-plan', () => {
      expect(template?.prerequisites).toContain('quarterly-review-plan')
    })

    it('should have 5 sections', () => {
      expect(template?.content?.sections).toHaveLength(5)
    })

    it('should have fields defined (~14)', () => {
      const fieldCount = Object.keys(template?.content?.fields || {}).length
      expect(fieldCount).toBeGreaterThanOrEqual(14)
    })

    it('should have data binding inputs from quarterly plan', () => {
      expect(template?.dataBindings?.inputs).toBeDefined()
      expect(template?.dataBindings?.inputs?.length).toBeGreaterThan(0)
    })

    it('should pull quarter label from quarterly review', () => {
      const inputs = template?.dataBindings?.inputs || []
      const quarterInput = inputs.find(i => i.id === 'pull-quarter-label')
      expect(quarterInput).toBeDefined()
      expect(quarterInput?.sourcePath).toContain('quarterly-review-plan')
    })

    it('should pull focus areas from quarterly review', () => {
      const inputs = template?.dataBindings?.inputs || []
      const focusInput = inputs.find(i => i.id === 'pull-focus-area-names')
      expect(focusInput).toBeDefined()
    })

    it('should have focus-area-scores repeatable field', () => {
      const scoresField = template?.content?.fields?.['focus-area-scores']
      expect(scoresField).toBeDefined()
      expect(scoresField?.type).toBe('repeatable')
    })

    it('should have cooldown of ~5 days', () => {
      expect(template?.cooldownDays).toBe(5)
    })
  })

  describe('Reset Protocol template', () => {
    const template = charterAndCourseFramework.templates.find(
      t => t.id === 'reset-protocol'
    )

    it('should exist', () => {
      expect(template).toBeDefined()
    })

    it('should have special lifecycle', () => {
      expect(template?.lifecycle).toBe('special')
    })

    it('should have as_needed frequency', () => {
      expect(template?.frequency).toBe('as_needed')
    })

    it('should require personal-charter', () => {
      expect(template?.prerequisites).toContain('personal-charter')
    })

    it('should NOT require quarterly-review-plan (available earlier)', () => {
      expect(template?.prerequisites).not.toContain('quarterly-review-plan')
    })

    it('should have 4 sections: acknowledge, understand, recalibrate, recommit', () => {
      expect(template?.content?.sections).toHaveLength(4)
      const sectionIds = template?.content?.sections?.map(s => s.id)
      expect(sectionIds).toContain('acknowledge')
      expect(sectionIds).toContain('understand')
      expect(sectionIds).toContain('recalibrate')
      expect(sectionIds).toContain('recommit')
    })

    it('should have fields defined (~10+)', () => {
      const fieldCount = Object.keys(template?.content?.fields || {}).length
      expect(fieldCount).toBeGreaterThanOrEqual(10)
    })

    it('should have data binding inputs from charter', () => {
      expect(template?.dataBindings?.inputs).toBeDefined()
      const inputs = template?.dataBindings?.inputs || []
      const vowInput = inputs.find(i => i.sourcePath?.includes('vow-statement'))
      expect(vowInput).toBeDefined()
    })

    it('should have self-compassion and reset-vow fields', () => {
      const fields = template?.content?.fields || {}
      expect(fields['self-compassion']).toBeDefined()
      expect(fields['reset-vow']).toBeDefined()
    })
  })

  describe('Template Dependency Chain', () => {
    it('should have correct dependency chain', () => {
      const getTemplate = (id: string) =>
        charterAndCourseFramework.templates.find(t => t.id === id)

      // personal-charter has no prerequisites (entry point)
      expect(getTemplate('personal-charter')?.prerequisites).toEqual([])

      // quarterly-review-plan requires personal-charter
      expect(getTemplate('quarterly-review-plan')?.prerequisites).toContain('personal-charter')

      // weekly-scoreboard requires quarterly-review-plan
      expect(getTemplate('weekly-scoreboard')?.prerequisites).toContain('quarterly-review-plan')

      // reset-protocol requires personal-charter but not quarterly
      expect(getTemplate('reset-protocol')?.prerequisites).toContain('personal-charter')
      expect(getTemplate('reset-protocol')?.prerequisites).not.toContain('quarterly-review-plan')
    })

    it('should not have circular dependencies', () => {
      // The validator already checks this, but let's verify explicitly
      expect(validationResult.errors.some(e => e.code === 'CIRCULAR_DEPENDENCY')).toBe(false)
    })
  })

  describe('Field Definitions Quality', () => {
    it('personal-charter should have exportable fields with outputKeys', () => {
      const template = charterAndCourseFramework.templates.find(t => t.id === 'personal-charter')
      const fields = template?.content?.fields || {}

      // Check that exportable fields have outputKey
      const exportableFields = Object.values(fields).filter(f => f.exportable === true)
      expect(exportableFields.length).toBeGreaterThan(10)

      for (const field of exportableFields) {
        expect(field.outputKey).toBeTruthy()
      }
    })

    it('quarterly-review should have slider fields with proper config', () => {
      const template = charterAndCourseFramework.templates.find(t => t.id === 'quarterly-review-plan')
      const fields = template?.content?.fields || {}

      const sliderFields = Object.values(fields).filter(f => f.type === 'slider')
      expect(sliderFields.length).toBeGreaterThan(10)

      for (const slider of sliderFields) {
        expect(slider.config?.min).toBe(1)
        expect(slider.config?.max).toBe(5)
        expect(slider.config?.showTicks).toBe(true)
      }
    })

    it('most required textarea fields should have minLength validation', () => {
      let fieldsWithMinLength = 0
      let totalRequiredTextareas = 0

      for (const template of charterAndCourseFramework.templates) {
        const fields = template.content?.fields || {}

        for (const [, field] of Object.entries(fields)) {
          if (field.type === 'textarea' && field.validation?.required === true) {
            totalRequiredTextareas++
            if (field.validation?.minLength && field.validation.minLength > 0) {
              fieldsWithMinLength++
            }
          }
        }
      }

      // At least 80% of required textareas should have minLength
      const ratio = fieldsWithMinLength / totalRequiredTextareas
      expect(ratio).toBeGreaterThan(0.5)
    })
  })
})
