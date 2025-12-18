/**
 * useTemplateForm Hook
 *
 * Custom hook for managing form state with React Hook Form.
 * Handles validation, auto-save, and complex nested data.
 *
 * @module framework-form/useTemplateForm
 */

import { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import { useForm, type FieldError } from 'react-hook-form'
import type { FieldDefinition } from '@/features/journal/types/field.types'
import type {
  UseTemplateFormOptions,
  UseTemplateFormReturn,
  TemplateFormState,
  TemplateFormActions,
} from './types'
import { getFieldDefaultValue } from './types'

/**
 * useTemplateForm - Hook for managing template-based forms
 *
 * @example
 * ```tsx
 * const { state, actions, formMethods } = useTemplateForm({
 *   template,
 *   initialValues,
 *   resolvedBindings,
 *   onSubmit: async (values) => saveEntry(values),
 *   onSaveDraft: (values) => saveDraft(values),
 *   autoSaveDraft: true,
 *   autoSaveDelay: 2000,
 * })
 * ```
 */
export function useTemplateForm({
  template,
  initialValues,
  resolvedBindings,
  onSubmit,
  onSaveDraft,
  autoSaveDraft = false,
  autoSaveDelay = 2000,
  validationMode = 'onBlur',
}: UseTemplateFormOptions): UseTemplateFormReturn {
  // Build default values from template fields and bindings
  const defaultValues = useMemo(() => {
    const values: Record<string, unknown> = {}

    // Start with field default values
    if (template.content?.fields) {
      for (const field of template.content.fields) {
        values[field.id] = getFieldDefaultValue(field)
      }
    }

    // Apply resolved binding prefill values
    if (resolvedBindings?.prefillValues) {
      Object.assign(values, resolvedBindings.prefillValues)
    }

    // Apply initial values (takes precedence)
    if (initialValues) {
      Object.assign(values, initialValues)
    }

    return values
  }, [template.content?.fields, resolvedBindings?.prefillValues, initialValues])

  // Initialize React Hook Form
  const form = useForm({
    defaultValues,
    mode: validationMode,
  })

  const {
    register,
    watch,
    setValue,
    control,
    handleSubmit,
    formState,
    trigger,
    reset,
    clearErrors: clearFormErrors,
    setError,
    getFieldState,
  } = form

  // Track draft saving state
  const [isSavingDraft, setIsSavingDraft] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | undefined>(undefined)

  // Auto-save timer ref
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Build fields map for validation
  const fieldsMap = useMemo(() => {
    const map: Record<string, FieldDefinition> = {}
    if (template.content?.fields) {
      for (const field of template.content.fields) {
        map[field.id] = field
      }
    }
    return map
  }, [template.content?.fields])

  // Watch all form values
  const values = watch()

  // Convert form errors to record format
  const errors = useMemo(() => {
    const errorRecord: Record<string, FieldError | undefined> = {}

    const flattenErrors = (obj: Record<string, unknown>, prefix = '') => {
      for (const [key, value] of Object.entries(obj)) {
        const path = prefix ? `${prefix}.${key}` : key
        if (value && typeof value === 'object') {
          if ('message' in value || 'type' in value) {
            errorRecord[path] = value as FieldError
          } else {
            flattenErrors(value as Record<string, unknown>, path)
          }
        }
      }
    }

    flattenErrors(formState.errors as Record<string, unknown>)
    return errorRecord
  }, [formState.errors])

  // Check if form has unsaved changes
  const hasUnsavedChanges = useMemo(() => {
    if (!lastSaved) return formState.isDirty
    return formState.isDirty
  }, [formState.isDirty, lastSaved])

  // Build form state
  const state: TemplateFormState = useMemo(
    () => ({
      values,
      errors,
      isDirty: formState.isDirty,
      isSubmitting: formState.isSubmitting,
      isValid: formState.isValid,
      hasUnsavedChanges,
      lastSaved,
      isSavingDraft,
    }),
    [
      values,
      errors,
      formState.isDirty,
      formState.isSubmitting,
      formState.isValid,
      hasUnsavedChanges,
      lastSaved,
      isSavingDraft,
    ]
  )

  // Set field value action
  const setFieldValue = useCallback(
    (fieldId: string, value: unknown) => {
      setValue(fieldId, value, {
        shouldValidate: validationMode === 'onChange',
        shouldDirty: true,
        shouldTouch: true,
      })
    },
    [setValue, validationMode]
  )

  // Set multiple field values
  const setFieldValues = useCallback(
    (fieldValues: Record<string, unknown>) => {
      for (const [fieldId, value] of Object.entries(fieldValues)) {
        setValue(fieldId, value, {
          shouldValidate: false,
          shouldDirty: true,
        })
      }
    },
    [setValue]
  )

  // Validate a single field
  const validateField = useCallback(
    async (fieldId: string): Promise<boolean> => {
      const field = fieldsMap[fieldId]
      if (!field) return true

      // Get current value
      const currentValue = values[fieldId]

      // Check required
      if (field.validation?.required) {
        if (currentValue === undefined || currentValue === null || currentValue === '') {
          setError(fieldId, {
            type: 'required',
            message: field.validation.requiredMessage ?? `${field.label} is required`,
          })
          return false
        }
      }

      // Check min length
      if (field.validation?.minLength && typeof currentValue === 'string') {
        if (currentValue.length < field.validation.minLength) {
          setError(fieldId, {
            type: 'minLength',
            message: `${field.label} must be at least ${field.validation.minLength} characters`,
          })
          return false
        }
      }

      // Check max length
      if (field.validation?.maxLength && typeof currentValue === 'string') {
        if (currentValue.length > field.validation.maxLength) {
          setError(fieldId, {
            type: 'maxLength',
            message: `${field.label} must be at most ${field.validation.maxLength} characters`,
          })
          return false
        }
      }

      // Check min value
      if (field.validation?.min !== undefined && typeof currentValue === 'number') {
        if (currentValue < field.validation.min) {
          setError(fieldId, {
            type: 'min',
            message: `${field.label} must be at least ${field.validation.min}`,
          })
          return false
        }
      }

      // Check max value
      if (field.validation?.max !== undefined && typeof currentValue === 'number') {
        if (currentValue > field.validation.max) {
          setError(fieldId, {
            type: 'max',
            message: `${field.label} must be at most ${field.validation.max}`,
          })
          return false
        }
      }

      // Check pattern
      if (field.validation?.pattern && typeof currentValue === 'string') {
        const regex = new RegExp(field.validation.pattern)
        if (!regex.test(currentValue)) {
          setError(fieldId, {
            type: 'pattern',
            message: field.validation.patternMessage ?? `${field.label} format is invalid`,
          })
          return false
        }
      }

      // Check custom validator
      if (field.validation?.custom && typeof currentValue !== 'undefined') {
        const customResult = field.validation.custom(currentValue, values)
        if (customResult !== true) {
          setError(fieldId, {
            type: 'custom',
            message: typeof customResult === 'string' ? customResult : `${field.label} is invalid`,
          })
          return false
        }
      }

      // Clear error if valid
      clearFormErrors(fieldId)
      return true
    },
    [fieldsMap, values, setError, clearFormErrors]
  )

  // Validate all fields
  const validateForm = useCallback(async (): Promise<boolean> => {
    let isValid = true

    for (const field of Object.values(fieldsMap)) {
      const fieldValid = await validateField(field.id)
      if (!fieldValid) {
        isValid = false
      }
    }

    return isValid
  }, [fieldsMap, validateField])

  // Reset form to initial values
  const resetForm = useCallback(() => {
    reset(defaultValues)
  }, [reset, defaultValues])

  // Clear all errors
  const clearErrors = useCallback(() => {
    clearFormErrors()
  }, [clearFormErrors])

  // Submit the form
  const submitForm = useCallback(async () => {
    const isValid = await validateForm()
    if (!isValid) {
      return
    }

    try {
      await onSubmit(values)
      setLastSaved(new Date())
    } catch (error) {
      console.error('Form submission error:', error)
      throw error
    }
  }, [validateForm, onSubmit, values])

  // Save as draft
  const saveDraft = useCallback(async () => {
    if (!onSaveDraft) return

    setIsSavingDraft(true)
    try {
      onSaveDraft(values)
      setLastSaved(new Date())
    } catch (error) {
      console.error('Draft save error:', error)
    } finally {
      setIsSavingDraft(false)
    }
  }, [onSaveDraft, values])

  // Get error for a specific field
  const getFieldError = useCallback(
    (fieldId: string): FieldError | undefined => {
      return errors[fieldId]
    },
    [errors]
  )

  // Scroll to first error
  const scrollToFirstError = useCallback(() => {
    const firstErrorField = Object.keys(errors)[0]
    if (firstErrorField) {
      const fieldElement = document.querySelector(`[data-field-id="${firstErrorField}"]`)
      if (fieldElement) {
        fieldElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
        const input = fieldElement.querySelector('input, textarea, select')
        if (input instanceof HTMLElement) {
          input.focus()
        }
      }
    }
  }, [errors])

  // Build actions object
  const actions: TemplateFormActions = useMemo(
    () => ({
      setFieldValue,
      setFieldValues,
      validateField,
      validateForm,
      resetForm,
      clearErrors,
      submitForm,
      saveDraft,
      getFieldError,
      scrollToFirstError,
    }),
    [
      setFieldValue,
      setFieldValues,
      validateField,
      validateForm,
      resetForm,
      clearErrors,
      submitForm,
      saveDraft,
      getFieldError,
      scrollToFirstError,
    ]
  )

  // Auto-save effect
  useEffect(() => {
    if (!autoSaveDraft || !onSaveDraft || !formState.isDirty) {
      return
    }

    // Clear existing timer
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current)
    }

    // Set new timer
    autoSaveTimerRef.current = setTimeout(() => {
      saveDraft()
    }, autoSaveDelay)

    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current)
      }
    }
  }, [autoSaveDraft, autoSaveDelay, onSaveDraft, formState.isDirty, values, saveDraft])

  // Form methods for advanced usage
  const formMethods = useMemo(
    () => ({
      register,
      watch,
      setValue,
      control,
      handleSubmit,
      formState,
    }),
    [register, watch, setValue, control, handleSubmit, formState]
  )

  return {
    state,
    actions,
    formMethods,
  }
}

export default useTemplateForm
