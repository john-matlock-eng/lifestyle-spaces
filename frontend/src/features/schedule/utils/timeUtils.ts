/**
 * Time utility functions for schedule management
 */

/**
 * Convert time string (HH:MM) to minutes since midnight
 */
export function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

/**
 * Convert minutes since midnight to time string (HH:MM)
 */
export function minutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}

/**
 * Parse time string and validate format (HH:MM)
 */
export function parseTime(time: string): { hours: number; minutes: number } | null {
  const match = time.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;

  const hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);

  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    return null;
  }

  return { hours, minutes };
}

/**
 * Validate time string format
 */
export function isValidTimeFormat(time: string): boolean {
  return parseTime(time) !== null;
}

/**
 * Compare two time strings
 * Returns: -1 if time1 < time2, 0 if equal, 1 if time1 > time2
 */
export function compareTime(time1: string, time2: string): number {
  const minutes1 = timeToMinutes(time1);
  const minutes2 = timeToMinutes(time2);

  if (minutes1 < minutes2) return -1;
  if (minutes1 > minutes2) return 1;
  return 0;
}

/**
 * Check if time2 is after time1
 */
export function isTimeAfter(time1: string, time2: string): boolean {
  return compareTime(time2, time1) > 0;
}

/**
 * Round time to nearest interval (in minutes)
 */
export function roundTimeToInterval(time: string, intervalMinutes: number = 15): string {
  const totalMinutes = timeToMinutes(time);
  const rounded = Math.round(totalMinutes / intervalMinutes) * intervalMinutes;
  return minutesToTime(Math.min(1439, Math.max(0, rounded))); // Clamp to valid day range
}

/**
 * Calculate duration between two times in minutes
 */
export function calculateDuration(startTime: string, endTime: string): number {
  const start = timeToMinutes(startTime);
  const end = timeToMinutes(endTime);

  // Handle overnight blocks
  if (end < start) {
    return (1440 - start) + end; // 1440 = 24 hours in minutes
  }

  return end - start;
}

/**
 * Format duration in minutes to human-readable string
 */
export function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  if (hours === 0) {
    return `${mins}m`;
  }

  if (mins === 0) {
    return `${hours}h`;
  }

  return `${hours}h ${mins}m`;
}

/**
 * Get time at percentage of day (0-100)
 */
export function getTimeAtPercentage(percentage: number): string {
  const totalMinutes = Math.floor((percentage / 100) * 1440);
  return minutesToTime(totalMinutes);
}

/**
 * Get percentage of day for given time (0-100)
 */
export function getPercentageOfDay(time: string): number {
  const minutes = timeToMinutes(time);
  return (minutes / 1440) * 100;
}

/**
 * Add minutes to a time string
 */
export function addMinutes(time: string, minutesToAdd: number): string {
  const totalMinutes = timeToMinutes(time) + minutesToAdd;
  // Wrap around midnight if necessary
  const wrapped = ((totalMinutes % 1440) + 1440) % 1440;
  return minutesToTime(wrapped);
}

/**
 * Get current time as HH:MM string
 */
export function getCurrentTime(): string {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
}

/**
 * Format time for display (12-hour format with AM/PM)
 */
export function formatTimeDisplay(time: string): string {
  const parsed = parseTime(time);
  if (!parsed) return time;

  const { hours, minutes } = parsed;
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;

  return `${displayHours}:${String(minutes).padStart(2, '0')} ${period}`;
}

/**
 * Format time range for display
 */
export function formatTimeRange(startTime: string, endTime: string): string {
  return `${formatTimeDisplay(startTime)} - ${formatTimeDisplay(endTime)}`;
}
