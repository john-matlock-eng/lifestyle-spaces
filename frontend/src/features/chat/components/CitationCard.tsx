/**
 * Citation Card Component
 *
 * Displays a journal reference used in AI response.
 */

import { Link } from 'react-router-dom';
import { FileText } from 'lucide-react';
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
