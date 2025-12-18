/**
 * DateField Component
 *
 * Date picker with glassmorphism styling.
 * Features defaultToday, min/max constraints, and accessibility.
 *
 * @module form-fields/date/DateField
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
import { useId, useMemo, useEffect } from 'react'
import type { FieldValues } from 'react-hook-form'
import type { DateFieldProps } from '../types'
import '../form-fields.css'

/**
 * Format date for input value
 */
function formatDateForInput(date: Date | string | undefined): string {
  if (!date) return ''

  const d = typeof date === 'string' ? new Date(date) : date

  if (isNaN(d.getTime())) return ''

  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

/**
 * Get today's date formatted for input
 */
function getTodayFormatted(): string {
  return formatDateForInput(new Date())
}

/**
 * DateField - Date picker with glassmorphism styling
 *
 * @example
 * ```tsx
 * <DateField
 *   id="birthdate"
 *   name="birthdate"
 *   label="Birth Date"
 *   register={register}
 *   error={errors.birthdate}
 *   maxDate={new Date()}
 * />
 * ```
 */
export function DateField<TFieldValues extends FieldValues = FieldValues>({
  id,
  name,
  label,
  description,
  placeholder,
  required = false,
  disabled = false,
  readOnly = false,
  error,
  className = '',
  ariaLabel,
  ariaDescribedBy,
  testId,
  register,
  setValue,
  defaultToday = false,
  minDate,
  maxDate,
  defaultValue,
}: DateFieldProps<TFieldValues>): JSX.Element {
  const generatedId = useId()
  const fieldId = id || generatedId
  const errorId = `${fieldId}-error`
  const descriptionId = `${fieldId}-description`

  // Format min/max dates
  const minDateFormatted = minDate ? formatDateForInput(minDate) : undefined
  const maxDateFormatted = maxDate ? formatDateForInput(maxDate) : undefined

  // Build validation rules
  const validationRules = useMemo(() => {
    const rules: Record<string, unknown> = {}

    if (required) {
      rules.required = 'This field is required'
    }

    if (minDate) {
      rules.min = {
        value: minDateFormatted,
        message: `Date must be on or after ${minDateFormatted}`,
      }
    }

    if (maxDate) {
      rules.max = {
        value: maxDateFormatted,
        message: `Date must be on or before ${maxDateFormatted}`,
      }
    }

    return rules
  }, [required, minDate, maxDate, minDateFormatted, maxDateFormatted])

  // Build aria-describedby
  const describedByIds = useMemo(() => {
    const ids: string[] = []
    if (ariaDescribedBy) ids.push(ariaDescribedBy)
    if (description) ids.push(descriptionId)
    if (error) ids.push(errorId)
    return ids.length > 0 ? ids.join(' ') : undefined
  }, [ariaDescribedBy, description, error, descriptionId, errorId])

  // Set default value on mount
  useEffect(() => {
    if (setValue) {
      if (defaultValue) {
        setValue(name, formatDateForInput(defaultValue) as any, { shouldValidate: false })
      } else if (defaultToday) {
        setValue(name, getTodayFormatted() as any, { shouldValidate: false })
      }
    }
  }, [setValue, name, defaultToday, defaultValue])

  // Wrapper classes
  const wrapperClasses = [
    'field-input-wrapper',
    error && 'field-input-wrapper--error',
    disabled && 'field-input-wrapper--disabled',
    readOnly && 'field-input-wrapper--readonly',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={`field-container ${className}`} data-testid={testId}>
      {label && (
        <label htmlFor={fieldId} className="field-label">
          {label}
          {required && (
            <span className="field-label-required" aria-label="required">
              *
            </span>
          )}
        </label>
      )}

      {description && (
        <p id={descriptionId} className="field-description">
          {description}
        </p>
      )}

      <div className={wrapperClasses}>
        <input
          id={fieldId}
          type="date"
          className="field-date-input"
          placeholder={placeholder}
          disabled={disabled}
          readOnly={readOnly}
          min={minDateFormatted}
          max={maxDateFormatted}
          aria-label={ariaLabel || label}
          aria-required={required}
          aria-invalid={!!error}
          aria-describedby={describedByIds}
          data-testid={testId ? `${testId}-input` : undefined}
          {...register(name, validationRules)}
        />
      </div>

      {error && (
        <p id={errorId} className="field-error" role="alert">
          {error.message}
        </p>
      )}
    </div>
  )
}

export default DateField
