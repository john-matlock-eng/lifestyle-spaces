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
        // Filter highlights for this specific moment
        const momentSectionId = `${sectionId}-moment-${moment.id}`;
        const momentHighlights = highlights.filter(h =>
          h.sectionId?.startsWith(momentSectionId)
        );

        // Build markdown content for the moment
        const parts: string[] = [];

        if (moment.scene?.trim()) {
          parts.push(`**The Scene**\n${moment.scene}`);
        }
        if (moment.reaction?.trim()) {
          parts.push(`**The Reaction**\n${moment.reaction}`);
        }
        if (moment.takeaway?.trim()) {
          parts.push(`**The Takeaway**\n${moment.takeaway}`);
        }

        const markdownContent = parts.join('\n\n');

        return (
          <div key={moment.id} className="moment-block-display">
            <div className="moment-block-display-header">
              <span className="moment-block-display-number">Moment {index + 1}</span>
            </div>
            <div className="moment-block-display-content">
              <HighlightableText
                content={markdownContent}
                highlights={momentHighlights}
                journalEntryId={journalEntryId}
                spaceId={spaceId}
                sectionId={momentSectionId}
                onHighlightCreate={onHighlightCreate}
                onHighlightClick={onHighlightClick}
                onHighlightUpdate={onHighlightUpdate}
                onHighlightDelete={onHighlightDelete}
                isReadOnly={isReadOnly}
                className="moment-block-text"
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};
