import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import App from './App'

// Mock the API service for AWS tests
vi.mock('./services/api', () => ({
  apiService: {
    healthCheck: vi.fn()
  }
}))

// Mock the config to simulate AWS environment (line 55 coverage)
vi.mock('./config', () => ({
  config: {
    apiUrl: 'https://abc123.execute-api.us-east-1.amazonaws.com/prod',
    isAWS: true,
    isLocal: false
  }
}))

import { apiService } from './services/api'
const mockApiService = vi.mocked(apiService)

describe('App Component - AWS Environment', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Default successful health check mock
    mockApiService.healthCheck.mockResolvedValue({
      status: 'ok',
      timestamp: '2023-01-01T00:00:00Z'
    })
  })

  it('should render successfully when configured for AWS', async () => {
    render(<App />)
    
    // The app should render the sign-in form when not authenticated
    await waitFor(() => {
      expect(screen.getByText('Lifestyle Spaces')).toBeInTheDocument()
      expect(screen.getByText('Sign In')).toBeInTheDocument()
      expect(screen.getByLabelText(/Email Address/)).toBeInTheDocument()
    })
    
    // Verify that health check was called with mocked API service
    expect(mockApiService.healthCheck).not.toHaveBeenCalled() // Health check only happens on dashboard
  })
})