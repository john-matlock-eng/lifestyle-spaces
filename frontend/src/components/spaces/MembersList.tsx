import React, { useState, useCallback } from 'react';
import { SpaceMember, Invitation, SpaceMemberRole } from '../../types';
import './spaces.css';

interface ExtendedSpaceMember extends SpaceMember {
  avatarUrl?: string;
  isOnline?: boolean;
  lastSeen?: string;
}

interface MembersListProps {
  members: SpaceMember[];
  currentUserId: string;
  isLoading?: boolean;
  error?: string | null;
  onRoleChange?: (userId: string, newRole: SpaceMemberRole) => void;
  onRemoveMember?: (userId: string) => void;
  onMemberClick?: (member: SpaceMember) => void;
  onInviteClick?: () => void;
  onSearch?: (query: string) => void;
  onFilterChange?: (filters: { role?: SpaceMemberRole }) => void;
  onSort?: (sortBy: string) => void;
  onLoadMore?: () => void;
  onCancelInvitation?: (invitationId: string) => void;
  canManageRoles?: boolean;
  canRemoveMembers?: boolean;
  canInviteMembers?: boolean;
  canManageInvitations?: boolean;
  searchable?: boolean;
  filterable?: boolean;
  sortable?: boolean;
  hasMore?: boolean;
  isLoadingMore?: boolean;
  layout?: 'list' | 'grid';
  showOnlineStatus?: boolean;
  showPendingInvitations?: boolean;
  pendingInvitations?: Invitation[];
  className?: string;
}

