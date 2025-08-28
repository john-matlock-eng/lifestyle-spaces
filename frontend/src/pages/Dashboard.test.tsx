import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, Mock } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { Dashboard } from './Dashboard';
import { useAuth } from '../stores/authStore';
import { useSpace } from '../stores/spaceStore';
import type { User, Space } from '../types';

// Mock the stores
vi.mock('../stores/authStore');
vi.mock('../stores/spaceStore');

// Mock the child components
vi.mock('../components/spaces/SpaceList', () => ({
  SpaceList: ({ spaces, onSpaceClick, onRetry, isLoading, error }: any) => (
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
  CreateSpaceModal: ({ isOpen, onClose, onSpaceCreated }: any) => (
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
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
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
});