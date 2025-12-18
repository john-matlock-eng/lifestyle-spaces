/**
 * FrameworkDashboardPage
 *
 * Detailed view of a single framework with full progress tracking,
 * template list, recent entries, and actions.
 *
 * @module journal/pages/FrameworkDashboardPage
 */

import React, { useMemo } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useFrameworkProgress, type TemplateProgress } from '../hooks/useFrameworkProgress'
import './FrameworkDashboardPage.css'

/**
 * Format relative time
 */
function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffMinutes = Math.floor(diffMs / (1000 * 60))

  if (diffMinutes < 1) return 'just now'
  if (diffMinutes < 60) return `${diffMinutes}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays === 1) return 'yesterday'
  if (diffDays < 7) return `${diffDays} days ago`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`
  return date.toLocaleDateString()
}

/**
 * Get frequency label
 */
function getFrequencyLabel(frequency: string): string {
  const labels: Record<string, string> = {
    'daily': 'Daily',
    'weekly': 'Weekly',
    'monthly': 'Monthly',
    'quarterly': 'Quarterly',
    'yearly': 'Yearly',
    'once': 'One-time',
    'as_needed': 'As needed',
  }
  return labels[frequency] || frequency
}

/**
 * Get lifecycle label
 */
function getLifecycleLabel(lifecycle: string): string {
  const labels: Record<string, string> = {
    'foundation': 'Foundation',
    'recurring': 'Recurring',
    'milestone': 'Milestone',
    'special': 'Special',
  }
  return labels[lifecycle] || lifecycle
}

/**
 * Template card component
 */
const TemplateCard: React.FC<{
  template: TemplateProgress
  frameworkColor: string
  spaceId: string
  onCreateEntry: (templateId: string) => void
}> = ({ template, frameworkColor, spaceId, onCreateEntry }) => {
  const navigate = useNavigate()

  const handleClick = () => {
    if (template.isLocked) return

    if (template.lastEntryId) {
      navigate(`/spaces/${spaceId}/journals/${template.lastEntryId}`)
    } else {
      onCreateEntry(template.templateId)
    }
  }

  return (
    <div
      className={`fwdash-template ${template.isLocked ? 'fwdash-template--locked' : ''} ${template.isCompleted ? 'fwdash-template--completed' : ''} ${template.isOverdue ? 'fwdash-template--overdue' : ''}`}
      onClick={handleClick}
      style={{ '--template-color': frameworkColor } as React.CSSProperties}
    >
      <div className="fwdash-template__header">
        <h4 className="fwdash-template__name">{template.templateName}</h4>
        <div className="fwdash-template__badges">
          {template.isLocked && (
            <span className="fwdash-template__badge fwdash-template__badge--locked">Locked</span>
          )}
          {template.isCompleted && !template.isOverdue && (
            <span className="fwdash-template__badge fwdash-template__badge--complete">Done</span>
          )}
          {template.isOverdue && (
            <span className="fwdash-template__badge fwdash-template__badge--overdue">Overdue</span>
          )}
        </div>
      </div>

      <div className="fwdash-template__meta">
        <span className="fwdash-template__frequency">{getFrequencyLabel(template.frequency)}</span>
        {template.completionCount > 0 && (
          <span className="fwdash-template__count">{template.completionCount} entries</span>
        )}
      </div>

      {/* Streak info for recurring */}
      {template.lifecycle === 'recurring' && template.currentStreak !== undefined && template.currentStreak > 0 && (
        <div className="fwdash-template__streak">
          <span className="fwdash-template__streak-icon">🔥</span>
          <span className="fwdash-template__streak-value">{template.currentStreak} streak</span>
        </div>
      )}

      {/* Last activity */}
      {template.lastCompletedAt && (
        <div className="fwdash-template__activity">
          Last: {formatRelativeTime(template.lastCompletedAt)}
        </div>
      )}

      {/* Locked reason */}
      {template.isLocked && template.missingPrerequisites.length > 0 && (
        <div className="fwdash-template__locked-reason">
          Complete {template.missingPrerequisites.length} prerequisite{template.missingPrerequisites.length > 1 ? 's' : ''} first
        </div>
      )}

      {/* Action */}
      {!template.isLocked && (
        <button
          type="button"
          className={`fwdash-template__action ${template.isOverdue ? 'fwdash-template__action--warning' : ''}`}
          onClick={(e) => {
            e.stopPropagation()
            onCreateEntry(template.templateId)
          }}
        >
          {template.isCompleted && template.lifecycle !== 'foundation'
            ? template.isOverdue ? 'Catch Up' : 'New Entry'
            : 'Start'}
        </button>
      )}
    </div>
  )
}

