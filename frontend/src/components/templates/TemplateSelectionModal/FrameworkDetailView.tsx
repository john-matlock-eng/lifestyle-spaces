/**
 * FrameworkDetailView Component
 *
 * Detailed view of a framework showing all templates with their status.
 * Includes back navigation, framework metadata, and template list.
 *
 * @module templates/TemplateSelectionModal/FrameworkDetailView
 */

import { TemplateCard } from './TemplateCard'
import { getLifecycleLabel } from './types'
import type { FrameworkDetailViewProps, TemplateWithStatus } from './types'
import './template-selection-modal.css'

/**
 * Group templates by lifecycle for organized display
 */
function groupTemplatesByLifecycle(
  templates: TemplateWithStatus[]
): Record<string, TemplateWithStatus[]> {
  return templates.reduce(
    (groups, template) => {
      const lifecycle = template.template.lifecycle
      if (!groups[lifecycle]) {
        groups[lifecycle] = []
      }
      groups[lifecycle].push(template)
      return groups
    },
    {} as Record<string, TemplateWithStatus[]>
  )
}

/**
 * Order for lifecycle groups
 */
const lifecycleOrder = ['foundation', 'recurring', 'milestone', 'special']

/**
 * Calculate total estimated time for a framework
 */
function calculateTotalTime(templates: TemplateWithStatus[]): {
  setupMinutes: number
  ongoingMinutes: number
} {
  let setupMinutes = 0
  let ongoingMinutes = 0

  templates.forEach(({ template }) => {
    const minutes = template.content?.estimatedMinutes || 0
    if (template.lifecycle === 'foundation') {
      setupMinutes += minutes
    } else if (template.lifecycle === 'recurring') {
      ongoingMinutes += minutes
    }
  })

  return { setupMinutes, ongoingMinutes }
}

/**
 * Detail view component for a selected framework
 *
 * Features:
 * - Back button to return to list
 * - Framework header with icon, name, description
 * - Metadata (setup time, ongoing time, template count)
 * - Progress bar (if started)
 * - Templates grouped by lifecycle
 * - Unlock status for each template
 *
 * @example
 * ```tsx
 * <FrameworkDetailView
 *   framework={selectedFramework}
 *   summary={frameworkSummary}
 *   templates={templatesWithStatus}
 *   onBack={() => setView('list')}
 *   onSelectTemplate={handleCreateEntry}
 *   onViewEntry={handleViewEntry}
 *   onEditEntry={handleEditEntry}
 *   onLockedTemplateClick={handleLockedClick}
 *   testIdPrefix="modal"
 * />
 * ```
 */
