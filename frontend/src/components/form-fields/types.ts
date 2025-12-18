/**
 * Form Field Types
 *
 * Base interfaces and types for the dynamic form field system.
 *
 * @module form-fields/types
 */

import type {
  UseFormRegister,
  FieldValues,
  FieldError,
  UseFormWatch,
  UseFormSetValue,
  Control,
  Path,
} from 'react-hook-form'

// ============================================================================
// FIELD TYPE DEFINITIONS
// ============================================================================

/**
 * All supported field types
 */
export type FieldType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'slider'
  | 'select'
  | 'yes-no'
  | 'checkbox'
  | 'date'
  | 'date-range'
  | 'header'
  | 'static-text'
  | 'divider'
  // Composite field types
  | 'fraction-tracker'
  | 'rating-with-evidence'
  | 'outcome-statement'
  | 'trigger-action-pair'
  | 'checkbox-with-text'
  | 'checklist-input'
  | 'signature'
  // Repeatable field types
  | 'repeatable-block'
  | 'repeatable-inline'
  | 'repeatable-rating'

/**
 * Field types that accept user input
 */
export type InputFieldType = Exclude<FieldType, 'header' | 'static-text' | 'divider'>

/**
 * Display-only field types
 */
export type DisplayFieldType = Extract<FieldType, 'header' | 'static-text' | 'divider'>

// ============================================================================
// VALIDATION TYPES
// ============================================================================

/**
 * Validation rule for a field
 */
export interface FieldValidation {
  /** Whether the field is required */
  required?: boolean
  /** Minimum length for text fields */
  minLength?: number
  /** Maximum length for text fields */
  maxLength?: number
  /** Regex pattern for text validation */
  pattern?: string
  /** Minimum value for numeric/slider fields */
  min?: number
  /** Maximum value for numeric/slider fields */
  max?: number
  /** Custom validation message */
  message?: string
}

// ============================================================================
// FIELD OPTION TYPES
// ============================================================================

/**
 * Option for select/dropdown fields
 */
export interface FieldOption {
  /** Unique value for the option */
  value: string
  /** Display label for the option */
  label: string
  /** Optional description for the option */
  description?: string
  /** Whether the option is disabled */
  disabled?: boolean
  /** Optional icon name or component */
  icon?: string
}

// ============================================================================
// BASE FIELD PROPS
// ============================================================================

/**
 * Base props shared by all field components
 */
export interface BaseFieldProps<TFieldValues extends FieldValues = FieldValues> {
  /** Unique field identifier */
  id: string
  /** Field name for form registration */
  name: Path<TFieldValues>
  /** Field label */
  label?: string
  /** Field description/hint text */
  description?: string
  /** Placeholder text */
  placeholder?: string
  /** Whether the field is required */
  required?: boolean
  /** Whether the field is disabled */
  disabled?: boolean
  /** Whether the field is read-only */
  readOnly?: boolean
  /** Error object from react-hook-form */
  error?: FieldError
  /** Additional CSS class names */
  className?: string
  /** Accessible label for screen readers */
  ariaLabel?: string
  /** ID of element describing this field */
  ariaDescribedBy?: string
  /** Test ID for testing */
  testId?: string
}

/**
 * Props for fields that integrate with React Hook Form
 */
export interface FormFieldProps<TFieldValues extends FieldValues = FieldValues>
  extends BaseFieldProps<TFieldValues> {
  /** React Hook Form register function */
  register: UseFormRegister<TFieldValues>
  /** React Hook Form watch function */
  watch?: UseFormWatch<TFieldValues>
  /** React Hook Form setValue function */
  setValue?: UseFormSetValue<TFieldValues>
  /** React Hook Form control for controlled components */
  control?: Control<TFieldValues>
}

// ============================================================================
// TEXT FIELD PROPS
// ============================================================================

/**
 * Props specific to text input fields
 */
