/**
 * Citation Card Component
 *
 * Displays a journal reference with section-level detail used in AI response.
 * Features:
 * - Clickable deep link to source section
 * - Expandable full section content (in-place)
 */

import { useState, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  FileText,
  ChevronRight,
  ChevronDown,
  ExternalLink,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { chatApi, type SectionContent } from '../api';
import type { JournalCitation } from '../types';
import styles from './CitationCard.module.css';

interface CitationCardProps {
  citation: JournalCitation;
  spaceId: string;
}

type ExpandState = 'collapsed' | 'loading' | 'expanded' | 'error';

export function CitationCard({ citation, spaceId }: CitationCardProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [expandState, setExpandState] = useState<ExpandState>('collapsed');
  const [sectionContent, setSectionContent] = useState<SectionContent | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isExpanded = expandState === 'expanded';
  const isLoading = expandState === 'loading';

  // Format relevance score as percentage
  const relevancePercent = Math.round(citation.relevanceScore * 100);

  // Navigate to journal (deep link)
  const handleNavigateToJournal = useCallback(() => {
    // Store current location for "Back to Chat" navigation
    const returnPath = location.pathname + location.search;
    sessionStorage.setItem('chatReturnPath', returnPath);
    sessionStorage.setItem('chatScrollPosition', String(window.scrollY));

    // Navigate to journal with section parameter
    const sectionParam =
      citation.sectionIndex !== undefined ? `&section=${citation.sectionIndex}` : '';
    const journalPath = `/spaces/${spaceId}/journals/${citation.journalId}?fromChat=true${sectionParam}`;
    navigate(journalPath);
  }, [citation, spaceId, location, navigate]);

  // Toggle expand/collapse
  const handleToggleExpand = useCallback(
    async (e: React.MouseEvent | React.KeyboardEvent) => {
      e.stopPropagation(); // Don't trigger navigation

      if (isExpanded) {
        setExpandState('collapsed');
        return;
      }

      // If we already have content, just expand
      if (sectionContent) {
        setExpandState('expanded');
        return;
      }

      // Fetch content
      setExpandState('loading');
      setError(null);

      try {
        const content = await chatApi.getJournalSection(
          spaceId,
          citation.journalId,
          citation.sectionIndex ?? 0
        );
        setSectionContent(content);
        setExpandState('expanded');
      } catch (err) {
        console.error('Failed to load section content:', err);
        setError('Failed to load section content');
        setExpandState('error');
      }
    },
    [isExpanded, sectionContent, spaceId, citation]
  );

  // Handle card click (navigate to journal when collapsed)
  const handleCardClick = useCallback(() => {
    if (expandState !== 'expanded') {
      handleNavigateToJournal();
    }
  }, [expandState, handleNavigateToJournal]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        if (e.shiftKey) {
          // Shift+Enter toggles expand
          handleToggleExpand(e);
        } else {
          // Enter navigates
          handleNavigateToJournal();
        }
      } else if (e.key === ' ') {
        e.preventDefault();
        handleToggleExpand(e);
      }
    },
    [handleToggleExpand, handleNavigateToJournal]
  );

  return (
    <div
      className={`${styles.citationCard} ${isExpanded ? styles.expanded : ''}`}
      onClick={handleCardClick}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
      aria-label={`${citation.sectionTitle || 'Section'} from ${citation.title}`}
      aria-expanded={isExpanded}
    >
      {/* Header - Always visible */}
      <div className={styles.cardHeader}>
        <div className={styles.journalInfo}>
          <FileText size={16} className={styles.icon} />
          <span className={styles.journalTitle}>{citation.title}</span>
        </div>
        <div className={styles.headerRight}>
          <span className={styles.relevance}>{relevancePercent}%</span>
          <button
            className={styles.expandButton}
            onClick={handleToggleExpand}
            aria-label={isExpanded ? 'Collapse section' : 'Expand section'}
            title={isExpanded ? 'Collapse' : 'Expand to see full section'}
          >
            {isLoading ? (
              <Loader2 size={16} className={styles.spinner} />
            ) : isExpanded ? (
              <ChevronDown size={16} />
            ) : (
              <ChevronRight size={16} />
            )}
          </button>
        </div>
      </div>

      {/* Section title */}
      {citation.sectionTitle && (
        <div className={styles.sectionTitle}>
          <ChevronRight size={14} />
          <span>{citation.sectionTitle}</span>
        </div>
      )}

      {/* Collapsed state - excerpt */}
      {!isExpanded && !isLoading && expandState !== 'error' && citation.excerpt && (
        <p className={styles.excerpt}>
          &ldquo;
          {citation.excerpt.length > 100
            ? `${citation.excerpt.slice(0, 100)}...`
            : citation.excerpt}
          &rdquo;
        </p>
      )}

      {/* Loading state */}
      {isLoading && (
        <div className={styles.loadingState}>
          <Loader2 size={20} className={styles.spinner} />
          <span>Loading section...</span>
        </div>
      )}

      {/* Error state */}
      {expandState === 'error' && (
        <div className={styles.errorState}>
          <AlertCircle size={16} />
          <span>{error}</span>
          <button onClick={handleToggleExpand} className={styles.retryButton}>
            Retry
          </button>
        </div>
      )}

      {/* Expanded content */}
      <AnimatePresence>
        {isExpanded && sectionContent && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className={styles.expandedContent}
          >
            <div className={styles.fullContent}>{sectionContent.content}</div>

            <div className={styles.expandedMeta}>
              <span className={styles.wordCount}>{sectionContent.wordCount} words</span>
              <button
                className={styles.viewInJournalLink}
                onClick={(e) => {
                  e.stopPropagation();
                  handleNavigateToJournal();
                }}
              >
                View in Journal <ExternalLink size={12} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer - collapsed state only */}
      {!isExpanded && expandState !== 'loading' && expandState !== 'error' && (
        <div className={styles.cardFooter}>
          <span className={styles.date}>{citation.createdAt}</span>
          <span className={styles.viewLink}>
            Click to view <ExternalLink size={12} />
          </span>
        </div>
      )}
    </div>
  );
}
