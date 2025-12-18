/**
 * SignatureField Component
 *
 * Signature-styled text input with cursive font and auto timestamp.
 * Used for commitment/agreement signatures.
 *
 * @module form-fields/signature/SignatureField
 */

import { useId, useMemo, useCallback, useEffect } from 'react'
import type { FieldValues } from 'react-hook-form'
import type { SignatureFieldProps, SignatureValue } from '../types'
import '../form-fields.css'

/**
 * Format timestamp for display
 */
function formatTimestamp(timestamp: string): string {
  if (!timestamp) return ''
  const date = new Date(timestamp)
  if (isNaN(date.getTime())) return ''
  return date.toLocaleString()
}

/**
 * SignatureField - Commitment signature with timestamp
 *
 * @example
 * ```tsx
 * <SignatureField
 *   id="commitment"
 *   name="commitment"
 *   label="Your Commitment"
 *   framingText="I commit to following this plan."
 *   signaturePlaceholder="Type your full name"
 *   register={register}
 *   watch={watch}
 *   setValue={setValue}
 * />
 * ```
 */
export function SignatureField<TFieldValues extends FieldValues = FieldValues>({
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
  framingText = 'I commit to the above.',
  signaturePlaceholder = 'Type your full name to sign',
  signatureMaxLength = 100,
  showTimestamp = true,
  defaultValue = { signature: '', timestamp: '' },
}: SignatureFieldProps<TFieldValues>): JSX.Element {
  const generatedId = useId()
  const fieldId = id || generatedId
  const errorId = `${fieldId}-error`
  const descriptionId = `${fieldId}-description`

  // Watch the current value
  const currentValue: SignatureValue = watch
    ? watch(name) ?? defaultValue
    : defaultValue

  // Initialize value on mount
  useEffect(() => {
    if (setValue && !watch?.(name)) {
      setValue(name, defaultValue as any, { shouldValidate: false })
    }
  }, [setValue, name, defaultValue, watch])

  // Update signature with auto-timestamp
  const updateSignature = useCallback(
    (newSignature: string) => {
      if (disabled || !setValue) return

      // Auto-set timestamp when signature is first entered
      const timestamp = newSignature.trim() && !currentValue.signature.trim()
        ? new Date().toISOString()
        : currentValue.timestamp

      // Clear timestamp if signature is cleared
      const finalTimestamp = newSignature.trim() ? timestamp : ''

      setValue(
        name,
        { signature: newSignature, timestamp: finalTimestamp } as any,
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
  const { ref: _ref, ...registerProps } = register(name, {
    required: required ? 'Signature is required' : false,
    validate: {
      hasSignature: (value: SignatureValue) => {
        if (!value || !required) return true
        if (!value.signature?.trim()) {
          return 'Please sign to continue'
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

  const isSigned = !!currentValue.signature?.trim()

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
        className="field-signature-container"
        role="group"
        aria-label={ariaLabel || label || 'Signature'}
        aria-describedby={describedByIds}
      >
        {/* Framing Text */}
        {framingText && (
          <p className="field-signature-framing">
            {framingText}
          </p>
        )}

        {/* Signature Input */}
        <div className={wrapperClasses}>
          <div className="field-signature-input-container">
            <input
              id={`${fieldId}-signature`}
              type="text"
              className="field-signature-input"
              value={currentValue.signature}
              onChange={(e) => updateSignature(e.target.value)}
              placeholder={signaturePlaceholder}
              maxLength={signatureMaxLength}
              disabled={disabled}
              aria-label="Signature"
              aria-invalid={!!error}
              data-testid={testId ? `${testId}-input` : undefined}
            />
            <div className="field-signature-line" aria-hidden="true" />
          </div>
        </div>

        {/* Timestamp */}
        {showTimestamp && isSigned && currentValue.timestamp && (
          <p
            className="field-signature-timestamp"
            data-testid={testId ? `${testId}-timestamp` : undefined}
          >
            Signed: {formatTimestamp(currentValue.timestamp)}
          </p>
        )}

        {/* Signature Status */}
        {isSigned && (
          <p className="field-signature-status" aria-live="polite">
            Signed by: <span className="field-signature-name">{currentValue.signature}</span>
          </p>
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

export default SignatureField
