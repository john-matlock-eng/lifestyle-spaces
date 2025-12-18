/**
 * Field System Type Definitions
 *
 * Defines the field types and configurations used within framework templates.
 * Fields are the building blocks of templates, representing individual input
 * elements like text areas, rating scales, checklists, etc.
 *
 * @module field.types
 */

// ============================================================================
// FIELD TYPE ENUM
// ============================================================================

/**
 * Available field types in the template system
 */
export type FieldType =
  | 'text' // Single-line text input
  | 'textarea' // Multi-line text input
  | 'rich_text' // Rich text editor (TipTap)
  | 'number' // Numeric input
  | 'rating' // Star/scale rating
  | 'slider' // Slider input
  | 'select' // Dropdown selection
  | 'multi_select' // Multi-select dropdown
  | 'checkbox' // Single checkbox
  | 'checkbox_group' // Group of checkboxes
  | 'radio' // Radio button group
  | 'date' // Date picker
  | 'time' // Time picker
  | 'datetime' // Date and time picker
  | 'list' // Ordered/unordered list
  | 'tags' // Tag input
  | 'emotions' // Emotion selector
  | 'values' // Values reference field
  | 'goals' // Goals reference field
  | 'repeatable' // Repeatable item group
  | 'section_break' // Visual section divider
  | 'heading' // Display heading (no input)
  | 'paragraph' // Display paragraph (no input)

// ============================================================================
// FIELD VALIDATION
// ============================================================================

/**
 * Validation rules for a field
 */
export interface FieldValidation {
  /** Whether this field is required */
  required?: boolean
  /** Custom message for required validation */
  requiredMessage?: string
  /** Minimum length for text fields */
  minLength?: number
  /** Maximum length for text fields */
  maxLength?: number
  /** Minimum value for numeric fields */
  min?: number
  /** Maximum value for numeric fields */
  max?: number
  /** Minimum items for list/multi-select fields */
  minItems?: number
  /** Maximum items for list/multi-select fields */
  maxItems?: number
  /** Regular expression pattern for text fields */
  pattern?: string
  /** Custom message for pattern validation */
  patternMessage?: string
  /** Custom error message when validation fails */
  errorMessage?: string
  /** Custom validation function name (for complex validation) */
  customValidator?: string
  /** Custom validation function */
  custom?: (value: unknown, allValues: Record<string, unknown>) => boolean | string
}

// ============================================================================
// FIELD BINDING
// ============================================================================

/**
 * Data binding configuration for a field
 */
export interface FieldBinding {
  /**
   * Binding expression using dot notation
   * e.g., "values_discovery.core_values" or "user.displayName"
   */
  expression: string
  /**
   * How the binding should be applied
   * - 'prefill': Pre-populate the field, user can modify
   * - 'readonly': Display bound value, user cannot modify
   * - 'reference': Display as reference, stored separately
   */
  mode: 'prefill' | 'readonly' | 'reference'
  /**
   * Transform to apply to the bound data
   */
  transform?: string
  /**
   * Fallback value if binding cannot be resolved
   */
  fallback?: unknown
}

// ============================================================================
// FIELD OPTIONS (for select, radio, checkbox groups)
// ============================================================================

/**
 * Option for select, radio, or checkbox group fields
 */
export interface FieldOption {
  /** Unique value for this option */
  value: string
  /** Display label for this option */
  label: string
  /** Optional description or help text */
  description?: string
  /** Optional icon (emoji or icon name) */
  icon?: string
  /** Whether this option is disabled */
  disabled?: boolean
  /** Display order */
  order?: number
}

// ============================================================================
// TYPE-SPECIFIC FIELD CONFIGURATIONS
// ============================================================================

/**
 * Configuration for text and textarea fields
 */
export interface TextFieldConfig {
  /** Placeholder text */
  placeholder?: string
  /** Default value */
  defaultValue?: string
  /** Number of rows for textarea */
  rows?: number
  /** Whether to auto-resize textarea */
  autoResize?: boolean
  /** Character counter display */
  showCharCount?: boolean
  /** Input mask pattern */
  mask?: string
}

/**
 * Configuration for rich text fields
 */
