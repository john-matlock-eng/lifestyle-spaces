/**
 * Tests for BindingExpressionParser
 */

import { describe, it, expect } from 'vitest'
import {
  BindingExpressionParser,
  bindingExpressionParser,
  parse,
  validate,
  isValidExpression,
  type ParsedBindingExpression,
} from '../BindingExpressionParser'

describe('BindingExpressionParser', () => {
  describe('parse', () => {
    describe('simple property access', () => {
      it('parses a simple property name', () => {
        const result = parse('name')
        expect(result.isValid).toBe(true)
        expect(result.segments).toHaveLength(1)
        expect(result.segments[0]).toEqual({ type: 'property', name: 'name' })
        expect(result.hasWildcard).toBe(false)
      })

      it('parses property with underscores', () => {
        const result = parse('first_name')
        expect(result.isValid).toBe(true)
        expect(result.segments[0]).toEqual({ type: 'property', name: 'first_name' })
      })

      it('parses property with hyphens', () => {
        const result = parse('focus-areas')
        expect(result.isValid).toBe(true)
        expect(result.segments[0]).toEqual({ type: 'property', name: 'focus-areas' })
      })

      it('parses property starting with underscore', () => {
        const result = parse('_private')
        expect(result.isValid).toBe(true)
        expect(result.segments[0]).toEqual({ type: 'property', name: '_private' })
      })

      it('parses property with numbers', () => {
        const result = parse('field2')
        expect(result.isValid).toBe(true)
        expect(result.segments[0]).toEqual({ type: 'property', name: 'field2' })
      })
    })

    describe('nested property access', () => {
      it('parses two-level nested path', () => {
        const result = parse('user.name')
        expect(result.isValid).toBe(true)
        expect(result.segments).toHaveLength(2)
        expect(result.segments[0]).toEqual({ type: 'property', name: 'user' })
        expect(result.segments[1]).toEqual({ type: 'property', name: 'name' })
      })

      it('parses three-level nested path', () => {
        const result = parse('user.profile.email')
        expect(result.isValid).toBe(true)
        expect(result.segments).toHaveLength(3)
        expect(result.segments[0]).toEqual({ type: 'property', name: 'user' })
        expect(result.segments[1]).toEqual({ type: 'property', name: 'profile' })
        expect(result.segments[2]).toEqual({ type: 'property', name: 'email' })
      })

      it('parses deeply nested path', () => {
        const result = parse('a.b.c.d.e')
        expect(result.isValid).toBe(true)
        expect(result.segments).toHaveLength(5)
      })
    })

    describe('array index access', () => {
      it('parses property with array index', () => {
        const result = parse('items[0]')
        expect(result.isValid).toBe(true)
        expect(result.segments).toHaveLength(2)
        expect(result.segments[0]).toEqual({ type: 'property', name: 'items' })
        expect(result.segments[1]).toEqual({ type: 'index', index: 0 })
      })

      it('parses array index with larger number', () => {
        const result = parse('items[123]')
        expect(result.isValid).toBe(true)
        expect(result.segments[1]).toEqual({ type: 'index', index: 123 })
      })

      it('parses property.property[index]', () => {
        const result = parse('focus.areas[2]')
        expect(result.isValid).toBe(true)
        expect(result.segments).toHaveLength(3)
        expect(result.segments[0]).toEqual({ type: 'property', name: 'focus' })
        expect(result.segments[1]).toEqual({ type: 'property', name: 'areas' })
        expect(result.segments[2]).toEqual({ type: 'index', index: 2 })
      })

      it('parses array[index].property', () => {
        const result = parse('items[0].name')
        expect(result.isValid).toBe(true)
        expect(result.segments).toHaveLength(3)
        expect(result.segments[0]).toEqual({ type: 'property', name: 'items' })
        expect(result.segments[1]).toEqual({ type: 'index', index: 0 })
        expect(result.segments[2]).toEqual({ type: 'property', name: 'name' })
      })

      it('parses consecutive array indices', () => {
        const result = parse('matrix[0][1]')
        expect(result.isValid).toBe(true)
        expect(result.segments).toHaveLength(3)
        expect(result.segments[0]).toEqual({ type: 'property', name: 'matrix' })
        expect(result.segments[1]).toEqual({ type: 'index', index: 0 })
        expect(result.segments[2]).toEqual({ type: 'index', index: 1 })
      })

      it('parses standalone array access', () => {
        const result = parse('[0]')
        expect(result.isValid).toBe(true)
        expect(result.segments).toHaveLength(1)
        expect(result.segments[0]).toEqual({ type: 'index', index: 0 })
      })

      it('parses standalone array access followed by property', () => {
        const result = parse('[0].name')
        expect(result.isValid).toBe(true)
        expect(result.segments).toHaveLength(2)
        expect(result.segments[0]).toEqual({ type: 'index', index: 0 })
        expect(result.segments[1]).toEqual({ type: 'property', name: 'name' })
      })

      it('parses consecutive standalone array accesses', () => {
        const result = parse('[0][1]')
        expect(result.isValid).toBe(true)
        expect(result.segments).toHaveLength(2)
        expect(result.segments[0]).toEqual({ type: 'index', index: 0 })
        expect(result.segments[1]).toEqual({ type: 'index', index: 1 })
      })
    })

    describe('wildcard access', () => {
      it('parses property with wildcard', () => {
        const result = parse('items[*]')
        expect(result.isValid).toBe(true)
        expect(result.hasWildcard).toBe(true)
        expect(result.segments).toHaveLength(2)
        expect(result.segments[0]).toEqual({ type: 'property', name: 'items' })
        expect(result.segments[1]).toEqual({ type: 'wildcard' })
      })

      it('parses wildcard followed by property', () => {
        const result = parse('items[*].name')
        expect(result.isValid).toBe(true)
        expect(result.hasWildcard).toBe(true)
        expect(result.segments).toHaveLength(3)
        expect(result.segments[0]).toEqual({ type: 'property', name: 'items' })
        expect(result.segments[1]).toEqual({ type: 'wildcard' })
        expect(result.segments[2]).toEqual({ type: 'property', name: 'name' })
      })

      it('parses nested path with wildcard', () => {
        const result = parse('focus-areas[*].goals[0].title')
        expect(result.isValid).toBe(true)
        expect(result.hasWildcard).toBe(true)
        expect(result.segments).toHaveLength(5)
      })

      it('parses standalone wildcard', () => {
        const result = parse('[*]')
        expect(result.isValid).toBe(true)
        expect(result.hasWildcard).toBe(true)
        expect(result.segments).toHaveLength(1)
        expect(result.segments[0]).toEqual({ type: 'wildcard' })
      })

      it('parses mixed wildcards and indices', () => {
        const result = parse('data[*][0]')
        expect(result.isValid).toBe(true)
        expect(result.hasWildcard).toBe(true)
        expect(result.segments).toHaveLength(3)
        expect(result.segments[1]).toEqual({ type: 'wildcard' })
        expect(result.segments[2]).toEqual({ type: 'index', index: 0 })
      })
    })

    describe('complex expressions', () => {
      it('parses focus-areas[0].name', () => {
        const result = parse('focus-areas[0].name')
        expect(result.isValid).toBe(true)
        expect(result.segments).toHaveLength(3)
        expect(result.original).toBe('focus-areas[0].name')
      })

      it('parses focus-areas[*].name', () => {
        const result = parse('focus-areas[*].name')
        expect(result.isValid).toBe(true)
        expect(result.hasWildcard).toBe(true)
        expect(result.segments).toHaveLength(3)
      })

      it('parses deeply nested with arrays', () => {
        const result = parse('users[0].profile.contacts[*].email')
        expect(result.isValid).toBe(true)
        expect(result.hasWildcard).toBe(true)
        expect(result.segments).toHaveLength(6)
      })
    })

    describe('error handling', () => {
      it('returns error for null expression', () => {
        const result = parse(null as unknown as string)
        expect(result.isValid).toBe(false)
        expect(result.error).toBe('Expression cannot be null or undefined')
      })

      it('returns error for undefined expression', () => {
        const result = parse(undefined as unknown as string)
        expect(result.isValid).toBe(false)
        expect(result.error).toBe('Expression cannot be null or undefined')
      })

      it('returns error for empty expression', () => {
        const result = parse('')
        expect(result.isValid).toBe(false)
        expect(result.error).toBe('Expression cannot be empty')
      })

      it('returns error for whitespace-only expression', () => {
        const result = parse('   ')
        expect(result.isValid).toBe(false)
        expect(result.error).toBe('Expression cannot be empty')
      })

      it('returns error for invalid property name starting with number', () => {
        const result = parse('123abc')
        expect(result.isValid).toBe(false)
        expect(result.error).toContain('Invalid property name')
      })

      it('returns error for property with spaces', () => {
        const result = parse('my property')
        expect(result.isValid).toBe(false)
        expect(result.error).toContain('Invalid property name')
      })

      it('returns error for unclosed bracket', () => {
        const result = parse('items[0')
        expect(result.isValid).toBe(false)
        expect(result.error).toBeDefined()
      })

      it('returns error for negative array index', () => {
        const result = parse('items[-1]')
        expect(result.isValid).toBe(false)
        expect(result.error).toContain('Invalid array access')
      })

      it('returns error for non-numeric array index', () => {
        const result = parse('items[abc]')
        expect(result.isValid).toBe(false)
        expect(result.error).toContain('Invalid array access')
      })

      it('returns error for empty brackets', () => {
        const result = parse('items[]')
        expect(result.isValid).toBe(false)
        expect(result.error).toContain('Invalid array access')
      })

      it('returns error for standalone invalid array access', () => {
        // Tests parseArrayAccess error path when bracketIndex === 0
        const result = parse('[abc]')
        expect(result.isValid).toBe(false)
        expect(result.error).toContain('Invalid array access')
      })

      it('returns error for invalid characters after array access', () => {
        const result = parse('items[0]abc')
        expect(result.isValid).toBe(false)
        expect(result.error).toContain('Unexpected character')
      })
    })

    describe('whitespace handling', () => {
      it('trims leading whitespace', () => {
        const result = parse('  name')
        expect(result.isValid).toBe(true)
        expect(result.segments[0]).toEqual({ type: 'property', name: 'name' })
      })

      it('trims trailing whitespace', () => {
        const result = parse('name  ')
        expect(result.isValid).toBe(true)
        expect(result.segments[0]).toEqual({ type: 'property', name: 'name' })
      })

      it('trims surrounding whitespace', () => {
        const result = parse('  name  ')
        expect(result.isValid).toBe(true)
        expect(result.segments[0]).toEqual({ type: 'property', name: 'name' })
      })
    })
  })

  describe('parser options', () => {
    describe('allowEmpty', () => {
      it('allows empty expression when allowEmpty is true', () => {
        const result = parse('', { allowEmpty: true })
        expect(result.isValid).toBe(true)
        expect(result.segments).toHaveLength(0)
      })

      it('rejects empty expression when allowEmpty is false', () => {
        const result = parse('', { allowEmpty: false })
        expect(result.isValid).toBe(false)
      })
    })

    describe('maxDepth', () => {
      it('allows expression within depth limit', () => {
        const result = parse('a.b.c', { maxDepth: 5 })
        expect(result.isValid).toBe(true)
      })

      it('rejects expression exceeding depth limit', () => {
        const result = parse('a.b.c.d.e.f', { maxDepth: 3 })
        expect(result.isValid).toBe(false)
        expect(result.error).toContain('exceeds maximum depth')
      })
    })
  })

  describe('BindingExpressionParser class', () => {
    it('creates parser with default options', () => {
      const parser = new BindingExpressionParser()
      const result = parser.parse('name')
      expect(result.isValid).toBe(true)
    })

    it('creates parser with custom options', () => {
      const parser = new BindingExpressionParser({ allowEmpty: true, maxDepth: 10 })
      const result = parser.parse('')
      expect(result.isValid).toBe(true)
    })

    describe('validate', () => {
      it('returns valid:true for valid expression', () => {
        const parser = new BindingExpressionParser()
        const result = parser.validate('name')
        expect(result.valid).toBe(true)
        expect(result.error).toBeUndefined()
      })

      it('returns valid:false with error for invalid expression', () => {
        const parser = new BindingExpressionParser()
        const result = parser.validate('')
        expect(result.valid).toBe(false)
        expect(result.error).toBeDefined()
      })
    })

    describe('stringify', () => {
      it('converts parsed expression back to string', () => {
        const parser = new BindingExpressionParser()
        const parsed = parser.parse('user.name')
        const str = parser.stringify(parsed)
        expect(str).toBe('user.name')
      })

      it('converts array access expression back to string', () => {
        const parser = new BindingExpressionParser()
        const parsed = parser.parse('items[0].name')
        const str = parser.stringify(parsed)
        expect(str).toBe('items[0].name')
      })

      it('converts wildcard expression back to string', () => {
        const parser = new BindingExpressionParser()
        const parsed = parser.parse('items[*].name')
        const str = parser.stringify(parsed)
        expect(str).toBe('items[*].name')
      })

      it('returns original for invalid expression', () => {
        const parser = new BindingExpressionParser()
        const parsed = parser.parse('invalid[')
        const str = parser.stringify(parsed)
        expect(str).toBe('invalid[')
      })

      it('handles consecutive array accesses', () => {
        const parser = new BindingExpressionParser()
        const parsed = parser.parse('matrix[0][1]')
        const str = parser.stringify(parsed)
        expect(str).toBe('matrix[0][1]')
      })

      it('handles empty segments array', () => {
        const parser = new BindingExpressionParser({ allowEmpty: true })
        const parsed = parser.parse('')
        const str = parser.stringify(parsed)
        expect(str).toBe('')
      })
    })
  })

  describe('convenience functions', () => {
    describe('bindingExpressionParser singleton', () => {
      it('is a BindingExpressionParser instance', () => {
        expect(bindingExpressionParser).toBeInstanceOf(BindingExpressionParser)
      })
    })

    describe('validate function', () => {
      it('validates a valid expression', () => {
        const result = validate('name')
        expect(result.valid).toBe(true)
      })

      it('validates an invalid expression', () => {
        const result = validate('')
        expect(result.valid).toBe(false)
        expect(result.error).toBeDefined()
      })

      it('accepts custom options', () => {
        const result = validate('', { allowEmpty: true })
        expect(result.valid).toBe(true)
      })
    })

    describe('isValidExpression function', () => {
      it('returns true for valid expression', () => {
        expect(isValidExpression('name')).toBe(true)
      })

      it('returns false for invalid expression', () => {
        expect(isValidExpression('')).toBe(false)
      })

      it('returns true for complex valid expression', () => {
        expect(isValidExpression('focus-areas[*].name')).toBe(true)
      })
    })
  })

  describe('edge cases', () => {
    it('handles invalid property name with array access', () => {
      // Tests the error path when property before bracket is invalid
      const result = parse('123invalid[0]')
      expect(result.isValid).toBe(false)
      expect(result.error).toContain('Invalid property name')
    })

    it('handles very long property names', () => {
      const longName = 'a'.repeat(100)
      const result = parse(longName)
      expect(result.isValid).toBe(true)
      expect(result.segments[0].name).toBe(longName)
    })

    it('handles very large array indices', () => {
      const result = parse('items[999999]')
      expect(result.isValid).toBe(true)
      expect(result.segments[1].index).toBe(999999)
    })

    it('handles multiple consecutive wildcards', () => {
      const result = parse('data[*][*]')
      expect(result.isValid).toBe(true)
      expect(result.hasWildcard).toBe(true)
      expect(result.segments).toHaveLength(3)
    })

    it('handles property names with all valid characters', () => {
      const result = parse('_test-name_123')
      expect(result.isValid).toBe(true)
    })

    it('preserves original expression', () => {
      const original = '  items[0].name  '
      const result = parse(original)
      expect(result.original).toBe(original)
    })
  })
})
