import '@testing-library/jest-dom'
import { vi, afterEach, beforeEach } from 'vitest'
import { cleanup } from '@testing-library/react'

// Global test setup for Vitest + React Testing Library
// This file is imported before all test files

// Set test environment variable
vi.stubEnv('VITE_TEST_ENV', 'true')
vi.stubEnv('NODE_ENV', 'test')

// Mock window.matchMedia for tests
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

// Store original environment values to restore them
const originalEnv = { ...process.env }

// Setup cleanup before each test
beforeEach(() => {
  // Clear all mocks but not timers (causes issues)
  vi.clearAllMocks()
  
  // Reset DOM state
  cleanup()
  
  // Reset document head changes
  document.head.innerHTML = ''
  
  // Clear any console spy calls
  if (vi.isMockFunction(console.error)) {
    console.error.mockClear()
  }
  if (vi.isMockFunction(console.warn)) {
    console.warn.mockClear()
  }
  if (vi.isMockFunction(console.log)) {
    console.log.mockClear()
  }
})

// Setup cleanup after each test
afterEach(() => {
  // Complete cleanup of all mocks
  vi.resetAllMocks()
  
  // Reset environment variables to original state
  vi.unstubAllEnvs()
  
  // Clean up DOM
  cleanup()
  
  // Clear any remaining DOM elements
  document.body.innerHTML = ''
  document.head.innerHTML = ''
})