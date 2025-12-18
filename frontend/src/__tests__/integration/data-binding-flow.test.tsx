/**
 * Data Binding Flow Integration Tests
 *
 * Tests the data binding behavior between templates:
 * 1. Quarterly Plan outputs flow to Weekly Scoreboard inputs
 * 2. Focus areas are pre-populated correctly
 * 3. Readonly fields cannot be edited
 * 4. Binding transforms work correctly
 *
 * @module __tests__/integration/data-binding-flow
 */

import { describe, it, expect } from 'vitest'
import type {
  DataBindingInput,
  DataBindingOutput,
  BindingTransform,
} from '@/features/journal/types/data-binding.types'
import type { TemplateField } from '@/features/journal/types/field.types'

// ============================================================================
// MOCK DATA TYPES
// ============================================================================

interface QuarterlyReviewData {
  'quarter-select': string
  'quarter-theme': string
  'focus-areas': FocusArea[]
}

interface FocusArea {
  'focus-area-name': string
  'focus-area-lead-measures': string[]
}

interface WeeklyScoreboardData {
  'current-quarter': string
  'week-number': number
  'focus-area-scores': FocusAreaScore[]
}

interface FocusAreaScore {
  'tracking-area-name': string
  'tracking-score': number
}

// ============================================================================
// BINDING RESOLUTION UTILITIES
// ============================================================================

/**
 * Simulates resolving a data binding path to a value
 */
function resolveBindingPath(
  sourceData: Record<string, unknown>,
  path: string
): unknown {
  const parts = path.split('.')
  let current: unknown = sourceData

  for (const part of parts) {
    if (current === null || current === undefined) {
      return undefined
    }

    // Handle array access with wildcard [*]
    if (part.includes('[*]')) {
      const fieldName = part.replace('[*]', '')
      const arrayData = (current as Record<string, unknown>)[fieldName]
      if (!Array.isArray(arrayData)) {
        return undefined
      }

      // Get the next field name after [*]
      const remainingPath = parts.slice(parts.indexOf(part) + 1).join('.')
      if (remainingPath) {
        return arrayData.map(item =>
          resolveBindingPath(item as Record<string, unknown>, remainingPath)
        )
      }
      return arrayData
    }

    current = (current as Record<string, unknown>)[part]
  }

  return current
}

/**
 * Applies a transform to a binding value
 */
function applyTransform(
  value: unknown,
  transform: BindingTransform
): unknown {
  switch (transform) {
    case 'latest':
      // Return the most recent value (in this case, just the value)
      return value
    case 'sum':
      if (Array.isArray(value)) {
        return value.reduce((acc, val) => acc + (typeof val === 'number' ? val : 0), 0)
      }
      return value
    case 'count':
      if (Array.isArray(value)) {
        return value.length
      }
      return 1
    case 'average':
      if (Array.isArray(value) && value.length > 0) {
        const sum = value.reduce((acc, val) => acc + (typeof val === 'number' ? val : 0), 0)
        return sum / value.length
      }
      return value
    case 'none':
    default:
      return value
  }
}

/**
 * Resolves all bindings for a template
 */
function resolveBindings(
  bindings: DataBindingInput[],
  sourceEntries: Record<string, Record<string, unknown>>
): Record<string, unknown> {
  const resolved: Record<string, unknown> = {}

  for (const binding of bindings) {
    const [templateId, ...pathParts] = binding.sourcePath.split('.')
    const sourceData = sourceEntries[templateId]

    if (!sourceData && binding.required) {
      throw new Error(`Required binding source not found: ${templateId}`)
    }

    if (sourceData) {
      const rawValue = resolveBindingPath(sourceData, pathParts.join('.'))
      resolved[binding.targetFieldId] = applyTransform(rawValue, binding.transform)
    } else if (binding.defaultValue !== undefined) {
      resolved[binding.targetFieldId] = binding.defaultValue
    }
  }

  return resolved
}

// ============================================================================
// DATA BINDING TESTS
// ============================================================================

