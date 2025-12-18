/**
 * Tests for Repeatable Field Utilities
 */

import { describe, it, expect } from 'vitest'
import {
  generateItemId,
  reorderItems,
  moveItemUp,
  moveItemDown,
  validateItemCount,
  createNewItem,
  removeItemAt,
  insertItemAt,
  updateItemAt,
  getItemTitle,
  hasDuplicateIds,
  ensureUniqueIds,
} from '../utils'

describe('Repeatable Field Utilities', () => {
  describe('generateItemId', () => {
    it('generates a string ID', () => {
      const id = generateItemId()
      expect(typeof id).toBe('string')
    })

    it('generates IDs with item- prefix', () => {
      const id = generateItemId()
      expect(id.startsWith('item-')).toBe(true)
    })

    it('generates unique IDs', () => {
      const ids = new Set<string>()
      for (let i = 0; i < 100; i++) {
        ids.add(generateItemId())
      }
      expect(ids.size).toBe(100)
    })

    it('includes timestamp in ID', () => {
      const before = Date.now()
      const id = generateItemId()
      const after = Date.now()

      const parts = id.split('-')
      const timestamp = parseInt(parts[1])
      expect(timestamp).toBeGreaterThanOrEqual(before)
      expect(timestamp).toBeLessThanOrEqual(after)
    })
  })

  describe('reorderItems', () => {
    const items = ['a', 'b', 'c', 'd', 'e']

    it('moves item forward in array', () => {
      const result = reorderItems(items, 0, 3)
      expect(result).toEqual(['b', 'c', 'd', 'a', 'e'])
    })

    it('moves item backward in array', () => {
      const result = reorderItems(items, 3, 0)
      expect(result).toEqual(['d', 'a', 'b', 'c', 'e'])
    })

    it('returns same array when fromIndex equals toIndex', () => {
      const result = reorderItems(items, 2, 2)
      expect(result).toBe(items)
    })

    it('returns same array when fromIndex is out of bounds (negative)', () => {
      const result = reorderItems(items, -1, 2)
      expect(result).toBe(items)
    })

    it('returns same array when fromIndex is out of bounds (too large)', () => {
      const result = reorderItems(items, 10, 2)
      expect(result).toBe(items)
    })

    it('returns same array when toIndex is out of bounds (negative)', () => {
      const result = reorderItems(items, 2, -1)
      expect(result).toBe(items)
    })

    it('returns same array when toIndex is out of bounds (too large)', () => {
      const result = reorderItems(items, 2, 10)
      expect(result).toBe(items)
    })

    it('does not mutate original array', () => {
      const original = ['a', 'b', 'c']
      reorderItems(original, 0, 2)
      expect(original).toEqual(['a', 'b', 'c'])
    })

    it('works with object arrays', () => {
      const objItems = [{ id: 1 }, { id: 2 }, { id: 3 }]
      const result = reorderItems(objItems, 0, 2)
      expect(result).toEqual([{ id: 2 }, { id: 3 }, { id: 1 }])
    })
  })

  describe('moveItemUp', () => {
    const items = ['a', 'b', 'c', 'd']

    it('moves item up by one position', () => {
      const result = moveItemUp(items, 2)
      expect(result).toEqual(['a', 'c', 'b', 'd'])
    })

    it('returns same array when item is already at top', () => {
      const result = moveItemUp(items, 0)
      expect(result).toBe(items)
    })

    it('returns same array for negative index', () => {
      const result = moveItemUp(items, -1)
      expect(result).toBe(items)
    })
  })

  describe('moveItemDown', () => {
    const items = ['a', 'b', 'c', 'd']

    it('moves item down by one position', () => {
      const result = moveItemDown(items, 1)
      expect(result).toEqual(['a', 'c', 'b', 'd'])
    })

    it('returns same array when item is already at bottom', () => {
      const result = moveItemDown(items, 3)
      expect(result).toBe(items)
    })

    it('returns same array for index at length', () => {
      const result = moveItemDown(items, 4)
      expect(result).toBe(items)
    })
  })

  describe('validateItemCount', () => {
    it('returns valid when count is within bounds', () => {
      const result = validateItemCount(5, 1, 10)
      expect(result).toEqual({
        valid: true,
        canAdd: true,
        canRemove: true,
      })
    })

    it('returns invalid when count is below minimum', () => {
      const result = validateItemCount(0, 1, 10)
      expect(result).toEqual({
        valid: false,
        message: 'At least 1 item required',
        canAdd: true,
        canRemove: false,
      })
    })

    it('returns invalid when count is above maximum', () => {
      const result = validateItemCount(11, 1, 10)
      expect(result).toEqual({
        valid: false,
        message: 'Maximum 10 items allowed',
        canAdd: false,
        canRemove: true,
      })
    })

    it('handles singular form for min = 1', () => {
      const result = validateItemCount(0, 1, 10)
      expect(result.message).toBe('At least 1 item required')
    })

    it('handles plural form for min > 1', () => {
      const result = validateItemCount(1, 2, 10)
      expect(result.message).toBe('At least 2 items required')
    })

    it('handles singular form for max = 1', () => {
      const result = validateItemCount(2, 0, 1)
      expect(result.message).toBe('Maximum 1 item allowed')
    })

    it('handles plural form for max > 1', () => {
      const result = validateItemCount(6, 0, 5)
      expect(result.message).toBe('Maximum 5 items allowed')
    })

    it('canAdd is false when at max', () => {
      const result = validateItemCount(10, 1, 10)
      expect(result.canAdd).toBe(false)
    })

    it('canRemove is false when at min', () => {
      const result = validateItemCount(1, 1, 10)
      expect(result.canRemove).toBe(false)
    })

    it('uses default min of 0', () => {
      const result = validateItemCount(0)
      expect(result.valid).toBe(true)
      expect(result.canRemove).toBe(false)
    })

    it('uses default max of Infinity', () => {
      const result = validateItemCount(1000000)
      expect(result.valid).toBe(true)
      expect(result.canAdd).toBe(true)
    })
  })

  describe('createNewItem', () => {
    it('creates item with _id field by default', () => {
      const item = createNewItem({ name: 'test' })
      expect(item._id).toBeDefined()
      expect(typeof item._id).toBe('string')
      expect(item.name).toBe('test')
    })

    it('uses custom id field name', () => {
      const item = createNewItem({ name: 'test' }, 'customId')
      expect(item.customId).toBeDefined()
      expect(typeof item.customId).toBe('string')
    })

    it('preserves all default values', () => {
      const item = createNewItem({
        name: 'test',
        count: 5,
        active: true,
        nested: { a: 1 },
      })
      expect(item.name).toBe('test')
      expect(item.count).toBe(5)
      expect(item.active).toBe(true)
      expect(item.nested).toEqual({ a: 1 })
    })
  })

  describe('removeItemAt', () => {
    const items = ['a', 'b', 'c', 'd']

    it('removes item at specified index', () => {
      const result = removeItemAt(items, 1)
      expect(result).toEqual(['a', 'c', 'd'])
    })

    it('removes first item', () => {
      const result = removeItemAt(items, 0)
      expect(result).toEqual(['b', 'c', 'd'])
    })

    it('removes last item', () => {
      const result = removeItemAt(items, 3)
      expect(result).toEqual(['a', 'b', 'c'])
    })

    it('returns same array for negative index', () => {
      const result = removeItemAt(items, -1)
      expect(result).toBe(items)
    })

    it('returns same array for index out of bounds', () => {
      const result = removeItemAt(items, 10)
      expect(result).toBe(items)
    })

    it('does not mutate original array', () => {
      const original = ['a', 'b', 'c']
      removeItemAt(original, 1)
      expect(original).toEqual(['a', 'b', 'c'])
    })
  })

  describe('insertItemAt', () => {
    const items = ['a', 'b', 'c']

    it('inserts item at specified index', () => {
      const result = insertItemAt(items, 1, 'x')
      expect(result).toEqual(['a', 'x', 'b', 'c'])
    })

    it('inserts at beginning when index is 0', () => {
      const result = insertItemAt(items, 0, 'x')
      expect(result).toEqual(['x', 'a', 'b', 'c'])
    })

    it('inserts at end when index equals length', () => {
      const result = insertItemAt(items, 3, 'x')
      expect(result).toEqual(['a', 'b', 'c', 'x'])
    })

    it('clamps negative index to 0', () => {
      const result = insertItemAt(items, -5, 'x')
      expect(result).toEqual(['x', 'a', 'b', 'c'])
    })

    it('clamps index above length to length', () => {
      const result = insertItemAt(items, 100, 'x')
      expect(result).toEqual(['a', 'b', 'c', 'x'])
    })

    it('does not mutate original array', () => {
      const original = ['a', 'b', 'c']
      insertItemAt(original, 1, 'x')
      expect(original).toEqual(['a', 'b', 'c'])
    })
  })

  describe('updateItemAt', () => {
    const items = [
      { id: 1, name: 'a', value: 10 },
      { id: 2, name: 'b', value: 20 },
      { id: 3, name: 'c', value: 30 },
    ]

    it('updates item at specified index', () => {
      const result = updateItemAt(items, 1, { name: 'updated' })
      expect(result[1]).toEqual({ id: 2, name: 'updated', value: 20 })
    })

    it('preserves other items', () => {
      const result = updateItemAt(items, 1, { name: 'updated' })
      expect(result[0]).toEqual(items[0])
      expect(result[2]).toEqual(items[2])
    })

    it('can update multiple fields', () => {
      const result = updateItemAt(items, 0, { name: 'new', value: 100 })
      expect(result[0]).toEqual({ id: 1, name: 'new', value: 100 })
    })

    it('returns same array for negative index', () => {
      const result = updateItemAt(items, -1, { name: 'x' })
      expect(result).toBe(items)
    })

    it('returns same array for index out of bounds', () => {
      const result = updateItemAt(items, 10, { name: 'x' })
      expect(result).toBe(items)
    })

    it('does not mutate original array', () => {
      const original = [{ id: 1, name: 'a' }]
      updateItemAt(original, 0, { name: 'b' })
      expect(original[0].name).toBe('a')
    })
  })

  describe('getItemTitle', () => {
    it('replaces {{index}} with 1-based index', () => {
      expect(getItemTitle('Item {{index}}', 0)).toBe('Item 1')
      expect(getItemTitle('Item {{index}}', 4)).toBe('Item 5')
    })

    it('replaces multiple occurrences', () => {
      expect(getItemTitle('{{index}}: Item {{index}}', 2)).toBe('3: Item 3')
    })

    it('returns original string when no placeholder', () => {
      expect(getItemTitle('Static Title', 5)).toBe('Static Title')
    })

    it('handles empty string', () => {
      expect(getItemTitle('', 0)).toBe('')
    })
  })

  describe('hasDuplicateIds', () => {
    it('returns false when all IDs are unique', () => {
      const items = [{ _id: '1' }, { _id: '2' }, { _id: '3' }]
      expect(hasDuplicateIds(items)).toBe(false)
    })

    it('returns true when duplicate IDs exist', () => {
      const items = [{ _id: '1' }, { _id: '2' }, { _id: '1' }]
      expect(hasDuplicateIds(items)).toBe(true)
    })

    it('ignores items without _id', () => {
      const items = [{}, { _id: '1' }, {}]
      expect(hasDuplicateIds(items)).toBe(false)
    })

    it('returns false for empty array', () => {
      expect(hasDuplicateIds([])).toBe(false)
    })

    it('returns false when all items lack _id', () => {
      const items = [{}, {}, {}]
      expect(hasDuplicateIds(items)).toBe(false)
    })
  })

  describe('ensureUniqueIds', () => {
    it('adds IDs to items without _id', () => {
      const items = [{ name: 'a' }, { name: 'b' }]
      const result = ensureUniqueIds(items)
      expect(result[0]._id).toBeDefined()
      expect(result[1]._id).toBeDefined()
      expect(result[0]._id).not.toBe(result[1]._id)
    })

    it('preserves existing unique IDs', () => {
      const items = [{ _id: 'existing-1', name: 'a' }]
      const result = ensureUniqueIds(items)
      expect(result[0]._id).toBe('existing-1')
    })

    it('replaces duplicate IDs', () => {
      const items = [
        { _id: 'dup', name: 'a' },
        { _id: 'dup', name: 'b' },
      ]
      const result = ensureUniqueIds(items)
      expect(result[0]._id).toBe('dup')
      expect(result[1]._id).not.toBe('dup')
    })

    it('uses custom id field', () => {
      const items = [{ customId: 'existing' }, { name: 'b' }]
      const result = ensureUniqueIds(items, 'customId')
      expect(result[0].customId).toBe('existing')
      expect(result[1].customId).toBeDefined()
    })

    it('does not mutate original array', () => {
      const original = [{ name: 'a' }]
      ensureUniqueIds(original)
      expect(original[0]._id).toBeUndefined()
    })

    it('handles empty array', () => {
      const result = ensureUniqueIds([])
      expect(result).toEqual([])
    })
  })
})
