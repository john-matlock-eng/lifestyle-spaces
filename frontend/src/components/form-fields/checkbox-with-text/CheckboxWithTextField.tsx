/**
 * CheckboxWithTextField Component
 *
 * Checkbox with conditional text input that appears when checked.
 * Returns { checked: boolean, text?: string }
 *
 * @module form-fields/checkbox-with-text/CheckboxWithTextField
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
import { useId, useMemo, useCallback, useEffect } from 'react'
import type { FieldValues } from 'react-hook-form'
import type { CheckboxWithTextFieldProps, CheckboxWithTextValue } from '../types'
import { Check } from 'lucide-react'
import '../form-fields.css'

/**
 * CheckboxWithTextField - Checkbox with conditional text input
 *
 * @example
 * ```tsx
 * <CheckboxWithTextField
 *   id="other"
 *   name="other"
 *   label="Other Option"
 *   checkboxLabel="I have additional notes"
 *   textPlaceholder="Enter your notes..."
 *   register={register}
 *   watch={watch}
 *   setValue={setValue}
 * />
 * ```
 */
export function CheckboxWithTextField<TFieldValues extends FieldValues = FieldValues>({
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
  checkboxLabel,
  textPlaceholder = 'Enter details...',
  textHint,
  textMaxLength = 200,
  textRequired = false,
  defaultValue = { checked: false, text: '' },
}: CheckboxWithTextFieldProps<TFieldValues>): JSX.Element {
  const generatedId = useId()
  const fieldId = id || generatedId
  const errorId = `${fieldId}-error`
  const descriptionId = `${fieldId}-description`

  // Watch the current value
  const currentValue: CheckboxWithTextValue = watch
    ? watch(name) ?? defaultValue
    : defaultValue

  // Initialize value on mount
  useEffect(() => {
    if (setValue && !watch?.(name)) {
      setValue(name, defaultValue as any, { shouldValidate: false })
    }
  }, [setValue, name, defaultValue, watch])

  // Toggle checkbox
  const toggleChecked = useCallback(() => {
    if (disabled || !setValue) return
    setValue(
      name,
      { ...currentValue, checked: !currentValue.checked } as any,
      { shouldValidate: true }
    )
  }, [disabled, setValue, name, currentValue])

  // Update text
  const updateText = useCallback(
    (newText: string) => {
      if (disabled || !setValue) return
      setValue(
        name,
        { ...currentValue, text: newText } as any,
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
      textRequiredWhenChecked: (value: CheckboxWithTextValue) => {
        if (!value) return true
        if (textRequired && value.checked && !value.text?.trim()) {
          return 'Text is required when checked'
        }
        return true
      },
    },
  })

  // Wrapper classes
  const textWrapperClasses = [
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

      <div
        className="field-checkbox-text-container"
        role="group"
        aria-label={ariaLabel || label || 'Checkbox with text'}
        aria-describedby={describedByIds}
      >
        {/* Checkbox Section */}
        <label className="field-checkbox-text-checkbox">
          <input
            id={`${fieldId}-checkbox`}
            type="checkbox"
            className="field-checkbox-input-hidden"
            checked={currentValue.checked}
            onChange={toggleChecked}
            disabled={disabled}
            aria-invalid={!!error}
            data-testid={testId ? `${testId}-checkbox` : undefined}
          />
          <span
            className={`field-checkbox-box ${currentValue.checked ? 'field-checkbox-box--checked' : ''}`}
            aria-hidden="true"
          >
            {currentValue.checked && <Check size={14} />}
          </span>
          <span className="field-checkbox-label">{checkboxLabel}</span>
        </label>

        {/* Conditional Text Input */}
        {currentValue.checked && (
          <div className="field-checkbox-text-input-container">
            <div className={textWrapperClasses}>
              <input
                id={`${fieldId}-text`}
                type="text"
                className="field-text-input field-checkbox-text-input"
                value={currentValue.text || ''}
                onChange={(e) => updateText(e.target.value)}
                placeholder={textPlaceholder}
                maxLength={textMaxLength}
                disabled={disabled}
                aria-label="Additional text"
                aria-invalid={!!error}
                aria-required={textRequired}
                data-testid={testId ? `${testId}-text` : undefined}
              />
            </div>
            {textHint && (
              <p className="field-description field-checkbox-text-hint">
                {textHint}
              </p>
            )}
            {textMaxLength && currentValue.text && (
              <div className="field-char-count">
                {currentValue.text.length} / {textMaxLength}
              </div>
            )}
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

export default CheckboxWithTextField
