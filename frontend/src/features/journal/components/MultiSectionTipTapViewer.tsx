import React from 'react'
import { TipTapViewer } from './TipTapViewer'

interface MultiSectionTipTapViewerProps {
  contentTiptap: Record<string, unknown>
  onContentChange?: (contentTiptap: Record<string, unknown>) => void
  minHeight?: string
}

/**
 * Renders multi-section TipTap content where each section gets its own TipTap editor
 */
export const MultiSectionTipTapViewer: React.FC<MultiSectionTipTapViewerProps> = ({
  contentTiptap,
  onContentChange,
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
              onContentChange={(updated) => handleSectionChange(sectionId, updated)}
              minHeight={minHeight}
            />
          </div>
        </div>
      ))}
    </div>
  )
}
