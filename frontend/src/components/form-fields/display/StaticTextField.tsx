/**
 * StaticTextField Component
 *
 * Display-only text with variant styling.
 *
 * @module form-fields/display/StaticTextField
 */

import type { StaticTextFieldProps } from '../types'
import '../form-fields.css'

/**
 * StaticTextField - Non-editable text display
 *
 * @example
 * ```tsx
 * <StaticTextField
 *   content="This is informational text."
 *   variant="body"
 * />
 * ```
 */
export function StaticTextField({
  content,
  variant = 'body',
  className = '',
  testId,
}: StaticTextFieldProps): JSX.Element {
  const variantClass = `field-static-text--${variant}`

  return (
    <p
      className={`field-static-text ${variantClass} ${className}`}
      data-testid={testId}
    >
      {content}
    </p>
  )
}

export default StaticTextField
