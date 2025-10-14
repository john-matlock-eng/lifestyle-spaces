import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../stores/authStore';
import { useSpace } from '../stores/spaceStore';
import { SpaceList } from '../components/spaces/SpaceList';
import { CreateSpaceModal } from '../components/spaces/CreateSpaceModal';
import { JoinByCodeForm } from '../components/invitations/JoinByCodeForm';
import { Ellie } from '../components/ellie';
import { useShihTzuCompanion } from '../hooks';
import { useEllieCustomizationContext } from '../hooks/useEllieCustomizationContext';
import type { Space } from '../types';
import './Dashboard.css';

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { spaces, loadSpaces, isLoading, error } = useSpace();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [showJoinByCode, setShowJoinByCode] = useState(false);

  // Ellie companion
  const { mood, setMood, position, celebrate } = useShihTzuCompanion({
    initialMood: 'excited',
    initialPosition: {
      x: Math.min(window.innerWidth * 0.75, window.innerWidth - 200),
      y: 100
    }
  });

  // Ellie customization
  const { customization } = useEllieCustomizationContext();

  useEffect(() => {
    loadSpaces();
  }, [loadSpaces]); // Include loadSpaces in dependency array to satisfy ESLint

  const handleSpaceClick = (space: Space) => {
    navigate(`/space/${space.spaceId}`);
  };

  const handleCreateSpace = () => {
    setIsCreateModalOpen(true);
    setMood('curious');
  };

  const handleSpaceCreated = (space: Space) => {
    setIsCreateModalOpen(false);
    celebrate();
    // The spaces list is automatically updated via the store's ADD_SPACE action
    // Navigate to the newly created space
    navigate(`/space/${space.spaceId}`);
  };

  const handleRetryLoadSpaces = () => {
    loadSpaces();
  };

  const handleJoinByCodeSuccess = (result: { spaceId: string; spaceName: string }) => {
    setShowJoinByCode(false);
    celebrate();
    // Reload spaces to include the newly joined space
    loadSpaces();
    // Navigate to the newly joined space
    navigate(`/space/${result.spaceId}`);
  };

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div className="dashboard-header__content">
          <div className="dashboard-header__text">
            <h1>Welcome back, {user?.displayName}!</h1>
            <p>Manage your spaces and connect with others.</p>
          </div>
          <div className="dashboard-header__actions">
            <button
              type="button"
              onClick={handleCreateSpace}
              className="btn btn-primary"
            >
              Create Space
            </button>
          </div>
        </div>
      </header>

      <main className="dashboard-main">
        {/* Join with Code Section */}
        {!showJoinByCode && (
          <div className="dashboard-join-section">
            <div className="dashboard-join-card">
              <div className="dashboard-join-card__icon">
                <svg
                  className="w-8 h-8 text-blue-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
              </div>
              <div className="dashboard-join-card__content">
                <h3 className="dashboard-join-card__title">Have an invite code?</h3>
                <p className="dashboard-join-card__description">
                  Join a space instantly using an invitation code
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowJoinByCode(true)}
                className="btn btn-primary dashboard-join-card__button"
              >
                Join with Code
              </button>
            </div>
          </div>
        )}

        {/* Join by Code Form */}
        {showJoinByCode && (
          <div className="dashboard-join-section">
            <JoinByCodeForm
              onSuccess={handleJoinByCodeSuccess}
              onCancel={() => setShowJoinByCode(false)}
              className="dashboard-join-form"
            />
          </div>
        )}

        <div className="spaces-section">
          <div className="spaces-section__header">
            <h2>Your Spaces</h2>
          </div>

          <SpaceList
            spaces={spaces}
            onSpaceClick={handleSpaceClick}
            isLoading={isLoading}
            error={error}
            onRetry={handleRetryLoadSpaces}
            searchable={true}
            sortable={true}
            layout="grid"
            className="dashboard-spaces-list"
          />
        </div>
      </main>

      {/* Create Space Modal */}
      {isCreateModalOpen && (
        <CreateSpaceModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onSpaceCreated={handleSpaceCreated}
        />
      )}

      {/* Ellie companion */}
      <Ellie
        mood={mood}
        position={position}
        showThoughtBubble={true}
        thoughtText={spaces.length === 0
          ? "Welcome! Create your first space to get started! 🎉"
          : "Welcome back! Ready to manage your spaces? 😊"}
        size="md"
        onClick={() => setMood(mood === 'playful' ? 'happy' : 'playful')}
        particleEffect={mood === 'celebrating' ? 'hearts' : null}
        furColor={customization.furColor}
        collarStyle={customization.collarStyle}
        collarColor={customization.collarColor}
        collarTag={customization.collarTag}
      />
    </div>
  );
};