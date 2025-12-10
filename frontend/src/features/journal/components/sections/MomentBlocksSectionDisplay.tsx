/**
 * MomentBlocksSectionDisplay - Read-only display component for moment_blocks sections
 *
 * Displays captured moments with their scene, reaction, and takeaway fields.
 * Supports highlighting via HighlightableText wrapper.
 */
import React from 'react';
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

  return (
    <div className={`moment-blocks-display ${className}`}>
      {nonEmptyMoments.map((moment, index) => {
        // Create compound section IDs for each sub-field
        const sceneSectionId = `${sectionId}-moment-${moment.id}-scene`;
        const reactionSectionId = `${sectionId}-moment-${moment.id}-reaction`;
        const takeawaySectionId = `${sectionId}-moment-${moment.id}-takeaway`;

        return (
          <div key={moment.id} className="moment-block-display">
            <div className="moment-block-display-header">
              <span className="moment-block-display-number">Moment {index + 1}</span>
            </div>
            <div className="moment-block-display-content">
              {moment.scene?.trim() && (
                <div className="moment-block-field-display">
                  <div className="moment-block-field-label">The Scene</div>
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
                    useMarkdown={false}
                    className="moment-block-field-text"
                  />
                </div>
              )}

              {moment.reaction?.trim() && (
                <div className="moment-block-field-display">
                  <div className="moment-block-field-label">The Reaction</div>
                  <HighlightableText
                    content={moment.reaction}
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
                    useMarkdown={false}
                    className="moment-block-field-text"
                  />
                </div>
              )}

              {moment.takeaway?.trim() && (
                <div className="moment-block-field-display">
                  <div className="moment-block-field-label">The Takeaway</div>
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
                    useMarkdown={false}
                    className="moment-block-field-text"
                  />
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
