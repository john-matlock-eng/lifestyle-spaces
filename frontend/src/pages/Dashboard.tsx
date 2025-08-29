import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../stores/authStore';
import { useSpace } from '../stores/spaceStore';
import { SpaceList } from '../components/spaces/SpaceList';
import { CreateSpaceModal } from '../components/spaces/CreateSpaceModal';
import type { Space } from '../types';
import './Dashboard.css';

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { spaces, loadSpaces, isLoading, error } = useSpace();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  useEffect(() => {
    loadSpaces();
  }, []); // Empty dependency array - loadSpaces is stable and should only run on mount

  const handleSpaceClick = (space: Space) => {
    navigate(`/space/${space.spaceId}`);
  };

  const handleCreateSpace = () => {
    setIsCreateModalOpen(true);
  };

  const handleSpaceCreated = (space: Space) => {
    setIsCreateModalOpen(false);
    // Navigate to the newly created space
    navigate(`/space/${space.spaceId}`);
  };

  const handleRetryLoadSpaces = () => {
    loadSpaces();
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
    </div>
  );
};