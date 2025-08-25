import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { CreateSpaceModal } from './CreateSpaceModal';

// Mock the space store hook
const mockCreateSpace = vi.fn();
const mockClearError = vi.fn();

vi.mock('../../stores/spaceStore', async () => {
  const actual = await vi.importActual('../../stores/spaceStore');
  return {
    ...actual,
    useSpace: () => ({
      createSpace: mockCreateSpace,
      clearError: mockClearError,
      isLoading: false,
      error: null,
    }),
  };
});

describe('CreateSpaceModal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    onSpaceCreated: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders modal when open', () => {
    render(<CreateSpaceModal {...defaultProps} />);
    
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Create New Space')).toBeInTheDocument();
    expect(screen.getByLabelText(/space name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/public space/i)).toBeInTheDocument();
  });

  it('does not render modal when closed', () => {
    render(<CreateSpaceModal {...defaultProps} isOpen={false} />);
    
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('closes modal when cancel button is clicked', () => {
    const onClose = vi.fn();
    render(<CreateSpaceModal {...defaultProps} onClose={onClose} />);
    
    fireEvent.click(screen.getByText('Cancel'));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('closes modal when clicking outside', () => {
    const onClose = vi.fn();
    render(<CreateSpaceModal {...defaultProps} onClose={onClose} />);
    
    fireEvent.click(screen.getByTestId('modal-overlay'));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('closes modal when pressing escape key', () => {
    const onClose = vi.fn();
    render(<CreateSpaceModal {...defaultProps} onClose={onClose} />);
    
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('validates required fields', async () => {
    render(<CreateSpaceModal {...defaultProps} />);
    
    fireEvent.click(screen.getByText('Create Space'));
    
    await waitFor(() => {
      expect(screen.getByText('Space name is required')).toBeInTheDocument();
    });
  });

  it('validates space name length', async () => {
    render(<CreateSpaceModal {...defaultProps} />);
    
    const nameInput = screen.getByLabelText(/space name/i);
    fireEvent.change(nameInput, { target: { value: 'a'.repeat(101) } });
    fireEvent.click(screen.getByText('Create Space'));
    
    await waitFor(() => {
      expect(screen.getByText('Space name must be 100 characters or less')).toBeInTheDocument();
    });
  });

  it('validates description length', async () => {
    render(<CreateSpaceModal {...defaultProps} />);
    
    const nameInput = screen.getByLabelText(/space name/i);
    const descriptionInput = screen.getByLabelText(/description/i);
    
    fireEvent.change(nameInput, { target: { value: 'Valid Name' } });
    fireEvent.change(descriptionInput, { target: { value: 'a'.repeat(501) } });
    fireEvent.click(screen.getByText('Create Space'));
    
    await waitFor(() => {
      expect(screen.getByText('Description must be 500 characters or less')).toBeInTheDocument();
    });
  });

  it('creates space with valid data', async () => {
    const mockSpace = {
      spaceId: 'space-1',
      name: 'Test Space',
      description: 'Test description',
      ownerId: 'user-1',
      createdAt: '2023-01-01T00:00:00Z',
      updatedAt: '2023-01-01T00:00:00Z',
      memberCount: 1,
      isPublic: false,
    };

    mockCreateSpace.mockResolvedValueOnce(mockSpace);

    const onSpaceCreated = vi.fn();
    const onClose = vi.fn();
    
    render(
      <CreateSpaceModal 
        {...defaultProps} 
        onSpaceCreated={onSpaceCreated}
        onClose={onClose}
      />
    );
    
    const nameInput = screen.getByLabelText(/space name/i);
    const descriptionInput = screen.getByLabelText(/description/i);
    const publicCheckbox = screen.getByLabelText(/public space/i);
    
    fireEvent.change(nameInput, { target: { value: 'Test Space' } });
    fireEvent.change(descriptionInput, { target: { value: 'Test description' } });
    fireEvent.click(publicCheckbox);
    
    fireEvent.click(screen.getByText('Create Space'));
    
    await waitFor(() => {
      expect(mockCreateSpace).toHaveBeenCalledWith({
        name: 'Test Space',
        description: 'Test description',
        isPublic: true,
      });
      expect(onSpaceCreated).toHaveBeenCalledWith(mockSpace);
      expect(onClose).toHaveBeenCalledOnce();
    });
  });

  it('handles create space error', async () => {
    mockCreateSpace.mockRejectedValueOnce(new Error('Failed to create space'));

    render(<CreateSpaceModal {...defaultProps} />);
    
    const nameInput = screen.getByLabelText(/space name/i);
    fireEvent.change(nameInput, { target: { value: 'Test Space' } });
    fireEvent.click(screen.getByText('Create Space'));
    
    await waitFor(() => {
      expect(screen.getByText('Failed to create space')).toBeInTheDocument();
    });
  });

  it('disables form during submission', async () => {
    // Mock loading state
    vi.mocked(mockCreateSpace).mockImplementationOnce(
      () => new Promise(resolve => setTimeout(resolve, 100))
    );

    const { rerender } = render(<CreateSpaceModal {...defaultProps} />);
    
    // Re-render with loading state
    vi.doMock('../../stores/spaceStore', () => ({
      useSpace: () => ({
        createSpace: mockCreateSpace,
        clearError: mockClearError,
        isLoading: true,
        error: null,
      }),
    }));

    rerender(<CreateSpaceModal {...defaultProps} />);
    
    expect(screen.getByText('Creating...')).toBeInTheDocument();
    expect(screen.getByLabelText(/space name/i)).toBeDisabled();
    expect(screen.getByLabelText(/description/i)).toBeDisabled();
    expect(screen.getByLabelText(/public space/i)).toBeDisabled();
  });

  it('displays error message from store', () => {
    vi.doMock('../../stores/spaceStore', () => ({
      useSpace: () => ({
        createSpace: mockCreateSpace,
        clearError: mockClearError,
        isLoading: false,
        error: 'Network error',
      }),
    }));

    const { rerender } = render(<CreateSpaceModal {...defaultProps} />);
    rerender(<CreateSpaceModal {...defaultProps} />);
    
    expect(screen.getByText('Network error')).toBeInTheDocument();
  });

  it('clears error when modal opens', () => {
    render(<CreateSpaceModal {...defaultProps} isOpen={true} />);
    expect(mockClearError).toHaveBeenCalledOnce();
  });

  it('has proper accessibility attributes', () => {
    render(<CreateSpaceModal {...defaultProps} />);
    
    const modal = screen.getByRole('dialog');
    expect(modal).toHaveAttribute('aria-labelledby');
    expect(modal).toHaveAttribute('aria-modal', 'true');
    
    const nameInput = screen.getByLabelText(/space name/i);
    expect(nameInput).toHaveAttribute('aria-required', 'true');
    expect(nameInput).toHaveAttribute('aria-describedby');
  });

  it('focuses first input when modal opens', () => {
    render(<CreateSpaceModal {...defaultProps} />);
    
    const nameInput = screen.getByLabelText(/space name/i);
    expect(nameInput).toHaveFocus();
  });

  it('traps focus within modal', () => {
    render(<CreateSpaceModal {...defaultProps} />);
    
    const nameInput = screen.getByLabelText(/space name/i);
    const cancelButton = screen.getByText('Cancel');
    const createButton = screen.getByText('Create Space');
    
    // Tab through all focusable elements
    expect(nameInput).toHaveFocus();
    
    fireEvent.keyDown(nameInput, { key: 'Tab' });
    expect(screen.getByLabelText(/description/i)).toHaveFocus();
    
    fireEvent.keyDown(screen.getByLabelText(/description/i), { key: 'Tab' });
    expect(screen.getByLabelText(/public space/i)).toHaveFocus();
    
    fireEvent.keyDown(screen.getByLabelText(/public space/i), { key: 'Tab' });
    expect(createButton).toHaveFocus();
    
    fireEvent.keyDown(createButton, { key: 'Tab' });
    expect(cancelButton).toHaveFocus();
    
    // Tab from last element should go back to first
    fireEvent.keyDown(cancelButton, { key: 'Tab' });
    expect(nameInput).toHaveFocus();
  });

  it('resets form when modal is closed and reopened', () => {
    const { rerender } = render(<CreateSpaceModal {...defaultProps} isOpen={true} />);
    
    const nameInput = screen.getByLabelText(/space name/i);
    fireEvent.change(nameInput, { target: { value: 'Test Space' } });
    
    // Close modal
    rerender(<CreateSpaceModal {...defaultProps} isOpen={false} />);
    
    // Reopen modal
    rerender(<CreateSpaceModal {...defaultProps} isOpen={true} />);
    
    expect(screen.getByLabelText(/space name/i)).toHaveValue('');
  });
});