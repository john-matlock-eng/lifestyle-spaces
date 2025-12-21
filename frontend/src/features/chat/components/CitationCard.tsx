/**
 * Citation Card Component
 *
 * Displays a journal reference with section-level detail used in AI response.
 */

import { Link } from 'react-router-dom';
import { FileText, ChevronRight } from 'lucide-react';
import type { JournalCitation } from '../types';
import styles from './Chat.module.css';

interface CitationCardProps {
  citation: JournalCitation;
}

export function CitationCard({ citation }: CitationCardProps) {
  const relevancePercent = Math.round(citation.relevanceScore * 100);

  return (
    <Link to={`/journals/${citation.journalId}`} className={styles.citationCard}>
      <FileText size={16} className={styles.citationIcon} />
      <div className={styles.citationContent}>
        <div className={styles.citationTitle}>{citation.title}</div>
        {citation.sectionTitle && (
          <div className={styles.citationSection}>
            <ChevronRight size={12} />
            {citation.sectionTitle}
          </div>
        )}
        {citation.excerpt && (
          <div className={styles.citationExcerpt}>
            "{citation.excerpt.length > 100 ? `${citation.excerpt.slice(0, 100)}...` : citation.excerpt}"
          </div>
        )}
        {citation.createdAt && (
          <div className={styles.citationDate}>{citation.createdAt}</div>
        )}
      </div>
      <div className={styles.citationScore} title="Relevance score">
        {relevancePercent}%
      </div>
    </Link>
  );
}
