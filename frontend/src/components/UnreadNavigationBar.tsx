/**
 * Floating navigation bar for navigating between unread threads.
 *
 * Appears at the top of JournalViewPage when navigating from ConversationsTab.
 * Allows jumping between unread threads across all journals without going back.
 */

import React, { useEffect, useState } from 'react'
import './UnreadNavigationBar.css'

interface UnreadNavigationBarProps {
  totalUnread: number
  hasNext: boolean
  onNext: () => void
  onClose: () => void
  isVisible: boolean
  isLoading?: boolean
}

export const UnreadNavigationBar: React.FC<UnreadNavigationBarProps> = ({
  totalUnread,
  hasNext,
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

  return (
    <div
      className={`unread-nav-bar ${isVisible ? 'visible' : ''} ${isDarkMode ? 'dark' : ''}`}
      role="navigation"
      aria-label="Unread message navigation"
    >
      <div className="unread-nav-left">
        {hasUnread ? (
          <div className="unread-nav-badge">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
            </svg>
            <span>{totalUnread} remaining</span>
          </div>
        ) : (
          <div className="unread-nav-badge unread-nav-badge--complete">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
              <polyline points="22 4 12 14.01 9 11.01"></polyline>
            </svg>
            <span>All caught up!</span>
          </div>
        )}
      </div>

      <div className="unread-nav-right">
        {hasNext && (
          <button
            className="unread-nav-next-btn"
            onClick={onNext}
            disabled={isLoading}
            aria-label="Next unread thread"
          >
            <span>Next</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6"></polyline>
            </svg>
          </button>
        )}
        <button
          className="unread-nav-close"
          onClick={onClose}
          aria-label="Close unread navigation"
          title="Close"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>
    </div>
  )
}
