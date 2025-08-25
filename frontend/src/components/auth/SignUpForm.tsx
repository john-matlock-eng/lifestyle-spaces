import React from 'react';
import { useForm } from 'react-hook-form';
import { SignUpData } from '../../types';
import './auth.css';

interface SignUpFormProps {
  onSubmit: (data: SignUpData) => Promise<void>;
  onSwitchToSignIn: () => void;
  isLoading: boolean;
  error: string | null;
}

interface FormData extends SignUpData {
  confirmPassword: string;
}

export const SignUpForm: React.FC<SignUpFormProps> = ({
  onSubmit,
  onSwitchToSignIn,
  isLoading,
  error,
}) => {
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
  } = useForm<FormData>();

  const password = watch('password');

  const onFormSubmit = async (data: FormData) => {
    const signUpData: SignUpData = {
      email: data.email,
      username: data.username,
      displayName: data.displayName,
      password: data.password,
    };

    try {
      await onSubmit(signUpData);
      reset();
    } catch (error) {
      // Error is handled by parent component
    }
  };

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email) || 'Invalid email format';
  };

  const validateUsername = (username: string) => {
    if (username.length < 3) {
      return 'Username must be at least 3 characters long';
    }
    if (username.length > 30) {
      return 'Username must be 30 characters or less';
    }
    if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
      return 'Username can only contain letters, numbers, hyphens, and underscores';
    }
    return true;
  };

  const validatePassword = (password: string) => {
    if (password.length < 8) {
      return 'Password must be at least 8 characters long';
    }
    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
      return 'Password must contain at least one uppercase letter, one lowercase letter, and one number';
    }
    return true;
  };

  const validateConfirmPassword = (confirmPassword: string) => {
    return confirmPassword === password || 'Passwords do not match';
  };

  return (
    <div className="sign-up-form">
      <div className="form-header">
        <h2>Create Your Account</h2>
        <p>Join Lifestyle Spaces to start sharing your spaces with others.</p>
      </div>

      {error && (
        <div className="error-message" role="alert" aria-live="polite">
          {error}
        </div>
      )}

      <form
        onSubmit={handleSubmit(onFormSubmit)}
        role="form"
        aria-label="Sign up form"
        className="form"
      >
        <div className="form-group">
          <label htmlFor="email">
            Email Address <span aria-label="required">*</span>
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            aria-describedby={errors.email ? 'email-error' : undefined}
            aria-invalid={errors.email ? 'true' : 'false'}
            {...register('email', {
              required: 'Email is required',
              validate: validateEmail,
            })}
            disabled={isLoading}
          />
          {errors.email && (
            <div id="email-error" className="field-error" role="alert">
              {errors.email.message}
            </div>
          )}
        </div>

        <div className="form-group">
          <label htmlFor="username">
            Username <span aria-label="required">*</span>
          </label>
          <input
            id="username"
            type="text"
            autoComplete="username"
            aria-describedby={errors.username ? 'username-error' : undefined}
            aria-invalid={errors.username ? 'true' : 'false'}
            {...register('username', {
              required: 'Username is required',
              validate: validateUsername,
            })}
            disabled={isLoading}
          />
          {errors.username && (
            <div id="username-error" className="field-error" role="alert">
              {errors.username.message}
            </div>
          )}
        </div>

        <div className="form-group">
          <label htmlFor="displayName">
            Display Name <span aria-label="required">*</span>
          </label>
          <input
            id="displayName"
            type="text"
            autoComplete="name"
            aria-describedby={errors.displayName ? 'display-name-error' : undefined}
            aria-invalid={errors.displayName ? 'true' : 'false'}
            {...register('displayName', {
              required: 'Display name is required',
              minLength: {
                value: 1,
                message: 'Display name is required',
              },
              maxLength: {
                value: 50,
                message: 'Display name must be 50 characters or less',
              },
            })}
            disabled={isLoading}
          />
          {errors.displayName && (
            <div id="display-name-error" className="field-error" role="alert">
              {errors.displayName.message}
            </div>
          )}
        </div>

        <div className="form-group">
          <label htmlFor="password">
            Password <span aria-label="required">*</span>
          </label>
          <input
            id="password"
            type="password"
            autoComplete="new-password"
            aria-describedby={errors.password ? 'password-error' : undefined}
            aria-invalid={errors.password ? 'true' : 'false'}
            {...register('password', {
              required: 'Password is required',
              validate: validatePassword,
            })}
            disabled={isLoading}
          />
          {errors.password && (
            <div id="password-error" className="field-error" role="alert">
              {errors.password.message}
            </div>
          )}
        </div>

        <div className="form-group">
          <label htmlFor="confirmPassword">
            Confirm Password <span aria-label="required">*</span>
          </label>
          <input
            id="confirmPassword"
            type="password"
            autoComplete="new-password"
            aria-describedby={errors.confirmPassword ? 'confirm-password-error' : undefined}
            aria-invalid={errors.confirmPassword ? 'true' : 'false'}
            {...register('confirmPassword', {
              required: 'Please confirm your password',
              validate: validateConfirmPassword,
            })}
            disabled={isLoading}
          />
          {errors.confirmPassword && (
            <div id="confirm-password-error" className="field-error" role="alert">
              {errors.confirmPassword.message}
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="submit-button"
          aria-describedby={isLoading ? 'loading-message' : undefined}
        >
          {isLoading ? 'Signing Up...' : 'Sign Up'}
        </button>

        {isLoading && (
          <div id="loading-message" className="loading-message" aria-live="polite">
            Creating your account, please wait...
          </div>
        )}
      </form>

      <div className="form-footer">
        <p>
          Already have an account?{' '}
          <button
            type="button"
            onClick={onSwitchToSignIn}
            className="link-button"
            disabled={isLoading}
          >
            Sign In
          </button>
        </p>
      </div>

    </div>
  );
};