/**
 * Repeatable Field Utilities
 *
 * Shared utilities for repeatable field components.
 *
 * @module form-fields/repeatable/utils
 */

/**
 * Validation result for item count
 */
export interface ValidationResult {
  valid: boolean
  message?: string
  canAdd: boolean
  canRemove: boolean
}

/**
 * Generate a unique item ID
 */
export function generateItemId(): string {
  return `item-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
}

/**
 * Reorder items in an array by moving an item from one index to another
 */
export function reorderItems<T>(items: T[], fromIndex: number, toIndex: number): T[] {
  if (fromIndex === toIndex) return items
  if (fromIndex < 0 || fromIndex >= items.length) return items
  if (toIndex < 0 || toIndex >= items.length) return items

  const result = [...items]
  const [removed] = result.splice(fromIndex, 1)
  result.splice(toIndex, 0, removed)
  return result
}

/**
 * Move an item up in the array
 */
export function moveItemUp<T>(items: T[], index: number): T[] {
  if (index <= 0) return items
  return reorderItems(items, index, index - 1)
}

/**
 * Move an item down in the array
 */
export function moveItemDown<T>(items: T[], index: number): T[] {
  if (index >= items.length - 1) return items
  return reorderItems(items, index, index + 1)
}

/**
 * Validate item count against min/max constraints
 */
export function validateItemCount(
  itemCount: number,
  min: number = 0,
  max: number = Infinity
): ValidationResult {
  const canAdd = itemCount < max
  const canRemove = itemCount > min

  if (itemCount < min) {
    return {
      valid: false,
      message: `At least ${min} item${min !== 1 ? 's' : ''} required`,
      canAdd,
      canRemove: false,
    }
  }

  if (itemCount > max) {
    return {
      valid: false,
      message: `Maximum ${max} item${max !== 1 ? 's' : ''} allowed`,
      canAdd: false,
      canRemove,
    }
  }

  return {
    valid: true,
    canAdd,
    canRemove,
  }
}

/**
 * Create a new item with default values
 */
export function createNewItem<T extends Record<string, unknown>>(
  defaultValues: T,
  idField: string = '_id'
): T & { [key: string]: unknown } {
  return {
    ...defaultValues,
    [idField]: generateItemId(),
  }
}

/**
 * Remove an item at a specific index
 */
export function removeItemAt<T>(items: T[], index: number): T[] {
  if (index < 0 || index >= items.length) return items
  return items.filter((_, i) => i !== index)
}

/**
 * Insert an item at a specific index
 */
export function insertItemAt<T>(items: T[], index: number, item: T): T[] {
  const clampedIndex = Math.max(0, Math.min(index, items.length))
  const result = [...items]
  result.splice(clampedIndex, 0, item)
  return result
}

/**
 * Update an item at a specific index
 */
export function updateItemAt<T>(items: T[], index: number, updates: Partial<T>): T[] {
  if (index < 0 || index >= items.length) return items
  return items.map((item, i) => (i === index ? { ...item, ...updates } : item))
}

/**
 * Get item title with index substitution
 */
export function getItemTitle(template: string, index: number): string {
  return template.replace(/\{\{index\}\}/g, String(index + 1))
}

/**
 * Check if items array has duplicate IDs
 */
export function hasDuplicateIds(items: Array<{ _id?: string }>): boolean {
  const ids = items.map((item) => item._id).filter(Boolean)
  return new Set(ids).size !== ids.length
}

/**
 * Ensure all items have unique IDs
 */
export function ensureUniqueIds<T extends Record<string, unknown>>(
  items: T[],
  idField: string = '_id'
): T[] {
  const seenIds = new Set<string>()
  return items.map((item) => {
    const currentId = item[idField] as string | undefined
    if (!currentId || seenIds.has(currentId)) {
      const newId = generateItemId()
      seenIds.add(newId)
      return { ...item, [idField]: newId }
    }
    seenIds.add(currentId)
    return item
  })
}
