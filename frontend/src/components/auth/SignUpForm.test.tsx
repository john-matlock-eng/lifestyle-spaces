import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SignUpForm } from './SignUpForm';
import { SignUpData } from '../../types';

describe('SignUpForm', () => {
  const mockOnSubmit = vi.fn();
  const mockOnSwitchToSignIn = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const defaultProps = {
    onSubmit: mockOnSubmit,
    onSwitchToSignIn: mockOnSwitchToSignIn,
    isLoading: false,
    error: null,
  };

  it('should render all form fields', () => {
    render(<SignUpForm {...defaultProps} />);

    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^username/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/display name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign up/i })).toBeInTheDocument();
  });

  it('should render switch to sign in link', () => {
    render(<SignUpForm {...defaultProps} />);

    const signInLink = screen.getByText(/sign in/i);
    expect(signInLink).toBeInTheDocument();
  });

  it('should display loading state', () => {
    render(<SignUpForm {...defaultProps} isLoading={true} />);

    expect(screen.getByRole('button', { name: /signing up/i })).toBeDisabled();
  });

  it('should display error message', () => {
    const errorMessage = 'Sign up failed';
    render(<SignUpForm {...defaultProps} error={errorMessage} />);

    expect(screen.getByText(errorMessage)).toBeInTheDocument();
    expect(screen.getByText(errorMessage)).toHaveAttribute('role', 'alert');
  });

  it('should submit form with valid data', async () => {
    const user = userEvent.setup();
    render(<SignUpForm {...defaultProps} />);

    const formData: SignUpData = {
      email: 'test@example.com',
      username: 'testuser',
      displayName: 'Test User',
      password: 'TestPassword123!',
    };

    await user.type(screen.getByLabelText(/email/i), formData.email);
    await user.type(screen.getByLabelText(/^username/i), formData.username);
    await user.type(screen.getByLabelText(/display name/i), formData.displayName);
    await user.type(screen.getByLabelText(/password/i), formData.password);

    await user.click(screen.getByRole('button', { name: /sign up/i }));

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith(formData);
    });
  });

  it('should validate required fields', async () => {
    const user = userEvent.setup();
    render(<SignUpForm {...defaultProps} />);

    await user.click(screen.getByRole('button', { name: /sign up/i }));

    await waitFor(() => {
      expect(screen.getByText(/email is required/i)).toBeInTheDocument();
      expect(screen.getByText(/username is required/i)).toBeInTheDocument();
      expect(screen.getByText(/display name is required/i)).toBeInTheDocument();
      expect(screen.getByText(/password is required/i)).toBeInTheDocument();
    });

    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it('should validate email format', async () => {
    const user = userEvent.setup();
    render(<SignUpForm {...defaultProps} />);

    await user.type(screen.getByLabelText(/email/i), 'invalid-email');
    await user.type(screen.getByLabelText(/^username/i), 'testuser');
    await user.type(screen.getByLabelText(/display name/i), 'Test User');
    await user.type(screen.getByLabelText(/password/i), 'TestPassword123!');
    
    await user.click(screen.getByRole('button', { name: /sign up/i }));

    await waitFor(() => {
      expect(screen.getByText(/invalid email format/i)).toBeInTheDocument();
    });

    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it('should validate password strength', async () => {
    const user = userEvent.setup();
    render(<SignUpForm {...defaultProps} />);

    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    await user.type(screen.getByLabelText(/^username/i), 'testuser');
    await user.type(screen.getByLabelText(/display name/i), 'Test User');
    await user.type(screen.getByLabelText(/password/i), '123');
    
    await user.click(screen.getByRole('button', { name: /sign up/i }));

    await waitFor(() => {
      expect(screen.getByText(/password must be at least 8 characters/i)).toBeInTheDocument();
    });

    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it('should validate username length', async () => {
    const user = userEvent.setup();
    render(<SignUpForm {...defaultProps} />);

    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    await user.type(screen.getByLabelText(/^username/i), 'ab'); // Too short
    await user.type(screen.getByLabelText(/display name/i), 'Test User');
    await user.type(screen.getByLabelText(/password/i), 'TestPassword123!');
    
    await user.click(screen.getByRole('button', { name: /sign up/i }));

    await waitFor(() => {
      expect(screen.getByText(/username must be at least 3 characters/i)).toBeInTheDocument();
    });

    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it('should handle switch to sign in', async () => {
    const user = userEvent.setup();
    render(<SignUpForm {...defaultProps} />);

    const signInLink = screen.getByText(/sign in/i);
    await user.click(signInLink);

    expect(mockOnSwitchToSignIn).toHaveBeenCalled();
  });

  it('should prevent form submission when loading', async () => {
    const user = userEvent.setup();
    render(<SignUpForm {...defaultProps} isLoading={true} />);

    const submitButton = screen.getByRole('button', { name: /signing up/i });
    expect(submitButton).toBeDisabled();

    await user.click(submitButton);
    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it('should clear form fields after successful submission', async () => {
    const user = userEvent.setup();
    const { rerender } = render(<SignUpForm {...defaultProps} />);

    const formData: SignUpData = {
      email: 'test@example.com',
      username: 'testuser',
      displayName: 'Test User',
      password: 'TestPassword123!',
    };

    await user.type(screen.getByLabelText(/email/i), formData.email);
    await user.type(screen.getByLabelText(/^username/i), formData.username);
    await user.type(screen.getByLabelText(/display name/i), formData.displayName);
    await user.type(screen.getByLabelText(/password/i), formData.password);

    await user.click(screen.getByRole('button', { name: /sign up/i }));

    // Simulate successful submission by re-rendering with isLoading false
    rerender(<SignUpForm {...defaultProps} isLoading={false} />);

    await waitFor(() => {
      expect((screen.getByLabelText(/email/i) as HTMLInputElement).value).toBe('');
      expect((screen.getByLabelText(/^username/i) as HTMLInputElement).value).toBe('');
      expect((screen.getByLabelText(/display name/i) as HTMLInputElement).value).toBe('');
      expect((screen.getByLabelText(/password/i) as HTMLInputElement).value).toBe('');
    });
  });

  it('should have proper accessibility attributes', () => {
    render(<SignUpForm {...defaultProps} />);

    const form = screen.getByRole('form');
    expect(form).toHaveAttribute('aria-label', 'Sign up form');

    const emailInput = screen.getByLabelText(/email/i);
    expect(emailInput).toHaveAttribute('type', 'email');
    expect(emailInput).toHaveAttribute('required');
    expect(emailInput).toHaveAttribute('autocomplete', 'email');

    const passwordInput = screen.getByLabelText(/password/i);
    expect(passwordInput).toHaveAttribute('type', 'password');
    expect(passwordInput).toHaveAttribute('required');
    expect(passwordInput).toHaveAttribute('autocomplete', 'new-password');
  });

  it('should associate error messages with form fields', async () => {
    const user = userEvent.setup();
    render(<SignUpForm {...defaultProps} />);

    await user.click(screen.getByRole('button', { name: /sign up/i }));

    await waitFor(() => {
      const emailInput = screen.getByLabelText(/email/i);
      const emailError = screen.getByText(/email is required/i);
      
      expect(emailInput).toHaveAttribute('aria-describedby');
      expect(emailError).toHaveAttribute('id');
      expect(emailInput.getAttribute('aria-describedby')).toBe(emailError.getAttribute('id'));
    });
  });
});