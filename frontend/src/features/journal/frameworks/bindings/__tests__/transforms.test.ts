/**
 * Tests for binding transforms
 */

import { describe, it, expect } from 'vitest'
import {
  BUILT_IN_TRANSFORMS,
  getTransform,
  getTransformDefinition,
  hasTransform,
  applyTransform,
  applyTransforms,
  getTransformNames,
} from '../transforms'

describe('transforms', () => {
  describe('first', () => {
    it('returns first element of array', () => {
      expect(applyTransform('first', ['a', 'b', 'c'])).toBe('a')
    })

    it('returns undefined for empty array', () => {
      expect(applyTransform('first', [])).toBeUndefined()
    })

    it('returns undefined for non-array', () => {
      expect(applyTransform('first', 'string')).toBeUndefined()
    })

    it('handles array with single element', () => {
      expect(applyTransform('first', [42])).toBe(42)
    })
  })

  describe('last', () => {
    it('returns last element of array', () => {
      expect(applyTransform('last', ['a', 'b', 'c'])).toBe('c')
    })

    it('returns undefined for empty array', () => {
      expect(applyTransform('last', [])).toBeUndefined()
    })

    it('returns undefined for non-array', () => {
      expect(applyTransform('last', 'string')).toBeUndefined()
    })

    it('handles array with single element', () => {
      expect(applyTransform('last', [42])).toBe(42)
    })
  })

  describe('count', () => {
    it('returns length of array', () => {
      expect(applyTransform('count', [1, 2, 3])).toBe(3)
    })

    it('returns length of string', () => {
      expect(applyTransform('count', 'hello')).toBe(5)
    })

    it('returns number of object keys', () => {
      expect(applyTransform('count', { a: 1, b: 2 })).toBe(2)
    })

    it('returns 0 for empty array', () => {
      expect(applyTransform('count', [])).toBe(0)
    })

    it('returns 0 for empty string', () => {
      expect(applyTransform('count', '')).toBe(0)
    })

    it('returns 0 for empty object', () => {
      expect(applyTransform('count', {})).toBe(0)
    })

    it('returns 0 for null', () => {
      expect(applyTransform('count', null)).toBe(0)
    })

    it('returns 0 for undefined', () => {
      expect(applyTransform('count', undefined)).toBe(0)
    })

    it('returns 0 for number', () => {
      expect(applyTransform('count', 42)).toBe(0)
    })
  })

  describe('join', () => {
    it('joins array with default separator', () => {
      expect(applyTransform('join', ['a', 'b', 'c'])).toBe('a, b, c')
    })

    it('joins array with custom separator', () => {
      expect(applyTransform('join', ['a', 'b', 'c'], { separator: '-' })).toBe('a-b-c')
    })

    it('filters out null/undefined values', () => {
      expect(applyTransform('join', ['a', null, 'c', undefined, 'e'])).toBe('a, c, e')
    })

    it('returns non-array values unchanged', () => {
      expect(applyTransform('join', 'string')).toBe('string')
    })

    it('handles empty array', () => {
      expect(applyTransform('join', [])).toBe('')
    })

    it('handles array with single element', () => {
      expect(applyTransform('join', ['only'])).toBe('only')
    })
  })

  describe('split', () => {
    it('splits string by default comma separator', () => {
      expect(applyTransform('split', 'a,b,c')).toEqual(['a', 'b', 'c'])
    })

    it('splits string by custom separator', () => {
      expect(applyTransform('split', 'a-b-c', { separator: '-' })).toEqual(['a', 'b', 'c'])
    })

    it('trims whitespace from results', () => {
      expect(applyTransform('split', 'a, b, c')).toEqual(['a', 'b', 'c'])
    })

    it('wraps non-string values in array', () => {
      expect(applyTransform('split', 42)).toEqual([42])
    })

    it('handles empty string', () => {
      expect(applyTransform('split', '')).toEqual([''])
    })
  })

  describe('uppercase', () => {
    it('converts string to uppercase', () => {
      expect(applyTransform('uppercase', 'hello')).toBe('HELLO')
    })

    it('returns non-string unchanged', () => {
      expect(applyTransform('uppercase', 42)).toBe(42)
    })

    it('handles empty string', () => {
      expect(applyTransform('uppercase', '')).toBe('')
    })
  })

  describe('lowercase', () => {
    it('converts string to lowercase', () => {
      expect(applyTransform('lowercase', 'HELLO')).toBe('hello')
    })

    it('returns non-string unchanged', () => {
      expect(applyTransform('lowercase', 42)).toBe(42)
    })

    it('handles empty string', () => {
      expect(applyTransform('lowercase', '')).toBe('')
    })
  })

  describe('trim', () => {
    it('trims whitespace from string', () => {
      expect(applyTransform('trim', '  hello  ')).toBe('hello')
    })

    it('returns non-string unchanged', () => {
      expect(applyTransform('trim', 42)).toBe(42)
    })

    it('handles string with only whitespace', () => {
      expect(applyTransform('trim', '   ')).toBe('')
    })
  })

  describe('slice', () => {
    it('slices array from start', () => {
      expect(applyTransform('slice', [1, 2, 3, 4, 5], { start: 2 })).toEqual([3, 4, 5])
    })

    it('slices array with start and end', () => {
      expect(applyTransform('slice', [1, 2, 3, 4, 5], { start: 1, end: 3 })).toEqual([2, 3])
    })

    it('slices string', () => {
      expect(applyTransform('slice', 'hello', { start: 1, end: 4 })).toBe('ell')
    })

    it('uses default start of 0', () => {
      expect(applyTransform('slice', [1, 2, 3], { end: 2 })).toEqual([1, 2])
    })

    it('returns non-array/string unchanged', () => {
      expect(applyTransform('slice', 42)).toBe(42)
    })
  })

  describe('flatten', () => {
    it('flattens one level by default', () => {
      expect(applyTransform('flatten', [[1, 2], [3, 4]])).toEqual([1, 2, 3, 4])
    })

    it('flattens to specified depth', () => {
      expect(applyTransform('flatten', [[[1, 2]], [[3, 4]]], { depth: 2 })).toEqual([1, 2, 3, 4])
    })

    it('wraps non-array in array', () => {
      expect(applyTransform('flatten', 42)).toEqual([42])
    })

    it('handles already flat array', () => {
      expect(applyTransform('flatten', [1, 2, 3])).toEqual([1, 2, 3])
    })
  })

  describe('unique', () => {
    it('removes duplicate primitives', () => {
      expect(applyTransform('unique', [1, 2, 2, 3, 1])).toEqual([1, 2, 3])
    })

    it('removes duplicate strings', () => {
      expect(applyTransform('unique', ['a', 'b', 'a', 'c'])).toEqual(['a', 'b', 'c'])
    })

    it('removes duplicate objects', () => {
      const result = applyTransform('unique', [
        { id: 1 },
        { id: 2 },
        { id: 1 },
      ])
      expect(result).toEqual([{ id: 1 }, { id: 2 }])
    })

    it('wraps non-array in array', () => {
      expect(applyTransform('unique', 42)).toEqual([42])
    })
  })

  describe('filter', () => {
    it('filters by equals condition', () => {
      const result = applyTransform('filter', [1, 2, 3, 2, 1], { equals: 2 })
      expect(result).toEqual([2, 2])
    })

    it('filters by notEquals condition', () => {
      const result = applyTransform('filter', [1, 2, 3, 2, 1], { notEquals: 2 })
      expect(result).toEqual([1, 3, 1])
    })

    it('filters by field equals', () => {
      const items = [
        { status: 'active' },
        { status: 'inactive' },
        { status: 'active' },
      ]
      const result = applyTransform('filter', items, { field: 'status', equals: 'active' })
      expect(result).toEqual([{ status: 'active' }, { status: 'active' }])
    })

    it('filters by contains', () => {
      const result = applyTransform('filter', ['hello', 'world', 'hello world'], { contains: 'world' })
      expect(result).toEqual(['world', 'hello world'])
    })

    it('filters out null/undefined by default', () => {
      const result = applyTransform('filter', [1, null, 2, undefined, 3])
      expect(result).toEqual([1, 2, 3])
    })

    it('returns non-array unchanged', () => {
      expect(applyTransform('filter', 'string')).toBe('string')
    })
  })

  describe('pluck', () => {
    it('extracts field from objects', () => {
      const items = [
        { name: 'Alice', age: 30 },
        { name: 'Bob', age: 25 },
      ]
      expect(applyTransform('pluck', items, { field: 'name' })).toEqual(['Alice', 'Bob'])
    })

    it('returns undefined for missing fields', () => {
      const items = [{ name: 'Alice' }, { age: 30 }]
      expect(applyTransform('pluck', items, { field: 'name' })).toEqual(['Alice', undefined])
    })

    it('returns value unchanged without field arg', () => {
      const items = [{ name: 'Alice' }]
      expect(applyTransform('pluck', items)).toEqual([{ name: 'Alice' }])
    })

    it('returns non-array unchanged', () => {
      expect(applyTransform('pluck', 'string', { field: 'name' })).toBe('string')
    })

    it('handles non-object items', () => {
      const items = ['a', 'b', 'c']
      const result = applyTransform('pluck', items, { field: 'name' })
      expect(result).toEqual([undefined, undefined, undefined])
    })
  })

  describe('sort', () => {
    it('sorts numbers ascending', () => {
      expect(applyTransform('sort', [3, 1, 2])).toEqual([1, 2, 3])
    })

    it('sorts strings alphabetically', () => {
      expect(applyTransform('sort', ['c', 'a', 'b'])).toEqual(['a', 'b', 'c'])
    })

    it('sorts by field', () => {
      const items = [{ name: 'Charlie' }, { name: 'Alice' }, { name: 'Bob' }]
      const result = applyTransform('sort', items, { field: 'name' })
      expect(result).toEqual([{ name: 'Alice' }, { name: 'Bob' }, { name: 'Charlie' }])
    })

    it('sorts descending', () => {
      expect(applyTransform('sort', [1, 3, 2], { order: 'desc' })).toEqual([3, 2, 1])
    })

    it('does not mutate original array', () => {
      const original = [3, 1, 2]
      applyTransform('sort', original)
      expect(original).toEqual([3, 1, 2])
    })

    it('returns non-array unchanged', () => {
      expect(applyTransform('sort', 'string')).toBe('string')
    })

    it('handles mixed types by returning 0 for comparison', () => {
      const result = applyTransform('sort', [{ x: 1 }, { x: 'a' }], { field: 'x' })
      expect(result).toHaveLength(2)
    })
  })

  describe('reverse', () => {
    it('reverses array', () => {
      expect(applyTransform('reverse', [1, 2, 3])).toEqual([3, 2, 1])
    })

    it('reverses string', () => {
      expect(applyTransform('reverse', 'hello')).toBe('olleh')
    })

    it('does not mutate original array', () => {
      const original = [1, 2, 3]
      applyTransform('reverse', original)
      expect(original).toEqual([1, 2, 3])
    })

    it('returns non-array/string unchanged', () => {
      expect(applyTransform('reverse', 42)).toBe(42)
    })
  })

  describe('toNumber', () => {
    it('returns number unchanged', () => {
      expect(applyTransform('toNumber', 42)).toBe(42)
    })

    it('converts string to number', () => {
      expect(applyTransform('toNumber', '42')).toBe(42)
    })

    it('converts float string', () => {
      expect(applyTransform('toNumber', '3.14')).toBe(3.14)
    })

    it('returns 0 for invalid string', () => {
      expect(applyTransform('toNumber', 'invalid')).toBe(0)
    })

    it('converts boolean true to 1', () => {
      expect(applyTransform('toNumber', true)).toBe(1)
    })

    it('converts boolean false to 0', () => {
      expect(applyTransform('toNumber', false)).toBe(0)
    })

    it('returns 0 for null/undefined', () => {
      expect(applyTransform('toNumber', null)).toBe(0)
      expect(applyTransform('toNumber', undefined)).toBe(0)
    })
  })

  describe('toString', () => {
    it('returns string unchanged', () => {
      expect(applyTransform('toString', 'hello')).toBe('hello')
    })

    it('converts number to string', () => {
      expect(applyTransform('toString', 42)).toBe('42')
    })

    it('converts object to JSON', () => {
      expect(applyTransform('toString', { a: 1 })).toBe('{"a":1}')
    })

    it('returns empty string for null', () => {
      expect(applyTransform('toString', null)).toBe('')
    })

    it('returns empty string for undefined', () => {
      expect(applyTransform('toString', undefined)).toBe('')
    })

    it('converts boolean to string', () => {
      expect(applyTransform('toString', true)).toBe('true')
    })
  })

  describe('toBoolean', () => {
    it('returns true for truthy values', () => {
      expect(applyTransform('toBoolean', 1)).toBe(true)
      expect(applyTransform('toBoolean', 'hello')).toBe(true)
      expect(applyTransform('toBoolean', {})).toBe(true)
      expect(applyTransform('toBoolean', [])).toBe(true)
    })

    it('returns false for falsy values', () => {
      expect(applyTransform('toBoolean', 0)).toBe(false)
      expect(applyTransform('toBoolean', '')).toBe(false)
      expect(applyTransform('toBoolean', null)).toBe(false)
      expect(applyTransform('toBoolean', undefined)).toBe(false)
    })
  })

  describe('default', () => {
    it('returns value if defined', () => {
      expect(applyTransform('default', 'value', { default: 'fallback' })).toBe('value')
    })

    it('returns default for null', () => {
      expect(applyTransform('default', null, { default: 'fallback' })).toBe('fallback')
    })

    it('returns default for undefined', () => {
      expect(applyTransform('default', undefined, { default: 'fallback' })).toBe('fallback')
    })

    it('keeps 0 and empty string as values', () => {
      expect(applyTransform('default', 0, { default: 42 })).toBe(0)
      expect(applyTransform('default', '', { default: 'fallback' })).toBe('')
    })
  })

  describe('formatDate', () => {
    it('formats date with default short format', () => {
      const result = applyTransform('formatDate', '2024-01-15')
      expect(typeof result).toBe('string')
      expect(result).toContain('2024')
    })

    it('formats date with long format', () => {
      const result = applyTransform('formatDate', '2024-01-15', { format: 'long' })
      expect(typeof result).toBe('string')
      expect(result).toContain('2024')
    })

    it('formats date with numeric format', () => {
      const result = applyTransform('formatDate', '2024-01-15', { format: 'numeric' })
      expect(typeof result).toBe('string')
    })

    it('handles Date object', () => {
      const result = applyTransform('formatDate', new Date('2024-01-15'))
      expect(typeof result).toBe('string')
    })

    it('handles timestamp', () => {
      const result = applyTransform('formatDate', Date.now())
      expect(typeof result).toBe('string')
    })

    it('returns invalid date unchanged', () => {
      expect(applyTransform('formatDate', 'not a date')).toBe('not a date')
    })

    it('returns non-date types unchanged', () => {
      expect(applyTransform('formatDate', null)).toBe(null)
    })
  })

  describe('sum', () => {
    it('sums numeric array', () => {
      expect(applyTransform('sum', [1, 2, 3, 4])).toBe(10)
    })

    it('handles string numbers', () => {
      expect(applyTransform('sum', ['1', '2', '3'])).toBe(6)
    })

    it('ignores NaN values', () => {
      expect(applyTransform('sum', [1, 'invalid', 3])).toBe(4)
    })

    it('returns 0 for empty array', () => {
      expect(applyTransform('sum', [])).toBe(0)
    })

    it('returns number for non-array number', () => {
      expect(applyTransform('sum', 42)).toBe(42)
    })

    it('returns 0 for non-array non-number', () => {
      expect(applyTransform('sum', 'string')).toBe(0)
    })
  })

  describe('avg', () => {
    it('calculates average', () => {
      expect(applyTransform('avg', [2, 4, 6])).toBe(4)
    })

    it('returns 0 for empty array', () => {
      expect(applyTransform('avg', [])).toBe(0)
    })

    it('returns 0 for non-array', () => {
      expect(applyTransform('avg', 'string')).toBe(0)
    })

    it('handles decimal results', () => {
      expect(applyTransform('avg', [1, 2])).toBe(1.5)
    })
  })

  describe('min', () => {
    it('finds minimum value', () => {
      expect(applyTransform('min', [3, 1, 2])).toBe(1)
    })

    it('handles string numbers', () => {
      expect(applyTransform('min', ['10', '5', '20'])).toBe(5)
    })

    it('returns undefined for empty array', () => {
      expect(applyTransform('min', [])).toBeUndefined()
    })

    it('returns undefined for non-array', () => {
      expect(applyTransform('min', 'string')).toBeUndefined()
    })

    it('filters out non-numeric values', () => {
      expect(applyTransform('min', [5, 'invalid', 3, NaN])).toBe(3)
    })

    it('returns undefined for all non-numeric values', () => {
      expect(applyTransform('min', ['a', 'b', 'c'])).toBeUndefined()
    })
  })

  describe('max', () => {
    it('finds maximum value', () => {
      expect(applyTransform('max', [3, 1, 2])).toBe(3)
    })

    it('handles string numbers', () => {
      expect(applyTransform('max', ['10', '5', '20'])).toBe(20)
    })

    it('returns undefined for empty array', () => {
      expect(applyTransform('max', [])).toBeUndefined()
    })

    it('returns undefined for non-array', () => {
      expect(applyTransform('max', 'string')).toBeUndefined()
    })

    it('filters out non-numeric values', () => {
      expect(applyTransform('max', [5, 'invalid', 10, NaN])).toBe(10)
    })
  })
})

