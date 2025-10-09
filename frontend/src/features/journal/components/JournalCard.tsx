import React from 'react'
import { useNavigate } from 'react-router-dom'
import type { JournalEntry } from '../types/journal.types'
import '../styles/journal.css'

interface JournalCardProps {
  journal: JournalEntry
}

/**
 * Card component for displaying a journal entry in a list
 */
export const JournalCard: React.FC<JournalCardProps> = ({ journal }) => {
  const navigate = useNavigate()

  const handleClick = () => {
    navigate(`/journals/${journal.journalId}`)
  }

  // Extract plain text from markdown for excerpt
  const getExcerpt = (content: string, maxLength: number = 200): string => {
    // Remove markdown formatting (basic cleanup)
    const plainText = content
      .replace(/#+\s/g, '') // Remove headers
      .replace(/\*\*(.+?)\*\*/g, '$1') // Remove bold
      .replace(/\*(.+?)\*/g, '$1') // Remove italic
      .replace(/\[(.+?)\]\(.+?\)/g, '$1') // Remove links
      .replace(/`(.+?)`/g, '$1') // Remove inline code
      .replace(/```[\s\S]*?```/g, '') // Remove code blocks
      .trim()

    return plainText.length > maxLength
      ? plainText.substring(0, maxLength) + '...'
      : plainText
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
      </div>

      <p className="journal-card-excerpt">{getExcerpt(journal.content)}</p>

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

        {journal.mood && (
          <div className="journal-card-mood">
            <span>💭</span>
            <span>{journal.mood}</span>
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
