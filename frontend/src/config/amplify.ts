/**
 * AWS Amplify configuration for Cognito integration
 */

export interface AmplifyConfig {
  Auth: {
    Cognito: {
      userPoolId: string
      userPoolClientId: string
      region: string
      signUpVerificationMethod: 'code'
      loginWith: {
        email: boolean
      }
    }
  }
  API: {
    REST: {
      [key: string]: {
        endpoint: string
        region: string
      }
    }
  }
}

/**
 * Gets the Amplify configuration based on environment variables
 * @returns AmplifyConfig object with resolved configuration
 */
export function getAmplifyConfig(): AmplifyConfig {
  const userPoolId = import.meta.env.VITE_COGNITO_USER_POOL_ID
  const userPoolClientId = import.meta.env.VITE_COGNITO_USER_POOL_CLIENT_ID
  const region = import.meta.env.VITE_AWS_REGION || 'us-east-1'
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000'

  if (!userPoolId) {
    throw new Error('VITE_COGNITO_USER_POOL_ID environment variable is required')
  }

  if (!userPoolClientId) {
    throw new Error('VITE_COGNITO_USER_POOL_CLIENT_ID environment variable is required')
  }

  return {
    Auth: {
      Cognito: {
        userPoolId,
        userPoolClientId,
        region,
        signUpVerificationMethod: 'code',
        loginWith: {
          email: true
        }
      }
    },
    API: {
      REST: {
        default: {
          endpoint: apiUrl.replace(/\/+$/, ''), // Remove trailing slashes
          region
        }
      }
    }
  }
}

/**
 * Validates that the Amplify configuration is properly set up
 * @param config - Configuration object to validate
 * @returns true if configuration is valid, false otherwise
 */
export function validateAmplifyConfig(config: Partial<AmplifyConfig>): config is AmplifyConfig {
  if (!config.Auth?.Cognito?.userPoolId || typeof config.Auth.Cognito.userPoolId !== 'string') {
    return false
  }
  
  if (!config.Auth?.Cognito?.userPoolClientId || typeof config.Auth.Cognito.userPoolClientId !== 'string') {
    return false
  }
  
  if (!config.Auth?.Cognito?.region || typeof config.Auth.Cognito.region !== 'string') {
    return false
  }

  if (!config.API?.REST?.default?.endpoint || typeof config.API.REST.default.endpoint !== 'string') {
    return false
  }

  // Basic URL validation for API endpoint
  try {
    new URL(config.API.REST.default.endpoint)
    return true
  } catch {
    return false
  }
}

/**
 * Gets validated Amplify configuration with error handling
 * @throws Error if configuration is invalid
 * @returns Validated AmplifyConfig object
 */
export function getValidatedAmplifyConfig(): AmplifyConfig {
  const config = getAmplifyConfig()
  
  if (!validateAmplifyConfig(config)) {
    throw new Error(
      'Invalid Amplify configuration. Please check your environment variables: ' +
      'VITE_COGNITO_USER_POOL_ID, VITE_COGNITO_USER_POOL_CLIENT_ID, VITE_AWS_REGION, VITE_API_URL'
    )
  }
  
  return config
}