describe('transform utilities', () => {
  describe('BUILT_IN_TRANSFORMS', () => {
    it('contains all expected transforms', () => {
      const expected = [
        'first', 'last', 'count', 'join', 'split',
        'uppercase', 'lowercase', 'trim', 'slice',
        'flatten', 'unique', 'filter', 'pluck', 'sort', 'reverse',
        'toNumber', 'toString', 'toBoolean', 'default', 'formatDate',
        'sum', 'avg', 'min', 'max',
      ]

      for (const name of expected) {
        expect(BUILT_IN_TRANSFORMS[name]).toBeDefined()
        expect(BUILT_IN_TRANSFORMS[name].fn).toBeInstanceOf(Function)
        expect(BUILT_IN_TRANSFORMS[name].description).toBeTruthy()
        expect(BUILT_IN_TRANSFORMS[name].inputType).toBeTruthy()
        expect(BUILT_IN_TRANSFORMS[name].outputType).toBeTruthy()
      }
    })
  })

  describe('getTransform', () => {
    it('returns transform function', () => {
      const fn = getTransform('first')
      expect(fn).toBeInstanceOf(Function)
    })

    it('returns undefined for unknown transform', () => {
      expect(getTransform('nonexistent')).toBeUndefined()
    })
  })

  describe('getTransformDefinition', () => {
    it('returns full transform definition', () => {
      const def = getTransformDefinition('join')
      expect(def).toBeDefined()
      expect(def?.fn).toBeInstanceOf(Function)
      expect(def?.description).toBe('Join array items into a string')
      expect(def?.inputType).toBe('array')
      expect(def?.outputType).toBe('string')
      expect(def?.args?.separator).toBeDefined()
    })

    it('returns undefined for unknown transform', () => {
      expect(getTransformDefinition('nonexistent')).toBeUndefined()
    })
  })

  describe('hasTransform', () => {
    it('returns true for existing transform', () => {
      expect(hasTransform('first')).toBe(true)
    })

    it('returns false for non-existing transform', () => {
      expect(hasTransform('nonexistent')).toBe(false)
    })
  })

  describe('applyTransform', () => {
    it('applies transform by name', () => {
      expect(applyTransform('uppercase', 'hello')).toBe('HELLO')
    })

    it('passes args to transform', () => {
      expect(applyTransform('join', ['a', 'b'], { separator: '-' })).toBe('a-b')
    })

    it('returns value unchanged for unknown transform', () => {
      expect(applyTransform('nonexistent', 'hello')).toBe('hello')
    })
  })

  describe('applyTransforms', () => {
    it('applies multiple transforms in sequence', () => {
      const result = applyTransforms('  HELLO  ', [
        { name: 'trim' },
        { name: 'lowercase' },
      ])
      expect(result).toBe('hello')
    })

    it('passes args to each transform', () => {
      const result = applyTransforms(['a', 'b', 'c'], [
        { name: 'join', args: { separator: '-' } },
        { name: 'uppercase' },
      ])
      expect(result).toBe('A-B-C')
    })

    it('handles empty transform list', () => {
      expect(applyTransforms('hello', [])).toBe('hello')
    })

    it('skips unknown transforms', () => {
      const result = applyTransforms('hello', [
        { name: 'unknown' },
        { name: 'uppercase' },
      ])
      expect(result).toBe('HELLO')
    })
  })

  describe('getTransformNames', () => {
    it('returns all transform names', () => {
      const names = getTransformNames()
      expect(names).toContain('first')
      expect(names).toContain('last')
      expect(names).toContain('join')
      expect(names.length).toBeGreaterThan(20)
    })
  })
})
