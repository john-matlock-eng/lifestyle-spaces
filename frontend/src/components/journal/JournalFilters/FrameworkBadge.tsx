/**
 * FrameworkBadge Component
 *
 * Displays framework information as a pill badge on journal cards.
 * Shows framework icon, name, and optionally template name.
 *
 * @module journal/JournalFilters/FrameworkBadge
 */

import { useMemo } from 'react'
import { frameworkRegistry } from '@/features/journal/frameworks'
import './journal-filters.css'

/**
 * Props for FrameworkBadge component
 */
export interface FrameworkBadgeProps {
  /** Framework ID */
  frameworkId?: string | null
  /** Template ID (optional, for showing template name) */
  templateId?: string | null
  /** Frequency context (optional, e.g., "Week 8 of Q4") */
  frequencyContext?: string | null
  /** Compact mode (icon + abbreviated name only) */
  compact?: boolean
  /** Test ID */
  testId?: string
}

/**
 * Badge component showing framework information
 *
 * Features:
 * - Framework icon and name
 * - Template name (if provided)
 * - Frequency context (if provided)
 * - Standalone indicator for non-framework entries
 * - Compact mode for limited space
 *
 * @example
 * ```tsx
 * // Framework entry
 * <FrameworkBadge
 *   frameworkId="charter-and-course"
 *   templateId="weekly-scoreboard"
 *   frequencyContext="Week 8 of Q4"
 * />
 *
 * // Standalone entry
 * <FrameworkBadge frameworkId={null} />
 *
 * // Compact mode
 * <FrameworkBadge frameworkId="charter-and-course" compact />
 * ```
 */
export function FrameworkBadge({
  frameworkId,
  templateId,
  frequencyContext,
  compact = false,
  testId = 'framework-badge',
}: FrameworkBadgeProps): JSX.Element | null {
  // Get framework and template info from registry
  const { framework, template } = useMemo(() => {
    if (!frameworkId) {
      return { framework: null, template: null }
    }

    const fw = frameworkRegistry.get(frameworkId)
    if (!fw) {
      return { framework: null, template: null }
    }

    const tmpl = templateId ? fw.templates.find((t) => t.id === templateId) : null
    return { framework: fw, template: tmpl }
  }, [frameworkId, templateId])

  // Standalone entry (no framework)
  if (!frameworkId) {
    return (
      <span
        className="journal-card-framework-badge journal-card-framework-badge--standalone"
        data-testid={testId}
      >
        <span className="journal-card-framework-badge__icon">📝</span>
        <span className="journal-card-framework-badge__name">Standalone</span>
      </span>
    )
  }

  // Framework not found in registry
  if (!framework) {
    return (
      <span
        className="journal-card-framework-badge"
        data-testid={testId}
        title={`Framework: ${frameworkId}`}
      >
        <span className="journal-card-framework-badge__icon">📚</span>
        <span className="journal-card-framework-badge__name">{frameworkId}</span>
      </span>
    )
  }

  // Build display content
  const icon = framework.icon || '📚'
  const name = compact
    ? framework.name.split(' ').map((w) => w[0]).join('').toUpperCase()
    : framework.name

  return (
    <span
      className="journal-card-framework-badge"
      data-testid={testId}
      title={`${framework.name}${template ? ` - ${template.name}` : ''}${frequencyContext ? ` (${frequencyContext})` : ''}`}
    >
      <span className="journal-card-framework-badge__icon">{icon}</span>
      <span className="journal-card-framework-badge__name">{name}</span>
      {!compact && template && (
        <span className="journal-card-framework-badge__template">
          · {template.name}
        </span>
      )}
      {!compact && frequencyContext && (
        <span className="journal-card-framework-badge__template">
          · {frequencyContext}
        </span>
      )}
    </span>
  )
}

export default FrameworkBadge
