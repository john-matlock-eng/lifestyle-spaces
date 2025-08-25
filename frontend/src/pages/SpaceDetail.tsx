import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSpace } from '../stores/spaceStore';
import { useAuth } from '../stores/authStore';
import { MembersList } from '../components/spaces/MembersList';
import { InviteMemberModal } from '../components/spaces/InviteMemberModal';
import { SpaceMemberRole, SpaceMember } from '../types';
import './SpaceDetail.css';

export const SpaceDetail: React.FC = () => {
  const { spaceId } = useParams<{ spaceId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { 
    currentSpace, 
    members, 
    invitations,
    isLoading, 
    error, 
    selectSpace, 
    loadPendingInvitations,
    clearError 
  } = useSpace();

  const [activeTab, setActiveTab] = useState<'members' | 'activity' | 'files'>('members');
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isActionsMenuOpen, setIsActionsMenuOpen] = useState(false);

  // Load space data when component mounts or spaceId changes
  useEffect(() => {
    if (spaceId) {
      clearError();
      selectSpace(spaceId);
      loadPendingInvitations();
    }
  }, [spaceId, selectSpace, loadPendingInvitations, clearError]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const isOwner = currentSpace && user && currentSpace.ownerId === user.userId;
  const isAdmin = members.some(member => 
    member.userId === user?.userId && (member.role === 'admin' || member.role === 'owner')
  );

  const handleTabClick = (tab: 'members' | 'activity' | 'files') => {
    setActiveTab(tab);
  };

  const handleTabKeyDown = (e: React.KeyboardEvent, tab: 'members' | 'activity' | 'files') => {
    const tabs = ['members', 'activity', 'files'];
    const currentIndex = tabs.indexOf(activeTab);
    
    switch (e.key) {
      case 'ArrowRight': {
        e.preventDefault();
        const nextIndex = (currentIndex + 1) % tabs.length;
        setActiveTab(tabs[nextIndex]);
        (e.target as HTMLElement).nextElementSibling?.focus();
        break;
      }
      case 'ArrowLeft': {
        e.preventDefault();
        const prevIndex = currentIndex - 1 < 0 ? tabs.length - 1 : currentIndex - 1;
        setActiveTab(tabs[prevIndex]);
        (e.target as HTMLElement).previousElementSibling?.focus();
        break;
      }
      case 'Enter':
      case ' ':
        e.preventDefault();
        setActiveTab(tab);
        break;
    }
  };

  const handleCopySpaceLink = async () => {
    try {
      const url = `${window.location.origin}/space/${spaceId}`;
      await navigator.clipboard.writeText(url);
      // You could add a toast notification here
      setIsActionsMenuOpen(false);
    } catch (error) {
      console.error('Failed to copy link:', error);
    }
  };

  const handleRoleChange = (userId: string, newRole: SpaceMemberRole) => {
    // This would be implemented with the space store
    console.log('Change role:', userId, newRole);
  };

  const handleRemoveMember = (userId: string) => {
    // This would be implemented with the space store
    console.log('Remove member:', userId);
  };

  const handleMemberClick = (member: SpaceMember) => {
    // Navigate to member profile or show member details
    console.log('Member clicked:', member);
  };

  const handleInviteSent = () => {
    setIsInviteModalOpen(false);
    loadPendingInvitations(); // Refresh pending invitations
  };

  const handleCancelInvitation = (invitationId: string) => {
    // This would be implemented with the space store
    console.log('Cancel invitation:', invitationId);
  };

  if (isLoading) {
    return (
      <div className="space-detail__loading" role="status" aria-live="polite">
        <div className="space-detail__loading-spinner" aria-hidden="true" />
        <span>Loading space...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-detail__error" role="alert">
        <div className="space-detail__error-icon">⚠️</div>
        <div className="space-detail__error-content">
          <h2 className="space-detail__error-title">Unable to load space</h2>
          <p className="space-detail__error-message">{error}</p>
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            className="btn btn-primary"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (!currentSpace) {
    return (
      <div className="space-detail__not-found">
        <div className="space-detail__not-found-icon">🔍</div>
        <h2 className="space-detail__not-found-title">Space not found</h2>
        <p className="space-detail__not-found-description">
          The space you're looking for doesn't exist or you don't have permission to view it.
        </p>
        <button
          type="button"
          onClick={() => navigate('/dashboard')}
          className="btn btn-primary"
        >
          Back to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="space-detail">
      {/* Breadcrumb Navigation */}
      <nav className="space-detail__breadcrumb" role="navigation" aria-label="Breadcrumb">
        <ol className="breadcrumb">
          <li className="breadcrumb__item">
            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              className="breadcrumb__link"
            >
              Dashboard
            </button>
          </li>
          <li className="breadcrumb__separator" aria-hidden="true">/</li>
          <li className="breadcrumb__item breadcrumb__item--current" aria-current="page">
            {currentSpace.name}
          </li>
        </ol>
      </nav>

      {/* Space Header */}
      <header className="space-detail__header">
        <div className="space-detail__header-main">
          <div className="space-detail__title-section">
            <h1 id="space-title" className="space-detail__title">
              {currentSpace.name}
            </h1>
            <div className="space-detail__badges">
              <span 
                className={`space-detail__visibility-badge space-detail__visibility-badge--${
                  currentSpace.isPublic ? 'public' : 'private'
                }`}
              >
                {currentSpace.isPublic ? 'Public' : 'Private'}
              </span>
              <span className="space-detail__member-count">
                {currentSpace.memberCount} {currentSpace.memberCount === 1 ? 'member' : 'members'}
              </span>
            </div>
          </div>

          <div className="space-detail__actions">
            {isAdmin && (
              <button
                type="button"
                onClick={() => setIsInviteModalOpen(true)}
                className="btn btn-primary"
              >
                Invite Members
              </button>
            )}

            <div className="space-detail__actions-menu">
              <button
                type="button"
                onClick={() => setIsActionsMenuOpen(!isActionsMenuOpen)}
                className="btn btn-secondary"
                aria-expanded={isActionsMenuOpen}
                aria-haspopup="true"
              >
                Actions
              </button>
              
              {isActionsMenuOpen && (
                <div className="space-detail__actions-dropdown">
                  <button
                    type="button"
                    onClick={() => setIsInviteModalOpen(true)}
                    className="space-detail__action-item"
                  >
                    Invite Members
                  </button>
                  <button
                    type="button"
                    onClick={handleCopySpaceLink}
                    className="space-detail__action-item"
                  >
                    Copy Space Link
                  </button>
                  {isOwner && (
                    <button
                      type="button"
                      onClick={() => {/* Navigate to settings */}}
                      className="space-detail__action-item"
                    >
                      Space Settings
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {currentSpace.description && (
          <div className="space-detail__description">
            <p>{currentSpace.description}</p>
          </div>
        )}

        <div className="space-detail__meta">
          <div className="space-detail__meta-item">
            <span className="space-detail__meta-label">Created:</span>
            <span className="space-detail__meta-value">
              {formatDate(currentSpace.createdAt)}
            </span>
          </div>
          {currentSpace.updatedAt !== currentSpace.createdAt && (
            <div className="space-detail__meta-item">
              <span className="space-detail__meta-label">Updated:</span>
              <span className="space-detail__meta-value">
                {formatDate(currentSpace.updatedAt)}
              </span>
            </div>
          )}
        </div>
      </header>

      {/* Tab Navigation */}
      <div className="space-detail__tabs">
        <div className="tabs" role="tablist" aria-label="Space sections">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'members'}
            aria-controls="members-panel"
            id="members-tab"
            onClick={() => handleTabClick('members')}
            onKeyDown={(e) => handleTabKeyDown(e, 'members')}
            className={`tab ${activeTab === 'members' ? 'tab--active' : ''}`}
          >
            Members
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'activity'}
            aria-controls="activity-panel"
            id="activity-tab"
            onClick={() => handleTabClick('activity')}
            onKeyDown={(e) => handleTabKeyDown(e, 'activity')}
            className={`tab ${activeTab === 'activity' ? 'tab--active' : ''}`}
          >
            Activity
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'files'}
            aria-controls="files-panel"
            id="files-tab"
            onClick={() => handleTabClick('files')}
            onKeyDown={(e) => handleTabKeyDown(e, 'files')}
            className={`tab ${activeTab === 'files' ? 'tab--active' : ''}`}
          >
            Files
          </button>
        </div>
      </div>

      {/* Tab Content */}
      <main 
        className="space-detail__main"
        role="main"
        aria-labelledby="space-title"
      >
        {activeTab === 'members' && (
          <div
            role="tabpanel"
            id="members-panel"
            aria-labelledby="members-tab"
            className="tab-panel"
          >
            <MembersList
              members={members}
              space={currentSpace}
              currentUserId={user?.userId || ''}
              onRoleChange={isAdmin ? handleRoleChange : undefined}
              onRemoveMember={isAdmin ? handleRemoveMember : undefined}
              onMemberClick={handleMemberClick}
              onInviteClick={isAdmin ? () => setIsInviteModalOpen(true) : undefined}
              onCancelInvitation={isAdmin ? handleCancelInvitation : undefined}
              canManageRoles={isAdmin}
              canRemoveMembers={isAdmin}
              canInviteMembers={isAdmin}
              canManageInvitations={isAdmin}
              searchable={true}
              filterable={true}
              sortable={true}
              showPendingInvitations={isAdmin}
              pendingInvitations={invitations}
            />
          </div>
        )}

        {activeTab === 'activity' && (
          <div
            role="tabpanel"
            id="activity-panel"
            aria-labelledby="activity-tab"
            className="tab-panel"
          >
            <div className="space-detail__coming-soon">
              <h3>Activity Feed</h3>
              <p>Activity tracking coming soon!</p>
            </div>
          </div>
        )}

        {activeTab === 'files' && (
          <div
            role="tabpanel"
            id="files-panel"
            aria-labelledby="files-tab"
            className="tab-panel"
          >
            <div className="space-detail__coming-soon">
              <h3>File Sharing</h3>
              <p>File sharing features coming soon!</p>
            </div>
          </div>
        )}
      </main>

      {/* Invite Modal */}
      {isInviteModalOpen && (
        <InviteMemberModal
          isOpen={isInviteModalOpen}
          onClose={() => setIsInviteModalOpen(false)}
          space={currentSpace}
          onInviteSent={handleInviteSent}
          existingMemberEmails={members.map(member => member.email)}
        />
      )}

      {/* Click outside to close actions menu */}
      {isActionsMenuOpen && (
        <div
          className="space-detail__overlay"
          onClick={() => setIsActionsMenuOpen(false)}
        />
      )}
    </div>
  );
};