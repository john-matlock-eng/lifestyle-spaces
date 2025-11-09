/**
 * Tests for useWeekNavigation hook
 */

import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useWeekNavigation } from './useWeekNavigation';

describe('useWeekNavigation', () => {
  it('should initialize with current week by default', () => {
    const { result } = renderHook(() => useWeekNavigation());

    expect(result.current.weekStarting).toBeTruthy();
    expect(result.current.currentWeek.start).toBeInstanceOf(Date);
    expect(result.current.currentWeek.end).toBeInstanceOf(Date);
  });

  it('should initialize with provided date', () => {
    const testDate = new Date(2025, 0, 6); // Jan 6, 2025 - A Monday
    const { result } = renderHook(() => useWeekNavigation(testDate));

    expect(result.current.weekStarting).toBe('2025-01-06');
  });

  it('should navigate to next week', () => {
    const testDate = new Date(2025, 0, 6); // Jan 6, 2025
    const { result } = renderHook(() => useWeekNavigation(testDate));

    const initialWeek = result.current.weekStarting;

    act(() => {
      result.current.goToNextWeek();
    });

    expect(result.current.weekStarting).not.toBe(initialWeek);
    expect(result.current.weekStarting).toBe('2025-01-13');
  });

  it('should navigate to previous week', () => {
    const testDate = new Date(2025, 0, 13); // Jan 13, 2025
    const { result } = renderHook(() => useWeekNavigation(testDate));

    act(() => {
      result.current.goToPreviousWeek();
    });

    expect(result.current.weekStarting).toBe('2025-01-06');
  });

  it('should go to current week', () => {
    const pastDate = new Date('2024-01-01');
    const { result } = renderHook(() => useWeekNavigation(pastDate));

    act(() => {
      result.current.goToCurrentWeek();
    });

    // Should be current week (test might vary based on current date)
    expect(result.current.isCurrentWeek).toBe(true);
  });

  it('should go to specific week', () => {
    const { result } = renderHook(() => useWeekNavigation());

    const targetDate = new Date(2025, 0, 27); // Jan 27, 2025 - A Monday

    act(() => {
      result.current.goToWeek(targetDate);
    });

    expect(result.current.weekStarting).toBe('2025-01-27');
  });

  it('should calculate week range correctly', () => {
    const testDate = new Date(2025, 0, 6); // Jan 6, 2025 - Monday
    const { result } = renderHook(() => useWeekNavigation(testDate));

    const { start, end } = result.current.currentWeek;

    expect(start.getDay()).toBe(1); // Monday
    expect(end.getDay()).toBe(0); // Sunday

    // Check date difference is 6 days
    const diffDays = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
    expect(diffDays).toBe(6);
  });

  it('should handle non-Monday dates by finding previous Monday', () => {
    const wednesday = new Date(2025, 0, 8); // Jan 8, 2025 - A Wednesday
    const { result } = renderHook(() => useWeekNavigation(wednesday));

    // Should find Monday of that week (2025-01-06)
    expect(result.current.weekStarting).toBe('2025-01-06');
  });
});
