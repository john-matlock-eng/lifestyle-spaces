/**
 * FractionTrackerField Component
 *
 * Two number inputs for tracking progress (numerator / denominator).
 * Features quick-fill buttons and validation.
 *
 * @module form-fields/fraction-tracker/FractionTrackerField
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
import { useId, useMemo, useCallback, useEffect } from 'react'
import type { FieldValues } from 'react-hook-form'
import type { FractionTrackerFieldProps, FractionValue } from '../types'
import { Plus, RotateCcw, CheckCircle2 } from 'lucide-react'
import '../form-fields.css'

/**
 * FractionTrackerField - Progress tracking with numerator/denominator
 *
 * @example
 * ```tsx
 * <FractionTrackerField
 *   id="progress"
 *   name="progress"
 *   label="Tasks Completed"
 *   maxDenominator={10}
 *   showQuickFill
 *   register={register}
 *   watch={watch}
 *   setValue={setValue}
 * />
 * ```
 */
export function FractionTrackerField<TFieldValues extends FieldValues = FieldValues>({
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
  maxDenominator = 100,
  showQuickFill = true,
  defaultValue = { numerator: 0, denominator: 1 },
}: FractionTrackerFieldProps<TFieldValues>): JSX.Element {
  const generatedId = useId()
  const fieldId = id || generatedId
  const errorId = `${fieldId}-error`
  const descriptionId = `${fieldId}-description`

  // Watch the current value
  const currentValue: FractionValue = watch
    ? watch(name) ?? defaultValue
    : defaultValue

  // Initialize value on mount
  useEffect(() => {
    if (setValue && !watch?.(name)) {
      setValue(name, defaultValue as any, { shouldValidate: false })
    }
  }, [setValue, name, defaultValue, watch])

  // Update numerator
  const updateNumerator = useCallback(
    (newNumerator: number) => {
      if (disabled || !setValue) return
      const clampedNumerator = Math.max(0, Math.min(newNumerator, currentValue.denominator))
      setValue(
        name,
        { ...currentValue, numerator: clampedNumerator } as any,
        { shouldValidate: true }
      )
    },
    [disabled, setValue, name, currentValue]
  )

  // Update denominator
  const updateDenominator = useCallback(
    (newDenominator: number) => {
      if (disabled || !setValue) return
      const clampedDenominator = Math.max(1, Math.min(newDenominator, maxDenominator))
      // Adjust numerator if it exceeds new denominator
      const adjustedNumerator = Math.min(currentValue.numerator, clampedDenominator)
      setValue(
        name,
        { numerator: adjustedNumerator, denominator: clampedDenominator } as any,
        { shouldValidate: true }
      )
    },
    [disabled, setValue, name, currentValue, maxDenominator]
  )

  // Quick fill handlers
  const handleIncrement = useCallback(() => {
    updateNumerator(currentValue.numerator + 1)
  }, [updateNumerator, currentValue.numerator])

  const handleComplete = useCallback(() => {
    updateNumerator(currentValue.denominator)
  }, [updateNumerator, currentValue.denominator])

  const handleReset = useCallback(() => {
    updateNumerator(0)
  }, [updateNumerator])

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
      validFraction: (value: FractionValue) => {
        if (!value) return true
        if (value.numerator > value.denominator) {
          return 'Numerator cannot exceed denominator'
        }
        return true
      },
    },
  })

  // Wrapper classes
  const wrapperClasses = [
    'field-input-wrapper',
    error && 'field-input-wrapper--error',
    disabled && 'field-input-wrapper--disabled',
  ]
    .filter(Boolean)
    .join(' ')

  const isComplete = currentValue.numerator === currentValue.denominator
  const canIncrement = currentValue.numerator < currentValue.denominator

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

      <div className="field-fraction-container">
        <div className={wrapperClasses}>
          <div
            className="field-fraction-inputs"
            role="group"
            aria-label={ariaLabel || label || 'Fraction input'}
            aria-describedby={describedByIds}
          >
            <input
              id={`${fieldId}-numerator`}
              type="number"
              className="field-fraction-input"
              value={currentValue.numerator}
              onChange={(e) => updateNumerator(parseInt(e.target.value) || 0)}
              min={0}
              max={currentValue.denominator}
              disabled={disabled}
              aria-label="Numerator"
              aria-invalid={!!error}
              data-testid={testId ? `${testId}-numerator` : undefined}
            />
            <span className="field-fraction-divider" aria-hidden="true">
              /
            </span>
            <input
              id={`${fieldId}-denominator`}
              type="number"
              className="field-fraction-input"
              value={currentValue.denominator}
              onChange={(e) => updateDenominator(parseInt(e.target.value) || 1)}
              min={1}
              max={maxDenominator}
              disabled={disabled}
              aria-label="Denominator"
              aria-invalid={!!error}
              data-testid={testId ? `${testId}-denominator` : undefined}
            />
          </div>
        </div>

        {showQuickFill && (
          <div className="field-fraction-quick-fill">
            <button
              type="button"
              className="field-fraction-quick-btn"
              onClick={handleIncrement}
              disabled={disabled || !canIncrement}
              aria-label="Add one"
              data-testid={testId ? `${testId}-increment` : undefined}
            >
              <Plus size={14} />
              +1
            </button>
            <button
              type="button"
              className="field-fraction-quick-btn"
              onClick={handleComplete}
              disabled={disabled || isComplete}
              aria-label="Mark complete"
              data-testid={testId ? `${testId}-complete` : undefined}
            >
              <CheckCircle2 size={14} />
              Complete
            </button>
            <button
              type="button"
              className="field-fraction-quick-btn"
              onClick={handleReset}
              disabled={disabled || currentValue.numerator === 0}
              aria-label="Reset to zero"
              data-testid={testId ? `${testId}-reset` : undefined}
            >
              <RotateCcw size={14} />
              Reset
            </button>
          </div>
        )}
      </div>

      {error && (
        <p id={errorId} className="field-error" role="alert">
          {error.message}
        </p>
      )}
    </div>
  )
}

export default FractionTrackerField
