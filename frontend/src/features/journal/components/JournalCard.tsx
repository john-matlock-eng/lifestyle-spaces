import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../../stores/authStore'
import { JournalContentManager } from '../../../lib/journal/JournalContentManager'
import type { JournalEntry } from '../types/journal.types'
import '../styles/journal.css'

interface JournalCardProps {
  journal: JournalEntry
  onDelete?: (journalId: string) => void
}

/**
 * Card component for displaying a journal entry in a list
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

  // Extract clean preview text from journal content
  const getJournalPreview = (content: string, maxLength: number = 150): string => {
    try {
      // First, try to extract clean markdown (for non-templated journals)
      const cleanContent = JournalContentManager.extractCleanMarkdown(content)

      // If no clean content, parse sections instead
      if (!cleanContent || cleanContent.trim().length === 0) {
        const sections = JournalContentManager.extractDisplaySections(content)

        if (sections.length > 0) {
          // Build preview from sections
          const sectionPreviews = sections
            .map(section => {
              const cleanSection = section.content
                .replace(/[#*`[\]()]/g, '') // Remove markdown formatting
                .replace(/\n+/g, ' ') // Replace newlines with spaces
                .trim()

              if (cleanSection) {
                // For Q&A sections, try to parse and show question/answer
                if (section.type === 'q_and_a') {
                  try {
                    const qaPairs = JSON.parse(section.content)
                    if (Array.isArray(qaPairs) && qaPairs.length > 0) {
                      const firstPair = qaPairs[0]
                      return `${section.title}: ${firstPair.question}...`
                    }
                  } catch {
                    // Fall through to regular section display
                  }
                }

                // For list sections, try to parse and show items
                if (section.type === 'list') {
                  try {
                    const listItems = JSON.parse(section.content)
                    if (Array.isArray(listItems) && listItems.length > 0) {
                      return `${section.title}: ${listItems.map((item: { text: string }) => item.text).join(', ')}`
                    }
                  } catch {
                    // Fall through to regular section display
                  }
                }

                return `${section.title}: ${cleanSection.substring(0, 50)}`
              }
              return ''
            })
            .filter(Boolean)

          if (sectionPreviews.length > 0) {
            const fullPreview = sectionPreviews.join(' | ')
            return fullPreview.length > maxLength
              ? fullPreview.substring(0, maxLength) + '...'
              : fullPreview
          }
        }

        return 'No content available'
      }

      // Clean up the content
      const plainText = cleanContent
        .replace(/<!--[\s\S]*?-->/g, '') // Remove any HTML comments
        .replace(/[#*`[\]()]/g, '') // Remove markdown symbols
        .replace(/\n+/g, ' ') // Replace newlines with spaces
        .trim()

      // Truncate smartly (don't cut mid-word)
      if (plainText.length > maxLength) {
        const truncated = plainText.substring(0, maxLength)
        const lastSpace = truncated.lastIndexOf(' ')
        return (lastSpace > 0 ? truncated.substring(0, lastSpace) : truncated) + '...'
      }

      return plainText || 'No content'
    } catch (error) {
      console.error('Error parsing journal content:', error)
      // Fallback: remove obvious metadata patterns
      return content
        .replace(/<!--[\s\S]*?-->/g, '') // Remove HTML comments
        .replace(/@\w+:[^\n]*/g, '') // Remove @metadata lines
        .trim()
        .substring(0, maxLength) + '...'
    }
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

      <p className="journal-card-excerpt">{getJournalPreview(journal.content)}</p>

      <div className="journal-card-meta">
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
            {journal.tags.slice(0, 3).map((tag) => (
              <span key={tag} className="journal-tag">
                {tag}
              </span>
            ))}
            {journal.tags.length > 3 && (
              <span className="journal-tag">+{journal.tags.length - 3}</span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
