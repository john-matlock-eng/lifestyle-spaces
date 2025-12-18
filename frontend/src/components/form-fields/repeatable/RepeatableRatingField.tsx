/**
 * RepeatableRatingField Component
 *
 * Specialized repeater for rating lists with pre-populated items.
 * Each item has a static prompt + rating slider + evidence textarea.
 *
 * @module form-fields/repeatable/RepeatableRatingField
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
import { useId, useMemo, useCallback, useEffect, useRef } from 'react'
import type { FieldValues } from 'react-hook-form'
import type {
  RepeatableRatingFieldProps,
  RepeatableRatingValue,
  RatingItem,
} from '../types'
import { generateItemId } from './utils'
import '../form-fields.css'

/**
 * RepeatableRatingField - Specialized rating list
 *
 * @example
 * ```tsx
 * <RepeatableRatingField
 *   id="valueRatings"
 *   name="valueRatings"
 *   label="Value Alignment"
 *   ratingItems={[
 *     { key: 'integrity', prompt: 'I acted with integrity' },
 *     { key: 'excellence', prompt: 'I pursued excellence' },
 *     { key: 'teamwork', prompt: 'I collaborated effectively' },
 *   ]}
 *   min={1}
 *   max={10}
 *   showEvidence
 *   evidencePrompt="What specific actions support this rating?"
 *   register={register}
 *   watch={watch}
 *   setValue={setValue}
 * />
 * ```
 */
