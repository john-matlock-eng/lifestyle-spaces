/**
 * Tests for Field Component Registry
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  fieldRegistry,
  registerField,
  getFieldComponent,
  hasFieldComponent,
  unregisterField,
  getRegisteredTypes,
  getRegistrySize,
  clearRegistry,
  registerFields,
  onRegistryChange,
  renderField,
} from '../registry'
import type { BaseFieldProps } from '../types'

// Mock component for testing
const MockTextField = (_props: BaseFieldProps) => null
const MockSelectField = (_props: BaseFieldProps) => null

describe('registry', () => {
  beforeEach(() => {
    clearRegistry()
  })

  describe('registerField', () => {
    it('registers a component for a field type', () => {
      registerField('text', MockTextField)
      expect(hasFieldComponent('text')).toBe(true)
    })

    it('overwrites existing registration', () => {
      registerField('text', MockTextField)
      registerField('text', MockSelectField)
      expect(getFieldComponent('text')).toBe(MockSelectField)
    })
  })

  describe('getFieldComponent', () => {
    it('returns registered component', () => {
      registerField('text', MockTextField)
      expect(getFieldComponent('text')).toBe(MockTextField)
    })

    it('returns undefined for unregistered type', () => {
      expect(getFieldComponent('text')).toBeUndefined()
    })
  })

  describe('hasFieldComponent', () => {
    it('returns true for registered type', () => {
      registerField('text', MockTextField)
      expect(hasFieldComponent('text')).toBe(true)
    })

    it('returns false for unregistered type', () => {
      expect(hasFieldComponent('text')).toBe(false)
    })
  })

  describe('unregisterField', () => {
    it('removes registered component', () => {
      registerField('text', MockTextField)
      expect(unregisterField('text')).toBe(true)
      expect(hasFieldComponent('text')).toBe(false)
    })

    it('returns false for unregistered type', () => {
      expect(unregisterField('text')).toBe(false)
    })
  })

  describe('getRegisteredTypes', () => {
    it('returns empty array when no registrations', () => {
      expect(getRegisteredTypes()).toEqual([])
    })

    it('returns all registered types', () => {
      registerField('text', MockTextField)
      registerField('select', MockSelectField)
      expect(getRegisteredTypes()).toContain('text')
      expect(getRegisteredTypes()).toContain('select')
    })
  })

  describe('getRegistrySize', () => {
    it('returns 0 when empty', () => {
      expect(getRegistrySize()).toBe(0)
    })

    it('returns correct count', () => {
      registerField('text', MockTextField)
      registerField('select', MockSelectField)
      expect(getRegistrySize()).toBe(2)
    })
  })

  describe('clearRegistry', () => {
    it('removes all registrations', () => {
      registerField('text', MockTextField)
      registerField('select', MockSelectField)
      clearRegistry()
      expect(getRegistrySize()).toBe(0)
    })
  })

  describe('registerFields', () => {
    it('registers multiple components at once', () => {
      registerFields({
        text: MockTextField,
        select: MockSelectField,
      })
      expect(hasFieldComponent('text')).toBe(true)
      expect(hasFieldComponent('select')).toBe(true)
    })

    it('skips undefined components', () => {
      registerFields({
        text: MockTextField,
        select: undefined,
      })
      expect(hasFieldComponent('text')).toBe(true)
      expect(hasFieldComponent('select')).toBe(false)
    })
  })

  describe('onRegistryChange', () => {
    it('notifies on register', () => {
      const listener = vi.fn()
      const unsubscribe = onRegistryChange(listener)

      registerField('text', MockTextField)
      expect(listener).toHaveBeenCalledWith('text', 'register')

      unsubscribe()
    })

    it('notifies on unregister', () => {
      registerField('text', MockTextField)
      const listener = vi.fn()
      const unsubscribe = onRegistryChange(listener)

      unregisterField('text')
      expect(listener).toHaveBeenCalledWith('text', 'unregister')

      unsubscribe()
    })

    it('notifies on clear', () => {
      registerField('text', MockTextField)
      const listener = vi.fn()
      const unsubscribe = onRegistryChange(listener)

      clearRegistry()
      expect(listener).toHaveBeenCalledWith('text', 'clear')

      unsubscribe()
    })

    it('allows unsubscribe', () => {
      const listener = vi.fn()
      const unsubscribe = onRegistryChange(listener)

      unsubscribe()
      registerField('text', MockTextField)
      expect(listener).not.toHaveBeenCalled()
    })

    it('handles listener errors gracefully', () => {
      const errorListener = vi.fn(() => {
        throw new Error('Listener error')
      })
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      const unsubscribe = onRegistryChange(errorListener)
      registerField('text', MockTextField)

      expect(consoleErrorSpy).toHaveBeenCalled()
      unsubscribe()
      consoleErrorSpy.mockRestore()
    })
  })

  describe('renderField', () => {
    it('renders registered component', () => {
      registerField('text', MockTextField)
      const props = { id: 'test', name: 'test' } as BaseFieldProps
      const result = renderField('text', props)
      expect(result).not.toBeNull()
    })

    it('returns null for unregistered type', () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const props = { id: 'test', name: 'test' } as BaseFieldProps
      const result = renderField('text', props)
      expect(result).toBeNull()
      expect(consoleWarnSpy).toHaveBeenCalled()
      consoleWarnSpy.mockRestore()
    })
  })

  describe('fieldRegistry', () => {
    it('is a Map instance', () => {
      expect(fieldRegistry).toBeInstanceOf(Map)
    })
  })
})