export const FrameworkDashboardPage: React.FC = () => {
  const { spaceId, frameworkId } = useParams<{ spaceId: string; frameworkId: string }>()
  const navigate = useNavigate()
  const { frameworkProgress, loading, error } = useFrameworkProgress(spaceId)

  // Find the specific framework
  const progress = useMemo(
    () => frameworkProgress.find(fp => fp.frameworkId === frameworkId),
    [frameworkProgress, frameworkId]
  )

  const handleCreateEntry = (templateId: string) => {
    navigate(`/spaces/${spaceId}/journals/new?framework=${frameworkId}&template=${templateId}`)
  }

  const handleBack = () => {
    navigate(`/space/${spaceId}/frameworks`)
  }

  if (loading) {
    return (
      <div className="fwdash">
        <div className="fwdash__loading">
          <div className="fwdash__loading-spinner" />
          <span>Loading framework...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="fwdash">
        <div className="fwdash__error">
          <p>{error}</p>
          <button type="button" className="btn btn-primary" onClick={handleBack}>
            Back to Frameworks
          </button>
        </div>
      </div>
    )
  }

  if (!progress) {
    return (
      <div className="fwdash">
        <div className="fwdash__not-found">
          <h2>Framework Not Found</h2>
          <p>The framework you're looking for doesn't exist.</p>
          <button type="button" className="btn btn-primary" onClick={handleBack}>
            Back to Frameworks
          </button>
        </div>
      </div>
    )
  }

  const { framework, templates } = progress
  const foundationTemplates = templates.filter(t => t.lifecycle === 'foundation')
  const recurringTemplates = templates.filter(t => t.lifecycle === 'recurring')
  const milestoneTemplates = templates.filter(t => t.lifecycle === 'milestone' || t.lifecycle === 'special')

  return (
    <div className="fwdash" style={{ '--framework-color': framework.color || '#6366f1' } as React.CSSProperties}>
      {/* Breadcrumb */}
      <nav className="fwdash__breadcrumb">
        <Link to={`/space/${spaceId}/frameworks`} className="fwdash__breadcrumb-link">
          Frameworks
        </Link>
        <span className="fwdash__breadcrumb-sep">/</span>
        <span className="fwdash__breadcrumb-current">{framework.name}</span>
      </nav>

      {/* Header */}
      <header className="fwdash__header">
        <div
          className="fwdash__icon"
          style={{ backgroundColor: framework.color || '#6366f1' }}
        >
          {framework.icon || framework.name.charAt(0)}
        </div>
        <div className="fwdash__header-content">
          <h1 className="fwdash__title">{framework.name}</h1>
          {framework.tagline && (
            <p className="fwdash__tagline">{framework.tagline}</p>
          )}
        </div>
      </header>

      {/* Progress Overview */}
      <section className="fwdash__overview">
        <div className="fwdash__progress-card">
          <h3 className="fwdash__progress-title">Foundation Progress</h3>
          <div className="fwdash__progress-bar-container">
            <div className="fwdash__progress-bar">
              <div
                className="fwdash__progress-fill"
                style={{ width: `${progress.foundationPercent}%` }}
              />
            </div>
            <span className="fwdash__progress-text">
              {progress.foundationCompleted}/{progress.foundationTotal} complete
            </span>
          </div>
          {progress.isFoundationComplete && (
            <div className="fwdash__complete-badge">Foundation Complete!</div>
          )}
        </div>

        {/* Stats */}
        <div className="fwdash__stats-grid">
          <div className="fwdash__stat">
            <span className="fwdash__stat-value">{progress.totalEntries}</span>
            <span className="fwdash__stat-label">Total Entries</span>
          </div>
          <div className="fwdash__stat">
            <span className="fwdash__stat-value">{progress.recurringActive}</span>
            <span className="fwdash__stat-label">Active Practices</span>
          </div>
          {progress.dailyStreak > 0 && (
            <div className="fwdash__stat fwdash__stat--streak">
              <span className="fwdash__stat-value">🔥 {progress.dailyStreak}</span>
              <span className="fwdash__stat-label">Day Streak</span>
            </div>
          )}
          {progress.weeklyStreak > 0 && (
            <div className="fwdash__stat fwdash__stat--streak">
              <span className="fwdash__stat-value">📅 {progress.weeklyStreak}</span>
              <span className="fwdash__stat-label">Week Streak</span>
            </div>
          )}
        </div>
      </section>

      {/* Next Action */}
      {progress.nextTemplate && (
        <section className="fwdash__next-action">
          <div className={`fwdash__next-card ${progress.nextTemplate.isOverdue ? 'fwdash__next-card--overdue' : ''}`}>
            <div className="fwdash__next-header">
              <span className="fwdash__next-label">
                {progress.nextTemplate.isOverdue ? 'Needs Attention' : 'Suggested Next'}
              </span>
            </div>
            <h3 className="fwdash__next-name">{progress.nextTemplate.templateName}</h3>
            <p className="fwdash__next-meta">
              {getLifecycleLabel(progress.nextTemplate.lifecycle)} · {getFrequencyLabel(progress.nextTemplate.frequency)}
            </p>
            <button
              type="button"
              className="fwdash__next-button"
              onClick={() => handleCreateEntry(progress.nextTemplate!.templateId)}
            >
              {progress.nextTemplate.isOverdue ? 'Catch Up Now' : 'Start Now'}
            </button>
          </div>
        </section>
      )}

      {/* Template Sections */}
      {foundationTemplates.length > 0 && (
        <section className="fwdash__section">
          <h2 className="fwdash__section-title">
            Foundation Templates
            <span className="fwdash__section-count">
              {foundationTemplates.filter(t => t.isCompleted).length}/{foundationTemplates.length}
            </span>
          </h2>
          <p className="fwdash__section-description">
            Complete these one-time templates to build your foundation
          </p>
          <div className="fwdash__template-grid">
            {foundationTemplates.map(template => (
              <TemplateCard
                key={template.templateId}
                template={template}
                frameworkColor={framework.color || '#6366f1'}
                spaceId={spaceId!}
                onCreateEntry={handleCreateEntry}
              />
            ))}
          </div>
        </section>
      )}

      {recurringTemplates.length > 0 && (
        <section className="fwdash__section">
          <h2 className="fwdash__section-title">
            Recurring Practices
            <span className="fwdash__section-count">
              {recurringTemplates.filter(t => t.completionCount > 0).length}/{recurringTemplates.length} active
            </span>
          </h2>
          <p className="fwdash__section-description">
            Regular practices to maintain your progress
          </p>
          <div className="fwdash__template-grid">
            {recurringTemplates.map(template => (
              <TemplateCard
                key={template.templateId}
                template={template}
                frameworkColor={framework.color || '#6366f1'}
                spaceId={spaceId!}
                onCreateEntry={handleCreateEntry}
              />
            ))}
          </div>
        </section>
      )}

      {milestoneTemplates.length > 0 && (
        <section className="fwdash__section">
          <h2 className="fwdash__section-title">
            Milestones & Special
            <span className="fwdash__section-count">{milestoneTemplates.length}</span>
          </h2>
          <p className="fwdash__section-description">
            Special templates for key moments in your journey
          </p>
          <div className="fwdash__template-grid">
            {milestoneTemplates.map(template => (
              <TemplateCard
                key={template.templateId}
                template={template}
                frameworkColor={framework.color || '#6366f1'}
                spaceId={spaceId!}
                onCreateEntry={handleCreateEntry}
              />
            ))}
          </div>
        </section>
      )}

      {/* Recent Entries */}
      {progress.recentEntries.length > 0 && (
        <section className="fwdash__section">
          <h2 className="fwdash__section-title">Recent Entries</h2>
          <div className="fwdash__entries-list">
            {progress.recentEntries.map(entry => (
              <Link
                key={entry.journalId}
                to={`/spaces/${spaceId}/journals/${entry.journalId}`}
                className="fwdash__entry"
              >
                <span className="fwdash__entry-title">{entry.title}</span>
                <span className="fwdash__entry-date">{formatRelativeTime(entry.createdAt)}</span>
              </Link>
            ))}
          </div>
          <Link
            to={`/spaces/${spaceId}/journals?framework=${frameworkId}`}
            className="fwdash__view-all"
          >
            View all entries →
          </Link>
        </section>
      )}

      {/* Description */}
      {framework.description && (
        <section className="fwdash__section fwdash__about">
          <h2 className="fwdash__section-title">About This Framework</h2>
          <p className="fwdash__description">{framework.description}</p>
        </section>
      )}
    </div>
  )
}

export default FrameworkDashboardPage
