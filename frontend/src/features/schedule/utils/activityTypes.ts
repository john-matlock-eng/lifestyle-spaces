/**
 * Activity type metadata and utilities
 */

import type { ActivityType, ActivityTypeInfo } from '../types/schedule.types';

/**
 * Metadata for each activity type
 */
export const ACTIVITY_TYPES: Record<ActivityType, ActivityTypeInfo> = {
  work: {
    type: 'work',
    label: 'Work',
    icon: '💼',
    defaultColor: '#3b82f6', // blue-500
    description: 'Professional work and job-related activities',
  },
  exercise: {
    type: 'exercise',
    label: 'Exercise',
    icon: '🏃',
    defaultColor: '#22c55e', // green-500
    description: 'Physical activity and fitness',
  },
  meal: {
    type: 'meal',
    label: 'Meal',
    icon: '🍽️',
    defaultColor: '#f59e0b', // amber-500
    description: 'Breakfast, lunch, dinner, and snacks',
  },
  sleep: {
    type: 'sleep',
    label: 'Sleep',
    icon: '😴',
    defaultColor: '#8b5cf6', // violet-500
    description: 'Rest and sleep time',
  },
  study: {
    type: 'study',
    label: 'Study',
    icon: '📚',
    defaultColor: '#06b6d4', // cyan-500
    description: 'Learning and educational activities',
  },
  social: {
    type: 'social',
    label: 'Social',
    icon: '👥',
    defaultColor: '#ec4899', // pink-500
    description: 'Social activities and time with others',
  },
  personal: {
    type: 'personal',
    label: 'Personal',
    icon: '🧘',
    defaultColor: '#14b8a6', // teal-500
    description: 'Personal time and self-care',
  },
  other: {
    type: 'other',
    label: 'Other',
    icon: '📌',
    defaultColor: '#64748b', // slate-500
    description: 'Other activities',
  },
};

/**
 * Get activity type info
 */
export function getActivityTypeInfo(type: ActivityType): ActivityTypeInfo {
  return ACTIVITY_TYPES[type];
}

/**
 * Get all activity types
 */
export function getAllActivityTypes(): ActivityTypeInfo[] {
  return Object.values(ACTIVITY_TYPES);
}

/**
 * Get activity type by label
 */
export function getActivityTypeByLabel(label: string): ActivityTypeInfo | undefined {
  return Object.values(ACTIVITY_TYPES).find(
    (type) => type.label.toLowerCase() === label.toLowerCase()
  );
}

/**
 * Get default color for activity type
 */
export function getDefaultColor(type: ActivityType): string {
  return ACTIVITY_TYPES[type].defaultColor;
}

/**
 * Get activity icon emoji
 */
export function getActivityIcon(type: ActivityType): string {
  return ACTIVITY_TYPES[type].icon;
}
