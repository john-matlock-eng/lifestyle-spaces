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

  it('should display AWS environment when configured for AWS', async () => {
    render(<App />)
    
    await waitFor(() => {
      expect(screen.getByText('https://abc123.execute-api.us-east-1.amazonaws.com/prod')).toBeInTheDocument()
      expect(screen.getByText('AWS')).toBeInTheDocument()
      expect(screen.queryByText('Local')).not.toBeInTheDocument()
    })
  })
})