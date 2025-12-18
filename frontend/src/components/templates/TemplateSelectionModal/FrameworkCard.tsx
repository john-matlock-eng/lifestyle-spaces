/**
 * FrameworkCard Component
 *
 * Displays a framework with its metadata, progress, and template count.
 * Used within FrameworkSection to allow users to browse available frameworks.
 *
 * @module templates/TemplateSelectionModal/FrameworkCard
 */

import type { FrameworkCardProps } from './types'
import './template-selection-modal.css'

/**
 * Card component for displaying framework information
 *
 * Features:
 * - Framework icon and name
 * - Description preview
 * - Template count badge
 * - Category tag
 * - Progress indicator (if started)
 * - Hover effects with glassmorphism
 *
 * @example
 * ```tsx
 * <FrameworkCard
 *   framework={frameworkData}
 *   onClick={() => setSelectedFramework(framework.id)}
 *   testId="framework-card-stoicism"
 * />
 * ```
 */
export function FrameworkCard({
  framework,
  onClick,
  testId,
}: FrameworkCardProps): JSX.Element {
  const { framework: fw, summary, templateCount, completedCount, category, isStarted } = framework

  const progressPercent = templateCount > 0 ? Math.round((completedCount / templateCount) * 100) : 0

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      onClick()
    }
  }

  return (
    <div
      className="framework-card"
      onClick={onClick}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
      aria-label={`${fw.name} framework with ${templateCount} templates`}
      data-testid={testId}
    >
      {/* Framework Icon */}
      <div
        className="framework-card__icon"
        style={{ backgroundColor: fw.color || 'var(--color-primary)' }}
        data-testid={testId ? `${testId}-icon` : undefined}
      >
        {fw.icon || fw.name.charAt(0).toUpperCase()}
      </div>

      {/* Framework Content */}
      <div className="framework-card__content">
        <h3 className="framework-card__name" data-testid={testId ? `${testId}-name` : undefined}>
          {fw.name}
        </h3>

        <p className="framework-card__description" data-testid={testId ? `${testId}-description` : undefined}>
          {fw.tagline || fw.description}
        </p>

        {/* Metadata Row */}
        <div className="framework-card__meta">
          {/* Category Tag */}
          {category && (
            <span className="framework-card__category" data-testid={testId ? `${testId}-category` : undefined}>
              {category}
            </span>
          )}

          {/* Template Count */}
          <span className="framework-card__count" data-testid={testId ? `${testId}-count` : undefined}>
            {templateCount} {templateCount === 1 ? 'template' : 'templates'}
          </span>
        </div>

        {/* Progress Indicator (shown if started) */}
        {isStarted && (
          <div className="framework-card__progress" data-testid={testId ? `${testId}-progress` : undefined}>
            <div className="framework-card__progress-bar">
              <div
                className="framework-card__progress-fill"
                style={{ width: `${progressPercent}%` }}
                role="progressbar"
                aria-valuenow={progressPercent}
                aria-valuemin={0}
                aria-valuemax={100}
              />
            </div>
            <span className="framework-card__progress-text">
              {completedCount}/{templateCount} complete
            </span>
          </div>
        )}
      </div>

      {/* Hover Arrow Indicator */}
      <div className="framework-card__arrow" aria-hidden="true">
        →
      </div>
    </div>
  )
}

export default FrameworkCard
