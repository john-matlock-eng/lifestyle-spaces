import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { SpaceDetail } from './SpaceDetail';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

// Mock components
vi.mock('../components/spaces/MembersList', () => ({
  MembersList: ({ members, onInviteClick, onCancelInvitation }: {
    members: unknown[];
    onInviteClick: () => void;
    onCancelInvitation?: (invitationId: string) => void;
  }) => (
    <div data-testid="members-list">
      <div>Members: {members.length}</div>
      <button onClick={onInviteClick}>Invite Members</button>
      {onCancelInvitation && (
        <button
          data-testid="cancel-invitation-btn"
          onClick={() => onCancelInvitation('test-invitation-123')}
        >
          Cancel Invitation
        </button>
      )}
    </div>
  ),
}));

vi.mock('../components/spaces/InviteMemberModal', () => ({
  InviteMemberModal: ({ isOpen, onClose, onInviteSent }: { isOpen: boolean; onClose: () => void; onInviteSent: () => void }) =>
    isOpen ? (
      <div data-testid="invite-modal">
        <button onClick={onClose}>Close Modal</button>
        <button data-testid="send-invite-btn" onClick={onInviteSent}>Send Invite</button>
      </div>
    ) : null,
}));

// Mock space store
const mockSelectSpace = vi.fn();
const mockClearError = vi.fn();

// Create a mutable mock state that tests can modify
let mockSpaceState = {
  currentSpace: {
    spaceId: 'space-1',
    name: 'Test Space',
    description: 'A test space for testing',
    ownerId: 'user-1',
    createdAt: '2023-01-01T00:00:00Z',
    updatedAt: '2023-01-02T00:00:00Z',
    memberCount: 3,
    isPublic: false,
  },
  members: [
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
  ],
  isLoading: false,
  error: null,
};

// Mock functions to modify state for testing
const setMockSpaceState = (newState: Partial<typeof mockSpaceState>) => {
  mockSpaceState = { ...mockSpaceState, ...newState };
};

const resetMockSpaceState = () => {
  mockSpaceState = {
    currentSpace: {
      spaceId: 'space-1',
      name: 'Test Space',
      description: 'A test space for testing',
      ownerId: 'user-1',
      createdAt: '2023-01-01T00:00:00Z',
      updatedAt: '2023-01-02T00:00:00Z',
      memberCount: 3,
      isPublic: false,
    },
    members: [
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
    ],
    isLoading: false,
    error: null,
  };
};

vi.mock('../stores/spaceStore', () => ({
  useSpace: () => ({
    ...mockSpaceState,
    selectSpace: mockSelectSpace,
    clearError: mockClearError,
  }),
}));

// Mock invitation store
const mockFetchSpaceInvitations = vi.fn();

let mockInvitationState = {
  spaceInvitations: {
    'space-1': [],
  },
  isLoading: false,
  error: null,
};

const setMockInvitationState = (newState: Partial<typeof mockInvitationState>) => {
  mockInvitationState = { ...mockInvitationState, ...newState };
};

vi.mock('../hooks/useInvitations', () => ({
  useInvitations: () => ({
    ...mockInvitationState,
    fetchSpaceInvitations: mockFetchSpaceInvitations,
  }),
}));

// Mock auth store
let mockAuthState = {
  user: {
    userId: 'user-1',
    email: 'owner@example.com',
    displayName: 'Space Owner',
  },
  isAuthenticated: true,
};

const setMockAuthState = (newState: Partial<typeof mockAuthState>) => {
  mockAuthState = { ...mockAuthState, ...newState };
};

const resetMockAuthState = () => {
  mockAuthState = {
    user: {
      userId: 'user-1',
      email: 'owner@example.com',
      displayName: 'Space Owner',
    },
    isAuthenticated: true,
  };
};

vi.mock('../stores/authStore', () => ({
  useAuth: () => mockAuthState,
}));

// Test wrapper component
const TestWrapper: React.FC<{ children: React.ReactNode; initialPath?: string }> = ({
  children,
  initialPath = '/spaces/space-1'
}) => (
  <MemoryRouter initialEntries={[initialPath]}>
    <Routes>
      <Route path="/spaces/:spaceId" element={children} />
      <Route path="/dashboard" element={<div>Dashboard</div>} />
    </Routes>
  </MemoryRouter>
);