export function FrameworkDetailView({
  framework,
  summary,
  templates,
  onBack,
  onSelectTemplate,
  onViewEntry,
  onEditEntry,
  onLockedTemplateClick,
  testIdPrefix,
}: FrameworkDetailViewProps): JSX.Element {
  const baseTestId = testIdPrefix ? `${testIdPrefix}-detail` : 'framework-detail'

  const groupedTemplates = groupTemplatesByLifecycle(templates)
  const { setupMinutes, ongoingMinutes } = calculateTotalTime(templates)

  const completedCount = summary?.completedTemplates || 0
  const totalCount = templates.length
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0

  const handleTemplateAction = (templateWithStatus: TemplateWithStatus) => {
    if (templateWithStatus.status === 'locked' || templateWithStatus.status === 'cooldown') {
      onLockedTemplateClick(templateWithStatus)
    } else if (templateWithStatus.status === 'in_progress' && templateWithStatus.entryId) {
      onEditEntry?.(templateWithStatus.entryId)
    } else {
      onSelectTemplate(templateWithStatus.template.id)
    }
  }

  return (
    <div className="framework-detail" data-testid={baseTestId}>
      {/* Back Button */}
      <button
        type="button"
        className="framework-detail__back"
        onClick={onBack}
        aria-label="Back to frameworks list"
        data-testid={`${baseTestId}-back`}
      >
        ← Back to Frameworks
      </button>

      {/* Framework Header */}
      <header className="framework-detail__header">
        <div
          className="framework-detail__icon"
          style={{ backgroundColor: framework.color || 'var(--color-primary)' }}
          data-testid={`${baseTestId}-icon`}
        >
          {framework.icon || framework.name.charAt(0).toUpperCase()}
        </div>

        <div className="framework-detail__info">
          <h2
            className="framework-detail__name"
            data-testid={`${baseTestId}-name`}
          >
            {framework.name}
          </h2>

          {framework.tagline && (
            <p
              className="framework-detail__tagline"
              data-testid={`${baseTestId}-tagline`}
            >
              {framework.tagline}
            </p>
          )}

          <p
            className="framework-detail__description"
            data-testid={`${baseTestId}-description`}
          >
            {framework.description}
          </p>
        </div>
      </header>

      {/* Framework Metadata */}
      <div className="framework-detail__meta" data-testid={`${baseTestId}-meta`}>
        {/* Template Count */}
        <div className="framework-detail__meta-item">
          <span className="framework-detail__meta-label">Templates</span>
          <span className="framework-detail__meta-value">{totalCount}</span>
        </div>

        {/* Setup Time */}
        {setupMinutes > 0 && (
          <div className="framework-detail__meta-item">
            <span className="framework-detail__meta-label">Setup</span>
            <span className="framework-detail__meta-value">~{setupMinutes} min</span>
          </div>
        )}

        {/* Ongoing Time */}
        {ongoingMinutes > 0 && (
          <div className="framework-detail__meta-item">
            <span className="framework-detail__meta-label">Ongoing</span>
            <span className="framework-detail__meta-value">~{ongoingMinutes} min/session</span>
          </div>
        )}

        {/* Version */}
        {framework.version && (
          <div className="framework-detail__meta-item">
            <span className="framework-detail__meta-label">Version</span>
            <span className="framework-detail__meta-value">{framework.version}</span>
          </div>
        )}
      </div>

      {/* Progress Bar (if started) */}
      {summary && completedCount > 0 && (
        <div className="framework-detail__progress" data-testid={`${baseTestId}-progress`}>
          <div className="framework-detail__progress-header">
            <span className="framework-detail__progress-label">Your Progress</span>
            <span className="framework-detail__progress-count">
              {completedCount}/{totalCount} complete
            </span>
          </div>
          <div className="framework-detail__progress-bar">
            <div
              className="framework-detail__progress-fill"
              style={{ width: `${progressPercent}%` }}
              role="progressbar"
              aria-valuenow={progressPercent}
              aria-valuemin={0}
              aria-valuemax={100}
            />
          </div>
        </div>
      )}

      {/* Template Groups */}
      <div className="framework-detail__templates" data-testid={`${baseTestId}-templates`}>
        {lifecycleOrder.map((lifecycle) => {
          const lifecycleTemplates = groupedTemplates[lifecycle]
          if (!lifecycleTemplates?.length) return null

          return (
            <section
              key={lifecycle}
              className="framework-detail__group"
              data-testid={`${baseTestId}-group-${lifecycle}`}
            >
              <h3 className="framework-detail__group-header">
                {getLifecycleLabel(lifecycle as 'foundation' | 'recurring' | 'milestone' | 'special')}
                <span className="framework-detail__group-count">
                  ({lifecycleTemplates.length})
                </span>
              </h3>

              <div className="framework-detail__template-list" role="list">
                {lifecycleTemplates
                  .sort((a, b) => a.template.order - b.template.order)
                  .map((templateWithStatus, index) => (
                    <div key={templateWithStatus.template.id} role="listitem">
                      <TemplateCard
                        templateWithStatus={templateWithStatus}
                        orderNumber={index + 1}
                        onAction={() => handleTemplateAction(templateWithStatus)}
                        onView={
                          templateWithStatus.entryId && onViewEntry
                            ? () => onViewEntry(templateWithStatus.entryId!)
                            : undefined
                        }
                        onEdit={
                          templateWithStatus.entryId && onEditEntry
                            ? () => onEditEntry(templateWithStatus.entryId!)
                            : undefined
                        }
                        testId={`${baseTestId}-template-${templateWithStatus.template.id}`}
                      />
                    </div>
                  ))}
              </div>
            </section>
          )
        })}

        {/* Empty State */}
        {templates.length === 0 && (
          <div className="framework-detail__empty" data-testid={`${baseTestId}-empty`}>
            <p>No templates available in this framework yet.</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default FrameworkDetailView
