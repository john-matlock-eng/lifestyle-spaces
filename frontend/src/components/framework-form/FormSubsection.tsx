/**
 * FormSubsection Component
 *
 * Renders a subsection within a form section.
 * Handles both field-group and repeatable subsection types.
 *
 * @module framework-form/FormSubsection
 */

import { useState, useMemo, useCallback } from 'react'
import { ChevronDown } from 'lucide-react'
import type { FieldError } from 'react-hook-form'
import type { TemplateSubsection } from '@/features/journal/types/framework.types'
import type { FieldDefinition } from '@/features/journal/types/field.types'
import type { ResolvedBindings } from '@/features/journal/types/data-binding.types'
import { FieldRenderer } from './FieldRenderer'
import type { FormSubsectionProps } from './types'
import './framework-form.css'

/**
 * FormSubsection - Renders a subsection with its fields
 *
 * @example
 * ```tsx
 * <FormSubsection
 *   subsection={subsectionDefinition}
 *   fields={allFields}
 *   resolvedBindings={bindings}
 *   formValues={formValues}
 *   errors={errors}
 *   onFieldChange={(fieldId, value) => setValue(fieldId, value)}
 * />
 * ```
 */
export function FormSubsection({
  subsection,
  fields,
  resolvedBindings,
  formValues,
  errors,
  disabled = false,
  readOnly = false,
  onFieldChange,
  onFieldBlur,
  testIdPrefix,
}: FormSubsectionProps): JSX.Element {
  const testId = testIdPrefix ? `${testIdPrefix}-subsection-${subsection.id}` : undefined

  // Manage collapsed state
  const [isCollapsed, setIsCollapsed] = useState(subsection.defaultCollapsed ?? false)

  // Toggle collapse
  const toggleCollapse = useCallback(() => {
    if (subsection.collapsible) {
      setIsCollapsed((prev) => !prev)
    }
  }, [subsection.collapsible])

  // Get fields for this subsection
  const subsectionFields = useMemo(() => {
    return subsection.fields
      .map((fieldId) => fields[fieldId])
      .filter((field): field is FieldDefinition => field !== undefined)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
  }, [subsection.fields, fields])

  // Check if subsection has any errors
  const hasErrors = useMemo(() => {
    return subsectionFields.some((field) => errors[field.id])
  }, [subsectionFields, errors])

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

  // Build container classes
  const containerClasses = [
    'form-subsection',
    isCollapsed && 'form-subsection--collapsed',
    subsection.collapsible && 'form-subsection--collapsible',
    hasErrors && 'form-subsection--error',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={containerClasses} data-testid={testId}>
      {/* Subsection Header */}
      {(subsection.title || subsection.description || subsection.collapsible) && (
        <div
          className="form-subsection-header"
          onClick={toggleCollapse}
          role={subsection.collapsible ? 'button' : undefined}
          aria-expanded={subsection.collapsible ? !isCollapsed : undefined}
          data-testid={testId ? `${testId}-header` : undefined}
        >
          <div>
            {subsection.title && (
              <h4 className="form-subsection-title">{subsection.title}</h4>
            )}
            {subsection.description && (
              <p className="form-subsection-description">{subsection.description}</p>
            )}
          </div>
          {subsection.collapsible && (
            <ChevronDown
              className="form-subsection-collapse-icon"
              size={18}
              aria-hidden="true"
            />
          )}
        </div>
      )}

      {/* Subsection Content */}
      <div
        className="form-subsection-content"
        data-testid={testId ? `${testId}-content` : undefined}
      >
        {subsectionFields.map((field) => (
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
    </div>
  )
}

export default FormSubsection