export interface TextFieldProps<TFieldValues extends FieldValues = FieldValues>
  extends FormFieldProps<TFieldValues> {
  /** Maximum character length */
  maxLength?: number
  /** Show character counter */
  showCharCount?: boolean
  /** Validation pattern (regex) */
  pattern?: string
  /** Pattern validation error message */
  patternMessage?: string
  /** Input type (text, email, password, etc.) */
  inputType?: 'text' | 'email' | 'password' | 'tel' | 'url'
  /** Autocomplete attribute */
  autoComplete?: string
}

// ============================================================================
// TEXTAREA FIELD PROPS
// ============================================================================

/**
 * Props specific to textarea fields
 */
export interface TextareaFieldProps<TFieldValues extends FieldValues = FieldValues>
  extends FormFieldProps<TFieldValues> {
  /** Maximum character length */
  maxLength?: number
  /** Show character counter */
  showCharCount?: boolean
  /** Number of visible rows */
  rows?: number
  /** Auto-resize height based on content */
  autoResize?: boolean
  /** Maximum height for auto-resize (in pixels) */
  maxHeight?: number
}

// ============================================================================
// NUMBER FIELD PROPS
// ============================================================================

/**
 * Props specific to number input fields
 */
export interface NumberFieldProps<TFieldValues extends FieldValues = FieldValues>
  extends FormFieldProps<TFieldValues> {
  /** Minimum value */
  min?: number
  /** Maximum value */
  max?: number
  /** Step increment */
  step?: number
  /** Default value */
  defaultValue?: number
  /** Show increment/decrement buttons */
  showButtons?: boolean
  /** Prefix text (e.g., "$") */
  prefix?: string
  /** Suffix text (e.g., "%") */
  suffix?: string
}

// ============================================================================
// SLIDER FIELD PROPS
// ============================================================================

/**
 * Props specific to slider/range fields
 */
export interface SliderFieldProps<TFieldValues extends FieldValues = FieldValues>
  extends FormFieldProps<TFieldValues> {
  /** Minimum value */
  min: number
  /** Maximum value */
  max: number
  /** Step increment */
  step?: number
  /** Label for minimum value */
  minLabel?: string
  /** Label for maximum value */
  maxLabel?: string
  /** Show current value display */
  showValue?: boolean
  /** Format function for value display */
  formatValue?: (value: number) => string
  /** Default value */
  defaultValue?: number
}

// ============================================================================
// SELECT FIELD PROPS
// ============================================================================

/**
 * Props specific to select/dropdown fields
 */
export interface SelectFieldProps<TFieldValues extends FieldValues = FieldValues>
  extends FormFieldProps<TFieldValues> {
  /** Available options */
  options: FieldOption[]
  /** Enable search/filter functionality */
  searchable?: boolean
  /** Placeholder for search input */
  searchPlaceholder?: string
  /** Custom option renderer */
  renderOption?: (option: FieldOption) => React.ReactNode
  /** Custom selected value renderer */
  renderValue?: (option: FieldOption | null) => React.ReactNode
  /** Allow clearing selection */
  clearable?: boolean
  /** Empty state message when no options */
  emptyMessage?: string
}

// ============================================================================
// YES/NO FIELD PROPS
// ============================================================================

/**
 * Props specific to yes/no toggle fields
 */
export interface YesNoFieldProps<TFieldValues extends FieldValues = FieldValues>
  extends FormFieldProps<TFieldValues> {
  /** Label for "Yes" option */
  yesLabel?: string
  /** Label for "No" option */
  noLabel?: string
  /** Include "N/A" as third option */
  allowNA?: boolean
  /** Label for "N/A" option */
  naLabel?: string
  /** Default value */
  defaultValue?: boolean | null
}

// ============================================================================
// CHECKBOX FIELD PROPS
// ============================================================================

/**
 * Props specific to checkbox fields
 */
export interface CheckboxFieldProps<TFieldValues extends FieldValues = FieldValues>
  extends FormFieldProps<TFieldValues> {
  /** Label displayed next to checkbox */
  checkboxLabel?: string
  /** Default checked state */
  defaultChecked?: boolean
}

// ============================================================================
// DATE FIELD PROPS
// ============================================================================

/**
 * Props specific to date picker fields
 */
