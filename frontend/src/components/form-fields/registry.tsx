/**
 * Field Component Registry
 *
 * Central registry for field components, enabling dynamic form rendering.
 *
 * @module form-fields/registry
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
import type { FieldType, FieldComponent, BaseFieldProps } from './types'

// ============================================================================
// TYPE ALIASES
// ============================================================================

/**
 * Maps alternative field type names to their canonical registered types.
 * This allows JSON schemas to use semantic names that map to actual components.
 */
const FIELD_TYPE_ALIASES: Record<string, FieldType> = {
  // JSON uses 'list' for dynamic lists, we use 'checklist-input'
  'list': 'checklist-input',
  // JSON uses 'paragraph' for static text, we use 'static-text'
  'paragraph': 'static-text',
  // JSON uses 'repeatable' generically, we default to 'repeatable-block'
  'repeatable': 'repeatable-block',
  // Additional aliases for flexibility
  'rich-text': 'textarea', // Fallback if rich-text not implemented
  'checkbox_group': 'checklist-input', // Snake_case variant
}

/**
 * Resolve a field type to its canonical registered name
 *
 * @param type - The field type to resolve (may be an alias)
 * @returns The canonical field type name
 *
 * @example
 * ```ts
 * resolveFieldType('list') // returns 'checklist-input'
 * resolveFieldType('text') // returns 'text' (no alias)
 * ```
 */
export function resolveFieldType(type: string): FieldType {
  return (FIELD_TYPE_ALIASES[type] || type) as FieldType
}

// ============================================================================
// REGISTRY IMPLEMENTATION
// ============================================================================

/**
 * Registry mapping field types to their component implementations
 */
const fieldRegistry = new Map<FieldType, FieldComponent<any>>()

/**
 * Registry event listeners
 */
type RegistryEventType = 'register' | 'unregister' | 'clear'
type RegistryEventListener = (type: FieldType, event: RegistryEventType) => void
const listeners = new Set<RegistryEventListener>()

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Register a field component for a specific field type
 *
 * @param type - The field type to register
 * @param component - The component to render for this field type
 *
 * @example
 * ```ts
 * registerField('text', TextField)
 * registerField('select', SelectField)
 * ```
 */
export function registerField<P extends BaseFieldProps>(
  type: FieldType,
  component: FieldComponent<P>
): void {
  fieldRegistry.set(type, component as FieldComponent<any>)
  notifyListeners(type, 'register')
}

/**
 * Get the component registered for a field type
 * Automatically resolves type aliases.
 *
 * @param type - The field type to look up (can be an alias)
 * @returns The registered component or undefined if not found
 *
 * @example
 * ```ts
 * const TextField = getFieldComponent('text')
 * if (TextField) {
 *   return <TextField {...props} />
 * }
 *
 * // Works with aliases too
 * const ListField = getFieldComponent('list') // returns checklist-input component
 * ```
 */
export function getFieldComponent<P extends BaseFieldProps = BaseFieldProps>(
  type: string
): FieldComponent<P> | undefined {
  const resolvedType = resolveFieldType(type)
  return fieldRegistry.get(resolvedType) as FieldComponent<P> | undefined
}

/**
 * Check if a field type is registered
 * Automatically resolves type aliases.
 *
 * @param type - The field type to check (can be an alias)
 * @returns true if the type is registered
 */
export function hasFieldComponent(type: string): boolean {
  const resolvedType = resolveFieldType(type)
  return fieldRegistry.has(resolvedType)
}

/**
 * Unregister a field component
 *
 * @param type - The field type to unregister
 * @returns true if the component was removed, false if it wasn't registered
 */
export function unregisterField(type: FieldType): boolean {
  const result = fieldRegistry.delete(type)
  if (result) {
    notifyListeners(type, 'unregister')
  }
  return result
}

/**
 * Get all registered field types
 *
 * @returns Array of registered field types
 */
export function getRegisteredTypes(): FieldType[] {
  return Array.from(fieldRegistry.keys())
}

/**
 * Get the count of registered components
 *
 * @returns Number of registered components
 */
export function getRegistrySize(): number {
  return fieldRegistry.size
}

/**
 * Clear all registered components
 *
 * Useful for testing or reinitializing the registry.
 */
export function clearRegistry(): void {
  const types = getRegisteredTypes()
  fieldRegistry.clear()
  types.forEach((type) => notifyListeners(type, 'clear'))
}

/**
 * Register multiple field components at once
 *
 * @param components - Map of field types to components
 *
 * @example
 * ```ts
 * registerFields({
 *   text: TextField,
 *   textarea: TextareaField,
 *   select: SelectField,
 * })
 * ```
 */
export function registerFields(
  components: Partial<Record<FieldType, FieldComponent<any>>>
): void {
  Object.entries(components).forEach(([type, component]) => {
    if (component) {
      registerField(type as FieldType, component)
    }
  })
}

// ============================================================================
// EVENT LISTENERS
// ============================================================================

/**
 * Subscribe to registry changes
 *
 * @param listener - Callback function to invoke on changes
 * @returns Unsubscribe function
 *
 * @example
 * ```ts
 * const unsubscribe = onRegistryChange((type, event) => {
 *   console.log(`Field ${type} was ${event}ed`)
 * })
 * // Later...
 * unsubscribe()
 * ```
 */
export function onRegistryChange(listener: RegistryEventListener): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/**
 * Notify all listeners of a registry change
 */
function notifyListeners(type: FieldType, event: RegistryEventType): void {
  listeners.forEach((listener) => {
    try {
      listener(type, event)
    } catch (error) {
      console.error('Error in registry listener:', error)
    }
  })
}

// ============================================================================
// FIELD RENDERER HELPER
// ============================================================================

/**
 * Render a field by type (resolves aliases automatically)
 *
 * @param type - The field type to render (can be an alias)
 * @param props - Props to pass to the field component
 * @returns The rendered field component or null if type not found
 *
 * @example
 * ```tsx
 * function DynamicField({ field, register, error }) {
 *   return renderField(field.type, {
 *     ...field,
 *     register,
 *     error,
 *   })
 * }
 *
 * // Works with aliases
 * renderField('list', props) // renders checklist-input component
 * renderField('paragraph', props) // renders static-text component
 * ```
 */
export function renderField<P extends BaseFieldProps>(
  type: string,
  props: P
): React.ReactElement | null {
  const resolvedType = resolveFieldType(type)
  const Component = fieldRegistry.get(resolvedType)

  if (!Component) {
    console.warn(`No component registered for field type: ${type} (resolved: ${resolvedType})`)
    return null
  }

  const FieldComponent = Component as React.ComponentType<any>
  return <FieldComponent {...props} />
}

// ============================================================================
// EXPORTS
// ============================================================================

export { fieldRegistry, FIELD_TYPE_ALIASES }
export type { RegistryEventType, RegistryEventListener }
