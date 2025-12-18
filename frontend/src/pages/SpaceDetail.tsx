import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSpace } from '../stores/spaceStore';
import { useAuth } from '../stores/authStore';
import { useInvitations } from '../hooks/useInvitations';
import { useTheme } from '../theme/useTheme';
import { MembersList } from '../components/spaces/MembersList';
import { InviteMemberModal } from '../components/spaces/InviteMemberModal';
import { JournalList } from '../features/journal/components/JournalList';
import { ActivityFeed } from '../components/ActivityFeed';
import { ConversationsTab } from '../components/ConversationsTab';
import { regenerateInviteCode, updateSpace } from '../services/spaces';
import { conversationService } from '../services/conversationService';
import { ElliePerch } from '../components/ellie';
import { useEllieCustomizationContext } from '../hooks/useEllieCustomizationContext';
import { FrameworksTab } from '../components/frameworks';
import type { SpaceMemberRole, SpaceMember } from '../types';
import './SpaceDetail.css';

// Valid tab names - defined outside component to avoid recreating on every render
const VALID_TABS = ['content', 'journals', 'frameworks', 'conversations', 'members', 'settings', 'schedules'] as const;
type TabName = typeof VALID_TABS[number];

export const SpaceDetail: React.FC = () => {
  const { spaceId, tab } = useParams<{ spaceId: string; tab?: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isDark } = useTheme();
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

  // Initialize activeTab from URL or default to 'content'
  const isValidTab = (t: string | undefined): t is TabName => {
    return t !== undefined && VALID_TABS.includes(t as TabName);
  };
  const initialTab = isValidTab(tab) ? tab : 'content';
  const [activeTab, setActiveTab] = useState<TabName>(initialTab);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isActionsMenuOpen, setIsActionsMenuOpen] = useState(false);
  const [copySuccess, setCopySuccess] = useState<string | null>(null);
  const [showRegenerateConfirm, setShowRegenerateConfirm] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [isEditingCalendar, setIsEditingCalendar] = useState(false);
  const [calendarUrlInput, setCalendarUrlInput] = useState('');

  // Conversation unread counts for tab badge
  const [conversationUnreadCount, setConversationUnreadCount] = useState(0);
  const [, setConversationRepliesCount] = useState(0);

  // Ellie companion state
  const [mood, setMood] = useState<'idle' | 'happy' | 'excited' | 'curious' | 'playful' | 'sleeping' | 'walking' | 'concerned' | 'proud' | 'zen' | 'celebrating'>('happy');

  // Ellie customization
  const { customization } = useEllieCustomizationContext();

  // Load space data when component mounts or spaceId changes
  useEffect(() => {
    if (spaceId) {
      clearError();
      selectSpace(spaceId);
      fetchSpaceInvitations(spaceId);
      // Fetch initial unread count for conversations tab badge
      conversationService.getUnreadCount(spaceId)
        .then(response => {
          setConversationUnreadCount(response.totalUnread);
          setConversationRepliesCount(response.threadsWithReplies);
        })
        .catch(err => console.error('Error fetching unread count:', err));
    }
  }, [spaceId, selectSpace, fetchSpaceInvitations, clearError]);

  // Callback for ConversationsTab to update unread counts
  const handleConversationUnreadChange = useCallback((count: number, repliesCount: number) => {
    setConversationUnreadCount(count);
    setConversationRepliesCount(repliesCount);
  }, []);

  // Sync activeTab with URL parameter
  useEffect(() => {
    if (isValidTab(tab)) {
      setActiveTab(tab);
    }
  }, [tab]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  // Use isOwner from API response (backend already calculated this)
  const isOwner = currentSpace?.isOwner ?? false;
  // Check if user is admin OR owner (owner as fallback in case members array isn't loaded yet)
  const isAdmin = isOwner || members.some(member =>
    member.userId === user?.userId && (member.role === 'admin' || member.role === 'owner')
  );

  // Debug logging for invite code visibility
  console.log('[SpaceDetail] Debug Info:', {
    activeTab,
    isAdmin,
    isOwner,
    hasInviteCode: !!currentSpace?.inviteCode,
    inviteCode: currentSpace?.inviteCode,
    membersCount: members.length,
    currentUserId: user?.userId,
    spaceOwnerId: currentSpace?.ownerId,
    ownerIdMatch: user?.userId === currentSpace?.ownerId,
    hasCurrentSpace: !!currentSpace,
    hasUser: !!user,
    apiIsOwner: currentSpace?.isOwner
  });

  const handleTabClick = (newTab: TabName) => {
    setActiveTab(newTab);
    // Update URL to include tab
    navigate(`/space/${spaceId}/${newTab}`, { replace: true });
  };

  const handleTabKeyDown = (e: React.KeyboardEvent, tab: TabName) => {
    const currentIndex = VALID_TABS.indexOf(activeTab);

    switch (e.key) {
      case 'ArrowRight': {
        e.preventDefault();
        const nextIndex = (currentIndex + 1) % VALID_TABS.length;
        setActiveTab(VALID_TABS[nextIndex]);
        const nextElement = (e.target as HTMLElement).nextElementSibling;
        if (nextElement && 'focus' in nextElement && typeof nextElement.focus === 'function') {
          (nextElement as HTMLElement).focus();
        }
        break;
      }
      case 'ArrowLeft': {
        e.preventDefault();
        const prevIndex = currentIndex - 1 < 0 ? VALID_TABS.length - 1 : currentIndex - 1;
        setActiveTab(VALID_TABS[prevIndex]);
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

  const handleSaveCalendarUrl = async () => {
    if (!spaceId) return;
    try {
      // Extract src from iframe if user pasted full embed code
      let urlToSave = calendarUrlInput;
      if (calendarUrlInput.includes('<iframe')) {
        const srcMatch = calendarUrlInput.match(/src="([^"]+)"/);
        if (srcMatch && srcMatch[1]) {
          urlToSave = srcMatch[1];
        }
      }

      await updateSpace(spaceId, { calendarUrl: urlToSave });
      setIsEditingCalendar(false);
      selectSpace(spaceId); // Reload space to get updated data
    } catch (error) {
      console.error('Failed to update calendar URL:', error);
      // Handle error (could add error state for this specific action)
    }
  };

  // Create theme-aware calendar URL
  const getThemedCalendarUrl = (baseUrl: string): string => {
    if (!baseUrl) return baseUrl;

    try {
      const url = new URL(baseUrl);

      if (isDark) {
        // Add dark theme parameters for Google Calendar
        url.searchParams.set('bgcolor', '%23202124'); // Dark gray background (#202124)
        // You can customize text color too
        // Note: Google Calendar embed has limited dark mode support
        // We'll also use CSS filter as backup
      } else {
        // Remove dark theme parameters in light mode
        url.searchParams.delete('bgcolor');
      }

      return url.toString();
    } catch (error) {
      console.error('Error parsing calendar URL:', error);
      return baseUrl;
    }
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
                className={`space-detail__visibility-badge space-detail__visibility-badge--${currentSpace.isPublic ? 'public' : 'private'
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
                      onClick={() => {/* Navigate to settings */ }}
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
            aria-selected={activeTab === 'journals'}
            aria-controls="journals-panel"
            id="journals-tab"
            onClick={() => handleTabClick('journals')}
            onKeyDown={(e) => handleTabKeyDown(e, 'journals')}
            className={`tab ${activeTab === 'journals' ? 'tab--active' : ''}`}
          >
            Journals
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'frameworks'}
            aria-controls="frameworks-panel"
            id="frameworks-tab"
            onClick={() => handleTabClick('frameworks')}
            onKeyDown={(e) => handleTabKeyDown(e, 'frameworks')}
            className={`tab ${activeTab === 'frameworks' ? 'tab--active' : ''}`}
          >
            Frameworks
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'conversations'}
            aria-controls="conversations-panel"
            id="conversations-tab"
            onClick={() => handleTabClick('conversations')}
            onKeyDown={(e) => handleTabKeyDown(e, 'conversations')}
            className={`tab ${activeTab === 'conversations' ? 'tab--active' : ''}`}
          >
            Conversations
            {conversationUnreadCount > 0 && (
              <span className="tab-badge" title={`${conversationUnreadCount} unread`}>
                {conversationUnreadCount > 99 ? '99+' : conversationUnreadCount}
              </span>
            )}
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
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'schedules'}
            aria-controls="schedules-panel"
            id="schedules-tab"
            onClick={() => handleTabClick('schedules')}
            onKeyDown={(e) => handleTabKeyDown(e, 'schedules')}
            className={`tab ${activeTab === 'schedules' ? 'tab--active' : ''}`}
          >
            Schedules
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
        {activeTab === 'content' && spaceId && (
          <div
            role="tabpanel"
            id="content-panel"
            aria-labelledby="content-tab"
            className="tab-panel"
          >
            <div className="space-detail__content">
              <ActivityFeed spaceId={spaceId} />
            </div>
          </div>
        )}

        {activeTab === 'journals' && spaceId && (
          <div
            role="tabpanel"
            id="journals-panel"
            aria-labelledby="journals-tab"
            className="tab-panel"
          >
            <JournalList spaceId={spaceId} />
          </div>
        )}

        {activeTab === 'frameworks' && spaceId && (
          <div
            role="tabpanel"
            id="frameworks-panel"
            aria-labelledby="frameworks-tab"
            className="tab-panel"
          >
            <FrameworksTab spaceId={spaceId} />
          </div>
        )}

        {activeTab === 'conversations' && spaceId && (
          <div
            role="tabpanel"
            id="conversations-panel"
            aria-labelledby="conversations-tab"
            className="tab-panel"
          >
            <ConversationsTab spaceId={spaceId} onUnreadCountChange={handleConversationUnreadChange} />
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

        {activeTab === 'schedules' && (
          <div
            role="tabpanel"
            id="schedules-panel"
            aria-labelledby="schedules-tab"
            className="tab-panel"
          >
            <div className="space-detail__schedules">
              <div className="space-detail__schedules-header">
                <h3>Space Schedule</h3>
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditingCalendar(!isEditingCalendar);
                      setCalendarUrlInput(currentSpace?.calendarUrl || '');
                    }}
                    className="btn btn-secondary"
                  >
                    {isEditingCalendar ? 'Cancel Edit' : (currentSpace?.calendarUrl ? 'Edit Calendar' : 'Add Calendar')}
                  </button>
                )}
              </div>

              {isEditingCalendar && (
                <div className="space-detail__calendar-edit">
                  <p>Paste the Google Calendar embed URL or the full iframe code here:</p>
                  <div className="space-detail__calendar-input-group">
                    <input
                      type="text"
                      value={calendarUrlInput}
                      onChange={(e) => setCalendarUrlInput(e.target.value)}
                      placeholder="https://calendar.google.com/calendar/embed?..."
                      className="space-detail__calendar-input"
                    />
                    <button
                      type="button"
                      onClick={handleSaveCalendarUrl}
                      className="btn btn-primary"
                    >
                      Save
                    </button>
                  </div>
                </div>
              )}

              {currentSpace?.calendarUrl ? (
                <div className="space-detail__calendar-container">
                  <iframe
                    src={getThemedCalendarUrl(currentSpace.calendarUrl)}
                    style={{ border: 0 }}
                    width="100%"
                    height="600"
                    frameBorder="0"
                    scrolling="no"
                    title="Space Calendar"
                    className={isDark ? 'calendar-iframe--dark' : ''}
                  />
                </div>
              ) : (
                !isEditingCalendar && (
                  <div className="space-detail__empty-state">
                    <p>No calendar has been added to this space yet.</p>
                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => setIsEditingCalendar(true)}
                        className="btn btn-primary"
                      >
                        Add Calendar
                      </button>
                    )}
                  </div>
                )
              )}
            </div>
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

      {/* Ellie companion */}
      <ElliePerch
        showThoughtBubble={true}
        thoughtText={
          activeTab === 'journals'
            ? "Check out your journals! 📖"
            : activeTab === 'frameworks'
              ? "Track your progress! 🎯"
              : activeTab === 'members'
                ? `${members.length} ${members.length === 1 ? 'member' : 'members'} in this space! 👥`
                : `Welcome to ${currentSpace.name}! 🏠`
        }
        size="md"
        onClick={() => setMood(mood === 'playful' ? 'happy' : 'playful')}
        furColor={customization.furColor}
        collarStyle={customization.collarStyle}
        collarColor={customization.collarColor}
        collarTag={customization.collarTag}
        showPerchControl={true}

      />
    </div>
  );
};