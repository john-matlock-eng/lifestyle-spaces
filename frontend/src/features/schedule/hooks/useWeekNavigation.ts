/**
 * Custom hook for week navigation logic
 */

import { useState, useCallback, useMemo } from 'react';
import type { WeekRange } from '../types/schedule.types';
import { getWeekStart, formatDateISO, getPreviousMonday } from '../utils/scheduleValidation';

interface UseWeekNavigationResult {
  currentWeek: WeekRange;
  weekStarting: string;
  goToNextWeek: () => void;
  goToPreviousWeek: () => void;
  goToCurrentWeek: () => void;
  goToWeek: (date: Date) => void;
  isCurrentWeek: boolean;
}

/**
 * Calculate week range from Monday date
 */
function calculateWeekRange(monday: Date): WeekRange {
  const start = new Date(monday);
  const end = new Date(monday);
  end.setDate(end.getDate() + 6); // Sunday

  return {
    start,
    end,
    weekStarting: formatDateISO(start),
  };
}

/**
 * Hook for managing week selection and navigation
 */
export function useWeekNavigation(initialDate?: Date): UseWeekNavigationResult {
  const [currentDate, setCurrentDate] = useState<Date>(() => {
    if (initialDate) {
      return getPreviousMonday(initialDate);
    }
    return getPreviousMonday(new Date());
  });

  const currentWeek = useMemo(() => calculateWeekRange(currentDate), [currentDate]);

  const weekStarting = useMemo(() => getWeekStart(currentDate), [currentDate]);

  const goToNextWeek = useCallback(() => {
    setCurrentDate((prev) => {
      const next = new Date(prev);
      next.setDate(next.getDate() + 7);
      return next;
    });
  }, []);

  const goToPreviousWeek = useCallback(() => {
    setCurrentDate((prev) => {
      const previous = new Date(prev);
      previous.setDate(previous.getDate() - 7);
      return previous;
    });
  }, []);

  const goToCurrentWeek = useCallback(() => {
    setCurrentDate(getPreviousMonday(new Date()));
  }, []);

  const goToWeek = useCallback((date: Date) => {
    setCurrentDate(getPreviousMonday(date));
  }, []);

  const isCurrentWeek = useMemo(() => {
    const today = new Date();
    const todayMonday = getPreviousMonday(today);
    return formatDateISO(todayMonday) === formatDateISO(currentDate);
  }, [currentDate]);

  return {
    currentWeek,
    weekStarting,
    goToNextWeek,
    goToPreviousWeek,
    goToCurrentWeek,
    goToWeek,
    isCurrentWeek,
  };
}
