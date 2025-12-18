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
 *
 * @param type - The field type to look up
 * @returns The registered component or undefined if not found
 *
 * @example
 * ```ts
 * const TextField = getFieldComponent('text')
 * if (TextField) {
 *   return <TextField {...props} />
 * }
 * ```
 */
export function getFieldComponent<P extends BaseFieldProps = BaseFieldProps>(
  type: FieldType
): FieldComponent<P> | undefined {
  return fieldRegistry.get(type) as FieldComponent<P> | undefined
}

/**
 * Check if a field type is registered
 *
 * @param type - The field type to check
 * @returns true if the type is registered
 */
export function hasFieldComponent(type: FieldType): boolean {
  return fieldRegistry.has(type)
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
 * Render a field by type
 *
 * @param type - The field type to render
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
 * ```
 */
export function renderField<P extends BaseFieldProps>(
  type: FieldType,
  props: P
): React.ReactElement | null {
  const Component = getFieldComponent(type)
  if (!Component) {
    console.warn(`No component registered for field type: ${type}`)
    return null
  }

  const FieldComponent = Component as React.ComponentType<any>
  return <FieldComponent {...props} />
}

// ============================================================================
// EXPORTS
// ============================================================================

export { fieldRegistry }
export type { RegistryEventType, RegistryEventListener }
