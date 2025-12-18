/**
 * TemplateCard Component
 *
 * Displays a template within a framework detail view.
 * Shows template info, unlock status, and action buttons.
 *
 * @module templates/TemplateSelectionModal/TemplateCard
 */

import { TemplateUnlockStatus } from './TemplateUnlockStatus'
import { getFrequencyLabel, getLifecycleLabel } from './types'
import type { TemplateCardProps } from './types'
import './template-selection-modal.css'

/**
 * Card component for displaying template information within a framework
 *
 * Features:
 * - Order number indicator
 * - Template name and description
 * - Lifecycle and frequency badges
 * - Unlock status indicator
 * - Action buttons (Create/View/Edit/Locked)
 * - Visual distinction for different statuses
 *
 * @example
 * ```tsx
 * <TemplateCard
 *   templateWithStatus={templateData}
 *   orderNumber={1}
 *   onAction={() => handleCreate(template.id)}
 *   onView={() => handleView(entryId)}
 *   onEdit={() => handleEdit(entryId)}
 *   testId="template-card-values"
 * />
 * ```
 */
export function TemplateCard({
  templateWithStatus,
  orderNumber,
  onAction,
  onView,
  onEdit,
  testId,
}: TemplateCardProps): JSX.Element {
  const { template, status, unlockEvaluation, cooldownEndsAt, entryId } = templateWithStatus

  const isLocked = status === 'locked'
  const isInCooldown = status === 'cooldown'
  const isCompleted = status === 'completed'
  const isInProgress = status === 'in_progress'
  const isAvailable = status === 'available'

  const handleKeyDown = (event: React.KeyboardEvent, callback: () => void) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      callback()
    }
  }

  // Determine primary action
  const getPrimaryActionLabel = (): string => {
    if (isLocked) return 'Locked'
    if (isInCooldown) return 'Cooldown'
    if (isInProgress) return 'Continue'
    if (isCompleted && template.lifecycle === 'foundation') return 'View'
    return 'Create'
  }

  const getPrimaryActionDisabled = (): boolean => {
    // Only truly disable cooldown buttons - locked buttons should be clickable
    // to show the locked template modal
    return isInCooldown
  }

  return (
    <div
      className={`template-card template-card--${status}`}
      data-testid={testId}
      data-template-id={template.id}
      data-template-status={status}
    >
      {/* Order Number */}
      <div
        className="template-card__order"
        aria-label={`Step ${orderNumber}`}
        data-testid={testId ? `${testId}-order` : undefined}
      >
        {orderNumber}
      </div>

      {/* Template Content */}
      <div className="template-card__content">
        {/* Header Row */}
        <div className="template-card__header">
          <h4
            className="template-card__name"
            data-testid={testId ? `${testId}-name` : undefined}
          >
            {template.name}
          </h4>

          {/* Lifecycle Badge */}
          <span
            className={`template-card__lifecycle template-card__lifecycle--${template.lifecycle}`}
            data-testid={testId ? `${testId}-lifecycle` : undefined}
          >
            {getLifecycleLabel(template.lifecycle)}
          </span>
        </div>

        {/* Description */}
        <p
          className="template-card__description"
          data-testid={testId ? `${testId}-description` : undefined}
        >
          {template.description}
        </p>

        {/* Metadata Row */}
        <div className="template-card__meta">
          {/* Frequency */}
          {template.frequency && (
            <span
              className="template-card__frequency"
              data-testid={testId ? `${testId}-frequency` : undefined}
            >
              {getFrequencyLabel(template.frequency)}
            </span>
          )}

          {/* Estimated Time */}
          {template.content?.estimatedMinutes && (
            <span
              className="template-card__time"
              data-testid={testId ? `${testId}-time` : undefined}
            >
              ~{template.content.estimatedMinutes} min
            </span>
          )}
        </div>

        {/* Unlock Status (for locked/cooldown templates) */}
        {(isLocked || isInCooldown) && (
          <TemplateUnlockStatus
            status={status}
            unlockEvaluation={unlockEvaluation}
            cooldownEndsAt={cooldownEndsAt}
            compact
            testId={testId ? `${testId}-status` : undefined}
          />
        )}
      </div>

      {/* Action Buttons */}
      <div className="template-card__actions">
        {/* Primary Action */}
        <button
          type="button"
          className={`template-card__action template-card__action--primary template-card__action--${status}`}
          onClick={onAction}
          onKeyDown={(e) => handleKeyDown(e, onAction)}
          disabled={getPrimaryActionDisabled()}
          aria-label={`${getPrimaryActionLabel()} ${template.name}`}
          data-testid={testId ? `${testId}-action` : undefined}
        >
          {getPrimaryActionLabel()}
        </button>

        {/* View Button (if completed or in progress) */}
        {(isCompleted || isInProgress) && entryId && onView && (
          <button
            type="button"
            className="template-card__action template-card__action--secondary"
            onClick={() => onView()}
            onKeyDown={(e) => handleKeyDown(e, () => onView?.())}
            aria-label={`View ${template.name} entry`}
            data-testid={testId ? `${testId}-view` : undefined}
          >
            View
          </button>
        )}

        {/* Edit Button (if in progress) */}
        {isInProgress && entryId && onEdit && (
          <button
            type="button"
            className="template-card__action template-card__action--secondary"
            onClick={() => onEdit()}
            onKeyDown={(e) => handleKeyDown(e, () => onEdit?.())}
            aria-label={`Edit ${template.name} entry`}
            data-testid={testId ? `${testId}-edit` : undefined}
          >
            Edit
          </button>
        )}

        {/* Create New (if completed recurring template) */}
        {isCompleted && template.lifecycle === 'recurring' && (
          <button
            type="button"
            className="template-card__action template-card__action--secondary"
            onClick={onAction}
            onKeyDown={(e) => handleKeyDown(e, onAction)}
            aria-label={`Create new ${template.name} entry`}
            data-testid={testId ? `${testId}-create-new` : undefined}
          >
            + New
          </button>
        )}
      </div>
    </div>
  )
}

export default TemplateCard
