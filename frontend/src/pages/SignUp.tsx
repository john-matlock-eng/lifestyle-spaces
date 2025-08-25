import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthLayout } from '../components/auth/AuthLayout';
import { SignUpForm } from '../components/auth/SignUpForm';
import { useAuth } from '../stores/authStore';
import { SignUpData } from '../types';

export const SignUp: React.FC = () => {
  const navigate = useNavigate();
  const { signUp, isLoading, error } = useAuth();

  const handleSignUp = async (data: SignUpData) => {
    try {
      const response = await signUp(data);
      if (response.isSignUpComplete) {
        navigate('/signin');
      }
    } catch (error) {
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