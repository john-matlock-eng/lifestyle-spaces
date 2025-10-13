import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, Mock } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { Dashboard } from './Dashboard';
import { useAuth } from '../stores/authStore';
import { useSpace } from '../stores/spaceStore';
import { ThemeProvider } from '../theme/ThemeProvider';
import type { User, Space } from '../types';

// Mock the stores
vi.mock('../stores/authStore');
vi.mock('../stores/spaceStore');

// Mock Ellie components and hooks
const mockSetMood = vi.fn();
const mockCelebrate = vi.fn();
vi.mock('../hooks', () => ({
  useShihTzuCompanion: () => ({
    mood: 'excited',
    setMood: mockSetMood,
    position: { x: 100, y: 100 },
    celebrate: mockCelebrate,
  }),
}));

vi.mock('../components/ellie', () => ({
  Ellie: ({ mood, thoughtText, onClick }: { mood: string; thoughtText: string; onClick: () => void }) => (
    <div data-testid="ellie-companion">
      <div data-testid="ellie-mood">{mood}</div>
      <div data-testid="ellie-thought">{thoughtText}</div>
      <button data-testid="ellie-click" onClick={onClick}>Click Ellie</button>
    </div>
  ),
}));

// Mock the child components
vi.mock('../components/spaces/SpaceList', () => ({
  SpaceList: ({ spaces, onSpaceClick, onRetry, isLoading, error }: { spaces: Space[], onSpaceClick: (space: Space) => void, onRetry?: () => void, isLoading?: boolean, error?: string | null }) => (
    <div data-testid="space-list">
      <div data-testid="spaces-count">{spaces.length}</div>
      <div data-testid="loading-state">{isLoading ? 'loading' : 'not-loading'}</div>
      <div data-testid="error-state">{error || 'no-error'}</div>
      {spaces.map((space: Space) => (
        <div 
          key={space.spaceId}
          data-testid={`space-${space.spaceId}`}
          onClick={() => onSpaceClick(space)}
        >
          {space.name}
        </div>
      ))}
      {error && (
        <button data-testid="retry-button" onClick={onRetry}>
          Retry
        </button>
      )}
    </div>
  ),
}));

vi.mock('../components/spaces/CreateSpaceModal', () => ({
  CreateSpaceModal: ({ isOpen, onClose, onSpaceCreated }: { isOpen: boolean, onClose: () => void, onSpaceCreated?: (space: Space) => void }) => (
    isOpen ? (
      <div data-testid="create-space-modal">
        <button data-testid="modal-close" onClick={onClose}>Close</button>
        <button
          data-testid="modal-create"
          onClick={() => onSpaceCreated({ spaceId: 'new-space', name: 'New Space' })}
        >
          Create
        </button>
      </div>
    ) : null
  ),
}));

