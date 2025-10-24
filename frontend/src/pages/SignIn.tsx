import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AuthLayout } from '../components/auth/AuthLayout';
import { SignInForm } from '../components/auth/SignInForm';
import { useAuth } from '../stores/authStore';
import type { SignInData } from '../types';
import { SmartEllie, EllieBottomBar } from '../components/ellie';
import type { EllieMode } from '../components/ellie/modes/types';

export const SignIn: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { signIn, isLoading, error } = useAuth();

  // Extract success message from navigation state
  const successMessage = location.state?.successMessage || null;

  // Ellie companion state
  const [mood, setMood] = useState<'idle' | 'happy' | 'excited' | 'curious' | 'playful' | 'sleeping' | 'walking' | 'concerned' | 'proud' | 'zen' | 'celebrating'>('happy');
  const [ellieMode, setEllieMode] = useState<EllieMode>('companion');
  const [ellieOpacity, setEllieOpacity] = useState(1.0);

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
    <>
      <AuthLayout>
        <SignInForm
          onSubmit={handleSignIn}
          onSwitchToSignUp={handleSwitchToSignUp}
          isLoading={isLoading}
          error={error}
          successMessage={successMessage}
        />
      </AuthLayout>

      {/* Ellie Companion */}
      <SmartEllie
        mood={mood}
        size="md"
        showThoughtBubble={true}
        thoughtText="Ready to sign in? 😊"
        onClick={() => setMood(mood === 'happy' ? 'excited' : 'happy')}
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