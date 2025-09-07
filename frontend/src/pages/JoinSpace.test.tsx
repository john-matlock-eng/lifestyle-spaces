import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { JoinSpace } from './JoinSpace';
import { MemoryRouter } from 'react-router-dom';
import type { Space } from '../types';

// Mock services
vi.mock('../services/spaces', () => ({
  joinSpaceWithInviteCode: vi.fn(),
}));

// Import the mocked function for use in tests
import { joinSpaceWithInviteCode as mockJoinSpaceWithInviteCode } from '../services/spaces';

// Mock components
vi.mock('../components/auth/AuthLayout', () => ({
  AuthLayout: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="auth-layout">{children}</div>
  ),
}));

// Mock auth store
const mockUser = {
  userId: 'user-123',
  email: 'test@example.com',
  username: 'testuser',
};

const mockAuthState = {
  user: mockUser,
  isAuthenticated: true,
};

vi.mock('../stores/authStore', () => ({
  useAuth: () => mockAuthState,
}));

// Mock react-router-dom
const mockNavigate = vi.fn();
const mockParams = { inviteCode: 'valid-invite-code' };

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useParams: () => mockParams,
  };
});

// Mock space data
const mockSpace: Space = {
  spaceId: 'space-123',
  name: 'Test Space',
  description: 'A test space',
  ownerId: 'owner-123',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
  memberCount: 5,
  isPublic: false,
};

// Test wrapper component
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <MemoryRouter>{children}</MemoryRouter>
);