describe('SpaceDetail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetMockSpaceState();
    resetMockAuthState();
    setMockInvitationState({
      spaceInvitations: { 'space-1': [] },
      isLoading: false,
      error: null,
    });
  });

  it('loads space data on mount', async () => {
    render(
      <TestWrapper>
        <SpaceDetail />
      </TestWrapper>
    );

    expect(mockSelectSpace).toHaveBeenCalledWith('space-1');
    expect(mockFetchSpaceInvitations).toHaveBeenCalledWith('space-1');
    expect(mockClearError).toHaveBeenCalled();
  });

  it('renders space information', () => {
    render(
      <TestWrapper>
        <SpaceDetail />
      </TestWrapper>
    );

    expect(screen.getByRole('heading', { name: 'Test Space' })).toBeInTheDocument();
    expect(screen.getByText('A test space for testing')).toBeInTheDocument();
  });

  it('shows loading state', () => {
    setMockSpaceState({ isLoading: true });

    render(
      <TestWrapper>
        <SpaceDetail />
      </TestWrapper>
    );

    expect(screen.getByText(/Loading space/i)).toBeInTheDocument();
  });

  it('shows error state', () => {
    setMockSpaceState({
      error: 'Failed to load space',
      currentSpace: null
    });

    render(
      <TestWrapper>
        <SpaceDetail />
      </TestWrapper>
    );

    expect(screen.getByText('Failed to load space')).toBeInTheDocument();
  });

  it('shows space not found state', () => {
    setMockSpaceState({
      currentSpace: null,
      isLoading: false,
      error: null
    });

    render(
      <TestWrapper>
        <SpaceDetail />
      </TestWrapper>
    );

    expect(screen.getByText(/space not found/i)).toBeInTheDocument();
  });

  it('shows dashboard navigation link', () => {
    render(
      <TestWrapper>
        <SpaceDetail />
      </TestWrapper>
    );

    const dashboardLink = screen.getByRole('button', { name: 'Dashboard' });
    expect(dashboardLink).toBeInTheDocument();
  });

  it('renders members list when members tab is selected', () => {
    render(
      <TestWrapper>
        <SpaceDetail />
      </TestWrapper>
    );

    const membersTab = screen.getByText('Members');
    fireEvent.click(membersTab);

    expect(screen.getByTestId('members-list')).toBeInTheDocument();
    expect(screen.getByText('Members: 2')).toBeInTheDocument();
  });

  it('opens invite modal when invite button is clicked', () => {
    render(
      <TestWrapper>
        <SpaceDetail />
      </TestWrapper>
    );

    const membersTab = screen.getByText('Members');
    fireEvent.click(membersTab);

    // Use the main invite button from the header, not the one from the mocked members list
    const inviteButton = screen.getAllByRole('button', { name: 'Invite Members' })[0];
    fireEvent.click(inviteButton);

    expect(screen.getByTestId('invite-modal')).toBeInTheDocument();
  });

  it('closes invite modal', () => {
    render(
      <TestWrapper>
        <SpaceDetail />
      </TestWrapper>
    );

    const membersTab = screen.getByText('Members');
    fireEvent.click(membersTab);

    // Use the main invite button from the header, not the one from the mocked members list
    const inviteButton = screen.getAllByRole('button', { name: 'Invite Members' })[0];
    fireEvent.click(inviteButton);

    const closeButton = screen.getByText('Close Modal');
    fireEvent.click(closeButton);

    expect(screen.queryByTestId('invite-modal')).not.toBeInTheDocument();
  });

  it('shows space settings button for owners', () => {
    render(
      <TestWrapper>
        <SpaceDetail />
      </TestWrapper>
    );

    // The settings should be available since the user is the owner
    expect(screen.getByText('Settings')).toBeInTheDocument();
  });

  it('handles invite sent successfully', async () => {
    render(
      <TestWrapper>
        <SpaceDetail />
      </TestWrapper>
    );

    const membersTab = screen.getByText('Members');
    fireEvent.click(membersTab);

    // Use the main invite button from the header, not the one from the mocked members list
    const inviteButton = screen.getAllByRole('button', { name: 'Invite Members' })[0];
    fireEvent.click(inviteButton);

    const sendInviteButton = screen.getByTestId('send-invite-btn');
    fireEvent.click(sendInviteButton);

    // Modal should close after successful invite
    await waitFor(() => {
      expect(screen.queryByTestId('invite-modal')).not.toBeInTheDocument();
    });
  });

  it('handles cancel invitation function existence', () => {
    render(
      <TestWrapper>
        <SpaceDetail />
      </TestWrapper>
    );

    const membersTab = screen.getByText('Members');
    fireEvent.click(membersTab);

    // The cancel invitation button should be available
    expect(screen.getByTestId('cancel-invitation-btn')).toBeInTheDocument();
  });

  it('does not show space settings button for non-owners', () => {
    setMockAuthState({
      user: {
        userId: 'user-2',
        email: 'member@example.com',
        displayName: 'Regular Member',
      },
      isAuthenticated: true,
    });

    render(
      <TestWrapper>
        <SpaceDetail />
      </TestWrapper>
    );

    // Settings tab should not be visible for non-owners
    expect(screen.queryByText('Settings')).not.toBeInTheDocument();
  });

  it('shows space visibility correctly', () => {
    render(
      <TestWrapper>
        <SpaceDetail />
      </TestWrapper>
    );

    expect(screen.getByText(/private/i)).toBeInTheDocument();
  });

  it('shows public space visibility correctly', () => {
    setMockSpaceState({
      currentSpace: {
        ...mockSpaceState.currentSpace,
        isPublic: true,
      },
    });

    render(
      <TestWrapper>
        <SpaceDetail />
      </TestWrapper>
    );

    expect(screen.getByText(/public/i)).toBeInTheDocument();
  });

  it('shows space creation and update dates', () => {
    render(
      <TestWrapper>
        <SpaceDetail />
      </TestWrapper>
    );

    // Check for formatted dates
    expect(screen.getByText(/December 31, 2022/)).toBeInTheDocument();
    expect(screen.getByText(/January 1, 2023/)).toBeInTheDocument();
  });

  it('shows breadcrumb navigation', () => {
    render(
      <TestWrapper>
        <SpaceDetail />
      </TestWrapper>
    );

    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Test Space' })).toBeInTheDocument();
  });

  it('shows breadcrumb navigation links', () => {
    render(
      <TestWrapper>
        <SpaceDetail />
      </TestWrapper>
    );

    const dashboardLink = screen.getByRole('button', { name: 'Dashboard' });
    expect(dashboardLink).toBeInTheDocument();
    // Test that the link is clickable without actually navigating
    expect(dashboardLink).not.toBeDisabled();
  });

  it('shows space actions menu', () => {
    render(
      <TestWrapper>
        <SpaceDetail />
      </TestWrapper>
    );

    // Look for actions menu trigger
    const actionsButton = screen.getByText('Actions');
    expect(actionsButton).toBeInTheDocument();
  });
});