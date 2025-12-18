/**
 * RepeatableBlockField Component
 *
 * Full section repeater with collapsible items.
 * Each item is a complete form section with multiple fields.
 *
 * @module form-fields/repeatable/RepeatableBlockField
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
import { useId, useMemo, useCallback, useEffect, useState } from 'react'
import type { FieldValues } from 'react-hook-form'
import type {
  RepeatableBlockFieldProps,
  RepeatableBlockValue,
  RepeatableItem,
} from '../types'
import { renderField } from '../registry'
import {
  generateItemId,
  reorderItems,
  moveItemUp,
  moveItemDown,
  validateItemCount,
  getItemTitle,
  removeItemAt,
} from './utils'
import { Plus, Trash2, ChevronDown, ChevronUp, GripVertical } from 'lucide-react'
import '../form-fields.css'

/**
 * RepeatableBlockField - Full section repeater with collapsible items
 *
 * @example
 * ```tsx
 * <RepeatableBlockField
 *   id="focusAreas"
 *   name="focusAreas"
 *   label="Focus Areas"
 *   itemTitleTemplate="Focus Area {{index}}"
 *   fields={[
 *     { key: 'name', type: 'text', label: 'Area Name', required: true },
 *     { key: 'description', type: 'textarea', label: 'Description' },
 *     { key: 'priority', type: 'slider', label: 'Priority', props: { min: 1, max: 10 } },
 *   ]}
 *   minItems={1}
 *   maxItems={5}
 *   reorderable
 *   register={register}
 *   watch={watch}
 *   setValue={setValue}
 * />
 * ```
 */