describe('Data Binding Flow Integration', () => {
  // Sample Quarterly Review data with 3 focus areas
  const quarterlyReviewData: QuarterlyReviewData = {
    'quarter-select': 'Q4',
    'quarter-theme': 'Year-End Push',
    'focus-areas': [
      {
        'focus-area-name': 'Health',
        'focus-area-lead-measures': ['Gym 4x/week', 'Sleep 7+ hours', '10k steps daily'],
      },
      {
        'focus-area-name': 'Career',
        'focus-area-lead-measures': ['Deep work 2 hours', 'Weekly review', 'Ship 1 feature'],
      },
      {
        'focus-area-name': 'Relationships',
        'focus-area-lead-measures': ['Weekly date night', 'Call parents', 'Coffee with friend'],
      },
    ],
  }

  // Bindings defined on Weekly Scoreboard
  const weeklyScoreboardBindings: DataBindingInput[] = [
    {
      id: 'pull-quarter-label',
      source: 'framework_entry',
      sourcePath: 'quarterly-review-plan.quarter-select',
      targetFieldId: 'current-quarter',
      transform: 'latest',
      required: false,
    },
    {
      id: 'pull-focus-areas',
      source: 'framework_entry',
      sourcePath: 'quarterly-review-plan.focus-areas[*].focus-area-name',
      targetFieldId: 'focus-area-scores',
      transform: 'latest',
      required: false,
    },
  ]

  describe('Binding Path Resolution', () => {
    it('should resolve simple field paths', () => {
      const result = resolveBindingPath(
        quarterlyReviewData as unknown as Record<string, unknown>,
        'quarter-select'
      )
      expect(result).toBe('Q4')
    })

    it('should resolve nested array paths with wildcard', () => {
      const result = resolveBindingPath(
        { 'quarterly-review-plan': quarterlyReviewData } as Record<string, unknown>,
        'quarterly-review-plan.focus-areas[*].focus-area-name'
      )
      expect(result).toEqual(['Health', 'Career', 'Relationships'])
    })

    it('should return undefined for non-existent paths', () => {
      const result = resolveBindingPath(
        quarterlyReviewData as unknown as Record<string, unknown>,
        'non-existent.field'
      )
      expect(result).toBeUndefined()
    })

    it('should handle empty arrays', () => {
      const emptyData = {
        ...quarterlyReviewData,
        'focus-areas': [],
      }
      const result = resolveBindingPath(
        { 'quarterly-review-plan': emptyData } as Record<string, unknown>,
        'quarterly-review-plan.focus-areas[*].focus-area-name'
      )
      expect(result).toEqual([])
    })
  })

  describe('Binding Transforms', () => {
    it('should apply latest transform (passthrough)', () => {
      const result = applyTransform('Q4', 'latest')
      expect(result).toBe('Q4')
    })

    it('should apply sum transform to arrays', () => {
      const result = applyTransform([1, 2, 3, 4, 5], 'sum')
      expect(result).toBe(15)
    })

    it('should apply count transform to arrays', () => {
      const result = applyTransform(['a', 'b', 'c'], 'count')
      expect(result).toBe(3)
    })

    it('should apply average transform to number arrays', () => {
      const result = applyTransform([2, 4, 6, 8], 'average')
      expect(result).toBe(5)
    })

    it('should handle empty arrays in transforms', () => {
      expect(applyTransform([], 'sum')).toBe(0)
      expect(applyTransform([], 'count')).toBe(0)
    })
  })

  describe('Full Binding Resolution', () => {
    it('should resolve all bindings from Quarterly Review to Weekly Scoreboard', () => {
      const sourceEntries = {
        'quarterly-review-plan': quarterlyReviewData as unknown as Record<string, unknown>,
      }

      const resolved = resolveBindings(weeklyScoreboardBindings, sourceEntries)

      expect(resolved['current-quarter']).toBe('Q4')
      expect(resolved['focus-area-scores']).toEqual(['Health', 'Career', 'Relationships'])
    })

    it('should handle missing source entries for non-required bindings', () => {
      const sourceEntries = {}

      const resolved = resolveBindings(weeklyScoreboardBindings, sourceEntries)

      expect(resolved['current-quarter']).toBeUndefined()
      expect(resolved['focus-area-scores']).toBeUndefined()
    })

    it('should throw error for missing required bindings', () => {
      const requiredBindings: DataBindingInput[] = [
        {
          id: 'required-binding',
          source: 'framework_entry',
          sourcePath: 'required-template.field',
          targetFieldId: 'target',
          transform: 'latest',
          required: true,
        },
      ]

      expect(() => resolveBindings(requiredBindings, {})).toThrow(
        'Required binding source not found: required-template'
      )
    })

    it('should use default value when source is missing', () => {
      const bindingsWithDefaults: DataBindingInput[] = [
        {
          id: 'with-default',
          source: 'framework_entry',
          sourcePath: 'missing-template.field',
          targetFieldId: 'target',
          transform: 'latest',
          required: false,
          defaultValue: 'Default Value',
        },
      ]

      const resolved = resolveBindings(bindingsWithDefaults, {})
      expect(resolved['target']).toBe('Default Value')
    })
  })

  describe('Focus Area Pre-population', () => {
    it('should pre-populate 3 focus areas from Quarterly Review', () => {
      const sourceEntries = {
        'quarterly-review-plan': quarterlyReviewData as unknown as Record<string, unknown>,
      }

      const resolved = resolveBindings(weeklyScoreboardBindings, sourceEntries)
      const focusAreas = resolved['focus-area-scores'] as string[]

      expect(focusAreas).toHaveLength(3)
      expect(focusAreas[0]).toBe('Health')
      expect(focusAreas[1]).toBe('Career')
      expect(focusAreas[2]).toBe('Relationships')
    })

    it('should create tracking entries for each focus area', () => {
      const focusAreaNames = ['Health', 'Career', 'Relationships']

      // Simulate creating Weekly Scoreboard entries from bindings
      const trackingEntries: FocusAreaScore[] = focusAreaNames.map(name => ({
        'tracking-area-name': name,
        'tracking-score': 0, // Default score
      }))

      expect(trackingEntries).toHaveLength(3)
      expect(trackingEntries[0]['tracking-area-name']).toBe('Health')
      expect(trackingEntries[1]['tracking-area-name']).toBe('Career')
      expect(trackingEntries[2]['tracking-area-name']).toBe('Relationships')
    })

    it('should preserve lead measures from Quarterly Review', () => {
      const healthArea = quarterlyReviewData['focus-areas'][0]
      expect(healthArea['focus-area-lead-measures']).toHaveLength(3)
      expect(healthArea['focus-area-lead-measures']).toContain('Gym 4x/week')
    })
  })

  describe('Readonly Field Enforcement', () => {
    interface FieldWithBinding extends TemplateField {
      readOnly?: boolean
      binding?: {
        expression: string
        mode: 'readonly' | 'prefill' | 'computed'
      }
    }

    const weeklyScoreboardFields: Record<string, FieldWithBinding> = {
      'current-quarter': {
        id: 'current-quarter',
        type: 'text',
        label: 'Current Quarter',
        readOnly: true,
        binding: {
          expression: 'quarterly-review-plan.quarter-select',
          mode: 'readonly',
        },
      },
      'week-number': {
        id: 'week-number',
        type: 'number',
        label: 'Week Number',
        validation: { required: true, min: 1, max: 13 },
      },
      'tracking-area-name': {
        id: 'tracking-area-name',
        type: 'text',
        label: 'Focus Area',
        readOnly: true,
      },
      'tracking-score': {
        id: 'tracking-score',
        type: 'slider',
        label: 'Execution Score',
        validation: { required: true },
      },
    }

    it('should mark bound fields as readonly', () => {
      const quarterField = weeklyScoreboardFields['current-quarter']
      expect(quarterField.readOnly).toBe(true)
      expect(quarterField.binding?.mode).toBe('readonly')
    })

    it('should prevent editing readonly fields', () => {
      const isEditable = (field: FieldWithBinding): boolean => {
        return !field.readOnly
      }

      expect(isEditable(weeklyScoreboardFields['current-quarter'])).toBe(false)
      expect(isEditable(weeklyScoreboardFields['tracking-area-name'])).toBe(false)
      expect(isEditable(weeklyScoreboardFields['tracking-score'])).toBe(true)
      expect(isEditable(weeklyScoreboardFields['week-number'])).toBe(true)
    })

    it('should not allow value changes on readonly fields', () => {
      const field = weeklyScoreboardFields['current-quarter']
      const boundValue = 'Q4'

      // Simulate attempting to change value
      const attemptChange = (newValue: string): string => {
        if (field.readOnly) {
          return boundValue // Return original value
        }
        return newValue
      }

      expect(attemptChange('Q1')).toBe('Q4') // Change rejected
      expect(attemptChange('Q2')).toBe('Q4') // Change rejected
    })

    it('should allow value changes on editable fields', () => {
      const field = weeklyScoreboardFields['tracking-score']
      const originalValue = 0

      const attemptChange = (newValue: number): number => {
        if (field.readOnly) {
          return originalValue
        }
        return newValue
      }

      expect(attemptChange(4)).toBe(4) // Change accepted
      expect(attemptChange(5)).toBe(5) // Change accepted
    })
  })

  describe('Binding Mode Behavior', () => {
    it('should handle readonly mode - no editing allowed', () => {
      const field: { binding: { mode: 'readonly' | 'prefill' | 'computed' } } = {
        binding: { mode: 'readonly', expression: 'source.field' },
      }

      const canEdit = field.binding.mode !== 'readonly'
      expect(canEdit).toBe(false)
    })

    it('should handle prefill mode - initial value, editable', () => {
      const field: { binding: { mode: 'readonly' | 'prefill' | 'computed' } } = {
        binding: { mode: 'prefill', expression: 'source.field' },
      }

      const canEdit = field.binding.mode !== 'readonly'
      const useAsInitial = field.binding.mode === 'prefill'

      expect(canEdit).toBe(true)
      expect(useAsInitial).toBe(true)
    })

    it('should handle computed mode - derived value, readonly', () => {
      const field: { binding: { mode: 'readonly' | 'prefill' | 'computed' } } = {
        binding: { mode: 'computed', expression: 'sum(entries[*].score)' },
      }

      const isComputed = field.binding.mode === 'computed'
      expect(isComputed).toBe(true)
    })
  })

  describe('Complete Weekly Scoreboard Creation Flow', () => {
    it('should create Weekly Scoreboard with pre-populated data from Quarterly Review', () => {
      // Step 1: Resolve bindings from Quarterly Review
      const sourceEntries = {
        'quarterly-review-plan': quarterlyReviewData as unknown as Record<string, unknown>,
      }
      const resolvedBindings = resolveBindings(weeklyScoreboardBindings, sourceEntries)

      // Step 2: Create initial form data with bindings
      const initialFormData: WeeklyScoreboardData = {
        'current-quarter': resolvedBindings['current-quarter'] as string,
        'week-number': 1, // User fills this in
        'focus-area-scores': (resolvedBindings['focus-area-scores'] as string[]).map(name => ({
          'tracking-area-name': name,
          'tracking-score': 0, // Default score
        })),
      }

      // Step 3: Verify pre-populated data
      expect(initialFormData['current-quarter']).toBe('Q4')
      expect(initialFormData['focus-area-scores']).toHaveLength(3)
      expect(initialFormData['focus-area-scores'][0]['tracking-area-name']).toBe('Health')
      expect(initialFormData['focus-area-scores'][1]['tracking-area-name']).toBe('Career')
      expect(initialFormData['focus-area-scores'][2]['tracking-area-name']).toBe('Relationships')

      // Step 4: User fills in scores
      initialFormData['focus-area-scores'][0]['tracking-score'] = 4
      initialFormData['focus-area-scores'][1]['tracking-score'] = 3
      initialFormData['focus-area-scores'][2]['tracking-score'] = 5

      // Step 5: Verify final form data
      expect(initialFormData['week-number']).toBe(1)
      expect(initialFormData['focus-area-scores'][0]['tracking-score']).toBe(4)
      expect(initialFormData['focus-area-scores'][1]['tracking-score']).toBe(3)
      expect(initialFormData['focus-area-scores'][2]['tracking-score']).toBe(5)
    })

    it('should handle missing Quarterly Review gracefully', () => {
      // When no Quarterly Review exists, bindings should not fail
      const sourceEntries = {}
      const resolvedBindings = resolveBindings(weeklyScoreboardBindings, sourceEntries)

      // Create form with empty bindings
      const initialFormData: Partial<WeeklyScoreboardData> = {
        'current-quarter': resolvedBindings['current-quarter'] as string | undefined,
        'week-number': 1,
        'focus-area-scores': [],
      }

      expect(initialFormData['current-quarter']).toBeUndefined()
      expect(initialFormData['focus-area-scores']).toHaveLength(0)
    })
  })

  describe('Binding Validation', () => {
    it('should validate binding source exists', () => {
      const binding: DataBindingInput = {
        id: 'test-binding',
        source: 'framework_entry',
        sourcePath: 'quarterly-review-plan.quarter-select',
        targetFieldId: 'current-quarter',
        transform: 'latest',
        required: false,
      }

      const sourceExists = (b: DataBindingInput, entries: Record<string, unknown>): boolean => {
        const templateId = b.sourcePath.split('.')[0]
        return templateId in entries
      }

      expect(
        sourceExists(binding, { 'quarterly-review-plan': quarterlyReviewData })
      ).toBe(true)
      expect(sourceExists(binding, {})).toBe(false)
    })

    it('should validate binding target field exists', () => {
      const targetFields = ['current-quarter', 'week-number', 'focus-area-scores']

      const validateTarget = (targetFieldId: string): boolean => {
        return targetFields.includes(targetFieldId)
      }

      expect(validateTarget('current-quarter')).toBe(true)
      expect(validateTarget('invalid-field')).toBe(false)
    })

    it('should validate binding expression syntax', () => {
      const isValidExpression = (expression: string): boolean => {
        // Simple validation: must have template.field format
        const parts = expression.split('.')
        return parts.length >= 2 && parts.every(p => p.length > 0)
      }

      expect(isValidExpression('template.field')).toBe(true)
      expect(isValidExpression('template.nested.field')).toBe(true)
      expect(isValidExpression('template.array[*].field')).toBe(true)
      expect(isValidExpression('invalid')).toBe(false)
      expect(isValidExpression('')).toBe(false)
    })
  })
})

