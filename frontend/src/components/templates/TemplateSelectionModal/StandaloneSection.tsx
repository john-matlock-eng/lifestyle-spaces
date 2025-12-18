/**
 * StandaloneSection Component
 *
 * Section displaying standalone templates that are not part of any framework.
 * Provides a grid view of simple template cards.
 *
 * @module templates/TemplateSelectionModal/StandaloneSection
 */

import { getFrequencyLabel } from './types'
import type { StandaloneSectionProps, StandaloneTemplate } from './types'
import './template-selection-modal.css'

/**
 * Card component for standalone templates
 */
function StandaloneCard({
  template,
  onClick,
  testId,
}: {
  template: StandaloneTemplate
  onClick: () => void
  testId?: string
}): JSX.Element {
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      onClick()
    }
  }

  return (
    <div
      className="standalone-card"
      onClick={onClick}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
      aria-label={`Create ${template.name} entry`}
      data-testid={testId}
    >
      {/* Template Icon */}
      <div
        className="standalone-card__icon"
        style={{ backgroundColor: template.color || 'var(--color-secondary)' }}
        data-testid={testId ? `${testId}-icon` : undefined}
      >
        {template.icon || template.name.charAt(0).toUpperCase()}
      </div>

      {/* Template Content */}
      <div className="standalone-card__content">
        <h4 className="standalone-card__name" data-testid={testId ? `${testId}-name` : undefined}>
          {template.name}
        </h4>

        <p className="standalone-card__description" data-testid={testId ? `${testId}-description` : undefined}>
          {template.description}
        </p>

        {/* Metadata */}
        <div className="standalone-card__meta">
          {template.frequency && (
            <span className="standalone-card__frequency">
              {getFrequencyLabel(template.frequency)}
            </span>
          )}
          {template.estimatedMinutes && (
            <span className="standalone-card__time">
              ~{template.estimatedMinutes} min
            </span>
          )}
        </div>

        {/* Tags */}
        {template.tags && template.tags.length > 0 && (
          <div className="standalone-card__tags">
            {template.tags.slice(0, 3).map((tag, index) => (
              <span key={index} className="standalone-card__tag">
                {tag}
              </span>
            ))}
            {template.tags.length > 3 && (
              <span className="standalone-card__tag standalone-card__tag--more">
                +{template.tags.length - 3}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Create Indicator */}
      <div className="standalone-card__action" aria-hidden="true">
        +
      </div>
    </div>
  )
}

/**
 * Section displaying standalone templates
 *
 * Features:
 * - "STANDALONE TEMPLATES" header
 * - Grid of standalone template cards
 * - Empty state when no templates
 * - Tags display for categorization
 *
 * @example
 * ```tsx
 * <StandaloneSection
 *   templates={standaloneTemplates}
 *   onTemplateClick={(id) => handleCreateEntry(id)}
 *   testIdPrefix="modal"
 * />
 * ```
 */
export function StandaloneSection({
  templates,
  onTemplateClick,
  testIdPrefix,
}: StandaloneSectionProps): JSX.Element {
  const baseTestId = testIdPrefix ? `${testIdPrefix}-standalone-section` : 'standalone-section'

  return (
    <section
      className="standalone-section"
      aria-labelledby={`${baseTestId}-heading`}
      data-testid={baseTestId}
    >
      {/* Section Header */}
      <h2
        id={`${baseTestId}-heading`}
        className="standalone-section__header"
        data-testid={`${baseTestId}-header`}
      >
        STANDALONE TEMPLATES
      </h2>

      {/* Template Grid or Empty State */}
      {templates.length > 0 ? (
        <div
          className="standalone-section__grid"
          role="list"
          data-testid={`${baseTestId}-grid`}
        >
          {templates.map((template) => (
            <div key={template.id} role="listitem">
              <StandaloneCard
                template={template}
                onClick={() => onTemplateClick(template.id)}
                testId={`${baseTestId}-card-${template.id}`}
              />
            </div>
          ))}
        </div>
      ) : (
        <div
          className="standalone-section__empty"
          data-testid={`${baseTestId}-empty`}
        >
          <div className="standalone-section__empty-icon" aria-hidden="true">
            📝
          </div>
          <p className="standalone-section__empty-text">
            No standalone templates available
          </p>
          <p className="standalone-section__empty-subtext">
            All templates are organized into frameworks
          </p>
        </div>
      )}
    </section>
  )
}

export default StandaloneSection
