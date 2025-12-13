/**
 * QASectionDisplay - Read-only display component for Q&A sections with highlighting support
 *
 * Enables highlighting and commenting on both questions and answers independently.
 * Uses compound sectionIds to track highlights for questions vs answers.
 */
import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { HighlightableText } from '../HighlightableText';
import type { Highlight } from '../../types/highlight.types';
import type { HighlightSelection, HighlightColor } from '../../types/highlight.types';
import '../../styles/qa-section.css';

interface QAPair {
  id?: string;
  question: string;
  answer: string;
  isCollapsed?: boolean;
}

interface QASectionDisplayProps {
  value: QAPair[] | string;
  sectionId: string;
  journalEntryId: string;
  spaceId: string;
  highlights: Highlight[];
  onHighlightCreate: (selection: HighlightSelection, color: HighlightColor) => void;
  onHighlightClick: (highlight: Highlight) => void;
  onHighlightUpdate?: (highlightId: string, selection: HighlightSelection) => void;
  onHighlightDelete?: (highlightId: string) => void;
  isReadOnly?: boolean;
  className?: string;
}

export const QASectionDisplay: React.FC<QASectionDisplayProps> = ({
  value,
  sectionId,
  journalEntryId,
  spaceId,
  highlights,
  onHighlightCreate,
  onHighlightClick,
  onHighlightUpdate,
  onHighlightDelete,
  isReadOnly = false,
  className = ''
}) => {
  // Track which Q&A pairs are collapsed
  const [collapsedPairs, setCollapsedPairs] = useState<Set<string>>(new Set());

  // Parse value to QA pairs
  const pairs: QAPair[] = typeof value === 'string'
    ? JSON.parse(value || '[]')
    : value || [];

  const toggleCollapse = (pairId: string) => {
    setCollapsedPairs(prev => {
      const next = new Set(prev);
      if (next.has(pairId)) {
        next.delete(pairId);
      } else {
        next.add(pairId);
      }
      return next;
    });
  };

  return (
    <div className={`qa-section-display ${className}`}>
      {pairs.map((pair, index) => {
        const pairId = pair.id || `pair-${index}`;
        const isCollapsed = collapsedPairs.has(pairId);

        // Create compound section ID for answer
        const answerSectionId = `${sectionId}-a-${pairId}`;

        return (
          <div key={pairId} className="qa-pair-display">
            <div className="qa-pair-header-display">
              <button
                type="button"
                onClick={() => toggleCollapse(pairId)}
                className="qa-collapse-btn"
                aria-expanded={!isCollapsed}
                aria-label={isCollapsed ? 'Expand question' : 'Collapse question'}
              >
                {isCollapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
              </button>

              <span className="qa-number">Q{index + 1}</span>

              <div className="qa-question-display">
                <div className="font-semibold">{pair.question}</div>
              </div>
            </div>

            {!isCollapsed && (
              <div className="qa-pair-answer-display">
                <HighlightableText
                  content={pair.answer || '*No answer provided*'}
                  highlights={highlights.filter(h =>
                    h.textRange.startContainerId === answerSectionId
                  )}
                  journalEntryId={journalEntryId}
                  spaceId={spaceId}
                  sectionId={answerSectionId}
                  onHighlightCreate={onHighlightCreate}
                  onHighlightClick={onHighlightClick}
                  onHighlightUpdate={onHighlightUpdate}
                  onHighlightDelete={onHighlightDelete}
                  isReadOnly={isReadOnly}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