export interface RichTextFieldConfig {
  /** Placeholder text */
  placeholder?: string
  /** Default value (HTML string) */
  defaultValue?: string
  /** Minimum editor height */
  minHeight?: number
  /** Maximum editor height */
  maxHeight?: number
  /** Enabled toolbar features */
  toolbarFeatures?: (
    | 'bold'
    | 'italic'
    | 'underline'
    | 'strike'
    | 'heading'
    | 'bulletList'
    | 'orderedList'
    | 'blockquote'
    | 'codeBlock'
    | 'link'
    | 'image'
    | 'highlight'
  )[]
}

/**
 * Configuration for number fields
 */
export interface NumberFieldConfig {
  /** Placeholder text */
  placeholder?: string
  /** Default value */
  defaultValue?: number
  /** Step increment */
  step?: number
  /** Number of decimal places */
  decimals?: number
  /** Prefix (e.g., "$") */
  prefix?: string
  /** Suffix (e.g., "%") */
  suffix?: string
  /** Format for display (e.g., "currency", "percentage") */
  format?: string
}

/**
 * Configuration for rating fields
 */
export interface RatingFieldConfig {
  /** Default value */
  defaultValue?: number
  /** Maximum rating value */
  maxRating?: number
  /** Icon to use (e.g., "star", "heart") */
  icon?: string
  /** Whether to allow half ratings */
  allowHalf?: boolean
  /** Labels for each rating level */
  labels?: string[]
  /** Size of rating icons */
  size?: 'sm' | 'md' | 'lg'
}

/**
 * Configuration for slider fields
 */
export interface SliderFieldConfig {
  /** Default value */
  defaultValue?: number
  /** Minimum value */
  min?: number
  /** Maximum value */
  max?: number
  /** Step increment */
  step?: number
  /** Whether to show value tooltip */
  showTooltip?: boolean
  /** Whether to show tick marks */
  showTicks?: boolean
  /** Labels for min and max ends */
  rangeLabels?: { min: string; max: string }
  /** Specific tick mark labels */
  tickLabels?: Record<number, string>
}

/**
 * Configuration for select and multi-select fields
 */
export interface SelectFieldConfig {
  /** Placeholder text */
  placeholder?: string
  /** Default value(s) */
  defaultValue?: string | string[]
  /** Available options */
  options: FieldOption[]
  /** Whether options are searchable */
  searchable?: boolean
  /** Whether user can create new options */
  creatable?: boolean
  /** Whether to clear selection on select (multi-select) */
  closeOnSelect?: boolean
  /** Group options by category */
  groupBy?: string
}

/**
 * Configuration for checkbox fields
 */
export interface CheckboxFieldConfig {
  /** Default checked state */
  defaultValue?: boolean
  /** Label position relative to checkbox */
  labelPosition?: 'left' | 'right'
  /** Additional description below label */
  description?: string
}

/**
 * Configuration for checkbox group fields
 */
export interface CheckboxGroupFieldConfig {
  /** Default selected values */
  defaultValue?: string[]
  /** Available options */
  options: FieldOption[]
  /** Layout direction */
  layout?: 'vertical' | 'horizontal' | 'grid'
  /** Number of columns for grid layout */
  columns?: number
}

/**
 * Configuration for radio fields
 */
export interface RadioFieldConfig {
  /** Default selected value */
  defaultValue?: string
  /** Available options */
  options: FieldOption[]
  /** Layout direction */
  layout?: 'vertical' | 'horizontal'
}

/**
 * Configuration for date/time fields
 */
export interface DateTimeFieldConfig {
  /** Placeholder text */
  placeholder?: string
  /** Default value (ISO string or "today", "now") */
  defaultValue?: string
  /** Minimum selectable date (ISO string or relative like "-30d") */
  minDate?: string
  /** Maximum selectable date (ISO string or relative like "+1y") */
  maxDate?: string
  /** Date format for display */
  format?: string
  /** Whether to include time */
  includeTime?: boolean
  /** Time format (12h or 24h) */
  timeFormat?: '12h' | '24h'
  /** Minute step for time picker */
  minuteStep?: number
}

/**
 * Configuration for list fields
 */
