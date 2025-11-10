/**
 * Tests for schedule API service
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { apiService } from '../../../services/api';
import * as scheduleApi from './scheduleApi';
import type { Schedule, ScheduleShare, ScheduleVersion } from '../types/schedule.types';

// Mock the api service
vi.mock('../../../services/api', () => ({
  apiService: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('scheduleApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createSchedule', () => {
    it('should create a schedule', async () => {
      const mockSchedule: Schedule = {
        scheduleId: 'sched-123',
        spaceId: 'space-1',
        userId: 'user-1',
        weekStarting: '2024-01-01',
        scheduleData: {},
        isTemplate: false,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      };

      vi.mocked(apiService.post).mockResolvedValue(mockSchedule);

      const result = await scheduleApi.createSchedule({
        spaceId: 'space-1',
        weekStarting: '2024-01-01',
        scheduleData: {},
      });

      expect(apiService.post).toHaveBeenCalledWith('/api/schedules', {
        spaceId: 'space-1',
        weekStarting: '2024-01-01',
        scheduleData: {},
      });
      expect(result).toEqual(mockSchedule);
    });
  });

  describe('getSchedule', () => {
    it('should fetch a schedule by ID', async () => {
      const mockSchedule: Schedule = {
        scheduleId: 'sched-123',
        spaceId: 'space-1',
        userId: 'user-1',
        weekStarting: '2024-01-01',
        scheduleData: {},
        isTemplate: false,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      };

      vi.mocked(apiService.get).mockResolvedValue(mockSchedule);

      const result = await scheduleApi.getSchedule('sched-123');

      expect(apiService.get).toHaveBeenCalledWith('/api/schedules/sched-123');
      expect(result).toEqual(mockSchedule);
    });
  });

  describe('updateSchedule', () => {
    it('should update a schedule', async () => {
      const mockSchedule: Schedule = {
        scheduleId: 'sched-123',
        spaceId: 'space-1',
        userId: 'user-1',
        weekStarting: '2024-01-01',
        scheduleData: { monday: [] },
        isTemplate: false,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      };

      vi.mocked(apiService.put).mockResolvedValue(mockSchedule);

      const result = await scheduleApi.updateSchedule('sched-123', {
        scheduleData: { monday: [] },
      });

      expect(apiService.put).toHaveBeenCalledWith('/api/schedules/sched-123', {
        scheduleData: { monday: [] },
      });
      expect(result).toEqual(mockSchedule);
    });
  });

  describe('deleteSchedule', () => {
    it('should delete a schedule', async () => {
      vi.mocked(apiService.delete).mockResolvedValue(undefined);

      await scheduleApi.deleteSchedule('sched-123');

      expect(apiService.delete).toHaveBeenCalledWith('/api/schedules/sched-123');
    });
  });

  describe('getSchedulesByWeek', () => {
    it('should fetch schedules for a specific week', async () => {
      const mockResponse = {
        schedules: [],
        total: 0,
      };

      vi.mocked(apiService.get).mockResolvedValue(mockResponse);

      const result = await scheduleApi.getSchedulesByWeek('2024-01-01', 'space-1');

      expect(apiService.get).toHaveBeenCalledWith(
        '/api/schedules/week/2024-01-01?space_id=space-1'
      );
      expect(result).toEqual(mockResponse);
    });
  });

  describe('shareSchedule', () => {
    it('should create a share link', async () => {
      const mockShare: ScheduleShare = {
        shareToken: 'token-123',
        scheduleId: 'sched-123',
        shareLink: 'https://example.com/shared/token-123',
        createdAt: '2024-01-01T00:00:00Z',
      };

      vi.mocked(apiService.post).mockResolvedValue(mockShare);

      const result = await scheduleApi.shareSchedule('sched-123');

      expect(apiService.post).toHaveBeenCalledWith('/api/schedules/sched-123/share');
      expect(result).toEqual(mockShare);
    });
  });

  describe('getSharedSchedule', () => {
    it('should fetch a shared schedule by token', async () => {
      const mockSchedule: Schedule = {
        scheduleId: 'sched-123',
        spaceId: 'space-1',
        userId: 'user-1',
        weekStarting: '2024-01-01',
        scheduleData: {},
        isTemplate: false,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      };

      vi.mocked(apiService.get).mockResolvedValue(mockSchedule);

      const result = await scheduleApi.getSharedSchedule('token-123');

      expect(apiService.get).toHaveBeenCalledWith('/api/schedules/shared/token-123');
      expect(result).toEqual(mockSchedule);
    });
  });

  describe('disableSharing', () => {
    it('should disable sharing for a schedule', async () => {
      vi.mocked(apiService.delete).mockResolvedValue(undefined);

      await scheduleApi.disableSharing('sched-123');

      expect(apiService.delete).toHaveBeenCalledWith('/api/schedules/sched-123/share');
    });
  });

  describe('getVersions', () => {
    it('should fetch version history', async () => {
      const mockResponse = {
        versions: [
          {
            version: 1,
            scheduleData: {},
            modifiedAt: '2024-01-01T00:00:00Z',
            modifiedBy: 'user-1',
          } as ScheduleVersion,
        ],
        currentVersion: 1,
      };

      vi.mocked(apiService.get).mockResolvedValue(mockResponse);

      const result = await scheduleApi.getVersions('sched-123');

      expect(apiService.get).toHaveBeenCalledWith('/api/schedules/sched-123/versions');
      expect(result).toEqual(mockResponse);
    });
  });

  describe('getVersion', () => {
    it('should fetch a specific version', async () => {
      const mockVersion: ScheduleVersion = {
        version: 1,
        scheduleData: {},
        modifiedAt: '2024-01-01T00:00:00Z',
        modifiedBy: 'user-1',
      };

      vi.mocked(apiService.get).mockResolvedValue(mockVersion);

      const result = await scheduleApi.getVersion('sched-123', 1);

      expect(apiService.get).toHaveBeenCalledWith('/api/schedules/sched-123/versions/1');
      expect(result).toEqual(mockVersion);
    });
  });
});
