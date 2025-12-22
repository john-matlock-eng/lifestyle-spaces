import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../../stores/authStore'
import { FrameworkBadge } from '../../../components/journal/JournalFilters/FrameworkBadge'
import { JournalMetadataBadges } from '../../../components/journal/JournalMetadataBadges'
import type { JournalCardEntry } from '../types/journal.types'
import '../styles/journal.css'

interface JournalCardProps {
  journal: JournalCardEntry
  onDelete?: (journalId: string) => void
}

/**
 * Card component for displaying a journal entry in a list
 * Uses lightweight JournalCardEntry with AI synopsis instead of full content
 */
export const JournalCard: React.FC<JournalCardProps> = ({ journal, onDelete }) => {
  const navigate = useNavigate()
  const { user } = useAuth()

  const isAuthor = user?.userId === journal.userId

  const handleClick = () => {
    navigate(`/spaces/${journal.spaceId}/journals/${journal.journalId}`)
  }

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation() // Don't trigger card click
    navigate(`/spaces/${journal.spaceId}/journals/${journal.journalId}/edit`)
  }

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation() // Don't trigger card click

    const confirmed = window.confirm(
      'Are you sure you want to delete this journal? This action cannot be undone.'
    )

    if (confirmed && onDelete) {
      onDelete(journal.journalId)
    }
  }

  // Get preview text from AI synopsis or fallback to word count
  const getPreviewText = (): string => {
    if (journal.aiMetadata?.synopsis) {
      const synopsis = journal.aiMetadata.synopsis
      // Truncate if too long
      if (synopsis.length > 180) {
        const truncated = synopsis.substring(0, 180)
        const lastSpace = truncated.lastIndexOf(' ')
        return (lastSpace > 0 ? truncated.substring(0, lastSpace) : truncated) + '...'
      }
      return synopsis
    }
    // Fallback when no AI metadata yet
    return `${journal.wordCount} words`
  }

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInMs = now.getTime() - date.getTime()
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24))

    if (diffInDays === 0) {
      return 'Today'
    } else if (diffInDays === 1) {
      return 'Yesterday'
    } else if (diffInDays < 7) {
      return `${diffInDays} days ago`
    } else {
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      })
    }
  }

  return (
    <div className="journal-card" onClick={handleClick} role="article">
      <div className="journal-card-header">
        <h3 className="journal-card-title">
          {journal.title}
          {journal.isPinned && <span className="journal-card-pin">📌</span>}
        </h3>
        {isAuthor && (
          <div className="journal-card-actions">
            <button
              onClick={handleEdit}
              className="journal-card-action-btn edit-btn"
              title="Edit journal"
              aria-label="Edit journal"
            >
              ✏️
            </button>
            {onDelete && (
              <button
                onClick={handleDelete}
                className="journal-card-action-btn delete-btn"
                title="Delete journal"
                aria-label="Delete journal"
              >
                🗑️
              </button>
            )}
          </div>
        )}
      </div>

      <p className="journal-card-excerpt">{getPreviewText()}</p>

      {/* AI Metadata Badges */}
      {journal.aiMetadata && (
        <div className="journal-card-ai-metadata">
          <JournalMetadataBadges
            metadata={journal.aiMetadata}
            compact
            maxThemes={2}
            showSentiment={true}
          />
        </div>
      )}

      <div className="journal-card-meta">
        {/* Framework Badge */}
        <FrameworkBadge
          frameworkId={journal.frameworkId}
          templateId={journal.templateId}
          compact
          testId={`journal-card-${journal.journalId}-framework`}
        />

        {journal.author && (
          <div className="journal-card-author">
            <span>👤</span>
            <span>{journal.author.displayName}</span>
          </div>
        )}

        <div className="journal-card-date">
          <span>📅</span>
          <span>{formatDate(journal.createdAt)}</span>
        </div>

        {journal.wordCount > 0 && (
          <div className="journal-card-word-count">
            <span>📝 {journal.wordCount} words</span>
          </div>
        )}

        {journal.tags && journal.tags.length > 0 && (
          <div className="journal-card-tags">
            {journal.tags.slice(0, 2).map((tag) => (
              <span key={tag} className="journal-tag" title={tag}>
                {tag.length > 10 ? `${tag.substring(0, 10)}...` : tag}
              </span>
            ))}
            {journal.tags.length > 2 && (
              <span
                className="journal-tag journal-tag-more"
                title={journal.tags.slice(2).join(', ')}
              >
                +{journal.tags.length - 2}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
