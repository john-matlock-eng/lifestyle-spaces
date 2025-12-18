/**
 * Framework System Type Definitions
 *
 * A Framework is a structured collection of journal templates designed to work together
 * toward a specific goal (e.g., "Charter & Course" for life direction planning).
 * Frameworks provide guided progression through foundation templates and recurring cycles.
 *
 * @module framework.types
 */

// ============================================================================
// ENUMS AND BASIC TYPES
// ============================================================================

/**
 * Frequency at which a template should be used
 */
export type TemplateFrequency =
  | 'once' // One-time foundation templates
  | 'daily' // Daily reflection/check-in
  | 'weekly' // Weekly review/planning
  | 'monthly' // Monthly review/goals
  | 'quarterly' // Quarterly planning
  | 'yearly' // Annual review
  | 'as_needed' // Use whenever appropriate

/**
 * Lifecycle phase of a template within a framework
 */
export type TemplateLifecycle = 'foundation' | 'recurring' | 'milestone' | 'special'

/**
 * Semantic versioning string (e.g., "1.0.0")
 */
export type SemanticVersion = `${number}.${number}.${number}`

// ============================================================================
// FRAMEWORK METADATA
// ============================================================================

/**
 * Author information for a framework
 */
export interface FrameworkAuthor {
  /** Author's unique identifier */
  id: string
  /** Author's display name */
  name: string
  /** Author's email (optional) */
  email?: string
  /** Author's website or profile URL */
  url?: string
}

/**
 * Metadata about the framework
 */
export interface FrameworkMetadata {
  /** Semantic version of the framework definition */
  schemaVersion: SemanticVersion
  /** When this framework was created */
  createdAt: string
  /** When this framework was last updated */
  updatedAt: string
  /** Author(s) of this framework */
  authors: FrameworkAuthor[]
  /** License for the framework content */
  license?: string
  /** Tags for categorization and discovery */
  tags: string[]
  /** Target audience description */
  audience?: string
  /** Estimated time to complete foundation */
  foundationEstimate?: string
  /** Recommended usage cadence description */
  cadenceDescription?: string
}

/**
 * Category grouping for templates within a framework
 */
export interface FrameworkCategory {
  /** Unique identifier for the category */
  id: string
  /** Display name for the category */
  name: string
  /** Description of what this category covers */
  description: string
  /** Display order within the framework */
  order: number
  /** Icon for the category (emoji or icon name) */
  icon?: string
  /** Color for visual distinction */
  color?: string
}

// ============================================================================
// DATA BINDING TYPES
// ============================================================================

/**
 * Source types for data bindings
 */
export type DataBindingSource =
  | 'framework_entry' // Reference data from another framework entry
  | 'user_profile' // Reference user profile data
  | 'computed' // Computed/derived value
  | 'static' // Static/constant value

/**
 * Mapping configuration for a single data binding
 */
export interface DataBindingMapping {
  /** Unique identifier for this binding */
  id: string
  /** Source of the data */
  source: DataBindingSource
  /**
   * Path to the source data using dot notation
   * e.g., "values_discovery.core_values" or "user.displayName"
   */
  sourcePath: string
  /** Target field ID in the current template */
  targetFieldId: string
  /**
   * Transform function to apply to the source data
   * e.g., "first", "join", "count", "latest"
   */
  transform?: string
  /** Arguments for the transform function */
  transformArgs?: Record<string, unknown>
  /** Fallback value if source is not available */
  fallback?: unknown
  /** Whether this binding is required */
  required?: boolean
  /** Human-readable description of this binding */
  description?: string
}

/**
 * Data binding configuration for a template
 */
export interface TemplateDataBindings {
  /** Bindings that pull data from other sources */
  inputs: DataBindingMapping[]
  /** Fields that are exposed for other templates to reference */
  outputs: string[]
}

// ============================================================================
// TEMPLATE UI CONFIGURATION
// ============================================================================

/**
 * UI configuration for displaying a template
 */
