/**
 * Framework Form Types
 *
 * Type definitions for the dynamic form rendering system.
 *
 * @module framework-form/types
 */

import type { FieldError, FieldValues } from 'react-hook-form'
import type {
  FrameworkTemplate,
  TemplateSection,
  TemplateSubsection,
} from '@/features/journal/types/framework.types'
import type { FieldDefinition, FieldBinding } from '@/features/journal/types/field.types'
import type { ResolvedBindings, ResolvedBinding } from '@/features/journal/types/data-binding.types'

// ============================================================================
// FIELD RENDERER TYPES
// ============================================================================

/**
 * Binding mode determines how a bound field behaves
 */
export type BindingMode = 'default' | 'prefill' | 'readonly' | 'reference' | 'hidden'

/**
 * Props for the FieldRenderer component
 */
export interface FieldRendererProps {
  /** The field definition to render */
  field: FieldDefinition
  /** Resolved binding for this field (if any) */
  resolvedBinding?: ResolvedBinding
  /** Current form values */
  formValues: Record<string, unknown>
  /** Field name path in the form */
  fieldPath: string
  /** Error for this field */
  error?: FieldError
  /** Whether the entire form is disabled */
  disabled?: boolean
  /** Whether the entire form is read-only */
  readOnly?: boolean
  /** Callback when field value changes */
  onChange: (value: unknown) => void
  /** Callback when field loses focus */
  onBlur?: () => void
  /** Test ID prefix */
  testIdPrefix?: string
}

/**
 * Props for unknown/unsupported field type fallback
 */
export interface UnknownFieldProps {
  /** The field definition that couldn't be rendered */
  field: FieldDefinition
  /** Test ID */
  testId?: string
}

// ============================================================================
// SECTION/SUBSECTION TYPES
// ============================================================================

/**
 * Props for the FormSection component
 */
export interface FormSectionProps {
  /** Section definition */
  section: TemplateSection
  /** All field definitions keyed by ID */
  fields: Record<string, FieldDefinition>
  /** Resolved bindings for all fields */
  resolvedBindings?: ResolvedBindings
  /** Current form values */
  formValues: Record<string, unknown>
  /** Form errors keyed by field path */
  errors: Record<string, FieldError | undefined>
  /** Whether the form is disabled */
  disabled?: boolean
  /** Whether the form is read-only */
  readOnly?: boolean
  /** Callback when a field value changes */
  onFieldChange: (fieldId: string, value: unknown) => void
  /** Callback when a field loses focus */
  onFieldBlur?: (fieldId: string) => void
  /** Test ID prefix */
  testIdPrefix?: string
  /** Whether section is initially collapsed */
  defaultCollapsed?: boolean
}

/**
 * Props for the FormSubsection component
 */
export interface FormSubsectionProps {
  /** Subsection definition */
  subsection: TemplateSubsection
  /** All field definitions keyed by ID */
  fields: Record<string, FieldDefinition>
  /** Resolved bindings for all fields */
  resolvedBindings?: ResolvedBindings
  /** Current form values */
  formValues: Record<string, unknown>
  /** Form errors keyed by field path */
  errors: Record<string, FieldError | undefined>
  /** Whether the form is disabled */
  disabled?: boolean
  /** Whether the form is read-only */
  readOnly?: boolean
  /** Callback when a field value changes */
  onFieldChange: (fieldId: string, value: unknown) => void
  /** Callback when a field loses focus */
  onFieldBlur?: (fieldId: string) => void
  /** Test ID prefix */
  testIdPrefix?: string
}

// ============================================================================
// FORM RENDERER TYPES
// ============================================================================

/**
 * Props for the DynamicFormRenderer component
 */
export interface DynamicFormRendererProps {
  /** Framework template to render */
  template: FrameworkTemplate
  /** Initial form values (for editing or prefill) */
  initialValues?: Record<string, unknown>
  /** Resolved data bindings */
  resolvedBindings?: ResolvedBindings
  /** Form submission handler */
  onSubmit: (values: Record<string, unknown>) => Promise<void>
  /** Draft save handler */
  onSaveDraft?: (values: Record<string, unknown>) => void
  /** Cancel handler */
  onCancel?: () => void
  /** Whether the form is read-only (view mode) */
  readOnly?: boolean
  /** Whether the form is disabled */
  disabled?: boolean
  /** Whether to auto-save drafts */
  autoSaveDraft?: boolean
  /** Auto-save debounce delay in ms */
  autoSaveDelay?: number
  /** Test ID */
  testId?: string
  /** Custom CSS class */
  className?: string
}

/**
 * Form state from the useTemplateForm hook
 */
export interface TemplateFormState {
  /** Current form values */
  values: Record<string, unknown>
  /** Form errors keyed by field path */
  errors: Record<string, FieldError | undefined>
  /** Whether the form has been modified */
  isDirty: boolean
  /** Whether the form is currently submitting */
  isSubmitting: boolean
  /** Whether the form is valid */
  isValid: boolean
  /** Whether form has unsaved changes */
  hasUnsavedChanges: boolean
  /** Last saved timestamp */
  lastSaved?: Date
  /** Whether draft is being saved */
  isSavingDraft: boolean
}

/**
 * Actions available from the useTemplateForm hook
 */
export interface TemplateFormActions {
  /** Set a field value */
  setFieldValue: (fieldId: string, value: unknown) => void
  /** Set multiple field values */
  setFieldValues: (values: Record<string, unknown>) => void
  /** Trigger validation for a specific field */
  validateField: (fieldId: string) => Promise<boolean>
  /** Trigger validation for all fields */
  validateForm: () => Promise<boolean>
  /** Reset form to initial values */
  resetForm: () => void
  /** Clear all errors */
  clearErrors: () => void
  /** Submit the form */
  submitForm: () => Promise<void>
  /** Save as draft */
  saveDraft: () => Promise<void>
  /** Get field error */
  getFieldError: (fieldId: string) => FieldError | undefined
  /** Scroll to first error */
  scrollToFirstError: () => void
}

