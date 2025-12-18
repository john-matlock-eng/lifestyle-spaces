/**
 * Template Selection Modal Types
 *
 * Type definitions for the framework-aware template selection modal.
 *
 * @module templates/TemplateSelectionModal/types
 */

import type {
  Framework,
  FrameworkTemplateConfig,
  FrameworkSummary,
  UnlockEvaluation,
  TemplateFrequency,
  TemplateLifecycle,
} from '@/features/journal/types/framework.types'

// ============================================================================
// VIEW STATE
// ============================================================================

/**
 * Current view state for the modal
 */
export type ModalView = 'list' | 'framework-detail'

/**
 * Selection mode for the modal
 */
export type SelectionMode = 'create' | 'view' | 'edit'

// ============================================================================
// TEMPLATE STATUS
// ============================================================================

/**
 * Status of a template for the current user
 */
export type TemplateStatus =
  | 'available'     // Ready to use
  | 'locked'        // Prerequisites not met
  | 'cooldown'      // In cooldown period
  | 'completed'     // Has been completed (for foundation templates)
  | 'in_progress'   // Currently being worked on

/**
 * Enhanced template with status information
 */
export interface TemplateWithStatus {
  template: FrameworkTemplateConfig
  status: TemplateStatus
  unlockEvaluation?: UnlockEvaluation
  lastCompletedAt?: string
  entryId?: string
  cooldownEndsAt?: string
}

// ============================================================================
// FRAMEWORK DISPLAY
// ============================================================================

/**
 * Framework with display metadata
 */
export interface FrameworkDisplayData {
  framework: Framework
  summary: FrameworkSummary | null
  templateCount: number
  completedCount: number
  category?: string
  isStarted: boolean
}

// ============================================================================
// STANDALONE TEMPLATE
// ============================================================================

/**
 * Standalone template (not part of a framework)
 */
export interface StandaloneTemplate {
  id: string
  name: string
  description: string
  icon?: string
  color?: string
  frequency?: TemplateFrequency
  estimatedMinutes?: number
  tags?: string[]
}

// ============================================================================
// MODAL PROPS
// ============================================================================

/**
 * Props for the main TemplateSelectionModal
 */
export interface TemplateSelectionModalProps {
  /** Whether the modal is open */
  isOpen: boolean
  /** Callback when modal is closed */
  onClose: () => void
  /** Callback when a template is selected for creation */
  onSelectTemplate: (templateId: string, frameworkId?: string) => void
  /** Callback when viewing an existing entry */
  onViewEntry?: (entryId: string) => void
  /** Callback when editing an existing entry */
  onEditEntry?: (entryId: string) => void
  /** Available frameworks */
  frameworks?: Framework[]
  /** Framework summaries with user progress */
  frameworkSummaries?: FrameworkSummary[]
  /** Standalone templates (not in frameworks) */
  standaloneTemplates?: StandaloneTemplate[]
  /** Initial search query */
  initialSearchQuery?: string
  /** Initially selected framework ID (opens detail view) */
  initialFrameworkId?: string
  /** Test ID prefix */
  testId?: string
}

/**
 * Props for FrameworkSection
 */
export interface FrameworkSectionProps {
  /** Frameworks to display */
  frameworks: FrameworkDisplayData[]
  /** Callback when a framework is clicked */
  onFrameworkClick: (frameworkId: string) => void
  /** Test ID prefix */
  testIdPrefix?: string
}

/**
 * Props for FrameworkCard
 */
export interface FrameworkCardProps {
  /** Framework display data */
  framework: FrameworkDisplayData
  /** Callback when clicked */
  onClick: () => void
  /** Test ID */
  testId?: string
}

/**
 * Props for FrameworkDetailView
 */