vi.mock('../components/invitations/JoinByCodeForm', () => ({
  JoinByCodeForm: ({ onSuccess, onCancel }: { onSuccess?: (result: { spaceId: string; spaceName: string }) => void, onCancel?: () => void }) => (
    <div data-testid="join-by-code-form">
      <button
        data-testid="join-cancel"
        onClick={onCancel}
      >
        Cancel
      </button>
      <button
        data-testid="join-submit"
        onClick={() => onSuccess?.({ spaceId: 'joined-space', spaceName: 'Joined Space' })}
      >
        Join
      </button>
    </div>
  ),
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('Dashboard', () => {
  const mockUser: User = {
    userId: 'user-1',
    email: 'test@example.com',
    username: 'testuser',
    displayName: 'Test User',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  };

  const mockSpaces: Space[] = [
    {
      spaceId: 'space-1',
      name: 'Test Space 1',
      description: 'Test description 1',
      ownerId: 'user-1',
      isPublic: true,
      maxMembers: 10,
      currentMembers: 5,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    },
    {
      spaceId: 'space-2',
      name: 'Test Space 2',
      description: 'Test description 2',
      ownerId: 'user-1',
      isPublic: false,
      maxMembers: 5,
      currentMembers: 3,
      createdAt: '2024-01-02T00:00:00Z',
      updatedAt: '2024-01-02T00:00:00Z',
    },
  ];

  const mockLoadSpaces = vi.fn();
  const mockUseAuth = useAuth as Mock;
  const mockUseSpace = useSpace as Mock;

  beforeEach(() => {
    vi.clearAllMocks();
    mockSetMood.mockClear();
    mockCelebrate.mockClear();

    mockUseAuth.mockReturnValue({
      user: mockUser,
    });

    mockUseSpace.mockReturnValue({
      spaces: mockSpaces,
      loadSpaces: mockLoadSpaces,
      isLoading: false,
      error: null,
    });
  });

  const renderDashboard = () => {
    return render(
      <ThemeProvider>
        <MemoryRouter>
          <Dashboard />
        </MemoryRouter>
      </ThemeProvider>
    );
  };

  it('renders welcome message with user display name', () => {
    renderDashboard();
    
    expect(screen.getByText('Welcome back, Test User!')).toBeInTheDocument();
    expect(screen.getByText('Manage your spaces and connect with others.')).toBeInTheDocument();
  });

  it('calls loadSpaces on mount', () => {
    renderDashboard();
    
    expect(mockLoadSpaces).toHaveBeenCalledTimes(1);
  });

  it('renders spaces list with correct props', () => {
    renderDashboard();
    
    expect(screen.getByTestId('space-list')).toBeInTheDocument();
    expect(screen.getByTestId('spaces-count')).toHaveTextContent('2');
    expect(screen.getByTestId('loading-state')).toHaveTextContent('not-loading');
    expect(screen.getByTestId('error-state')).toHaveTextContent('no-error');
  });

  it('shows loading state when spaces are loading', () => {
    mockUseSpace.mockReturnValue({
      spaces: [],
      loadSpaces: mockLoadSpaces,
      isLoading: true,
      error: null,
    });

    renderDashboard();
    
    expect(screen.getByTestId('loading-state')).toHaveTextContent('loading');
  });

  it('shows error state when there is an error', () => {
    const errorMessage = 'Failed to load spaces';
    mockUseSpace.mockReturnValue({
      spaces: [],
      loadSpaces: mockLoadSpaces,
      isLoading: false,
      error: errorMessage,
    });

    renderDashboard();
    
    expect(screen.getByTestId('error-state')).toHaveTextContent(errorMessage);
    expect(screen.getByTestId('retry-button')).toBeInTheDocument();
  });

  it('handles retry when loading spaces fails', () => {
    mockUseSpace.mockReturnValue({
      spaces: [],
      loadSpaces: mockLoadSpaces,
      isLoading: false,
      error: 'Network error',
    });

    renderDashboard();
    
    fireEvent.click(screen.getByTestId('retry-button'));
    
    expect(mockLoadSpaces).toHaveBeenCalledTimes(2); // Once on mount, once on retry
  });

  it('navigates to space detail when space is clicked', () => {
    renderDashboard();
    
    const spaceElement = screen.getByTestId('space-space-1');
    fireEvent.click(spaceElement);
    
    expect(mockNavigate).toHaveBeenCalledWith('/space/space-1');
  });

  it('opens create space modal when create button is clicked', () => {
    renderDashboard();
    
    const createButton = screen.getByText('Create Space');
    fireEvent.click(createButton);
    
    expect(screen.getByTestId('create-space-modal')).toBeInTheDocument();
  });

  it('closes create space modal when close button is clicked', () => {
    renderDashboard();
    
    // Open modal
    const createButton = screen.getByText('Create Space');
    fireEvent.click(createButton);
    
    expect(screen.getByTestId('create-space-modal')).toBeInTheDocument();
    
    // Close modal
    const closeButton = screen.getByTestId('modal-close');
    fireEvent.click(closeButton);
    
    expect(screen.queryByTestId('create-space-modal')).not.toBeInTheDocument();
  });

  it('navigates to new space and closes modal when space is created', async () => {
    renderDashboard();
    
    // Open modal
    const createButton = screen.getByText('Create Space');
    fireEvent.click(createButton);
    
    expect(screen.getByTestId('create-space-modal')).toBeInTheDocument();
    
    // Create space
    const createSpaceButton = screen.getByTestId('modal-create');
    fireEvent.click(createSpaceButton);
    
    // Modal should close and navigate to new space
    await waitFor(() => {
      expect(screen.queryByTestId('create-space-modal')).not.toBeInTheDocument();
    });
    
    expect(mockNavigate).toHaveBeenCalledWith('/space/new-space');
  });

  it('renders create space modal only when isCreateModalOpen is true', () => {
    renderDashboard();
    
    // Modal should not be visible initially
    expect(screen.queryByTestId('create-space-modal')).not.toBeInTheDocument();
    
    // Click create button to show modal
    const createButton = screen.getByText('Create Space');
    fireEvent.click(createButton);
    
    // Modal should now be visible
    expect(screen.getByTestId('create-space-modal')).toBeInTheDocument();
  });

  it('renders with correct CSS classes and structure', () => {
    renderDashboard();
    
    expect(screen.getByRole('main')).toHaveClass('dashboard-main');
    expect(screen.getByRole('banner')).toHaveClass('dashboard-header');
    expect(screen.getByText('Your Spaces').closest('.spaces-section__header')).toBeInTheDocument();
    // The mocked SpaceList component doesn't have the className prop, so we just verify it exists
    expect(screen.getByTestId('space-list')).toBeInTheDocument();
  });

  it('handles user without display name gracefully', () => {
    mockUseAuth.mockReturnValue({
      user: {
        ...mockUser,
        displayName: undefined,
      },
    });

    renderDashboard();
    
    expect(screen.getByText('Welcome back, !')).toBeInTheDocument();
  });

  it('handles empty spaces array', () => {
    mockUseSpace.mockReturnValue({
      spaces: [],
      loadSpaces: mockLoadSpaces,
      isLoading: false,
      error: null,
    });

    renderDashboard();

    expect(screen.getByTestId('spaces-count')).toHaveTextContent('0');
  });

  describe('Join by Code functionality', () => {
    it('shows join by code card initially', () => {
      renderDashboard();

      expect(screen.getByText('Have an invite code?')).toBeInTheDocument();
      expect(screen.getByText('Join a space instantly using an invitation code')).toBeInTheDocument();
      expect(screen.getByText('Join with Code')).toBeInTheDocument();
    });

    it('shows join by code form when button is clicked', () => {
      renderDashboard();

      const joinButton = screen.getByText('Join with Code');
      fireEvent.click(joinButton);

      expect(screen.getByTestId('join-by-code-form')).toBeInTheDocument();
      expect(screen.queryByText('Have an invite code?')).not.toBeInTheDocument();
    });

    it('hides join by code form when cancel is clicked', () => {
      renderDashboard();

      // Show the form
      const joinButton = screen.getByText('Join with Code');
      fireEvent.click(joinButton);

      expect(screen.getByTestId('join-by-code-form')).toBeInTheDocument();

      // Cancel
      const cancelButton = screen.getByTestId('join-cancel');
      fireEvent.click(cancelButton);

      expect(screen.queryByTestId('join-by-code-form')).not.toBeInTheDocument();
      expect(screen.getByText('Have an invite code?')).toBeInTheDocument();
    });

    it('reloads spaces and navigates when join is successful', async () => {
      renderDashboard();

      // Show the form
      const joinButton = screen.getByText('Join with Code');
      fireEvent.click(joinButton);

      // Submit the form
      const submitButton = screen.getByTestId('join-submit');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockLoadSpaces).toHaveBeenCalledTimes(2); // Once on mount, once after join
        expect(mockNavigate).toHaveBeenCalledWith('/space/joined-space');
        expect(screen.queryByTestId('join-by-code-form')).not.toBeInTheDocument();
      });
    });

    it('toggles between join card and form correctly', () => {
      renderDashboard();

      // Initially shows the card
      expect(screen.getByText('Have an invite code?')).toBeInTheDocument();
      expect(screen.queryByTestId('join-by-code-form')).not.toBeInTheDocument();

      // Click to show form
      fireEvent.click(screen.getByText('Join with Code'));
      expect(screen.queryByText('Have an invite code?')).not.toBeInTheDocument();
      expect(screen.getByTestId('join-by-code-form')).toBeInTheDocument();

      // Click cancel to show card again
      fireEvent.click(screen.getByTestId('join-cancel'));
      expect(screen.getByText('Have an invite code?')).toBeInTheDocument();
      expect(screen.queryByTestId('join-by-code-form')).not.toBeInTheDocument();
    });
  });

  describe('Ellie companion integration', () => {
    it('renders Ellie companion', () => {
      renderDashboard();

      expect(screen.getByTestId('ellie-companion')).toBeInTheDocument();
      expect(screen.getByTestId('ellie-mood')).toHaveTextContent('excited');
    });

    it('shows welcome message for users with spaces', () => {
      renderDashboard();

      expect(screen.getByTestId('ellie-thought')).toHaveTextContent('Welcome back! Ready to manage your spaces? 😊');
    });

    it('shows first-time user message when no spaces', () => {
      mockUseSpace.mockReturnValue({
        spaces: [],
        loadSpaces: mockLoadSpaces,
        isLoading: false,
        error: null,
      });

      renderDashboard();

      expect(screen.getByTestId('ellie-thought')).toHaveTextContent('Welcome! Create your first space to get started! 🎉');
    });

    it('sets mood to curious when create space is clicked', () => {
      renderDashboard();

      const createButton = screen.getByText('Create Space');
      fireEvent.click(createButton);

      expect(mockSetMood).toHaveBeenCalledWith('curious');
    });

    it('celebrates when space is created', async () => {
      renderDashboard();

      // Open modal and create space
      fireEvent.click(screen.getByText('Create Space'));
      fireEvent.click(screen.getByTestId('modal-create'));

      await waitFor(() => {
        expect(mockCelebrate).toHaveBeenCalled();
      });
    });

    it('celebrates when joining space by code', async () => {
      renderDashboard();

      // Show join form and submit
      fireEvent.click(screen.getByText('Join with Code'));
      fireEvent.click(screen.getByTestId('join-submit'));

      await waitFor(() => {
        expect(mockCelebrate).toHaveBeenCalled();
      });
    });

    it('allows clicking Ellie to toggle mood', () => {
      renderDashboard();

      const ellieClickButton = screen.getByTestId('ellie-click');
      fireEvent.click(ellieClickButton);

      expect(mockSetMood).toHaveBeenCalled();
    });
  });
});