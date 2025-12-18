/**
 * Form Fields Module
 *
 * Dynamic form field system with glassmorphism styling.
 *
 * @module form-fields
 *
 * @example
 * ```tsx
 * import {
 *   TextField,
 *   SelectField,
 *   registerField,
 *   getFieldComponent,
 * } from '@/components/form-fields'
 *
 * // Use components directly
 * <TextField {...props} />
 *
 * // Or use the registry for dynamic rendering
 * const Component = getFieldComponent('text')
 * <Component {...props} />
 * ```
 */

// ============================================================================
// TYPES
// ============================================================================

export type {
  FieldType,
  InputFieldType,
  DisplayFieldType,
  FieldValidation,
  FieldOption,
  BaseFieldProps,
  FormFieldProps,
  TextFieldProps,
  TextareaFieldProps,
  SliderFieldProps,
  SelectFieldProps,
  YesNoFieldProps,
  CheckboxFieldProps,
  DateFieldProps,
  DateRangeFieldProps,
  HeaderFieldProps,
  StaticTextFieldProps,
  DividerFieldProps,
  FieldRenderContext,
  FieldComponent,
  FieldPropsMap,
  // Composite field value types
  FractionValue,
  RatingWithEvidenceValue,
  OutcomeStatementValue,
  TriggerActionPairValue,
  CheckboxWithTextValue,
  SignatureValue,
  // Composite field props types
  FractionTrackerFieldProps,
  RatingWithEvidenceFieldProps,
  OutcomeStatementFieldProps,
  TriggerActionPairFieldProps,
  CheckboxWithTextFieldProps,
  ChecklistInputFieldProps,
  SignatureFieldProps,
  // Repeatable field value types
  RepeatableItem,
  RepeatableBlockValue,
  RepeatableInlineValue,
  RatingItem,
  RepeatableRatingValue,
  RepeatableFieldDefinition,
  RatingItemDefinition,
  // Repeatable field props types
  RepeatableBlockFieldProps,
  RepeatableInlineFieldProps,
  RepeatableRatingFieldProps,
} from './types'

// ============================================================================
// REGISTRY
// ============================================================================

export {
  fieldRegistry,
  registerField,
  getFieldComponent,
  hasFieldComponent,
  unregisterField,
  getRegisteredTypes,
  getRegistrySize,
  clearRegistry,
  registerFields,
  onRegistryChange,
  renderField,
  type RegistryEventType,
  type RegistryEventListener,
} from './registry'

// ============================================================================
// INPUT COMPONENTS
// ============================================================================

export { TextField } from './text'
export { TextareaField } from './textarea'
export { SliderField } from './slider'
export { SelectField } from './select'
export { YesNoField } from './yes-no'
export { CheckboxField } from './checkbox'
export { DateField, DateRangeField } from './date'

// ============================================================================
// DISPLAY COMPONENTS
// ============================================================================

export { HeaderField, StaticTextField, DividerField } from './display'

// ============================================================================
// COMPOSITE COMPONENTS
// ============================================================================

export { FractionTrackerField } from './fraction-tracker'
export { RatingWithEvidenceField } from './rating-with-evidence'
export { OutcomeStatementField } from './outcome-statement'
export { TriggerActionPairField } from './trigger-action-pair'
export { CheckboxWithTextField } from './checkbox-with-text'
export { ChecklistInputField } from './checklist-input'
export { SignatureField } from './signature'

// ============================================================================
// REPEATABLE COMPONENTS
// ============================================================================

export {
  RepeatableBlockField,
  RepeatableInlineField,
  RepeatableRatingField,
} from './repeatable'

// Repeatable utilities
export {
  generateItemId,
  reorderItems,
  moveItemUp,
  moveItemDown,
  validateItemCount,
  createNewItem,
  removeItemAt,
  insertItemAt,
  updateItemAt,
  getItemTitle,
  hasDuplicateIds,
  ensureUniqueIds,
  type ValidationResult,
} from './repeatable'

// ============================================================================
// AUTO-REGISTRATION
// ============================================================================

import { registerField } from './registry'
import type { FieldComponent } from './types'
import { TextField } from './text'
import { TextareaField } from './textarea'
import { SliderField } from './slider'
import { SelectField } from './select'
import { YesNoField } from './yes-no'
import { CheckboxField } from './checkbox'
import { DateField, DateRangeField } from './date'
import { HeaderField, StaticTextField, DividerField } from './display'
import { FractionTrackerField } from './fraction-tracker'
import { RatingWithEvidenceField } from './rating-with-evidence'
import { OutcomeStatementField } from './outcome-statement'
import { TriggerActionPairField } from './trigger-action-pair'
import { CheckboxWithTextField } from './checkbox-with-text'
import { ChecklistInputField } from './checklist-input'
import { SignatureField } from './signature'
import {
  RepeatableBlockField,
  RepeatableInlineField,
  RepeatableRatingField,
} from './repeatable'

/**
 * Initialize all field components in the registry
 */
export function initializeFieldRegistry(): void {
  // Input fields
  registerField('text', TextField)
  registerField('textarea', TextareaField)
  registerField('slider', SliderField)
  registerField('select', SelectField)
  registerField('yes-no', YesNoField)
  registerField('checkbox', CheckboxField)
  registerField('date', DateField)
  registerField('date-range', DateRangeField)

  // Display fields (cast needed since they have different props than input fields)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  registerField('header', HeaderField as FieldComponent<any>)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  registerField('static-text', StaticTextField as FieldComponent<any>)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  registerField('divider', DividerField as FieldComponent<any>)

  // Composite fields
  registerField('fraction-tracker', FractionTrackerField)
  registerField('rating-with-evidence', RatingWithEvidenceField)
  registerField('outcome-statement', OutcomeStatementField)
  registerField('trigger-action-pair', TriggerActionPairField)
  registerField('checkbox-with-text', CheckboxWithTextField)
  registerField('checklist-input', ChecklistInputField)
  registerField('signature', SignatureField)

  // Repeatable fields
  registerField('repeatable-block', RepeatableBlockField)
  registerField('repeatable-inline', RepeatableInlineField)
  registerField('repeatable-rating', RepeatableRatingField)
}

// Auto-initialize on import
initializeFieldRegistry()
