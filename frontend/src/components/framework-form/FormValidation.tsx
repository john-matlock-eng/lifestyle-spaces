/**
 * FormValidation Component
 *
 * Displays validation errors in a summary format with clickable links
 * to navigate to the errored fields.
 *
 * @module framework-form/FormValidation
 */

import { useMemo, useCallback } from 'react'
import { AlertCircle } from 'lucide-react'
import type { FormValidationProps, ValidationError } from './types'
import './framework-form.css'

/**
 * FormValidation - Displays form validation errors
 *
 * @example
 * ```tsx
 * <FormValidation
 *   errors={formErrors}
 *   fields={fieldDefinitions}
 *   showSummary
 *   onErrorClick={(fieldId) => scrollToField(fieldId)}
 * />
 * ```
 */
export function FormValidation({
  errors,
  fields,
  showSummary = true,
  onErrorClick,
  testId,
}: FormValidationProps) {
  // Convert errors to displayable format
  const validationErrors = useMemo((): ValidationError[] => {
    const errorList: ValidationError[] = []

    for (const [fieldPath, error] of Object.entries(errors)) {
      if (!error) continue

      // Extract field ID from path (could be nested like "focusAreas.0.name")
      const fieldId = fieldPath.split('.')[0]
      const field = fields[fieldId]

      errorList.push({
        fieldId,
        fieldLabel: field?.label ?? fieldId,
        message: error.message ?? 'This field is invalid',
        fieldPath,
      })
    }

    return errorList
  }, [errors, fields])

  // Handle click on an error
  const handleErrorClick = useCallback(
    (fieldId: string) => {
      onErrorClick?.(fieldId)
    },
    [onErrorClick]
  )

  // Don't render if no errors
  if (validationErrors.length === 0) {
    return null
  }

  // Don't render summary if not requested
  if (!showSummary) {
    return null
  }

  return (
    <div className="form-validation" data-testid={testId}>
      <div className="form-validation-summary" role="alert" aria-live="polite">
        <div className="form-validation-summary-header">
          <AlertCircle
            className="form-validation-summary-icon"
            size={20}
            aria-hidden="true"
          />
          <h4 className="form-validation-summary-title">
            Please fix the following errors
          </h4>
          <span className="form-validation-summary-count">
            {validationErrors.length} {validationErrors.length === 1 ? 'error' : 'errors'}
          </span>
        </div>

        <ul className="form-validation-errors" data-testid={testId ? `${testId}-list` : undefined}>
          {validationErrors.map((error) => (
            <li key={error.fieldPath}>
              <button
                type="button"
                className="form-validation-error"
                onClick={() => handleErrorClick(error.fieldId)}
                data-testid={testId ? `${testId}-error-${error.fieldId}` : undefined}
              >
                <span className="form-validation-error-bullet" aria-hidden="true" />
                <span className="form-validation-error-label">{error.fieldLabel}</span>
                <span className="form-validation-error-message">{error.message}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

export default FormValidation
