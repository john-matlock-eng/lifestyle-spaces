/**
 * CheckboxField Component
 *
 * Single checkbox with glassmorphism styling.
 * Features custom styling and accessibility.
 *
 * @module form-fields/checkbox/CheckboxField
 */

import { useId, useMemo } from 'react'
import type { FieldValues } from 'react-hook-form'
import type { CheckboxFieldProps } from '../types'
import { Check } from 'lucide-react'
import '../form-fields.css'

/**
 * CheckboxField - Single checkbox with glassmorphism styling
 *
 * @example
 * ```tsx
 * <CheckboxField
 *   id="agree"
 *   name="agree"
 *   label="Terms and Conditions"
 *   checkboxLabel="I agree to the terms and conditions"
 *   register={register}
 *   error={errors.agree}
 *   required
 * />
 * ```
 */
export function CheckboxField<TFieldValues extends FieldValues = FieldValues>({
  id,
  name,
  label,
  description,
  required = false,
  disabled = false,
  error,
  className = '',
  ariaLabel,
  ariaDescribedBy,
  testId,
  register,
  checkboxLabel,
  defaultChecked = false,
}: CheckboxFieldProps<TFieldValues>) {
  const generatedId = useId()
  const fieldId = id || generatedId
  const errorId = `${fieldId}-error`
  const descriptionId = `${fieldId}-description`

  // Build validation rules
  const validationRules = useMemo(() => {
    const rules: Record<string, unknown> = {}
    if (required) {
      rules.required = 'This field is required'
    }
    return rules
  }, [required])

  // Build aria-describedby
  const describedByIds = useMemo(() => {
    const ids: string[] = []
    if (ariaDescribedBy) ids.push(ariaDescribedBy)
    if (description) ids.push(descriptionId)
    if (error) ids.push(errorId)
    return ids.length > 0 ? ids.join(' ') : undefined
  }, [ariaDescribedBy, description, error, descriptionId, errorId])

  // Label text to display
  const displayLabel = checkboxLabel || label

  return (
    <div className={`field-container ${className}`} data-testid={testId}>
      {label && label !== checkboxLabel && (
        <span className="field-label">
          {label}
          {required && (
            <span className="field-label-required" aria-label="required">
              *
            </span>
          )}
        </span>
      )}

      {description && (
        <p id={descriptionId} className="field-description">
          {description}
        </p>
      )}

      <label
        className="field-checkbox-container"
        data-testid={testId ? `${testId}-label` : undefined}
      >
        <input
          id={fieldId}
          type="checkbox"
          className="field-checkbox-input"
          disabled={disabled}
          defaultChecked={defaultChecked}
          aria-label={ariaLabel || displayLabel}
          aria-required={required}
          aria-invalid={!!error}
          aria-describedby={describedByIds}
          data-testid={testId ? `${testId}-input` : undefined}
          {...register(name, validationRules)}
        />
        <span className="field-checkbox-box">
          <Check className="field-checkbox-check" size={14} />
        </span>
        {displayLabel && (
          <span
            className={`field-checkbox-label ${disabled ? 'field-checkbox-label--disabled' : ''}`}
          >
            {displayLabel}
            {required && label === checkboxLabel && (
              <span className="field-label-required" aria-label="required">
                *
              </span>
            )}
          </span>
        )}
      </label>

      {error && (
        <p id={errorId} className="field-error" role="alert">
          {error.message}
        </p>
      )}
    </div>
  )
}

export default CheckboxField
