import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { SignUp } from './SignUp';
import { MemoryRouter } from 'react-router-dom';
import type { SignUpData } from '../types';

// Mock components
vi.mock('../components/auth/AuthLayout', () => ({
  AuthLayout: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="auth-layout">{children}</div>
  ),
}));

vi.mock('../components/auth/SignUpForm', () => ({
  SignUpForm: ({ 
    onSubmit, 
    onSwitchToSignIn, 
    isLoading, 
    error 
  }: { 
    onSubmit: (data: SignUpData) => Promise<void>;
    onSwitchToSignIn: () => void;
    isLoading: boolean;
    error: string | null;
  }) => (
    <div data-testid="signup-form">
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          const formData = new FormData(e.target as HTMLFormElement);
          await onSubmit({
            email: formData.get('email') as string,
            password: formData.get('password') as string,
            username: formData.get('username') as string,
            displayName: formData.get('displayName') as string,
          });
        }}
      >
        <input name="email" defaultValue="test@example.com" />
        <input name="password" defaultValue="Password123!" />
        <input name="username" defaultValue="testuser" />
        <input name="displayName" defaultValue="Test User" />
        <button type="submit" disabled={isLoading}>
          {isLoading ? 'Signing Up...' : 'Sign Up'}
        </button>
      </form>
      <button onClick={onSwitchToSignIn}>Switch to Sign In</button>
      {error && <div data-testid="error-message">{error}</div>}
    </div>
  ),
}));

// Mock auth store
const mockSignUp = vi.fn();
let mockAuthState = {
  isLoading: false,
  error: null,
  signUp: mockSignUp,
};

const setMockAuthState = (newState: Partial<typeof mockAuthState>) => {
  mockAuthState = { ...mockAuthState, ...newState };
};

const resetMockAuthState = () => {
  mockAuthState = {
    isLoading: false,
    error: null,
    signUp: mockSignUp,
  };
};

vi.mock('../stores/authStore', () => ({
  useAuth: () => mockAuthState,
}));

// Mock react-router-dom
const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('SignUp Page', () => {
  const renderSignUp = () => {
    return render(
      <MemoryRouter initialEntries={['/signup']}>
        <SignUp />
      </MemoryRouter>
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();
    resetMockAuthState();
  });

  it('renders AuthLayout with SignUpForm', () => {
    renderSignUp();
    
    expect(screen.getByTestId('auth-layout')).toBeInTheDocument();
    expect(screen.getByTestId('signup-form')).toBeInTheDocument();
  });

  it('passes correct props to SignUpForm', () => {
    setMockAuthState({
      isLoading: true,
      error: 'Test error',
    });

    renderSignUp();
    
    expect(screen.getByRole('button', { name: 'Signing Up...' })).toBeDisabled();
    expect(screen.getByTestId('error-message')).toHaveTextContent('Test error');
  });

  it('redirects to sign-in page with success message when sign-up is incomplete', async () => {
    const user = userEvent.setup();
    
    // Mock sign-up response for incomplete registration (user needs confirmation)
    mockSignUp.mockResolvedValueOnce({
      isSignUpComplete: false,
      nextStep: {
        signUpStep: 'CONFIRM_SIGN_UP',
      },
    });

    renderSignUp();
    
    const submitButton = screen.getByRole('button', { name: 'Sign Up' });
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockSignUp).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'Password123!',
        username: 'testuser',
        displayName: 'Test User',
      });
    });

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/signin', {
        state: { 
          successMessage: 'Account created successfully! Please sign in to continue.' 
        },
      });
    });
  });

  it('redirects to sign-in page with success message when sign-up is complete', async () => {
    const user = userEvent.setup();
    
    // Mock sign-up response for complete registration (auto-confirmed user)
    mockSignUp.mockResolvedValueOnce({
      isSignUpComplete: true,
      nextStep: {
        signUpStep: 'DONE',
      },
    });

    renderSignUp();
    
    const submitButton = screen.getByRole('button', { name: 'Sign Up' });
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockSignUp).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'Password123!',
        username: 'testuser',
        displayName: 'Test User',
      });
    });

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/signin', {
        state: { 
          successMessage: 'Account created successfully! Please sign in to continue.' 
        },
      });
    });
  });

  it('handles sign-up errors gracefully', async () => {
    const user = userEvent.setup();
    
    // Mock sign-up to throw an error
    mockSignUp.mockRejectedValueOnce(new Error('Email already exists'));

    renderSignUp();
    
    const submitButton = screen.getByRole('button', { name: 'Sign Up' });
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockSignUp).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'Password123!',
        username: 'testuser',
        displayName: 'Test User',
      });
    });

    // Should not navigate when there's an error
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('navigates to sign-in page when switch button is clicked', async () => {
    const user = userEvent.setup();
    renderSignUp();
    
    const switchButton = screen.getByText('Switch to Sign In');
    await user.click(switchButton);

    expect(mockNavigate).toHaveBeenCalledWith('/signin');
  });

  it('shows loading state during sign-up', () => {
    setMockAuthState({
      isLoading: true,
    });

    renderSignUp();
    
    expect(screen.getByRole('button', { name: 'Signing Up...' })).toBeDisabled();
  });

  it('displays error message when sign-up fails', () => {
    setMockAuthState({
      error: 'Email already exists',
    });

    renderSignUp();
    
    expect(screen.getByTestId('error-message')).toHaveTextContent('Email already exists');
  });
});