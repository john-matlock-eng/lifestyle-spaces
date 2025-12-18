/**
 * FieldRenderer Component
 *
 * Renders a single field based on its FieldDefinition.
 * Looks up the appropriate component from the registry and handles
 * unknown field types gracefully.
 *
 * @module framework-form/FieldRenderer
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMemo, useCallback, useId } from 'react'
import type { FieldError } from 'react-hook-form'
import type { FieldDefinition } from '@/features/journal/types'
// ResolvedBinding type is used via FieldRendererProps which references it
import { hasFieldComponent, renderField, type FieldType as FormFieldType } from '../form-fields'
import type { FieldRendererProps, UnknownFieldProps } from './types'
import { getBindingMode, getFieldDefaultValue } from './types'
import './framework-form.css'

// ============================================================================
// FIELD TYPE MAPPING
// ============================================================================

/**
 * Map framework field types to form-fields registry types
 */
const fieldTypeMap: Record<string, FormFieldType> = {
  text: 'text',
  textarea: 'textarea',
  rich_text: 'textarea',
  number: 'text',
  rating: 'slider',
  slider: 'slider',
  select: 'select',
  multi_select: 'select',
  checkbox: 'checkbox',
  checkbox_group: 'checkbox',
  radio: 'yes-no',
  date: 'date',
  time: 'date',
  datetime: 'date',
  list: 'checklist-input',
  tags: 'text',
  emotions: 'select',
  values: 'select',
  goals: 'select',
  repeatable: 'repeatable-block',
  section_break: 'divider',
  heading: 'header',
  paragraph: 'static-text',
  // Composite types (direct pass-through)
  'fraction-tracker': 'fraction-tracker',
  'rating-with-evidence': 'rating-with-evidence',
  'outcome-statement': 'outcome-statement',
  'trigger-action-pair': 'trigger-action-pair',
  'checkbox-with-text': 'checkbox-with-text',
  'checklist-input': 'checklist-input',
  signature: 'signature',
  'repeatable-block': 'repeatable-block',
  'repeatable-inline': 'repeatable-inline',
  'repeatable-rating': 'repeatable-rating',
  'yes-no': 'yes-no',
  'date-range': 'date-range',
  header: 'header',
  'static-text': 'static-text',
  divider: 'divider',
}

/**
 * Get the form-fields registry type for a field definition
 */
function getFormFieldType(fieldType: string): FormFieldType | null {
  const mappedType = fieldTypeMap[fieldType]
  if (mappedType && hasFieldComponent(mappedType)) {
    return mappedType
  }
  return null
}

// ============================================================================
// UNKNOWN FIELD COMPONENT
// ============================================================================

/**
 * Fallback component for unknown/unsupported field types
 */
function UnknownField({ field, testId }: UnknownFieldProps) {
  return (
    <div
      className="field-renderer-unknown"
      data-testid={testId}
      role="alert"
    >
      <div className="field-renderer-unknown-icon">?</div>
      <div className="field-renderer-unknown-content">
        <p className="field-renderer-unknown-title">
          Unknown field type: <code>{field.type}</code>
        </p>
        <p className="field-renderer-unknown-description">
          Field "{field.label}" uses an unsupported field type.
        </p>
      </div>
    </div>
  )
}

// ============================================================================
// FIELD RENDERER COMPONENT
// ============================================================================

/**
 * FieldRenderer - Renders a single field based on its definition
 *
 * @example
 * ```tsx
 * <FieldRenderer
 *   field={fieldDefinition}
 *   fieldPath="focusAreas.0.name"
 *   formValues={formValues}
 *   error={errors.focusAreas?.[0]?.name}
 *   onChange={(value) => setValue('focusAreas.0.name', value)}
 *   onBlur={() => trigger('focusAreas.0.name')}
 * />
 * ```
 */
