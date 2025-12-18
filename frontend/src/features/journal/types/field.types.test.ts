import { describe, it, expect } from 'vitest'
import {
  isFieldType,
  isFieldDefinition,
  isFieldOption,
  isFieldValidation,
  isDisplayFieldType,
  isMultiValueFieldType,
  isOptionFieldType,
} from './field.types'

describe('Field Type Guards', () => {
  describe('isFieldType', () => {
    it('should return true for all valid field types', () => {
      const validTypes = [
        'text',
        'textarea',
        'rich_text',
        'number',
        'rating',
        'slider',
        'select',
        'multi_select',
        'checkbox',
        'checkbox_group',
        'radio',
        'date',
        'time',
        'datetime',
        'list',
        'tags',
        'emotions',
        'values',
        'goals',
        'repeatable',
        'section_break',
        'heading',
        'paragraph',
      ]

      validTypes.forEach((type) => {
        expect(isFieldType(type)).toBe(true)
      })
    })

    it('should return false for invalid field types', () => {
      expect(isFieldType('input')).toBe(false)
      expect(isFieldType('dropdown')).toBe(false)
      expect(isFieldType('button')).toBe(false)
      expect(isFieldType('')).toBe(false)
      expect(isFieldType(null)).toBe(false)
      expect(isFieldType(undefined)).toBe(false)
      expect(isFieldType(123)).toBe(false)
      expect(isFieldType({})).toBe(false)
      expect(isFieldType([])).toBe(false)
    })
  })

  describe('isFieldDefinition', () => {
    it('should return true for valid field definitions', () => {
      const validField = {
        id: 'test-field',
        type: 'text',
        label: 'Test Field',
      }

      expect(isFieldDefinition(validField)).toBe(true)
    })

    it('should return true for complete field definitions', () => {
      const completeField = {
        id: 'mood-rating',
        type: 'rating',
        label: 'How are you feeling?',
        helpText: 'Rate your current mood from 1-5',
        placeholder: 'Select a rating',
        validation: { required: true, min: 1, max: 5 },
        config: { maxRating: 5, icon: 'star' },
        disabled: false,
        readOnly: false,
        cssClass: 'mood-field',
        order: 1,
        exportable: true,
        outputKey: 'mood',
      }

      expect(isFieldDefinition(completeField)).toBe(true)
    })

    it('should return true for all valid field types', () => {
      const types = ['text', 'textarea', 'number', 'rating', 'slider', 'select', 'checkbox', 'date']

      types.forEach((type) => {
        const field = { id: `test-${type}`, type, label: `Test ${type}` }
        expect(isFieldDefinition(field)).toBe(true)
      })
    })

    it('should return false for invalid field definitions', () => {
      // Missing id
      expect(isFieldDefinition({ type: 'text', label: 'Test' })).toBe(false)

      // Missing type
      expect(isFieldDefinition({ id: 'test', label: 'Test' })).toBe(false)

      // Missing label
      expect(isFieldDefinition({ id: 'test', type: 'text' })).toBe(false)

      // Invalid type
      expect(isFieldDefinition({ id: 'test', type: 'invalid', label: 'Test' })).toBe(false)

      // Id not a string
      expect(isFieldDefinition({ id: 123, type: 'text', label: 'Test' })).toBe(false)

      // Label not a string
      expect(isFieldDefinition({ id: 'test', type: 'text', label: 123 })).toBe(false)
    })

    it('should return false for non-objects', () => {
      expect(isFieldDefinition(null)).toBe(false)
      expect(isFieldDefinition(undefined)).toBe(false)
      expect(isFieldDefinition('field')).toBe(false)
      expect(isFieldDefinition(123)).toBe(false)
      expect(isFieldDefinition([])).toBe(false)
    })
  })

  describe('isFieldOption', () => {
    it('should return true for valid field options', () => {
      const validOption = {
        value: 'option1',
        label: 'Option 1',
      }

      expect(isFieldOption(validOption)).toBe(true)
    })

    it('should return true for complete field options', () => {
      const completeOption = {
        value: 'high',
        label: 'High Priority',
        description: 'Tasks that need immediate attention',
        icon: '🔥',
        disabled: false,
        order: 1,
      }

      expect(isFieldOption(completeOption)).toBe(true)
    })

    it('should return false for invalid field options', () => {
      // Missing value
      expect(isFieldOption({ label: 'Test' })).toBe(false)

      // Missing label
      expect(isFieldOption({ value: 'test' })).toBe(false)

      // Value not a string
      expect(isFieldOption({ value: 123, label: 'Test' })).toBe(false)

      // Label not a string
      expect(isFieldOption({ value: 'test', label: 456 })).toBe(false)
    })

    it('should return false for non-objects', () => {
      expect(isFieldOption(null)).toBe(false)
      expect(isFieldOption(undefined)).toBe(false)
      expect(isFieldOption('option')).toBe(false)
      expect(isFieldOption(789)).toBe(false)
      expect(isFieldOption([])).toBe(false)
    })
  })

  describe('isFieldValidation', () => {
    it('should return true for valid validation objects', () => {
      expect(isFieldValidation({})).toBe(true)
      expect(isFieldValidation({ required: true })).toBe(true)
      expect(isFieldValidation({ minLength: 5, maxLength: 100 })).toBe(true)
      expect(isFieldValidation({ min: 0, max: 10 })).toBe(true)
      expect(isFieldValidation({ minItems: 1, maxItems: 5 })).toBe(true)
      expect(isFieldValidation({ pattern: '^[a-z]+$' })).toBe(true)
      expect(isFieldValidation({ errorMessage: 'Invalid input' })).toBe(true)
    })

    it('should return true for complete validation objects', () => {
      const completeValidation = {
        required: true,
        minLength: 1,
        maxLength: 500,
        min: 0,
        max: 100,
        minItems: 1,
        maxItems: 10,
        pattern: '^[A-Za-z]+$',
        errorMessage: 'Please enter valid text',
        customValidator: 'validateCustom',
      }

      expect(isFieldValidation(completeValidation)).toBe(true)
    })

    it('should return false for invalid validation properties', () => {
      // Required not boolean
      expect(isFieldValidation({ required: 'yes' })).toBe(false)

      // minLength not number
      expect(isFieldValidation({ minLength: '5' })).toBe(false)

      // maxLength not number
      expect(isFieldValidation({ maxLength: '100' })).toBe(false)

      // min not number
      expect(isFieldValidation({ min: '0' })).toBe(false)

      // max not number
      expect(isFieldValidation({ max: '10' })).toBe(false)

      // minItems not number
      expect(isFieldValidation({ minItems: '1' })).toBe(false)

      // maxItems not number
      expect(isFieldValidation({ maxItems: '5' })).toBe(false)

      // pattern not string
      expect(isFieldValidation({ pattern: /regex/ })).toBe(false)

      // errorMessage not string
      expect(isFieldValidation({ errorMessage: 123 })).toBe(false)
    })

    it('should return false for non-objects', () => {
      expect(isFieldValidation(null)).toBe(false)
      expect(isFieldValidation(undefined)).toBe(false)
      expect(isFieldValidation('validation')).toBe(false)
      expect(isFieldValidation(123)).toBe(false)
      expect(isFieldValidation([])).toBe(false)
    })
  })

  describe('isDisplayFieldType', () => {
    it('should return true for display-only field types', () => {
      expect(isDisplayFieldType('section_break')).toBe(true)
      expect(isDisplayFieldType('heading')).toBe(true)
      expect(isDisplayFieldType('paragraph')).toBe(true)
    })

    it('should return false for input field types', () => {
      expect(isDisplayFieldType('text')).toBe(false)
      expect(isDisplayFieldType('textarea')).toBe(false)
      expect(isDisplayFieldType('number')).toBe(false)
      expect(isDisplayFieldType('rating')).toBe(false)
      expect(isDisplayFieldType('select')).toBe(false)
      expect(isDisplayFieldType('checkbox')).toBe(false)
      expect(isDisplayFieldType('date')).toBe(false)
      expect(isDisplayFieldType('list')).toBe(false)
    })
  })

  describe('isMultiValueFieldType', () => {
    it('should return true for multi-value field types', () => {
      expect(isMultiValueFieldType('multi_select')).toBe(true)
      expect(isMultiValueFieldType('checkbox_group')).toBe(true)
      expect(isMultiValueFieldType('list')).toBe(true)
      expect(isMultiValueFieldType('tags')).toBe(true)
      expect(isMultiValueFieldType('emotions')).toBe(true)
    })

    it('should return false for single-value field types', () => {
      expect(isMultiValueFieldType('text')).toBe(false)
      expect(isMultiValueFieldType('textarea')).toBe(false)
      expect(isMultiValueFieldType('number')).toBe(false)
      expect(isMultiValueFieldType('rating')).toBe(false)
      expect(isMultiValueFieldType('select')).toBe(false)
      expect(isMultiValueFieldType('checkbox')).toBe(false)
      expect(isMultiValueFieldType('radio')).toBe(false)
      expect(isMultiValueFieldType('date')).toBe(false)
    })
  })

  describe('isOptionFieldType', () => {
    it('should return true for option-based field types', () => {
      expect(isOptionFieldType('select')).toBe(true)
      expect(isOptionFieldType('multi_select')).toBe(true)
      expect(isOptionFieldType('checkbox_group')).toBe(true)
      expect(isOptionFieldType('radio')).toBe(true)
    })

    it('should return false for non-option field types', () => {
      expect(isOptionFieldType('text')).toBe(false)
      expect(isOptionFieldType('textarea')).toBe(false)
      expect(isOptionFieldType('number')).toBe(false)
      expect(isOptionFieldType('rating')).toBe(false)
      expect(isOptionFieldType('slider')).toBe(false)
      expect(isOptionFieldType('checkbox')).toBe(false)
      expect(isOptionFieldType('date')).toBe(false)
      expect(isOptionFieldType('list')).toBe(false)
      expect(isOptionFieldType('tags')).toBe(false)
    })
  })
})
