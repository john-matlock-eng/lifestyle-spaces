import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSpace } from '../stores/spaceStore';
import { useAuth } from '../stores/authStore';
import { useInvitations } from '../hooks/useInvitations';
import { MembersList } from '../components/spaces/MembersList';
import { InviteMemberModal } from '../components/spaces/InviteMemberModal';
import { regenerateInviteCode } from '../services/spaces';
import type { SpaceMemberRole, SpaceMember } from '../types';
import './SpaceDetail.css';

export const SpaceDetail: React.FC = () => {
  const { spaceId } = useParams<{ spaceId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    currentSpace,
    members,
    isLoading,
    error,
    selectSpace,
    clearError
  } = useSpace();

  const {
    spaceInvitations,
    fetchSpaceInvitations
  } = useInvitations();

  const [activeTab, setActiveTab] = useState<'content' | 'members' | 'settings'>('content');
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isActionsMenuOpen, setIsActionsMenuOpen] = useState(false);
  const [copySuccess, setCopySuccess] = useState<string | null>(null);
  const [showRegenerateConfirm, setShowRegenerateConfirm] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);

  // Load space data when component mounts or spaceId changes
  useEffect(() => {
    if (spaceId) {
      clearError();
      selectSpace(spaceId);
      fetchSpaceInvitations(spaceId);
    }
  }, [spaceId, selectSpace, fetchSpaceInvitations, clearError]);

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

  const handleTabClick = (tab: 'content' | 'members' | 'settings') => {
    setActiveTab(tab);
  };

  const handleTabKeyDown = (e: React.KeyboardEvent, tab: 'content' | 'members' | 'settings') => {
    const tabs = ['content', 'members', 'settings'];
    const currentIndex = tabs.indexOf(activeTab);
    
    switch (e.key) {
      case 'ArrowRight': {
        e.preventDefault();
        const nextIndex = (currentIndex + 1) % tabs.length;
        setActiveTab(tabs[nextIndex] as typeof activeTab);
        const nextElement = (e.target as HTMLElement).nextElementSibling;
        if (nextElement && 'focus' in nextElement && typeof nextElement.focus === 'function') {
          (nextElement as HTMLElement).focus();
        }
        break;
      }
      case 'ArrowLeft': {
        e.preventDefault();
        const prevIndex = currentIndex - 1 < 0 ? tabs.length - 1 : currentIndex - 1;
        setActiveTab(tabs[prevIndex] as typeof activeTab);
        const prevElement = (e.target as HTMLElement).previousElementSibling;
        if (prevElement && 'focus' in prevElement && typeof prevElement.focus === 'function') {
          (prevElement as HTMLElement).focus();
        }
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
      setCopySuccess('Space link copied to clipboard!');
      setIsActionsMenuOpen(false);
      setTimeout(() => setCopySuccess(null), 3000);
    } catch (error) {
      console.error('Failed to copy link:', error);
      setCopySuccess('Failed to copy link');
      setTimeout(() => setCopySuccess(null), 3000);
    }
  };

  const handleCopyInviteCode = async () => {
    if (!currentSpace?.inviteCode) return;

    try {
      await navigator.clipboard.writeText(currentSpace.inviteCode);
      setCopySuccess('Invite code copied to clipboard!');
      setTimeout(() => setCopySuccess(null), 3000);
    } catch (error) {
      console.error('Failed to copy invite code:', error);
      setCopySuccess('Failed to copy invite code');
      setTimeout(() => setCopySuccess(null), 3000);
    }
  };

  const handleCopyJoinLink = async () => {
    if (!currentSpace?.inviteCode) return;

    try {
      const joinUrl = `${window.location.origin}/join/${currentSpace.inviteCode}`;
      await navigator.clipboard.writeText(joinUrl);
      setCopySuccess('Join link copied to clipboard!');
      setTimeout(() => setCopySuccess(null), 3000);
    } catch (error) {
      console.error('Failed to copy join link:', error);
      setCopySuccess('Failed to copy join link');
      setTimeout(() => setCopySuccess(null), 3000);
    }
  };

  const handleRegenerateCode = async () => {
    if (!spaceId || isRegenerating) return;

    setIsRegenerating(true);
    try {
      await regenerateInviteCode(spaceId);
      // Update the space with the new invite code
      if (currentSpace) {
        selectSpace(spaceId); // Reload the space to get the new code
      }
      setCopySuccess('Invite code regenerated successfully!');
      setShowRegenerateConfirm(false);
      setTimeout(() => setCopySuccess(null), 3000);
    } catch (error) {
      console.error('Failed to regenerate invite code:', error);
      setCopySuccess('Failed to regenerate invite code');
      setTimeout(() => setCopySuccess(null), 3000);
    } finally {
      setIsRegenerating(false);
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
    if (spaceId) {
      fetchSpaceInvitations(spaceId); // Refresh pending invitations
    }
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

      {/* Copy Success Notification */}
      {copySuccess && (
        <div className="space-detail__notification" role="alert" aria-live="polite">
          {copySuccess}
        </div>
      )}

      {/* Tab Navigation */}
      <div className="space-detail__tabs">
        <div className="tabs" role="tablist" aria-label="Space sections">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'content'}
            aria-controls="content-panel"
            id="content-tab"
            onClick={() => handleTabClick('content')}
            onKeyDown={(e) => handleTabKeyDown(e, 'content')}
            className={`tab ${activeTab === 'content' ? 'tab--active' : ''}`}
          >
            Content
          </button>
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
          {isOwner && (
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'settings'}
              aria-controls="settings-panel"
              id="settings-tab"
              onClick={() => handleTabClick('settings')}
              onKeyDown={(e) => handleTabKeyDown(e, 'settings')}
              className={`tab ${activeTab === 'settings' ? 'tab--active' : ''}`}
            >
              Settings
            </button>
          )}
        </div>
      </div>

      {/* Tab Content */}
      <main 
        className="space-detail__main"
        role="main"
        aria-labelledby="space-title"
      >
        {activeTab === 'content' && (
          <div
            role="tabpanel"
            id="content-panel"
            aria-labelledby="content-tab"
            className="tab-panel"
          >
            <div className="space-detail__content">
              <div className="space-detail__coming-soon">
                <h3>Content</h3>
                <p>Content management features coming soon!</p>
                <div className="space-detail__placeholder-content">
                  <div className="space-detail__placeholder-item">
                    <div className="space-detail__placeholder-icon">📄</div>
                    <div>
                      <h4>Documents</h4>
                      <p>Shared documents and files</p>
                    </div>
                  </div>
                  <div className="space-detail__placeholder-item">
                    <div className="space-detail__placeholder-icon">💬</div>
                    <div>
                      <h4>Discussions</h4>
                      <p>Team conversations and announcements</p>
                    </div>
                  </div>
                  <div className="space-detail__placeholder-item">
                    <div className="space-detail__placeholder-icon">📊</div>
                    <div>
                      <h4>Analytics</h4>
                      <p>Space activity and insights</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'members' && (
          <div
            role="tabpanel"
            id="members-panel"
            aria-labelledby="members-tab"
            className="tab-panel"
          >
            {/* Invitation Section for Owners/Admins */}
            {isAdmin && (
              <div className="space-detail__invite-section">
                <h3>Invite Members</h3>
                <div className="space-detail__invite-actions">
                  <button
                    type="button"
                    onClick={() => setIsInviteModalOpen(true)}
                    className="btn btn-primary"
                  >
                    Send Email Invitation
                  </button>
                  {currentSpace?.inviteCode && (
                    <div className="space-detail__invite-code">
                      <div className="space-detail__invite-code-section">
                        <label htmlFor="invite-code" className="space-detail__invite-code-label">
                          Invite Code
                        </label>
                        <div className="space-detail__invite-code-input-group">
                          <input
                            id="invite-code"
                            type="text"
                            value={currentSpace.inviteCode}
                            readOnly
                            className="space-detail__invite-code-input"
                          />
                          <button
                            type="button"
                            onClick={handleCopyInviteCode}
                            className="btn btn-secondary"
                            title="Copy invite code"
                          >
                            Copy Code
                          </button>
                          <button
                            type="button"
                            onClick={handleCopyJoinLink}
                            className="btn btn-secondary"
                            title="Copy join link"
                          >
                            Copy Link
                          </button>
                          <button
                            type="button"
                            onClick={() => setShowRegenerateConfirm(true)}
                            className="btn btn-secondary"
                            title="Regenerate invite code"
                          >
                            Regenerate
                          </button>
                        </div>
                        <p className="space-detail__invite-code-description">
                          Share this code or link with people you want to invite to the space.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            <MembersList
              members={members}
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
              pendingInvitations={spaceInvitations[spaceId || ''] || []}
            />
          </div>
        )}

        {activeTab === 'settings' && isOwner && (
          <div
            role="tabpanel"
            id="settings-panel"
            aria-labelledby="settings-tab"
            className="tab-panel"
          >
            <div className="space-detail__settings">
              <h3>Space Settings</h3>
              <div className="space-detail__settings-section">
                <h4>General Settings</h4>
                <div className="space-detail__settings-grid">
                  <div className="space-detail__setting-item">
                    <label className="space-detail__setting-label">
                      Space Name
                    </label>
                    <input
                      type="text"
                      value={currentSpace?.name || ''}
                      readOnly
                      className="space-detail__setting-input space-detail__setting-input--readonly"
                    />
                    <p className="space-detail__setting-description">
                      Name editing coming soon
                    </p>
                  </div>
                  <div className="space-detail__setting-item">
                    <label className="space-detail__setting-label">
                      Visibility
                    </label>
                    <div className="space-detail__setting-radio-group">
                      <label className="space-detail__setting-radio">
                        <input
                          type="radio"
                          name="visibility"
                          value="public"
                          checked={currentSpace?.isPublic}
                          readOnly
                        />
                        Public - Anyone can find and join
                      </label>
                      <label className="space-detail__setting-radio">
                        <input
                          type="radio"
                          name="visibility"
                          value="private"
                          checked={!currentSpace?.isPublic}
                          readOnly
                        />
                        Private - Invite only
                      </label>
                    </div>
                    <p className="space-detail__setting-description">
                      Visibility settings coming soon
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="space-detail__settings-section space-detail__settings-section--danger">
                <h4>Danger Zone</h4>
                <div className="space-detail__setting-item">
                  <button
                    type="button"
                    className="btn btn-danger"
                    disabled
                  >
                    Delete Space
                  </button>
                  <p className="space-detail__setting-description">
                    Space deletion coming soon. This action cannot be undone.
                  </p>
                </div>
              </div>
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

      {/* Regenerate Confirmation Dialog */}
      {showRegenerateConfirm && (
        <div className="space-detail__modal-overlay" onClick={() => !isRegenerating && setShowRegenerateConfirm(false)}>
          <div className="space-detail__modal" onClick={(e) => e.stopPropagation()}>
            <div className="space-detail__modal-header">
              <h3>Regenerate Invite Code?</h3>
            </div>
            <div className="space-detail__modal-body">
              <p>This will invalidate the old invite code. Anyone with the old code will no longer be able to use it to join this space.</p>
              <p className="space-detail__modal-warning">This action cannot be undone.</p>
            </div>
            <div className="space-detail__modal-footer">
              <button
                type="button"
                onClick={() => setShowRegenerateConfirm(false)}
                className="btn btn-secondary"
                disabled={isRegenerating}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRegenerateCode}
                className="btn btn-primary"
                disabled={isRegenerating}
              >
                {isRegenerating ? 'Regenerating...' : 'Continue'}
              </button>
            </div>
          </div>
        </div>
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