export function FieldRenderer({
  field,
  resolvedBinding,
  formValues,
  fieldPath,
  error,
  disabled = false,
  readOnly = false,
  onChange,
  onBlur,
  testIdPrefix,
}: FieldRendererProps) {
  const generatedId = useId()
  const fieldId = field.id || generatedId
  const testId = testIdPrefix ? `${testIdPrefix}-field-${field.id}` : undefined

  // Determine binding mode
  const bindingMode = useMemo(
    () => getBindingMode(field, resolvedBinding),
    [field, resolvedBinding]
  )

  // Get the current field value
  const currentValue = useMemo(() => {
    // First check form values
    const pathParts = fieldPath.split('.')
    let value: unknown = formValues
    for (const part of pathParts) {
      if (value && typeof value === 'object') {
        value = (value as Record<string, unknown>)[part]
      } else {
        value = undefined
        break
      }
    }

    // Use resolved binding value if available and field not yet touched
    if (value === undefined && resolvedBinding?.success) {
      return resolvedBinding.value
    }

    // Use default value if still undefined
    if (value === undefined) {
      return getFieldDefaultValue(field)
    }

    return value
  }, [formValues, fieldPath, resolvedBinding, field])

  // Determine if field should be disabled
  const isDisabled = useMemo(() => {
    if (disabled) return true
    if (field.disabled) return true
    if (bindingMode === 'readonly') return true
    return false
  }, [disabled, field.disabled, bindingMode])

  // Determine if field should be read-only
  const isReadOnly = useMemo(() => {
    if (readOnly) return true
    if (field.readOnly) return true
    if (bindingMode === 'reference') return true
    return false
  }, [readOnly, field.readOnly, bindingMode])

  // Handle value change
  const handleChange = useCallback(
    (value: unknown) => {
      if (isDisabled || isReadOnly) return
      onChange(value)
    },
    [onChange, isDisabled, isReadOnly]
  )

  // Handle blur (trigger validation on field blur)
  // Note: This is called by the form but not passed to buildFieldProps
  // as individual fields handle their own blur events
  useCallback(() => {
    onBlur?.()
  }, [onBlur])

  // Hidden fields should not render
  if (bindingMode === 'hidden') {
    return null
  }

  // Get the form-fields registry type
  const formFieldType = getFormFieldType(field.type)

  // Handle unknown field types
  if (!formFieldType) {
    return <UnknownField field={field} testId={testId} />
  }

  // Build props for the field component
  const fieldProps = buildFieldProps({
    field,
    fieldId,
    fieldPath,
    formFieldType,
    currentValue,
    error,
    isDisabled,
    isReadOnly,
    handleChange,
    testId,
  })

  // Render the field
  return (
    <div
      className={`field-renderer ${field.cssClass || ''} ${bindingMode !== 'default' ? `field-renderer--${bindingMode}` : ''}`}
      data-field-id={field.id}
      data-field-type={field.type}
      data-testid={testId}
    >
      {bindingMode === 'reference' && resolvedBinding?.success && (
        <div className="field-renderer-reference-badge">
          Referenced from previous entry
        </div>
      )}
      {renderField(formFieldType, fieldProps as any)}
    </div>
  )
}

// ============================================================================
// PROP BUILDERS
// ============================================================================

interface BuildFieldPropsParams {
  field: FieldDefinition
  fieldId: string
  fieldPath: string
  formFieldType: FormFieldType
  currentValue: unknown
  error?: FieldError
  isDisabled: boolean
  isReadOnly: boolean
  handleChange: (value: unknown) => void
  testId?: string
}

/**
 * Build props for the field component based on field type
 */
