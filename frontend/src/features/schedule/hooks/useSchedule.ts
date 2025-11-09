/**
 * Custom hook for schedule CRUD operations
 */

import { useState, useCallback } from 'react';
import type {
  Schedule,
  CreateScheduleData,
  UpdateScheduleData,
} from '../types/schedule.types';
import * as scheduleApi from '../services/scheduleApi';

interface UseScheduleResult {
  schedule: Schedule | null;
  schedules: Schedule[];
  isLoading: boolean;
  error: string | null;
  createSchedule: (data: CreateScheduleData) => Promise<Schedule>;
  getSchedule: (scheduleId: string) => Promise<Schedule>;
  getSchedules: (spaceId: string, weekStarting: string) => Promise<Schedule[]>;
  updateSchedule: (scheduleId: string, data: UpdateScheduleData) => Promise<Schedule>;
  deleteSchedule: (scheduleId: string) => Promise<void>;
  clearError: () => void;
}

/**
 * Hook for managing schedules with CRUD operations
 */
export function useSchedule(): UseScheduleResult {
  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const createSchedule = useCallback(async (data: CreateScheduleData): Promise<Schedule> => {
    setIsLoading(true);
    setError(null);

    try {
      const newSchedule = await scheduleApi.createSchedule(data);
      setSchedule(newSchedule);
      setSchedules((prev) => [...prev, newSchedule]);
      return newSchedule;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create schedule';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getSchedule = useCallback(async (scheduleId: string): Promise<Schedule> => {
    setIsLoading(true);
    setError(null);

    try {
      const fetchedSchedule = await scheduleApi.getSchedule(scheduleId);
      setSchedule(fetchedSchedule);
      return fetchedSchedule;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch schedule';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getSchedules = useCallback(
    async (spaceId: string, weekStarting: string): Promise<Schedule[]> => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await scheduleApi.getSchedules(spaceId, weekStarting);
        setSchedules(response.schedules);
        return response.schedules;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to fetch schedules';
        setError(errorMessage);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const updateSchedule = useCallback(
    async (scheduleId: string, data: UpdateScheduleData): Promise<Schedule> => {
      setIsLoading(true);
      setError(null);

      try {
        const updatedSchedule = await scheduleApi.updateSchedule(scheduleId, data);
        setSchedule(updatedSchedule);
        setSchedules((prev) =>
          prev.map((s) => (s.scheduleId === scheduleId ? updatedSchedule : s))
        );
        return updatedSchedule;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to update schedule';
        setError(errorMessage);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const deleteSchedule = useCallback(async (scheduleId: string): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      await scheduleApi.deleteSchedule(scheduleId);
      setSchedules((prev) => prev.filter((s) => s.scheduleId !== scheduleId));
      if (schedule?.scheduleId === scheduleId) {
        setSchedule(null);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete schedule';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [schedule]);

  return {
    schedule,
    schedules,
    isLoading,
    error,
    createSchedule,
    getSchedule,
    getSchedules,
    updateSchedule,
    deleteSchedule,
    clearError,
  };
}