export interface TemplateUIConfig {
  /** Layout mode for the template */
  layout: 'single-column' | 'two-column' | 'wizard' | 'tabbed'
  /** Whether to show a progress indicator */
  showProgress?: boolean
  /** Whether sections are collapsible */
  collapsibleSections?: boolean
  /** Default collapsed state for sections */
  defaultCollapsed?: boolean
  /** Custom CSS class for styling */
  cssClass?: string
  /** Estimated completion time in minutes */
  estimatedMinutes?: number
  /** Guidance text shown at the top */
  introText?: string
  /** Guidance text shown at the bottom */
  outroText?: string
}

// ============================================================================
// TEMPLATE CONTENT STRUCTURE
// ============================================================================

/**
 * Repeatable item template for lists and collections
 */
export interface RepeatableItemTemplate {
  /** Minimum number of items required */
  minItems: number
  /** Maximum number of items allowed */
  maxItems: number
  /** Default number of items to show */
  defaultItems: number
  /** Label for "add item" button */
  addLabel: string
  /** Fields within each item */
  itemFields: string[] // References to field IDs
}

/**
 * A subsection within a template section
 */
export interface TemplateSubsection {
  /** Unique identifier for this subsection */
  id: string
  /** Display title */
  title: string
  /** Description or guidance text */
  description?: string
  /** Field IDs contained in this subsection */
  fields: string[]
  /** Display order */
  order: number
  /** Whether this subsection is collapsible */
  collapsible?: boolean
  /** Default collapsed state */
  defaultCollapsed?: boolean
}

/**
 * A major section within a template
 */
export interface TemplateSection {
  /** Unique identifier for this section */
  id: string
  /** Display title */
  title: string
  /** Description or guidance text */
  description?: string
  /** Icon for the section */
  icon?: string
  /** Field IDs contained in this section (if no subsections) */
  fields?: string[]
  /** Subsections within this section */
  subsections?: TemplateSubsection[]
  /** Display order */
  order: number
  /** Whether this section is required */
  required?: boolean
  /** Whether this section is collapsible */
  collapsible?: boolean
  /** Default collapsed state */
  defaultCollapsed?: boolean
  /** Conditional display expression */
  showIf?: string
}

/**
 * Complete content structure for a template
 */
export interface TemplateContent {
  /** Sections in this template */
  sections: TemplateSection[]
  /** All field definitions (keyed by field ID) */
  fields: Record<string, import('./field.types').FieldDefinition>
}

// ============================================================================
// FRAMEWORK TEMPLATE
// ============================================================================

/**
 * Custom unlock condition for a template
 */
export interface UnlockCondition {
  /** Type of condition to evaluate */
  type: 'template_count' | 'days_elapsed' | 'streak' | 'field_value' | 'custom'
  /** Template ID to count completions for (for template_count type) */
  templateId?: string
  /** Field ID to check value for (for field_value type) */
  fieldId?: string
  /** Expected field value or comparison */
  fieldValue?: unknown
  /** Minimum count required */
  minCount?: number
  /** Minimum days required */
  minDays?: number
  /** Custom condition identifier for complex logic */
  customId?: string
  /** Human-readable description of the condition */
  description: string
}

/**
 * Reason why a template is locked
 */
export interface UnlockBlockReason {
  /** Type of block */
  type: 'prerequisite' | 'cooldown' | 'condition' | 'foundation_incomplete'
  /** Related template ID (if applicable) */
  templateId?: string
  /** Human-readable message */
  message: string
  /** Progress toward unblocking (0-100) */
  progress?: number
}

/**
 * Complete template definition within a framework
 */
export interface FrameworkTemplate {
  /** Unique identifier for this template */
  id: string
  /** Display name */
  name: string
  /** Short description */
  description: string
  /** Detailed guidance for completing this template */
  guidance?: string
  /** Category this template belongs to */
  categoryId: string
  /** Lifecycle phase of this template */
  lifecycle: TemplateLifecycle
  /** How often this template should be used */
  frequency: TemplateFrequency
  /** Display order within its category */
  order: number
  /** Icon for the template */
  icon?: string
  /** Color for visual distinction */
  color?: string
  /**
   * Template IDs that must be completed before this one is unlocked
   * Empty array means no prerequisites
   */
  prerequisites: string[]
  /**
   * Minimum number of days since last use before suggesting again
   * Only applicable for recurring templates
   */
  cooldownDays?: number
  /**
   * Custom unlock conditions beyond prerequisites
   */
  unlockConditions?: UnlockCondition[]
  /** Guidance text shown when template is locked */
  lockedMessage?: string
  /** Guidance text shown when template becomes available */
  unlockedMessage?: string
  /** UI configuration */
  ui?: TemplateUIConfig
  /** Data bindings configuration */
  dataBindings?: TemplateDataBindings
  /** Template content (sections and fields) */
  content: TemplateContent
  /** Version of this template */
  version: number
}

