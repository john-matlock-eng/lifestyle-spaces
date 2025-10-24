import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthLayout } from '../components/auth/AuthLayout';
import { SignUpForm } from '../components/auth/SignUpForm';
import { useAuth } from '../stores/authStore';
import type { SignUpData } from '../types';
import { SmartEllie, EllieBottomBar } from '../components/ellie';
import type { EllieMode } from '../components/ellie/modes/types';

export const SignUp: React.FC = () => {
  const navigate = useNavigate();
  const { signUp, isLoading, error } = useAuth();

  // Ellie companion state
  const [mood, setMood] = useState<'idle' | 'happy' | 'excited' | 'curious' | 'playful' | 'sleeping' | 'walking' | 'concerned' | 'proud' | 'zen' | 'celebrating'>('excited');
  const [ellieMode, setEllieMode] = useState<EllieMode>('companion');
  const [ellieOpacity, setEllieOpacity] = useState(1.0);

  const handleSignUp = async (data: SignUpData) => {
    try {
      await signUp(data);
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
    <>
      <AuthLayout>
        <SignUpForm
          onSubmit={handleSignUp}
          onSwitchToSignIn={handleSwitchToSignIn}
          isLoading={isLoading}
          error={error}
        />
      </AuthLayout>

      {/* Ellie Companion */}
      <SmartEllie
        mood={mood}
        size="md"
        showThoughtBubble={true}
        thoughtText="Let's get started! 🎉"
        onClick={() => setMood(mood === 'excited' ? 'celebrating' : 'excited')}
        enableSmartPositioning={true}
        showControlPanel={false}
      />

      {/* Transparent Bottom Bar with Ellie Control */}
      <EllieBottomBar
        currentMode={ellieMode}
        onModeChange={setEllieMode}
        opacity={ellieOpacity}
        onOpacityChange={setEllieOpacity}
      />
    </>
  );
};