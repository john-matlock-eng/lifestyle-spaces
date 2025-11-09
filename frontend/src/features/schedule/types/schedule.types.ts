/**
 * Schedule feature type definitions
 */

export type ActivityType =
  | 'work'
  | 'exercise'
  | 'meal'
  | 'sleep'
  | 'study'
  | 'social'
  | 'personal'
  | 'other';

export type DayOfWeek =
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday'
  | 'saturday'
  | 'sunday';

export interface TimeBlock {
  id?: string;
  startTime: string; // HH:MM format (24-hour)
  endTime: string; // HH:MM format (24-hour)
  activity: string;
  activityType: ActivityType;
  description?: string;
  color?: string; // hex color
}

export interface ScheduleData {
  [key: string]: TimeBlock[]; // monday, tuesday, etc.
}

export interface Schedule {
  scheduleId: string;
  spaceId: string;
  userId: string;
  weekStarting: string; // ISO date (must be Monday)
  scheduleData: ScheduleData;
  notes?: string;
  isTemplate: boolean;
  templateName?: string;
  createdAt: string;
  updatedAt: string;
  version?: number;
  sharingSettings?: SharingSettings;
  createdBy?: string;
  modifiedBy?: string;
  lastModified?: string;
}

export interface CreateScheduleData {
  spaceId: string;
  weekStarting: string;
  scheduleData: ScheduleData;
  notes?: string;
  isTemplate?: boolean;
  templateName?: string;
}

export interface UpdateScheduleData {
  scheduleData?: ScheduleData;
  notes?: string;
  isTemplate?: boolean;
  templateName?: string;
}

export interface ScheduleListResponse {
  schedules: Schedule[];
  total: number;
}

export interface TimeBlockFormData {
  startTime: string;
  endTime: string;
  activity: string;
  activityType: ActivityType;
  description: string;
  color: string;
}

export interface ScheduleWizardStep {
  step: number;
  title: string;
  description: string;
}

export interface WeekRange {
  start: Date;
  end: Date;
  weekStarting: string; // ISO date string
}

export interface CollisionResult {
  hasCollision: boolean;
  conflicts: Array<{
    block1: TimeBlock;
    block2: TimeBlock;
  }>;
}

export interface DragDropContext {
  sourceDay: DayOfWeek;
  targetDay: DayOfWeek;
  timeBlock: TimeBlock;
  newStartTime?: string;
  newEndTime?: string;
}

export interface ScheduleDiffItem {
  type: 'added' | 'removed' | 'modified';
  day: DayOfWeek;
  timeBlock: TimeBlock;
  originalBlock?: TimeBlock; // For modified items
}

// Activity type metadata
export interface ActivityTypeInfo {
  type: ActivityType;
  label: string;
  icon: string;
  defaultColor: string;
  description: string;
}

// Template for quick schedule creation
export interface ScheduleTemplate {
  id: string;
  name: string;
  description: string;
  scheduleData: ScheduleData;
  icon?: string;
  color?: string;
}

// Schedule sharing
export interface ScheduleShare {
  shareToken: string;
  scheduleId: string;
  shareLink: string;
  createdAt: string;
  expiresAt?: string;
}

export interface SharingSettings {
  isPublic: boolean;
  shareToken?: string;
  createdAt?: string;
  expiresAt?: string;
  viewCount: number;
}

// Schedule versioning
export interface ScheduleVersion {
  version: number;
  scheduleData: ScheduleData;
  notes?: string;
  modifiedAt: string;
  modifiedBy: string;
}

export interface ScheduleVersionResponse {
  versions: ScheduleVersion[];
  currentVersion: number;
}