export interface FrameworkDetailViewProps {
  /** Framework to display */
  framework: Framework
  /** Framework summary with progress */
  summary: FrameworkSummary | null
  /** Templates with status */
  templates: TemplateWithStatus[]
  /** Callback to go back to list view */
  onBack: () => void
  /** Callback when a template is selected */
  onSelectTemplate: (templateId: string) => void
  /** Callback when viewing an existing entry */
  onViewEntry?: (entryId: string) => void
  /** Callback when editing an existing entry */
  onEditEntry?: (entryId: string) => void
  /** Callback when a locked template is clicked */
  onLockedTemplateClick: (template: TemplateWithStatus) => void
  /** Test ID prefix */
  testIdPrefix?: string
}

/**
 * Props for TemplateCard (within framework detail)
 */
export interface TemplateCardProps {
  /** Template with status */
  templateWithStatus: TemplateWithStatus
  /** Order number to display */
  orderNumber: number
  /** Callback when the template action is clicked */
  onAction: () => void
  /** Callback when view is clicked */
  onView?: () => void
  /** Callback when edit is clicked */
  onEdit?: () => void
  /** Test ID */
  testId?: string
}

/**
 * Props for TemplateUnlockStatus
 */
export interface TemplateUnlockStatusProps {
  /** Template status */
  status: TemplateStatus
  /** Unlock evaluation details */
  unlockEvaluation?: UnlockEvaluation
  /** Cooldown end date */
  cooldownEndsAt?: string
  /** Compact display mode */
  compact?: boolean
  /** Test ID */
  testId?: string
}

/**
 * Props for LockedTemplateModal
 */
export interface LockedTemplateModalProps {
  /** Whether the modal is open */
  isOpen: boolean
  /** Callback to close */
  onClose: () => void
  /** The locked template */
  template: TemplateWithStatus
  /** Framework containing the template */
  framework: Framework
  /** Callback to navigate to a prerequisite template */
  onNavigateToTemplate?: (templateId: string) => void
  /** Callback to go back to framework view */
  onBackToFramework: () => void
  /** Test ID */
  testId?: string
}

/**
 * Props for StandaloneSection
 */
export interface StandaloneSectionProps {
  /** Standalone templates to display */
  templates: StandaloneTemplate[]
  /** Callback when a template is clicked */
  onTemplateClick: (templateId: string) => void
  /** Test ID prefix */
  testIdPrefix?: string
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

/**
 * Search/filter state
 */
export interface SearchFilterState {
  query: string
  category?: string
  lifecycle?: TemplateLifecycle
  showCompleted?: boolean
}

/**
 * Get frequency label for display
 */
export function getFrequencyLabel(frequency: TemplateFrequency): string {
  const labels: Record<TemplateFrequency, string> = {
    once: 'One-time',
    daily: 'Daily',
    weekly: 'Weekly',
    monthly: 'Monthly',
    quarterly: 'Quarterly',
    yearly: 'Yearly',
    as_needed: 'As needed',
  }
  return labels[frequency] || frequency
}

/**
 * Get lifecycle label for display
 */
export function getLifecycleLabel(lifecycle: TemplateLifecycle): string {
  const labels: Record<TemplateLifecycle, string> = {
    foundation: 'Foundation',
    recurring: 'Recurring',
    milestone: 'Milestone',
    special: 'Special',
  }
  return labels[lifecycle] || lifecycle
}

/**
 * Get status label for display
 */
export function getStatusLabel(status: TemplateStatus): string {
  const labels: Record<TemplateStatus, string> = {
    available: 'Available',
    locked: 'Locked',
    cooldown: 'Cooldown',
    completed: 'Complete',
    in_progress: 'In Progress',
  }
  return labels[status] || status
}

/**
 * Get status icon for display
 */
export function getStatusIcon(status: TemplateStatus): string {
  const icons: Record<TemplateStatus, string> = {
    available: '✓',
    locked: '🔒',
    cooldown: '⏳',
    completed: '✅',
    in_progress: '📝',
  }
  return icons[status] || '•'
}
