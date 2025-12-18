/**
 * DynamicFormRenderer Component
 *
 * Main component for rendering dynamic forms based on FrameworkTemplate.
 * Integrates all form sections, validation, and actions.
 *
 * @module framework-form/DynamicFormRenderer
 */

import { useMemo, useCallback, useEffect, useRef } from 'react'
import { FormProvider } from 'react-hook-form'
// FrameworkTemplate type is used via DynamicFormRendererProps which references it
// FieldDefinition type is used indirectly through fieldsMap
import { FormSection } from './FormSection'
import { FormValidation } from './FormValidation'
import { FormActions } from './FormActions'
import { useTemplateForm } from './useTemplateForm'
import type { DynamicFormRendererProps } from './types'
import './framework-form.css'

/**
 * DynamicFormRenderer - Renders a complete dynamic form from a template
 *
 * @example
 * ```tsx
 * <DynamicFormRenderer
 *   template={weeklyReviewTemplate}
 *   initialValues={existingEntry?.content}
 *   resolvedBindings={bindings}
 *   onSubmit={async (values) => saveEntry(values)}
 *   onSaveDraft={(values) => saveDraft(values)}
 *   onCancel={() => navigate('/journal')}
 *   autoSaveDraft
 *   autoSaveDelay={2000}
 * />
 * ```
 */
export function DynamicFormRenderer({
  template,
  initialValues,
  resolvedBindings,
  onSubmit,
  onSaveDraft,
  onCancel,
  readOnly = false,
  disabled = false,
  autoSaveDraft = false,
  autoSaveDelay = 2000,
  testId,
  className,
}: DynamicFormRendererProps) {
  const formRef = useRef<HTMLFormElement>(null)

  // Initialize form with template
  const { state, actions, formMethods } = useTemplateForm({
    template,
    initialValues,
    resolvedBindings,
    onSubmit,
    onSaveDraft,
    autoSaveDraft,
    autoSaveDelay,
    validationMode: 'onBlur',
  })

  // Build fields lookup map (content.fields is already a Record)
  const fieldsMap = useMemo(() => {
    return template.content?.fields ?? {}
  }, [template.content?.fields])

  // Sort sections by order
  const sortedSections = useMemo(() => {
    if (!template.content?.sections) {
      return []
    }
    return [...template.content.sections].sort((a, b) => a.order - b.order)
  }, [template.content?.sections])

  // Handle form submission
  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      await actions.submitForm()
    },
    [actions]
  )

  // Handle field change
  const handleFieldChange = useCallback(
    (fieldId: string, value: unknown) => {
      actions.setFieldValue(fieldId, value)
    },
    [actions]
  )

  // Handle field blur
  const handleFieldBlur = useCallback(
    (fieldId: string) => {
      actions.validateField(fieldId)
    },
    [actions]
  )

  // Handle error click - scroll to field
  const handleErrorClick = useCallback((fieldId: string) => {
    const fieldElement = document.querySelector(`[data-field-id="${fieldId}"]`)
    if (fieldElement) {
      fieldElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
      // Focus the input if possible
      const input = fieldElement.querySelector('input, textarea, select')
      if (input instanceof HTMLElement) {
        input.focus()
      }
    }
  }, [])

  // Handle save draft button
  const handleSaveDraft = useCallback(() => {
    actions.saveDraft()
  }, [actions])

  // Handle cancel button
  const handleCancel = useCallback(() => {
    if (onCancel) {
      onCancel()
    }
  }, [onCancel])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + S to save
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault()
        if (!readOnly && !disabled) {
          if (onSaveDraft && !state.isSubmitting) {
            actions.saveDraft()
          }
        }
      }
      // Cmd/Ctrl + Enter to submit
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault()
        if (!readOnly && !disabled && !state.isSubmitting) {
          actions.submitForm()
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [readOnly, disabled, state.isSubmitting, onSaveDraft, actions])

  // Convert errors to record format for components
  const errorsRecord = useMemo(() => {
    return state.errors
  }, [state.errors])

  // Build container classes
  const containerClasses = [
    'dynamic-form',
    state.isSubmitting && 'dynamic-form--loading',
    readOnly && 'dynamic-form--readonly',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <FormProvider {...formMethods}>
      <form
        ref={formRef}
        className={containerClasses}
        onSubmit={handleSubmit}
        data-testid={testId}
        noValidate
      >
        {/* Form Header */}
        {(template.name || template.description) && (
          <div className="dynamic-form-header" data-testid={testId ? `${testId}-header` : undefined}>
            {template.name && (
              <h2 className="dynamic-form-title">{template.name}</h2>
            )}
            {template.description && (
              <p className="dynamic-form-description">{template.description}</p>
            )}
          </div>
        )}

        {/* Guidance Text */}
        {template.content?.guidance && (
          <div className="dynamic-form-guidance" data-testid={testId ? `${testId}-guidance` : undefined}>
            <p>{template.content.guidance}</p>
          </div>
        )}

        {/* Validation Summary */}
        {Object.keys(errorsRecord).length > 0 && (
          <FormValidation
            errors={errorsRecord}
            fields={fieldsMap}
            showSummary
            onErrorClick={handleErrorClick}
            testId={testId ? `${testId}-validation` : undefined}
          />
        )}

        {/* Form Sections */}
        <div className="dynamic-form-sections" data-testid={testId ? `${testId}-sections` : undefined}>
          {sortedSections.map((section) => (
            <FormSection
              key={section.id}
              section={section}
              fields={fieldsMap}
              resolvedBindings={resolvedBindings}
              formValues={state.values}
              errors={errorsRecord}
              disabled={disabled || state.isSubmitting}
              readOnly={readOnly}
              onFieldChange={handleFieldChange}
              onFieldBlur={handleFieldBlur}
              testIdPrefix={testId}
            />
          ))}
        </div>

        {/* Form Footer/Actions */}
        {!readOnly && (
          <div className="dynamic-form-footer" data-testid={testId ? `${testId}-footer` : undefined}>
            <FormActions
              formState={state}
              onSubmit={() => actions.submitForm()}
              onSaveDraft={onSaveDraft ? handleSaveDraft : undefined}
              onCancel={onCancel ? handleCancel : undefined}
              disabled={disabled}
              submitLabel={template.content?.submitLabel ?? 'Save Entry'}
              cancelLabel="Cancel"
              draftLabel="Save Draft"
              showShortcuts
              testId={testId ? `${testId}-actions` : undefined}
            />
          </div>
        )}
      </form>
    </FormProvider>
  )
}

export default DynamicFormRenderer