export interface DateFieldProps<TFieldValues extends FieldValues = FieldValues>
  extends FormFieldProps<TFieldValues> {
  /** Default to today's date */
  defaultToday?: boolean
  /** Minimum selectable date */
  minDate?: Date | string
  /** Maximum selectable date */
  maxDate?: Date | string
  /** Date format for display */
  displayFormat?: string
  /** Default value */
  defaultValue?: Date | string
}

/**
 * Props specific to date range fields
 */
export interface DateRangeFieldProps<TFieldValues extends FieldValues = FieldValues>
  extends BaseFieldProps<TFieldValues> {
  /** React Hook Form register function */
  register: UseFormRegister<TFieldValues>
  /** React Hook Form watch function */
  watch?: UseFormWatch<TFieldValues>
  /** React Hook Form setValue function */
  setValue?: UseFormSetValue<TFieldValues>
  /** Field name for start date */
  startName: Path<TFieldValues>
  /** Field name for end date */
  endName: Path<TFieldValues>
  /** Label for start date */
  startLabel?: string
  /** Label for end date */
  endLabel?: string
  /** Minimum selectable date */
  minDate?: Date | string
  /** Maximum selectable date */
  maxDate?: Date | string
  /** Error for start date */
  startError?: FieldError
  /** Error for end date */
  endError?: FieldError
}

// ============================================================================
// DISPLAY FIELD PROPS
// ============================================================================

/**
 * Props for header display fields
 */
export interface HeaderFieldProps {
  /** Header text content */
  content: string
  /** Header level (h1, h2, h3) */
  level?: 1 | 2 | 3
  /** Additional CSS class names */
  className?: string
  /** Test ID for testing */
  testId?: string
}

/**
 * Props for static text display fields
 */
export interface StaticTextFieldProps {
  /** Text content to display */
  content: string
  /** Display variant */
  variant?: 'body' | 'caption' | 'quote'
  /** Additional CSS class names */
  className?: string
  /** Test ID for testing */
  testId?: string
}

/**
 * Props for divider display fields
 */
export interface DividerFieldProps {
  /** Additional CSS class names */
  className?: string
  /** Vertical spacing */
  spacing?: 'small' | 'medium' | 'large'
  /** Test ID for testing */
  testId?: string
}

// ============================================================================
// FIELD RENDER CONTEXT
// ============================================================================

/**
 * Context available when rendering a field
 */
export interface FieldRenderContext<TFieldValues extends FieldValues = FieldValues> {
  /** Current form values */
  values: TFieldValues
  /** Form errors */
  errors: Record<string, FieldError | undefined>
  /** Whether form is submitting */
  isSubmitting: boolean
  /** Whether form has been touched */
  isDirty: boolean
  /** Whether form is valid */
  isValid: boolean
}

// ============================================================================
// FIELD COMPONENT TYPE
// ============================================================================

/**
 * Generic field component type for registry
 */
export type FieldComponent<P = BaseFieldProps> = React.ComponentType<P>

/**
 * Map of field types to their prop types
 */
export interface FieldPropsMap<TFieldValues extends FieldValues = FieldValues> {
  text: TextFieldProps<TFieldValues>
  textarea: TextareaFieldProps<TFieldValues>
  number: NumberFieldProps<TFieldValues>
  slider: SliderFieldProps<TFieldValues>
  select: SelectFieldProps<TFieldValues>
  'yes-no': YesNoFieldProps<TFieldValues>
  checkbox: CheckboxFieldProps<TFieldValues>
  date: DateFieldProps<TFieldValues>
  'date-range': DateRangeFieldProps<TFieldValues>
  header: HeaderFieldProps
  'static-text': StaticTextFieldProps
  divider: DividerFieldProps
  // Composite fields
  'fraction-tracker': FractionTrackerFieldProps<TFieldValues>
  'rating-with-evidence': RatingWithEvidenceFieldProps<TFieldValues>
  'outcome-statement': OutcomeStatementFieldProps<TFieldValues>
  'trigger-action-pair': TriggerActionPairFieldProps<TFieldValues>
  'checkbox-with-text': CheckboxWithTextFieldProps<TFieldValues>
  'checklist-input': ChecklistInputFieldProps<TFieldValues>
  signature: SignatureFieldProps<TFieldValues>
}

