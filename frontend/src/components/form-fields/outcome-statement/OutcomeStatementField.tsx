/**
 * OutcomeStatementField Component
 *
 * Combines date picker with statement text input for outcome declarations.
 * Format: "By [date], I will [statement]"
 *
 * @module form-fields/outcome-statement/OutcomeStatementField
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
import { useId, useMemo, useCallback, useEffect } from 'react'
import type { FieldValues } from 'react-hook-form'
import type { OutcomeStatementFieldProps, OutcomeStatementValue } from '../types'
import '../form-fields.css'

/**
 * Format date to YYYY-MM-DD string
 */
function formatDateString(date: Date | string | undefined): string {
  if (!date) return ''
  const d = typeof date === 'string' ? new Date(date) : date
  if (isNaN(d.getTime())) return ''
  return d.toISOString().split('T')[0]
}

/**
 * OutcomeStatementField - Date + statement combo for outcome declarations
 *
 * @example
 * ```tsx
 * <OutcomeStatementField
 *   id="outcome"
 *   name="outcome"
 *   label="My Commitment"
 *   prefixText="By"
 *   midText="I will"
 *   register={register}
 *   watch={watch}
 *   setValue={setValue}
 * />
 * ```
 */
export function OutcomeStatementField<TFieldValues extends FieldValues = FieldValues>({
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
  watch,
  setValue,
  prefixText = 'By',
  midText = 'I will',
  minDate,
  maxDate,
  statementPlaceholder = 'describe your outcome...',
  statementMaxLength = 200,
  defaultValue = { date: '', statement: '' },
}: OutcomeStatementFieldProps<TFieldValues>) {
  const generatedId = useId()
  const fieldId = id || generatedId
  const errorId = `${fieldId}-error`
  const descriptionId = `${fieldId}-description`

  // Watch the current value
  const currentValue: OutcomeStatementValue = watch
    ? watch(name) ?? defaultValue
    : defaultValue

  // Initialize value on mount
  useEffect(() => {
    if (setValue && !watch?.(name)) {
      setValue(name, defaultValue as any, { shouldValidate: false })
    }
  }, [setValue, name, defaultValue, watch])

  // Update date
  const updateDate = useCallback(
    (newDate: string) => {
      if (disabled || !setValue) return
      setValue(
        name,
        { ...currentValue, date: newDate } as any,
        { shouldValidate: true }
      )
    },
    [disabled, setValue, name, currentValue]
  )

  // Update statement
  const updateStatement = useCallback(
    (newStatement: string) => {
      if (disabled || !setValue) return
      setValue(
        name,
        { ...currentValue, statement: newStatement } as any,
        { shouldValidate: true }
      )
    },
    [disabled, setValue, name, currentValue]
  )

  // Build aria-describedby
  const describedByIds = useMemo(() => {
    const ids: string[] = []
    if (ariaDescribedBy) ids.push(ariaDescribedBy)
    if (description) ids.push(descriptionId)
    if (error) ids.push(errorId)
    return ids.length > 0 ? ids.join(' ') : undefined
  }, [ariaDescribedBy, description, error, descriptionId, errorId])

  // Hidden input for form registration
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { ref: _ref, ...registerProps } = register(name, {
    required: required ? 'This field is required' : false,
    validate: {
      hasDate: (value: OutcomeStatementValue) => {
        if (!value || !required) return true
        if (!value.date) {
          return 'Date is required'
        }
        return true
      },
      hasStatement: (value: OutcomeStatementValue) => {
        if (!value || !required) return true
        if (!value.statement?.trim()) {
          return 'Statement is required'
        }
        return true
      },
    },
  })

  // Format min/max dates
  const formattedMinDate = formatDateString(minDate)
  const formattedMaxDate = formatDateString(maxDate)

  // Wrapper classes
  const wrapperClasses = [
    'field-input-wrapper',
    error && 'field-input-wrapper--error',
    disabled && 'field-input-wrapper--disabled',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={`field-container ${className}`} data-testid={testId}>
      {label && (
        <label className="field-label">
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

      {/* Hidden input for form value */}
      <input type="hidden" {...registerProps} value={JSON.stringify(currentValue)} />

      <div className={wrapperClasses}>
        <div
          className="field-outcome-container"
          role="group"
          aria-label={ariaLabel || label || 'Outcome statement'}
          aria-describedby={describedByIds}
        >
          {prefixText && (
            <span className="field-outcome-text field-outcome-prefix">
              {prefixText}
            </span>
          )}

          <input
            id={`${fieldId}-date`}
            type="date"
            className="field-outcome-date"
            value={currentValue.date}
            onChange={(e) => updateDate(e.target.value)}
            min={formattedMinDate || undefined}
            max={formattedMaxDate || undefined}
            disabled={disabled}
            aria-label="Target date"
            aria-invalid={!!error}
            data-testid={testId ? `${testId}-date` : undefined}
          />

          {midText && (
            <span className="field-outcome-text field-outcome-mid">
              {midText}
            </span>
          )}

          <input
            id={`${fieldId}-statement`}
            type="text"
            className="field-outcome-statement"
            value={currentValue.statement}
            onChange={(e) => updateStatement(e.target.value)}
            placeholder={statementPlaceholder}
            maxLength={statementMaxLength}
            disabled={disabled}
            aria-label="Outcome statement"
            aria-invalid={!!error}
            data-testid={testId ? `${testId}-statement` : undefined}
          />
        </div>
      </div>

      {statementMaxLength && currentValue.statement && (
        <div className="field-char-count">
          {currentValue.statement.length} / {statementMaxLength}
        </div>
      )}

      {error && (
        <p id={errorId} className="field-error" role="alert">
          {error.message}
        </p>
      )}
    </div>
  )
}

export default OutcomeStatementField
