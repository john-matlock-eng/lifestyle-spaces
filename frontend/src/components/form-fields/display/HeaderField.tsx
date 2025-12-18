/**
 * HeaderField Component
 *
 * Display-only section header with level support.
 *
 * @module form-fields/display/HeaderField
 */

import type { HeaderFieldProps } from '../types'
import '../form-fields.css'

/**
 * HeaderField - Section header rendering
 *
 * @example
 * ```tsx
 * <HeaderField
 *   content="Personal Information"
 *   level={2}
 * />
 * ```
 */
export function HeaderField({
  content,
  level = 2,
  className = '',
  testId,
}: HeaderFieldProps) {
  const Tag = `h${level}` as 'h1' | 'h2' | 'h3'
  const levelClass = `field-header--level-${level}`

  return (
    <Tag
      className={`field-header ${levelClass} ${className}`}
      data-testid={testId}
    >
      {content}
    </Tag>
  )
}

export default HeaderField
