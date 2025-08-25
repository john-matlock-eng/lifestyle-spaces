import React from 'react';
import { useForm } from 'react-hook-form';
import { SignInData } from '../../types';
import './auth.css';

interface SignInFormProps {
  onSubmit: (data: SignInData & { rememberMe?: boolean }) => Promise<void>;
  onSwitchToSignUp: () => void;
  isLoading: boolean;
  error: string | null;
}

interface FormData extends SignInData {
  rememberMe: boolean;
}

export const SignInForm: React.FC<SignInFormProps> = ({
  onSubmit,
  onSwitchToSignUp,
  isLoading,
  error,
}) => {
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<FormData>({
    mode: 'all', // Validate on submit, blur, and change
    reValidateMode: 'onChange'
  });

  const onFormSubmit = async (data: FormData) => {
    try {
      await onSubmit({
        email: data.email,
        password: data.password,
        rememberMe: data.rememberMe,
      });
      reset();
    } catch {
      // Error is handled by parent component
    }
  };

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email) || 'Invalid email format';
  };

  return (
    <div className="sign-in-form">
      <div className="form-header">
        <h2>Welcome Back</h2>
        <p>Sign in to your Lifestyle Spaces account to continue.</p>
      </div>

      {error && (
        <div className="error-message" role="alert" aria-live="polite">
          {error}
        </div>
      )}

      <form
        onSubmit={handleSubmit(onFormSubmit)}
        role="form"
        aria-label="Sign in form"
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
          <label htmlFor="password">
            Password <span aria-label="required">*</span>
          </label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            aria-describedby={errors.password ? 'password-error' : undefined}
            aria-invalid={errors.password ? 'true' : 'false'}
            {...register('password', {
              required: 'Password is required',
            })}
            disabled={isLoading}
          />
          {errors.password && (
            <div id="password-error" className="field-error" role="alert">
              {errors.password.message}
            </div>
          )}
        </div>

        <div className="form-options">
          <div className="checkbox-group">
            <input
              id="rememberMe"
              type="checkbox"
              {...register('rememberMe')}
              disabled={isLoading}
            />
            <label htmlFor="rememberMe" className="checkbox-label">
              Remember me
            </label>
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="submit-button"
          aria-describedby={isLoading ? 'loading-message' : undefined}
        >
          {isLoading ? 'Signing In...' : 'Sign In'}
        </button>

        {isLoading && (
          <div id="loading-message" className="loading-message" aria-live="polite">
            Signing you in, please wait...
          </div>
        )}
      </form>

      <div className="form-footer">
        <p>
          Don't have an account?{' '}
          <button
            type="button"
            onClick={onSwitchToSignUp}
            className="link-button"
            disabled={isLoading}
          >
            Sign Up
          </button>
        </p>
      </div>

    </div>
  );
};