// ============================================================================
// MAIN FRAMEWORK DEFINITION
// ============================================================================

/**
 * Main Framework definition
 */
export interface Framework {
  /** Unique identifier for the framework */
  id: string
  /** Display name */
  name: string
  /** Short tagline or subtitle */
  tagline: string
  /** Full description of the framework's purpose and approach */
  description: string
  /** Framework version number */
  version: number
  /** Icon for the framework (emoji or icon name) */
  icon: string
  /** Primary color for theming */
  color: string
  /** Secondary color for accents */
  secondaryColor?: string
  /** Categories within this framework */
  categories: FrameworkCategory[]
  /** Template definitions */
  templates: FrameworkTemplate[]
  /** Framework metadata */
  metadata: FrameworkMetadata
  /** Whether this framework is currently active/available */
  isActive: boolean
}

// ============================================================================
// LEGACY COMPATIBILITY - FrameworkTemplateConfig
// ============================================================================

/**
 * Simplified template configuration for backward compatibility
 * @deprecated Use FrameworkTemplate instead
 */
export interface FrameworkTemplateConfig {
  /** Reference to the template ID */
  templateId: string
  /** Category this template belongs to */
  categoryId: string
  /** How often this template should be used */
  frequency: TemplateFrequency
  /** Display order within its category */
  order: number
  /** Whether this is a foundation (one-time setup) template */
  isFoundation: boolean
  /** Template IDs that must be completed before this one is unlocked */
  prerequisites: string[]
  /** Minimum number of days since last use before suggesting again */
  cooldownDays?: number
  /** Custom unlock conditions */
  unlockConditions?: UnlockCondition[]
  /** Guidance text shown when template is locked */
  lockedMessage?: string
  /** Guidance text shown when template becomes available */
  unlockedMessage?: string
}

// ============================================================================
// USER PROGRESS TRACKING
// ============================================================================

/**
 * Record of a completed foundation template
 */
export interface FoundationCompletion {
  /** The foundation template that was completed */
  templateId: string
  /** Journal entry ID created from this completion */
  journalId: string
  /** When the foundation was completed */
  completedAt: string
  /** Field values captured at completion (for data binding) */
  capturedData?: Record<string, unknown>
}

/**
 * Represents a single cycle period (e.g., a specific week or month)
 */
export interface FrameworkCycle {
  /** Unique identifier for this cycle */
  id: string
  /** The cycle period identifier (e.g., "2024-W03" for week 3 of 2024) */
  period: string
  /** Start date of this cycle */
  startDate: string
  /** End date of this cycle */
  endDate: string
  /** Templates expected in this cycle */
  expectedTemplates: string[]
  /** Completed entries for this cycle */
  completedEntries: CompletedCycle[]
  /** Completion percentage (0-100) */
  completionPercent: number
}

/**
 * Record of a completed framework cycle entry
 */
export interface CompletedCycle {
  /** The template that was completed */
  templateId: string
  /** Journal entry ID created from this completion */
  journalId: string
  /** When the cycle entry was completed */
  completedAt: string
  /** The cycle period this completion belongs to (e.g., "2024-W03") */
  cyclePeriod: string
  /** Field values captured at completion */
  capturedData?: Record<string, unknown>
}

/**
 * User's progress within a framework
 */
export interface UserFrameworkProgress {
  /** User ID */
  userId: string
  /** Framework ID */
  frameworkId: string
  /** Space ID where this progress is tracked */
  spaceId: string
  /** When the user started this framework */
  startedAt: string
  /** Completed foundation templates */
  foundationCompletions: FoundationCompletion[]
  /** Completed recurring cycles */
  completedCycles: CompletedCycle[]
  /** Active cycles (current week, month, etc.) */
  activeCycles?: FrameworkCycle[]
  /** Currently active streak count (consecutive completions) */
  currentStreak: number
  /** Longest streak achieved */
  longestStreak: number
  /** Last activity date */
  lastActivityAt: string
  /** Whether all foundation templates are complete */
  foundationComplete: boolean
  /** Date foundation was completed (if applicable) */
  foundationCompletedAt?: string
  /** Custom user data/preferences for this framework */
  userData?: Record<string, unknown>
}

