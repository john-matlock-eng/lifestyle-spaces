import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SignInForm } from './SignInForm';
import { SignInData } from '../../types';

describe('SignInForm', () => {
  const mockOnSubmit = vi.fn();
  const mockOnSwitchToSignUp = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const defaultProps = {
    onSubmit: mockOnSubmit,
    onSwitchToSignUp: mockOnSwitchToSignUp,
    isLoading: false,
    error: null,
  };

  it('should render all form fields', () => {
    render(<SignInForm {...defaultProps} />);

    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  it('should render switch to sign up link', () => {
    render(<SignInForm {...defaultProps} />);

    const signUpLink = screen.getByText(/sign up/i);
    expect(signUpLink).toBeInTheDocument();
  });

  it('should display loading state', () => {
    render(<SignInForm {...defaultProps} isLoading={true} />);

    expect(screen.getByRole('button', { name: /signing in/i })).toBeDisabled();
  });

  it('should display error message', () => {
    const errorMessage = 'Invalid credentials';
    render(<SignInForm {...defaultProps} error={errorMessage} />);

    expect(screen.getByText(errorMessage)).toBeInTheDocument();
    expect(screen.getByText(errorMessage)).toHaveAttribute('role', 'alert');
  });

  it('should submit form with valid data', async () => {
    const user = userEvent.setup();
    render(<SignInForm {...defaultProps} />);

    const formData: SignInData = {
      email: 'test@example.com',
      password: 'TestPassword123!',
    };

    await user.type(screen.getByLabelText(/email/i), formData.email);
    await user.type(screen.getByLabelText(/password/i), formData.password);

    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith({
        ...formData,
        rememberMe: false,
      });
    });
  });

  it('should validate required fields', async () => {
    const user = userEvent.setup();
    render(<SignInForm {...defaultProps} />);

    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByText(/email is required/i)).toBeInTheDocument();
      expect(screen.getByText(/password is required/i)).toBeInTheDocument();
    });

    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it('should validate email format', async () => {
    const user = userEvent.setup();
    render(<SignInForm {...defaultProps} />);

    await user.type(screen.getByLabelText(/email/i), 'invalid-email');
    await user.type(screen.getByLabelText(/password/i), 'password123');
    
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByText('Invalid email format')).toBeInTheDocument();
    });

    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it('should handle switch to sign up', async () => {
    const user = userEvent.setup();
    render(<SignInForm {...defaultProps} />);

    const signUpLink = screen.getByText(/sign up/i);
    await user.click(signUpLink);

    expect(mockOnSwitchToSignUp).toHaveBeenCalled();
  });

  it('should prevent form submission when loading', async () => {
    const user = userEvent.setup();
    render(<SignInForm {...defaultProps} isLoading={true} />);

    const submitButton = screen.getByRole('button', { name: /signing in/i });
    expect(submitButton).toBeDisabled();

    await user.click(submitButton);
    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it('should clear form fields after successful submission', async () => {
    const user = userEvent.setup();
    const { rerender } = render(<SignInForm {...defaultProps} />);

    const formData: SignInData = {
      email: 'test@example.com',
      password: 'TestPassword123!',
    };

    await user.type(screen.getByLabelText(/email/i), formData.email);
    await user.type(screen.getByLabelText(/password/i), formData.password);

    await user.click(screen.getByRole('button', { name: /sign in/i }));

    // Simulate successful submission by re-rendering with isLoading false
    rerender(<SignInForm {...defaultProps} isLoading={false} />);

    await waitFor(() => {
      expect((screen.getByLabelText(/email/i) as HTMLInputElement).value).toBe('');
      expect((screen.getByLabelText(/password/i) as HTMLInputElement).value).toBe('');
    });
  });

  it('should have proper accessibility attributes', () => {
    render(<SignInForm {...defaultProps} />);

    const form = screen.getByRole('form');
    expect(form).toHaveAttribute('aria-label', 'Sign in form');

    const emailInput = screen.getByLabelText(/email/i);
    expect(emailInput).toHaveAttribute('type', 'email');
    expect(emailInput).toHaveAttribute('autocomplete', 'email');

    const passwordInput = screen.getByLabelText(/password/i);
    expect(passwordInput).toHaveAttribute('type', 'password');
    expect(passwordInput).toHaveAttribute('autocomplete', 'current-password');
  });

  it('should associate error messages with form fields', async () => {
    const user = userEvent.setup();
    render(<SignInForm {...defaultProps} />);

    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      const emailInput = screen.getByLabelText(/email/i);
      const emailError = screen.getByText(/email is required/i);
      
      expect(emailInput).toHaveAttribute('aria-describedby');
      expect(emailError).toHaveAttribute('id');
      expect(emailInput.getAttribute('aria-describedby')).toBe(emailError.getAttribute('id'));
    });
  });

  it('should support keyboard navigation', async () => {
    const user = userEvent.setup();
    render(<SignInForm {...defaultProps} />);

    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);

    // Start with email input focused
    emailInput.focus();
    expect(emailInput).toHaveFocus();

    // Tab to password field
    await user.keyboard('{Tab}');
    expect(passwordInput).toHaveFocus();

    // Tab to checkbox (remember me)
    await user.keyboard('{Tab}');
    expect(screen.getByLabelText(/remember me/i)).toHaveFocus();
  });

  it('should handle Enter key to submit form', async () => {
    const user = userEvent.setup();
    render(<SignInForm {...defaultProps} />);

    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    await user.type(screen.getByLabelText(/password/i), 'password123');

    // Press Enter on password field should trigger form submission
    await user.keyboard('{Enter}');

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
        rememberMe: false,
      });
    });
  });

  it('should show remember me checkbox', () => {
    render(<SignInForm {...defaultProps} />);

    const rememberMeCheckbox = screen.getByLabelText(/remember me/i);
    expect(rememberMeCheckbox).toBeInTheDocument();
    expect(rememberMeCheckbox).toHaveAttribute('type', 'checkbox');
  });

  it('should include remember me in form submission', async () => {
    const user = userEvent.setup();
    render(<SignInForm {...defaultProps} />);

    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    await user.type(screen.getByLabelText(/password/i), 'password123');
    await user.click(screen.getByLabelText(/remember me/i));

    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
        rememberMe: true,
      });
    });
  });
});