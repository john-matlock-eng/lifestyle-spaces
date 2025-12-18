/**
 * TextareaField Component
 *
 * Multi-line text input with glassmorphism styling.
 * Features auto-resize, character count, and hint text support.
 *
 * @module form-fields/textarea/TextareaField
 */

import { useId, useMemo, useRef, useEffect, useCallback } from 'react'
import type { FieldValues } from 'react-hook-form'
import type { TextareaFieldProps } from '../types'
import '../form-fields.css'

/**
 * TextareaField - Multi-line text input with glassmorphism styling
 *
 * @example
 * ```tsx
 * <TextareaField
 *   id="description"
 *   name="description"
 *   label="Description"
 *   placeholder="Enter description..."
 *   register={register}
 *   error={errors.description}
 *   rows={4}
 *   autoResize
 *   maxLength={500}
 *   showCharCount
 * />
 * ```
 */
export function TextareaField<TFieldValues extends FieldValues = FieldValues>({
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
  rows = 3,
  autoResize = false,
  maxHeight,
}: TextareaFieldProps<TFieldValues>) {
  const generatedId = useId()
  const fieldId = id || generatedId
  const errorId = `${fieldId}-error`
  const descriptionId = `${fieldId}-description`
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)

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

    return rules
  }, [required, maxLength])

  // Auto-resize handler
  const handleAutoResize = useCallback(() => {
    if (!autoResize || !textareaRef.current) return

    const textarea = textareaRef.current
    textarea.style.height = 'auto'
    const scrollHeight = textarea.scrollHeight
    const newHeight = maxHeight ? Math.min(scrollHeight, maxHeight) : scrollHeight
    textarea.style.height = `${newHeight}px`
  }, [autoResize, maxHeight])

  // Apply auto-resize on value change
  useEffect(() => {
    handleAutoResize()
  }, [currentValue, handleAutoResize])

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

  // Textarea classes
  const textareaClasses = ['field-textarea', autoResize && 'field-textarea--autoresize']
    .filter(Boolean)
    .join(' ')

  // Merge refs for register and auto-resize
  const { ref: registerRef, ...registerProps } = register(name, validationRules)

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
        <textarea
          id={fieldId}
          className={textareaClasses}
          placeholder={placeholder}
          disabled={disabled}
          readOnly={readOnly}
          rows={rows}
          aria-label={ariaLabel || label}
          aria-required={required}
          aria-invalid={!!error}
          aria-describedby={describedByIds}
          data-testid={testId ? `${testId}-input` : undefined}
          ref={(el) => {
            registerRef(el)
            textareaRef.current = el
          }}
          style={maxHeight ? { maxHeight: `${maxHeight}px` } : undefined}
          {...registerProps}
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

export default TextareaField
