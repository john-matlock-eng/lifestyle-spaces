/**
 * DividerField Component
 *
 * Visual separator with spacing options.
 *
 * @module form-fields/display/DividerField
 */

import type { DividerFieldProps } from '../types'
import '../form-fields.css'

/**
 * DividerField - Visual separator
 *
 * @example
 * ```tsx
 * <DividerField spacing="medium" />
 * ```
 */
export function DividerField({
  className = '',
  spacing = 'medium',
  testId,
}: DividerFieldProps): JSX.Element {
  const spacingClass = `field-divider--${spacing}`

  return (
    <hr
      className={`field-divider ${spacingClass} ${className}`}
      data-testid={testId}
      aria-hidden="true"
    />
  )
}

export default DividerField
