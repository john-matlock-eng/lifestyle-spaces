/**
 * FrameworksTab Component
 *
 * Tab content showing all frameworks with progress cards.
 * Separates active frameworks from available ones.
 *
 * @module components/frameworks/FrameworksTab
 */

import React from 'react'
import { useNavigate } from 'react-router-dom'
import { FrameworkProgressCard } from './FrameworkProgressCard'
import { useFrameworkProgress } from '../../features/journal/hooks/useFrameworkProgress'
import './FrameworksTab.css'

interface FrameworksTabProps {
  spaceId: string
}

export const FrameworksTab: React.FC<FrameworksTabProps> = ({ spaceId }) => {
  const navigate = useNavigate()
  const { activeFrameworks, availableFrameworks, loading, error, refresh } = useFrameworkProgress(spaceId)

  const handleStartFramework = (frameworkId: string) => {
    // Navigate to journal creation with the framework pre-selected
    navigate(`/spaces/${spaceId}/journals/new?framework=${frameworkId}`)
  }

  const handleContinue = (frameworkId: string, templateId: string) => {
    navigate(`/spaces/${spaceId}/journals/new?framework=${frameworkId}&template=${templateId}`)
  }

  if (loading) {
    return (
      <div className="frameworks-tab">
        <div className="frameworks-tab__loading">
          <div className="frameworks-tab__loading-spinner" />
          <span>Loading frameworks...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="frameworks-tab">
        <div className="frameworks-tab__error">
          <div className="frameworks-tab__error-icon">!</div>
          <p className="frameworks-tab__error-message">{error}</p>
          <button type="button" className="btn btn-primary" onClick={refresh}>
            Try Again
          </button>
        </div>
      </div>
    )
  }

  const hasActiveFrameworks = activeFrameworks.length > 0
  const hasAvailableFrameworks = availableFrameworks.length > 0

  return (
    <div className="frameworks-tab">
      {/* Active Frameworks Section */}
      {hasActiveFrameworks && (
        <section className="frameworks-tab__section">
          <header className="frameworks-tab__section-header">
            <h3 className="frameworks-tab__section-title">Your Frameworks</h3>
            <p className="frameworks-tab__section-description">
              Frameworks you've started working on
            </p>
          </header>
          <div className="frameworks-tab__grid">
            {activeFrameworks.map(progress => (
              <FrameworkProgressCard
                key={progress.frameworkId}
                progress={progress}
                spaceId={spaceId}
                onContinue={handleContinue}
              />
            ))}
          </div>
        </section>
      )}

      {/* Available Frameworks Section */}
      {hasAvailableFrameworks && (
        <section className="frameworks-tab__section">
          <header className="frameworks-tab__section-header">
            <h3 className="frameworks-tab__section-title">
              {hasActiveFrameworks ? 'Explore More Frameworks' : 'Available Frameworks'}
            </h3>
            <p className="frameworks-tab__section-description">
              {hasActiveFrameworks
                ? 'Discover new frameworks to enhance your journaling practice'
                : 'Choose a framework to guide your journaling journey'}
            </p>
          </header>
          <div className="frameworks-tab__grid">
            {availableFrameworks.map(progress => (
              <FrameworkProgressCard
                key={progress.frameworkId}
                progress={progress}
                spaceId={spaceId}
                onStartFramework={handleStartFramework}
              />
            ))}
          </div>
        </section>
      )}

      {/* Empty State */}
      {!hasActiveFrameworks && !hasAvailableFrameworks && (
        <div className="frameworks-tab__empty">
          <div className="frameworks-tab__empty-icon">📚</div>
          <h3 className="frameworks-tab__empty-title">No Frameworks Available</h3>
          <p className="frameworks-tab__empty-description">
            Frameworks help guide your journaling practice with structured templates
            and progress tracking. Check back soon for available frameworks.
          </p>
        </div>
      )}

      {/* Quick Stats Summary */}
      {hasActiveFrameworks && (
        <section className="frameworks-tab__summary">
          <div className="frameworks-tab__summary-stats">
            <div className="frameworks-tab__summary-stat">
              <span className="frameworks-tab__summary-value">
                {activeFrameworks.reduce((sum, fp) => sum + fp.totalEntries, 0)}
              </span>
              <span className="frameworks-tab__summary-label">Total Entries</span>
            </div>
            <div className="frameworks-tab__summary-stat">
              <span className="frameworks-tab__summary-value">
                {activeFrameworks.filter(fp => fp.isFoundationComplete).length}/{activeFrameworks.length}
              </span>
              <span className="frameworks-tab__summary-label">Foundations Complete</span>
            </div>
            <div className="frameworks-tab__summary-stat">
              <span className="frameworks-tab__summary-value">
                {Math.max(...activeFrameworks.map(fp => fp.dailyStreak), 0)}
              </span>
              <span className="frameworks-tab__summary-label">Best Daily Streak</span>
            </div>
          </div>
        </section>
      )}
    </div>
  )
}

export default FrameworksTab
