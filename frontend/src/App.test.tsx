import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App'

// Mock the API service
vi.mock('./services/api', () => ({
  apiService: {
    healthCheck: vi.fn()
  }
}))

// Mock the config
vi.mock('./config', () => ({
  config: {
    apiUrl: 'http://localhost:8000',
    isAWS: false,
    isLocal: true
  }
}))

import { apiService } from './services/api'
const mockApiService = vi.mocked(apiService)

describe('App Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Default successful health check mock
    mockApiService.healthCheck.mockResolvedValue({
      status: 'ok',
      timestamp: '2023-01-01T00:00:00Z'
    })
  })

  it('should render Vite and React logos with correct links', () => {
    render(<App />)
    
    // Test Vite logo
    const viteLogo = screen.getByAltText('Vite logo')
    expect(viteLogo).toBeInTheDocument()
    expect(viteLogo).toHaveAttribute('src', expect.stringContaining('svg'))
    
    // Test Vite link
    const viteLink = viteLogo.closest('a')
    expect(viteLink).toHaveAttribute('href', 'https://vite.dev')
    expect(viteLink).toHaveAttribute('target', '_blank')
    
    // Test React logo
    const reactLogo = screen.getByAltText('React logo')
    expect(reactLogo).toBeInTheDocument()
    expect(reactLogo).toHaveAttribute('src', expect.stringContaining('react.svg'))
    
    // Test React link
    const reactLink = reactLogo.closest('a')
    expect(reactLink).toHaveAttribute('href', 'https://react.dev')
    expect(reactLink).toHaveAttribute('target', '_blank')
  })

  it('should render the main heading', () => {
    render(<App />)
    
    const heading = screen.getByRole('heading', { level: 1 })
    expect(heading).toBeInTheDocument()
    expect(heading).toHaveTextContent('Lifestyle Spaces')
  })

  it('should render the counter button with initial count of 0', () => {
    render(<App />)
    
    const button = screen.getByRole('button', { name: /count is 0/i })
    expect(button).toBeInTheDocument()
  })

  it('should increment count when button is clicked', async () => {
    const user = userEvent.setup()
    render(<App />)
    
    const button = screen.getByRole('button', { name: /count is 0/i })
    
    // Click the button once
    await user.click(button)
    expect(screen.getByRole('button', { name: /count is 1/i })).toBeInTheDocument()
    
    // Click the button again
    await user.click(button)
    expect(screen.getByRole('button', { name: /count is 2/i })).toBeInTheDocument()
  })

  it('should increment count when button is clicked using fireEvent', () => {
    render(<App />)
    
    const button = screen.getByRole('button', { name: /count is 0/i })
    
    // Click using fireEvent
    fireEvent.click(button)
    expect(screen.getByRole('button', { name: /count is 1/i })).toBeInTheDocument()
  })

  it('should render the HMR instruction text', () => {
    render(<App />)
    
    // Test for the code element and the surrounding text
    const codeElement = screen.getByText('src/App.tsx')
    expect(codeElement.tagName.toLowerCase()).toBe('code')
    
    // Test that the paragraph containing the HMR instruction exists
    const paragraphWithInstruction = codeElement.closest('p')
    expect(paragraphWithInstruction).toBeInTheDocument()
    expect(paragraphWithInstruction).toHaveTextContent('Edit src/App.tsx and save to test HMR')
  })

  it('should render the footer instruction text', () => {
    render(<App />)
    
    const footerText = screen.getByText('Click on the Vite and React logos to learn more')
    expect(footerText).toBeInTheDocument()
    expect(footerText).toHaveClass('read-the-docs')
  })

  it('should have correct CSS classes applied', () => {
    render(<App />)
    
    // Test logo classes
    const viteLogo = screen.getByAltText('Vite logo')
    expect(viteLogo).toHaveClass('logo')
    
    const reactLogo = screen.getByAltText('React logo')
    expect(reactLogo).toHaveClass('logo', 'react')
    
    // Test card class
    const button = screen.getByRole('button', { name: /count is 0/i })
    const cardDiv = button.closest('.card')
    expect(cardDiv).toBeInTheDocument()
    expect(cardDiv).toHaveClass('card')
  })

  it('should render API configuration section', async () => {
    render(<App />)
    
    // Check API configuration display
    expect(screen.getByText('API Configuration')).toBeInTheDocument()
    expect(screen.getByText('http://localhost:8000')).toBeInTheDocument()
    expect(screen.getByText('Local')).toBeInTheDocument()
  })

  it('should render all content in the correct structure', () => {
    render(<App />)
    
    // Check that all elements are present and accessible
    expect(screen.getByAltText('Vite logo')).toBeInTheDocument()
    expect(screen.getByAltText('React logo')).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument()
    expect(screen.getByText(/Click on the Vite and React logos/i)).toBeInTheDocument()
  })

  it('should call API health check on mount', async () => {
    render(<App />)
    
    await waitFor(() => {
      expect(mockApiService.healthCheck).toHaveBeenCalledTimes(1)
    })
  })

  it('should display healthy API status', async () => {
    render(<App />)
    
    await waitFor(() => {
      expect(screen.getByText('✓ API is healthy')).toBeInTheDocument()
      expect(screen.getByText('Status: ok')).toBeInTheDocument()
    })
  })

  it('should handle API health check error', async () => {
    mockApiService.healthCheck.mockRejectedValue(new Error('Network error'))
    
    render(<App />)
    
    await waitFor(() => {
      expect(screen.getByText('✗ API health check failed')).toBeInTheDocument()
      expect(screen.getByText('Error: Network error')).toBeInTheDocument()
    })
  })

  it('should allow manual health check', async () => {
    const user = userEvent.setup()
    render(<App />)
    
    // Wait for initial health check
    await waitFor(() => {
      expect(mockApiService.healthCheck).toHaveBeenCalledTimes(1)
    })
    
    // Click the manual health check button
    const healthCheckButton = screen.getByText('Check API Health')
    await user.click(healthCheckButton)
    
    await waitFor(() => {
      expect(mockApiService.healthCheck).toHaveBeenCalledTimes(2)
    })
  })

  it('should show loading state during health check', async () => {
    // Mock a slow health check
    mockApiService.healthCheck.mockImplementation(() => new Promise(resolve => 
      setTimeout(() => resolve({ status: 'ok', timestamp: '2023-01-01T00:00:00Z' }), 100)
    ))
    
    render(<App />)
    
    // Should show loading initially
    expect(screen.getByText('Checking...')).toBeInTheDocument()
    
    // Should eventually show the health check button again
    await waitFor(() => {
      expect(screen.getByText('Check API Health')).toBeInTheDocument()
    })
  })

  it('should handle non-Error object in catch block', async () => {
    // Mock health check to reject with a non-Error object (line 27 coverage)
    mockApiService.healthCheck.mockRejectedValue('String error instead of Error object')
    
    render(<App />)
    
    await waitFor(() => {
      expect(screen.getByText('✗ API health check failed')).toBeInTheDocument()
      expect(screen.getByText('Error: Unknown error occurred')).toBeInTheDocument()
    })
  })

})