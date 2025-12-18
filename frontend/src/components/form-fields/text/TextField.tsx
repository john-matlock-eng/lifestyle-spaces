/**
 * TextField Component
 *
 * Single-line text input with glassmorphism styling.
 * Features maxLength counter, pattern validation, and accessibility.
 *
 * @module form-fields/text/TextField
 */

import { useId, useMemo } from 'react'
import type { FieldValues } from 'react-hook-form'
import type { TextFieldProps } from '../types'
import '../form-fields.css'

/**
 * TextField - Single line text input with glassmorphism styling
 *
 * @example
 * ```tsx
 * <TextField
 *   id="username"
 *   name="username"
 *   label="Username"
 *   placeholder="Enter username"
 *   register={register}
 *   error={errors.username}
 *   maxLength={30}
 *   showCharCount
 *   required
 * />
 * ```
 */
export function TextField<TFieldValues extends FieldValues = FieldValues>({
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
  watch,
  maxLength,
  showCharCount = false,
  pattern,
  patternMessage,
  inputType = 'text',
  autoComplete,
}: TextFieldProps<TFieldValues>) {
  const generatedId = useId()
  const fieldId = id || generatedId
  const errorId = `${fieldId}-error`
  const descriptionId = `${fieldId}-description`

  // Watch the current value for character count
  const currentValue = watch ? watch(name) : ''
  const charCount = typeof currentValue === 'string' ? currentValue.length : 0

  // Build validation rules
  const validationRules = useMemo(() => {
    const rules: Record<string, unknown> = {}

    if (required) {
      rules.required = 'This field is required'
    }

    if (maxLength) {
      rules.maxLength = {
        value: maxLength,
        message: `Maximum ${maxLength} characters`,
      }
    }

    if (pattern) {
      rules.pattern = {
        value: new RegExp(pattern),
        message: patternMessage || 'Invalid format',
      }
    }

    return rules
  }, [required, maxLength, pattern, patternMessage])

  // Build aria-describedby
  const describedByIds = useMemo(() => {
    const ids: string[] = []
    if (ariaDescribedBy) ids.push(ariaDescribedBy)
    if (description) ids.push(descriptionId)
    if (error) ids.push(errorId)
    return ids.length > 0 ? ids.join(' ') : undefined
  }, [ariaDescribedBy, description, error, descriptionId, errorId])

  // Character count status
  const getCharCountClass = () => {
    if (!maxLength) return ''
    const ratio = charCount / maxLength
    if (ratio >= 1) return 'field-char-count--error'
    if (ratio >= 0.9) return 'field-char-count--warning'
    return ''
  }

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
      {(label || (showCharCount && maxLength)) && (
        <div className="field-label-row">
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
          {showCharCount && maxLength && (
            <span
              className={`field-char-count ${getCharCountClass()}`}
              aria-live="polite"
              aria-atomic="true"
            >
              {charCount}/{maxLength}
            </span>
          )}
        </div>
      )}

      {description && (
        <p id={descriptionId} className="field-description">
          {description}
        </p>
      )}

      <div className={wrapperClasses}>
        <input
          id={fieldId}
          type={inputType}
          className="field-input"
          placeholder={placeholder}
          disabled={disabled}
          readOnly={readOnly}
          autoComplete={autoComplete}
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

export default TextField