export function RepeatableBlockField<TFieldValues extends FieldValues = FieldValues>({
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
  itemTitleTemplate = 'Item {{index}}',
  defaultCollapsed = false,
  addButtonLabel = 'Add Item',
  defaultValue = { items: [] },
}: RepeatableBlockFieldProps<TFieldValues>) {
  const generatedId = useId()
  const fieldId = id || generatedId
  const errorId = `${fieldId}-error`
  const descriptionId = `${fieldId}-description`

  // Track collapsed state for each item
  const [collapsedItems, setCollapsedItems] = useState<Set<string>>(new Set())
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)

  // Watch the current value
  const currentValue: RepeatableBlockValue = watch
    ? watch(name) ?? defaultValue
    : defaultValue

  // Ensure items have IDs
  const items = useMemo(() => {
    return currentValue.items.map((item) => ({
      ...item,
      _id: item._id || generateItemId(),
    }))
  }, [currentValue.items])

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

      // Set initial collapsed state
      if (defaultCollapsed) {
        setCollapsedItems(new Set(initialItems.map((item) => item._id)))
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setValue, name, defaultValue, watch, minItems, defaultCollapsed])

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

      const itemId = items[index]?._id
      if (itemId) {
        setCollapsedItems((prev) => {
          const next = new Set(prev)
          next.delete(itemId)
          return next
        })
      }

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

  // Toggle collapse
  const toggleCollapse = useCallback((itemId: string) => {
    setCollapsedItems((prev) => {
      const next = new Set(prev)
      if (next.has(itemId)) {
        next.delete(itemId)
      } else {
        next.add(itemId)
      }
      return next
    })
  }, [])

  // Move item up
  const handleMoveUp = useCallback(
    (index: number) => {
      if (!reorderable || disabled || index <= 0) return
      updateItems(moveItemUp(items, index))
    },
    [reorderable, disabled, items, updateItems]
  )

  // Move item down
  const handleMoveDown = useCallback(
    (index: number) => {
      if (!reorderable || disabled || index >= items.length - 1) return
      updateItems(moveItemDown(items, index))
    },
    [reorderable, disabled, items, updateItems]
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
      minItems: (value: RepeatableBlockValue) => {
        if (!value?.items) return true
        if (minItems > 0 && value.items.length < minItems) {
          return `At least ${minItems} item${minItems !== 1 ? 's' : ''} required`
        }
        return true
      },
      maxItems: (value: RepeatableBlockValue) => {
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

  // Wrapper classes
  const containerClasses = [
    'field-container',
    'field-repeatable-container',
    error && 'field-repeatable-container--error',
    disabled && 'field-repeatable-container--disabled',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={containerClasses} data-testid={testId}>
      {/* Header */}
      <div className="field-repeatable-header">
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
        {validation.canAdd && (
          <button
            type="button"
            className="field-repeatable-add-btn field-repeatable-add-btn--header"
            onClick={addItem}
            disabled={disabled}
            aria-label={addButtonLabel}
            data-testid={testId ? `${testId}-add-header` : undefined}
          >
            <Plus size={16} />
            {addButtonLabel}
          </button>
        )}
      </div>

      {description && (
        <p id={descriptionId} className="field-description">
          {description}
        </p>
      )}

      {/* Hidden input for form value */}
      <input type="hidden" {...registerProps} value={JSON.stringify(currentValue)} />

      {/* Items */}
      <div
        className="field-repeatable-items"
        role="group"
        aria-label={ariaLabel || label || 'Repeatable items'}
        aria-describedby={describedByIds}
      >
        {items.map((item, index) => {
          const isCollapsed = collapsedItems.has(item._id)
          const itemTitle = getItemTitle(itemTitleTemplate, index)

          return (
            <div
              key={item._id}
              className={`field-repeatable-item ${draggedIndex === index ? 'field-repeatable-item--dragging' : ''}`}
              draggable={reorderable && !disabled}
              onDragStart={() => handleDragStart(index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragEnd={handleDragEnd}
              data-testid={testId ? `${testId}-item-${index}` : undefined}
            >
              {/* Item Header */}
              <div className="field-repeatable-item-header">
                {reorderable && (
                  <span
                    className="field-repeatable-drag-handle"
                    aria-hidden="true"
                  >
                    <GripVertical size={16} />
                  </span>
                )}

                <button
                  type="button"
                  className="field-repeatable-collapse-btn"
                  onClick={() => toggleCollapse(item._id)}
                  aria-expanded={!isCollapsed}
                  aria-label={isCollapsed ? `Expand ${itemTitle}` : `Collapse ${itemTitle}`}
                  data-testid={testId ? `${testId}-item-${index}-toggle` : undefined}
                >
                  {isCollapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
                  <span className="field-repeatable-item-title">{itemTitle}</span>
                </button>

                <div className="field-repeatable-item-actions">
                  {reorderable && (
                    <>
                      <button
                        type="button"
                        className="field-repeatable-reorder-btn"
                        onClick={() => handleMoveUp(index)}
                        disabled={disabled || index === 0}
                        aria-label={`Move ${itemTitle} up`}
                        data-testid={testId ? `${testId}-item-${index}-up` : undefined}
                      >
                        <ChevronUp size={14} />
                      </button>
                      <button
                        type="button"
                        className="field-repeatable-reorder-btn"
                        onClick={() => handleMoveDown(index)}
                        disabled={disabled || index === items.length - 1}
                        aria-label={`Move ${itemTitle} down`}
                        data-testid={testId ? `${testId}-item-${index}-down` : undefined}
                      >
                        <ChevronDown size={14} />
                      </button>
                    </>
                  )}
                  <button
                    type="button"
                    className="field-repeatable-remove-btn"
                    onClick={() => removeItem(index)}
                    disabled={disabled || !validation.canRemove}
                    aria-label={`Remove ${itemTitle}`}
                    data-testid={testId ? `${testId}-item-${index}-remove` : undefined}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              {/* Item Content */}
              {!isCollapsed && (
                <div className="field-repeatable-item-content">
                  {fields.map((fieldDef) => {
                    const fieldValue = (item as Record<string, unknown>)[fieldDef.key]
                    const fieldName = `${name}.items.${index}.${fieldDef.key}` as any

                    return (
                      <div
                        key={fieldDef.key}
                        className="field-repeatable-field"
                        data-testid={testId ? `${testId}-item-${index}-field-${fieldDef.key}` : undefined}
                      >
                        {renderField(fieldDef.type, {
                          id: `${fieldId}-${index}-${fieldDef.key}`,
                          name: fieldName,
                          label: fieldDef.label,
                          description: fieldDef.description,
                          placeholder: fieldDef.placeholder,
                          required: fieldDef.required,
                          disabled,
                          register,
                          watch,
                          setValue: ((_name: string, value: unknown) => {
                            updateItemField(index, fieldDef.key, value)
                          }) as any,
                          ...fieldDef.props,
                          // Pass current value for controlled components
                          defaultValue: fieldValue ?? fieldDef.defaultValue,
                        })}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Add Button (bottom) */}
      {items.length > 0 && validation.canAdd && (
        <button
          type="button"
          className="field-repeatable-add-btn field-repeatable-add-btn--footer"
          onClick={addItem}
          disabled={disabled}
          aria-label={addButtonLabel}
          data-testid={testId ? `${testId}-add-footer` : undefined}
        >
          <Plus size={16} />
          {addButtonLabel}
        </button>
      )}

      {/* Empty State */}
      {items.length === 0 && (
        <div className="field-repeatable-empty">
          <p>No items yet.</p>
          <button
            type="button"
            className="field-repeatable-add-btn"
            onClick={addItem}
            disabled={disabled}
            data-testid={testId ? `${testId}-add-empty` : undefined}
          >
            <Plus size={16} />
            {addButtonLabel}
          </button>
        </div>
      )}

      {/* Item Count */}
      <div className="field-repeatable-count">
        {items.length} / {maxItems} items
        {!validation.valid && validation.message && (
          <span className="field-repeatable-count-warning">
            ({validation.message})
          </span>
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

export default RepeatableBlockField
