/**
 * UnreadNavigationBar Component
 *
 * A floating navigation bar that appears when navigating through unread messages.
 * Provides Previous/Next buttons and shows current position in the unread queue.
 */

import React, { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, X, MessageSquare } from 'lucide-react';
import { useUnreadNavigation } from '../contexts/UnreadNavigationContext';
import './UnreadNavigationBar.css';

export const UnreadNavigationBar: React.FC = () => {
  const {
    state,
    navigateToNext,
    navigateToPrevious,
    exitNavigation,
    hasNext,
    hasPrevious,
    currentThread,
    totalCount,
  } = useUnreadNavigation();

  const [isDarkMode, setIsDarkMode] = useState(false);

  // Detect dark mode
  useEffect(() => {
    const checkDarkMode = () => {
      setIsDarkMode(document.documentElement.classList.contains('dark'));
    };
    checkDarkMode();
    const observer = new MutationObserver(checkDarkMode);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  // Don't render if not in navigation mode
  if (!state.isActive) {
    return null;
  }

  const currentPosition = state.currentIndex + 1;

  return (
    <div className={`unread-nav-bar ${isDarkMode ? 'unread-nav-bar--dark' : ''}`}>
      <div className="unread-nav-bar__content">
        {/* Left: Icon and counter */}
        <div className="unread-nav-bar__info">
          <MessageSquare size={18} className="unread-nav-bar__icon" />
          <span className="unread-nav-bar__counter">
            {currentPosition} of {totalCount} unread
          </span>
        </div>

        {/* Center: Thread preview */}
        {currentThread && (
          <div className="unread-nav-bar__preview">
            <span className="unread-nav-bar__thread-type">
              {currentThread.threadType === 'highlight' ? 'Highlight' : 'Discussion'}
            </span>
            <span className="unread-nav-bar__separator">•</span>
            <span className="unread-nav-bar__journal-title">
              {currentThread.journalTitle}
            </span>
          </div>
        )}

        {/* Right: Navigation buttons */}
        <div className="unread-nav-bar__actions">
          <button
            className="unread-nav-bar__btn unread-nav-bar__btn--nav"
            onClick={navigateToPrevious}
            disabled={!hasPrevious}
            title="Previous unread"
            aria-label="Previous unread message"
          >
            <ChevronLeft size={18} />
            <span className="unread-nav-bar__btn-text">Previous</span>
          </button>

          <button
            className="unread-nav-bar__btn unread-nav-bar__btn--nav unread-nav-bar__btn--primary"
            onClick={navigateToNext}
            disabled={!hasNext}
            title="Next unread"
            aria-label="Next unread message"
          >
            <span className="unread-nav-bar__btn-text">Next</span>
            <ChevronRight size={18} />
          </button>

          <div className="unread-nav-bar__divider" />

          <button
            className="unread-nav-bar__btn unread-nav-bar__btn--exit"
            onClick={exitNavigation}
            title="Exit unread navigation"
            aria-label="Exit unread navigation"
          >
            <X size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default UnreadNavigationBar;
