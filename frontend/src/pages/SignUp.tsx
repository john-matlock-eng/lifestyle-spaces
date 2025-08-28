import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthLayout } from '../components/auth/AuthLayout';
import { SignUpForm } from '../components/auth/SignUpForm';
import { useAuth } from '../stores/authStore';
import type { SignUpData } from '../types';

export const SignUp: React.FC = () => {
  const navigate = useNavigate();
  const { signUp, isLoading, error } = useAuth();

  const handleSignUp = async (data: SignUpData) => {
    try {
      const response = await signUp(data);
      // Always redirect to sign-in page with success message
      // regardless of whether confirmation is needed
      navigate('/signin', {
        state: { 
          successMessage: 'Account created successfully! Please sign in to continue.' 
        },
      });
    } catch {
      // Error is handled by auth store
    }
  };

  const handleSwitchToSignIn = () => {
    navigate('/signin');
  };

  return (
    <AuthLayout>
      <SignUpForm
        onSubmit={handleSignUp}
        onSwitchToSignIn={handleSwitchToSignIn}
        isLoading={isLoading}
        error={error}
      />
    </AuthLayout>
  );
};