import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock the environment to have an invalid URL that will trigger the error
vi.stubEnv('VITE_API_URL', 'invalid-url-that-will-fail')

import { getValidatedConfig } from './index'

describe('Config Validation Error Cases', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('should throw error when configuration is invalid - covering lines 67-71', () => {
    // The stubbed environment variable 'invalid-url-that-will-fail' should trigger
    // the validation error in getValidatedConfig, covering lines 67-71
    expect(() => getValidatedConfig()).toThrow(
      'Invalid configuration: API URL "invalid-url-that-will-fail" is not a valid URL. Please check your VITE_API_URL environment variable.'
    )
  })
})