/**
 * Return type of the useTemplateForm hook
 */
export interface UseTemplateFormReturn {
  /** Current form state */
  state: TemplateFormState
  /** Form actions */
  actions: TemplateFormActions
  /** React Hook Form methods for advanced usage */
  formMethods: {
    register: ReturnType<typeof import('react-hook-form').useForm>['register']
    watch: ReturnType<typeof import('react-hook-form').useForm>['watch']
    setValue: ReturnType<typeof import('react-hook-form').useForm>['setValue']
    control: ReturnType<typeof import('react-hook-form').useForm>['control']
    handleSubmit: ReturnType<typeof import('react-hook-form').useForm>['handleSubmit']
    formState: ReturnType<typeof import('react-hook-form').useForm>['formState']
  }
}

// ============================================================================
// VALIDATION TYPES
// ============================================================================

/**
 * Props for the FormValidation component
 */
export interface FormValidationProps {
  /** All form errors */
  errors: Record<string, FieldError | undefined>
  /** Field definitions for error labels */
  fields: Record<string, FieldDefinition>
  /** Whether to show summary at top of form */
  showSummary?: boolean
  /** Callback when clicking on an error (to scroll to field) */
  onErrorClick?: (fieldId: string) => void
  /** Test ID */
  testId?: string
}

/**
 * Validation error for display
 */
export interface ValidationError {
  /** Field ID */
  fieldId: string
  /** Field label */
  fieldLabel: string
  /** Error message */
  message: string
  /** Field path in form */
  fieldPath: string
}

// ============================================================================
// FORM ACTIONS TYPES
// ============================================================================

/**
 * Props for the FormActions component
 */
export interface FormActionsProps {
  /** Form state */
  formState: TemplateFormState
  /** Submit handler */
  onSubmit: () => void
  /** Save draft handler */
  onSaveDraft?: () => void
  /** Cancel handler */
  onCancel?: () => void
  /** Whether the form is read-only */
  readOnly?: boolean
  /** Whether the form is disabled */
  disabled?: boolean
  /** Custom submit button label */
  submitLabel?: string
  /** Custom cancel button label */
  cancelLabel?: string
  /** Custom draft button label */
  draftLabel?: string
  /** Whether to show keyboard shortcut hints */
  showShortcuts?: boolean
  /** Test ID */
  testId?: string
}

// ============================================================================
// HOOK OPTIONS TYPES
// ============================================================================

/**
 * Options for the useTemplateForm hook
 */
export interface UseTemplateFormOptions {
  /** Framework template */
  template: FrameworkTemplate
  /** Initial values */
  initialValues?: Record<string, unknown>
  /** Resolved bindings */
  resolvedBindings?: ResolvedBindings
  /** Form submission handler */
  onSubmit: (values: Record<string, unknown>) => Promise<void>
  /** Draft save handler */
  onSaveDraft?: (values: Record<string, unknown>) => void
  /** Whether to auto-save drafts */
  autoSaveDraft?: boolean
  /** Auto-save debounce delay in ms */
  autoSaveDelay?: number
  /** Validation mode */
  validationMode?: 'onBlur' | 'onChange' | 'onSubmit' | 'all'
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

/**
 * Field type to form-fields registry type mapping
 */
export interface FieldTypeMapping {
  text: 'text'
  textarea: 'textarea'
  rich_text: 'textarea' // Rich text fallback
  number: 'text'
  rating: 'slider'
  slider: 'slider'
  select: 'select'
  multi_select: 'select'
  checkbox: 'checkbox'
  checkbox_group: 'checkbox'
  radio: 'yes-no'
  date: 'date'
  time: 'date'
  datetime: 'date'
  list: 'checklist-input'
  tags: 'text'
  emotions: 'select'
  values: 'select'
  goals: 'select'
  repeatable: 'repeatable-block'
  section_break: 'divider'
  heading: 'header'
  paragraph: 'static-text'
}

/**
 * Get the effective binding mode for a field
 */
export function getBindingMode(
  field: FieldDefinition,
  resolvedBinding?: ResolvedBinding
): BindingMode {
  if (!field.binding && !resolvedBinding) {
    return 'default'
  }

  if (field.binding) {
    return field.binding.mode
  }

  if (resolvedBinding?.success) {
    return 'prefill'
  }

  return 'default'
}

/**
 * Check if a field is display-only
 */
export function isDisplayField(field: FieldDefinition): boolean {
  return ['section_break', 'heading', 'paragraph'].includes(field.type)
}

/**
 * Get the default value for a field based on its type
 */
export function getFieldDefaultValue(field: FieldDefinition): unknown {
  const config = field.config as Record<string, unknown> | undefined

  if (config?.defaultValue !== undefined) {
    return config.defaultValue
  }

  switch (field.type) {
    case 'text':
    case 'textarea':
    case 'rich_text':
      return ''
    case 'number':
    case 'rating':
    case 'slider':
      return config?.min ?? 0
    case 'checkbox':
      return false
    case 'select':
    case 'radio':
      return null
    case 'multi_select':
    case 'checkbox_group':
    case 'list':
    case 'tags':
    case 'emotions':
      return []
    case 'date':
    case 'time':
    case 'datetime':
      return null
    case 'repeatable':
      return { items: [] }
    default:
      return undefined
  }
}
