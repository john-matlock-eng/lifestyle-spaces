/**
 * useTemplateForm Hook Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useTemplateForm } from './useTemplateForm'
import type { FrameworkTemplate } from '@/features/journal/types/framework.types'

describe('useTemplateForm', () => {
  const mockOnSubmit = vi.fn().mockResolvedValue(undefined)
  const mockOnSaveDraft = vi.fn()

  const createTemplate = (overrides: Partial<FrameworkTemplate> = {}): FrameworkTemplate => ({
    id: 'test-template',
    name: 'Test Template',
    description: 'A test template',
    version: '1.0.0',
    frameworkId: 'framework-1',
    isDefault: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    content: {
      fields: {
        name: {
          id: 'name',
          type: 'text',
          label: 'Name',
          order: 1,
          validation: { required: true, requiredMessage: 'Name is required' },
        },
        email: {
          id: 'email',
          type: 'text',
          label: 'Email',
          order: 2,
          validation: {
            pattern: '^[^@]+@[^@]+\\.[^@]+$',
            patternMessage: 'Please enter a valid email',
          },
        },
        age: {
          id: 'age',
          type: 'number',
          label: 'Age',
          order: 3,
          validation: { min: 0, max: 150 },
        },
        bio: {
          id: 'bio',
          type: 'textarea',
          label: 'Bio',
          order: 4,
          validation: { minLength: 10, maxLength: 500 },
        },
      },
      sections: [
        { id: 'section1', title: 'Section 1', order: 1, fields: ['name', 'email', 'age', 'bio'] },
      ],
    },
    ...overrides,
  })

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Initialization', () => {
    it('initializes with default values from template fields', () => {
      const template = createTemplate()

      const { result } = renderHook(() =>
        useTemplateForm({
          template,
          onSubmit: mockOnSubmit,
        })
      )

      expect(result.current.state.values).toBeDefined()
      expect(result.current.state.errors).toEqual({})
      expect(result.current.state.isDirty).toBe(false)
      expect(result.current.state.isSubmitting).toBe(false)
      // isValid may be false initially if required fields have no values
      expect(typeof result.current.state.isValid).toBe('boolean')
    })

    it('uses provided initial values', () => {
      const template = createTemplate()
      const initialValues = { name: 'John', email: 'john@example.com' }

      const { result } = renderHook(() =>
        useTemplateForm({
          template,
          initialValues,
          onSubmit: mockOnSubmit,
        })
      )

      expect(result.current.state.values.name).toBe('John')
      expect(result.current.state.values.email).toBe('john@example.com')
    })

    it('uses resolved bindings prefill values', () => {
      const template = createTemplate()
      const resolvedBindings = {
        bindings: {},
        prefillValues: { name: 'Prefilled Name' },
        errors: [],
        allRequiredResolved: true,
      }

      const { result } = renderHook(() =>
        useTemplateForm({
          template,
          resolvedBindings,
          onSubmit: mockOnSubmit,
        })
      )

      expect(result.current.state.values.name).toBe('Prefilled Name')
    })

    it('initial values take precedence over bindings', () => {
      const template = createTemplate()
      const resolvedBindings = {
        bindings: {},
        prefillValues: { name: 'Prefilled' },
        errors: [],
        allRequiredResolved: true,
      }
      const initialValues = { name: 'Initial' }

      const { result } = renderHook(() =>
        useTemplateForm({
          template,
          initialValues,
          resolvedBindings,
          onSubmit: mockOnSubmit,
        })
      )

      expect(result.current.state.values.name).toBe('Initial')
    })
  })

  describe('setFieldValue', () => {
    it('updates field value', () => {
      const template = createTemplate()

      const { result } = renderHook(() =>
        useTemplateForm({
          template,
          onSubmit: mockOnSubmit,
        })
      )

      act(() => {
        result.current.actions.setFieldValue('name', 'New Name')
      })

      expect(result.current.state.values.name).toBe('New Name')
    })

    it('marks form as dirty after setting value', () => {
      const template = createTemplate()

      const { result } = renderHook(() =>
        useTemplateForm({
          template,
          onSubmit: mockOnSubmit,
        })
      )

      act(() => {
        result.current.actions.setFieldValue('name', 'Changed')
      })

      expect(result.current.state.isDirty).toBe(true)
    })
  })

  describe('setFieldValues', () => {
    it('updates multiple field values', () => {
      const template = createTemplate()

      const { result } = renderHook(() =>
        useTemplateForm({
          template,
          onSubmit: mockOnSubmit,
        })
      )

      act(() => {
        result.current.actions.setFieldValues({
          name: 'John',
          email: 'john@example.com',
        })
      })

      expect(result.current.state.values.name).toBe('John')
      expect(result.current.state.values.email).toBe('john@example.com')
    })
  })

  describe('validateField', () => {
    it('validates required field', async () => {
      const template = createTemplate()

      const { result } = renderHook(() =>
        useTemplateForm({
          template,
          onSubmit: mockOnSubmit,
        })
      )

      let isValid: boolean = true
      await act(async () => {
        isValid = await result.current.actions.validateField('name')
      })

      expect(isValid).toBe(false)
      expect(result.current.state.errors.name).toBeDefined()
      expect(result.current.state.errors.name?.message).toBe('Name is required')
    })

    it('validates pattern', async () => {
      const template = createTemplate()

      const { result } = renderHook(() =>
        useTemplateForm({
          template,
          initialValues: { email: 'invalid-email' },
          onSubmit: mockOnSubmit,
        })
      )

      let isValid: boolean = true
      await act(async () => {
        isValid = await result.current.actions.validateField('email')
      })

      expect(isValid).toBe(false)
      expect(result.current.state.errors.email?.message).toBe('Please enter a valid email')
    })

    it('validates min value', async () => {
      const template = createTemplate()

      const { result } = renderHook(() =>
        useTemplateForm({
          template,
          initialValues: { age: -5 },
          onSubmit: mockOnSubmit,
        })
      )

      let isValid: boolean = true
      await act(async () => {
        isValid = await result.current.actions.validateField('age')
      })

      expect(isValid).toBe(false)
      expect(result.current.state.errors.age?.message).toContain('at least 0')
    })

    it('validates max value', async () => {
      const template = createTemplate()

      const { result } = renderHook(() =>
        useTemplateForm({
          template,
          initialValues: { age: 200 },
          onSubmit: mockOnSubmit,
        })
      )

      let isValid: boolean = true
      await act(async () => {
        isValid = await result.current.actions.validateField('age')
      })

      expect(isValid).toBe(false)
      expect(result.current.state.errors.age?.message).toContain('at most 150')
    })

    it('validates minLength', async () => {
      const template = createTemplate()

      const { result } = renderHook(() =>
        useTemplateForm({
          template,
          initialValues: { bio: 'short' },
          onSubmit: mockOnSubmit,
        })
      )

      let isValid: boolean = true
      await act(async () => {
        isValid = await result.current.actions.validateField('bio')
      })

      expect(isValid).toBe(false)
      expect(result.current.state.errors.bio?.message).toContain('at least 10')
    })

    it('validates maxLength', async () => {
      const template = createTemplate({
        content: {
          fields: {
            shortField: {
              id: 'shortField',
              type: 'text',
              label: 'Short Field',
              order: 1,
              validation: { maxLength: 5 },
            },
          },
          sections: [],
        },
      })

      const { result } = renderHook(() =>
        useTemplateForm({
          template,
          initialValues: { shortField: 'too long text' },
          onSubmit: mockOnSubmit,
        })
      )

      let isValid: boolean = true
      await act(async () => {
        isValid = await result.current.actions.validateField('shortField')
      })

      expect(isValid).toBe(false)
      expect(result.current.state.errors.shortField?.message).toContain('at most 5')
    })

    it('returns true for valid field', async () => {
      const template = createTemplate()

      const { result } = renderHook(() =>
        useTemplateForm({
          template,
          initialValues: { name: 'Valid Name' },
          onSubmit: mockOnSubmit,
        })
      )

      let isValid: boolean = false
      await act(async () => {
        isValid = await result.current.actions.validateField('name')
      })

      expect(isValid).toBe(true)
      expect(result.current.state.errors.name).toBeUndefined()
    })

    it('returns true for unknown field', async () => {
      const template = createTemplate()

      const { result } = renderHook(() =>
        useTemplateForm({
          template,
          onSubmit: mockOnSubmit,
        })
      )

      let isValid: boolean = false
      await act(async () => {
        isValid = await result.current.actions.validateField('unknownField')
      })

      expect(isValid).toBe(true)
    })
  })

  describe('validateForm', () => {
    it('validates all fields', async () => {
      const template = createTemplate()

      const { result } = renderHook(() =>
        useTemplateForm({
          template,
          onSubmit: mockOnSubmit,
        })
      )

      let isValid: boolean = true
      await act(async () => {
        isValid = await result.current.actions.validateForm()
      })

      // Should fail because name is required
      expect(isValid).toBe(false)
    })

    it('returns true when all fields valid', async () => {
      const template = createTemplate()

      const { result } = renderHook(() =>
        useTemplateForm({
          template,
          initialValues: {
            name: 'John Doe',
            email: 'john@example.com',
            age: 30,
            bio: 'This is a valid bio with more than 10 characters',
          },
          onSubmit: mockOnSubmit,
        })
      )

      let isValid: boolean = false
      await act(async () => {
        isValid = await result.current.actions.validateForm()
      })

      expect(isValid).toBe(true)
    })
  })

  describe('submitForm', () => {
    it('calls onSubmit when form is valid', async () => {
      const template = createTemplate()

      const { result } = renderHook(() =>
        useTemplateForm({
          template,
          initialValues: {
            name: 'John Doe',
            email: 'john@example.com',
            age: 30,
            bio: 'This is a valid bio with more than 10 characters',
          },
          onSubmit: mockOnSubmit,
        })
      )

      await act(async () => {
        await result.current.actions.submitForm()
      })

      expect(mockOnSubmit).toHaveBeenCalled()
    })

    it('does not call onSubmit when form is invalid', async () => {
      const template = createTemplate()

      const { result } = renderHook(() =>
        useTemplateForm({
          template,
          onSubmit: mockOnSubmit,
        })
      )

      await act(async () => {
        await result.current.actions.submitForm()
      })

      expect(mockOnSubmit).not.toHaveBeenCalled()
    })

    it('sets lastSaved on successful submit', async () => {
      const template = createTemplate()

      const { result } = renderHook(() =>
        useTemplateForm({
          template,
          initialValues: {
            name: 'John Doe',
            email: 'john@example.com',
            age: 30,
            bio: 'This is a valid bio with more than 10 characters',
          },
          onSubmit: mockOnSubmit,
        })
      )

      await act(async () => {
        await result.current.actions.submitForm()
      })

      expect(result.current.state.lastSaved).toBeInstanceOf(Date)
    })
  })

  describe('saveDraft', () => {
    it('calls onSaveDraft with current values', async () => {
      const template = createTemplate()

      const { result } = renderHook(() =>
        useTemplateForm({
          template,
          initialValues: { name: 'Draft Name' },
          onSubmit: mockOnSubmit,
          onSaveDraft: mockOnSaveDraft,
        })
      )

      await act(async () => {
        await result.current.actions.saveDraft()
      })

      expect(mockOnSaveDraft).toHaveBeenCalled()
    })

    it('sets lastSaved after saving draft', async () => {
      const template = createTemplate()

      const { result } = renderHook(() =>
        useTemplateForm({
          template,
          onSubmit: mockOnSubmit,
          onSaveDraft: mockOnSaveDraft,
        })
      )

      await act(async () => {
        await result.current.actions.saveDraft()
      })

      expect(result.current.state.lastSaved).toBeInstanceOf(Date)
    })

    it('does nothing when onSaveDraft not provided', async () => {
      const template = createTemplate()

      const { result } = renderHook(() =>
        useTemplateForm({
          template,
          onSubmit: mockOnSubmit,
        })
      )

      // Should not throw
      await act(async () => {
        await result.current.actions.saveDraft()
      })

      expect(result.current.state.lastSaved).toBeUndefined()
    })
  })

  describe('resetForm', () => {
    it('resets form to default values', () => {
      const template = createTemplate()

      const { result } = renderHook(() =>
        useTemplateForm({
          template,
          initialValues: { name: 'Initial' },
          onSubmit: mockOnSubmit,
        })
      )

      act(() => {
        result.current.actions.setFieldValue('name', 'Changed')
      })

      act(() => {
        result.current.actions.resetForm()
      })

      expect(result.current.state.values.name).toBe('Initial')
    })
  })

  describe('clearErrors', () => {
    it('clears all errors', async () => {
      const template = createTemplate()

      const { result } = renderHook(() =>
        useTemplateForm({
          template,
          onSubmit: mockOnSubmit,
        })
      )

      // Trigger validation error
      await act(async () => {
        await result.current.actions.validateField('name')
      })

      expect(result.current.state.errors.name).toBeDefined()

      act(() => {
        result.current.actions.clearErrors()
      })

      expect(result.current.state.errors.name).toBeUndefined()
    })
  })

  describe('getFieldError', () => {
    it('returns error for field', async () => {
      const template = createTemplate()

      const { result } = renderHook(() =>
        useTemplateForm({
          template,
          onSubmit: mockOnSubmit,
        })
      )

      await act(async () => {
        await result.current.actions.validateField('name')
      })

      const error = result.current.actions.getFieldError('name')
      expect(error).toBeDefined()
      expect(error?.message).toBe('Name is required')
    })

    it('returns undefined for valid field', () => {
      const template = createTemplate()

      const { result } = renderHook(() =>
        useTemplateForm({
          template,
          initialValues: { name: 'Valid' },
          onSubmit: mockOnSubmit,
        })
      )

      const error = result.current.actions.getFieldError('name')
      expect(error).toBeUndefined()
    })
  })

  describe('formMethods', () => {
    it('exposes react-hook-form methods', () => {
      const template = createTemplate()

      const { result } = renderHook(() =>
        useTemplateForm({
          template,
          onSubmit: mockOnSubmit,
        })
      )

      expect(result.current.formMethods.register).toBeDefined()
      expect(result.current.formMethods.watch).toBeDefined()
      expect(result.current.formMethods.setValue).toBeDefined()
      expect(result.current.formMethods.control).toBeDefined()
      expect(result.current.formMethods.handleSubmit).toBeDefined()
      expect(result.current.formMethods.formState).toBeDefined()
    })
  })

  describe('Auto-Save', () => {
    it('auto-saves after delay when enabled', async () => {
      vi.useFakeTimers()
      const template = createTemplate()

      const { result } = renderHook(() =>
        useTemplateForm({
          template,
          onSubmit: mockOnSubmit,
          onSaveDraft: mockOnSaveDraft,
          autoSaveDraft: true,
          autoSaveDelay: 500,
        })
      )

      // Mark form as dirty
      act(() => {
        result.current.actions.setFieldValue('name', 'Auto Save Test')
      })

      // Fast forward time
      act(() => {
        vi.advanceTimersByTime(600)
      })

      // Give effect time to run
      act(() => {
        vi.runAllTimers()
      })

      vi.useRealTimers()

      // The saveDraft should have been called
      expect(mockOnSaveDraft).toHaveBeenCalled()
    })

    it('does not auto-save when disabled', async () => {
      vi.useFakeTimers()
      const template = createTemplate()

      const { result } = renderHook(() =>
        useTemplateForm({
          template,
          onSubmit: mockOnSubmit,
          onSaveDraft: mockOnSaveDraft,
          autoSaveDraft: false,
          autoSaveDelay: 500,
        })
      )

      act(() => {
        result.current.actions.setFieldValue('name', 'No Auto Save')
      })

      act(() => {
        vi.advanceTimersByTime(1000)
      })

      vi.useRealTimers()

      expect(mockOnSaveDraft).not.toHaveBeenCalled()
    })
  })

  describe('Custom Validation', () => {
    it('runs custom validator function', async () => {
      const customValidator = vi.fn((value: unknown) => {
        if (value === 'forbidden') {
          return 'This value is forbidden'
        }
        return true
      })

      const template = createTemplate({
        content: {
          fields: {
            customField: {
              id: 'customField',
              type: 'text',
              label: 'Custom Field',
              order: 1,
              validation: { custom: customValidator },
            },
          },
          sections: [],
        },
      })

      const { result } = renderHook(() =>
        useTemplateForm({
          template,
          initialValues: { customField: 'forbidden' },
          onSubmit: mockOnSubmit,
        })
      )

      let isValid: boolean = true
      await act(async () => {
        isValid = await result.current.actions.validateField('customField')
      })

      expect(isValid).toBe(false)
      expect(customValidator).toHaveBeenCalled()
      expect(result.current.state.errors.customField?.message).toBe('This value is forbidden')
    })
  })
})