describe('JoinSpace', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockParams.inviteCode = 'valid-invite-code';
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  describe('Component Rendering', () => {
    it('renders the join space form with invite code', () => {
      render(
        <TestWrapper>
          <JoinSpace />
        </TestWrapper>
      );

      expect(screen.getByRole('heading', { name: 'Join Space' })).toBeInTheDocument();
      expect(screen.getByText('You\'ve been invited to join a lifestyle space')).toBeInTheDocument();
      expect(screen.getByText('Invite Code:')).toBeInTheDocument();
      expect(screen.getByTestId('invite-code-display')).toHaveTextContent('valid-invite-code');
      expect(screen.getByTestId('join-button')).toBeInTheDocument();
      expect(screen.getByTestId('cancel-button')).toBeInTheDocument();
    });

    it('displays information about joining the space', () => {
      render(
        <TestWrapper>
          <JoinSpace />
        </TestWrapper>
      );

      expect(screen.getByText(/By joining this space, you'll be able to participate in discussions/)).toBeInTheDocument();
    });

    it('shows error message when no invite code is provided', () => {
      mockParams.inviteCode = '';
      
      render(
        <TestWrapper>
          <JoinSpace />
        </TestWrapper>
      );

      expect(screen.getByRole('alert')).toHaveTextContent('Invalid invite code provided');
      expect(screen.getByTestId('join-button')).toBeDisabled();
    });

    it('shows invalid invite code message for empty invite code', () => {
      mockParams.inviteCode = '   ';
      
      render(
        <TestWrapper>
          <JoinSpace />
        </TestWrapper>
      );

      expect(screen.getByRole('alert')).toHaveTextContent('Invalid invite code provided');
      expect(screen.getByTestId('join-button')).toBeDisabled();
    });
  });

  describe('Join Space Functionality', () => {
    it('successfully joins space and navigates to space detail', async () => {
      const user = userEvent.setup();
      vi.mocked(mockJoinSpaceWithInviteCode).mockResolvedValueOnce(mockSpace);

      render(
        <TestWrapper>
          <JoinSpace />
        </TestWrapper>
      );

      const joinButton = screen.getByTestId('join-button');
      expect(joinButton).not.toBeDisabled();

      await user.click(joinButton);

      expect(mockJoinSpaceWithInviteCode).toHaveBeenCalledWith('valid-invite-code');
      
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith(
          '/space/space-123',
          {
            replace: true,
            state: { successMessage: 'Successfully joined Test Space!' }
          }
        );
      });
    });

    it('shows loading state while joining space', async () => {
      const user = userEvent.setup();
      let resolvePromise: (value: Space) => void;
      const joinPromise = new Promise<Space>((resolve) => {
        resolvePromise = resolve;
      });
      vi.mocked(mockJoinSpaceWithInviteCode).mockReturnValueOnce(joinPromise);

      render(
        <TestWrapper>
          <JoinSpace />
        </TestWrapper>
      );

      const joinButton = screen.getByTestId('join-button');
      await user.click(joinButton);

      expect(screen.getByText('Joining...')).toBeInTheDocument();
      expect(screen.getByTestId('join-button')).toBeDisabled();
      expect(screen.getByTestId('cancel-button')).toBeDisabled();
      expect(screen.getByText('Joining...')).toBeInTheDocument();

      // Resolve the promise
      resolvePromise!(mockSpace);
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalled();
      });
    });

    it('handles join button click when invite code is empty', async () => {
      const user = userEvent.setup();
      mockParams.inviteCode = '';

      render(
        <TestWrapper>
          <JoinSpace />
        </TestWrapper>
      );

      const joinButton = screen.getByTestId('join-button');
      expect(joinButton).toBeDisabled();
      
      // Try to click disabled button
      await user.click(joinButton);
      
      expect(mockJoinSpaceWithInviteCode).not.toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('displays error for expired invite code', async () => {
      const user = userEvent.setup();
      vi.mocked(mockJoinSpaceWithInviteCode).mockRejectedValueOnce(
        new Error('Invite code has expired')
      );

      render(
        <TestWrapper>
          <JoinSpace />
        </TestWrapper>
      );

      await user.click(screen.getByTestId('join-button'));

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent(
          'This invite code is invalid or has expired'
        );
      });

      expect(screen.getByTestId('join-button')).not.toBeDisabled();
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('displays error for invalid invite code', async () => {
      const user = userEvent.setup();
      vi.mocked(mockJoinSpaceWithInviteCode).mockRejectedValueOnce(
        new Error('Invalid invite code')
      );

      render(
        <TestWrapper>
          <JoinSpace />
        </TestWrapper>
      );

      await user.click(screen.getByTestId('join-button'));

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent(
          'Invalid invite code'
        );
      });
    });

    it('displays error for already being a member', async () => {
      const user = userEvent.setup();
      vi.mocked(mockJoinSpaceWithInviteCode).mockRejectedValueOnce(
        new Error('User already member of this space')
      );

      render(
        <TestWrapper>
          <JoinSpace />
        </TestWrapper>
      );

      await user.click(screen.getByTestId('join-button'));

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent(
          'You are already a member of this space'
        );
      });
    });

    it('displays error for space not found', async () => {
      const user = userEvent.setup();
      vi.mocked(mockJoinSpaceWithInviteCode).mockRejectedValueOnce(
        new Error('Space not found')
      );

      render(
        <TestWrapper>
          <JoinSpace />
        </TestWrapper>
      );

      await user.click(screen.getByTestId('join-button'));

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent(
          'Space not found with this invite code'
        );
      });
    });

    it('displays generic error message for unknown errors', async () => {
      const user = userEvent.setup();
      vi.mocked(mockJoinSpaceWithInviteCode).mockRejectedValueOnce(
        new Error('Some unknown error')
      );

      render(
        <TestWrapper>
          <JoinSpace />
        </TestWrapper>
      );

      await user.click(screen.getByTestId('join-button'));

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent('Some unknown error');
      });
    });

    it('displays generic error message for non-Error objects', async () => {
      const user = userEvent.setup();
      vi.mocked(mockJoinSpaceWithInviteCode).mockRejectedValueOnce('String error');

      render(
        <TestWrapper>
          <JoinSpace />
        </TestWrapper>
      );

      await user.click(screen.getByTestId('join-button'));

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent('Failed to join space');
      });
    });
  });

  describe('Navigation', () => {
    it('navigates to dashboard when cancel button is clicked', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <JoinSpace />
        </TestWrapper>
      );

      await user.click(screen.getByTestId('cancel-button'));

      expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
    });

    it('does not allow cancel when joining is in progress', async () => {
      const user = userEvent.setup();
      let resolvePromise: (value: Space) => void;
      const joinPromise = new Promise<Space>((resolve) => {
        resolvePromise = resolve;
      });
      vi.mocked(mockJoinSpaceWithInviteCode).mockReturnValueOnce(joinPromise);

      render(
        <TestWrapper>
          <JoinSpace />
        </TestWrapper>
      );

      // Start joining process
      await user.click(screen.getByTestId('join-button'));
      
      // Cancel button should be disabled
      expect(screen.getByTestId('cancel-button')).toBeDisabled();

      // Resolve the promise
      resolvePromise!(mockSpace);
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalled();
      });
    });
  });

  describe('Keyboard Interaction', () => {
    it('joins space when Enter key is pressed', async () => {
      const user = userEvent.setup();
      vi.mocked(mockJoinSpaceWithInviteCode).mockResolvedValueOnce(mockSpace);

      render(
        <TestWrapper>
          <JoinSpace />
        </TestWrapper>
      );

      const container = screen.getByRole('heading', { name: 'Join Space' }).closest('.join-space-container');
      expect(container).toBeInTheDocument();

      if (container) {
        await user.click(container);
        await user.keyboard('{Enter}');
      }

      expect(mockJoinSpaceWithInviteCode).toHaveBeenCalledWith('valid-invite-code');
    });

    it('navigates to dashboard when Escape key is pressed', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <JoinSpace />
        </TestWrapper>
      );

      const container = screen.getByRole('heading', { name: 'Join Space' }).closest('.join-space-container');
      expect(container).toBeInTheDocument();

      if (container) {
        await user.click(container);
        await user.keyboard('{Escape}');
      }

      expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
    });

    it('does not join when Enter is pressed during loading', async () => {
      const user = userEvent.setup();
      let resolvePromise: (value: Space) => void;
      const joinPromise = new Promise<Space>((resolve) => {
        resolvePromise = resolve;
      });
      vi.mocked(mockJoinSpaceWithInviteCode).mockReturnValueOnce(joinPromise);

      render(
        <TestWrapper>
          <JoinSpace />
        </TestWrapper>
      );

      const container = screen.getByRole('heading', { name: 'Join Space' }).closest('.join-space-container');
      if (container) {
        // Start joining
        await user.click(container);
        await user.keyboard('{Enter}');
        
        // Try to join again while loading
        await user.keyboard('{Enter}');
      }

      // Should only be called once
      expect(mockJoinSpaceWithInviteCode).toHaveBeenCalledTimes(1);

      // Resolve the promise
      resolvePromise!(mockSpace);
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalled();
      });
    });
  });

  describe('Focus Management', () => {
    it('has proper focus management for keyboard navigation', () => {
      render(
        <TestWrapper>
          <JoinSpace />
        </TestWrapper>
      );

      const container = screen.getByRole('heading', { name: 'Join Space' }).closest('.join-space-container');
      expect(container).toHaveAttribute('tabIndex', '-1');
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA attributes', () => {
      render(
        <TestWrapper>
          <JoinSpace />
        </TestWrapper>
      );

      expect(screen.getByTestId('invite-code-display')).toHaveAttribute('id', 'invite-code');
      expect(screen.getByText('Invite Code:')).toHaveAttribute('for', 'invite-code');
    });

    it('announces errors to screen readers', async () => {
      const user = userEvent.setup();
      vi.mocked(mockJoinSpaceWithInviteCode).mockRejectedValueOnce(
        new Error('Test error message')
      );

      render(
        <TestWrapper>
          <JoinSpace />
        </TestWrapper>
      );

      await user.click(screen.getByTestId('join-button'));

      await waitFor(() => {
        const errorElement = screen.getByRole('alert');
        expect(errorElement).toHaveAttribute('aria-live', 'polite');
        expect(errorElement).toHaveTextContent('Test error message');
      });
    });

    it('has proper button states for screen readers', () => {
      mockParams.inviteCode = '';
      
      render(
        <TestWrapper>
          <JoinSpace />
        </TestWrapper>
      );

      const joinButton = screen.getByTestId('join-button');
      
      expect(joinButton).toHaveAttribute('aria-describedby', 'error-message');
      expect(joinButton).toBeDisabled();
    });
  });

  describe('Edge Cases', () => {
    it('handles whitespace-only invite codes', () => {
      mockParams.inviteCode = '   ';
      
      render(
        <TestWrapper>
          <JoinSpace />
        </TestWrapper>
      );

      expect(screen.getByTestId('invite-code-display')).toBeInTheDocument();
      expect(screen.getByRole('alert')).toHaveTextContent('Invalid invite code provided');
      expect(screen.getByTestId('join-button')).toBeDisabled();
    });

    it('trims invite code before sending to API', async () => {
      const user = userEvent.setup();
      mockParams.inviteCode = '  valid-code-with-spaces  ';
      vi.mocked(mockJoinSpaceWithInviteCode).mockResolvedValueOnce(mockSpace);

      render(
        <TestWrapper>
          <JoinSpace />
        </TestWrapper>
      );

      await user.click(screen.getByTestId('join-button'));

      expect(mockJoinSpaceWithInviteCode).toHaveBeenCalledWith('valid-code-with-spaces');
    });

    it('handles undefined invite code param', () => {
      (mockParams as { inviteCode: string | undefined }).inviteCode = undefined;
      
      render(
        <TestWrapper>
          <JoinSpace />
        </TestWrapper>
      );

      expect(screen.getByTestId('invite-code-display')).toHaveTextContent('No invite code provided');
      expect(screen.getByRole('alert')).toHaveTextContent('Invalid invite code provided');
    });
  });
});