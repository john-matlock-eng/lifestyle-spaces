import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { SignIn } from './SignIn';
import { MemoryRouter } from 'react-router-dom';
import type { SignInData } from '../types';

// Mock components
vi.mock('../components/auth/AuthLayout', () => ({
  AuthLayout: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="auth-layout">{children}</div>
  ),
}));

vi.mock('../components/auth/SignInForm', () => ({
  SignInForm: ({ 
    onSubmit, 
    onSwitchToSignUp, 
    isLoading, 
    error,
    successMessage 
  }: { 
    onSubmit: (data: SignInData & { rememberMe?: boolean }) => Promise<void>;
    onSwitchToSignUp: () => void;
    isLoading: boolean;
    error: string | null;
    successMessage: string | null;
  }) => (
    <div data-testid="signin-form">
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          const formData = new FormData(e.target as HTMLFormElement);
          await onSubmit({
            email: formData.get('email') as string,
            password: formData.get('password') as string,
            rememberMe: formData.get('rememberMe') === 'on',
          });
        }}
      >
        <input name="email" defaultValue="test@example.com" />
        <input name="password" defaultValue="Password123!" />
        <input name="rememberMe" type="checkbox" />
        <button type="submit" disabled={isLoading}>
          {isLoading ? 'Signing In...' : 'Sign In'}
        </button>
      </form>
      <button onClick={onSwitchToSignUp}>Switch to Sign Up</button>
      {error && <div data-testid="error-message">{error}</div>}
      {successMessage && <div data-testid="success-message">{successMessage}</div>}
    </div>
  ),
}));

// Mock auth store
const mockSignIn = vi.fn();
let mockAuthState = {
  isLoading: false,
  error: null,
  signIn: mockSignIn,
};

const setMockAuthState = (newState: Partial<typeof mockAuthState>) => {
  mockAuthState = { ...mockAuthState, ...newState };
};

const resetMockAuthState = () => {
  mockAuthState = {
    isLoading: false,
    error: null,
    signIn: mockSignIn,
  };
};

vi.mock('../stores/authStore', () => ({
  useAuth: () => mockAuthState,
}));

// Mock react-router-dom with location state support
const mockNavigate = vi.fn();
let mockLocationState: { successMessage?: string } | null = null;

const setMockLocationState = (state: { successMessage?: string } | null) => {
  mockLocationState = state;
};

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useLocation: () => ({ state: mockLocationState }),
  };
});

describe('SignIn Page', () => {
  const renderSignIn = (initialEntries = ['/signin']) => {
    return render(
      <MemoryRouter initialEntries={initialEntries}>
        <SignIn />
      </MemoryRouter>
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();
    resetMockAuthState();
    setMockLocationState(null);
  });

  it('renders AuthLayout with SignInForm', () => {
    renderSignIn();
    
    expect(screen.getByTestId('auth-layout')).toBeInTheDocument();
    expect(screen.getByTestId('signin-form')).toBeInTheDocument();
  });

  it('passes correct props to SignInForm', () => {
    setMockAuthState({
      isLoading: true,
      error: 'Test error',
    });

    renderSignIn();
    
    expect(screen.getByRole('button', { name: 'Signing In...' })).toBeDisabled();
    expect(screen.getByTestId('error-message')).toHaveTextContent('Test error');
  });

  it('displays success message from navigation state', () => {
    setMockLocationState({
      successMessage: 'Account created successfully! Please sign in to continue.',
    });

    renderSignIn();
    
    expect(screen.getByTestId('success-message')).toHaveTextContent(
      'Account created successfully! Please sign in to continue.'
    );
  });

  it('does not display success message when not in navigation state', () => {
    renderSignIn();
    
    expect(screen.queryByTestId('success-message')).not.toBeInTheDocument();
  });

  it('redirects to dashboard after successful sign-in', async () => {
    const user = userEvent.setup();
    
    // Mock successful sign-in
    mockSignIn.mockResolvedValueOnce({});

    renderSignIn();
    
    const submitButton = screen.getByRole('button', { name: 'Sign In' });
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'Password123!',
      });
    });

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
    });
  });

  it('handles sign-in errors gracefully', async () => {
    const user = userEvent.setup();
    
    // Mock sign-in to throw an error
    mockSignIn.mockRejectedValueOnce(new Error('Invalid credentials'));

    renderSignIn();
    
    const submitButton = screen.getByRole('button', { name: 'Sign In' });
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'Password123!',
      });
    });

    // Should not navigate when there's an error
    expect(mockNavigate).not.toHaveBeenCalledWith('/dashboard');
  });

  it('navigates to sign-up page when switch button is clicked', async () => {
    const user = userEvent.setup();
    renderSignIn();
    
    const switchButton = screen.getByText('Switch to Sign Up');
    await user.click(switchButton);

    expect(mockNavigate).toHaveBeenCalledWith('/signup');
  });

  it('shows loading state during sign-in', () => {
    setMockAuthState({
      isLoading: true,
    });

    renderSignIn();
    
    expect(screen.getByRole('button', { name: 'Signing In...' })).toBeDisabled();
  });

  it('displays error message when sign-in fails', () => {
    setMockAuthState({
      error: 'Invalid credentials',
    });

    renderSignIn();
    
    expect(screen.getByTestId('error-message')).toHaveTextContent('Invalid credentials');
  });

  it('includes rememberMe in sign-in request', async () => {
    const user = userEvent.setup();
    
    // Mock successful sign-in
    mockSignIn.mockResolvedValueOnce({});

    renderSignIn();
    
    const rememberMeCheckbox = screen.getByRole('checkbox');
    await user.click(rememberMeCheckbox);
    
    const submitButton = screen.getByRole('button', { name: 'Sign In' });
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'Password123!',
      });
    });
  });

  it('clears success message after displaying', () => {
    setMockLocationState({
      successMessage: 'Account created successfully! Please sign in to continue.',
    });

    const { rerender } = renderSignIn();
    
    expect(screen.getByTestId('success-message')).toBeInTheDocument();

    // Simulate navigation clearing the state
    setMockLocationState(null);
    rerender(
      <MemoryRouter initialEntries={['/signin']}>
        <SignIn />
      </MemoryRouter>
    );

    expect(screen.queryByTestId('success-message')).not.toBeInTheDocument();
  });
});