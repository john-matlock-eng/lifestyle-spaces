/**
 * RepeatableInlineField Component
 *
 * Inline item repeater for simpler, compact forms.
 * Items displayed in row or compact format with fewer fields per item.
 *
 * @module form-fields/repeatable/RepeatableInlineField
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
import { useId, useMemo, useCallback, useEffect, useState } from 'react'
import type { FieldValues } from 'react-hook-form'
import type {
  RepeatableInlineFieldProps,
  RepeatableInlineValue,
  RepeatableItem,
} from '../types'
import { renderField } from '../registry'
import {
  generateItemId,
  reorderItems,
  validateItemCount,
  removeItemAt,
} from './utils'
import { Plus, X, GripVertical } from 'lucide-react'
import '../form-fields.css'

/**
 * RepeatableInlineField - Inline item repeater
 *
 * @example
 * ```tsx
 * <RepeatableInlineField
 *   id="trapFix"
 *   name="trapFix"
 *   label="Trap & Fix Pairs"
 *   layout="row"
 *   fields={[
 *     { key: 'trap', type: 'text', placeholder: 'When I...', required: true },
 *     { key: 'fix', type: 'text', placeholder: 'I will instead...' },
 *   ]}
 *   minItems={1}
 *   maxItems={10}
 *   register={register}
 *   watch={watch}
 *   setValue={setValue}
 * />
 * ```
 */
