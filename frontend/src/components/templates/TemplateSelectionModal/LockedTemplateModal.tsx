/**
 * LockedTemplateModal Component
 *
 * Modal explaining why a template is locked and how to unlock it.
 * Shows prerequisites, cooldown information, and navigation options.
 *
 * @module templates/TemplateSelectionModal/LockedTemplateModal
 */

import { TemplateUnlockStatus } from './TemplateUnlockStatus'
import { getFrequencyLabel, getLifecycleLabel } from './types'
import type { LockedTemplateModalProps } from './types'
import './template-selection-modal.css'

/**
 * Format cooldown end time for display
 */
function formatCooldownEnd(cooldownEndsAt: string): string {
  const endDate = new Date(cooldownEndsAt)
  const now = new Date()
  const diffMs = endDate.getTime() - now.getTime()

  if (diffMs <= 0) return 'now'

  const diffHours = Math.ceil(diffMs / (1000 * 60 * 60))
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))

  if (diffHours < 1) return 'less than an hour'
  if (diffHours < 24) return `${diffHours} ${diffHours === 1 ? 'hour' : 'hours'}`
  if (diffDays === 1) return 'tomorrow'
  return `${diffDays} days`
}

/**
 * Modal showing why a template is locked and how to unlock it
 *
 * Features:
 * - Clear explanation of lock reason
 * - List of missing prerequisites
 * - Cooldown countdown (if applicable)
 * - Navigation to prerequisite templates
 * - Back to framework button
 *
 * @example
 * ```tsx
 * <LockedTemplateModal
 *   isOpen={showLockedModal}
 *   onClose={() => setShowLockedModal(false)}
 *   template={lockedTemplate}
 *   framework={currentFramework}
 *   onNavigateToTemplate={handleNavigateToPrereq}
 *   onBackToFramework={handleBackToFramework}
 *   testId="locked-modal"
 * />
 * ```
 */