// ============================================================================
// UNLOCK EVALUATION
// ============================================================================

/**
 * Result of evaluating whether a template should be unlocked
 */
export interface UnlockEvaluation {
  /** Whether the template is unlocked */
  isUnlocked: boolean
  /** If locked, the detailed reasons why */
  blockReasons: UnlockBlockReason[]
  /** Prerequisites that are still incomplete */
  missingPrerequisites: string[]
  /** Percentage progress toward unlock (0-100) */
  progressPercent: number
  /** Human-readable status message */
  statusMessage: string
  /** When the template will become available (if cooldown) */
  availableAt?: string
}

// ============================================================================
// FRAMEWORK SUMMARY AND FILTERS
// ============================================================================

/**
 * Summary of a user's framework engagement
 */
export interface FrameworkSummary {
  /** The framework */
  framework: Framework
  /** User's progress (null if not started) */
  progress: UserFrameworkProgress | null
  /** Number of foundation templates completed */
  foundationsCompleted: number
  /** Total number of foundation templates */
  foundationsTotal: number
  /** Next recommended template to complete */
  nextRecommendedTemplateId?: string
  /** Templates that are currently unlocked and available */
  availableTemplateIds: string[]
  /** Templates that are locked */
  lockedTemplateIds: string[]
  /** Current cycle completion status */
  currentCycleStatus?: {
    period: string
    completionPercent: number
    nextDueTemplate?: string
  }
}

/**
 * Filter options for framework-related queries
 */
export interface FrameworkFilter {
  /** Filter by active status */
  isActive?: boolean
  /** Filter by whether user has started */
  hasStarted?: boolean
  /** Filter by whether foundation is complete */
  foundationComplete?: boolean
  /** Filter by tags */
  tags?: string[]
  /** Filter by author */
  authorId?: string
}

// ============================================================================
// TYPE GUARDS
// ============================================================================

/**
 * Type guard to check if a value is a valid TemplateFrequency
 */
export function isTemplateFrequency(value: unknown): value is TemplateFrequency {
  return (
    typeof value === 'string' &&
    ['once', 'daily', 'weekly', 'monthly', 'quarterly', 'yearly', 'as_needed'].includes(value)
  )
}

/**
 * Type guard to check if a value is a valid TemplateLifecycle
 */
export function isTemplateLifecycle(value: unknown): value is TemplateLifecycle {
  return (
    typeof value === 'string' &&
    ['foundation', 'recurring', 'milestone', 'special'].includes(value)
  )
}

/**
 * Type guard to check if a value is a valid DataBindingSource
 */
export function isDataBindingSource(value: unknown): value is DataBindingSource {
  return (
    typeof value === 'string' &&
    ['framework_entry', 'user_profile', 'computed', 'static'].includes(value)
  )
}

/**
 * Type guard to check if an object is a valid Framework
 */
export function isFramework(value: unknown): value is Framework {
  if (typeof value !== 'object' || value === null) return false
  const obj = value as Record<string, unknown>
  return (
    typeof obj.id === 'string' &&
    typeof obj.name === 'string' &&
    typeof obj.version === 'number' &&
    Array.isArray(obj.categories) &&
    Array.isArray(obj.templates)
  )
}

/**
 * Type guard to check if an object is a valid FrameworkTemplate
 */
export function isFrameworkTemplate(value: unknown): value is FrameworkTemplate {
  if (typeof value !== 'object' || value === null) return false
  const obj = value as Record<string, unknown>
  return (
    typeof obj.id === 'string' &&
    typeof obj.name === 'string' &&
    typeof obj.categoryId === 'string' &&
    isTemplateLifecycle(obj.lifecycle) &&
    isTemplateFrequency(obj.frequency) &&
    typeof obj.content === 'object'
  )
}
