/**
 * Journal Feature Type Exports
 *
 * Central export point for all journal-related type definitions.
 *
 * @module journal/types
 */

// ============================================================================
// JOURNAL TYPES
// ============================================================================

export type {
  JournalAuthor,
  JournalEntry,
  JournalListResponse,
  CreateJournalRequest,
  UpdateJournalRequest,
  JournalListParams,
} from './journal.types'

// ============================================================================
// TEMPLATE TYPES
// ============================================================================

export type {
  JournalTemplate,
  TemplateSection,
  TemplatePrompt,
  TemplatePromptInput,
} from './template.types'

// ============================================================================
// FRAMEWORK TYPES
// ============================================================================

export {
  // Type guards (functions)
  isTemplateFrequency,
  isTemplateLifecycle,
  isDataBindingSource,
  isFramework,
  isFrameworkTemplate,
} from './framework.types'

export type {
  // Enums and basic types
  TemplateFrequency,
  TemplateLifecycle,
  SemanticVersion,
  DataBindingSource,

  // Framework metadata
  FrameworkAuthor,
  FrameworkMetadata,
  FrameworkCategory,

  // Data binding
  DataBindingMapping,
  TemplateDataBindings,

  // UI Configuration
  TemplateUIConfig,

  // Template content structure
  RepeatableItemTemplate,
  TemplateSubsection,
  // Note: TemplateSection is also exported from template.types
  // Using framework's TemplateSection as FrameworkTemplateSection to avoid collision
  TemplateContent,

  // Template definition
  UnlockCondition,
  UnlockBlockReason,
  FrameworkTemplate,
  FrameworkTemplateConfig,

  // Main framework
  Framework,

  // User progress
  FoundationCompletion,
  FrameworkCycle,
  CompletedCycle,
  UserFrameworkProgress,

  // Unlock evaluation
  UnlockEvaluation,

  // Summary and filters
  FrameworkSummary,
  FrameworkFilter,
} from './framework.types'

// Re-export TemplateSection from framework.types with an alias to avoid collision
export type { TemplateSection as FrameworkTemplateSection } from './framework.types'

// ============================================================================
// FIELD TYPES
// ============================================================================

export {
  // Type guards (functions)
  isFieldType,
  isFieldDefinition,
  isFieldOption,
  isFieldValidation,
  isDisplayFieldType,
  isMultiValueFieldType,
  isOptionFieldType,
} from './field.types'

export type {
  // Core field types
  FieldType,
  FieldValidation,
  FieldBinding,
  FieldOption,
  FieldDefinition,

  // Field configurations
  TextFieldConfig,
  RichTextFieldConfig,
  NumberFieldConfig,
  RatingFieldConfig,
  SliderFieldConfig,
  SelectFieldConfig,
  CheckboxFieldConfig,
  CheckboxGroupFieldConfig,
  RadioFieldConfig,
  DateTimeFieldConfig,
  ListFieldConfig,
  TagsFieldConfig,
  EmotionFieldConfig,
  ValuesFieldConfig,
  GoalsFieldConfig,
  RepeatableFieldConfig,
  DisplayFieldConfig,
  FieldConfig,

  // React component props
  BaseFieldProps,
  TextFieldProps,
  RichTextFieldProps,
  NumberFieldProps,
  RatingFieldProps,
  SliderFieldProps,
  SelectFieldProps,
  MultiSelectFieldProps,
  CheckboxFieldProps,
  CheckboxGroupFieldProps,
  RadioFieldProps,
  DateTimeFieldProps,
  ListFieldProps,
  TagsFieldProps,
  EmotionFieldProps,
} from './field.types'

// ============================================================================
// DATA BINDING TYPES
// ============================================================================

export {
  // Type guards (functions)
  isParsedBindingExpression,
  isResolvedBinding,
  isBindingResolutionError,
  isBindingErrorCode,
  isFrameworkEntryData,
  isCapturedOutputs,
} from './data-binding.types'

export type {
  // Binding expression
  ParsedBindingExpression,

  // Resolution context
  BindingResolutionContext,
  FrameworkEntryData,
  UserProfileData,

  // Resolved bindings
  ResolvedBinding,
  ResolvedBindings,
  BindingResolutionError,
  BindingErrorCode,

  // Transform registry
  TransformFunction,
  TransformRegistry,
  BuiltInTransforms,

  // Binding utilities
  BindingParserOptions,
  BindingResolverOptions,

  // Output bindings
  OutputBindingDefinition,
  CapturedOutputs,
} from './data-binding.types'

// ============================================================================
// HIGHLIGHT TYPES
// ============================================================================

export type {
  Highlight,
  CreateHighlightRequest,
  HighlightListResponse,
} from './highlight.types'

// ============================================================================
// COMMENT TYPES
// ============================================================================

export type {
  JournalComment,
  CreateCommentRequest,
  UpdateCommentRequest,
  CommentListResponse,
} from './journalComment.types'

// ============================================================================
// CUSTOM SECTION TYPES
// ============================================================================

export type {
  CustomSection,
  CreateCustomSectionRequest,
  UpdateCustomSectionRequest,
} from './customSection.types'
