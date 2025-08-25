/**
 * Configuration interface for the application
 */
export interface AppConfig {
  apiUrl: string
  isAWS: boolean
  isLocal: boolean
}

/**
 * Default configuration values
 */
const DEFAULT_CONFIG = {
  LOCAL_API_URL: 'http://localhost:8000',
} as const

/**
 * Gets the application configuration based on environment variables
 * @returns AppConfig object with resolved configuration
 */
export function getConfig(): AppConfig {
  // Get API URL from environment variable or use default
  const rawApiUrl = import.meta.env.VITE_API_URL || DEFAULT_CONFIG.LOCAL_API_URL
  
  // Clean up the API URL by removing trailing slashes
  const apiUrl = rawApiUrl.replace(/\/+$/, '')
  
  // Determine environment type
  const isAWS = apiUrl.includes('execute-api') && apiUrl.includes('amazonaws.com')
  const isLocal = apiUrl.includes('localhost') || apiUrl.includes('127.0.0.1')
  
  return {
    apiUrl,
    isAWS,
    isLocal,
  }
}

/**
 * Validates that the configuration is properly set up
 * @param config - Configuration object to validate
 * @returns true if configuration is valid, false otherwise
 */
export function validateConfig(config: Partial<AppConfig>): config is AppConfig {
  if (!config.apiUrl || typeof config.apiUrl !== 'string') {
    return false
  }
  
  // Basic URL validation
  try {
    new URL(config.apiUrl)
    return true
  } catch {
    return false
  }
}

/**
 * Gets validated configuration with error handling
 * @throws Error if configuration is invalid
 * @returns Validated AppConfig object
 */
export function getValidatedConfig(): AppConfig {
  const config = getConfig()
  
  if (!validateConfig(config)) {
    throw new Error(
      `Invalid configuration: API URL "${(config as { apiUrl?: string }).apiUrl || 'undefined'}" is not a valid URL. ` +
      'Please check your VITE_API_URL environment variable.'
    )
  }
  
  return config
}

/**
 * Pre-configured application configuration
 */
export const config = getValidatedConfig()