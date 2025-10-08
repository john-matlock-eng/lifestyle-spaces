import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createApiService } from './api'
import type { ApiService } from './api'

// Mock @aws-amplify/auth
vi.mock('@aws-amplify/auth', () => ({
  fetchAuthSession: vi.fn(),
}))

// Mock fetch globally
global.fetch = vi.fn()
const mockFetch = vi.mocked(fetch)

describe('ApiService', () => {
  let apiService: ApiService

  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv('VITE_API_URL', 'https://test-api.execute-api.us-east-1.amazonaws.com/prod')
    apiService = createApiService()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  describe('createApiService', () => {
    it('should create API service with configured base URL', () => {
      // Arrange
      vi.stubEnv('VITE_API_URL', 'https://custom-api.execute-api.us-east-1.amazonaws.com/prod')
      
      // Act
      const service = createApiService()
      
      // Assert
      expect(service.baseUrl).toBe('https://custom-api.execute-api.us-east-1.amazonaws.com/prod')
    })

    it('should create API service with localhost for development', () => {
      // Arrange
      vi.stubEnv('VITE_API_URL', undefined)
      
      // Act
      const service = createApiService()
      
      // Assert
      expect(service.baseUrl).toBe('http://localhost:8000')
    })
  })

  describe('get', () => {
    it('should make GET request with correct URL and headers', async () => {
      // Arrange
      const mockResponse = { data: 'test' }
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers(),
        json: async () => mockResponse,
      } as Response)

      // Act
      const result = await apiService.get('/test-endpoint')

      // Assert
      expect(mockFetch).toHaveBeenCalledWith(
        'https://test-api.execute-api.us-east-1.amazonaws.com/prod/test-endpoint',
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
        }
      )
      expect(result).toEqual(mockResponse)
    })

    it('should handle endpoint with leading slash', async () => {
      // Arrange
      const mockResponse = { data: 'test' }
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers(),
        json: async () => mockResponse,
      } as Response)

      // Act
      await apiService.get('/test-endpoint')

      // Assert
      expect(mockFetch).toHaveBeenCalledWith(
        'https://test-api.execute-api.us-east-1.amazonaws.com/prod/test-endpoint',
        expect.any(Object)
      )
    })

    it('should handle endpoint without leading slash', async () => {
      // Arrange
      const mockResponse = { data: 'test' }
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers(),
        json: async () => mockResponse,
      } as Response)

      // Act
      await apiService.get('test-endpoint')

      // Assert
      expect(mockFetch).toHaveBeenCalledWith(
        'https://test-api.execute-api.us-east-1.amazonaws.com/prod/test-endpoint',
        expect.any(Object)
      )
    })

    it('should throw error when response is not ok', async () => {
      // Arrange
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        text: async () => 'Not Found',
      } as Response)

      // Act & Assert
      await expect(apiService.get('/test-endpoint')).rejects.toThrow(
        'API request failed: 404 Not Found - Not Found'
      )
    })

    it('should throw error when network request fails', async () => {
      // Arrange
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      // Act & Assert
      await expect(apiService.get('/test-endpoint')).rejects.toThrow('Network error')
    })
  })

  describe('post', () => {
    it('should make POST request with data and correct headers', async () => {
      // Arrange
      const requestData = { name: 'test' }
      const mockResponse = { id: 1, name: 'test' }
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
        headers: new Headers(),
        json: async () => mockResponse,
      } as Response)

      // Act
      const result = await apiService.post('/test-endpoint', requestData)

      // Assert
      expect(mockFetch).toHaveBeenCalledWith(
        'https://test-api.execute-api.us-east-1.amazonaws.com/prod/test-endpoint',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          body: JSON.stringify(requestData),
        }
      )
      expect(result).toEqual(mockResponse)
    })

    it('should make POST request without body when data is undefined', async () => {
      // Arrange
      const mockResponse = { success: true }
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers(),
        json: async () => mockResponse,
      } as Response)

      // Act
      const result = await apiService.post('/test-endpoint')

      // Assert
      expect(mockFetch).toHaveBeenCalledWith(
        'https://test-api.execute-api.us-east-1.amazonaws.com/prod/test-endpoint',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
        }
      )
      expect(result).toEqual(mockResponse)
    })
  })

  describe('put', () => {
    it('should make PUT request with data', async () => {
      // Arrange
      const requestData = { id: 1, name: 'updated' }
      const mockResponse = { id: 1, name: 'updated' }
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers(),
        json: async () => mockResponse,
      } as Response)

      // Act
      const result = await apiService.put('/test-endpoint/1', requestData)

      // Assert
      expect(mockFetch).toHaveBeenCalledWith(
        'https://test-api.execute-api.us-east-1.amazonaws.com/prod/test-endpoint/1',
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          body: JSON.stringify(requestData),
        }
      )
      expect(result).toEqual(mockResponse)
    })
  })

  describe('delete', () => {
    it('should make DELETE request', async () => {
      // Arrange
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 204,
        headers: new Headers(),
        json: async () => ({}),
      } as Response)

      // Act
      const result = await apiService.delete('/test-endpoint/1')

      // Assert
      expect(mockFetch).toHaveBeenCalledWith(
        'https://test-api.execute-api.us-east-1.amazonaws.com/prod/test-endpoint/1',
        {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
        }
      )
      expect(result).toEqual({})
    })
  })

  describe('health check', () => {
    it('should perform health check on /health endpoint', async () => {
      // Arrange
      const mockResponse = { status: 'ok', timestamp: '2023-01-01T00:00:00Z' }
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers(),
        json: async () => mockResponse,
      } as Response)

      // Act
      const result = await apiService.healthCheck()

      // Assert
      expect(mockFetch).toHaveBeenCalledWith(
        'https://test-api.execute-api.us-east-1.amazonaws.com/prod/health',
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
        }
      )
      expect(result).toEqual(mockResponse)
    })
  })

  describe('authentication headers', () => {
    it('should include Authorization and X-ID-Token headers when authenticated', async () => {
      // Arrange
      const { fetchAuthSession } = await import('@aws-amplify/auth')
      const mockFetchAuthSession = vi.mocked(fetchAuthSession)

      mockFetchAuthSession.mockResolvedValueOnce({
        tokens: {
          accessToken: {
            toString: () => 'mock-access-token',
          },
          idToken: {
            toString: () => 'mock-id-token',
          },
        },
      } as any)

      const mockResponse = { data: 'test' }
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers(),
        json: async () => mockResponse,
      } as Response)

      // Act
      await apiService.get('/protected-endpoint')

      // Assert
      expect(mockFetch).toHaveBeenCalledWith(
        'https://test-api.execute-api.us-east-1.amazonaws.com/prod/protected-endpoint',
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': 'Bearer mock-access-token',
            'X-ID-Token': 'mock-id-token',
          },
        }
      )
    })

    it('should not include auth headers when not authenticated', async () => {
      // Arrange
      const { fetchAuthSession } = await import('@aws-amplify/auth')
      const mockFetchAuthSession = vi.mocked(fetchAuthSession)

      mockFetchAuthSession.mockRejectedValueOnce(new Error('Not authenticated'))

      const mockResponse = { data: 'test' }
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers(),
        json: async () => mockResponse,
      } as Response)

      // Act
      await apiService.get('/public-endpoint')

      // Assert
      expect(mockFetch).toHaveBeenCalledWith(
        'https://test-api.execute-api.us-east-1.amazonaws.com/prod/public-endpoint',
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
        }
      )
    })
  })
})