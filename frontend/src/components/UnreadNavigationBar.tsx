/**
 * Floating navigation bar for navigating between unread threads.
 *
 * Appears at the top of JournalViewPage when navigating from ConversationsTab.
 * Allows jumping between unread threads across all journals without going back.
 */

import React, { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight, X, MessageSquare, CheckCircle } from 'lucide-react'
import './UnreadNavigationBar.css'

interface UnreadNavigationBarProps {
  totalUnread: number
  currentIndex: number
  hasPrevious: boolean
  hasNext: boolean
  currentThreadPreview?: string
  journalTitle?: string
  onPrevious: () => void
  onNext: () => void
  onClose: () => void
  isVisible: boolean
  isLoading?: boolean
}

export const UnreadNavigationBar: React.FC<UnreadNavigationBarProps> = ({
  totalUnread,
  currentIndex,
  hasPrevious,
  hasNext,
  currentThreadPreview,
  journalTitle,
  onPrevious,
  onNext,
  onClose,
  isVisible,
  isLoading = false,
}) => {
  const [isDarkMode, setIsDarkMode] = useState(false)

  // Detect dark mode
  useEffect(() => {
    const checkDarkMode = () => {
      setIsDarkMode(document.documentElement.classList.contains('dark'))
    }

    checkDarkMode()

    const observer = new MutationObserver(checkDarkMode)
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    })

    return () => observer.disconnect()
  }, [])

  if (!isVisible) {
    return null
  }

  const hasUnread = totalUnread > 0
  const positionText = hasUnread ? `${currentIndex + 1} of ${totalUnread}` : ''

  return (
    <div
      className={`unread-nav-bar ${isVisible ? 'visible' : ''} ${isDarkMode ? 'dark' : ''}`}
      role="navigation"
      aria-label="Unread message navigation"
    >
      <div className="unread-nav-left">
        {hasUnread ? (
          <div className="unread-nav-badge">
            <MessageSquare size={14} />
            <span>{totalUnread} unread</span>
          </div>
        ) : (
          <div className="unread-nav-badge unread-nav-badge--complete">
            <CheckCircle size={14} />
            <span>All caught up!</span>
          </div>
        )}
        {journalTitle && (
          <span className="unread-nav-journal" title={journalTitle}>
            {journalTitle}
          </span>
        )}
        {currentThreadPreview && (
          <span className="unread-nav-preview" title={currentThreadPreview}>
            {currentThreadPreview}
          </span>
        )}
      </div>

      {hasUnread && (
        <div className="unread-nav-center">
          <button
            className="unread-nav-btn"
            onClick={onPrevious}
            disabled={!hasPrevious || isLoading}
            aria-label="Previous unread"
            title="Previous unread (Shift + P)"
          >
            <ChevronLeft size={18} />
          </button>

          <span className="unread-nav-position">{positionText}</span>

          <button
            className="unread-nav-btn"
            onClick={onNext}
            disabled={!hasNext || isLoading}
            aria-label="Next unread"
            title="Next unread (Shift + N)"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      )}

      <div className="unread-nav-right">
        <button
          className="unread-nav-close"
          onClick={onClose}
          aria-label="Close unread navigation"
          title="Close (Esc)"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  )
}
