/**
 * Schedule validation utilities
 */

import type { TimeBlock, CreateScheduleData, ScheduleData } from '../types/schedule.types';
import { isValidTimeFormat } from './timeUtils';

export interface ValidationError {
  field: string;
  message: string;
}

/**
 * Validate time block data
 */
export function validateTimeBlock(block: Partial<TimeBlock>): ValidationError[] {
  const errors: ValidationError[] = [];

  // Required fields
  if (!block.startTime) {
    errors.push({ field: 'startTime', message: 'Start time is required' });
  } else if (!isValidTimeFormat(block.startTime)) {
    errors.push({ field: 'startTime', message: 'Invalid time format (use HH:MM)' });
  }

  if (!block.endTime) {
    errors.push({ field: 'endTime', message: 'End time is required' });
  } else if (!isValidTimeFormat(block.endTime)) {
    errors.push({ field: 'endTime', message: 'Invalid time format (use HH:MM)' });
  }

  // Validate end time is after start time (for same-day blocks)
  if (
    block.startTime &&
    block.endTime &&
    isValidTimeFormat(block.startTime) &&
    isValidTimeFormat(block.endTime)
  ) {
    // Allow overnight blocks, but they should be explicitly marked
    // For now, just ensure they're not the same
    if (block.startTime === block.endTime) {
      errors.push({ field: 'endTime', message: 'End time must be different from start time' });
    }
  }

  if (!block.activity || block.activity.trim() === '') {
    errors.push({ field: 'activity', message: 'Activity name is required' });
  } else if (block.activity.length > 100) {
    errors.push({ field: 'activity', message: 'Activity name must be 100 characters or less' });
  }

  if (!block.activityType) {
    errors.push({ field: 'activityType', message: 'Activity type is required' });
  }

  if (block.description && block.description.length > 500) {
    errors.push({
      field: 'description',
      message: 'Description must be 500 characters or less',
    });
  }

  if (block.color && !isValidHexColor(block.color)) {
    errors.push({ field: 'color', message: 'Invalid color format (use hex color)' });
  }

  return errors;
}

/**
 * Validate hex color format
 */
export function isValidHexColor(color: string): boolean {
  return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color);
}

/**
 * Validate week starting date (must be Monday)
 */
export function validateWeekStarting(dateString: string): ValidationError | null {
  try {
    const date = new Date(dateString);

    // Check if valid date
    if (isNaN(date.getTime())) {
      return { field: 'weekStarting', message: 'Invalid date format' };
    }

    // Check if Monday (0 = Sunday, 1 = Monday)
    if (date.getDay() !== 1) {
      return { field: 'weekStarting', message: 'Week must start on Monday' };
    }

    return null;
  } catch {
    return { field: 'weekStarting', message: 'Invalid date' };
  }
}

/**
 * Validate schedule data structure
 */
export function validateScheduleData(scheduleData: ScheduleData): ValidationError[] {
  const errors: ValidationError[] = [];
  const validDays = [
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday',
    'sunday',
  ];

  for (const [day, blocks] of Object.entries(scheduleData)) {
    if (!validDays.includes(day.toLowerCase())) {
      errors.push({ field: 'scheduleData', message: `Invalid day: ${day}` });
      continue;
    }

    if (!Array.isArray(blocks)) {
      errors.push({ field: 'scheduleData', message: `Blocks for ${day} must be an array` });
      continue;
    }

    blocks.forEach((block, index) => {
      const blockErrors = validateTimeBlock(block);
      blockErrors.forEach((error) => {
        errors.push({
          field: `scheduleData.${day}[${index}].${error.field}`,
          message: error.message,
        });
      });
    });
  }

  return errors;
}

/**
 * Validate create schedule request
 */
export function validateCreateSchedule(data: CreateScheduleData): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!data.spaceId || data.spaceId.trim() === '') {
    errors.push({ field: 'spaceId', message: 'Space ID is required' });
  }

  const weekError = validateWeekStarting(data.weekStarting);
  if (weekError) {
    errors.push(weekError);
  }

  const scheduleErrors = validateScheduleData(data.scheduleData);
  errors.push(...scheduleErrors);

  if (data.notes && data.notes.length > 1000) {
    errors.push({ field: 'notes', message: 'Notes must be 1000 characters or less' });
  }

  if (data.isTemplate && (!data.templateName || data.templateName.trim() === '')) {
    errors.push({ field: 'templateName', message: 'Template name is required for templates' });
  }

  if (data.templateName && data.templateName.length > 100) {
    errors.push({ field: 'templateName', message: 'Template name must be 100 characters or less' });
  }

  return errors;
}

/**
 * Get next Monday from a given date
 */
export function getNextMonday(date: Date = new Date()): Date {
  const result = new Date(date);
  const day = result.getDay();

  // If already Monday, return current date
  if (day === 1) {
    return result;
  }

  // Calculate days until next Monday
  const daysUntilMonday = day === 0 ? 1 : 8 - day;
  result.setDate(result.getDate() + daysUntilMonday);

  return result;
}

/**
 * Get previous Monday from a given date
 */
export function getPreviousMonday(date: Date = new Date()): Date {
  const result = new Date(date);
  const day = result.getDay();

  // If already Monday, return current date
  if (day === 1) {
    return result;
  }

  // Calculate days back to Monday
  const daysBackToMonday = day === 0 ? 6 : day - 1;
  result.setDate(result.getDate() - daysBackToMonday);

  return result;
}

/**
 * Get week start (Monday) for a given date
 */
export function getWeekStart(date: Date = new Date()): string {
  const monday = getPreviousMonday(date);
  return formatDateISO(monday);
}

/**
 * Format date to ISO string (YYYY-MM-DD) in local timezone
 */
export function formatDateISO(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Check if two dates are the same day
 */
export function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}