// ============================================================================
// COMPOSITE FIELD VALUE TYPES
// ============================================================================

/**
 * Value type for FractionTracker field
 */
export interface FractionValue {
  numerator: number
  denominator: number
}

/**
 * Value type for RatingWithEvidence field
 */
export interface RatingWithEvidenceValue {
  rating: number
  evidence: string
}

/**
 * Value type for OutcomeStatement field
 */
export interface OutcomeStatementValue {
  date: string
  statement: string
}

/**
 * Value type for TriggerActionPair field
 */
export interface TriggerActionPairValue {
  trigger: string
  action: string
}

/**
 * Value type for CheckboxWithText field
 */
export interface CheckboxWithTextValue {
  checked: boolean
  text?: string
}

/**
 * Value type for Signature field
 */
export interface SignatureValue {
  signature: string
  timestamp: string
}

// ============================================================================
// COMPOSITE FIELD PROPS
// ============================================================================

/**
 * Props for FractionTracker field (e.g., 3/5 completed)
 */
export interface FractionTrackerFieldProps<TFieldValues extends FieldValues = FieldValues>
  extends BaseFieldProps<TFieldValues> {
  /** React Hook Form register function */
  register: UseFormRegister<TFieldValues>
  /** React Hook Form watch function */
  watch?: UseFormWatch<TFieldValues>
  /** React Hook Form setValue function */
  setValue?: UseFormSetValue<TFieldValues>
  /** Maximum denominator value */
  maxDenominator?: number
  /** Show quick-fill buttons */
  showQuickFill?: boolean
  /** Default value */
  defaultValue?: FractionValue
}

/**
 * Props for RatingWithEvidence field (slider + textarea combo)
 */
export interface RatingWithEvidenceFieldProps<TFieldValues extends FieldValues = FieldValues>
  extends BaseFieldProps<TFieldValues> {
  /** React Hook Form register function */
  register: UseFormRegister<TFieldValues>
  /** React Hook Form watch function */
  watch?: UseFormWatch<TFieldValues>
  /** React Hook Form setValue function */
  setValue?: UseFormSetValue<TFieldValues>
  /** Minimum rating value */
  min?: number
  /** Maximum rating value */
  max?: number
  /** Rating step increment */
  step?: number
  /** Label for min rating */
  minLabel?: string
  /** Label for max rating */
  maxLabel?: string
  /** Prompt text above evidence textarea */
  evidencePrompt?: string
  /** Placeholder for evidence textarea */
  evidencePlaceholder?: string
  /** Maximum length for evidence */
  evidenceMaxLength?: number
  /** Default value */
  defaultValue?: RatingWithEvidenceValue
}

/**
 * Props for OutcomeStatement field (date + statement combo)
 */
export interface OutcomeStatementFieldProps<TFieldValues extends FieldValues = FieldValues>
  extends BaseFieldProps<TFieldValues> {
  /** React Hook Form register function */
  register: UseFormRegister<TFieldValues>
  /** React Hook Form watch function */
  watch?: UseFormWatch<TFieldValues>
  /** React Hook Form setValue function */
  setValue?: UseFormSetValue<TFieldValues>
  /** Text before the date picker */
  prefixText?: string
  /** Text between date and statement */
  midText?: string
  /** Minimum selectable date */
  minDate?: Date | string
  /** Maximum selectable date */
  maxDate?: Date | string
  /** Placeholder for statement input */
  statementPlaceholder?: string
  /** Maximum length for statement */
  statementMaxLength?: number
  /** Default value */
  defaultValue?: OutcomeStatementValue
}

/**
 * Props for TriggerActionPair field (when/then combo)
 */
