/**
 * Tests for Amplify configuration
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getAmplifyConfig, validateAmplifyConfig, getValidatedAmplifyConfig } from './amplify'

describe('getAmplifyConfig', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Clear any stubbed environment variables
    vi.unstubAllEnvs()
  })

  it('should return valid config with all required environment variables', () => {
    vi.stubEnv('VITE_COGNITO_USER_POOL_ID', 'us-east-1_ABC123DEF')
    vi.stubEnv('VITE_COGNITO_USER_POOL_CLIENT_ID', '1234567890abcdefghijk')
    vi.stubEnv('VITE_AWS_REGION', 'us-east-1')
    vi.stubEnv('VITE_API_URL', 'https://api.example.com')

    const config = getAmplifyConfig()

    expect(config).toEqual({
      Auth: {
        Cognito: {
          userPoolId: 'us-east-1_ABC123DEF',
          userPoolClientId: '1234567890abcdefghijk',
          region: 'us-east-1',
          signUpVerificationMethod: 'code',
          loginWith: {
            email: true
          }
        }
      },
      API: {
        REST: {
          default: {
            endpoint: 'https://api.example.com',
            region: 'us-east-1'
          }
        }
      }
    })
  })

  it('should use default region when not specified', () => {
    vi.stubEnv('VITE_COGNITO_USER_POOL_ID', 'us-east-1_ABC123DEF')
    vi.stubEnv('VITE_COGNITO_USER_POOL_CLIENT_ID', '1234567890abcdefghijk')
    vi.stubEnv('VITE_API_URL', 'https://api.example.com')

    const config = getAmplifyConfig()

    expect(config.Auth.Cognito.region).toBe('us-east-1')
    expect(config.API.REST.default.region).toBe('us-east-1')
  })

  it('should use default API URL when not specified', () => {
    vi.stubEnv('VITE_COGNITO_USER_POOL_ID', 'us-east-1_ABC123DEF')
    vi.stubEnv('VITE_COGNITO_USER_POOL_CLIENT_ID', '1234567890abcdefghijk')
    vi.stubEnv('VITE_AWS_REGION', 'us-west-2')

    const config = getAmplifyConfig()

    expect(config.API.REST.default.endpoint).toBe('http://localhost:8000')
  })

  it('should remove trailing slashes from API URL', () => {
    vi.stubEnv('VITE_COGNITO_USER_POOL_ID', 'us-east-1_ABC123DEF')
    vi.stubEnv('VITE_COGNITO_USER_POOL_CLIENT_ID', '1234567890abcdefghijk')
    vi.stubEnv('VITE_API_URL', 'https://api.example.com///')

    const config = getAmplifyConfig()

    expect(config.API.REST.default.endpoint).toBe('https://api.example.com')
  })

  it('should throw error when user pool ID is missing', () => {
    vi.stubEnv('VITE_COGNITO_USER_POOL_CLIENT_ID', '1234567890abcdefghijk')
    vi.stubEnv('VITE_API_URL', 'https://api.example.com')

    expect(() => getAmplifyConfig()).toThrow('VITE_COGNITO_USER_POOL_ID environment variable is required')
  })

  it('should throw error when user pool client ID is missing', () => {
    vi.stubEnv('VITE_COGNITO_USER_POOL_ID', 'us-east-1_ABC123DEF')
    vi.stubEnv('VITE_API_URL', 'https://api.example.com')

    expect(() => getAmplifyConfig()).toThrow('VITE_COGNITO_USER_POOL_CLIENT_ID environment variable is required')
  })
})

describe('validateAmplifyConfig', () => {
  it('should return true for valid config', () => {
    const config = {
      Auth: {
        Cognito: {
          userPoolId: 'us-east-1_ABC123DEF',
          userPoolClientId: '1234567890abcdefghijk',
          region: 'us-east-1',
          signUpVerificationMethod: 'code' as const,
          loginWith: {
            email: true
          }
        }
      },
      API: {
        REST: {
          default: {
            endpoint: 'https://api.example.com',
            region: 'us-east-1'
          }
        }
      }
    }

    expect(validateAmplifyConfig(config)).toBe(true)
  })

  it('should return false when user pool ID is missing', () => {
    const config = {
      Auth: {
        Cognito: {
          userPoolClientId: '1234567890abcdefghijk',
          region: 'us-east-1',
          signUpVerificationMethod: 'code' as const,
          loginWith: {
            email: true
          }
        }
      },
      API: {
        REST: {
          default: {
            endpoint: 'https://api.example.com',
            region: 'us-east-1'
          }
        }
      }
    }

    expect(validateAmplifyConfig(config)).toBe(false)
  })

  it('should return false when user pool client ID is missing', () => {
    const config = {
      Auth: {
        Cognito: {
          userPoolId: 'us-east-1_ABC123DEF',
          region: 'us-east-1',
          signUpVerificationMethod: 'code' as const,
          loginWith: {
            email: true
          }
        }
      },
      API: {
        REST: {
          default: {
            endpoint: 'https://api.example.com',
            region: 'us-east-1'
          }
        }
      }
    }

    expect(validateAmplifyConfig(config)).toBe(false)
  })

  it('should return false when region is missing', () => {
    const config = {
      Auth: {
        Cognito: {
          userPoolId: 'us-east-1_ABC123DEF',
          userPoolClientId: '1234567890abcdefghijk',
          signUpVerificationMethod: 'code' as const,
          loginWith: {
            email: true
          }
        }
      },
      API: {
        REST: {
          default: {
            endpoint: 'https://api.example.com',
            region: 'us-east-1'
          }
        }
      }
    }

    expect(validateAmplifyConfig(config)).toBe(false)
  })

  it('should return false when API endpoint is missing', () => {
    const config = {
      Auth: {
        Cognito: {
          userPoolId: 'us-east-1_ABC123DEF',
          userPoolClientId: '1234567890abcdefghijk',
          region: 'us-east-1',
          signUpVerificationMethod: 'code' as const,
          loginWith: {
            email: true
          }
        }
      },
      API: {
        REST: {
          default: {
            region: 'us-east-1'
          }
        }
      }
    }

    expect(validateAmplifyConfig(config)).toBe(false)
  })

  it('should return false when API endpoint is invalid URL', () => {
    const config = {
      Auth: {
        Cognito: {
          userPoolId: 'us-east-1_ABC123DEF',
          userPoolClientId: '1234567890abcdefghijk',
          region: 'us-east-1',
          signUpVerificationMethod: 'code' as const,
          loginWith: {
            email: true
          }
        }
      },
      API: {
        REST: {
          default: {
            endpoint: 'not-a-valid-url',
            region: 'us-east-1'
          }
        }
      }
    }

    expect(validateAmplifyConfig(config)).toBe(false)
  })

  it('should return true for localhost URLs', () => {
    const config = {
      Auth: {
        Cognito: {
          userPoolId: 'us-east-1_ABC123DEF',
          userPoolClientId: '1234567890abcdefghijk',
          region: 'us-east-1',
          signUpVerificationMethod: 'code' as const,
          loginWith: {
            email: true
          }
        }
      },
      API: {
        REST: {
          default: {
            endpoint: 'http://localhost:8000',
            region: 'us-east-1'
          }
        }
      }
    }

    expect(validateAmplifyConfig(config)).toBe(true)
  })
})

describe('getValidatedAmplifyConfig', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.unstubAllEnvs()
  })

  it('should return config when validation passes', () => {
    vi.stubEnv('VITE_COGNITO_USER_POOL_ID', 'us-east-1_ABC123DEF')
    vi.stubEnv('VITE_COGNITO_USER_POOL_CLIENT_ID', '1234567890abcdefghijk')
    vi.stubEnv('VITE_AWS_REGION', 'us-east-1')
    vi.stubEnv('VITE_API_URL', 'https://api.example.com')

    const config = getValidatedAmplifyConfig()

    expect(config).toBeDefined()
    expect(config.Auth.Cognito.userPoolId).toBe('us-east-1_ABC123DEF')
  })

  it('should throw error when validation fails', () => {
    vi.stubEnv('VITE_COGNITO_USER_POOL_ID', 'us-east-1_ABC123DEF')
    vi.stubEnv('VITE_API_URL', 'not-a-valid-url')

    expect(() => getValidatedAmplifyConfig()).toThrow('VITE_COGNITO_USER_POOL_CLIENT_ID environment variable is required')
  })

  it('should throw descriptive error message for invalid config', () => {
    vi.stubEnv('VITE_COGNITO_USER_POOL_ID', 'us-east-1_ABC123DEF')
    vi.stubEnv('VITE_COGNITO_USER_POOL_CLIENT_ID', '1234567890abcdefghijk')
    vi.stubEnv('VITE_API_URL', 'not-a-valid-url')

    expect(() => getValidatedAmplifyConfig()).toThrow(
      'Invalid Amplify configuration. Please check your environment variables: ' +
      'VITE_COGNITO_USER_POOL_ID, VITE_COGNITO_USER_POOL_CLIENT_ID, VITE_AWS_REGION, VITE_API_URL'
    )
  })
})