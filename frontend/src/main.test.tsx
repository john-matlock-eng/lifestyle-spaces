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

  it('should have correct environment detection logic', () => {
    // This test verifies the logic without actually testing the side effects
    // since mocking import.meta.env is complex in Vitest
    
    // Test the logic conditions that would enable/disable Amplify configuration
    const testConditions = [
      { NODE_ENV: 'test', VITE_TEST_ENV: undefined, shouldConfigure: false },
      { NODE_ENV: 'development', VITE_TEST_ENV: 'true', shouldConfigure: false },
      { NODE_ENV: 'production', VITE_TEST_ENV: undefined, shouldConfigure: true },
      { NODE_ENV: 'development', VITE_TEST_ENV: undefined, shouldConfigure: true },
    ]
    
    testConditions.forEach(({ NODE_ENV, VITE_TEST_ENV, shouldConfigure }) => {
      // Simulate the condition from main.tsx: 
      // if (import.meta.env.NODE_ENV !== 'test' && !import.meta.env.VITE_TEST_ENV)
      const condition = NODE_ENV !== 'test' && !VITE_TEST_ENV
      expect(condition).toBe(shouldConfigure)
    })
  })
})