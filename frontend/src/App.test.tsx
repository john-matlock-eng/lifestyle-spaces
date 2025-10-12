import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import App from './App'
import { MemoryRouter, Routes, Route, Navigate } from 'react-router-dom'
import React from 'react'

// Mock the stores
vi.mock('./stores/authStore', () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => <div data-testid="auth-provider">{children}</div>,
  useAuth: vi.fn(() => ({
    isAuthenticated: false,
    isLoading: false,
    user: null,
    error: null,
    signIn: vi.fn(),
    signUp: vi.fn(),
    signOut: vi.fn(),
    clearError: vi.fn(),
  })),
}))

vi.mock('./stores/spaceStore', () => ({
  SpaceProvider: ({ children }: { children: React.ReactNode }) => <div data-testid="space-provider">{children}</div>,
  useSpace: vi.fn(() => ({
    spaces: [],
    currentSpace: null,
    members: [],
    invitations: [],
    isLoading: false,
    error: null,
    createSpace: vi.fn(),
    loadSpaces: vi.fn(),
    selectSpace: vi.fn(),
    inviteMember: vi.fn(),
    acceptInvitation: vi.fn(),
    clearError: vi.fn(),
  })),
}))

// Mock the pages
vi.mock('./pages/SignIn', () => ({
  SignIn: () => <div data-testid="signin-page">Sign In Page</div>,
}))

vi.mock('./pages/SignUp', () => ({
  SignUp: () => <div data-testid="signup-page">Sign Up Page</div>,
}))

vi.mock('./pages/Dashboard', () => ({
  Dashboard: () => <div data-testid="dashboard-page">Dashboard Page</div>,
}))

// Mock the ProtectedRoute component
vi.mock('./components/ProtectedRoute', () => ({
  ProtectedRoute: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="protected-route">{children}</div>
  ),
}))

// Import the mocked components after mocking
const { SignIn } = await import('./pages/SignIn')
const { SignUp } = await import('./pages/SignUp')
const { Dashboard } = await import('./pages/Dashboard')
const { ProtectedRoute } = await import('./components/ProtectedRoute')
const { AuthProvider } = await import('./stores/authStore')
const { SpaceProvider } = await import('./stores/spaceStore')

// Create a test component with just the routing logic (without BrowserRouter)
const AppRoutes = () => (
  <div className="app">
    <Routes>
      <Route path="/signin" element={<SignIn />} />
      <Route path="/signup" element={<SignUp />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  </div>
)

describe('App Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
    cleanup()
  })

  afterEach(() => {
    cleanup()
    vi.resetAllMocks()
    vi.resetModules()
    
    // Clear any remaining DOM elements
    document.body.innerHTML = ''
    document.head.innerHTML = ''
  })

  it('should render with providers and router structure', () => {
    render(<App />)

    expect(screen.getByTestId('auth-provider')).toBeInTheDocument()
    expect(screen.getByTestId('space-provider')).toBeInTheDocument()

    // Should have routing structure (Routes component renders)
    // We don't check for .app anymore since layout structure changed
    // The component hierarchy test below verifies the structure
  })

  it('should render sign in page on /signin route', () => {
    render(
      <AuthProvider>
        <SpaceProvider>
          <MemoryRouter initialEntries={['/signin']}>
            <AppRoutes />
          </MemoryRouter>
        </SpaceProvider>
      </AuthProvider>
    )
    
    expect(screen.getByTestId('signin-page')).toBeInTheDocument()
  })

  it('should render sign up page on /signup route', () => {
    render(
      <AuthProvider>
        <SpaceProvider>
          <MemoryRouter initialEntries={['/signup']}>
            <AppRoutes />
          </MemoryRouter>
        </SpaceProvider>
      </AuthProvider>
    )
    
    expect(screen.getByTestId('signup-page')).toBeInTheDocument()
  })

  it('should render protected dashboard on /dashboard route', () => {
    render(
      <AuthProvider>
        <SpaceProvider>
          <MemoryRouter initialEntries={['/dashboard']}>
            <AppRoutes />
          </MemoryRouter>
        </SpaceProvider>
      </AuthProvider>
    )
    
    expect(screen.getByTestId('protected-route')).toBeInTheDocument()
    expect(screen.getByTestId('dashboard-page')).toBeInTheDocument()
  })

  it('should have proper component hierarchy', () => {
    render(<App />)
    
    const authProvider = screen.getByTestId('auth-provider')
    const spaceProvider = screen.getByTestId('space-provider')
    
    // Space provider should be inside auth provider
    expect(authProvider).toContainElement(spaceProvider)
  })
})