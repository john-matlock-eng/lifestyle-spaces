/**
 * Tests for time utility functions
 */

import { describe, it, expect } from 'vitest';
import {
  timeToMinutes,
  minutesToTime,
  parseTime,
  isValidTimeFormat,
  compareTime,
  isTimeAfter,
  roundTimeToInterval,
  calculateDuration,
  formatDuration,
  addMinutes,
  formatTimeDisplay,
  formatTimeRange,
} from './timeUtils';

describe('timeUtils', () => {
  describe('timeToMinutes', () => {
    it('should convert time string to minutes', () => {
      expect(timeToMinutes('00:00')).toBe(0);
      expect(timeToMinutes('01:00')).toBe(60);
      expect(timeToMinutes('12:30')).toBe(750);
      expect(timeToMinutes('23:59')).toBe(1439);
    });
  });

  describe('minutesToTime', () => {
    it('should convert minutes to time string', () => {
      expect(minutesToTime(0)).toBe('00:00');
      expect(minutesToTime(60)).toBe('01:00');
      expect(minutesToTime(750)).toBe('12:30');
      expect(minutesToTime(1439)).toBe('23:59');
    });
  });

  describe('parseTime', () => {
    it('should parse valid time strings', () => {
      expect(parseTime('09:00')).toEqual({ hours: 9, minutes: 0 });
      expect(parseTime('14:30')).toEqual({ hours: 14, minutes: 30 });
      expect(parseTime('00:00')).toEqual({ hours: 0, minutes: 0 });
      expect(parseTime('23:59')).toEqual({ hours: 23, minutes: 59 });
    });

    it('should return null for invalid time strings', () => {
      expect(parseTime('25:00')).toBeNull();
      expect(parseTime('12:60')).toBeNull();
      expect(parseTime('abc')).toBeNull();
      expect(parseTime('12')).toBeNull();
    });
  });

  describe('isValidTimeFormat', () => {
    it('should validate time format', () => {
      expect(isValidTimeFormat('09:00')).toBe(true);
      expect(isValidTimeFormat('23:59')).toBe(true);
      expect(isValidTimeFormat('00:00')).toBe(true);
      expect(isValidTimeFormat('25:00')).toBe(false);
      expect(isValidTimeFormat('12:60')).toBe(false);
      expect(isValidTimeFormat('abc')).toBe(false);
    });
  });

  describe('compareTime', () => {
    it('should compare times correctly', () => {
      expect(compareTime('09:00', '10:00')).toBe(-1);
      expect(compareTime('10:00', '09:00')).toBe(1);
      expect(compareTime('09:00', '09:00')).toBe(0);
    });
  });

  describe('isTimeAfter', () => {
    it('should check if time2 is after time1', () => {
      expect(isTimeAfter('09:00', '10:00')).toBe(true);
      expect(isTimeAfter('10:00', '09:00')).toBe(false);
      expect(isTimeAfter('09:00', '09:00')).toBe(false);
    });
  });

  describe('roundTimeToInterval', () => {
    it('should round time to 15-minute intervals', () => {
      expect(roundTimeToInterval('09:07', 15)).toBe('09:00');
      expect(roundTimeToInterval('09:08', 15)).toBe('09:15');
      expect(roundTimeToInterval('09:22', 15)).toBe('09:15');
      expect(roundTimeToInterval('09:23', 15)).toBe('09:30');
    });

    it('should round to custom intervals', () => {
      expect(roundTimeToInterval('09:20', 30)).toBe('09:30');
      expect(roundTimeToInterval('09:44', 30)).toBe('09:30');
      expect(roundTimeToInterval('09:45', 30)).toBe('10:00');
    });
  });

  describe('calculateDuration', () => {
    it('should calculate duration in minutes', () => {
      expect(calculateDuration('09:00', '10:00')).toBe(60);
      expect(calculateDuration('09:30', '11:00')).toBe(90);
      expect(calculateDuration('00:00', '23:59')).toBe(1439);
    });

    it('should handle overnight blocks', () => {
      expect(calculateDuration('23:00', '01:00')).toBe(120);
      expect(calculateDuration('22:00', '02:00')).toBe(240);
    });
  });

  describe('formatDuration', () => {
    it('should format durations correctly', () => {
      expect(formatDuration(30)).toBe('30m');
      expect(formatDuration(60)).toBe('1h');
      expect(formatDuration(90)).toBe('1h 30m');
      expect(formatDuration(150)).toBe('2h 30m');
    });
  });

  describe('addMinutes', () => {
    it('should add minutes to time', () => {
      expect(addMinutes('09:00', 30)).toBe('09:30');
      expect(addMinutes('09:30', 60)).toBe('10:30');
      expect(addMinutes('23:30', 60)).toBe('00:30');
    });

    it('should handle negative minutes', () => {
      expect(addMinutes('09:30', -30)).toBe('09:00');
      expect(addMinutes('00:30', -60)).toBe('23:30');
    });
  });

  describe('formatTimeDisplay', () => {
    it('should format time for display (12-hour)', () => {
      expect(formatTimeDisplay('00:00')).toBe('12:00 AM');
      expect(formatTimeDisplay('09:00')).toBe('9:00 AM');
      expect(formatTimeDisplay('12:00')).toBe('12:00 PM');
      expect(formatTimeDisplay('15:30')).toBe('3:30 PM');
      expect(formatTimeDisplay('23:59')).toBe('11:59 PM');
    });
  });

  describe('formatTimeRange', () => {
    it('should format time ranges', () => {
      expect(formatTimeRange('09:00', '10:00')).toBe('9:00 AM - 10:00 AM');
      expect(formatTimeRange('14:00', '15:30')).toBe('2:00 PM - 3:30 PM');
      expect(formatTimeRange('23:00', '01:00')).toBe('11:00 PM - 1:00 AM');
    });
  });
});
