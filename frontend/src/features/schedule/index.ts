/**
 * Schedule feature exports
 */

// Components
export { ScheduleTemplate } from './components/ScheduleTemplate';
export { WeekView } from './components/WeekView';
export { TimeBlock } from './components/TimeBlock';
export { TimeBlockEditor } from './components/TimeBlockEditor';
export { DayColumn } from './components/DayColumn';
export { ScheduleWizard } from './components/ScheduleWizard';
export { ScheduleDiff } from './components/ScheduleDiff';
export { ShareModal } from './components/ShareModal';
export { ScheduleHistory } from './components/ScheduleHistory';
export { PublicScheduleView } from './components/PublicScheduleView';
export { ScheduleLoadingSkeleton, ScheduleListItemSkeleton, ScheduleInlineSkeleton } from './components/ScheduleLoadingSkeleton';
export { ScheduleErrorBoundary, ScheduleError, ScheduleInlineError } from './components/ScheduleErrorBoundary';

// Hooks
export { useSchedule } from './hooks/useSchedule';
export { useWeekNavigation } from './hooks/useWeekNavigation';
export { useCollisionDetection } from './hooks/useCollisionDetection';

// Services
export * as scheduleApi from './services/scheduleApi';

// Utils
export * from './utils/timeUtils';
export * from './utils/scheduleValidation';
export * from './utils/collisionDetection';
export * from './utils/activityTypes';

// Types
export type {
  Schedule,
  ScheduleData,
  TimeBlock as TimeBlockType,
  ActivityType,
  DayOfWeek,
  CreateScheduleData,
  UpdateScheduleData,
  ScheduleListResponse,
  WeekRange,
  ActivityTypeInfo,
  ScheduleTemplate as ScheduleTemplateType,
  ScheduleShare,
  SharingSettings,
  ScheduleVersion,
  ScheduleVersionResponse,
} from './types/schedule.types';
