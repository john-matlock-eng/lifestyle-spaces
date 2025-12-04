import React from 'react'
import { TipTapViewer } from './TipTapViewer'
import type { Highlight } from '../types/highlight.types'

interface HighlightData {
  id: string;
  color: string;
  authorId: string;
  authorName: string;
  createdAt: string;
  commentCount: number;
  text: string;
  range: { from: number; to: number };
  sectionId?: string;
}

interface MultiSectionTipTapViewerProps {
  contentTiptap: Record<string, unknown>
  highlights?: Highlight[]
  onContentChange?: (contentTiptap: Record<string, unknown>) => void
  onHighlightCreate?: (highlight: HighlightData) => void
  onHighlightClick?: (highlight: Highlight) => void
  minHeight?: string
}

/**
 * Renders multi-section TipTap content where each section gets its own TipTap editor
 */
export const MultiSectionTipTapViewer: React.FC<MultiSectionTipTapViewerProps> = ({
  contentTiptap,
  highlights = [],
  onContentChange,
  onHighlightCreate,
  onHighlightClick,
  minHeight = '200px',
}) => {
  const handleSectionChange = (sectionId: string, updatedContent: Record<string, unknown>) => {
    if (onContentChange) {
      onContentChange({
        ...contentTiptap,
        [sectionId]: updatedContent,
      })
    }
  }

  const handleHighlightCreate = (sectionId: string, highlight: Omit<HighlightData, 'sectionId'>) => {
    if (onHighlightCreate) {
      onHighlightCreate({
        ...highlight,
        sectionId,
      })
    }
  }

  // Get section titles from section IDs
  const getSectionTitle = (sectionId: string): string => {
    // Convert snake_case to Title Case
    return sectionId
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }

  const sections = Object.entries(contentTiptap)

  if (sections.length === 0) {
    return (
      <div className="multi-section-viewer-empty">
        <p>No content available.</p>
      </div>
    )
  }

  return (
    <div className="multi-section-tiptap-viewer">
      {sections.map(([sectionId, sectionContent]) => (
        <div key={sectionId} className="template-section template-section-compact">
          <h3 className="template-section-title template-section-title-compact">
            {getSectionTitle(sectionId)}
          </h3>
          <div className="template-section-content">
            <TipTapViewer
              contentTiptap={sectionContent as Record<string, unknown>}
              highlights={highlights.filter(h => h.textRange.startContainerId === sectionId)}
              onContentChange={(updated) => handleSectionChange(sectionId, updated)}
              onHighlightCreate={(highlight) => handleHighlightCreate(sectionId, highlight)}
              onHighlightClick={onHighlightClick}
              minHeight={minHeight}
            />
          </div>
        </div>
      ))}
    </div>
  )
}
