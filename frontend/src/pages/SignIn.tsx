import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AuthLayout } from '../components/auth/AuthLayout';
import { SignInForm } from '../components/auth/SignInForm';
import { useAuth } from '../stores/authStore';
import type { SignInData } from '../types';

export const SignIn: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { signIn, isLoading, error } = useAuth();

  // Extract success message from navigation state
  const successMessage = location.state?.successMessage || null;

  const handleSignIn = async (data: SignInData & { rememberMe?: boolean }) => {
    try {
      await signIn({ email: data.email, password: data.password });
      navigate('/dashboard');
    } catch {
      // Error is handled by auth store
    }
  };

  const handleSwitchToSignUp = () => {
    navigate('/signup');
  };

  return (
    <AuthLayout>
      <SignInForm
        onSubmit={handleSignIn}
        onSwitchToSignUp={handleSwitchToSignUp}
        isLoading={isLoading}
        error={error}
        successMessage={successMessage}
      />
    </AuthLayout>
  );
};