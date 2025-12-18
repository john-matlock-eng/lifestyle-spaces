/**
 * TemplateUnlockStatus Component
 *
 * Displays the unlock status of a template with visual indicators.
 * Shows lock reason, cooldown time, or availability status.
 *
 * @module templates/TemplateSelectionModal/TemplateUnlockStatus
 */

import type { TemplateUnlockStatusProps } from './types'
import { getStatusLabel, getStatusIcon } from './types'
import './template-selection-modal.css'

/**
 * Format a date string to a relative or absolute time display
 */
function formatCooldownTime(cooldownEndsAt: string): string {
  const endDate = new Date(cooldownEndsAt)
  const now = new Date()
  const diffMs = endDate.getTime() - now.getTime()

  if (diffMs <= 0) {
    return 'Ready now'
  }

  const diffHours = Math.ceil(diffMs / (1000 * 60 * 60))
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))

  if (diffHours < 24) {
    return `${diffHours}h remaining`
  } else if (diffDays === 1) {
    return 'Tomorrow'
  } else if (diffDays <= 7) {
    return `${diffDays} days`
  } else {
    return endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }
}

/**
 * Get display text for blocked reasons
 */
function getBlockReasonText(reason: string): string {
  const reasonMap: Record<string, string> = {
    prerequisite_not_met: 'Prerequisites required',
    cooldown_active: 'In cooldown period',
    frequency_limit: 'Frequency limit reached',
    time_window: 'Not available at this time',
    custom: 'Requirements not met',
  }
  return reasonMap[reason] || reason
}

/**
 * Status indicator component for templates
 *
 * Features:
 * - Visual status icon (lock, checkmark, clock)
 * - Status label text
 * - Cooldown countdown (if applicable)
 * - Blocked reason display (if locked)
 * - Compact mode for inline display
 *
 * @example
 * ```tsx
 * <TemplateUnlockStatus
 *   status="locked"
 *   unlockEvaluation={evaluation}
 *   compact
 *   testId="template-status"
 * />
 * ```
 */
export function TemplateUnlockStatus({
  status,
  unlockEvaluation,
  cooldownEndsAt,
  compact = false,
  testId,
}: TemplateUnlockStatusProps) {
  const statusIcon = getStatusIcon(status)
  const statusLabel = getStatusLabel(status)

  // Determine the primary blocked reason
  const primaryBlockReason = unlockEvaluation?.blockedReasons?.[0]

  const baseClass = compact ? 'template-unlock-status--compact' : 'template-unlock-status'

  return (
    <div
      className={`${baseClass} template-unlock-status--${status}`}
      data-testid={testId}
      aria-label={`Template status: ${statusLabel}`}
    >
      {/* Status Icon */}
      <span
        className="template-unlock-status__icon"
        aria-hidden="true"
        data-testid={testId ? `${testId}-icon` : undefined}
      >
        {statusIcon}
      </span>

      {/* Status Content */}
      <div className="template-unlock-status__content">
        {/* Status Label */}
        <span
          className="template-unlock-status__label"
          data-testid={testId ? `${testId}-label` : undefined}
        >
          {statusLabel}
        </span>

        {/* Additional Info based on status */}
        {!compact && (
          <>
            {/* Cooldown Time */}
            {status === 'cooldown' && cooldownEndsAt && (
              <span
                className="template-unlock-status__cooldown"
                data-testid={testId ? `${testId}-cooldown` : undefined}
              >
                {formatCooldownTime(cooldownEndsAt)}
              </span>
            )}

            {/* Block Reason */}
            {status === 'locked' && primaryBlockReason && (
              <span
                className="template-unlock-status__reason"
                data-testid={testId ? `${testId}-reason` : undefined}
              >
                {getBlockReasonText(primaryBlockReason.reason)}
              </span>
            )}

            {/* Prerequisites List (if locked with dependencies) */}
            {status === 'locked' &&
              unlockEvaluation?.blockedReasons?.some((r) => r.reason === 'prerequisite_not_met') && (
                <div
                  className="template-unlock-status__prerequisites"
                  data-testid={testId ? `${testId}-prerequisites` : undefined}
                >
                  {unlockEvaluation.blockedReasons
                    .filter((r) => r.reason === 'prerequisite_not_met' && r.details?.templateName)
                    .slice(0, 3) // Show max 3 prerequisites
                    .map((r, index) => (
                      <span
                        key={index}
                        className="template-unlock-status__prerequisite-item"
                      >
                        {r.details?.templateName}
                      </span>
                    ))}
                  {unlockEvaluation.blockedReasons.filter(
                    (r) => r.reason === 'prerequisite_not_met'
                  ).length > 3 && (
                    <span className="template-unlock-status__prerequisite-more">
                      +{unlockEvaluation.blockedReasons.filter((r) => r.reason === 'prerequisite_not_met').length - 3} more
                    </span>
                  )}
                </div>
              )}
          </>
        )}
      </div>

      {/* Progress for available recurring templates */}
      {status === 'available' && !compact && unlockEvaluation?.isUnlocked && (
        <div
          className="template-unlock-status__available-badge"
          aria-hidden="true"
        >
          Ready
        </div>
      )}
    </div>
  )
}

export default TemplateUnlockStatus
