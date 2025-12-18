/**
 * RatingWithEvidenceField Component
 *
 * Combines a slider rating with a textarea for evidence/explanation.
 * Features visual connection between rating and evidence.
 *
 * @module form-fields/rating-with-evidence/RatingWithEvidenceField
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
import { useId, useMemo, useCallback, useEffect, useRef } from 'react'
import type { FieldValues } from 'react-hook-form'
import type { RatingWithEvidenceFieldProps, RatingWithEvidenceValue } from '../types'
import '../form-fields.css'

/**
 * RatingWithEvidenceField - Rating slider with evidence textarea
 *
 * @example
 * ```tsx
 * <RatingWithEvidenceField
 *   id="confidence"
 *   name="confidence"
 *   label="Confidence Level"
 *   min={1}
 *   max={10}
 *   evidencePrompt="What evidence supports this rating?"
 *   register={register}
 *   watch={watch}
 *   setValue={setValue}
 * />
 * ```
 */
export function RatingWithEvidenceField<TFieldValues extends FieldValues = FieldValues>({
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
  min = 1,
  max = 10,
  step = 1,
  minLabel,
  maxLabel,
  evidencePrompt = 'What evidence supports this rating?',
  evidencePlaceholder = 'Describe the evidence...',
  evidenceMaxLength = 500,
  defaultValue = { rating: 5, evidence: '' },
}: RatingWithEvidenceFieldProps<TFieldValues>) {
  const generatedId = useId()
  const fieldId = id || generatedId
  const errorId = `${fieldId}-error`
  const descriptionId = `${fieldId}-description`
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Watch the current value
  const currentValue: RatingWithEvidenceValue = watch
    ? watch(name) ?? defaultValue
    : defaultValue

  // Initialize value on mount
  useEffect(() => {
    if (setValue && !watch?.(name)) {
      setValue(name, defaultValue as any, { shouldValidate: false })
    }
  }, [setValue, name, defaultValue, watch])

  // Update rating
  const updateRating = useCallback(
    (newRating: number) => {
      if (disabled || !setValue) return
      const clampedRating = Math.max(min, Math.min(newRating, max))
      setValue(
        name,
        { ...currentValue, rating: clampedRating } as any,
        { shouldValidate: true }
      )
    },
    [disabled, setValue, name, currentValue, min, max]
  )

  // Update evidence
  const updateEvidence = useCallback(
    (newEvidence: string) => {
      if (disabled || !setValue) return
      setValue(
        name,
        { ...currentValue, evidence: newEvidence } as any,
        { shouldValidate: true }
      )
    },
    [disabled, setValue, name, currentValue]
  )

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
    }
  }, [currentValue.evidence])

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
      hasEvidence: (value: RatingWithEvidenceValue) => {
        if (!value) return true
        if (required && !value.evidence?.trim()) {
          return 'Evidence is required'
        }
        return true
      },
    },
  })

  // Calculate fill percentage for slider track
  const fillPercentage = ((currentValue.rating - min) / (max - min)) * 100

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

      <div className="field-rating-evidence-container">
        {/* Rating Slider Section */}
        <div className={wrapperClasses}>
          <div
            className="field-rating-evidence-slider"
            role="group"
            aria-label={ariaLabel || label || 'Rating with evidence'}
            aria-describedby={describedByIds}
          >
            <div className="field-slider-track-container">
              <input
                id={`${fieldId}-slider`}
                type="range"
                className="field-slider-input"
                value={currentValue.rating}
                onChange={(e) => updateRating(parseInt(e.target.value))}
                min={min}
                max={max}
                step={step}
                disabled={disabled}
                aria-label="Rating"
                aria-valuemin={min}
                aria-valuemax={max}
                aria-valuenow={currentValue.rating}
                aria-invalid={!!error}
                data-testid={testId ? `${testId}-slider` : undefined}
                style={
                  {
                    '--slider-fill': `${fillPercentage}%`,
                  } as React.CSSProperties
                }
              />
            </div>
            <div className="field-slider-labels">
              <span className="field-slider-label-min">{minLabel || min}</span>
              <span className="field-slider-value">{currentValue.rating}</span>
              <span className="field-slider-label-max">{maxLabel || max}</span>
            </div>
          </div>
        </div>

        {/* Visual Connector */}
        <div className="field-rating-evidence-connector" aria-hidden="true" />

        {/* Evidence Textarea Section */}
        <div className="field-rating-evidence-textarea-section">
          <label
            htmlFor={`${fieldId}-evidence`}
            className="field-rating-evidence-prompt"
          >
            {evidencePrompt}
          </label>
          <div className={wrapperClasses}>
            <textarea
              ref={textareaRef}
              id={`${fieldId}-evidence`}
              className="field-textarea-input field-rating-evidence-textarea"
              value={currentValue.evidence}
              onChange={(e) => updateEvidence(e.target.value)}
              placeholder={evidencePlaceholder}
              maxLength={evidenceMaxLength}
              disabled={disabled}
              aria-label="Evidence"
              aria-invalid={!!error}
              data-testid={testId ? `${testId}-evidence` : undefined}
              rows={3}
            />
          </div>
          {evidenceMaxLength && (
            <div className="field-char-count">
              {currentValue.evidence.length} / {evidenceMaxLength}
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

export default RatingWithEvidenceField