export interface TriggerActionPairFieldProps<TFieldValues extends FieldValues = FieldValues>
  extends BaseFieldProps<TFieldValues> {
  /** React Hook Form register function */
  register: UseFormRegister<TFieldValues>
  /** React Hook Form watch function */
  watch?: UseFormWatch<TFieldValues>
  /** React Hook Form setValue function */
  setValue?: UseFormSetValue<TFieldValues>
  /** Label for trigger input */
  triggerLabel?: string
  /** Label for action input */
  actionLabel?: string
  /** Placeholder for trigger input */
  triggerPlaceholder?: string
  /** Placeholder for action input */
  actionPlaceholder?: string
  /** Maximum length for trigger */
  triggerMaxLength?: number
  /** Maximum length for action */
  actionMaxLength?: number
  /** Default value */
  defaultValue?: TriggerActionPairValue
}

/**
 * Props for CheckboxWithText field (checkbox + conditional text input)
 */
export interface CheckboxWithTextFieldProps<TFieldValues extends FieldValues = FieldValues>
  extends BaseFieldProps<TFieldValues> {
  /** React Hook Form register function */
  register: UseFormRegister<TFieldValues>
  /** React Hook Form watch function */
  watch?: UseFormWatch<TFieldValues>
  /** React Hook Form setValue function */
  setValue?: UseFormSetValue<TFieldValues>
  /** Label displayed next to checkbox */
  checkboxLabel: string
  /** Placeholder for text input when enabled */
  textPlaceholder?: string
  /** Hint text shown below text input */
  textHint?: string
  /** Maximum length for text input */
  textMaxLength?: number
  /** Whether text is required when checked */
  textRequired?: boolean
  /** Default value */
  defaultValue?: CheckboxWithTextValue
}

/**
 * Props for ChecklistInput field (dynamic list builder)
 */
export interface ChecklistInputFieldProps<TFieldValues extends FieldValues = FieldValues>
  extends BaseFieldProps<TFieldValues> {
  /** React Hook Form register function */
  register: UseFormRegister<TFieldValues>
  /** React Hook Form watch function */
  watch?: UseFormWatch<TFieldValues>
  /** React Hook Form setValue function */
  setValue?: UseFormSetValue<TFieldValues>
  /** Minimum number of items */
  minItems?: number
  /** Maximum number of items */
  maxItems?: number
  /** Placeholder for new item input */
  itemPlaceholder?: string
  /** Maximum length per item */
  itemMaxLength?: number
  /** Enable drag-to-reorder */
  reorderable?: boolean
  /** Label for add button */
  addButtonLabel?: string
  /** Default value */
  defaultValue?: string[]
}

/**
 * Props for Signature field (commitment signature with timestamp)
 */
export interface SignatureFieldProps<TFieldValues extends FieldValues = FieldValues>
  extends BaseFieldProps<TFieldValues> {
  /** React Hook Form register function */
  register: UseFormRegister<TFieldValues>
  /** React Hook Form watch function */
  watch?: UseFormWatch<TFieldValues>
  /** React Hook Form setValue function */
  setValue?: UseFormSetValue<TFieldValues>
  /** Framing text before signature (e.g., "I commit to...") */
  framingText?: string
  /** Placeholder for signature input */
  signaturePlaceholder?: string
  /** Maximum length for signature */
  signatureMaxLength?: number
  /** Show timestamp */
  showTimestamp?: boolean
  /** Default value */
  defaultValue?: SignatureValue
}

// ============================================================================
// REPEATABLE FIELD VALUE TYPES
// ============================================================================

/**
 * Base item type for repeatable fields
 */
export interface RepeatableItem {
  /** Unique identifier for the item */
  _id: string
  /** Item data */
  [key: string]: unknown
}

/**
 * Value type for RepeatableBlock field
 */
export interface RepeatableBlockValue {
  items: RepeatableItem[]
}

/**
 * Value type for RepeatableInline field
 */
export interface RepeatableInlineValue {
  items: RepeatableItem[]
}

/**
 * Rating item for RepeatableRating field
 */
export interface RatingItem extends RepeatableItem {
  /** Static prompt text */
  prompt: string
  /** Rating value (1-10) */
  rating: number
  /** Evidence/explanation text */
  evidence: string
}

/**
 * Value type for RepeatableRating field
 */
export interface RepeatableRatingValue {
  items: RatingItem[]
}

// ============================================================================
// REPEATABLE FIELD DEFINITION TYPES
// ============================================================================

