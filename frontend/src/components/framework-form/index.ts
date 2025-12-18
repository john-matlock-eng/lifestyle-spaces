/**
 * Framework Form Components
 *
 * Dynamic form rendering system based on FrameworkTemplate definitions.
 * Provides components for rendering complete forms with validation,
 * auto-save, and binding support.
 *
 * @module framework-form
 */

// Main components
export { DynamicFormRenderer } from './DynamicFormRenderer'
export { FieldRenderer } from './FieldRenderer'
export { FormSection } from './FormSection'
export { FormSubsection } from './FormSubsection'
export { FormValidation } from './FormValidation'
export { FormActions } from './FormActions'

// Hooks
export { useTemplateForm } from './useTemplateForm'

// Types
export type {
  BindingMode,
  FieldRendererProps,
  FormSectionProps,
  FormSubsectionProps,
  DynamicFormRendererProps,
  TemplateFormState,
  TemplateFormActions,
  UseTemplateFormReturn,
  UseTemplateFormOptions,
  FormValidationProps,
  FormActionsProps,
  ValidationError,
} from './types'

// Utilities
export { getBindingMode, isDisplayField, getFieldDefaultValue } from './types'
