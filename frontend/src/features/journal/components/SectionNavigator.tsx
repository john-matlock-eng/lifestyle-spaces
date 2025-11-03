import React, { useState } from 'react'
import { useReadingProgress } from '../hooks/useReadingProgress'
import type { ReadingProgressOptions } from '../types/navigation.types'
import '../styles/section-navigator.css'

interface SectionNavigatorProps {
  /** Journal content (used for calculations) */
  content: string
  /** Parsed sections from the journal */
  sections: Array<{ id: string; title: string; type: string; content: string }>
  /** Optional reading progress configuration */
  options?: ReadingProgressOptions
  /** Whether to show the navigator (default: true) */
  show?: boolean
  /** Position of the navigator (default: 'right') */
  position?: 'left' | 'right'
  /** Whether to start collapsed on mobile (default: true) */
  startCollapsedMobile?: boolean
}

/**
 * SectionNavigator - Provides navigation and reading progress tracking for journal entries
 *
 * Features:
 * - Displays list of all sections with titles
 * - Shows reading progress per section
 * - Highlights current section being read
 * - Calculates and displays overall progress
 * - Estimates time remaining based on reading speed
 * - Click to jump to any section
 * - Responsive: collapses to icon on mobile
 * - Uses IntersectionObserver for efficient tracking
 *
 * @example
 * <SectionNavigator
 *   content={journal.content}
 *   sections={displaySections}
 *   options={{ wordsPerMinute: 200 }}
 * />
 */
export const SectionNavigator: React.FC<SectionNavigatorProps> = ({
  content,
  sections,
  options = {},
  show = true,
  position = 'right',
  startCollapsedMobile = true
}) => {
  const [isCollapsed, setIsCollapsed] = useState(startCollapsedMobile)

  const {
    sections: enrichedSections,
    sectionProgress,
    readingProgress,
    scrollToSection,
    isInitialized
  } = useReadingProgress(content, sections, options)

  // Don't render if explicitly hidden or no sections
  if (!show || sections.length === 0) {
    return null
  }

  // Don't render until initialized to avoid layout shift
  if (!isInitialized) {
    return null
  }

  const formatTimeRemaining = (minutes: number): string => {
    if (minutes === 0) return 'Complete!'
    if (minutes === 1) return '1 min remaining'
    if (minutes < 60) return `${minutes} min remaining`

    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    if (mins === 0) return `${hours} hr remaining`
    return `${hours} hr ${mins} min remaining`
  }

  const formatProgress = (percent: number): string => {
    return `${Math.round(percent)}%`
  }

  return (
    <>
      {/* Toggle button for mobile */}
      <button
        className={`section-nav-toggle ${position} ${isCollapsed ? 'collapsed' : 'expanded'}`}
        onClick={() => setIsCollapsed(!isCollapsed)}
        aria-label={isCollapsed ? 'Open navigation' : 'Close navigation'}
        aria-expanded={!isCollapsed}
      >
        {isCollapsed ? '📖' : '✕'}
      </button>

      {/* Navigator panel */}
      <nav
        className={`section-navigator ${position} ${isCollapsed ? 'collapsed' : 'expanded'}`}
        aria-label="Journal section navigation"
        role="navigation"
      >
        {/* Header with overall progress */}
        <div className="section-nav-header">
          <div className="section-nav-title">
            <span className="section-nav-icon">📑</span>
            <h3>Contents</h3>
          </div>

          {/* Overall progress */}
          <div className="section-nav-overall-progress">
            <div className="progress-circle" aria-label={`${formatProgress(readingProgress.overallPercent)} complete`}>
              <svg viewBox="0 0 36 36" className="circular-progress">
                {/* Background circle */}
                <path
                  className="circle-bg"
                  d="M18 2.0845
                    a 15.9155 15.9155 0 0 1 0 31.831
                    a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                {/* Progress circle */}
                <path
                  className="circle-progress"
                  strokeDasharray={`${readingProgress.overallPercent}, 100`}
                  d="M18 2.0845
                    a 15.9155 15.9155 0 0 1 0 31.831
                    a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <text x="18" y="20.35" className="percentage-text">
                  {Math.round(readingProgress.overallPercent)}
                </text>
              </svg>
            </div>

            <div className="progress-details">
              <div className="progress-text">
                {readingProgress.sectionsComplete} of {readingProgress.sectionsTotal} sections
              </div>
              <div className="time-remaining">
                {formatTimeRemaining(readingProgress.estimatedMinutesRemaining)}
              </div>
            </div>
          </div>
        </div>

        {/* Section list */}
        <div className="section-nav-list" role="list">
          {enrichedSections.map((section) => {
            const progress = sectionProgress.get(section.id)
            const isCurrent = readingProgress.currentSectionId === section.id
            const isComplete = progress?.isComplete || false
            const percentRead = progress?.percentRead || 0

            return (
              <button
                key={section.id}
                className={`section-nav-item ${isCurrent ? 'current' : ''} ${isComplete ? 'complete' : ''}`}
                onClick={() => scrollToSection(section.id)}
                role="listitem"
                aria-current={isCurrent ? 'location' : undefined}
              >
                <div className="section-nav-item-header">
                  <span className="section-status-icon">
                    {isComplete ? '✓' : isCurrent ? '▶' : '○'}
                  </span>
                  <span className="section-title">{section.title}</span>
                  <span className="section-word-count" aria-label={`${section.wordCount} words`}>
                    {section.wordCount}w
                  </span>
                </div>

                {/* Progress bar */}
                <div className="section-progress-bar" role="progressbar" aria-valuenow={percentRead} aria-valuemin={0} aria-valuemax={100}>
                  <div
                    className="section-progress-fill"
                    style={{ width: `${percentRead}%` }}
                  />
                </div>
              </button>
            )
          })}
        </div>

        {/* Footer with reading stats */}
        <div className="section-nav-footer">
          <div className="reading-stat">
            <span className="stat-icon">📝</span>
            <span className="stat-label">Total words:</span>
            <span className="stat-value">{readingProgress.totalWordCount.toLocaleString()}</span>
          </div>
          <div className="reading-stat">
            <span className="stat-icon">👁️</span>
            <span className="stat-label">Words read:</span>
            <span className="stat-value">{readingProgress.wordsRead.toLocaleString()}</span>
          </div>
        </div>
      </nav>

      {/* Backdrop for mobile when expanded */}
      {!isCollapsed && (
        <div
          className="section-nav-backdrop"
          onClick={() => setIsCollapsed(true)}
          aria-hidden="true"
        />
      )}
    </>
  )
}
