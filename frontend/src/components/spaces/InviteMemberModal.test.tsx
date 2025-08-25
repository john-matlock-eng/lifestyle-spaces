import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { InviteMemberModal } from './InviteMemberModal';
import { SpaceMemberRole, Invitation } from '../../types';

// Mock the space store hook
const mockInviteMember = vi.fn();
const mockClearError = vi.fn();

vi.mock('../../stores/spaceStore', async () => {
  const actual = await vi.importActual('../../stores/spaceStore');
  return {
    ...actual,
    useSpace: () => ({
      inviteMember: mockInviteMember,
      clearError: mockClearError,
      isLoading: false,
      error: null,
    }),
  };
});

describe('InviteMemberModal', () => {
  const mockSpace = {
    spaceId: 'space-1',
    name: 'Test Space',
    description: 'Test description',
    ownerId: 'user-1',
    createdAt: '2023-01-01T00:00:00Z',
    updatedAt: '2023-01-01T00:00:00Z',
    memberCount: 5,
    isPublic: false,
  };

  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    space: mockSpace,
    onInviteSent: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders modal when open', () => {
    render(<InviteMemberModal {...defaultProps} />);
    
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Invite Member to Test Space')).toBeInTheDocument();
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/role/i)).toBeInTheDocument();
  });

  it('does not render modal when closed', () => {
    render(<InviteMemberModal {...defaultProps} isOpen={false} />);
    
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('closes modal when cancel button is clicked', () => {
    const onClose = vi.fn();
    render(<InviteMemberModal {...defaultProps} onClose={onClose} />);
    
    fireEvent.click(screen.getByText('Cancel'));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('closes modal when clicking outside', () => {
    const onClose = vi.fn();
    render(<InviteMemberModal {...defaultProps} onClose={onClose} />);
    
    fireEvent.click(screen.getByTestId('modal-overlay'));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('closes modal when pressing escape key', () => {
    const onClose = vi.fn();
    render(<InviteMemberModal {...defaultProps} onClose={onClose} />);
    
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('validates required email field', async () => {
    render(<InviteMemberModal {...defaultProps} />);
    
    fireEvent.click(screen.getByText('Send Invitation'));
    
    await waitFor(() => {
      expect(screen.getByText('Email address is required')).toBeInTheDocument();
    });
  });

  it('validates email format', async () => {
    render(<InviteMemberModal {...defaultProps} />);
    
    const emailInput = screen.getByLabelText(/email address/i);
    fireEvent.change(emailInput, { target: { value: 'invalid-email' } });
    fireEvent.click(screen.getByText('Send Invitation'));
    
    await waitFor(() => {
      expect(screen.getByText('Please enter a valid email address')).toBeInTheDocument();
    });
  });

  it('sends invitation with valid data', async () => {
    const mockInvitation: Invitation = {
      invitationId: 'inv-1',
      spaceId: 'space-1',
      spaceName: 'Test Space',
      inviterEmail: 'owner@test.com',
      inviterDisplayName: 'Owner',
      inviteeEmail: 'test@example.com',
      role: 'member',
      status: 'pending',
      createdAt: '2023-01-01T00:00:00Z',
      expiresAt: '2023-01-08T00:00:00Z',
    };

    mockInviteMember.mockResolvedValueOnce(mockInvitation);

    const onInviteSent = vi.fn();
    const onClose = vi.fn();
    
    render(
      <InviteMemberModal 
        {...defaultProps} 
        onInviteSent={onInviteSent}
        onClose={onClose}
      />
    );
    
    const emailInput = screen.getByLabelText(/email address/i);
    const roleSelect = screen.getByLabelText(/role/i);
    
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(roleSelect, { target: { value: 'admin' } });
    
    fireEvent.click(screen.getByText('Send Invitation'));
    
    await waitFor(() => {
      expect(mockInviteMember).toHaveBeenCalledWith({
        email: 'test@example.com',
        spaceId: 'space-1',
        role: 'admin',
      });
      expect(onInviteSent).toHaveBeenCalledWith(mockInvitation);
      expect(onClose).toHaveBeenCalledOnce();
    });
  });

  it('handles invitation error', async () => {
    mockInviteMember.mockRejectedValueOnce(new Error('User already invited'));

    render(<InviteMemberModal {...defaultProps} />);
    
    const emailInput = screen.getByLabelText(/email address/i);
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.click(screen.getByText('Send Invitation'));
    
    await waitFor(() => {
      expect(screen.getByText('User already invited')).toBeInTheDocument();
    });
  });

  it('disables form during submission', async () => {
    // Mock loading state
    vi.mocked(mockInviteMember).mockImplementationOnce(
      () => new Promise(resolve => setTimeout(resolve, 100))
    );

    const { rerender } = render(<InviteMemberModal {...defaultProps} />);
    
    // Re-render with loading state
    vi.doMock('../../stores/spaceStore', () => ({
      useSpace: () => ({
        inviteMember: mockInviteMember,
        clearError: mockClearError,
        isLoading: true,
        error: null,
      }),
    }));

    rerender(<InviteMemberModal {...defaultProps} />);
    
    expect(screen.getByText('Sending Invitation...')).toBeInTheDocument();
    expect(screen.getByLabelText(/email address/i)).toBeDisabled();
    expect(screen.getByLabelText(/role/i)).toBeDisabled();
  });

  it('displays error message from store', () => {
    vi.doMock('../../stores/spaceStore', () => ({
      useSpace: () => ({
        inviteMember: mockInviteMember,
        clearError: mockClearError,
        isLoading: false,
        error: 'Network error',
      }),
    }));

    const { rerender } = render(<InviteMemberModal {...defaultProps} />);
    rerender(<InviteMemberModal {...defaultProps} />);
    
    expect(screen.getByText('Network error')).toBeInTheDocument();
  });

  it('clears error when modal opens', () => {
    render(<InviteMemberModal {...defaultProps} isOpen={true} />);
    expect(mockClearError).toHaveBeenCalledOnce();
  });

  it('shows role options correctly', () => {
    render(<InviteMemberModal {...defaultProps} />);
    
    const roleSelect = screen.getByLabelText(/role/i);
    expect(roleSelect).toBeInTheDocument();
    
    // Check if all role options are present
    expect(screen.getByRole('option', { name: /member/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /admin/i })).toBeInTheDocument();
    
    // Owner role should not be available for invitation
    expect(screen.queryByRole('option', { name: /owner/i })).not.toBeInTheDocument();
  });

  it('sets default role to member', () => {
    render(<InviteMemberModal {...defaultProps} />);
    
    const roleSelect = screen.getByLabelText(/role/i) as HTMLSelectElement;
    expect(roleSelect.value).toBe('member');
  });

  it('shows role descriptions', () => {
    render(<InviteMemberModal {...defaultProps} />);
    
    expect(screen.getByText(/Members can view and participate/)).toBeInTheDocument();
    
    // Change to admin role
    const roleSelect = screen.getByLabelText(/role/i);
    fireEvent.change(roleSelect, { target: { value: 'admin' } });
    
    expect(screen.getByText(/Admins can manage members and settings/)).toBeInTheDocument();
  });

  it('has proper accessibility attributes', () => {
    render(<InviteMemberModal {...defaultProps} />);
    
    const modal = screen.getByRole('dialog');
    expect(modal).toHaveAttribute('aria-labelledby');
    expect(modal).toHaveAttribute('aria-modal', 'true');
    
    const emailInput = screen.getByLabelText(/email address/i);
    expect(emailInput).toHaveAttribute('aria-required', 'true');
    expect(emailInput).toHaveAttribute('aria-describedby');
  });

  it('focuses email input when modal opens', () => {
    render(<InviteMemberModal {...defaultProps} />);
    
    const emailInput = screen.getByLabelText(/email address/i);
    expect(emailInput).toHaveFocus();
  });

  it('traps focus within modal', () => {
    render(<InviteMemberModal {...defaultProps} />);
    
    const emailInput = screen.getByLabelText(/email address/i);
    const roleSelect = screen.getByLabelText(/role/i);
    const sendButton = screen.getByText('Send Invitation');
    const cancelButton = screen.getByText('Cancel');
    
    // Tab through all focusable elements
    expect(emailInput).toHaveFocus();
    
    fireEvent.keyDown(emailInput, { key: 'Tab' });
    expect(roleSelect).toHaveFocus();
    
    fireEvent.keyDown(roleSelect, { key: 'Tab' });
    expect(sendButton).toHaveFocus();
    
    fireEvent.keyDown(sendButton, { key: 'Tab' });
    expect(cancelButton).toHaveFocus();
    
    // Tab from last element should go back to first
    fireEvent.keyDown(cancelButton, { key: 'Tab' });
    expect(emailInput).toHaveFocus();
  });

  it('resets form when modal is closed and reopened', () => {
    const { rerender } = render(<InviteMemberModal {...defaultProps} isOpen={true} />);
    
    const emailInput = screen.getByLabelText(/email address/i);
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    
    // Close modal
    rerender(<InviteMemberModal {...defaultProps} isOpen={false} />);
    
    // Reopen modal
    rerender(<InviteMemberModal {...defaultProps} isOpen={true} />);
    
    expect(screen.getByLabelText(/email address/i)).toHaveValue('');
  });

  it('shows invitation preview', () => {
    render(<InviteMemberModal {...defaultProps} />);
    
    const emailInput = screen.getByLabelText(/email address/i);
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    
    expect(screen.getByText(/will be invited to join/)).toBeInTheDocument();
    expect(screen.getByText('test@example.com')).toBeInTheDocument();
    expect(screen.getByText('Test Space')).toBeInTheDocument();
  });

  it('validates email against existing members', async () => {
    const propsWithMembers = {
      ...defaultProps,
      existingMemberEmails: ['existing@example.com'],
    };
    
    render(<InviteMemberModal {...propsWithMembers} />);
    
    const emailInput = screen.getByLabelText(/email address/i);
    fireEvent.change(emailInput, { target: { value: 'existing@example.com' } });
    fireEvent.click(screen.getByText('Send Invitation'));
    
    await waitFor(() => {
      expect(screen.getByText('This user is already a member of this space')).toBeInTheDocument();
    });
  });

  it('shows space visibility warning for public spaces', () => {
    const publicSpace = { ...mockSpace, isPublic: true };
    render(<InviteMemberModal {...defaultProps} space={publicSpace} />);
    
    expect(screen.getByText(/This is a public space/)).toBeInTheDocument();
  });

  it('handles multiple email invitations', async () => {
    render(<InviteMemberModal {...defaultProps} allowMultiple={true} />);
    
    const emailInput = screen.getByLabelText(/email addresses/i);
    fireEvent.change(emailInput, { 
      target: { value: 'user1@example.com, user2@example.com' } 
    });
    
    expect(screen.getByText('2 recipients')).toBeInTheDocument();
  });
});