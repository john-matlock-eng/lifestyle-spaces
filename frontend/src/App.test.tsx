import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import App from './App'
import { MemoryRouter } from 'react-router-dom'

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

describe('App Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render with providers and router structure', () => {
    render(<App />)

    expect(screen.getByTestId('auth-provider')).toBeInTheDocument()
    expect(screen.getByTestId('space-provider')).toBeInTheDocument()
    
    // Should have app class
    const appDiv = document.querySelector('.app')
    expect(appDiv).toBeInTheDocument()
  })

  it('should render sign in page on /signin route', () => {
    render(
      <MemoryRouter initialEntries={['/signin']}>
        <App />
      </MemoryRouter>
    )
    
    expect(screen.getByTestId('signin-page')).toBeInTheDocument()
  })

  it('should render sign up page on /signup route', () => {
    render(
      <MemoryRouter initialEntries={['/signup']}>
        <App />
      </MemoryRouter>
    )
    
    expect(screen.getByTestId('signup-page')).toBeInTheDocument()
  })

  it('should render protected dashboard on /dashboard route', () => {
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <App />
      </MemoryRouter>
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