/**
 * Banner component that prompts users to resume reading from their saved position
 *
 * Features:
 * - Shows progress percentage
 * - Sticky at top of content
 * - Dismissible with smooth animation
 * - Actions: Resume, Start from Beginning, Dismiss
 */

import React, { useState } from 'react'
import type { ReadingPosition } from '../types/reading-position.types'
import '../styles/resume-banner.css'

export interface ResumeReadingBannerProps {
  /** Saved reading position to resume from */
  position: ReadingPosition
  /** Called when user clicks "Resume" */
  onResume: () => void
  /** Called when user clicks "Start from Beginning" */
  onStartFromBeginning: () => void
  /** Called when user clicks "Dismiss" */
  onDismiss: () => void
}

/**
 * Banner prompting user to resume reading from saved position
 *
 * @example
 * <ResumeReadingBanner
 *   position={savedPosition}
 *   onResume={() => scrollToPosition(savedPosition.scrollPosition)}
 *   onStartFromBeginning={() => {
 *     scrollToTop()
 *     clearPosition()
 *   }}
 *   onDismiss={() => setShowBanner(false)}
 * />
 */
export const ResumeReadingBanner: React.FC<ResumeReadingBannerProps> = ({
  position,
  onResume,
  onStartFromBeginning,
  onDismiss
}) => {
  const [isVisible, setIsVisible] = useState(true)
  const [isAnimatingOut, setIsAnimatingOut] = useState(false)

  const handleDismiss = () => {
    setIsAnimatingOut(true)
    // Wait for animation to complete before hiding
    setTimeout(() => {
      setIsVisible(false)
      onDismiss()
    }, 300)
  }

  const handleResume = () => {
    setIsAnimatingOut(true)
    setTimeout(() => {
      setIsVisible(false)
      onResume()
    }, 300)
  }

  const handleStartFromBeginning = () => {
    setIsAnimatingOut(true)
    setTimeout(() => {
      setIsVisible(false)
      onStartFromBeginning()
    }, 300)
  }

  if (!isVisible) {
    return null
  }

  const progressPercent = Math.round(position.progressPercent)

  return (
    <div
      className={`resume-reading-banner ${isAnimatingOut ? 'slide-out' : 'slide-in'}`}
      role="banner"
      aria-live="polite"
    >
      <div className="resume-banner-content">
        {/* Icon and message */}
        <div className="resume-banner-message">
          <span className="resume-banner-icon" role="img" aria-label="Resume reading">
            📖
          </span>
          <div className="resume-banner-text">
            <strong>Resume reading from where you left off?</strong>
            <span className="resume-banner-progress">
              {progressPercent}% complete
              {position.currentSectionId && ' • Continue from current section'}
            </span>
          </div>
        </div>

        {/* Action buttons */}
        <div className="resume-banner-actions">
          <button
            type="button"
            className="resume-banner-button primary"
            onClick={handleResume}
            aria-label="Resume reading from saved position"
          >
            Resume
          </button>
          <button
            type="button"
            className="resume-banner-button secondary"
            onClick={handleStartFromBeginning}
            aria-label="Start reading from the beginning"
          >
            Start from Beginning
          </button>
          <button
            type="button"
            className="resume-banner-button dismiss"
            onClick={handleDismiss}
            aria-label="Dismiss this banner"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="resume-banner-progress-bar">
        <div
          className="resume-banner-progress-fill"
          style={{ width: `${progressPercent}%` }}
          role="progressbar"
          aria-valuenow={progressPercent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Reading progress: ${progressPercent}%`}
        />
      </div>
    </div>
  )
}