export function LockedTemplateModal({
  isOpen,
  onClose,
  template,
  framework,
  onNavigateToTemplate,
  onBackToFramework,
  testId,
}: LockedTemplateModalProps): JSX.Element | null {
  if (!isOpen) return null

  const { template: templateData, status, unlockEvaluation, cooldownEndsAt } = template
  const isInCooldown = status === 'cooldown'
  const isLocked = status === 'locked'

  // Get prerequisite templates
  const prerequisiteReasons = unlockEvaluation?.blockedReasons?.filter(
    (r) => r.reason === 'prerequisite_not_met'
  ) || []

  // Find prerequisite template details from framework
  const prerequisiteTemplates = prerequisiteReasons
    .map((reason) => {
      const prereqId = reason.details?.templateId
      if (!prereqId) return null
      const prereqTemplate = framework.templates.find((t) => t.id === prereqId)
      return prereqTemplate
        ? { template: prereqTemplate, reason }
        : { templateId: prereqId, templateName: reason.details?.templateName, reason }
    })
    .filter(Boolean)

  const handleOverlayClick = (event: React.MouseEvent) => {
    if (event.target === event.currentTarget) {
      onClose()
    }
  }

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Escape') {
      onClose()
    }
  }

  return (
    <div
      className="locked-template-modal__overlay"
      onClick={handleOverlayClick}
      onKeyDown={handleKeyDown}
      role="dialog"
      aria-modal="true"
      aria-labelledby={testId ? `${testId}-title` : 'locked-modal-title'}
      data-testid={testId}
    >
      <div className="locked-template-modal" data-testid={testId ? `${testId}-content` : undefined}>
        {/* Close Button */}
        <button
          type="button"
          className="locked-template-modal__close"
          onClick={onClose}
          aria-label="Close modal"
          data-testid={testId ? `${testId}-close` : undefined}
        >
          ×
        </button>

        {/* Header */}
        <header className="locked-template-modal__header">
          <div className="locked-template-modal__icon" aria-hidden="true">
            {isInCooldown ? '⏳' : '🔒'}
          </div>

          <h2
            id={testId ? `${testId}-title` : 'locked-modal-title'}
            className="locked-template-modal__title"
            data-testid={testId ? `${testId}-title` : undefined}
          >
            {isInCooldown ? 'Template in Cooldown' : 'Template Locked'}
          </h2>

          <p className="locked-template-modal__template-name" data-testid={testId ? `${testId}-template-name` : undefined}>
            {templateData.name}
          </p>
        </header>

        {/* Status Display */}
        <div className="locked-template-modal__status">
          <TemplateUnlockStatus
            status={status}
            unlockEvaluation={unlockEvaluation}
            cooldownEndsAt={cooldownEndsAt}
            testId={testId ? `${testId}-unlock-status` : undefined}
          />
        </div>

        {/* Explanation Section */}
        <div className="locked-template-modal__explanation" data-testid={testId ? `${testId}-explanation` : undefined}>
          {/* Cooldown Explanation */}
          {isInCooldown && cooldownEndsAt && (
            <div className="locked-template-modal__cooldown-info">
              <h3>When can I access this?</h3>
              <p>
                This template has a cooldown period to encourage thoughtful reflection.
                It will be available again in <strong>{formatCooldownEnd(cooldownEndsAt)}</strong>.
              </p>
              <p className="locked-template-modal__frequency-note">
                Frequency: {getFrequencyLabel(templateData.frequency)}
              </p>
            </div>
          )}

          {/* Locked Explanation */}
          {isLocked && (
            <div className="locked-template-modal__locked-info">
              <h3>How do I unlock this?</h3>

              {prerequisiteTemplates.length > 0 ? (
                <>
                  <p>
                    Complete the following {prerequisiteTemplates.length === 1 ? 'template' : 'templates'} first:
                  </p>
                  <ul className="locked-template-modal__prerequisites">
                    {prerequisiteTemplates.map((prereq, index) => {
                      if (!prereq) return null
                      const prereqName = 'template' in prereq ? prereq.template.name : prereq.templateName
                      const prereqId = 'template' in prereq ? prereq.template.id : prereq.templateId
                      const prereqLifecycle = 'template' in prereq ? prereq.template.lifecycle : undefined

                      return (
                        <li
                          key={index}
                          className="locked-template-modal__prerequisite-item"
                        >
                          <div className="locked-template-modal__prerequisite-info">
                            <span className="locked-template-modal__prerequisite-name">
                              {prereqName || `Template ${prereqId}`}
                            </span>
                            {prereqLifecycle && (
                              <span className="locked-template-modal__prerequisite-lifecycle">
                                {getLifecycleLabel(prereqLifecycle)}
                              </span>
                            )}
                          </div>
                          {prereqId && onNavigateToTemplate && (
                            <button
                              type="button"
                              className="locked-template-modal__prerequisite-btn"
                              onClick={() => onNavigateToTemplate(prereqId)}
                              data-testid={testId ? `${testId}-prereq-${prereqId}` : undefined}
                            >
                              Go to Template
                            </button>
                          )}
                        </li>
                      )
                    })}
                  </ul>
                </>
              ) : (
                <p>
                  This template has requirements that haven't been met yet.
                  Check the framework guide for more information.
                </p>
              )}
            </div>
          )}
        </div>

        {/* Template Info */}
        <div className="locked-template-modal__template-info" data-testid={testId ? `${testId}-info` : undefined}>
          <h4>About this template</h4>
          <p>{templateData.description}</p>

          <div className="locked-template-modal__template-meta">
            <span className="locked-template-modal__meta-item">
              {getLifecycleLabel(templateData.lifecycle)}
            </span>
            <span className="locked-template-modal__meta-item">
              {getFrequencyLabel(templateData.frequency)}
            </span>
            {templateData.content?.estimatedMinutes && (
              <span className="locked-template-modal__meta-item">
                ~{templateData.content.estimatedMinutes} min
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        <footer className="locked-template-modal__actions">
          <button
            type="button"
            className="locked-template-modal__btn locked-template-modal__btn--secondary"
            onClick={onBackToFramework}
            data-testid={testId ? `${testId}-back` : undefined}
          >
            Back to Framework
          </button>

          {prerequisiteTemplates.length > 0 && onNavigateToTemplate && (
            <button
              type="button"
              className="locked-template-modal__btn locked-template-modal__btn--primary"
              onClick={() => {
                const firstPrereq = prerequisiteTemplates[0]
                if (firstPrereq) {
                  const prereqId = 'template' in firstPrereq ? firstPrereq.template.id : firstPrereq.templateId
                  if (prereqId) onNavigateToTemplate(prereqId)
                }
              }}
              data-testid={testId ? `${testId}-start-prereq` : undefined}
            >
              Start First Prerequisite
            </button>
          )}
        </footer>
      </div>
    </div>
  )
}

export default LockedTemplateModal
