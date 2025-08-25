/**
 * Tests for main.tsx Amplify initialization
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock AWS Amplify before importing main
vi.mock('aws-amplify', () => ({
  Amplify: {
    configure: vi.fn()
  }
}))

// Mock the amplify config
vi.mock('./config/amplify', () => ({
  getValidatedAmplifyConfig: vi.fn()
}))

describe('main.tsx', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.unstubAllEnvs()
    
    // Mock DOM methods
    Object.defineProperty(document, 'getElementById', {
      writable: true,
      value: vi.fn().mockReturnValue({})
    })
    
    // Mock createRoot
    vi.mock('react-dom/client', () => ({
      createRoot: vi.fn().mockReturnValue({
        render: vi.fn()
      })
    }))
  })

  it('should skip Amplify configuration in test environment', async () => {
    // Set test environment
    vi.stubEnv('NODE_ENV', 'test')
    
    const { Amplify } = await import('aws-amplify')
    
    // Import main to trigger initialization
    await import('./main')
    
    expect(Amplify.configure).not.toHaveBeenCalled()
  })

  it('should skip Amplify configuration when VITE_TEST_ENV is set', async () => {
    // Clear NODE_ENV and set VITE_TEST_ENV
    vi.stubEnv('NODE_ENV', 'development')
    vi.stubEnv('VITE_TEST_ENV', 'true')
    
    const { Amplify } = await import('aws-amplify')
    
    // Import main to trigger initialization  
    await import('./main')
    
    expect(Amplify.configure).not.toHaveBeenCalled()
  })

  it('should configure Amplify in non-test environment', async () => {
    // Clear test environment variables
    vi.stubEnv('NODE_ENV', 'production')
    vi.unstubAllEnvs()
    
    const { Amplify } = await import('aws-amplify')
    const { getValidatedAmplifyConfig } = await import('./config/amplify')
    
    const mockConfig = {
      Auth: {
        Cognito: {
          userPoolId: 'test-pool-id',
          userPoolClientId: 'test-client-id',
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
            endpoint: 'https://api.test.com',
            region: 'us-east-1'
          }
        }
      }
    }
    
    vi.mocked(getValidatedAmplifyConfig).mockReturnValue(mockConfig)
    
    // Import main to trigger initialization
    await import('./main')
    
    expect(getValidatedAmplifyConfig).toHaveBeenCalled()
    expect(Amplify.configure).toHaveBeenCalledWith(mockConfig)
  })
})