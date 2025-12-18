import { describe, it, expect } from 'vitest'
import {
  isParsedBindingExpression,
  isResolvedBinding,
  isBindingResolutionError,
  isBindingErrorCode,
  isFrameworkEntryData,
  isCapturedOutputs,
} from './data-binding.types'

describe('Data Binding Type Guards', () => {
  describe('isParsedBindingExpression', () => {
    it('should return true for valid parsed binding expressions', () => {
      const validExpression = {
        source: 'framework_entry',
        sourcePath: ['values_discovery', 'core_values'],
        rawExpression: 'values_discovery.core_values',
      }

      expect(isParsedBindingExpression(validExpression)).toBe(true)
    })

    it('should return true for complete parsed binding expressions', () => {
      const completeExpression = {
        source: 'user_profile',
        sourcePath: ['user', 'displayName'],
        index: 0,
        range: [0, 5] as [number, number],
        transform: 'uppercase',
        transformArgs: { locale: 'en-US' },
        rawExpression: 'user.displayName | uppercase',
      }

      expect(isParsedBindingExpression(completeExpression)).toBe(true)
    })

    it('should return true for different source types', () => {
      const sources = ['framework_entry', 'user_profile', 'computed', 'static']

      sources.forEach((source) => {
        const expression = {
          source,
          sourcePath: ['test'],
          rawExpression: 'test',
        }
        expect(isParsedBindingExpression(expression)).toBe(true)
      })
    })

    it('should return false for invalid parsed binding expressions', () => {
      // Missing source
      expect(
        isParsedBindingExpression({
          sourcePath: ['test'],
          rawExpression: 'test',
        })
      ).toBe(false)

      // Missing sourcePath
      expect(
        isParsedBindingExpression({
          source: 'static',
          rawExpression: 'test',
        })
      ).toBe(false)

      // Missing rawExpression
      expect(
        isParsedBindingExpression({
          source: 'static',
          sourcePath: ['test'],
        })
      ).toBe(false)

      // sourcePath not an array
      expect(
        isParsedBindingExpression({
          source: 'static',
          sourcePath: 'test',
          rawExpression: 'test',
        })
      ).toBe(false)

      // sourcePath contains non-strings
      expect(
        isParsedBindingExpression({
          source: 'static',
          sourcePath: ['test', 123],
          rawExpression: 'test',
        })
      ).toBe(false)

      // rawExpression not a string
      expect(
        isParsedBindingExpression({
          source: 'static',
          sourcePath: ['test'],
          rawExpression: 123,
        })
      ).toBe(false)
    })

    it('should return false for non-objects', () => {
      expect(isParsedBindingExpression(null)).toBe(false)
      expect(isParsedBindingExpression(undefined)).toBe(false)
      expect(isParsedBindingExpression('expression')).toBe(false)
      expect(isParsedBindingExpression(123)).toBe(false)
      expect(isParsedBindingExpression([])).toBe(false)
    })
  })

  describe('isResolvedBinding', () => {
    it('should return true for valid resolved bindings', () => {
      const validBinding = {
        binding: {
          id: 'binding-1',
          source: 'framework_entry',
          sourcePath: 'values.core',
          targetFieldId: 'values_display',
        },
        value: ['integrity', 'growth'],
        success: true,
        usedFallback: false,
      }

      expect(isResolvedBinding(validBinding)).toBe(true)
    })

    it('should return true for failed resolved bindings', () => {
      const failedBinding = {
        binding: {
          id: 'binding-2',
          source: 'framework_entry',
          sourcePath: 'nonexistent.path',
          targetFieldId: 'target',
        },
        value: null,
        success: false,
        error: 'Source not found',
        usedFallback: true,
      }

      expect(isResolvedBinding(failedBinding)).toBe(true)
    })

    it('should return true with sourceEntry', () => {
      const bindingWithSource = {
        binding: { id: 'b1', source: 'framework_entry', sourcePath: 'x', targetFieldId: 'y' },
        value: 'test',
        success: true,
        usedFallback: false,
        sourceEntry: {
          templateId: 'cc-values',
          journalId: 'journal-123',
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
          values: { core_values: ['test'] },
        },
      }

      expect(isResolvedBinding(bindingWithSource)).toBe(true)
    })

    it('should return false for invalid resolved bindings', () => {
      // Missing binding
      expect(
        isResolvedBinding({
          value: 'test',
          success: true,
          usedFallback: false,
        })
      ).toBe(false)

      // binding is null
      expect(
        isResolvedBinding({
          binding: null,
          value: 'test',
          success: true,
          usedFallback: false,
        })
      ).toBe(false)

      // Missing success
      expect(
        isResolvedBinding({
          binding: { id: 'b1' },
          value: 'test',
          usedFallback: false,
        })
      ).toBe(false)

      // Missing usedFallback
      expect(
        isResolvedBinding({
          binding: { id: 'b1' },
          value: 'test',
          success: true,
        })
      ).toBe(false)

      // success not boolean
      expect(
        isResolvedBinding({
          binding: { id: 'b1' },
          value: 'test',
          success: 'true',
          usedFallback: false,
        })
      ).toBe(false)
    })

    it('should return false for non-objects', () => {
      expect(isResolvedBinding(null)).toBe(false)
      expect(isResolvedBinding(undefined)).toBe(false)
      expect(isResolvedBinding('binding')).toBe(false)
      expect(isResolvedBinding(123)).toBe(false)
      expect(isResolvedBinding([])).toBe(false)
    })
  })

  describe('isBindingResolutionError', () => {
    it('should return true for valid resolution errors', () => {
      const validError = {
        bindingId: 'binding-1',
        targetFieldId: 'field-1',
        message: 'Source not found',
        code: 'SOURCE_NOT_FOUND',
      }

      expect(isBindingResolutionError(validError)).toBe(true)
    })

    it('should return true for complete resolution errors', () => {
      const completeError = {
        bindingId: 'binding-2',
        targetFieldId: 'field-2',
        message: 'Path does not exist in source',
        code: 'PATH_NOT_FOUND',
        sourcePath: 'values.nonexistent',
      }

      expect(isBindingResolutionError(completeError)).toBe(true)
    })

    it('should return true for all error codes', () => {
      const errorCodes = [
        'SOURCE_NOT_FOUND',
        'PATH_NOT_FOUND',
        'TRANSFORM_ERROR',
        'TYPE_MISMATCH',
        'REQUIRED_MISSING',
        'INVALID_EXPRESSION',
        'CIRCULAR_REFERENCE',
      ]

      errorCodes.forEach((code) => {
        const error = {
          bindingId: 'b1',
          targetFieldId: 'f1',
          message: 'Test error',
          code,
        }
        expect(isBindingResolutionError(error)).toBe(true)
      })
    })

    it('should return false for invalid resolution errors', () => {
      // Missing bindingId
      expect(
        isBindingResolutionError({
          targetFieldId: 'f1',
          message: 'Error',
          code: 'SOURCE_NOT_FOUND',
        })
      ).toBe(false)

      // Missing targetFieldId
      expect(
        isBindingResolutionError({
          bindingId: 'b1',
          message: 'Error',
          code: 'SOURCE_NOT_FOUND',
        })
      ).toBe(false)

      // Missing message
      expect(
        isBindingResolutionError({
          bindingId: 'b1',
          targetFieldId: 'f1',
          code: 'SOURCE_NOT_FOUND',
        })
      ).toBe(false)

      // Missing code
      expect(
        isBindingResolutionError({
          bindingId: 'b1',
          targetFieldId: 'f1',
          message: 'Error',
        })
      ).toBe(false)

      // bindingId not string
      expect(
        isBindingResolutionError({
          bindingId: 123,
          targetFieldId: 'f1',
          message: 'Error',
          code: 'SOURCE_NOT_FOUND',
        })
      ).toBe(false)
    })

    it('should return false for non-objects', () => {
      expect(isBindingResolutionError(null)).toBe(false)
      expect(isBindingResolutionError(undefined)).toBe(false)
      expect(isBindingResolutionError('error')).toBe(false)
      expect(isBindingResolutionError(123)).toBe(false)
      expect(isBindingResolutionError([])).toBe(false)
    })
  })

  describe('isBindingErrorCode', () => {
    it('should return true for valid error codes', () => {
      const validCodes = [
        'SOURCE_NOT_FOUND',
        'PATH_NOT_FOUND',
        'TRANSFORM_ERROR',
        'TYPE_MISMATCH',
        'REQUIRED_MISSING',
        'INVALID_EXPRESSION',
        'CIRCULAR_REFERENCE',
      ]

      validCodes.forEach((code) => {
        expect(isBindingErrorCode(code)).toBe(true)
      })
    })

    it('should return false for invalid error codes', () => {
      expect(isBindingErrorCode('UNKNOWN_ERROR')).toBe(false)
      expect(isBindingErrorCode('ERROR')).toBe(false)
      expect(isBindingErrorCode('source_not_found')).toBe(false)
      expect(isBindingErrorCode('')).toBe(false)
      expect(isBindingErrorCode(null)).toBe(false)
      expect(isBindingErrorCode(undefined)).toBe(false)
      expect(isBindingErrorCode(123)).toBe(false)
      expect(isBindingErrorCode({})).toBe(false)
    })
  })

  describe('isFrameworkEntryData', () => {
    it('should return true for valid framework entry data', () => {
      const validEntry = {
        templateId: 'cc-values-discovery',
        journalId: 'journal-123',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-15T12:00:00Z',
        values: {
          core_values: ['integrity', 'growth', 'creativity'],
          life_areas: ['career', 'relationships'],
        },
      }

      expect(isFrameworkEntryData(validEntry)).toBe(true)
    })

    it('should return true with empty values', () => {
      const entryWithEmptyValues = {
        templateId: 'cc-daily-checkin',
        journalId: 'journal-456',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        values: {},
      }

      expect(isFrameworkEntryData(entryWithEmptyValues)).toBe(true)
    })

    it('should return false for invalid framework entry data', () => {
      // Missing templateId
      expect(
        isFrameworkEntryData({
          journalId: 'j1',
          createdAt: '2024-01-01',
          updatedAt: '2024-01-01',
          values: {},
        })
      ).toBe(false)

      // Missing journalId
      expect(
        isFrameworkEntryData({
          templateId: 't1',
          createdAt: '2024-01-01',
          updatedAt: '2024-01-01',
          values: {},
        })
      ).toBe(false)

      // Missing createdAt
      expect(
        isFrameworkEntryData({
          templateId: 't1',
          journalId: 'j1',
          updatedAt: '2024-01-01',
          values: {},
        })
      ).toBe(false)

      // Missing updatedAt
      expect(
        isFrameworkEntryData({
          templateId: 't1',
          journalId: 'j1',
          createdAt: '2024-01-01',
          values: {},
        })
      ).toBe(false)

      // Missing values
      expect(
        isFrameworkEntryData({
          templateId: 't1',
          journalId: 'j1',
          createdAt: '2024-01-01',
          updatedAt: '2024-01-01',
        })
      ).toBe(false)

      // values is null
      expect(
        isFrameworkEntryData({
          templateId: 't1',
          journalId: 'j1',
          createdAt: '2024-01-01',
          updatedAt: '2024-01-01',
          values: null,
        })
      ).toBe(false)

      // values is not an object
      expect(
        isFrameworkEntryData({
          templateId: 't1',
          journalId: 'j1',
          createdAt: '2024-01-01',
          updatedAt: '2024-01-01',
          values: 'not an object',
        })
      ).toBe(false)
    })

    it('should return false for non-objects', () => {
      expect(isFrameworkEntryData(null)).toBe(false)
      expect(isFrameworkEntryData(undefined)).toBe(false)
      expect(isFrameworkEntryData('entry')).toBe(false)
      expect(isFrameworkEntryData(123)).toBe(false)
      expect(isFrameworkEntryData([])).toBe(false)
    })
  })

  describe('isCapturedOutputs', () => {
    it('should return true for valid captured outputs', () => {
      const validOutputs = {
        templateId: 'cc-values-discovery',
        journalId: 'journal-123',
        capturedAt: '2024-01-01T00:00:00Z',
        values: {
          core_values: ['integrity', 'growth'],
          primary_value: 'integrity',
        },
      }

      expect(isCapturedOutputs(validOutputs)).toBe(true)
    })

    it('should return true with empty values', () => {
      const emptyOutputs = {
        templateId: 'cc-daily-checkin',
        journalId: 'journal-456',
        capturedAt: '2024-01-01T00:00:00Z',
        values: {},
      }

      expect(isCapturedOutputs(emptyOutputs)).toBe(true)
    })

    it('should return false for invalid captured outputs', () => {
      // Missing templateId
      expect(
        isCapturedOutputs({
          journalId: 'j1',
          capturedAt: '2024-01-01',
          values: {},
        })
      ).toBe(false)

      // Missing journalId
      expect(
        isCapturedOutputs({
          templateId: 't1',
          capturedAt: '2024-01-01',
          values: {},
        })
      ).toBe(false)

      // Missing capturedAt
      expect(
        isCapturedOutputs({
          templateId: 't1',
          journalId: 'j1',
          values: {},
        })
      ).toBe(false)

      // Missing values
      expect(
        isCapturedOutputs({
          templateId: 't1',
          journalId: 'j1',
          capturedAt: '2024-01-01',
        })
      ).toBe(false)

      // values is null
      expect(
        isCapturedOutputs({
          templateId: 't1',
          journalId: 'j1',
          capturedAt: '2024-01-01',
          values: null,
        })
      ).toBe(false)
    })

    it('should return false for non-objects', () => {
      expect(isCapturedOutputs(null)).toBe(false)
      expect(isCapturedOutputs(undefined)).toBe(false)
      expect(isCapturedOutputs('outputs')).toBe(false)
      expect(isCapturedOutputs(123)).toBe(false)
      expect(isCapturedOutputs([])).toBe(false)
    })
  })
})
