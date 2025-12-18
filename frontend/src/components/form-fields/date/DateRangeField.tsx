/**
 * DateRangeField Component
 *
 * Start and end date pickers with glassmorphism styling.
 * Features linked validation (end must be after start).
 *
 * @module form-fields/date/DateRangeField
 */

import { useId, useMemo } from 'react'
import type { FieldValues } from 'react-hook-form'
import type { DateRangeFieldProps } from '../types'
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
 * DateRangeField - Start and end date pickers with linked validation
 *
 * @example
 * ```tsx
 * <DateRangeField
 *   id="dateRange"
 *   name="startDate"
 *   startName="startDate"
 *   endName="endDate"
 *   startLabel="Start Date"
 *   endLabel="End Date"
 *   register={register}
 *   watch={watch}
 *   startError={errors.startDate}
 *   endError={errors.endDate}
 * />
 * ```
 */
export function DateRangeField<TFieldValues extends FieldValues = FieldValues>({
  id,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  name: _name,
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
  watch,
  startName,
  endName,
  startLabel = 'Start Date',
  endLabel = 'End Date',
  minDate,
  maxDate,
  startError,
  endError,
}: DateRangeFieldProps<TFieldValues>) {
  const generatedId = useId()
  const fieldId = id || generatedId
  const errorId = `${fieldId}-error`
  const descriptionId = `${fieldId}-description`
  const startErrorId = `${fieldId}-start-error`
  const endErrorId = `${fieldId}-end-error`

  // Watch current values
  const startValue = watch ? watch(startName) : undefined
  const endValue = watch ? watch(endName) : undefined

  // Format min/max dates
  const minDateFormatted = minDate ? formatDateForInput(minDate) : undefined
  const maxDateFormatted = maxDate ? formatDateForInput(maxDate) : undefined

  // Start date can't be after end date
  const startMaxDate = useMemo(() => {
    if (endValue) {
      const endFormatted = formatDateForInput(endValue)
      if (maxDateFormatted) {
        return endFormatted < maxDateFormatted ? endFormatted : maxDateFormatted
      }
      return endFormatted
    }
    return maxDateFormatted
  }, [endValue, maxDateFormatted])

  // End date can't be before start date
  const endMinDate = useMemo(() => {
    if (startValue) {
      const startFormatted = formatDateForInput(startValue)
      if (minDateFormatted) {
        return startFormatted > minDateFormatted ? startFormatted : minDateFormatted
      }
      return startFormatted
    }
    return minDateFormatted
  }, [startValue, minDateFormatted])

  // Build start validation rules
  const startValidationRules = useMemo(() => {
    const rules: Record<string, unknown> = {}

    if (required) {
      rules.required = 'Start date is required'
    }

    if (minDate) {
      rules.min = {
        value: minDateFormatted,
        message: `Start date must be on or after ${minDateFormatted}`,
      }
    }

    // Validate against end date
    rules.validate = {
      beforeEnd: (value: string) => {
        if (!value || !endValue) return true
        return value <= String(endValue) || 'Start date must be before or equal to end date'
      },
    }

    return rules
  }, [required, minDate, minDateFormatted, endValue])

  // Build end validation rules
  const endValidationRules = useMemo(() => {
    const rules: Record<string, unknown> = {}

    if (required) {
      rules.required = 'End date is required'
    }

    if (maxDate) {
      rules.max = {
        value: maxDateFormatted,
        message: `End date must be on or before ${maxDateFormatted}`,
      }
    }

    // Validate against start date
    rules.validate = {
      afterStart: (value: string) => {
        if (!value || !startValue) return true
        return value >= String(startValue) || 'End date must be after or equal to start date'
      },
    }

    return rules
  }, [required, maxDate, maxDateFormatted, startValue])

  // Build aria-describedby for start
  const startDescribedByIds = useMemo(() => {
    const ids: string[] = []
    if (ariaDescribedBy) ids.push(ariaDescribedBy)
    if (description) ids.push(descriptionId)
    if (startError) ids.push(startErrorId)
    return ids.length > 0 ? ids.join(' ') : undefined
  }, [ariaDescribedBy, description, startError, descriptionId, startErrorId])

  // Build aria-describedby for end
  const endDescribedByIds = useMemo(() => {
    const ids: string[] = []
    if (ariaDescribedBy) ids.push(ariaDescribedBy)
    if (description) ids.push(descriptionId)
    if (endError) ids.push(endErrorId)
    return ids.length > 0 ? ids.join(' ') : undefined
  }, [ariaDescribedBy, description, endError, descriptionId, endErrorId])

  // Wrapper classes
  const getWrapperClasses = (fieldError?: typeof error) =>
    [
      'field-input-wrapper',
      fieldError && 'field-input-wrapper--error',
      disabled && 'field-input-wrapper--disabled',
    ]
      .filter(Boolean)
      .join(' ')

  return (
    <div className={`field-container ${className}`} data-testid={testId}>
      {label && (
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

      <div className="field-date-range-container">
        <div className="field-date-range-row">
          {/* Start Date */}
          <div className="field-date-range-field">
            <label htmlFor={`${fieldId}-start`} className="field-label">
              {startLabel}
            </label>
            <div className={getWrapperClasses(startError)}>
              <input
                id={`${fieldId}-start`}
                type="date"
                className="field-date-input"
                disabled={disabled}
                min={minDateFormatted}
                max={startMaxDate}
                aria-label={`${ariaLabel || label} - ${startLabel}`}
                aria-required={required}
                aria-invalid={!!startError}
                aria-describedby={startDescribedByIds}
                data-testid={testId ? `${testId}-start-input` : undefined}
                {...register(startName, startValidationRules)}
              />
            </div>
            {startError && (
              <p id={startErrorId} className="field-error" role="alert">
                {startError.message}
              </p>
            )}
          </div>

          {/* End Date */}
          <div className="field-date-range-field">
            <label htmlFor={`${fieldId}-end`} className="field-label">
              {endLabel}
            </label>
            <div className={getWrapperClasses(endError)}>
              <input
                id={`${fieldId}-end`}
                type="date"
                className="field-date-input"
                disabled={disabled}
                min={endMinDate}
                max={maxDateFormatted}
                aria-label={`${ariaLabel || label} - ${endLabel}`}
                aria-required={required}
                aria-invalid={!!endError}
                aria-describedby={endDescribedByIds}
                data-testid={testId ? `${testId}-end-input` : undefined}
                {...register(endName, endValidationRules)}
              />
            </div>
            {endError && (
              <p id={endErrorId} className="field-error" role="alert">
                {endError.message}
              </p>
            )}
          </div>
        </div>
      </div>

      {error && (
        <p id={errorId} className="field-error" role="alert">
          {error.message}
        </p>
      )}
    </div>
  )
}

export default DateRangeField
