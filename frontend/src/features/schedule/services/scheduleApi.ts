/**
 * Schedule API service
 */

import { apiService } from '../../../services/api';
import type {
  Schedule,
  ScheduleListResponse,
  CreateScheduleData,
  UpdateScheduleData,
  ScheduleShare,
  ScheduleVersion,
  ScheduleVersionResponse,
} from '../types/schedule.types';

/**
 * Create a new schedule
 */
export async function createSchedule(data: CreateScheduleData): Promise<Schedule> {
  return apiService.post<Schedule>('/api/schedules', data);
}

/**
 * Get a single schedule by ID
 */
export async function getSchedule(scheduleId: string): Promise<Schedule> {
  return apiService.get<Schedule>(`/api/schedules/${scheduleId}`);
}

/**
 * Get schedules for a space and week
 */
export async function getSchedules(
  spaceId: string,
  weekStarting: string
): Promise<ScheduleListResponse> {
  const params = new URLSearchParams({
    spaceId,
    weekStarting,
  });

  return apiService.get<ScheduleListResponse>(`/api/schedules?${params.toString()}`);
}

/**
 * Update an existing schedule
 */
export async function updateSchedule(
  scheduleId: string,
  data: UpdateScheduleData
): Promise<Schedule> {
  return apiService.put<Schedule>(`/api/schedules/${scheduleId}`, data);
}

/**
 * Delete a schedule
 */
export async function deleteSchedule(scheduleId: string): Promise<void> {
  return apiService.delete<void>(`/api/schedules/${scheduleId}`);
}

/**
 * Get schedule templates for a space
 */
export async function getScheduleTemplates(spaceId: string): Promise<ScheduleListResponse> {
  const params = new URLSearchParams({
    spaceId,
    isTemplate: 'true',
  });

  return apiService.get<ScheduleListResponse>(`/api/schedules?${params.toString()}`);
}

/**
 * Get schedules for a specific week (convenience endpoint)
 */
export async function getSchedulesByWeek(
  weekStarting: string,
  spaceId: string
): Promise<ScheduleListResponse> {
  const params = new URLSearchParams({ spaceId });
  return apiService.get<ScheduleListResponse>(
    `/api/schedules/week/${weekStarting}?${params.toString()}`
  );
}

/**
 * Create a share link for a schedule
 */
export async function shareSchedule(scheduleId: string): Promise<ScheduleShare> {
  return apiService.post<ScheduleShare>(`/api/schedules/${scheduleId}/share`);
}

/**
 * Get a shared schedule by its public token (no auth required)
 */
export async function getSharedSchedule(shareToken: string): Promise<Schedule> {
  return apiService.get<Schedule>(`/api/schedules/shared/${shareToken}`);
}

/**
 * Disable sharing for a schedule
 */
export async function disableSharing(scheduleId: string): Promise<void> {
  return apiService.delete<void>(`/api/schedules/${scheduleId}/share`);
}

/**
 * Get version history for a schedule
 */
export async function getVersions(scheduleId: string): Promise<ScheduleVersionResponse> {
  return apiService.get<ScheduleVersionResponse>(`/api/schedules/${scheduleId}/versions`);
}

/**
 * Get a specific version of a schedule
 */
export async function getVersion(scheduleId: string, version: number): Promise<ScheduleVersion> {
  return apiService.get<ScheduleVersion>(`/api/schedules/${scheduleId}/versions/${version}`);
}
