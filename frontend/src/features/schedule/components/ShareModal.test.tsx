/**
 * Tests for ShareModal component
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ShareModal } from './ShareModal';
import * as scheduleApi from '../services/scheduleApi';

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Copy: () => <div data-testid="copy-icon">Copy</div>,
  Check: () => <div data-testid="check-icon">Check</div>,
  ExternalLink: () => <div data-testid="external-link-icon">External</div>,
  Link2: () => <div data-testid="link-icon">Link</div>,
  LinkOff: () => <div data-testid="link-off-icon">LinkOff</div>,
  X: () => <div data-testid="x-icon">X</div>,
}));

// Mock the schedule API
vi.mock('../services/scheduleApi', () => ({
  shareSchedule: vi.fn(),
  disableSharing: vi.fn(),
}));

// Mock clipboard API
Object.assign(navigator, {
  clipboard: {
    writeText: vi.fn(),
  },
});

describe('ShareModal', () => {
  const mockOnClose = vi.fn();
  const mockOnDisableShare = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should not render when isOpen is false', () => {
    const { container } = render(
      <ShareModal
        scheduleId="sched-123"
        isOpen={false}
        onClose={mockOnClose}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it('should render when isOpen is true', () => {
    render(
      <ShareModal
        scheduleId="sched-123"
        isOpen={true}
        onClose={mockOnClose}
      />
    );
    expect(screen.getByText('Share Schedule')).toBeInTheDocument();
  });

  it('should generate share link when button is clicked', async () => {
    const mockShare = {
      shareToken: 'token-123',
      scheduleId: 'sched-123',
      shareLink: 'https://example.com/shared/token-123',
      createdAt: '2024-01-01T00:00:00Z',
    };

    vi.mocked(scheduleApi.shareSchedule).mockResolvedValue(mockShare);

    render(
      <ShareModal
        scheduleId="sched-123"
        isOpen={true}
        onClose={mockOnClose}
      />
    );

    const generateButton = screen.getByText('Generate Share Link');
    fireEvent.click(generateButton);

    await waitFor(() => {
      expect(scheduleApi.shareSchedule).toHaveBeenCalledWith('sched-123');
    });

    await waitFor(() => {
      expect(screen.getByDisplayValue('https://example.com/shared/token-123')).toBeInTheDocument();
    });
  });

  it('should copy link to clipboard', async () => {
    const mockShare = {
      shareToken: 'token-123',
      scheduleId: 'sched-123',
      shareLink: 'https://example.com/shared/token-123',
      createdAt: '2024-01-01T00:00:00Z',
    };

    render(
      <ShareModal
        scheduleId="sched-123"
        existingShare={mockShare}
        isOpen={true}
        onClose={mockOnClose}
      />
    );

    const copyButton = screen.getByTitle('Copy to clipboard');
    fireEvent.click(copyButton);

    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
        'https://example.com/shared/token-123'
      );
    });

    expect(screen.getByText('Copied!')).toBeInTheDocument();
  });

  it('should display existing share link if provided', () => {
    const mockShare = {
      shareToken: 'token-123',
      scheduleId: 'sched-123',
      shareLink: 'https://example.com/shared/token-123',
      createdAt: '2024-01-01T00:00:00Z',
    };

    render(
      <ShareModal
        scheduleId="sched-123"
        existingShare={mockShare}
        isOpen={true}
        onClose={mockOnClose}
      />
    );

    expect(screen.getByDisplayValue('https://example.com/shared/token-123')).toBeInTheDocument();
  });

  it('should disable sharing when stop sharing is clicked', async () => {
    const mockShare = {
      shareToken: 'token-123',
      scheduleId: 'sched-123',
      shareLink: 'https://example.com/shared/token-123',
      createdAt: '2024-01-01T00:00:00Z',
    };

    vi.mocked(scheduleApi.disableSharing).mockResolvedValue(undefined);

    // Mock window.confirm
    window.confirm = vi.fn(() => true);

    render(
      <ShareModal
        scheduleId="sched-123"
        existingShare={mockShare}
        isOpen={true}
        onClose={mockOnClose}
        onDisableShare={mockOnDisableShare}
      />
    );

    const stopButton = screen.getByText('Stop Sharing');
    fireEvent.click(stopButton);

    await waitFor(() => {
      expect(scheduleApi.disableSharing).toHaveBeenCalledWith('sched-123');
    });

    await waitFor(() => {
      expect(mockOnDisableShare).toHaveBeenCalled();
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  it('should handle errors when generating share link', async () => {
    vi.mocked(scheduleApi.shareSchedule).mockRejectedValue(
      new Error('Failed to generate link')
    );

    render(
      <ShareModal
        scheduleId="sched-123"
        isOpen={true}
        onClose={mockOnClose}
      />
    );

    const generateButton = screen.getByText('Generate Share Link');
    fireEvent.click(generateButton);

    await waitFor(() => {
      expect(screen.getByText('Failed to generate link')).toBeInTheDocument();
    });
  });

  it('should close modal when X button is clicked', () => {
    render(
      <ShareModal
        scheduleId="sched-123"
        isOpen={true}
        onClose={mockOnClose}
      />
    );

    const closeButton = screen.getByLabelText('Close');
    fireEvent.click(closeButton);

    expect(mockOnClose).toHaveBeenCalled();
  });
});
