/**
 * Tests for PublicScheduleView component
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { PublicScheduleView } from './PublicScheduleView';
import * as scheduleApi from '../services/scheduleApi';
import type { Schedule } from '../types/schedule.types';

// Mock react-router-dom
const mockNavigate = vi.fn();
const mockParams = { shareToken: 'token-123' };

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useParams: () => mockParams,
    useNavigate: () => mockNavigate,
  };
});

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Calendar: () => <div data-testid="calendar-icon">Calendar</div>,
  ExternalLink: () => <div data-testid="external-link-icon">External</div>,
  AlertCircle: () => <div data-testid="alert-icon">Alert</div>,
}));

// Mock the schedule API
vi.mock('../services/scheduleApi', () => ({
  getSharedSchedule: vi.fn(),
}));

// Mock child components
vi.mock('./WeekView', () => ({
  WeekView: () => <div data-testid="week-view">Week View</div>,
}));

vi.mock('./ScheduleLoadingSkeleton', () => ({
  ScheduleLoadingSkeleton: () => <div data-testid="loading">Loading...</div>,
}));

describe('PublicScheduleView', () => {
  const mockSchedule: Schedule = {
    scheduleId: 'sched-123',
    spaceId: 'space-1',
    userId: 'user-1',
    weekStarting: '2024-01-01',
    scheduleData: {
      monday: [
        {
          id: '1',
          startTime: '09:00',
          endTime: '10:00',
          activity: 'Work',
          activityType: 'work',
        },
      ],
    },
    isTemplate: false,
    templateName: 'My Schedule',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    notes: 'This is a test schedule',
    sharingSettings: {
      isPublic: true,
      shareToken: 'token-123',
      viewCount: 42,
      createdAt: '2024-01-01T00:00:00Z',
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockParams.shareToken = 'token-123';
  });

  it('should show loading state initially', () => {
    vi.mocked(scheduleApi.getSharedSchedule).mockImplementation(
      () => new Promise(() => {}) // Never resolves
    );

    render(<PublicScheduleView />);

    expect(screen.getByTestId('loading')).toBeInTheDocument();
  });

  it('should load and display shared schedule', async () => {
    vi.mocked(scheduleApi.getSharedSchedule).mockResolvedValue(mockSchedule);

    render(<PublicScheduleView />);

    await waitFor(() => {
      expect(scheduleApi.getSharedSchedule).toHaveBeenCalledWith('token-123');
    });

    expect(screen.getByText('My Schedule')).toBeInTheDocument();
    expect(screen.getByText(/Week of/i)).toBeInTheDocument();
    expect(screen.getByText('This is a test schedule')).toBeInTheDocument();
    expect(screen.getByTestId('week-view')).toBeInTheDocument();
  });

  it('should display view count', async () => {
    vi.mocked(scheduleApi.getSharedSchedule).mockResolvedValue(mockSchedule);

    render(<PublicScheduleView />);

    await waitFor(() => {
      expect(screen.getByText('42')).toBeInTheDocument();
    });
  });

  it('should handle schedule not found error', async () => {
    mockParams.shareToken = 'invalid-token';
    vi.mocked(scheduleApi.getSharedSchedule).mockRejectedValue(
      new Error('Schedule not found')
    );

    render(<PublicScheduleView />);

    await waitFor(() => {
      expect(screen.getByText('Schedule Not Found')).toBeInTheDocument();
    });

    expect(
      screen.getByText(/Schedule not found or link has expired/i)
    ).toBeInTheDocument();
  });

  it('should display CTA for creating own schedule', async () => {
    vi.mocked(scheduleApi.getSharedSchedule).mockResolvedValue(mockSchedule);

    render(<PublicScheduleView />);

    await waitFor(() => {
      expect(screen.getByText('Want to create your own schedule?')).toBeInTheDocument();
    });

    expect(screen.getAllByText(/Create Your Own/i).length).toBeGreaterThan(0);
  });

  it('should display read-only banner', async () => {
    vi.mocked(scheduleApi.getSharedSchedule).mockResolvedValue(mockSchedule);

    render(<PublicScheduleView />);

    await waitFor(() => {
      expect(screen.getByText('Viewing a shared schedule')).toBeInTheDocument();
    });

    expect(
      screen.getByText(/This is a read-only view/i)
    ).toBeInTheDocument();
  });

  it('should not display notes section if no notes', async () => {
    const scheduleWithoutNotes = { ...mockSchedule, notes: undefined };
    vi.mocked(scheduleApi.getSharedSchedule).mockResolvedValue(scheduleWithoutNotes);

    render(<PublicScheduleView />);

    await waitFor(() => {
      expect(screen.getByTestId('week-view')).toBeInTheDocument();
    });

    expect(screen.queryByText('Notes')).not.toBeInTheDocument();
  });

  it('should use template name or fallback to default', async () => {
    const scheduleWithoutName = { ...mockSchedule, templateName: undefined };
    vi.mocked(scheduleApi.getSharedSchedule).mockResolvedValue(scheduleWithoutName);

    render(<PublicScheduleView />);

    await waitFor(() => {
      expect(screen.getByText('Shared Schedule')).toBeInTheDocument();
    });
  });
});