function buildFieldProps({
  field,
  fieldId,
  fieldPath,
  formFieldType,
  currentValue,
  error,
  isDisabled,
  isReadOnly,
  handleChange,
  testId,
}: BuildFieldPropsParams): Record<string, unknown> {
  const config = field.config as Record<string, unknown> | undefined

  // Base props shared by all fields
  const baseProps: Record<string, unknown> = {
    id: fieldId,
    name: fieldPath,
    label: field.label,
    description: field.helpText,
    placeholder: field.placeholder,
    required: field.validation?.required,
    disabled: isDisabled,
    readOnly: isReadOnly,
    error,
    testId,
    ariaLabel: field.label,
  }

  // Add mock register/watch/setValue for standalone usage
  // These will be overridden by the form context in DynamicFormRenderer
  baseProps.register = createMockRegister(fieldPath, handleChange)
  baseProps.watch = createMockWatch(currentValue)
  baseProps.setValue = createMockSetValue(handleChange)

  // Add type-specific props
  switch (formFieldType) {
    case 'text':
      return {
        ...baseProps,
        maxLength: field.validation?.maxLength ?? config?.maxLength,
        showCharCount: config?.showCharCount ?? !!field.validation?.maxLength,
        inputType: config?.inputType ?? 'text',
        pattern: field.validation?.pattern,
        defaultValue: currentValue as string,
      }

    case 'textarea':
      return {
        ...baseProps,
        maxLength: field.validation?.maxLength ?? config?.maxLength,
        showCharCount: config?.showCharCount ?? !!field.validation?.maxLength,
        rows: config?.rows ?? 4,
        autoResize: config?.autoResize ?? true,
        defaultValue: currentValue as string,
      }

    case 'slider': {
      const sliderConfig = config as { min?: number; max?: number; step?: number; rangeLabels?: { min?: string; max?: string } } | undefined
      return {
        ...baseProps,
        min: field.validation?.min ?? sliderConfig?.min ?? 1,
        max: field.validation?.max ?? sliderConfig?.max ?? 10,
        step: sliderConfig?.step ?? 1,
        showValue: true,
        minLabel: sliderConfig?.rangeLabels?.min,
        maxLabel: sliderConfig?.rangeLabels?.max,
        defaultValue: currentValue as number,
      }
    }

    case 'select':
      return {
        ...baseProps,
        options: config?.options ?? [],
        searchable: config?.searchable ?? false,
        clearable: true,
        defaultValue: currentValue as string,
      }

    case 'checkbox':
      return {
        ...baseProps,
        defaultValue: currentValue as boolean,
      }

    case 'yes-no':
      return {
        ...baseProps,
        yesLabel: config?.yesLabel ?? 'Yes',
        noLabel: config?.noLabel ?? 'No',
        defaultValue: currentValue as boolean,
      }

    case 'date':
    case 'date-range':
      return {
        ...baseProps,
        minDate: config?.minDate,
        maxDate: config?.maxDate,
        defaultValue: currentValue,
      }

    case 'header':
      return {
        ...baseProps,
        level: config?.level ?? 2,
        content: field.label,
      }

    case 'static-text':
      return {
        ...baseProps,
        content: config?.content ?? field.helpText ?? '',
      }

    case 'divider':
      return {
        ...baseProps,
      }

    case 'checklist-input':
      return {
        ...baseProps,
        items: (currentValue as string[]) ?? [],
        minItems: field.validation?.minItems ?? config?.minItems ?? 0,
        maxItems: field.validation?.maxItems ?? config?.maxItems ?? 20,
        defaultValue: currentValue,
      }

    case 'repeatable-block':
    case 'repeatable-inline':
    case 'repeatable-rating':
      return {
        ...baseProps,
        minItems: field.validation?.minItems ?? config?.minItems ?? 0,
        maxItems: field.validation?.maxItems ?? config?.maxItems ?? 20,
        fields: config?.itemFields ?? [],
        reorderable: config?.orderable ?? true,
        defaultValue: currentValue,
      }

    case 'fraction-tracker':
    case 'rating-with-evidence':
    case 'outcome-statement':
    case 'trigger-action-pair':
    case 'checkbox-with-text':
    case 'signature':
      return {
        ...baseProps,
        ...config,
        defaultValue: currentValue,
      }

    default:
      return {
        ...baseProps,
        defaultValue: currentValue,
      }
  }
}

// ============================================================================
// MOCK FORM FUNCTIONS
// ============================================================================

/**
 * Create a mock register function for standalone field usage
 */
function createMockRegister(fieldPath: string, onChange: (value: unknown) => void) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  return (_name: string, _options?: Record<string, unknown>) => ({
    name: fieldPath,
    onChange: (e: { target: { value: unknown } }) => onChange(e.target.value),
    onBlur: () => {},
    ref: () => {},
  })
}

/**
 * Create a mock watch function for standalone field usage
 */
function createMockWatch(currentValue: unknown) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  return (_name?: string) => currentValue
}

/**
 * Create a mock setValue function for standalone field usage
 */
function createMockSetValue(onChange: (value: unknown) => void) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  return (_name: string, value: unknown, _options?: Record<string, unknown>) => {
    onChange(value)
  }
}

export default FieldRenderer
