import { getValidatedConfig } from '../config'
import { fetchAuthSession } from '@aws-amplify/auth'

/**
 * API Error class for handling API-specific errors
 */
export class ApiError extends Error {
  public readonly status: number
  public readonly statusText: string
  
  constructor(message: string, status: number, statusText: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.statusText = statusText
  }
}

/**
 * API Service interface
 */
export interface ApiService {
  baseUrl: string
  get<T = unknown>(endpoint: string): Promise<T>
  post<T = unknown>(endpoint: string, data?: unknown): Promise<T>
  put<T = unknown>(endpoint: string, data: unknown): Promise<T>
  delete<T = unknown>(endpoint: string): Promise<T>
  healthCheck(): Promise<{ status: string; timestamp: string }>
}

/**
 * HTTP request options interface
 */
interface RequestOptions extends RequestInit {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE'
  headers: Record<string, string>
}

/**
 * Creates an API service instance with the configured base URL
 */
class ApiServiceImpl implements ApiService {
  public readonly baseUrl: string

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl
  }

  /**
   * Makes an HTTP request to the API
   * @param endpoint - API endpoint (with or without leading slash)
   * @param options - Request options
   * @returns Promise resolving to the response data
   */
  private async request<T>(endpoint: string, options: RequestOptions): Promise<T> {
    // Normalize endpoint to ensure proper URL construction
    const normalizedEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint
    const url = `${this.baseUrl}/${normalizedEndpoint}`

    try {
      const response = await fetch(url, options)

      if (!response.ok) {
        const errorText = await response.text()
        throw new ApiError(
          `API request failed: ${response.status} ${response.statusText} - ${errorText}`,
          response.status,
          response.statusText
        )
      }

      // Handle empty responses (e.g., 204 No Content)
      if (response.status === 204 || response.headers.get('content-length') === '0') {
        return {} as T
      }

      return await response.json()
    } catch (error) {
      if (error instanceof ApiError) {
        throw error
      }
      
      // Re-throw network errors or other fetch failures
      throw error
    }
  }

  /**
   * Default headers for all API requests
   */
  private async getDefaultHeaders(): Promise<Record<string, string>> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    }

    // Try to get the auth tokens from AWS Amplify
    try {
      const session = await fetchAuthSession()
      const accessToken = session.tokens?.accessToken?.toString()
      const idToken = session.tokens?.idToken?.toString()

      if (accessToken) {
        headers['Authorization'] = `Bearer ${accessToken}`
      }

      // Add ID token header for custom Cognito attributes
      if (idToken) {
        headers['X-ID-Token'] = idToken
      }
    } catch {
      // User is not authenticated, continue without auth headers
    }

    return headers
  }

  /**
   * Makes a GET request
   * @param endpoint - API endpoint
   * @returns Promise resolving to the response data
   */
  async get<T = unknown>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'GET',
      headers: await this.getDefaultHeaders(),
    })
  }

  /**
   * Makes a POST request
   * @param endpoint - API endpoint
   * @param data - Request data (optional)
   * @returns Promise resolving to the response data
   */
  async post<T = unknown>(endpoint: string, data?: unknown): Promise<T> {
    const options: RequestOptions = {
      method: 'POST',
      headers: await this.getDefaultHeaders(),
    }

    if (data !== undefined) {
      options.body = JSON.stringify(data)
    }

    return this.request<T>(endpoint, options)
  }

  /**
   * Makes a PUT request
   * @param endpoint - API endpoint
   * @param data - Request data
   * @returns Promise resolving to the response data
   */
  async put<T = unknown>(endpoint: string, data: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      headers: await this.getDefaultHeaders(),
      body: JSON.stringify(data),
    })
  }

  /**
   * Makes a DELETE request
   * @param endpoint - API endpoint
   * @returns Promise resolving to the response data
   */
  async delete<T = unknown>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'DELETE',
      headers: await this.getDefaultHeaders(),
    })
  }

  /**
   * Performs a health check on the API
   * @returns Promise resolving to health check response
   */
  async healthCheck(): Promise<{ status: string; timestamp: string }> {
    return this.get<{ status: string; timestamp: string }>('/health')
  }
}

/**
 * Creates and returns a new API service instance
 * @returns ApiService instance configured with the current environment
 */
export function createApiService(): ApiService {
  const config = getValidatedConfig()
  return new ApiServiceImpl(config.apiUrl)
}

/**
 * Pre-configured API service instance
 * Use this for most API calls in your application
 * 
 * Usage examples:
 * - await apiService.get('/users')
 * - await apiService.post('/users', { name: 'John' })
 * - await apiService.healthCheck()
 */
export const apiService = createApiService()