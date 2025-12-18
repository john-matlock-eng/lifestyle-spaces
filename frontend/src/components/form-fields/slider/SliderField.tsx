/**
 * SliderField Component
 *
 * Range slider with glassmorphism styling.
 * Features min/max labels, current value display, and step support.
 *
 * @module form-fields/slider/SliderField
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
import { useId, useMemo, useCallback } from 'react'
import type { FieldValues } from 'react-hook-form'
import type { SliderFieldProps } from '../types'
import '../form-fields.css'

/**
 * SliderField - Range slider with glassmorphism styling
 *
 * @example
 * ```tsx
 * <SliderField
 *   id="rating"
 *   name="rating"
 *   label="Rating"
 *   min={1}
 *   max={10}
 *   step={1}
 *   minLabel="Poor"
 *   maxLabel="Excellent"
 *   showValue
 *   register={register}
 *   watch={watch}
 * />
 * ```
 */
export function SliderField<TFieldValues extends FieldValues = FieldValues>({
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
  min,
  max,
  step = 1,
  minLabel,
  maxLabel,
  showValue = true,
  formatValue,
  defaultValue,
}: SliderFieldProps<TFieldValues>) {
  const generatedId = useId()
  const fieldId = id || generatedId
  const errorId = `${fieldId}-error`
  const descriptionId = `${fieldId}-description`

  // Watch the current value
  const currentValue = watch ? watch(name) : defaultValue ?? min
  const numericValue = typeof currentValue === 'number' ? currentValue : min

  // Format the display value
  const displayValue = useMemo(() => {
    if (formatValue) {
      return formatValue(numericValue)
    }
    return numericValue.toString()
  }, [numericValue, formatValue])

  // Build validation rules
  const validationRules = useMemo(() => {
    const rules: Record<string, unknown> = {
      valueAsNumber: true,
    }

    if (required) {
      rules.required = 'This field is required'
    }

    rules.min = {
      value: min,
      message: `Minimum value is ${min}`,
    }

    rules.max = {
      value: max,
      message: `Maximum value is ${max}`,
    }

    return rules
  }, [required, min, max])

  // Build aria-describedby
  const describedByIds = useMemo(() => {
    const ids: string[] = []
    if (ariaDescribedBy) ids.push(ariaDescribedBy)
    if (description) ids.push(descriptionId)
    if (error) ids.push(errorId)
    return ids.length > 0 ? ids.join(' ') : undefined
  }, [ariaDescribedBy, description, error, descriptionId, errorId])

  // Handle keyboard increment/decrement
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (disabled || !setValue) return

      let newValue = numericValue

      switch (e.key) {
        case 'ArrowRight':
        case 'ArrowUp':
          newValue = Math.min(numericValue + step, max)
          break
        case 'ArrowLeft':
        case 'ArrowDown':
          newValue = Math.max(numericValue - step, min)
          break
        case 'Home':
          newValue = min
          break
        case 'End':
          newValue = max
          break
        case 'PageUp':
          newValue = Math.min(numericValue + step * 10, max)
          break
        case 'PageDown':
          newValue = Math.max(numericValue - step * 10, min)
          break
        default:
          return
      }

      if (newValue !== numericValue) {
        setValue(name, newValue as any, { shouldValidate: true })
      }
    },
    [disabled, setValue, numericValue, step, min, max, name]
  )

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
        <div className="field-label-row">
          <label htmlFor={fieldId} className="field-label">
            {label}
            {required && (
              <span className="field-label-required" aria-label="required">
                *
              </span>
            )}
          </label>
          {showValue && <span className="field-slider-value">{displayValue}</span>}
        </div>
      )}

      {description && (
        <p id={descriptionId} className="field-description">
          {description}
        </p>
      )}

      <div className={wrapperClasses}>
        <div className="field-slider-container">
          <input
            id={fieldId}
            type="range"
            className="field-slider"
            min={min}
            max={max}
            step={step}
            disabled={disabled}
            aria-label={ariaLabel || label}
            aria-required={required}
            aria-invalid={!!error}
            aria-describedby={describedByIds}
            aria-valuemin={min}
            aria-valuemax={max}
            aria-valuenow={numericValue}
            aria-valuetext={displayValue}
            data-testid={testId ? `${testId}-input` : undefined}
            onKeyDown={handleKeyDown}
            {...register(name, validationRules)}
          />

          {(minLabel || maxLabel) && (
            <div className="field-slider-labels">
              <span className="field-slider-label">{minLabel}</span>
              <span className="field-slider-label">{maxLabel}</span>
            </div>
          )}
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

export default SliderField
