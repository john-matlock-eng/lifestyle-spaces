/**
 * FormSection Component
 *
 * Renders a major section within the form.
 * Contains either direct fields or subsections.
 *
 * @module framework-form/FormSection
 */

import { useState, useMemo, useCallback } from 'react'
import { ChevronDown } from 'lucide-react'
import type { FieldDefinition } from '@/features/journal/types'
import { FieldRenderer } from './FieldRenderer'
import { FormSubsection } from './FormSubsection'
import type { FormSectionProps } from './types'
import './framework-form.css'

/**
 * FormSection - Renders a form section with header and content
 *
 * @example
 * ```tsx
 * <FormSection
 *   section={sectionDefinition}
 *   fields={allFields}
 *   resolvedBindings={bindings}
 *   formValues={formValues}
 *   errors={errors}
 *   onFieldChange={(fieldId, value) => setValue(fieldId, value)}
 * />
 * ```
 */
export function FormSection({
  section,
  fields,
  resolvedBindings,
  formValues,
  errors,
  disabled = false,
  readOnly = false,
  onFieldChange,
  onFieldBlur,
  testIdPrefix,
  defaultCollapsed,
}: FormSectionProps) {
  const testId = testIdPrefix ? `${testIdPrefix}-section-${section.id}` : undefined

  // Manage collapsed state
  const [isCollapsed, setIsCollapsed] = useState(
    defaultCollapsed ?? section.defaultCollapsed ?? false
  )

  // Toggle collapse
  const toggleCollapse = useCallback(() => {
    if (section.collapsible !== false) {
      setIsCollapsed((prev: boolean) => !prev)
    }
  }, [section.collapsible])

  // Get direct fields for this section (if no subsections)
  const sectionFields = useMemo(() => {
    if (section.subsections?.length) {
      return []
    }
    return (section.fields ?? [])
      .map((fieldId: string) => fields[fieldId])
      .filter((field: FieldDefinition | undefined): field is FieldDefinition => field !== undefined)
      .sort((a: FieldDefinition, b: FieldDefinition) => (a.order ?? 0) - (b.order ?? 0))
  }, [section.fields, section.subsections, fields])

  // Sort subsections by order
  const sortedSubsections = useMemo(() => {
    if (!section.subsections?.length) {
      return []
    }
    return [...section.subsections].sort((a, b) => a.order - b.order)
  }, [section.subsections])

  // Check if section has any errors
  const hasErrors = useMemo(() => {
    // Check direct fields
    const directFieldErrors = sectionFields.some((field: FieldDefinition) => errors[field.id])
    if (directFieldErrors) return true

    // Check subsection fields
    if (section.subsections) {
      for (const subsection of section.subsections) {
        for (const fieldId of subsection.fields) {
          if (errors[fieldId]) return true
        }
      }
    }

    return false
  }, [sectionFields, section.subsections, errors])

  // Handle field change
  const handleFieldChange = useCallback(
    (fieldId: string, value: unknown) => {
      onFieldChange(fieldId, value)
    },
    [onFieldChange]
  )

  // Handle field blur
  const handleFieldBlur = useCallback(
    (fieldId: string) => {
      onFieldBlur?.(fieldId)
    },
    [onFieldBlur]
  )

  // Evaluate conditional display
  const shouldShow = useMemo(() => {
    if (!section.showIf) return true

    // Simple conditional evaluation
    // Format: "fieldId == value" or "fieldId != value"
    const match = section.showIf.match(/^(\w+)\s*(==|!=)\s*(.+)$/)
    if (!match) return true

    const [, fieldId, operator, expectedValue] = match
    const actualValue = formValues[fieldId]

    if (operator === '==') {
      return String(actualValue) === expectedValue.trim()
    }
    if (operator === '!=') {
      return String(actualValue) !== expectedValue.trim()
    }

    return true
  }, [section.showIf, formValues])

  // Don't render if conditionally hidden
  if (!shouldShow) {
    return null
  }

  // Build container classes
  const containerClasses = [
    'form-section',
    isCollapsed && 'form-section--collapsed',
    hasErrors && 'form-section--error',
    section.required && 'form-section--required',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={containerClasses} data-testid={testId}>
      {/* Section Header */}
      <div
        className="form-section-header"
        onClick={toggleCollapse}
        role="button"
        aria-expanded={!isCollapsed}
        data-testid={testId ? `${testId}-header` : undefined}
      >
        <div className="form-section-header-left">
          {section.icon && (
            <span className="form-section-icon" aria-hidden="true">
              {section.icon}
            </span>
          )}
          <div>
            <h3 className="form-section-title">
              {section.title}
              {section.required && (
                <span className="form-section-required-indicator" aria-label="required">
                  *
                </span>
              )}
            </h3>
            {section.description && (
              <p className="form-section-description">{section.description}</p>
            )}
          </div>
        </div>
        <ChevronDown
          className="form-section-collapse-icon"
          size={20}
          aria-hidden="true"
        />
      </div>

      {/* Section Content */}
      <div
        className="form-section-content"
        data-testid={testId ? `${testId}-content` : undefined}
      >
        {/* Render subsections if present */}
        {sortedSubsections.length > 0 ? (
          sortedSubsections.map((subsection) => (
            <FormSubsection
              key={subsection.id}
              subsection={subsection}
              fields={fields}
              resolvedBindings={resolvedBindings}
              formValues={formValues}
              errors={errors}
              disabled={disabled}
              readOnly={readOnly}
              onFieldChange={handleFieldChange}
              onFieldBlur={handleFieldBlur}
              testIdPrefix={testId}
            />
          ))
        ) : (
          /* Render direct fields */
          <div className="form-section-fields">
            {sectionFields.map((field) => (
              <FieldRenderer
                key={field.id}
                field={field}
                resolvedBinding={resolvedBindings?.bindings[field.id]}
                formValues={formValues}
                fieldPath={field.id}
                error={errors[field.id]}
                disabled={disabled}
                readOnly={readOnly}
                onChange={(value) => handleFieldChange(field.id, value)}
                onBlur={() => handleFieldBlur(field.id)}
                testIdPrefix={testId}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default FormSection