export function RepeatableRatingField<TFieldValues extends FieldValues = FieldValues>({
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
  ratingItems,
  min = 1,
  max = 10,
  step = 1,
  minLabel,
  maxLabel,
  evidencePrompt = 'Evidence or examples:',
  evidencePlaceholder = 'Describe specific examples...',
  evidenceMaxLength = 300,
  showEvidence = true,
  defaultValue,
}: RepeatableRatingFieldProps<TFieldValues>) {
  const generatedId = useId()
  const fieldId = id || generatedId
  const errorId = `${fieldId}-error`
  const descriptionId = `${fieldId}-description`
  const textareaRefs = useRef<Map<string, HTMLTextAreaElement>>(new Map())

  // Create default value from rating items
  const computedDefaultValue = useMemo((): RepeatableRatingValue => {
    if (defaultValue?.items) return defaultValue

    return {
      items: ratingItems.map((item) => ({
        _id: generateItemId(),
        prompt: item.prompt,
        rating: item.defaultRating ?? Math.ceil((min + max) / 2),
        evidence: item.defaultEvidence ?? '',
      })),
    }
  }, [defaultValue, ratingItems, min, max])

  // Watch the current value
  const currentValue: RepeatableRatingValue = watch
    ? watch(name) ?? computedDefaultValue
    : computedDefaultValue

  // Ensure items match rating items (for pre-populated lists)
  const items = useMemo((): RatingItem[] => {
    // If we have existing items, merge with rating item definitions
    if (currentValue.items.length > 0) {
      return ratingItems.map((ratingItem, index) => {
        const existingItem = currentValue.items.find(
          (item) => item.prompt === ratingItem.prompt
        ) || currentValue.items[index]

        return {
          _id: existingItem?._id || generateItemId(),
          prompt: ratingItem.prompt,
          rating: existingItem?.rating ?? ratingItem.defaultRating ?? Math.ceil((min + max) / 2),
          evidence: existingItem?.evidence ?? ratingItem.defaultEvidence ?? '',
        }
      })
    }

    // Create new items from rating items
    return ratingItems.map((item) => ({
      _id: generateItemId(),
      prompt: item.prompt,
      rating: item.defaultRating ?? Math.ceil((min + max) / 2),
      evidence: item.defaultEvidence ?? '',
    }))
  }, [currentValue.items, ratingItems, min, max])

  // Initialize value on mount
  useEffect(() => {
    if (setValue && !watch?.(name)) {
      setValue(name, computedDefaultValue as any, { shouldValidate: false })
    }
  }, [setValue, name, computedDefaultValue, watch])

  // Update rating for an item
  const updateRating = useCallback(
    (index: number, rating: number) => {
      if (disabled || !setValue) return
      const clampedRating = Math.max(min, Math.min(rating, max))
      const newItems = items.map((item, i) =>
        i === index ? { ...item, rating: clampedRating } : item
      )
      setValue(name, { items: newItems } as any, { shouldValidate: true })
    },
    [disabled, setValue, name, items, min, max]
  )

  // Update evidence for an item
  const updateEvidence = useCallback(
    (index: number, evidence: string) => {
      if (disabled || !setValue) return
      const newItems = items.map((item, i) =>
        i === index ? { ...item, evidence } : item
      )
      setValue(name, { items: newItems } as any, { shouldValidate: true })
    },
    [disabled, setValue, name, items]
  )

  // Auto-resize textarea
  const handleTextareaChange = useCallback(
    (index: number, key: string, value: string) => {
      updateEvidence(index, value)
      const textarea = textareaRefs.current.get(key)
      if (textarea) {
        textarea.style.height = 'auto'
        textarea.style.height = `${textarea.scrollHeight}px`
      }
    },
    [updateEvidence]
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
  })

  // Container classes
  const containerClasses = [
    'field-container',
    'field-repeatable-rating-container',
    error && 'field-repeatable-rating-container--error',
    disabled && 'field-repeatable-rating-container--disabled',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={containerClasses} data-testid={testId}>
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

      {/* Rating Items */}
      <div
        className="field-repeatable-rating-items"
        role="group"
        aria-label={ariaLabel || label || 'Rating items'}
        aria-describedby={describedByIds}
      >
        {items.map((item, index) => {
          const fillPercentage = ((item.rating - min) / (max - min)) * 100
          const itemKey = ratingItems[index]?.key || `item-${index}`

          return (
            <div
              key={item._id}
              className="field-repeatable-rating-item"
              data-testid={testId ? `${testId}-item-${index}` : undefined}
            >
              {/* Prompt */}
              <div className="field-repeatable-rating-prompt">
                {item.prompt}
              </div>

              {/* Rating Slider */}
              <div className="field-repeatable-rating-slider-container">
                <div className="field-slider-track-container">
                  <input
                    id={`${fieldId}-${index}-rating`}
                    type="range"
                    className="field-slider-input field-repeatable-rating-slider"
                    value={item.rating}
                    onChange={(e) => updateRating(index, parseInt(e.target.value))}
                    min={min}
                    max={max}
                    step={step}
                    disabled={disabled}
                    aria-label={`Rating for: ${item.prompt}`}
                    aria-valuemin={min}
                    aria-valuemax={max}
                    aria-valuenow={item.rating}
                    aria-invalid={!!error}
                    data-testid={testId ? `${testId}-item-${index}-slider` : undefined}
                    style={
                      {
                        '--slider-fill': `${fillPercentage}%`,
                      } as React.CSSProperties
                    }
                  />
                </div>
                <div className="field-slider-labels">
                  <span className="field-slider-label-min">{minLabel || min}</span>
                  <span className="field-slider-value">{item.rating}</span>
                  <span className="field-slider-label-max">{maxLabel || max}</span>
                </div>
              </div>

              {/* Evidence Textarea */}
              {showEvidence && (
                <div className="field-repeatable-rating-evidence">
                  <label
                    htmlFor={`${fieldId}-${index}-evidence`}
                    className="field-repeatable-rating-evidence-label"
                  >
                    {evidencePrompt}
                  </label>
                  <textarea
                    ref={(el) => {
                      if (el) textareaRefs.current.set(itemKey, el)
                    }}
                    id={`${fieldId}-${index}-evidence`}
                    className="field-textarea-input field-repeatable-rating-evidence-input"
                    value={item.evidence}
                    onChange={(e) => handleTextareaChange(index, itemKey, e.target.value)}
                    placeholder={evidencePlaceholder}
                    maxLength={evidenceMaxLength}
                    disabled={disabled}
                    aria-label={`Evidence for: ${item.prompt}`}
                    aria-invalid={!!error}
                    data-testid={testId ? `${testId}-item-${index}-evidence` : undefined}
                    rows={2}
                  />
                  {evidenceMaxLength && item.evidence && (
                    <div className="field-char-count">
                      {item.evidence.length} / {evidenceMaxLength}
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {error && (
        <p id={errorId} className="field-error" role="alert">
          {error.message}
        </p>
      )}
    </div>
  )
}

export default RepeatableRatingField
