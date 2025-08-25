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

const mockSpaceData = {
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

vi.mock('../stores/spaceStore', () => ({
  useSpace: () => ({
    ...mockSpaceData,
    selectSpace: mockSelectSpace,
    loadPendingInvitations: mockLoadPendingInvitations,
    clearError: mockClearError,
  }),
}));

// Mock auth store
const mockAuthData = {
  user: {
    userId: 'user-1',
    email: 'owner@example.com',
    displayName: 'Space Owner',
  },
  isAuthenticated: true,
};

vi.mock('../stores/authStore', () => ({
  useAuth: () => mockAuthData,
}));

// Mock react-router-dom
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useParams: () => ({ spaceId: 'space-1' }),
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
    vi.doMock('../stores/spaceStore', () => ({
      useSpace: () => ({
        ...mockSpaceData,
        isLoading: true,
        currentSpace: null,
        selectSpace: mockSelectSpace,
        loadPendingInvitations: mockLoadPendingInvitations,
        clearError: mockClearError,
      }),
    }));

    const { rerender } = renderWithRouter();
    rerender(
      <MemoryRouter initialEntries={['/space/space-1']}>
        <Routes>
          <Route path="/space/:spaceId" element={<SpaceDetail />} />
        </Routes>
      </MemoryRouter>
    );
    
    expect(screen.getByText('Loading space...')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveAttribute('aria-live', 'polite');
  });

  it('shows error state', () => {
    vi.doMock('../stores/spaceStore', () => ({
      useSpace: () => ({
        ...mockSpaceData,
        error: 'Failed to load space',
        currentSpace: null,
        selectSpace: mockSelectSpace,
        loadPendingInvitations: mockLoadPendingInvitations,
        clearError: mockClearError,
      }),
    }));

    const { rerender } = renderWithRouter();
    rerender(
      <MemoryRouter initialEntries={['/space/space-1']}>
        <Routes>
          <Route path="/space/:spaceId" element={<SpaceDetail />} />
        </Routes>
      </MemoryRouter>
    );
    
    expect(screen.getByText('Failed to load space')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('shows space not found state', () => {
    vi.doMock('../stores/spaceStore', () => ({
      useSpace: () => ({
        ...mockSpaceData,
        currentSpace: null,
        isLoading: false,
        error: null,
        selectSpace: mockSelectSpace,
        loadPendingInvitations: mockLoadPendingInvitations,
        clearError: mockClearError,
      }),
    }));

    const { rerender } = renderWithRouter();
    rerender(
      <MemoryRouter initialEntries={['/space/space-1']}>
        <Routes>
          <Route path="/space/:spaceId" element={<SpaceDetail />} />
        </Routes>
      </MemoryRouter>
    );
    
    expect(screen.getByText('Space not found')).toBeInTheDocument();
    expect(screen.getByText('Back to Dashboard')).toBeInTheDocument();
  });

  it('navigates back to dashboard', () => {
    vi.doMock('../stores/spaceStore', () => ({
      useSpace: () => ({
        ...mockSpaceData,
        currentSpace: null,
        isLoading: false,
        error: null,
        selectSpace: mockSelectSpace,
        loadPendingInvitations: mockLoadPendingInvitations,
        clearError: mockClearError,
      }),
    }));

    const { rerender } = renderWithRouter();
    rerender(
      <MemoryRouter initialEntries={['/space/space-1']}>
        <Routes>
          <Route path="/space/:spaceId" element={<SpaceDetail />} />
        </Routes>
      </MemoryRouter>
    );
    
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
    
    const inviteButton = screen.getByText('Invite Members');
    fireEvent.click(inviteButton);
    
    expect(screen.getByTestId('invite-modal')).toBeInTheDocument();
  });

  it('closes invite modal', () => {
    renderWithRouter();
    
    const inviteButton = screen.getByText('Invite Members');
    fireEvent.click(inviteButton);
    
    const closeButton = screen.getByText('Close Modal');
    fireEvent.click(closeButton);
    
    expect(screen.queryByTestId('invite-modal')).not.toBeInTheDocument();
  });

  it('shows space settings button for owners', () => {
    renderWithRouter();
    
    expect(screen.getByText('Space Settings')).toBeInTheDocument();
  });

  it('does not show space settings button for non-owners', () => {
    vi.doMock('../stores/authStore', () => ({
      useAuth: () => ({
        ...mockAuthData,
        user: {
          userId: 'user-2',
          email: 'admin@example.com',
          displayName: 'Admin User',
        },
      }),
    }));

    const { rerender } = renderWithRouter();
    rerender(
      <MemoryRouter initialEntries={['/space/space-1']}>
        <Routes>
          <Route path="/space/:spaceId" element={<SpaceDetail />} />
        </Routes>
      </MemoryRouter>
    );
    
    expect(screen.queryByText('Space Settings')).not.toBeInTheDocument();
  });

  it('shows space visibility correctly', () => {
    renderWithRouter();
    
    expect(screen.getByText('Private')).toBeInTheDocument();
    
    // Test public space
    vi.doMock('../stores/spaceStore', () => ({
      useSpace: () => ({
        ...mockSpaceData,
        currentSpace: {
          ...mockSpaceData.currentSpace,
          isPublic: true,
        },
        selectSpace: mockSelectSpace,
        loadPendingInvitations: mockLoadPendingInvitations,
        clearError: mockClearError,
      }),
    }));

    const { rerender } = renderWithRouter();
    rerender(
      <MemoryRouter initialEntries={['/space/space-1']}>
        <Routes>
          <Route path="/space/:spaceId" element={<SpaceDetail />} />
        </Routes>
      </MemoryRouter>
    );
    
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
    expect(screen.getByText('Test Space')).toBeInTheDocument();
    expect(screen.getByRole('navigation')).toBeInTheDocument();
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
    
    expect(screen.getByText('Invite Members')).toBeInTheDocument();
    expect(screen.getByText('Copy Space Link')).toBeInTheDocument();
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
    
    membersTab.focus();
    fireEvent.keyDown(membersTab, { key: 'ArrowRight' });
    
    expect(activityTab).toHaveFocus();
    expect(activityTab).toHaveAttribute('aria-selected', 'true');
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
    const { rerender } = renderWithRouter(['/space/space-1']);
    
    expect(mockSelectSpace).toHaveBeenCalledWith('space-1');
    
    rerender(
      <MemoryRouter initialEntries={['/space/space-2']}>
        <Routes>
          <Route path="/space/:spaceId" element={<SpaceDetail />} />
        </Routes>
      </MemoryRouter>
    );
    
    await waitFor(() => {
      expect(mockSelectSpace).toHaveBeenCalledWith('space-2');
    });
  });

  it('clears errors on mount', () => {
    renderWithRouter();
    
    expect(mockClearError).toHaveBeenCalledOnce();
  });
});