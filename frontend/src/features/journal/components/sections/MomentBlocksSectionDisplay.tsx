/**
 * MomentBlocksSectionDisplay - Read-only display component for moment_blocks sections
 *
 * Displays captured moments with their scene, reaction, and takeaway fields.
 * Features:
 * - Sub-cards with left accent bars for each field
 * - Collapsible Reaction section (collapsed by default)
 * - More whitespace and visual hierarchy
 * - Supports highlighting via HighlightableText wrapper
 */
import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { HighlightableText } from '../HighlightableText';
import type { Highlight } from '../../types/highlight.types';
import type { HighlightSelection, HighlightColor } from '../../types/highlight.types';
import type { MomentBlock } from '../../types/template.types';
import '../../styles/moment-blocks.css';

interface MomentBlocksSectionDisplayProps {
  value: MomentBlock[] | string;
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

export const MomentBlocksSectionDisplay: React.FC<MomentBlocksSectionDisplayProps> = ({
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
  // Track which moments have collapsed reactions (all expanded by default)
  const [collapsedReactions, setCollapsedReactions] = useState<Set<string>>(new Set());

  // Parse value to moment blocks
  let moments: MomentBlock[] = [];

  if (typeof value === 'string') {
    try {
      moments = JSON.parse(value || '[]');
    } catch {
      moments = [];
    }
  } else {
    moments = value || [];
  }

  // Filter out empty moments
  const nonEmptyMoments = moments.filter(
    m => m.scene?.trim() || m.reaction?.trim() || m.takeaway?.trim()
  );

  if (nonEmptyMoments.length === 0) {
    return (
      <div className={`moment-blocks-display ${className}`}>
        <p className="moment-blocks-empty">No moments captured.</p>
      </div>
    );
  }

  const toggleReaction = (momentId: string) => {
    setCollapsedReactions(prev => {
      const next = new Set(prev);
      if (next.has(momentId)) {
        next.delete(momentId);
      } else {
        next.add(momentId);
      }
      return next;
    });
  };

  return (
    <div className={`moment-blocks-display ${className}`}>
      {nonEmptyMoments.map((moment, index) => {
        // Create compound section IDs for each sub-field
        const sceneSectionId = `${sectionId}-moment-${moment.id}-scene`;
        const reactionSectionId = `${sectionId}-moment-${moment.id}-reaction`;
        const takeawaySectionId = `${sectionId}-moment-${moment.id}-takeaway`;
        const isReactionExpanded = !collapsedReactions.has(moment.id);
        const hasReaction = moment.reaction?.trim();

        return (
          <div key={moment.id} className="moment-block-display moment-block-display-v2">
            <div className="moment-block-display-header">
              <span className="moment-block-display-number">Moment {index + 1}</span>
            </div>
            <div className="moment-block-display-content moment-block-display-content-v2">
              {/* Scene - Always visible */}
              {moment.scene?.trim() && (
                <div className="moment-field-card moment-field-scene">
                  <div className="moment-field-card-accent" />
                  <div className="moment-field-card-content">
                    <div className="moment-field-card-label">The Scene</div>
                    <HighlightableText
                      content={moment.scene}
                      highlights={highlights.filter(h =>
                        h.textRange.startContainerId === sceneSectionId
                      )}
                      journalEntryId={journalEntryId}
                      spaceId={spaceId}
                      sectionId={sceneSectionId}
                      onHighlightCreate={onHighlightCreate}
                      onHighlightClick={onHighlightClick}
                      onHighlightUpdate={onHighlightUpdate}
                      onHighlightDelete={onHighlightDelete}
                      isReadOnly={isReadOnly}
                      className="moment-field-card-text"
                    />
                  </div>
                </div>
              )}

              {/* Reaction - Collapsible (collapsed by default) */}
              {hasReaction && (
                <div className="moment-field-card moment-field-reaction">
                  <div className="moment-field-card-accent" />
                  <div className="moment-field-card-content">
                    <button
                      type="button"
                      className="moment-field-collapse-btn"
                      onClick={() => toggleReaction(moment.id)}
                      aria-expanded={isReactionExpanded}
                      aria-label={isReactionExpanded ? 'Collapse reaction' : 'Expand reaction'}
                    >
                      <span className="moment-field-card-label">The Reaction</span>
                      <span className="moment-field-collapse-icon">
                        {isReactionExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </span>
                    </button>
                    {isReactionExpanded && (
                      <div className="moment-field-card-text-wrapper">
                        <HighlightableText
                          content={moment.reaction!}
                          highlights={highlights.filter(h =>
                            h.textRange.startContainerId === reactionSectionId
                          )}
                          journalEntryId={journalEntryId}
                          spaceId={spaceId}
                          sectionId={reactionSectionId}
                          onHighlightCreate={onHighlightCreate}
                          onHighlightClick={onHighlightClick}
                          onHighlightUpdate={onHighlightUpdate}
                          onHighlightDelete={onHighlightDelete}
                          isReadOnly={isReadOnly}
                          className="moment-field-card-text"
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Takeaway - Always visible */}
              {moment.takeaway?.trim() && (
                <div className="moment-field-card moment-field-takeaway">
                  <div className="moment-field-card-accent" />
                  <div className="moment-field-card-content">
                    <div className="moment-field-card-label">The Takeaway</div>
                    <HighlightableText
                      content={moment.takeaway}
                      highlights={highlights.filter(h =>
                        h.textRange.startContainerId === takeawaySectionId
                      )}
                      journalEntryId={journalEntryId}
                      spaceId={spaceId}
                      sectionId={takeawaySectionId}
                      onHighlightCreate={onHighlightCreate}
                      onHighlightClick={onHighlightClick}
                      onHighlightUpdate={onHighlightUpdate}
                      onHighlightDelete={onHighlightDelete}
                      isReadOnly={isReadOnly}
                      className="moment-field-card-text"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
