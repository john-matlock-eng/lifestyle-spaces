/**
 * FrameworkProgressCard Component
 *
 * Detailed card showing framework progress with stats, streaks, and next actions.
 *
 * @module components/frameworks/FrameworkProgressCard
 */

import React from 'react'
import { useNavigate } from 'react-router-dom'
import type { FrameworkProgress } from '../../features/journal/hooks/useFrameworkProgress'
import './FrameworkProgressCard.css'

interface FrameworkProgressCardProps {
  progress: FrameworkProgress
  spaceId: string
  onStartFramework?: (frameworkId: string) => void
  onContinue?: (frameworkId: string, templateId: string) => void
}

/**
 * Format relative time (e.g., "2 days ago")
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

export const FrameworkProgressCard: React.FC<FrameworkProgressCardProps> = ({
  progress,
  spaceId,
  onStartFramework,
  onContinue,
}) => {
  const navigate = useNavigate()
  const { framework } = progress

  const handleCardClick = () => {
    navigate(`/spaces/${spaceId}/frameworks/${framework.id}`)
  }

  const handleStartClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (onStartFramework) {
      onStartFramework(framework.id)
    } else {
      // Navigate to create journal with this framework
      navigate(`/spaces/${spaceId}/journals/new?framework=${framework.id}`)
    }
  }

  const handleContinueClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (progress.nextTemplate && onContinue) {
      onContinue(framework.id, progress.nextTemplate.templateId)
    } else if (progress.nextTemplate) {
      navigate(`/spaces/${spaceId}/journals/new?framework=${framework.id}&template=${progress.nextTemplate.templateId}`)
    }
  }

  // Determine card state
  const hasOverdueItems = progress.templates.some(t => t.isOverdue)
  const isNew = !progress.isStarted

  return (
    <article
      className={`framework-progress-card ${isNew ? 'framework-progress-card--new' : ''} ${hasOverdueItems ? 'framework-progress-card--attention' : ''}`}
      onClick={handleCardClick}
      style={{ '--framework-color': framework.color || '#6366f1' } as React.CSSProperties}
    >
      {/* Header */}
      <header className="framework-progress-card__header">
        <div
          className="framework-progress-card__icon"
          style={{ backgroundColor: framework.color || '#6366f1' }}
        >
          {framework.icon || framework.name.charAt(0).toUpperCase()}
        </div>
        <div className="framework-progress-card__title-section">
          <h3 className="framework-progress-card__title">{framework.name}</h3>
          {framework.tagline && (
            <p className="framework-progress-card__tagline">{framework.tagline}</p>
          )}
        </div>
        {hasOverdueItems && (
          <span className="framework-progress-card__attention-badge" title="Has overdue items">
            !
          </span>
        )}
      </header>

      {/* Progress Section - Only show if started */}
      {progress.isStarted && (
        <div className="framework-progress-card__progress">
          {/* Foundation Progress */}
          <div className="framework-progress-card__foundation">
            <div className="framework-progress-card__progress-header">
              <span className="framework-progress-card__progress-label">Foundation</span>
              <span className="framework-progress-card__progress-value">
                {progress.foundationCompleted}/{progress.foundationTotal}
              </span>
            </div>
            <div className="framework-progress-card__progress-bar">
              <div
                className="framework-progress-card__progress-fill"
                style={{ width: `${progress.foundationPercent}%` }}
              />
            </div>
            {progress.isFoundationComplete && (
              <span className="framework-progress-card__complete-badge">Complete!</span>
            )}
          </div>

          {/* Streak Stats */}
          {(progress.dailyStreak > 0 || progress.weeklyStreak > 0 || progress.monthlyStreak > 0) && (
            <div className="framework-progress-card__streaks">
              {progress.dailyStreak > 0 && (
                <div className="framework-progress-card__streak">
                  <span className="framework-progress-card__streak-icon">🔥</span>
                  <span className="framework-progress-card__streak-value">{progress.dailyStreak}</span>
                  <span className="framework-progress-card__streak-label">day streak</span>
                </div>
              )}
              {progress.weeklyStreak > 0 && (
                <div className="framework-progress-card__streak">
                  <span className="framework-progress-card__streak-icon">📅</span>
                  <span className="framework-progress-card__streak-value">{progress.weeklyStreak}</span>
                  <span className="framework-progress-card__streak-label">week streak</span>
                </div>
              )}
              {progress.monthlyStreak > 0 && (
                <div className="framework-progress-card__streak">
                  <span className="framework-progress-card__streak-icon">🌙</span>
                  <span className="framework-progress-card__streak-value">{progress.monthlyStreak}</span>
                  <span className="framework-progress-card__streak-label">month streak</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Stats Grid */}
      <div className="framework-progress-card__stats">
        <div className="framework-progress-card__stat">
          <span className="framework-progress-card__stat-value">{framework.templates.length}</span>
          <span className="framework-progress-card__stat-label">Templates</span>
        </div>
        {progress.isStarted && (
          <>
            <div className="framework-progress-card__stat">
              <span className="framework-progress-card__stat-value">{progress.totalEntries}</span>
              <span className="framework-progress-card__stat-label">Entries</span>
            </div>
            <div className="framework-progress-card__stat">
              <span className="framework-progress-card__stat-value">{progress.recurringActive}</span>
              <span className="framework-progress-card__stat-label">Active</span>
            </div>
          </>
        )}
        {!progress.isStarted && (
          <>
            <div className="framework-progress-card__stat">
              <span className="framework-progress-card__stat-value">{progress.foundationTotal}</span>
              <span className="framework-progress-card__stat-label">Foundation</span>
            </div>
            <div className="framework-progress-card__stat">
              <span className="framework-progress-card__stat-value">{progress.recurringTotal}</span>
              <span className="framework-progress-card__stat-label">Recurring</span>
            </div>
          </>
        )}
      </div>

      {/* Next Action */}
      {progress.nextTemplate && (
        <div className={`framework-progress-card__next ${progress.nextTemplate.isOverdue ? 'framework-progress-card__next--overdue' : ''}`}>
          <div className="framework-progress-card__next-header">
            <span className="framework-progress-card__next-label">
              {progress.nextTemplate.isOverdue ? 'Overdue' : 'Up Next'}
            </span>
            {progress.nextTemplate.frequency !== 'once' && (
              <span className="framework-progress-card__next-frequency">
                {getFrequencyLabel(progress.nextTemplate.frequency)}
              </span>
            )}
          </div>
          <div className="framework-progress-card__next-template">
            <span className="framework-progress-card__next-name">
              {progress.nextTemplate.templateName}
            </span>
          </div>
        </div>
      )}

      {/* Last Activity */}
      {progress.lastActivityAt && (
        <div className="framework-progress-card__activity">
          <span className="framework-progress-card__activity-label">Last activity:</span>
          <span className="framework-progress-card__activity-time">
            {formatRelativeTime(progress.lastActivityAt)}
          </span>
        </div>
      )}

      {/* Actions */}
      <div className="framework-progress-card__actions">
        {!progress.isStarted ? (
          <button
            type="button"
            className="framework-progress-card__action framework-progress-card__action--primary"
            onClick={handleStartClick}
          >
            Start Framework
          </button>
        ) : progress.nextTemplate ? (
          <button
            type="button"
            className={`framework-progress-card__action ${progress.nextTemplate.isOverdue ? 'framework-progress-card__action--warning' : 'framework-progress-card__action--primary'}`}
            onClick={handleContinueClick}
          >
            {progress.nextTemplate.isOverdue ? 'Catch Up' : 'Continue'}
          </button>
        ) : (
          <button
            type="button"
            className="framework-progress-card__action framework-progress-card__action--secondary"
            onClick={handleCardClick}
          >
            View Details
          </button>
        )}
      </div>
    </article>
  )
}

export default FrameworkProgressCard