export interface ListFieldConfig {
  /** Default items */
  defaultValue?: string[]
  /** Placeholder for new items */
  itemPlaceholder?: string
  /** Whether items are orderable */
  orderable?: boolean
  /** Whether list is numbered or bulleted */
  listStyle?: 'numbered' | 'bulleted' | 'none'
  /** Maximum number of items */
  maxItems?: number
  /** Minimum number of items */
  minItems?: number
}

/**
 * Configuration for tags fields
 */
export interface TagsFieldConfig {
  /** Default tags */
  defaultValue?: string[]
  /** Placeholder text */
  placeholder?: string
  /** Maximum number of tags */
  maxTags?: number
  /** Available tag suggestions */
  suggestions?: string[]
  /** Whether to allow custom tags */
  allowCustom?: boolean
  /** Tag color scheme */
  colorScheme?: string
}

/**
 * Configuration for emotion selector fields
 */
export interface EmotionFieldConfig {
  /** Default selected emotions */
  defaultValue?: string[]
  /** Maximum selectable emotions */
  maxSelections?: number
  /** Available emotion categories to show */
  categories?: string[]
  /** Display style */
  displayStyle?: 'grid' | 'carousel' | 'dropdown'
}

/**
 * Configuration for values reference fields
 */
export interface ValuesFieldConfig {
  /** Source framework entry to reference */
  sourceEntry?: string
  /** Field path to values list */
  sourcePath?: string
  /** Maximum values to display */
  maxDisplay?: number
  /** Display style */
  displayStyle?: 'chips' | 'list' | 'inline'
  /** Whether values are selectable */
  selectable?: boolean
}

/**
 * Configuration for goals reference fields
 */
export interface GoalsFieldConfig {
  /** Source framework entry to reference */
  sourceEntry?: string
  /** Field path to goals list */
  sourcePath?: string
  /** Whether to show goal progress */
  showProgress?: boolean
  /** Filter by goal status */
  statusFilter?: ('active' | 'completed' | 'paused')[]
  /** Display style */
  displayStyle?: 'cards' | 'list' | 'compact'
}

/**
 * Configuration for repeatable fields
 */
export interface RepeatableFieldConfig {
  /** Minimum number of items */
  minItems?: number
  /** Maximum number of items */
  maxItems?: number
  /** Default number of items to show initially */
  defaultItems?: number
  /** Label for add button */
  addLabel?: string
  /** Label for remove button */
  removeLabel?: string
  /** Child field IDs that make up each item */
  itemFields: string[]
  /** Whether items can be reordered */
  orderable?: boolean
  /** Layout for item fields */
  itemLayout?: 'vertical' | 'horizontal' | 'grid'
}

/**
 * Configuration for display-only fields (heading, paragraph, section_break)
 */
export interface DisplayFieldConfig {
  /** Content to display */
  content?: string
  /** Heading level (for heading type) */
  level?: 1 | 2 | 3 | 4 | 5 | 6
  /** Text alignment */
  align?: 'left' | 'center' | 'right'
  /** Additional CSS class */
  cssClass?: string
}

// ============================================================================
// UNIFIED FIELD CONFIG TYPE
// ============================================================================

/**
 * Union type of all field configurations
 */
export type FieldConfig =
  | TextFieldConfig
  | RichTextFieldConfig
  | NumberFieldConfig
  | RatingFieldConfig
  | SliderFieldConfig
  | SelectFieldConfig
  | CheckboxFieldConfig
  | CheckboxGroupFieldConfig
  | RadioFieldConfig
  | DateTimeFieldConfig
  | ListFieldConfig
  | TagsFieldConfig
  | EmotionFieldConfig
  | ValuesFieldConfig
  | GoalsFieldConfig
  | RepeatableFieldConfig
  | DisplayFieldConfig

// ============================================================================
// FIELD DEFINITION
// ============================================================================

/**
 * Complete field definition within a template
 */
