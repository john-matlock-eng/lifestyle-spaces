/**
 * Tests for ScheduleHistory component
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ScheduleHistory } from './ScheduleHistory';
import * as scheduleApi from '../services/scheduleApi';
import type { ScheduleVersion } from '../types/schedule.types';

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Clock: () => <div data-testid="clock-icon">Clock</div>,
  RotateCcw: () => <div data-testid="rotate-icon">Rotate</div>,
  Eye: () => <div data-testid="eye-icon">Eye</div>,
  X: () => <div data-testid="x-icon">X</div>,
  ChevronRight: () => <div data-testid="chevron-icon">Chevron</div>,
}));

// Mock the schedule API
vi.mock('../services/scheduleApi', () => ({
  getVersions: vi.fn(),
  getVersion: vi.fn(),
}));

describe('ScheduleHistory', () => {
  const mockOnClose = vi.fn();
  const mockOnRestore = vi.fn();

  const mockVersions: ScheduleVersion[] = [
    {
      version: 1,
      scheduleData: { monday: [] },
      modifiedAt: '2024-01-01T10:00:00Z',
      modifiedBy: 'user-1@example.com',
      notes: 'Initial version',
    },
    {
      version: 2,
      scheduleData: { monday: [], tuesday: [] },
      modifiedAt: '2024-01-02T10:00:00Z',
      modifiedBy: 'user-1@example.com',
      notes: 'Added Tuesday',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should not render when isOpen is false', () => {
    const { container } = render(
      <ScheduleHistory
        scheduleId="sched-123"
        currentVersion={1}
        isOpen={false}
        onClose={mockOnClose}
        onRestore={mockOnRestore}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it('should load versions when opened', async () => {
    vi.mocked(scheduleApi.getVersions).mockResolvedValue({
      versions: mockVersions,
      currentVersion: 2,
    });

    render(
      <ScheduleHistory
        scheduleId="sched-123"
        currentVersion={2}
        isOpen={true}
        onClose={mockOnClose}
        onRestore={mockOnRestore}
      />
    );

    await waitFor(() => {
      expect(scheduleApi.getVersions).toHaveBeenCalledWith('sched-123');
    });

    expect(screen.getByText('Version 1')).toBeInTheDocument();
    expect(screen.getByText('Version 2')).toBeInTheDocument();
  });

  it('should display current version badge', async () => {
    vi.mocked(scheduleApi.getVersions).mockResolvedValue({
      versions: mockVersions,
      currentVersion: 2,
    });

    render(
      <ScheduleHistory
        scheduleId="sched-123"
        currentVersion={2}
        isOpen={true}
        onClose={mockOnClose}
        onRestore={mockOnRestore}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Current')).toBeInTheDocument();
    });
  });

  it('should load version details when clicked', async () => {
    vi.mocked(scheduleApi.getVersions).mockResolvedValue({
      versions: mockVersions,
      currentVersion: 2,
    });

    vi.mocked(scheduleApi.getVersion).mockResolvedValue(mockVersions[0]);

    render(
      <ScheduleHistory
        scheduleId="sched-123"
        currentVersion={2}
        isOpen={true}
        onClose={mockOnClose}
        onRestore={mockOnRestore}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Version 1')).toBeInTheDocument();
    });

    const versionButton = screen.getByText('Version 1');
    fireEvent.click(versionButton);

    await waitFor(() => {
      expect(scheduleApi.getVersion).toHaveBeenCalledWith('sched-123', 1);
    });

    await waitFor(() => {
      expect(screen.getByText('Initial version')).toBeInTheDocument();
    });
  });

  it('should restore version when restore button is clicked', async () => {
    vi.mocked(scheduleApi.getVersions).mockResolvedValue({
      versions: mockVersions,
      currentVersion: 2,
    });

    vi.mocked(scheduleApi.getVersion).mockResolvedValue(mockVersions[0]);

    // Mock window.confirm
    window.confirm = vi.fn(() => true);

    render(
      <ScheduleHistory
        scheduleId="sched-123"
        currentVersion={2}
        isOpen={true}
        onClose={mockOnClose}
        onRestore={mockOnRestore}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Version 1')).toBeInTheDocument();
    });

    const versionButton = screen.getByText('Version 1');
    fireEvent.click(versionButton);

    await waitFor(() => {
      expect(screen.getByText('Restore This Version')).toBeInTheDocument();
    });

    const restoreButton = screen.getByText('Restore This Version');
    fireEvent.click(restoreButton);

    expect(window.confirm).toHaveBeenCalled();
    expect(mockOnRestore).toHaveBeenCalledWith({
      scheduleData: mockVersions[0].scheduleData,
      notes: mockVersions[0].notes,
    });
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('should not show restore button for current version', async () => {
    vi.mocked(scheduleApi.getVersions).mockResolvedValue({
      versions: mockVersions,
      currentVersion: 2,
    });

    vi.mocked(scheduleApi.getVersion).mockResolvedValue(mockVersions[1]);

    render(
      <ScheduleHistory
        scheduleId="sched-123"
        currentVersion={2}
        isOpen={true}
        onClose={mockOnClose}
        onRestore={mockOnRestore}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Version 2')).toBeInTheDocument();
    });

    const versionButton = screen.getByText('Version 2');
    fireEvent.click(versionButton);

    await waitFor(() => {
      expect(screen.getByText('Added Tuesday')).toBeInTheDocument();
    });

    expect(screen.queryByText('Restore This Version')).not.toBeInTheDocument();
  });

  it('should handle errors when loading versions', async () => {
    vi.mocked(scheduleApi.getVersions).mockRejectedValue(
      new Error('Failed to load versions')
    );

    render(
      <ScheduleHistory
        scheduleId="sched-123"
        currentVersion={1}
        isOpen={true}
        onClose={mockOnClose}
        onRestore={mockOnRestore}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Failed to load versions')).toBeInTheDocument();
    });
  });

  it('should close modal when X button is clicked', async () => {
    vi.mocked(scheduleApi.getVersions).mockResolvedValue({
      versions: [],
      currentVersion: 1,
    });

    render(
      <ScheduleHistory
        scheduleId="sched-123"
        currentVersion={1}
        isOpen={true}
        onClose={mockOnClose}
        onRestore={mockOnRestore}
      />
    );

    const closeButton = screen.getByLabelText('Close');
    fireEvent.click(closeButton);

    expect(mockOnClose).toHaveBeenCalled();
  });
});
