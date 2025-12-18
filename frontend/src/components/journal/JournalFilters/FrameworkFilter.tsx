/**
 * FrameworkFilter Component
 *
 * Dropdown component for filtering journal entries by framework.
 * Supports filtering by specific framework or standalone entries.
 *
 * @module journal/JournalFilters/FrameworkFilter
 */

import { useMemo } from 'react'
import { frameworkRegistry } from '@/features/journal/frameworks'
import './journal-filters.css'

/**
 * Filter value type
 */
export type FrameworkFilterValue = 'all' | 'standalone' | string

/**
 * Framework option for dropdown
 */
interface FrameworkOption {
  id: string
  name: string
  icon?: string
}

/**
 * Props for FrameworkFilter component
 */
export interface FrameworkFilterProps {
  /** Current filter value */
  value: FrameworkFilterValue
  /** Callback when filter changes */
  onChange: (value: FrameworkFilterValue) => void
  /** Available frameworks (optional - uses registry if not provided) */
  frameworks?: FrameworkOption[]
  /** Test ID prefix */
  testId?: string
  /** Disabled state */
  disabled?: boolean
}

/**
 * Framework filter dropdown
 *
 * Features:
 * - "All Entries" option (default)
 * - Divider after "All Entries"
 * - Framework options with icons
 * - Divider after frameworks
 * - "Standalone" option for non-framework entries
 * - Glassmorphism styling
 * - Controlled component
 *
 * @example
 * ```tsx
 * <FrameworkFilter
 *   value={frameworkFilter}
 *   onChange={setFrameworkFilter}
 *   testId="journal-framework-filter"
 * />
 * ```
 */
export function FrameworkFilter({
  value,
  onChange,
  frameworks: externalFrameworks,
  testId = 'framework-filter',
  disabled = false,
}: FrameworkFilterProps) {
  // Get frameworks from registry or use provided
  const frameworks = useMemo(() => {
    if (externalFrameworks) {
      return externalFrameworks
    }
    return frameworkRegistry.getAll({ isActive: true }).map((fw) => ({
      id: fw.id,
      name: fw.name,
      icon: fw.icon,
    }))
  }, [externalFrameworks])

  const handleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    onChange(event.target.value as FrameworkFilterValue)
  }

  return (
    <div className="framework-filter" data-testid={testId}>
      <label
        htmlFor={`${testId}-select`}
        className="framework-filter__label"
      >
        Framework:
      </label>
      <select
        id={`${testId}-select`}
        className="framework-filter__select"
        value={value}
        onChange={handleChange}
        disabled={disabled}
        aria-label="Filter by framework"
        data-testid={`${testId}-select`}
      >
        {/* All Entries option */}
        <option value="all">All Entries</option>

        {/* Divider after All Entries */}
        <option disabled className="framework-filter__divider">
          ─────────────
        </option>

        {/* Framework options */}
        {frameworks.length > 0 && (
          <>
            {frameworks.map((framework) => (
              <option key={framework.id} value={framework.id}>
                {framework.icon || ''} {framework.name}
              </option>
            ))}

            {/* Divider after frameworks */}
            <option disabled className="framework-filter__divider">
              ─────────────
            </option>
          </>
        )}

        {/* Standalone option */}
        <option value="standalone">Standalone (No Framework)</option>
      </select>
    </div>
  )
}

export default FrameworkFilter
