import React, { useState } from 'react'
import { getEmotionById } from '../data/emotionData'
import type { Template } from '../types/template.types'
import type { HeaderState } from '../hooks/useScrollProgress'
import { JournalContentManager } from '../../../lib/journal/JournalContentManager'

export interface JournalHeaderCompactProps {
  /** Journal title - will be displayed in full (no truncation) */
  title: string
  /** Full journal content for generating subtitle preview */
  content: string
  /** Journal template if using structured content */
  template?: Template | null
  /** Author information */
  author?: { displayName: string; email: string }
  /** Creation date */
  createdAt: string
  /** Last update date */
  updatedAt: string
  /** Whether journal is pinned */
  isPinned?: boolean
  /** Emotion IDs */
  emotions?: string[]
  /** Topic tags */
  tags?: string[]
  /** Word count */
  wordCount: number
  /** Highlight count */
  highlightCount: number
  /** Total comment count */
  commentCount: number
  /** Current header state from scroll */
  headerState: HeaderState
  /** Reading progress percentage (0-100) */
  readProgress: number
  /** Current density setting */
  density: 'compact' | 'comfortable' | 'spacious'
  /** Density change handler */
  onDensityChange: (density: 'compact' | 'comfortable' | 'spacious') => void
  /** Read time string */
  readTime: string
}

/**
 * Progressive disclosure header for journal reading view
 * Features:
 * - Full title display (no truncation)
 * - Subtitle preview (first 60 chars of content)
 * - Grouped tag system (emotions vs topics)
 * - Collapsible metadata section
 * - Reading progress bar
 * - Scroll-based state transitions
 */
