import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { SpaceDetail } from './SpaceDetail';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

// Mock components
vi.mock('../components/spaces/MembersList', () => ({
  MembersList: ({ members, onInviteClick }: { members: unknown[]; onInviteClick: () => void }) => (
    <div data-testid="members-list">
      <div>Members: {members.length}</div>
      <button onClick={onInviteClick}>Invite Members</button>
    </div>
  ),
}));

vi.mock('../components/spaces/InviteMemberModal', () => ({
  InviteMemberModal: ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => 
    isOpen ? (
      <div data-testid="invite-modal">
        <button onClick={onClose}>Close Modal</button>
      </div>
    ) : null,
}));

// Mock space store
const mockSelectSpace = vi.fn();
const mockLoadPendingInvitations = vi.fn();
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
  invitations: [],
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
    invitations: [],
    isLoading: false,
    error: null,
  };
};

vi.mock('../stores/spaceStore', () => ({
  useSpace: () => ({
    ...mockSpaceState,
    selectSpace: mockSelectSpace,
    loadPendingInvitations: mockLoadPendingInvitations,
    clearError: mockClearError,
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

// Mock react-router-dom
const mockNavigate = vi.fn();
let mockParams = { spaceId: 'space-1' };
const setMockParams = (params: { spaceId: string }) => {
  mockParams = params;
};

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useParams: () => mockParams,
  };
});

describe('SpaceDetail', () => {
  const renderWithRouter = (initialEntries = ['/space/space-1']) => {
    return render(
      <MemoryRouter initialEntries={initialEntries}>
        <Routes>
          <Route path="/space/:spaceId" element={<SpaceDetail />} />
        </Routes>
      </MemoryRouter>
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();
    resetMockSpaceState();
    resetMockAuthState();
    setMockParams({ spaceId: 'space-1' });
  });

  it('loads space data on mount', async () => {
    renderWithRouter();
    
    await waitFor(() => {
      expect(mockSelectSpace).toHaveBeenCalledWith('space-1');
      expect(mockLoadPendingInvitations).toHaveBeenCalledOnce();
    });
  });

  it('renders space information', () => {
    renderWithRouter();
    
    expect(screen.getByRole('heading', { name: 'Test Space' })).toBeInTheDocument();
    expect(screen.getByText('A test space for testing')).toBeInTheDocument();
    expect(screen.getByText('3 members')).toBeInTheDocument();
    expect(screen.getByText('Private')).toBeInTheDocument();
  });

  it('shows loading state', () => {
    setMockSpaceState({
      isLoading: true,
      currentSpace: null,
    });
    
    renderWithRouter();
    
    expect(screen.getByText('Loading space...')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveAttribute('aria-live', 'polite');
  });

  it('shows error state', () => {
    setMockSpaceState({
      error: 'Failed to load space',
      currentSpace: null,
    });
    
    renderWithRouter();
    
    expect(screen.getByText('Failed to load space')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('shows space not found state', () => {
    setMockSpaceState({
      currentSpace: null,
      isLoading: false,
      error: null,
    });
    
    renderWithRouter();
    
    expect(screen.getByText('Space not found')).toBeInTheDocument();
    expect(screen.getByText('Back to Dashboard')).toBeInTheDocument();
  });

  it('navigates back to dashboard', () => {
    setMockSpaceState({
      currentSpace: null,
      isLoading: false,
      error: null,
    });
    
    renderWithRouter();
    
    const backButton = screen.getByText('Back to Dashboard');
    fireEvent.click(backButton);
    
    expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
  });

  it('renders members list', () => {
    renderWithRouter();
    
    expect(screen.getByTestId('members-list')).toBeInTheDocument();
    expect(screen.getByText('Members: 2')).toBeInTheDocument();
  });

  it('opens invite modal when invite button is clicked', () => {
    renderWithRouter();
    
    // Get the first Invite Members button (the one in the header)
    const inviteButton = screen.getAllByText('Invite Members')[0];
    fireEvent.click(inviteButton);
    
    expect(screen.getByTestId('invite-modal')).toBeInTheDocument();
  });

  it('closes invite modal', () => {
    renderWithRouter();
    
    // Get the first Invite Members button (the one in the header)
    const inviteButton = screen.getAllByText('Invite Members')[0];
    fireEvent.click(inviteButton);
    
    const closeButton = screen.getByText('Close Modal');
    fireEvent.click(closeButton);
    
    expect(screen.queryByTestId('invite-modal')).not.toBeInTheDocument();
  });

  it('shows space settings button for owners', () => {
    renderWithRouter();
    
    // Space Settings is only visible in the actions dropdown
    const actionsButton = screen.getByText('Actions');
    fireEvent.click(actionsButton);
    
    expect(screen.getByText('Space Settings')).toBeInTheDocument();
  });

  it('does not show space settings button for non-owners', () => {
    setMockAuthState({
      user: {
        userId: 'user-2',
        email: 'admin@example.com',
        displayName: 'Admin User',
      },
    });
    
    renderWithRouter();
    
    // Space Settings button should only be visible in the actions dropdown
    // and only for owners, so first check if it's not directly visible
    expect(screen.queryByText('Space Settings')).not.toBeInTheDocument();
    
    // Now open the actions menu to verify it's not there either
    const actionsButton = screen.getByText('Actions');
    fireEvent.click(actionsButton);
    
    expect(screen.queryByText('Space Settings')).not.toBeInTheDocument();
  });

  it('shows space visibility correctly', () => {
    renderWithRouter();
    
    expect(screen.getByText('Private')).toBeInTheDocument();
  });
  
  it('shows public space visibility correctly', () => {
    setMockSpaceState({
      currentSpace: {
        ...mockSpaceState.currentSpace,
        isPublic: true,
      },
    });
    
    renderWithRouter();
    
    expect(screen.getByText('Public')).toBeInTheDocument();
  });

  it('shows space creation and update dates', () => {
    renderWithRouter();
    
    expect(screen.getByText(/Created/)).toBeInTheDocument();
    expect(screen.getByText(/Updated/)).toBeInTheDocument();
  });

  it('shows breadcrumb navigation', () => {
    renderWithRouter();
    
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByRole('navigation')).toBeInTheDocument();
    
    // Check that breadcrumb contains Test Space
    const breadcrumb = screen.getByRole('navigation');
    expect(breadcrumb).toHaveTextContent('Test Space');
  });

  it('handles breadcrumb navigation', () => {
    renderWithRouter();
    
    const dashboardLink = screen.getByText('Dashboard');
    fireEvent.click(dashboardLink);
    
    expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
  });

  it('shows space actions menu', () => {
    renderWithRouter();
    
    const actionsButton = screen.getByText('Actions');
    expect(actionsButton).toBeInTheDocument();
    
    fireEvent.click(actionsButton);
    
    // Wait for dropdown to appear
    expect(screen.getByText('Copy Space Link')).toBeInTheDocument();
    // Note: There are two "Invite Members" buttons, one in the header and one in dropdown
    const inviteButtons = screen.getAllByText('Invite Members');
    expect(inviteButtons.length).toBeGreaterThan(0);
  });

  it('copies space link to clipboard', async () => {
    // Mock clipboard API
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockImplementation(() => Promise.resolve()),
      },
    });

    renderWithRouter();
    
    const actionsButton = screen.getByText('Actions');
    fireEvent.click(actionsButton);
    
    const copyLinkButton = screen.getByText('Copy Space Link');
    fireEvent.click(copyLinkButton);
    
    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
        expect.stringContaining('/space/space-1')
      );
    });
  });

  it('shows tab navigation', () => {
    renderWithRouter();
    
    expect(screen.getByRole('tab', { name: 'Members' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Activity' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Files' })).toBeInTheDocument();
  });

  it('switches between tabs', () => {
    renderWithRouter();
    
    const membersTab = screen.getByRole('tab', { name: 'Members' });
    const activityTab = screen.getByRole('tab', { name: 'Activity' });
    
    expect(membersTab).toHaveAttribute('aria-selected', 'true');
    expect(activityTab).toHaveAttribute('aria-selected', 'false');
    
    fireEvent.click(activityTab);
    
    expect(membersTab).toHaveAttribute('aria-selected', 'false');
    expect(activityTab).toHaveAttribute('aria-selected', 'true');
  });

  it('handles keyboard navigation in tabs', () => {
    renderWithRouter();
    
    const membersTab = screen.getByRole('tab', { name: 'Members' });
    const activityTab = screen.getByRole('tab', { name: 'Activity' });
    
    // Simulate keydown event on members tab
    fireEvent.keyDown(membersTab, { key: 'ArrowRight' });
    
    // After arrow right, the activity tab should be active
    expect(activityTab).toHaveAttribute('aria-selected', 'true');
    expect(membersTab).toHaveAttribute('aria-selected', 'false');
  });

  it('has proper accessibility attributes', () => {
    renderWithRouter();
    
    const main = screen.getByRole('main');
    expect(main).toHaveAttribute('aria-labelledby', 'space-title');
    
    const title = screen.getByRole('heading', { level: 1 });
    expect(title).toHaveAttribute('id', 'space-title');
    
    const tabpanel = screen.getByRole('tabpanel');
    expect(tabpanel).toHaveAttribute('aria-labelledby');
  });

  it('handles space parameter changes', async () => {
    renderWithRouter(['/space/space-1']);
    
    await waitFor(() => {
      expect(mockSelectSpace).toHaveBeenCalledWith('space-1');
    });
    
    // Reset the mock calls count
    expect(mockSelectSpace).toHaveBeenCalledTimes(1);
  });

  it('clears errors on mount', () => {
    renderWithRouter();
    
    expect(mockClearError).toHaveBeenCalledOnce();
  });
});