export const MembersList: React.FC<MembersListProps> = ({
  members,
  currentUserId,
  isLoading = false,
  error = null,
  onRoleChange,
  onRemoveMember,
  onMemberClick,
  onInviteClick,
  onSearch,
  onFilterChange,
  onSort,
  onLoadMore,
  onCancelInvitation,
  canManageRoles = false,
  canRemoveMembers = false,
  canInviteMembers = false,
  canManageInvitations = false,
  searchable = false,
  filterable = false,
  sortable = false,
  hasMore = false,
  isLoadingMore = false,
  layout = 'list',
  showOnlineStatus = false,
  showPendingInvitations = false,
  pendingInvitations = [],
  className = '',
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<SpaceMemberRole | ''>('');
  const [sortBy, setSortBy] = useState('joined-desc');

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    onSearch?.(query);
  }, [onSearch]);

  const handleRoleFilter = useCallback((role: SpaceMemberRole | '') => {
    setRoleFilter(role);
    onFilterChange?.({ role: role || undefined });
  }, [onFilterChange]);

  const handleSort = useCallback((newSortBy: string) => {
    setSortBy(newSortBy);
    onSort?.(newSortBy);
  }, [onSort]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getInitials = (displayName: string) => {
    return displayName
      .split(' ')
      .map(name => name.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getRoleBadgeClass = (role: SpaceMemberRole) => {
    return `role-badge role-badge--${role}`;
  };

  const canManageMember = (member: SpaceMember) => {
    return member.role !== 'owner' && member.userId !== currentUserId;
  };

  const renderMemberAvatar = (member: SpaceMember) => {
    const extendedMember = member as ExtendedSpaceMember;
    const avatarUrl = extendedMember.avatarUrl;
    
    if (avatarUrl) {
      return (
        <img
          src={avatarUrl}
          alt={`${member.displayName} avatar`}
          className="member-avatar"
        />
      );
    }

    return (
      <div className="member-avatar member-avatar--default">
        {getInitials(member.displayName)}
      </div>
    );
  };

  const renderOnlineStatus = (member: SpaceMember) => {
    if (!showOnlineStatus) return null;
    
    const extendedMember = member as ExtendedSpaceMember;
    const isOnline = extendedMember.isOnline;
    const lastSeen = extendedMember.lastSeen;

    if (isOnline) {
      return (
        <div className="member-status member-status--online">
          <span className="member-status__indicator" />
          <span>Online</span>
        </div>
      );
    }

    if (lastSeen) {
      return (
        <div className="member-status member-status--offline">
          <span>Last seen {formatDate(lastSeen)}</span>
        </div>
      );
    }

    return null;
  };

  const renderMemberActions = (member: SpaceMember) => {
    if (!canManageMember(member)) return null;

    return (
      <div className="member-actions">
        {canManageRoles && onRoleChange && (
          <select
            value={member.role}
            onChange={(e) => onRoleChange(member.userId, e.target.value as SpaceMemberRole)}
            className="member-role-select"
            aria-label={`Change role for ${member.displayName}`}
          >
            <option value="member">Member</option>
            <option value="admin">Admin</option>
          </select>
        )}

        {canRemoveMembers && onRemoveMember && (
          <button
            type="button"
            onClick={() => onRemoveMember(member.userId)}
            className="btn btn-danger btn-sm"
            data-action="remove"
            aria-label={`Remove ${member.displayName} from space`}
          >
            Remove
          </button>
        )}
      </div>
    );
  };

  const renderMember = (member: SpaceMember) => {
    const isCurrentUser = member.userId === currentUserId;

    return (
      <li
        key={member.userId}
        className={`members-list__item ${isCurrentUser ? 'members-list__item--current-user' : ''}`}
        data-testid={`member-${member.userId}`}
        onClick={() => onMemberClick?.(member)}
        role="listitem"
      >
        <div className="member-info">
          <div className="member-avatar-container">
            {renderMemberAvatar(member)}
            {renderOnlineStatus(member)}
          </div>
          
          <div className="member-details">
            <div className="member-name">
              <span className="member-display-name">
                {member.displayName}
              </span>
              {isCurrentUser && (
                <span className="member-current-indicator">(You)</span>
              )}
            </div>
            
            <div className="member-email">
              {member.email}
            </div>
            
            <div className="member-meta">
              <span className="member-joined">
                Joined {formatDate(member.joinedAt)}
              </span>
            </div>
          </div>
        </div>

        <div className="member-role-info">
          <span className={getRoleBadgeClass(member.role)}>
            {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
          </span>
        </div>

        {renderMemberActions(member)}
      </li>
    );
  };

  const renderPendingInvitations = () => {
    if (!showPendingInvitations || !pendingInvitations.length) return null;

    return (
      <div className="pending-invitations">
        <h4 className="pending-invitations__title">Pending Invitations</h4>
        <ul className="pending-invitations__list">
          {pendingInvitations.map((invitation) => (
            <li key={invitation.invitationId} className="pending-invitation">
              <div className="pending-invitation__info">
                <div className="pending-invitation__email">
                  {invitation.inviteeEmail}
                </div>
                <div className="pending-invitation__meta">
                  <span className={getRoleBadgeClass(invitation.role)}>
                    {invitation.role.charAt(0).toUpperCase() + invitation.role.slice(1)}
                  </span>
                  <span className="invitation-status">Invited</span>
                  <span className="invitation-date">
                    {formatDate(invitation.createdAt)}
                  </span>
                </div>
              </div>
              
              {canManageInvitations && onCancelInvitation && (
                <button
                  type="button"
                  onClick={() => onCancelInvitation(invitation.invitationId)}
                  className="btn btn-secondary btn-sm"
                >
                  Cancel
                </button>
              )}
            </li>
          ))}
        </ul>
      </div>
    );
  };

  const renderControls = () => {
    return (
      <div className="members-list__controls">
        <div className="members-list__controls-left">
          {searchable && (
            <div className="members-search">
              <input
                type="text"
                placeholder="Search members..."
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                className="members-search__input"
                aria-label="Search members"
              />
            </div>
          )}

          {filterable && (
            <div className="members-filter">
              <select
                value={roleFilter}
                onChange={(e) => handleRoleFilter(e.target.value as SpaceMemberRole | '')}
                className="members-filter__select"
                aria-label="Filter by role"
              >
                <option value="">All Roles</option>
                <option value="owner">Owners</option>
                <option value="admin">Admins</option>
                <option value="member">Members</option>
              </select>
            </div>
          )}

          {sortable && (
            <div className="members-sort">
              <select
                value={sortBy}
                onChange={(e) => handleSort(e.target.value)}
                className="members-sort__select"
                aria-label="Sort by"
              >
                <option value="joined-desc">Recently Joined</option>
                <option value="joined-asc">Oldest Members</option>
                <option value="name-asc">Name (A-Z)</option>
                <option value="name-desc">Name (Z-A)</option>
                <option value="role-desc">Role (High to Low)</option>
              </select>
            </div>
          )}
        </div>

        <div className="members-list__controls-right">
          <div className="members-count">
            {members.length} {members.length === 1 ? 'member' : 'members'}
          </div>

          {canInviteMembers && onInviteClick && (
            <button
              type="button"
              onClick={onInviteClick}
              className="btn btn-primary"
            >
              Invite Members
            </button>
          )}
        </div>
      </div>
    );
  };

  const renderLoadMore = () => {
    if (!hasMore || !onLoadMore) return null;

    return (
      <div className="members-list__load-more">
        <button
          type="button"
          onClick={onLoadMore}
          disabled={isLoadingMore}
          className="btn btn-secondary"
        >
          {isLoadingMore ? 'Loading...' : 'Load More Members'}
        </button>
      </div>
    );
  };

  const containerClasses = [
    'members-list',
    `members-list--${layout}`,
    className,
  ].filter(Boolean).join(' ');

  if (isLoading) {
    return (
      <div className="members-list__loading" role="status" aria-live="polite">
        <div className="members-list__loading-spinner" aria-hidden="true" />
        <span>Loading members...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="members-list__error" role="alert">
        <div className="members-list__error-icon">⚠️</div>
        <div className="members-list__error-content">
          <h3 className="members-list__error-title">Unable to load members</h3>
          <p className="members-list__error-message">{error}</p>
        </div>
      </div>
    );
  }

  if (!members.length) {
    return (
      <div className="members-list__empty">
        <div className="members-list__empty-icon">👥</div>
        <h3 className="members-list__empty-title">No members found</h3>
        <p className="members-list__empty-description">
          {canInviteMembers ? 'Invite members to get started!' : 'This space has no members yet.'}
        </p>
        {canInviteMembers && onInviteClick && (
          <button
            type="button"
            onClick={onInviteClick}
            className="btn btn-primary"
          >
            Invite Members
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="members-list-wrapper">
      {renderControls()}

      <div 
        className={containerClasses}
        data-testid="members-container"
      >
        <ul 
          className="members-list__items"
          role="list"
          aria-label="Space members"
        >
          {members.map(renderMember)}
        </ul>
      </div>

      {renderPendingInvitations()}
      {renderLoadMore()}
    </div>
  );
};