export interface FieldDefinition {
  /** Unique identifier for this field within the template */
  id: string
  /** The type of field */
  type: FieldType
  /** Display label for the field */
  label: string
  /** Help text or description shown below the field */
  helpText?: string
  /** Placeholder text (where applicable) */
  placeholder?: string
  /** Validation rules */
  validation?: FieldValidation
  /** Data binding configuration */
  binding?: FieldBinding
  /** Type-specific configuration */
  config?: FieldConfig
  /** Conditional display expression */
  showIf?: string
  /** Whether this field is disabled */
  disabled?: boolean
  /** Whether this field is read-only */
  readOnly?: boolean
  /** Custom CSS class */
  cssClass?: string
  /** Display order within the section */
  order?: number
  /** Whether this field is exportable in data outputs */
  exportable?: boolean
  /** Key for data binding outputs */
  outputKey?: string
}

// ============================================================================
// BASE FIELD PROPS (for React components)
// ============================================================================

/**
 * Base props shared by all field components
 */
export interface BaseFieldProps {
  /** Field definition */
  field: FieldDefinition
  /** Current field value */
  value: unknown
  /** Value change handler */
  onChange: (value: unknown) => void
  /** Blur handler */
  onBlur?: () => void
  /** Validation error message */
  error?: string
  /** Whether field is disabled */
  disabled?: boolean
  /** Whether field is read-only */
  readOnly?: boolean
  /** Additional CSS class */
  className?: string
}

/**
 * Props for text field component
 */
export interface TextFieldProps extends Omit<BaseFieldProps, 'field' | 'value' | 'onChange'> {
  field: FieldDefinition & { type: 'text' | 'textarea'; config?: TextFieldConfig }
  value: string
  onChange: (value: string) => void
}

/**
 * Props for rich text field component
 */
export interface RichTextFieldProps extends Omit<BaseFieldProps, 'field' | 'value' | 'onChange'> {
  field: FieldDefinition & { type: 'rich_text'; config?: RichTextFieldConfig }
  value: string
  onChange: (value: string) => void
}

/**
 * Props for number field component
 */
export interface NumberFieldProps extends Omit<BaseFieldProps, 'field' | 'value' | 'onChange'> {
  field: FieldDefinition & { type: 'number'; config?: NumberFieldConfig }
  value: number | null
  onChange: (value: number | null) => void
}

/**
 * Props for rating field component
 */
export interface RatingFieldProps extends Omit<BaseFieldProps, 'field' | 'value' | 'onChange'> {
  field: FieldDefinition & { type: 'rating'; config?: RatingFieldConfig }
  value: number
  onChange: (value: number) => void
}

/**
 * Props for slider field component
 */
export interface SliderFieldProps extends Omit<BaseFieldProps, 'field' | 'value' | 'onChange'> {
  field: FieldDefinition & { type: 'slider'; config?: SliderFieldConfig }
  value: number
  onChange: (value: number) => void
}

/**
 * Props for select field component
 */
export interface SelectFieldProps extends Omit<BaseFieldProps, 'field' | 'value' | 'onChange'> {
  field: FieldDefinition & { type: 'select'; config?: SelectFieldConfig }
  value: string | null
  onChange: (value: string | null) => void
}

/**
 * Props for multi-select field component
 */
export interface MultiSelectFieldProps extends Omit<BaseFieldProps, 'field' | 'value' | 'onChange'> {
  field: FieldDefinition & { type: 'multi_select'; config?: SelectFieldConfig }
  value: string[]
  onChange: (value: string[]) => void
}

/**
 * Props for checkbox field component
 */
export interface CheckboxFieldProps extends Omit<BaseFieldProps, 'field' | 'value' | 'onChange'> {
  field: FieldDefinition & { type: 'checkbox'; config?: CheckboxFieldConfig }
  value: boolean
  onChange: (value: boolean) => void
}

/**
 * Props for checkbox group field component
 */
export interface CheckboxGroupFieldProps extends Omit<BaseFieldProps, 'field' | 'value' | 'onChange'> {
  field: FieldDefinition & { type: 'checkbox_group'; config?: CheckboxGroupFieldConfig }
  value: string[]
  onChange: (value: string[]) => void
}

/**
 * Props for radio field component
 */
export interface RadioFieldProps extends Omit<BaseFieldProps, 'field' | 'value' | 'onChange'> {
  field: FieldDefinition & { type: 'radio'; config?: RadioFieldConfig }
  value: string | null
  onChange: (value: string | null) => void
}

/**
 * Props for date/time field component
 */
