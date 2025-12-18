/**
 * ChecklistInputField Component
 *
 * Dynamic list builder for creating checklist items.
 * Supports add/remove items, optional reordering, and min/max enforcement.
 *
 * @module form-fields/checklist-input/ChecklistInputField
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
import { useId, useMemo, useCallback, useEffect, useState, useRef } from 'react'
import type { FieldValues } from 'react-hook-form'
import type { ChecklistInputFieldProps } from '../types'
import { Plus, X, GripVertical } from 'lucide-react'
import '../form-fields.css'

/**
 * ChecklistInputField - Dynamic list builder
 *
 * @example
 * ```tsx
 * <ChecklistInputField
 *   id="tasks"
 *   name="tasks"
 *   label="Daily Tasks"
 *   minItems={1}
 *   maxItems={10}
 *   reorderable
 *   register={register}
 *   watch={watch}
 *   setValue={setValue}
 * />
 * ```
 */
export function ChecklistInputField<TFieldValues extends FieldValues = FieldValues>({
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
  minItems = 0,
  maxItems = 20,
  itemPlaceholder = 'Enter item...',
  itemMaxLength = 100,
  reorderable = false,
  addButtonLabel = 'Add item',
  defaultValue = [],
}: ChecklistInputFieldProps<TFieldValues>): JSX.Element {
  const generatedId = useId()
  const fieldId = id || generatedId
  const errorId = `${fieldId}-error`
  const descriptionId = `${fieldId}-description`
  const [newItemText, setNewItemText] = useState('')
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const newItemInputRef = useRef<HTMLInputElement>(null)

  // Watch the current value
  const currentValue: string[] = watch
    ? watch(name) ?? defaultValue
    : defaultValue

  // Initialize value on mount
  useEffect(() => {
    if (setValue && !watch?.(name)) {
      setValue(name, defaultValue as any, { shouldValidate: false })
    }
  }, [setValue, name, defaultValue, watch])

  // Add item
  const addItem = useCallback(() => {
    if (disabled || !setValue) return
    const trimmedText = newItemText.trim()
    if (!trimmedText) return
    if (currentValue.length >= maxItems) return

    setValue(
      name,
      [...currentValue, trimmedText] as any,
      { shouldValidate: true }
    )
    setNewItemText('')
    newItemInputRef.current?.focus()
  }, [disabled, setValue, name, currentValue, newItemText, maxItems])

  // Remove item
  const removeItem = useCallback(
    (index: number) => {
      if (disabled || !setValue) return
      if (currentValue.length <= minItems) return

      const newItems = currentValue.filter((_, i) => i !== index)
      setValue(name, newItems as any, { shouldValidate: true })
    },
    [disabled, setValue, name, currentValue, minItems]
  )

  // Update item text
  const updateItem = useCallback(
    (index: number, text: string) => {
      if (disabled || !setValue) return
      const newItems = [...currentValue]
      newItems[index] = text
      setValue(name, newItems as any, { shouldValidate: true })
    },
    [disabled, setValue, name, currentValue]
  )

  // Drag handlers for reordering
  const handleDragStart = useCallback((index: number) => {
    if (!reorderable || disabled) return
    setDraggedIndex(index)
  }, [reorderable, disabled])

  const handleDragOver = useCallback((e: React.DragEvent, index: number) => {
    if (!reorderable || disabled || draggedIndex === null) return
    e.preventDefault()
    if (draggedIndex === index) return

    const newItems = [...currentValue]
    const draggedItem = newItems[draggedIndex]
    newItems.splice(draggedIndex, 1)
    newItems.splice(index, 0, draggedItem)
    setDraggedIndex(index)
    setValue?.(name, newItems as any, { shouldValidate: true })
  }, [reorderable, disabled, draggedIndex, currentValue, setValue, name])

  const handleDragEnd = useCallback(() => {
    setDraggedIndex(null)
  }, [])

  // Handle Enter key to add item
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        addItem()
      }
    },
    [addItem]
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
      minItems: (value: string[]) => {
        if (!value) return true
        if (minItems > 0 && value.length < minItems) {
          return `At least ${minItems} item${minItems > 1 ? 's' : ''} required`
        }
        return true
      },
      maxItems: (value: string[]) => {
        if (!value) return true
        if (value.length > maxItems) {
          return `Maximum ${maxItems} items allowed`
        }
        return true
      },
      noEmptyItems: (value: string[]) => {
        if (!value) return true
        if (value.some(item => !item.trim())) {
          return 'Items cannot be empty'
        }
        return true
      },
    },
  })

  // Computed states
  const canAdd = currentValue.length < maxItems
  const canRemove = currentValue.length > minItems

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
        className="field-checklist-container"
        role="group"
        aria-label={ariaLabel || label || 'Checklist'}
        aria-describedby={describedByIds}
      >
        {/* Existing Items */}
        <ul className="field-checklist-items" role="list">
          {currentValue.map((item, index) => (
            <li
              key={index}
              className={`field-checklist-item ${draggedIndex === index ? 'field-checklist-item--dragging' : ''}`}
              draggable={reorderable && !disabled}
              onDragStart={() => handleDragStart(index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragEnd={handleDragEnd}
              data-testid={testId ? `${testId}-item-${index}` : undefined}
            >
              {reorderable && (
                <span
                  className="field-checklist-drag-handle"
                  aria-hidden="true"
                >
                  <GripVertical size={16} />
                </span>
              )}
              <div className={wrapperClasses}>
                <input
                  type="text"
                  className="field-text-input field-checklist-item-input"
                  value={item}
                  onChange={(e) => updateItem(index, e.target.value)}
                  maxLength={itemMaxLength}
                  disabled={disabled}
                  aria-label={`Item ${index + 1}`}
                  aria-invalid={!!error}
                  data-testid={testId ? `${testId}-item-${index}-input` : undefined}
                />
              </div>
              <button
                type="button"
                className="field-checklist-remove-btn"
                onClick={() => removeItem(index)}
                disabled={disabled || !canRemove}
                aria-label={`Remove item ${index + 1}`}
                data-testid={testId ? `${testId}-item-${index}-remove` : undefined}
              >
                <X size={16} />
              </button>
            </li>
          ))}
        </ul>

        {/* Add New Item */}
        {canAdd && (
          <div className="field-checklist-add-section">
            <div className={wrapperClasses}>
              <input
                ref={newItemInputRef}
                type="text"
                className="field-text-input field-checklist-new-input"
                value={newItemText}
                onChange={(e) => setNewItemText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={itemPlaceholder}
                maxLength={itemMaxLength}
                disabled={disabled}
                aria-label="New item"
                data-testid={testId ? `${testId}-new-input` : undefined}
              />
            </div>
            <button
              type="button"
              className="field-checklist-add-btn"
              onClick={addItem}
              disabled={disabled || !newItemText.trim()}
              aria-label={addButtonLabel}
              data-testid={testId ? `${testId}-add-btn` : undefined}
            >
              <Plus size={16} />
              {addButtonLabel}
            </button>
          </div>
        )}

        {/* Item Count */}
        <div className="field-checklist-count">
          {currentValue.length} / {maxItems} items
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

export default ChecklistInputField
