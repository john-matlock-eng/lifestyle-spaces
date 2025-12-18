/**
 * NumberField Component
 *
 * Numeric input field with optional min/max/step constraints.
 * Supports increment/decrement buttons and prefix/suffix display.
 *
 * @module form-fields/number
 */

import { forwardRef, useCallback, useId } from 'react'
import type { FieldValues } from 'react-hook-form'
import type { NumberFieldProps } from '../types'
import '../form-fields.css'

/**
 * NumberField - Numeric input with validation
 *
 * @example
 * ```tsx
 * <NumberField
 *   id="week-number"
 *   name="weekNumber"
 *   label="Week Number"
 *   min={1}
 *   max={13}
 *   step={1}
 *   register={register}
 *   error={errors.weekNumber}
 * />
 * ```
 */
export const NumberField = forwardRef<HTMLInputElement, NumberFieldProps<FieldValues>>(
  function NumberField(
    {
      id,
      name,
      label,
      description,
      placeholder,
      required = false,
      disabled = false,
      readOnly = false,
      error,
      className,
      ariaLabel,
      ariaDescribedBy,
      testId,
      register,
      min,
      max,
      step = 1,
      defaultValue,
      showButtons = false,
      prefix,
      suffix,
    },
    ref
  ) {
    const generatedId = useId()
    const fieldId = id || generatedId
    const descriptionId = `${fieldId}-description`
    const errorId = `${fieldId}-error`

    // Build validation rules
    const validation: Record<string, unknown> = {}
    if (required) {
      validation.required = 'This field is required'
    }
    if (min !== undefined) {
      validation.min = {
        value: min,
        message: `Minimum value is ${min}`,
      }
    }
    if (max !== undefined) {
      validation.max = {
        value: max,
        message: `Maximum value is ${max}`,
      }
    }

    // Handle increment/decrement
    const handleIncrement = useCallback(() => {
      const input = document.getElementById(fieldId) as HTMLInputElement
      if (input && !disabled && !readOnly) {
        const currentValue = parseFloat(input.value) || 0
        const newValue = Math.min(currentValue + step, max ?? Infinity)
        input.value = String(newValue)
        input.dispatchEvent(new Event('input', { bubbles: true }))
      }
    }, [fieldId, disabled, readOnly, step, max])

    const handleDecrement = useCallback(() => {
      const input = document.getElementById(fieldId) as HTMLInputElement
      if (input && !disabled && !readOnly) {
        const currentValue = parseFloat(input.value) || 0
        const newValue = Math.max(currentValue - step, min ?? -Infinity)
        input.value = String(newValue)
        input.dispatchEvent(new Event('input', { bubbles: true }))
      }
    }, [fieldId, disabled, readOnly, step, min])

    // Build aria-describedby
    const describedByIds = [
      description && descriptionId,
      error && errorId,
      ariaDescribedBy,
    ]
      .filter(Boolean)
      .join(' ')

    const containerClasses = [
      'field-container',
      'field-container--number',
      error && 'field-container--error',
      disabled && 'field-container--disabled',
      readOnly && 'field-container--readonly',
      className,
    ]
      .filter(Boolean)
      .join(' ')

    return (
      <div className={containerClasses} data-testid={testId}>
        {/* Label */}
        {label && (
          <label htmlFor={fieldId} className="field-label">
            {label}
            {required && <span className="field-label-required" aria-hidden="true">*</span>}
          </label>
        )}

        {/* Description */}
        {description && (
          <p id={descriptionId} className="field-description">
            {description}
          </p>
        )}

        {/* Input wrapper */}
        <div className={`field-input-wrapper field-input-wrapper--number ${error ? 'field-input-wrapper--error' : ''} ${disabled ? 'field-input-wrapper--disabled' : ''}`}>
          {/* Prefix */}
          {prefix && (
            <span className="field-number-prefix">{prefix}</span>
          )}

          {/* Decrement button */}
          {showButtons && !readOnly && (
            <button
              type="button"
              className="field-number-button field-number-button--decrement"
              onClick={handleDecrement}
              disabled={disabled}
              aria-label="Decrease value"
              tabIndex={-1}
            >
              -
            </button>
          )}

          {/* Input */}
          <input
            id={fieldId}
            type="number"
            className="field-input field-input--number"
            placeholder={placeholder}
            disabled={disabled}
            readOnly={readOnly}
            min={min}
            max={max}
            step={step}
            defaultValue={defaultValue}
            aria-label={ariaLabel || label}
            aria-describedby={describedByIds || undefined}
            aria-invalid={!!error}
            aria-required={required}
            data-testid={testId ? `${testId}-input` : undefined}
            {...register(name, {
              ...validation,
              valueAsNumber: true,
            })}
            ref={ref}
          />

          {/* Increment button */}
          {showButtons && !readOnly && (
            <button
              type="button"
              className="field-number-button field-number-button--increment"
              onClick={handleIncrement}
              disabled={disabled}
              aria-label="Increase value"
              tabIndex={-1}
            >
              +
            </button>
          )}

          {/* Suffix */}
          {suffix && (
            <span className="field-number-suffix">{suffix}</span>
          )}
        </div>

        {/* Range hint */}
        {(min !== undefined || max !== undefined) && !error && (
          <p className="field-hint">
            {min !== undefined && max !== undefined
              ? `Value between ${min} and ${max}`
              : min !== undefined
              ? `Minimum: ${min}`
              : `Maximum: ${max}`}
          </p>
        )}

        {/* Error message */}
        {error && (
          <p id={errorId} className="field-error" role="alert">
            {error.message}
          </p>
        )}
      </div>
    )
  }
)
