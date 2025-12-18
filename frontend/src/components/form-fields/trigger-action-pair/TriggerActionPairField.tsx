/**
 * TriggerActionPairField Component
 *
 * Two linked text inputs for trigger-action statements.
 * Format: "When [trigger] → Then [action]"
 *
 * @module form-fields/trigger-action-pair/TriggerActionPairField
 */

import { useId, useMemo, useCallback, useEffect } from 'react'
import type { FieldValues } from 'react-hook-form'
import type { TriggerActionPairFieldProps, TriggerActionPairValue } from '../types'
import { ArrowRight } from 'lucide-react'
import '../form-fields.css'

/**
 * TriggerActionPairField - When/then trigger-action combo
 *
 * @example
 * ```tsx
 * <TriggerActionPairField
 *   id="habit"
 *   name="habit"
 *   label="Implementation Intention"
 *   triggerLabel="When"
 *   actionLabel="Then I will"
 *   register={register}
 *   watch={watch}
 *   setValue={setValue}
 * />
 * ```
 */
export function TriggerActionPairField<TFieldValues extends FieldValues = FieldValues>({
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
  triggerLabel = 'When',
  actionLabel = 'Then I will',
  triggerPlaceholder = 'describe the trigger...',
  actionPlaceholder = 'describe the action...',
  triggerMaxLength = 150,
  actionMaxLength = 150,
  defaultValue = { trigger: '', action: '' },
}: TriggerActionPairFieldProps<TFieldValues>): JSX.Element {
  const generatedId = useId()
  const fieldId = id || generatedId
  const errorId = `${fieldId}-error`
  const descriptionId = `${fieldId}-description`

  // Watch the current value
  const currentValue: TriggerActionPairValue = watch
    ? watch(name) ?? defaultValue
    : defaultValue

  // Initialize value on mount
  useEffect(() => {
    if (setValue && !watch?.(name)) {
      setValue(name, defaultValue as any, { shouldValidate: false })
    }
  }, [setValue, name, defaultValue, watch])

  // Update trigger
  const updateTrigger = useCallback(
    (newTrigger: string) => {
      if (disabled || !setValue) return
      setValue(
        name,
        { ...currentValue, trigger: newTrigger } as any,
        { shouldValidate: true }
      )
    },
    [disabled, setValue, name, currentValue]
  )

  // Update action
  const updateAction = useCallback(
    (newAction: string) => {
      if (disabled || !setValue) return
      setValue(
        name,
        { ...currentValue, action: newAction } as any,
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
    required: required ? 'This field is required' : false,
    validate: {
      hasTrigger: (value: TriggerActionPairValue) => {
        if (!value || !required) return true
        if (!value.trigger?.trim()) {
          return 'Trigger is required'
        }
        return true
      },
      hasAction: (value: TriggerActionPairValue) => {
        if (!value || !required) return true
        if (!value.action?.trim()) {
          return 'Action is required'
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
        className="field-trigger-action-container"
        role="group"
        aria-label={ariaLabel || label || 'Trigger and action pair'}
        aria-describedby={describedByIds}
      >
        {/* Trigger Section */}
        <div className="field-trigger-action-section">
          <label
            htmlFor={`${fieldId}-trigger`}
            className="field-trigger-action-label"
          >
            {triggerLabel}
          </label>
          <div className={wrapperClasses}>
            <input
              id={`${fieldId}-trigger`}
              type="text"
              className="field-text-input field-trigger-action-input"
              value={currentValue.trigger}
              onChange={(e) => updateTrigger(e.target.value)}
              placeholder={triggerPlaceholder}
              maxLength={triggerMaxLength}
              disabled={disabled}
              aria-label="Trigger"
              aria-invalid={!!error}
              data-testid={testId ? `${testId}-trigger` : undefined}
            />
          </div>
          {triggerMaxLength && currentValue.trigger && (
            <div className="field-char-count">
              {currentValue.trigger.length} / {triggerMaxLength}
            </div>
          )}
        </div>

        {/* Arrow Connector */}
        <div className="field-trigger-action-arrow" aria-hidden="true">
          <ArrowRight size={24} />
        </div>

        {/* Action Section */}
        <div className="field-trigger-action-section">
          <label
            htmlFor={`${fieldId}-action`}
            className="field-trigger-action-label"
          >
            {actionLabel}
          </label>
          <div className={wrapperClasses}>
            <input
              id={`${fieldId}-action`}
              type="text"
              className="field-text-input field-trigger-action-input"
              value={currentValue.action}
              onChange={(e) => updateAction(e.target.value)}
              placeholder={actionPlaceholder}
              maxLength={actionMaxLength}
              disabled={disabled}
              aria-label="Action"
              aria-invalid={!!error}
              data-testid={testId ? `${testId}-action` : undefined}
            />
          </div>
          {actionMaxLength && currentValue.action && (
            <div className="field-char-count">
              {currentValue.action.length} / {actionMaxLength}
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

export default TriggerActionPairField
