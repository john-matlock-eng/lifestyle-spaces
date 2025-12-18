/**
 * YesNoField Component
 *
 * Binary toggle with glassmorphism styling.
 * Features clear Yes/No labels and optional N/A state.
 *
 * @module form-fields/yes-no/YesNoField
 */

import { useId, useMemo, useCallback } from 'react'
import type { FieldValues } from 'react-hook-form'
import type { YesNoFieldProps } from '../types'
import { Check, X, Minus } from 'lucide-react'
import '../form-fields.css'

/**
 * YesNoField - Binary toggle with glassmorphism styling
 *
 * @example
 * ```tsx
 * <YesNoField
 *   id="completed"
 *   name="completed"
 *   label="Task Completed?"
 *   yesLabel="Yes"
 *   noLabel="No"
 *   register={register}
 *   watch={watch}
 *   setValue={setValue}
 * />
 * ```
 */
export function YesNoField<TFieldValues extends FieldValues = FieldValues>({
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
  yesLabel = 'Yes',
  noLabel = 'No',
  allowNA = false,
  naLabel = 'N/A',
  defaultValue,
}: YesNoFieldProps<TFieldValues>): JSX.Element {
  const generatedId = useId()
  const fieldId = id || generatedId
  const errorId = `${fieldId}-error`
  const descriptionId = `${fieldId}-description`

  // Watch the current value
  const currentValue = watch ? watch(name) : defaultValue

  // Build validation rules
  const validationRules = useMemo(() => {
    const rules: Record<string, unknown> = {}
    if (required) {
      rules.validate = (value: boolean | null | undefined) => {
        if (value === undefined || value === null) {
          return 'This field is required'
        }
        return true
      }
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

  // Handle option selection
  const handleSelect = useCallback(
    (value: boolean | null) => {
      if (disabled || !setValue) return
      setValue(name, value as any, { shouldValidate: true })
    },
    [disabled, setValue, name]
  )

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLButtonElement>, value: boolean | null) => {
      if (disabled) return

      switch (e.key) {
        case 'Enter':
        case ' ':
          e.preventDefault()
          handleSelect(value)
          break
        case 'ArrowLeft':
          e.preventDefault()
          if (allowNA) {
            if (currentValue === true) handleSelect(null)
            else if (currentValue === null) handleSelect(false)
          } else {
            if (currentValue === true) handleSelect(false)
          }
          break
        case 'ArrowRight':
          e.preventDefault()
          if (allowNA) {
            if (currentValue === false) handleSelect(null)
            else if (currentValue === null) handleSelect(true)
          } else {
            if (currentValue === false) handleSelect(true)
          }
          break
      }
    },
    [disabled, handleSelect, allowNA, currentValue]
  )

  // Get button class based on selection state
  const getButtonClass = (value: boolean | null) => {
    const isSelected =
      value === currentValue || (value === null && currentValue === null)
    const classes = ['field-yesno-option']

    if (value === true) classes.push('field-yesno-option--yes')
    else if (value === false) classes.push('field-yesno-option--no')
    else classes.push('field-yesno-option--na')

    if (isSelected) classes.push('field-yesno-option--selected')

    return classes.join(' ')
  }

  return (
    <div className={`field-container ${className}`} data-testid={testId}>
      {label && (
        <label id={`${fieldId}-label`} className="field-label">
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

      {/* Hidden input for form integration */}
      <input type="hidden" {...register(name, validationRules)} />

      <div
        className="field-yesno-container"
        role="radiogroup"
        aria-labelledby={label ? `${fieldId}-label` : undefined}
        aria-label={ariaLabel || label}
        aria-required={required}
        aria-invalid={!!error}
        aria-describedby={describedByIds}
      >
        {/* No option */}
        <button
          type="button"
          role="radio"
          className={getButtonClass(false)}
          aria-checked={currentValue === false}
          disabled={disabled}
          onClick={() => handleSelect(false)}
          onKeyDown={(e) => handleKeyDown(e, false)}
          data-testid={testId ? `${testId}-no` : undefined}
        >
          <X size={18} />
          {noLabel}
        </button>

        {/* N/A option (optional) */}
        {allowNA && (
          <button
            type="button"
            role="radio"
            className={getButtonClass(null)}
            aria-checked={currentValue === null}
            disabled={disabled}
            onClick={() => handleSelect(null)}
            onKeyDown={(e) => handleKeyDown(e, null)}
            data-testid={testId ? `${testId}-na` : undefined}
          >
            <Minus size={18} />
            {naLabel}
          </button>
        )}

        {/* Yes option */}
        <button
          type="button"
          role="radio"
          className={getButtonClass(true)}
          aria-checked={currentValue === true}
          disabled={disabled}
          onClick={() => handleSelect(true)}
          onKeyDown={(e) => handleKeyDown(e, true)}
          data-testid={testId ? `${testId}-yes` : undefined}
        >
          <Check size={18} />
          {yesLabel}
        </button>
      </div>

      {error && (
        <p id={errorId} className="field-error" role="alert">
          {error.message}
        </p>
      )}
    </div>
  )
}

export default YesNoField
