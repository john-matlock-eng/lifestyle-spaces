import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { MembersList } from './MembersList';
import type { SpaceMember } from '../../types';

describe('MembersList', () => {
  const mockMembers: SpaceMember[] = [
    {
      userId: 'user-1',
      email: 'owner@example.com',
      username: 'owner',
      displayName: 'Space Owner',
      role: 'owner',
      joinedAt: '2023-01-01T00:00:00Z',
    },
    {
      userId: 'user-2',
      email: 'admin@example.com',
      username: 'admin',
      displayName: 'Admin User',
      role: 'admin',
      joinedAt: '2023-01-02T00:00:00Z',
    },
    {
      userId: 'user-3',
      email: 'member@example.com',
      username: 'member',
      displayName: 'Regular Member',
      role: 'member',
      joinedAt: '2023-01-03T00:00:00Z',
    },
  ];

  const mockSpace = {
    spaceId: 'space-1',
    name: 'Test Space',
    description: 'Test description',
    ownerId: 'user-1',
    createdAt: '2023-01-01T00:00:00Z',
    updatedAt: '2023-01-01T00:00:00Z',
    memberCount: 3,
    isPublic: false,
  };

  const defaultProps = {
    members: mockMembers,
    space: mockSpace,
    currentUserId: 'user-1',
    isLoading: false,
    error: null,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders list of members', () => {
    render(<MembersList {...defaultProps} />);
    
    expect(screen.getByText('Space Owner')).toBeInTheDocument();
    expect(screen.getByText('Admin User')).toBeInTheDocument();
    expect(screen.getByText('Regular Member')).toBeInTheDocument();
  });

  it('shows member roles correctly', () => {
    render(<MembersList {...defaultProps} />);
    
    expect(screen.getByText('Owner')).toBeInTheDocument();
    expect(screen.getByText('Admin')).toBeInTheDocument();
    expect(screen.getByText('Member')).toBeInTheDocument();
  });

  it('shows member emails', () => {
    render(<MembersList {...defaultProps} />);
    
    expect(screen.getByText('owner@example.com')).toBeInTheDocument();
    expect(screen.getByText('admin@example.com')).toBeInTheDocument();
    expect(screen.getByText('member@example.com')).toBeInTheDocument();
  });

  it('shows joined dates', () => {
    render(<MembersList {...defaultProps} />);
    
    // Check that joined dates are formatted and displayed correctly
    // The dates may be adjusted for local timezone, so we check for the general format
    const joinedElements = screen.getAllByText(/Joined.*\d{1,2}, \d{4}/);
    expect(joinedElements.length).toBe(3);
    
    // Verify that each member has a joined date
    expect(screen.getByTestId('member-user-1').textContent).toMatch(/Joined.*\d{4}/);
    expect(screen.getByTestId('member-user-2').textContent).toMatch(/Joined.*\d{4}/);
    expect(screen.getByTestId('member-user-3').textContent).toMatch(/Joined.*\d{4}/);
  });

  it('shows loading state', () => {
    render(<MembersList {...defaultProps} isLoading={true} />);
    
    expect(screen.getByText('Loading members...')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveAttribute('aria-live', 'polite');
  });

  it('shows error state', () => {
    const error = 'Failed to load members';
    render(<MembersList {...defaultProps} error={error} />);
    
    expect(screen.getByText(error)).toBeInTheDocument();
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('shows empty state when no members', () => {
    render(<MembersList {...defaultProps} members={[]} />);
    
    expect(screen.getByText('No members found')).toBeInTheDocument();
  });

  it('handles offline member with no lastSeen data', () => {
    const membersWithOfflineNoLastSeen = [
      {
        userId: 'user-1',
        email: 'owner@example.com',
        username: 'owner',
        displayName: 'Space Owner',
        role: 'owner',
        joinedAt: '2023-01-01T00:00:00Z',
        isOnline: false,
        // No lastSeen property - this should trigger the return null case at line 159
      },
    ];

    render(
      <MembersList 
        {...defaultProps} 
        members={membersWithOfflineNoLastSeen}
        showOnlineStatus={true}
      />
    );
    
    // Member should be displayed but without online status info
    expect(screen.getByText('Space Owner')).toBeInTheDocument();
    
    // Should not show online status or last seen since member is offline with no lastSeen
    expect(screen.queryByText('Online')).not.toBeInTheDocument();
    expect(screen.queryByText(/Last seen/)).not.toBeInTheDocument();
  });

  it('shows member count', () => {
    render(<MembersList {...defaultProps} />);
    
    expect(screen.getByText('3 members')).toBeInTheDocument();
  });

  it('shows singular member count', () => {
    const singleMember = [mockMembers[0]];
    render(<MembersList {...defaultProps} members={singleMember} />);
    
    expect(screen.getByText('1 member')).toBeInTheDocument();
  });

  it('highlights current user', () => {
    render(<MembersList {...defaultProps} />);
    
    const currentUserRow = screen.getByTestId('member-user-1');
    expect(currentUserRow).toHaveClass('members-list__item--current-user');
    expect(screen.getByText('(You)')).toBeInTheDocument();
  });

  it('shows role change dropdown for admins', () => {
    const onRoleChange = vi.fn();
    render(
      <MembersList 
        {...defaultProps} 
        currentUserId="user-1"
        onRoleChange={onRoleChange}
        canManageRoles={true}
      />
    );
    
    // Should have role change dropdown for non-owner members
    const adminDropdown = screen.getByLabelText('Change role for Admin User');
    expect(adminDropdown).toBeInTheDocument();
    expect(adminDropdown).toHaveValue('admin');
    
    fireEvent.change(adminDropdown, { target: { value: 'member' } });
    expect(onRoleChange).toHaveBeenCalledWith('user-2', 'member');
  });

  it('does not show role change for owner', () => {
    render(
      <MembersList 
        {...defaultProps} 
        canManageRoles={true}
      />
    );
    
    const ownerRow = screen.getByTestId('member-user-1');
    expect(ownerRow.querySelector('select')).not.toBeInTheDocument();
  });

  it('shows remove member button for removable members', () => {
    const onRemoveMember = vi.fn();
    render(
      <MembersList 
        {...defaultProps} 
        currentUserId="user-1"
        onRemoveMember={onRemoveMember}
        canRemoveMembers={true}
      />
    );
    
    // Should have remove button for non-owner members
    const removeButtons = screen.getAllByText('Remove');
    expect(removeButtons).toHaveLength(2); // admin and member, but not owner
    
    fireEvent.click(removeButtons[0]);
    expect(onRemoveMember).toHaveBeenCalledWith('user-2');
  });

  it('does not show remove button for owner', () => {
    render(
      <MembersList 
        {...defaultProps} 
        canRemoveMembers={true}
      />
    );
    
    const ownerRow = screen.getByTestId('member-user-1');
    expect(ownerRow.querySelector('[data-action="remove"]')).not.toBeInTheDocument();
  });

  it('shows invite button when user can invite', () => {
    const onInviteClick = vi.fn();
    render(
      <MembersList 
        {...defaultProps} 
        canInviteMembers={true}
        onInviteClick={onInviteClick}
      />
    );
    
    const inviteButton = screen.getByText('Invite Members');
    expect(inviteButton).toBeInTheDocument();
    
    fireEvent.click(inviteButton);
    expect(onInviteClick).toHaveBeenCalledOnce();
  });

  it('filters members by search query', () => {
    const onSearch = vi.fn();
    render(
      <MembersList 
        {...defaultProps} 
        searchable={true}
        onSearch={onSearch}
      />
    );
    
    const searchInput = screen.getByPlaceholderText('Search members...');
    fireEvent.change(searchInput, { target: { value: 'admin' } });
    
    expect(onSearch).toHaveBeenCalledWith('admin');
  });

  it('filters members by role', () => {
    const onFilterChange = vi.fn();
    render(
      <MembersList 
        {...defaultProps} 
        filterable={true}
        onFilterChange={onFilterChange}
      />
    );
    
    const roleFilter = screen.getByLabelText('Filter by role');
    fireEvent.change(roleFilter, { target: { value: 'admin' } });
    
    expect(onFilterChange).toHaveBeenCalledWith({ role: 'admin' });
  });

  it('sorts members correctly', () => {
    const onSort = vi.fn();
    render(
      <MembersList 
        {...defaultProps} 
        sortable={true}
        onSort={onSort}
      />
    );
    
    const sortSelect = screen.getByLabelText('Sort by');
    fireEvent.change(sortSelect, { target: { value: 'name-asc' } });
    
    expect(onSort).toHaveBeenCalledWith('name-asc');
  });

  it('shows member avatars when available', () => {
    const membersWithAvatars = mockMembers.map(member => ({
      ...member,
      avatarUrl: `https://example.com/avatar-${member.userId}.jpg`,
    }));
    
    render(<MembersList {...defaultProps} members={membersWithAvatars} />);
    
    const avatars = screen.getAllByRole('img');
    expect(avatars).toHaveLength(3);
  });

  it('shows default avatar when no avatar available', () => {
    render(<MembersList {...defaultProps} />);
    
    const defaultAvatars = screen.getAllByText((content, element) => 
      element?.classList.contains('member-avatar--default') || false
    );
    expect(defaultAvatars.length).toBeGreaterThan(0);
  });

  it('shows member status (online/offline)', () => {
    const membersWithStatus = mockMembers.map(member => ({
      ...member,
      isOnline: member.userId === 'user-1',
      lastSeen: member.userId !== 'user-1' ? '2023-01-04T10:00:00Z' : undefined,
    }));
    
    render(<MembersList {...defaultProps} members={membersWithStatus} showOnlineStatus={true} />);
    
    expect(screen.getByText('Online')).toBeInTheDocument();
    expect(screen.getAllByText(/Last seen/).length).toBeGreaterThan(0);
  });

  it('shows load more button when hasMore is true', () => {
    const onLoadMore = vi.fn();
    render(
      <MembersList 
        {...defaultProps} 
        hasMore={true}
        onLoadMore={onLoadMore}
      />
    );
    
    const loadMoreButton = screen.getByText('Load More Members');
    fireEvent.click(loadMoreButton);
    
    expect(onLoadMore).toHaveBeenCalledOnce();
  });

  it('has proper accessibility attributes', () => {
    render(<MembersList {...defaultProps} />);
    
    const membersList = screen.getByRole('list');
    expect(membersList).toHaveAttribute('aria-label', 'Space members');
    
    const memberItems = screen.getAllByRole('listitem');
    expect(memberItems).toHaveLength(3);
  });

  it('shows role badges with proper colors', () => {
    render(<MembersList {...defaultProps} />);
    
    const ownerBadge = screen.getByText('Owner');
    expect(ownerBadge).toHaveClass('role-badge', 'role-badge--owner');
    
    const adminBadge = screen.getByText('Admin');
    expect(adminBadge).toHaveClass('role-badge', 'role-badge--admin');
    
    const memberBadge = screen.getByText('Member');
    expect(memberBadge).toHaveClass('role-badge', 'role-badge--member');
  });

  it('handles member row clicks', () => {
    const onMemberClick = vi.fn();
    render(
      <MembersList 
        {...defaultProps} 
        onMemberClick={onMemberClick}
      />
    );
    
    const memberRow = screen.getByTestId('member-user-2');
    fireEvent.click(memberRow);
    
    expect(onMemberClick).toHaveBeenCalledWith(mockMembers[1]);
  });

  it('shows different layouts (list vs grid)', () => {
    const { rerender } = render(<MembersList {...defaultProps} layout="list" />);
    
    expect(screen.getByTestId('members-container')).toHaveClass('members-list--list');
    
    rerender(<MembersList {...defaultProps} layout="grid" />);
    expect(screen.getByTestId('members-container')).toHaveClass('members-list--grid');
  });

  it('shows pending invitations when provided', () => {
    const pendingInvitations = [
      {
        invitationId: 'inv-1',
        spaceId: 'space-1',
        spaceName: 'Test Space',
        inviterEmail: 'owner@example.com',
        inviterDisplayName: 'Space Owner',
        inviteeEmail: 'pending@example.com',
        role: 'member',
        status: 'pending' as const,
        createdAt: '2023-01-04T00:00:00Z',
        expiresAt: '2023-01-11T00:00:00Z',
      },
    ];
    
    render(
      <MembersList 
        {...defaultProps} 
        pendingInvitations={pendingInvitations}
        showPendingInvitations={true}
      />
    );
    
    expect(screen.getByText('Pending Invitations')).toBeInTheDocument();
    expect(screen.getByText('pending@example.com')).toBeInTheDocument();
    expect(screen.getByText('Invited')).toBeInTheDocument();
  });

  it('allows canceling pending invitations', () => {
    const onCancelInvitation = vi.fn();
    const pendingInvitations = [
      {
        invitationId: 'inv-1',
        spaceId: 'space-1',
        spaceName: 'Test Space',
        inviterEmail: 'owner@example.com',
        inviterDisplayName: 'Space Owner',
        inviteeEmail: 'pending@example.com',
        role: 'member',
        status: 'pending' as const,
        createdAt: '2023-01-04T00:00:00Z',
        expiresAt: '2023-01-11T00:00:00Z',
      },
    ];
    
    render(
      <MembersList 
        {...defaultProps} 
        pendingInvitations={pendingInvitations}
        showPendingInvitations={true}
        onCancelInvitation={onCancelInvitation}
        canManageInvitations={true}
      />
    );
    
    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);
    
    expect(onCancelInvitation).toHaveBeenCalledWith('inv-1');
  });

  it('should not render member actions when user cannot manage member', () => {
    const memberWithoutActions = {
      ...mockMembers[0],
      role: 'admin' as const
    };
    
    render(
      <MembersList
        {...defaultProps}
        members={[memberWithoutActions]}
        canInviteMembers={false}
        canRemoveMembers={false}
        canManageRoles={false}
      />
    );
    
    // This covers line 159 - when canManageMember returns false, should return null
    expect(screen.queryByText('Remove')).not.toBeInTheDocument();
    expect(screen.queryByText('Change Role')).not.toBeInTheDocument();
  });

  it('should render invite button in empty state when user can invite', () => {
    const mockOnInviteClick = vi.fn();
    
    render(
      <MembersList
        {...defaultProps}
        members={[]}
        canInviteMembers={true}
        onInviteClick={mockOnInviteClick}
      />
    );
    
    // This covers lines 407-413 - invite button in empty state
    const inviteButton = screen.getByText('Invite Members');
    expect(inviteButton).toBeInTheDocument();
    expect(inviteButton).toHaveClass('btn', 'btn-primary');
    
    fireEvent.click(inviteButton);
    expect(mockOnInviteClick).toHaveBeenCalledTimes(1);
  });

  it('should not render invite button in empty state when user cannot invite', () => {
    render(
      <MembersList
        {...defaultProps}
        members={[]}
        canInviteMembers={false}
      />
    );
    
    // Should not show invite button when user cannot invite
    expect(screen.queryByText('Invite Members')).not.toBeInTheDocument();
  });

  it('should not render invite button when onInviteClick is not provided', () => {
    render(
      <MembersList
        {...defaultProps}
        members={[]}
        canInviteMembers={true}
        // onInviteClick not provided
      />
    );
    
    // Should not show invite button when callback is not provided
    expect(screen.queryByText('Invite Members')).not.toBeInTheDocument();
  });
});