export function RepeatableInlineField<TFieldValues extends FieldValues = FieldValues>({
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
  fields,
  minItems = 0,
  maxItems = 20,
  reorderable = false,
  layout = 'row',
  addButtonLabel = 'Add',
  defaultValue = { items: [] },
}: RepeatableInlineFieldProps<TFieldValues>): JSX.Element {
  const generatedId = useId()
  const fieldId = id || generatedId
  const errorId = `${fieldId}-error`
  const descriptionId = `${fieldId}-description`
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)

  // Watch the current value
  const currentValue: RepeatableInlineValue = watch
    ? watch(name) ?? defaultValue
    : defaultValue

  // Ensure items have IDs
  const items = useMemo(() => {
    return currentValue.items.map((item) => ({
      ...item,
      _id: item._id || generateItemId(),
    }))
  }, [currentValue.items])

  // Create an empty item with default field values
  const createEmptyItem = useCallback((): RepeatableItem => {
    const item: RepeatableItem = { _id: generateItemId() }
    fields.forEach((field) => {
      if (field.defaultValue !== undefined) {
        item[field.key] = field.defaultValue
      }
    })
    return item
  }, [fields])

  // Initialize value on mount
  useEffect(() => {
    if (setValue && !watch?.(name)) {
      const initialItems = defaultValue.items.length > 0
        ? defaultValue.items.map((item) => ({
            ...item,
            _id: item._id || generateItemId(),
          }))
        : minItems > 0
        ? Array.from({ length: minItems }, () => createEmptyItem())
        : []

      setValue(name, { items: initialItems } as any, { shouldValidate: false })
    }
  }, [setValue, name, defaultValue, watch, minItems, createEmptyItem])

  // Update items
  const updateItems = useCallback(
    (newItems: RepeatableItem[]) => {
      if (disabled || !setValue) return
      setValue(name, { items: newItems } as any, { shouldValidate: true })
    },
    [disabled, setValue, name]
  )

  // Add item
  const addItem = useCallback(() => {
    const validation = validateItemCount(items.length, minItems, maxItems)
    if (!validation.canAdd || disabled) return

    const newItem = createEmptyItem()
    updateItems([...items, newItem])
  }, [items, minItems, maxItems, disabled, createEmptyItem, updateItems])

  // Remove item
  const removeItem = useCallback(
    (index: number) => {
      const validation = validateItemCount(items.length, minItems, maxItems)
      if (!validation.canRemove || disabled) return
      updateItems(removeItemAt(items, index))
    },
    [items, minItems, maxItems, disabled, updateItems]
  )

  // Update item field
  const updateItemField = useCallback(
    (index: number, fieldKey: string, value: unknown) => {
      if (disabled || !setValue) return
      const newItems = items.map((item, i) =>
        i === index ? { ...item, [fieldKey]: value } : item
      )
      updateItems(newItems)
    },
    [items, disabled, setValue, updateItems]
  )

  // Drag handlers
  const handleDragStart = useCallback(
    (index: number) => {
      if (!reorderable || disabled) return
      setDraggedIndex(index)
    },
    [reorderable, disabled]
  )

  const handleDragOver = useCallback(
    (e: React.DragEvent, index: number) => {
      if (!reorderable || disabled || draggedIndex === null) return
      e.preventDefault()
      if (draggedIndex === index) return

      updateItems(reorderItems(items, draggedIndex, index))
      setDraggedIndex(index)
    },
    [reorderable, disabled, draggedIndex, items, updateItems]
  )

  const handleDragEnd = useCallback(() => {
    setDraggedIndex(null)
  }, [])

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
      minItems: (value: RepeatableInlineValue) => {
        if (!value?.items) return true
        if (minItems > 0 && value.items.length < minItems) {
          return `At least ${minItems} item${minItems !== 1 ? 's' : ''} required`
        }
        return true
      },
      maxItems: (value: RepeatableInlineValue) => {
        if (!value?.items) return true
        if (value.items.length > maxItems) {
          return `Maximum ${maxItems} item${maxItems !== 1 ? 's' : ''} allowed`
        }
        return true
      },
    },
  })

  // Validation state
  const validation = validateItemCount(items.length, minItems, maxItems)

  // Container classes
  const containerClasses = [
    'field-container',
    'field-repeatable-inline-container',
    `field-repeatable-inline-container--${layout}`,
    error && 'field-repeatable-inline-container--error',
    disabled && 'field-repeatable-inline-container--disabled',
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

      {/* Items */}
      <div
        className="field-repeatable-inline-items"
        role="group"
        aria-label={ariaLabel || label || 'Repeatable inline items'}
        aria-describedby={describedByIds}
      >
        {items.map((item, index) => (
          <div
            key={item._id}
            className={`field-repeatable-inline-item ${draggedIndex === index ? 'field-repeatable-inline-item--dragging' : ''}`}
            draggable={reorderable && !disabled}
            onDragStart={() => handleDragStart(index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDragEnd={handleDragEnd}
            data-testid={testId ? `${testId}-item-${index}` : undefined}
          >
            {reorderable && (
              <span
                className="field-repeatable-inline-drag-handle"
                aria-hidden="true"
              >
                <GripVertical size={14} />
              </span>
            )}

            <div className="field-repeatable-inline-fields">
              {fields.map((fieldDef) => {
                const fieldValue = item[fieldDef.key]
                const fieldName = `${name}.items.${index}.${fieldDef.key}` as any

                return (
                  <div
                    key={fieldDef.key}
                    className="field-repeatable-inline-field"
                    data-testid={testId ? `${testId}-item-${index}-field-${fieldDef.key}` : undefined}
                  >
                    {renderField(fieldDef.type, {
                      id: `${fieldId}-${index}-${fieldDef.key}`,
                      name: fieldName,
                      label: layout === 'compact' && index === 0 ? fieldDef.label : undefined,
                      placeholder: fieldDef.placeholder || fieldDef.label,
                      required: fieldDef.required,
                      disabled,
                      register,
                      watch,
                      setValue: ((_name: string, value: unknown) => {
                        updateItemField(index, fieldDef.key, value)
                      }) as any,
                      ...fieldDef.props,
                      defaultValue: fieldValue ?? fieldDef.defaultValue,
                    })}
                  </div>
                )
              })}
            </div>

            <button
              type="button"
              className="field-repeatable-inline-remove-btn"
              onClick={() => removeItem(index)}
              disabled={disabled || !validation.canRemove}
              aria-label={`Remove item ${index + 1}`}
              data-testid={testId ? `${testId}-item-${index}-remove` : undefined}
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>

      {/* Add Button */}
      {validation.canAdd && (
        <button
          type="button"
          className="field-repeatable-inline-add-btn"
          onClick={addItem}
          disabled={disabled}
          aria-label={addButtonLabel}
          data-testid={testId ? `${testId}-add-btn` : undefined}
        >
          <Plus size={14} />
          {addButtonLabel}
        </button>
      )}

      {/* Item Count */}
      <div className="field-repeatable-inline-count">
        {items.length} / {maxItems}
      </div>

      {error && (
        <p id={errorId} className="field-error" role="alert">
          {error.message}
        </p>
      )}
    </div>
  )
}

export default RepeatableInlineField
