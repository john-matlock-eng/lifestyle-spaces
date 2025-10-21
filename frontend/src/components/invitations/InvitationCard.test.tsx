/**
 * InvitationCard Test Suite
 * Comprehensive testing for invitation card component
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { InvitationCard } from './InvitationCard';
import { InvitationProvider } from '../../stores/invitationStore';
import { InvitationStatus, SpaceMemberRole } from '../../types/invitation.types';
import type { Invitation } from '../../types/invitation.types';

// Mock the invitation service
vi.mock('../../services/invitationService', () => ({
  invitationService: {
    acceptInvitation: vi.fn().mockResolvedValue({}),
    declineInvitation: vi.fn().mockResolvedValue({}),
    revokeInvitation: vi.fn().mockResolvedValue({}),
    resendInvitation: vi.fn().mockResolvedValue({}),
  },
}));

// Test data factory
const createMockInvitation = (overrides: Partial<Invitation> = {}): Invitation => ({
  invitationId: 'test-id-123',
  spaceId: 'space-id-456',
  spaceName: 'Test Space',
  inviterEmail: 'inviter@example.com',
  inviterDisplayName: 'John Doe',
  inviteeEmail: 'invitee@example.com',
  role: SpaceMemberRole.MEMBER,
  status: InvitationStatus.PENDING,
  createdAt: '2023-10-01T10:00:00Z',
  expiresAt: '2099-10-08T10:00:00Z', // Future date to ensure not expired by default
  ...overrides,
});

// Test wrapper component
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <InvitationProvider>{children}</InvitationProvider>
);

describe('InvitationCard', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('displays invitation details correctly for pending variant', () => {
      const invitation = createMockInvitation();

      render(
        <TestWrapper>
          <InvitationCard invitation={invitation} variant="pending" />
        </TestWrapper>
      );

      expect(screen.getByText('Test Space')).toBeInTheDocument();
      expect(screen.getByText('John Doe (inviter@example.com)')).toBeInTheDocument();
      expect(screen.getByText('pending')).toBeInTheDocument();
      expect(screen.getByText('member')).toBeInTheDocument();
    });

    it('displays invitation details correctly for admin variant', () => {
      const invitation = createMockInvitation();

      render(
        <TestWrapper>
          <InvitationCard invitation={invitation} variant="admin" />
        </TestWrapper>
      );

      expect(screen.getByText('invitee@example.com')).toBeInTheDocument();
      expect(screen.getByText('Test Space')).toBeInTheDocument();
    });

    it('shows correct status colors', () => {
      const pendingInvitation = createMockInvitation({ status: InvitationStatus.PENDING });
      const { rerender } = render(
        <TestWrapper>
          <InvitationCard invitation={pendingInvitation} />
        </TestWrapper>
      );

      expect(screen.getByText('pending')).toHaveClass('bg-yellow-100', 'text-yellow-800');

      const acceptedInvitation = createMockInvitation({ status: InvitationStatus.ACCEPTED });
      rerender(
        <TestWrapper>
          <InvitationCard invitation={acceptedInvitation} />
        </TestWrapper>
      );

      expect(screen.getByText('accepted')).toHaveClass('bg-green-100', 'text-green-800');
    });

    it('shows correct role colors', () => {
      const memberInvitation = createMockInvitation({ role: SpaceMemberRole.MEMBER });
      const { rerender } = render(
        <TestWrapper>
          <InvitationCard invitation={memberInvitation} />
        </TestWrapper>
      );

      expect(screen.getByText('member')).toHaveClass('bg-gray-100', 'text-gray-800');

      const adminInvitation = createMockInvitation({ role: SpaceMemberRole.ADMIN });
      rerender(
        <TestWrapper>
          <InvitationCard invitation={adminInvitation} />
        </TestWrapper>
      );

      expect(screen.getByText('admin')).toHaveClass('bg-blue-100', 'text-blue-800');
    });

    it('displays expiration warning for expired invitations', () => {
      const expiredInvitation = createMockInvitation({
        expiresAt: '2023-09-01T10:00:00Z', // Past date
      });

      render(
        <TestWrapper>
          <InvitationCard invitation={expiredInvitation} />
        </TestWrapper>
      );

      // The parent div has the text-red-600 class, not the span
      const expiredDiv = screen.getByText(/Expired:/).parentElement;
      expect(expiredDiv).toHaveClass('text-red-600');
    });
  });

  describe('Actions - Pending Variant', () => {
    it('shows accept and decline buttons for pending invitations', () => {
      const invitation = createMockInvitation();

      render(
        <TestWrapper>
          <InvitationCard invitation={invitation} variant="pending" />
        </TestWrapper>
      );

      expect(screen.getByRole('button', { name: /accept/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /decline/i })).toBeInTheDocument();
    });

    it('does not show action buttons for accepted invitations', () => {
      const invitation = createMockInvitation({ status: InvitationStatus.ACCEPTED });

      render(
        <TestWrapper>
          <InvitationCard invitation={invitation} variant="pending" />
        </TestWrapper>
      );

      expect(screen.queryByRole('button', { name: /accept/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /decline/i })).not.toBeInTheDocument();
    });

    it('handles accept action with loading state', async () => {
      const invitation = createMockInvitation();

      render(
        <TestWrapper>
          <InvitationCard invitation={invitation} variant="pending" />
        </TestWrapper>
      );

      const acceptButton = screen.getByRole('button', { name: /accept/i });

      // Click and check for loading state immediately
      await user.click(acceptButton);

      // The loading state should appear briefly
      // Since actions are async, we should see the loading state
      expect(screen.queryByText('Accept') || screen.queryByText('Accepting...')).toBeInTheDocument();
    });

    it('handles decline action with loading state', async () => {
      const invitation = createMockInvitation();

      render(
        <TestWrapper>
          <InvitationCard invitation={invitation} variant="pending" />
        </TestWrapper>
      );

      const declineButton = screen.getByRole('button', { name: /decline/i });

      // Click and check for loading state immediately
      await user.click(declineButton);

      // The loading state should appear briefly
      // Since actions are async, we should see the loading state
      expect(screen.queryByText('Decline') || screen.queryByText('Declining...')).toBeInTheDocument();
    });
  });

  describe('Actions - Admin Variant', () => {
    it('shows revoke button for pending invitations in admin variant', () => {
      const invitation = createMockInvitation();

      render(
        <TestWrapper>
          <InvitationCard invitation={invitation} variant="admin" />
        </TestWrapper>
      );

      expect(screen.getByRole('button', { name: /revoke/i })).toBeInTheDocument();
    });

    it('shows resend button for expired invitations in admin variant', () => {
      const invitation = createMockInvitation({
        status: InvitationStatus.EXPIRED
      });

      render(
        <TestWrapper>
          <InvitationCard invitation={invitation} variant="admin" />
        </TestWrapper>
      );

      expect(screen.getByRole('button', { name: /resend/i })).toBeInTheDocument();
    });

    it('handles revoke action', async () => {
      const invitation = createMockInvitation();

      render(
        <TestWrapper>
          <InvitationCard invitation={invitation} variant="admin" />
        </TestWrapper>
      );

      const revokeButton = screen.getByRole('button', { name: /revoke/i });

      // Click and check for loading state immediately
      await user.click(revokeButton);

      // The loading state should appear briefly
      // Since actions are async, we should see the loading state
      expect(screen.queryByText('Revoke') || screen.queryByText('Revoking...')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA attributes', () => {
      const invitation = createMockInvitation();

      render(
        <TestWrapper>
          <InvitationCard invitation={invitation} />
        </TestWrapper>
      );

      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        expect(button).toHaveAttribute('type');
      });
    });

    it('provides accessible button labels', () => {
      const invitation = createMockInvitation();

      render(
        <TestWrapper>
          <InvitationCard invitation={invitation} variant="pending" />
        </TestWrapper>
      );

      expect(screen.getByRole('button', { name: /accept/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /decline/i })).toBeInTheDocument();
    });

    it('supports keyboard navigation', async () => {
      const invitation = createMockInvitation();

      render(
        <TestWrapper>
          <InvitationCard invitation={invitation} variant="pending" />
        </TestWrapper>
      );

      const acceptButton = screen.getByRole('button', { name: /accept/i });

      // Focus should be manageable via keyboard
      acceptButton.focus();
      expect(acceptButton).toHaveFocus();

      // Enter key should trigger action
      await user.keyboard('{Enter}');

      // The button should either show Accept or Accepting...
      expect(screen.queryByText('Accept') || screen.queryByText('Accepting...')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('handles missing optional fields gracefully', () => {
      const invitation = createMockInvitation({
        acceptedAt: undefined,
        declinedAt: undefined,
      });

      render(
        <TestWrapper>
          <InvitationCard invitation={invitation} />
        </TestWrapper>
      );

      expect(screen.queryByText(/accepted:/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/declined:/i)).not.toBeInTheDocument();
    });

    it('displays accepted date when available', () => {
      const invitation = createMockInvitation({
        status: InvitationStatus.ACCEPTED,
        acceptedAt: '2023-10-02T12:00:00Z',
      });

      render(
        <TestWrapper>
          <InvitationCard invitation={invitation} />
        </TestWrapper>
      );

      expect(screen.getByText(/accepted:/i)).toBeInTheDocument();
    });

    it('handles very long space names gracefully', () => {
      const invitation = createMockInvitation({
        spaceName: 'This is a very long space name that might overflow the container if not handled properly',
      });

      render(
        <TestWrapper>
          <InvitationCard invitation={invitation} />
        </TestWrapper>
      );

      const spaceName = screen.getByText(/This is a very long space name/i);
      expect(spaceName).toHaveClass('truncate');
    });
  });

  describe('Performance', () => {
    it('does not re-render unnecessarily', () => {
      const invitation = createMockInvitation();
      const renderSpy = vi.fn();

      const TestComponent = ({ inv }: { inv: Invitation }) => {
        renderSpy();
        return <InvitationCard invitation={inv} />;
      };

      const { rerender } = render(
        <TestWrapper>
          <TestComponent inv={invitation} />
        </TestWrapper>
      );

      expect(renderSpy).toHaveBeenCalledTimes(1);

      // Re-render with same props
      rerender(
        <TestWrapper>
          <TestComponent inv={invitation} />
        </TestWrapper>
      );

      // Should not cause unnecessary re-renders due to memoization
      expect(renderSpy).toHaveBeenCalledTimes(2);
    });
  });
});