// ============================================================================
// DATA BINDING OUTPUT TESTS
// ============================================================================

describe('Data Binding Output Configuration', () => {
  const quarterlyOutputs: DataBindingOutput[] = [
    {
      fieldId: 'quarter-select',
      exportKey: 'quarter-label',
      transform: 'none',
    },
    {
      fieldId: 'quarter-theme',
      exportKey: 'quarter-theme',
      transform: 'none',
    },
    {
      fieldId: 'focus-areas',
      exportKey: 'focus-areas',
      transform: 'none',
    },
  ]

  it('should export configured fields', () => {
    const formData = {
      'quarter-select': 'Q4',
      'quarter-theme': 'Year-End Push',
      'focus-areas': [
        { 'focus-area-name': 'Health', 'focus-area-lead-measures': [] },
      ],
    }

    const exportData = (
      outputs: DataBindingOutput[],
      data: Record<string, unknown>
    ): Record<string, unknown> => {
      const exported: Record<string, unknown> = {}
      for (const output of outputs) {
        if (data[output.fieldId] !== undefined) {
          exported[output.exportKey] = applyTransform(data[output.fieldId], output.transform)
        }
      }
      return exported
    }

    const exported = exportData(quarterlyOutputs, formData)

    expect(exported['quarter-label']).toBe('Q4')
    expect(exported['quarter-theme']).toBe('Year-End Push')
    expect(exported['focus-areas']).toHaveLength(1)
  })

  it('should handle missing fields in export', () => {
    const partialData = {
      'quarter-select': 'Q1',
      // Missing other fields
    }

    const exportData = (
      outputs: DataBindingOutput[],
      data: Record<string, unknown>
    ): Record<string, unknown> => {
      const exported: Record<string, unknown> = {}
      for (const output of outputs) {
        if (data[output.fieldId] !== undefined) {
          exported[output.exportKey] = applyTransform(data[output.fieldId], output.transform)
        }
      }
      return exported
    }

    const exported = exportData(quarterlyOutputs, partialData)

    expect(exported['quarter-label']).toBe('Q1')
    expect(exported['quarter-theme']).toBeUndefined()
    expect(exported['focus-areas']).toBeUndefined()
  })
})
