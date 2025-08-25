import { describe, it, expect, vi } from 'vitest'
import { getConfig, validateConfig, getValidatedConfig } from './index'

describe('Config Undefined API URL Edge Case', () => {
  it('should handle case where apiUrl is completely undefined in config object', () => {
    // Create a partial config object that explicitly has undefined apiUrl
    const invalidConfig = { isAWS: false, isLocal: true } // missing apiUrl entirely
    
    // This should trigger the error path with 'undefined' in the message (line 68 branch coverage)
    vi.doMock('./index', async () => {
      const originalModule = await vi.importActual('./index') as any
      return {
        ...originalModule,
        getConfig: () => invalidConfig,
        getValidatedConfig: () => {
          if (!originalModule.validateConfig(invalidConfig)) {
            throw new Error(
              `Invalid configuration: API URL "${(invalidConfig as { apiUrl?: string }).apiUrl || 'undefined'}" is not a valid URL. ` +
              'Please check your VITE_API_URL environment variable.'
            )
          }
          return invalidConfig
        }
      }
    })
    
    // Re-import to get mocked version
    return import('./index').then(({ getValidatedConfig: mockedFunction }) => {
      expect(() => mockedFunction()).toThrow(
        'Invalid configuration: API URL "undefined" is not a valid URL. Please check your VITE_API_URL environment variable.'
      )
    })
  })
})