/**
 * Field definition for use in repeatable blocks
 */
export interface RepeatableFieldDefinition {
  /** Unique field key within the item */
  key: string
  /** Field type to render */
  type: FieldType
  /** Field label */
  label?: string
  /** Field description */
  description?: string
  /** Placeholder text */
  placeholder?: string
  /** Whether the field is required */
  required?: boolean
  /** Additional field-specific props */
  props?: Record<string, unknown>
  /** Default value for the field */
  defaultValue?: unknown
}

// ============================================================================
// REPEATABLE FIELD PROPS
// ============================================================================

/**
 * Props for RepeatableBlock field (full section repeater)
 */
export interface RepeatableBlockFieldProps<TFieldValues extends FieldValues = FieldValues>
  extends BaseFieldProps<TFieldValues> {
  /** React Hook Form register function */
  register: UseFormRegister<TFieldValues>
  /** React Hook Form watch function */
  watch?: UseFormWatch<TFieldValues>
  /** React Hook Form setValue function */
  setValue?: UseFormSetValue<TFieldValues>
  /** React Hook Form control */
  control?: Control<TFieldValues>
  /** Field definitions for each item */
  fields: RepeatableFieldDefinition[]
  /** Minimum number of items */
  minItems?: number
  /** Maximum number of items */
  maxItems?: number
  /** Enable reordering */
  reorderable?: boolean
  /** Item title template (use {{index}} for item number) */
  itemTitleTemplate?: string
  /** Default collapsed state for items */
  defaultCollapsed?: boolean
  /** Label for add button */
  addButtonLabel?: string
  /** Default value */
  defaultValue?: RepeatableBlockValue
}

/**
 * Props for RepeatableInline field (inline item repeater)
 */
export interface RepeatableInlineFieldProps<TFieldValues extends FieldValues = FieldValues>
  extends BaseFieldProps<TFieldValues> {
  /** React Hook Form register function */
  register: UseFormRegister<TFieldValues>
  /** React Hook Form watch function */
  watch?: UseFormWatch<TFieldValues>
  /** React Hook Form setValue function */
  setValue?: UseFormSetValue<TFieldValues>
  /** React Hook Form control */
  control?: Control<TFieldValues>
  /** Field definitions for each item (1-3 fields recommended) */
  fields: RepeatableFieldDefinition[]
  /** Minimum number of items */
  minItems?: number
  /** Maximum number of items */
  maxItems?: number
  /** Enable reordering */
  reorderable?: boolean
  /** Display layout */
  layout?: 'row' | 'compact'
  /** Label for add button */
  addButtonLabel?: string
  /** Default value */
  defaultValue?: RepeatableInlineValue
}

/**
 * Pre-defined rating item for RepeatableRating
 */
export interface RatingItemDefinition {
  /** Unique key for the rating */
  key: string
  /** Prompt text shown to user */
  prompt: string
  /** Default rating value */
  defaultRating?: number
  /** Default evidence text */
  defaultEvidence?: string
}

/**
 * Props for RepeatableRating field (specialized rating list)
 */
export interface RepeatableRatingFieldProps<TFieldValues extends FieldValues = FieldValues>
  extends BaseFieldProps<TFieldValues> {
  /** React Hook Form register function */
  register: UseFormRegister<TFieldValues>
  /** React Hook Form watch function */
  watch?: UseFormWatch<TFieldValues>
  /** React Hook Form setValue function */
  setValue?: UseFormSetValue<TFieldValues>
  /** Pre-defined rating items */
  ratingItems: RatingItemDefinition[]
  /** Minimum rating value */
  min?: number
  /** Maximum rating value */
  max?: number
  /** Rating step increment */
  step?: number
  /** Label for min rating */
  minLabel?: string
  /** Label for max rating */
  maxLabel?: string
  /** Evidence prompt text */
  evidencePrompt?: string
  /** Evidence placeholder */
  evidencePlaceholder?: string
  /** Maximum evidence length */
  evidenceMaxLength?: number
  /** Show evidence textarea */
  showEvidence?: boolean
  /** Default value */
  defaultValue?: RepeatableRatingValue
}