export interface DateTimeFieldProps extends Omit<BaseFieldProps, 'field' | 'value' | 'onChange'> {
  field: FieldDefinition & { type: 'date' | 'time' | 'datetime'; config?: DateTimeFieldConfig }
  value: string | null
  onChange: (value: string | null) => void
}

/**
 * Props for list field component
 */
export interface ListFieldProps extends Omit<BaseFieldProps, 'field' | 'value' | 'onChange'> {
  field: FieldDefinition & { type: 'list'; config?: ListFieldConfig }
  value: string[]
  onChange: (value: string[]) => void
}

/**
 * Props for tags field component
 */
export interface TagsFieldProps extends Omit<BaseFieldProps, 'field' | 'value' | 'onChange'> {
  field: FieldDefinition & { type: 'tags'; config?: TagsFieldConfig }
  value: string[]
  onChange: (value: string[]) => void
}

/**
 * Props for emotion field component
 */
export interface EmotionFieldProps extends Omit<BaseFieldProps, 'field' | 'value' | 'onChange'> {
  field: FieldDefinition & { type: 'emotions'; config?: EmotionFieldConfig }
  value: string[]
  onChange: (value: string[]) => void
}

// ============================================================================
// TYPE GUARDS
// ============================================================================

/**
 * All valid field types
 */
const FIELD_TYPES: FieldType[] = [
  'text',
  'textarea',
  'rich_text',
  'number',
  'rating',
  'slider',
  'select',
  'multi_select',
  'checkbox',
  'checkbox_group',
  'radio',
  'date',
  'time',
  'datetime',
  'list',
  'tags',
  'emotions',
  'values',
  'goals',
  'repeatable',
  'section_break',
  'heading',
  'paragraph',
]

/**
 * Type guard to check if a value is a valid FieldType
 */
export function isFieldType(value: unknown): value is FieldType {
  return typeof value === 'string' && FIELD_TYPES.includes(value as FieldType)
}

/**
 * Type guard to check if an object is a valid FieldDefinition
 */
export function isFieldDefinition(value: unknown): value is FieldDefinition {
  if (typeof value !== 'object' || value === null) return false
  const obj = value as Record<string, unknown>
  return (
    typeof obj.id === 'string' &&
    isFieldType(obj.type) &&
    typeof obj.label === 'string'
  )
}

/**
 * Type guard to check if an object is a valid FieldOption
 */
export function isFieldOption(value: unknown): value is FieldOption {
  if (typeof value !== 'object' || value === null) return false
  const obj = value as Record<string, unknown>
  return typeof obj.value === 'string' && typeof obj.label === 'string'
}

/**
 * Type guard to check if an object is a valid FieldValidation
 */
export function isFieldValidation(value: unknown): value is FieldValidation {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false
  // FieldValidation has all optional properties, so any object is technically valid
  // We check that if properties exist, they have correct types
  const obj = value as Record<string, unknown>
  if (obj.required !== undefined && typeof obj.required !== 'boolean') return false
  if (obj.minLength !== undefined && typeof obj.minLength !== 'number') return false
  if (obj.maxLength !== undefined && typeof obj.maxLength !== 'number') return false
  if (obj.min !== undefined && typeof obj.min !== 'number') return false
  if (obj.max !== undefined && typeof obj.max !== 'number') return false
  if (obj.minItems !== undefined && typeof obj.minItems !== 'number') return false
  if (obj.maxItems !== undefined && typeof obj.maxItems !== 'number') return false
  if (obj.pattern !== undefined && typeof obj.pattern !== 'string') return false
  if (obj.errorMessage !== undefined && typeof obj.errorMessage !== 'string') return false
  return true
}

/**
 * Check if a field type is a display-only type (no user input)
 */
export function isDisplayFieldType(type: FieldType): boolean {
  return ['section_break', 'heading', 'paragraph'].includes(type)
}

/**
 * Check if a field type supports multiple values
 */
export function isMultiValueFieldType(type: FieldType): boolean {
  return ['multi_select', 'checkbox_group', 'list', 'tags', 'emotions'].includes(type)
}

/**
 * Check if a field type has options
 */
export function isOptionFieldType(type: FieldType): boolean {
  return ['select', 'multi_select', 'checkbox_group', 'radio'].includes(type)
}