export const JournalHeaderCompact: React.FC<JournalHeaderCompactProps> = ({
  title,
  content,
  template,
  author,
  createdAt,
  updatedAt,
  isPinned,
  emotions = [],
  tags = [],
  wordCount,
  highlightCount,
  commentCount,
  headerState,
  readProgress,
  density,
  onDensityChange,
  readTime
}) => {
  const [isMetadataExpanded, setIsMetadataExpanded] = useState(false)

  // Extract subtitle from content (first 60 chars)
  const getSubtitle = (): string => {
    const cleanContent = template
      ? JournalContentManager.extractCleanMarkdown(content)
      : content

    // Remove markdown formatting and get plain text
    const plainText = cleanContent
      .replace(/[#*_~`>\-[\]()]/g, '')
      .replace(/\s+/g, ' ')
      .trim()

    const subtitle = plainText.substring(0, 60)
    return subtitle.length < plainText.length ? `${subtitle}...` : subtitle
  }

  // Format date helper
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const subtitle = getSubtitle()
  const hasEmotions = emotions.length > 0
  const hasTags = tags.length > 0
  const hasMetadata = author || createdAt || updatedAt

  // Separate emotion tags from topic tags
  const emotionTags = emotions
    .map((emotionId) => getEmotionById(emotionId))
    .filter((emotion): emotion is NonNullable<typeof emotion> => !!emotion)

  return (
    <header
      className={`journal-header-progressive ${headerState}`}
      data-testid="journal-header-compact"
    >
      {/* Reading Progress Bar */}
      <div className="journal-progress-bar-container">
        <div
          className="journal-progress-bar"
          style={{ width: `${readProgress}%` }}
          aria-label={`Reading progress: ${Math.round(readProgress)}%`}
        />
      </div>

      {/* Header Content */}
      <div className="journal-header-content">
        {/* Title Row - Always visible */}
        <div className="journal-header-title-row">
          <div className="journal-header-title-section">
            <h1 className="journal-header-title">
              {title}
              {isPinned && <span className="journal-pin-icon">📌</span>}
            </h1>
            {headerState === 'full' && subtitle && (
              <p className="journal-header-subtitle">{subtitle}</p>
            )}
            {template && headerState === 'full' && (
              <div className="journal-template-badge">
                <span>{template.icon}</span>
                <span>{template.name}</span>
              </div>
            )}
          </div>

          {/* Density Toggle - Hidden in compact/hidden states */}
          {headerState === 'full' && (
            <div className="journal-density-toggle">
              <button
                className={`density-btn ${density === 'compact' ? 'active' : ''}`}
                onClick={() => onDensityChange('compact')}
                title="Compact view"
                aria-label="Compact view"
              >
                Compact
              </button>
              <button
                className={`density-btn ${density === 'comfortable' ? 'active' : ''}`}
                onClick={() => onDensityChange('comfortable')}
                title="Comfortable view"
                aria-label="Comfortable view"
              >
                Comfortable
              </button>
              <button
                className={`density-btn ${density === 'spacious' ? 'active' : ''}`}
                onClick={() => onDensityChange('spacious')}
                title="Spacious view"
                aria-label="Spacious view"
              >
                Spacious
              </button>
            </div>
          )}
        </div>

        {/* Tags Section - Visible in full state */}
        {headerState === 'full' && (hasEmotions || hasTags) && (
          <div className="journal-header-tags">
            {/* Emotional Tags Group */}
            {hasEmotions && (
              <div className="journal-tag-group">
                <span className="journal-tag-group-icon">💭</span>
                <div className="journal-tag-pills">
                  {emotionTags.map((emotion) => (
                    <span
                      key={emotion.id}
                      className="journal-tag-pill emotion"
                      style={{
                        backgroundColor: `${emotion.color}20`,
                        borderColor: emotion.color,
                        color: emotion.color
                      }}
                    >
                      {emotion.label}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Topic Tags Group */}
            {hasTags && (
              <div className="journal-tag-group">
                <span className="journal-tag-group-icon">🏷️</span>
                <div className="journal-tag-pills">
                  {tags.map((tag) => (
                    <span key={tag} className="journal-tag-pill topic">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Collapsible Metadata Section - Visible in full state */}
        {headerState === 'full' && hasMetadata && (
          <div className="journal-header-metadata">
            <button
              className="journal-metadata-toggle"
              onClick={() => setIsMetadataExpanded(!isMetadataExpanded)}
              aria-expanded={isMetadataExpanded}
              aria-controls="journal-metadata-content"
            >
              <span>Details</span>
              <span className={`toggle-icon ${isMetadataExpanded ? 'expanded' : ''}`}>
                ▼
              </span>
            </button>

            {isMetadataExpanded && (
              <div
                id="journal-metadata-content"
                className="journal-metadata-content"
              >
                {author && (
                  <div className="journal-meta-item">
                    <span className="meta-icon">👤</span>
                    <span className="meta-label">Author:</span>
                    <span className="meta-value">{author.displayName}</span>
                  </div>
                )}
                <div className="journal-meta-item">
                  <span className="meta-icon">📅</span>
                  <span className="meta-label">Created:</span>
                  <span className="meta-value">{formatDate(createdAt)}</span>
                </div>
                {updatedAt !== createdAt && (
                  <div className="journal-meta-item">
                    <span className="meta-icon">✏️</span>
                    <span className="meta-label">Updated:</span>
                    <span className="meta-value">{formatDate(updatedAt)}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Quick Stats - Always visible, compact in non-full states */}
        <div className={`journal-header-stats ${headerState === 'full' ? 'expanded' : 'compact'}`}>
          <div className="journal-stat">
            <span className="stat-icon">📝</span>
            <span className="stat-value">{wordCount}</span>
            {headerState === 'full' && <span className="stat-label">words</span>}
          </div>
          <div className="journal-stat">
            <span className="stat-icon">⏱️</span>
            <span className="stat-value">{readTime}</span>
            {headerState === 'full' && <span className="stat-label">read</span>}
          </div>
          <div className="journal-stat">
            <span className="stat-icon">🎨</span>
            <span className="stat-value">{highlightCount}</span>
            {headerState === 'full' && (
              <span className="stat-label">
                {highlightCount === 1 ? 'highlight' : 'highlights'}
              </span>
            )}
          </div>
          <div className="journal-stat">
            <span className="stat-icon">💬</span>
            <span className="stat-value">{commentCount}</span>
            {headerState === 'full' && (
              <span className="stat-label">
                {commentCount === 1 ? 'comment' : 'comments'}
              </span>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
