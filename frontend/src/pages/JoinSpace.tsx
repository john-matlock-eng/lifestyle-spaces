import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { joinSpaceWithInviteCode } from '../services/spaces';
import { AuthLayout } from '../components/auth/AuthLayout';
import type { Space } from '../types';
import './JoinSpace.css';

interface JoinSpaceState {
  isLoading: boolean;
  isJoining: boolean;
  error: string | null;
  space: Space | null;
  inviteCode: string;
}

export const JoinSpace: React.FC = () => {
  const { inviteCode } = useParams<{ inviteCode: string }>();
  const navigate = useNavigate();
  

  const [state, setState] = useState<JoinSpaceState>({
    isLoading: false,
    isJoining: false,
    error: null,
    space: null,
    inviteCode: inviteCode || '',
  });

  const handleJoinSpace = async () => {
    if (!state.inviteCode.trim()) {
      setState(prev => ({ ...prev, error: 'Invalid invite code' }));
      return;
    }

    setState(prev => ({ ...prev, isJoining: true, error: null }));

    try {
      const joinedSpace = await joinSpaceWithInviteCode(state.inviteCode.trim());
      
      // Navigate to the space detail page on success
      navigate(`/space/${joinedSpace.spaceId}`, {
        replace: true,
        state: { successMessage: `Successfully joined ${joinedSpace.name}!` }
      });
    } catch (error) {
      let errorMessage = 'Failed to join space';
      
      if (error instanceof Error) {
        // Handle specific error cases
        if (error.message.includes('expired') || error.message.includes('invalid')) {
          errorMessage = 'This invite code is invalid or has expired';
        } else if (error.message.includes('already') || error.message.includes('member')) {
          errorMessage = 'You are already a member of this space';
        } else if (error.message.includes('not found')) {
          errorMessage = 'Space not found with this invite code';
        } else {
          errorMessage = error.message;
        }
      }

      setState(prev => ({ ...prev, error: errorMessage, isJoining: false }));
    }
  };

  const handleCancel = () => {
    navigate('/dashboard');
  };

  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && !state.isJoining) {
      handleJoinSpace();
    } else if (event.key === 'Escape') {
      handleCancel();
    }
  };

  // Validate invite code on mount
  useEffect(() => {
    if (!inviteCode || inviteCode.trim() === '') {
      setState(prev => ({ ...prev, error: 'Invalid invite code provided' }));
      return;
    }

    setState(prev => ({ ...prev, inviteCode: inviteCode, error: null }));
  }, [inviteCode]);

  const isValidInviteCode = state.inviteCode.trim().length > 0;
  const hasError = !!state.error;

  return (
    <AuthLayout>
      <div className="join-space-container" onKeyDown={handleKeyPress} tabIndex={-1}>
        <div className="join-space-card">
          <header className="join-space-header">
            <h2>Join Space</h2>
            <p>You've been invited to join a lifestyle space</p>
          </header>

          {hasError && (
            <div className="error-message" role="alert" aria-live="polite">
              {state.error}
            </div>
          )}

          <div className="invite-code-display">
            <label htmlFor="invite-code" className="invite-code-label">
              Invite Code:
            </label>
            <div 
              id="invite-code" 
              className="invite-code-value"
              data-testid="invite-code-display"
            >
              {state.inviteCode || 'No invite code provided'}
            </div>
          </div>

          <div className="join-space-actions">
            <button
              type="button"
              onClick={handleJoinSpace}
              disabled={state.isJoining || !isValidInviteCode}
              className="join-button"
              data-testid="join-button"
              aria-describedby={hasError ? 'error-message' : undefined}
            >
              {state.isJoining ? (
                <>
                  <span className="loading-spinner" aria-hidden="true"></span>
                  Joining...
                </>
              ) : (
                'Join Space'
              )}
            </button>

            <button
              type="button"
              onClick={handleCancel}
              disabled={state.isJoining}
              className="cancel-button"
              data-testid="cancel-button"
            >
              Cancel
            </button>
          </div>

          <div className="join-space-info">
            <p>
              By joining this space, you'll be able to participate in discussions,
              share content, and connect with other members.
            </p>
          </div>
        </div>
      </div>
    </AuthLayout>
  );
};