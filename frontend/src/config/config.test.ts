import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { getConfig, validateConfig, getValidatedConfig } from './index'

describe('Config System', () => {
  beforeEach(() => {
    // Clear any existing environment variables and mocks
    vi.unstubAllEnvs()
    vi.resetModules()
    vi.clearAllMocks()
  })

  afterEach(() => {
    // Clean up all environment variables and module state
    vi.unstubAllEnvs()
    vi.resetModules()
    vi.resetAllMocks()
  })

  describe('getConfig', () => {
    it('should return config with API URL from environment variable', () => {
      // Arrange
      vi.stubEnv('VITE_API_URL', 'https://test-api.execute-api.us-east-1.amazonaws.com/prod')
      
      // Act
      const config = getConfig()
      
      // Assert
      expect(config.apiUrl).toBe('https://test-api.execute-api.us-east-1.amazonaws.com/prod')
    })

    it('should return default localhost URL when VITE_API_URL is not set', () => {
      // Arrange
      vi.stubEnv('VITE_API_URL', undefined)
      
      // Act
      const config = getConfig()
      
      // Assert
      expect(config.apiUrl).toBe('http://localhost:8000')
    })

    it('should trim trailing slashes from API URL', () => {
      // Arrange
      vi.stubEnv('VITE_API_URL', 'https://test-api.execute-api.us-east-1.amazonaws.com/prod/')
      
      // Act
      const config = getConfig()
      
      // Assert
      expect(config.apiUrl).toBe('https://test-api.execute-api.us-east-1.amazonaws.com/prod')
    })

    it('should handle multiple trailing slashes', () => {
      // Arrange
      vi.stubEnv('VITE_API_URL', 'https://test-api.execute-api.us-east-1.amazonaws.com/prod///')
      
      // Act
      const config = getConfig()
      
      // Assert
      expect(config.apiUrl).toBe('https://test-api.execute-api.us-east-1.amazonaws.com/prod')
    })
  })

  describe('validateConfig', () => {
    it('should return true for valid AWS API Gateway URL', () => {
      // Arrange
      const config = { apiUrl: 'https://abc123.execute-api.us-east-1.amazonaws.com/prod' }
      
      // Act
      const isValid = validateConfig(config)
      
      // Assert
      expect(isValid).toBe(true)
    })

    it('should return true for valid localhost URL', () => {
      // Arrange
      const config = { apiUrl: 'http://localhost:8000' }
      
      // Act
      const isValid = validateConfig(config)
      
      // Assert
      expect(isValid).toBe(true)
    })

    it('should return true for valid localhost with port variation', () => {
      // Arrange
      const config = { apiUrl: 'http://localhost:3000' }
      
      // Act
      const isValid = validateConfig(config)
      
      // Assert
      expect(isValid).toBe(true)
    })

    it('should return false for invalid URL format', () => {
      // Arrange
      const config = { apiUrl: 'not-a-valid-url' }
      
      // Act
      const isValid = validateConfig(config)
      
      // Assert
      expect(isValid).toBe(false)
    })

    it('should return false for empty URL', () => {
      // Arrange
      const config = { apiUrl: '' }
      
      // Act
      const isValid = validateConfig(config)
      
      // Assert
      expect(isValid).toBe(false)
    })

    it('should return false for config without apiUrl property', () => {
      // Arrange
      const config = {} as { apiUrl?: string }
      
      // Act
      const isValid = validateConfig(config)
      
      // Assert
      expect(isValid).toBe(false)
    })
  })

  describe('Environment Detection', () => {
    it('should detect AWS environment from URL', () => {
      // Arrange
      vi.stubEnv('VITE_API_URL', 'https://abc123.execute-api.us-east-1.amazonaws.com/prod')
      
      // Act
      const config = getConfig()
      
      // Assert
      expect(config.isAWS).toBe(true)
      expect(config.isLocal).toBe(false)
    })

    it('should detect local environment from localhost URL', () => {
      // Arrange
      vi.stubEnv('VITE_API_URL', 'http://localhost:8000')
      
      // Act
      const config = getConfig()
      
      // Assert
      expect(config.isLocal).toBe(true)
      expect(config.isAWS).toBe(false)
    })

    it('should default to local environment when no URL provided', () => {
      // Arrange
      vi.stubEnv('VITE_API_URL', undefined)
      
      // Act
      const config = getConfig()
      
      // Assert
      expect(config.isLocal).toBe(true)
      expect(config.isAWS).toBe(false)
    })
  })

  describe('getValidatedConfig', () => {
    it('should return valid config when URL is valid', () => {
      // Arrange
      vi.stubEnv('VITE_API_URL', 'http://localhost:8000')
      
      // Act
      const config = getValidatedConfig()
      
      // Assert
      expect(config.apiUrl).toBe('http://localhost:8000')
      expect(config.isLocal).toBe(true)
    })

    it('should throw error when configuration is invalid', () => {
      // Set up environment that will create an invalid URL to test error throwing (lines 67-71)
      vi.stubEnv('VITE_API_URL', 'not-a-valid-url')
      
      // Act & Assert - this should throw because 'not-a-valid-url' is not a valid URL format
      expect(() => getValidatedConfig()).toThrow(
        'Invalid configuration: API URL "not-a-valid-url" is not a valid URL. Please check your VITE_API_URL environment variable.'
      )
    })
  })
})