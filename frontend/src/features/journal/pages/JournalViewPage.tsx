import React, { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useJournal } from '../hooks/useJournal'
import { useAuth } from '../../../stores/authStore'
import ReactMarkdown from 'react-markdown'
import '../styles/journal.css'

/**
 * Page for viewing a single journal entry
 */
export const JournalViewPage: React.FC = () => {
  const navigate = useNavigate()
  const { spaceId, journalId } = useParams<{ spaceId: string; journalId: string }>()
  const { journal, loading, error, loadJournal, deleteJournal } = useJournal()
  const { user } = useAuth()
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    if (spaceId && journalId) {
      loadJournal(spaceId, journalId)
    }
  }, [spaceId, journalId, loadJournal])

  const handleEdit = () => {
    if (spaceId && journalId) {
      navigate(`/spaces/${spaceId}/journals/${journalId}/edit`)
    }
  }

  const handleDelete = async () => {
    if (!spaceId || !journalId) return

    const confirmed = window.confirm(
      'Are you sure you want to delete this journal? This action cannot be undone.'
    )

    if (!confirmed) return

    try {
      setIsDeleting(true)
      await deleteJournal(spaceId, journalId)
      navigate(`/spaces/${spaceId}`)
    } catch (err) {
      console.error('Failed to delete journal:', err)
    } finally {
      setIsDeleting(false)
    }
  }

  const handleBack = () => {
    if (journal?.spaceId) {
      navigate(`/spaces/${journal.spaceId}`)
    } else {
      navigate('/dashboard')
    }
  }

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

  if (loading) {
    return (
      <div className="journal-view-container">
        <p>Loading journal...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="journal-view-container">
        <p>Error: {error}</p>
        <button onClick={handleBack} className="button-secondary">
          Go Back
        </button>
      </div>
    )
  }

  if (!journal) {
    return (
      <div className="journal-view-container">
        <p>Journal not found</p>
        <button onClick={handleBack} className="button-secondary">
          Go Back
        </button>
      </div>
    )
  }

  const isAuthor = user?.userId === journal.userId
  const canEdit = isAuthor

  return (
    <div className="journal-view-container">
      <button onClick={handleBack} className="button-secondary" style={{ marginBottom: '16px' }}>
        ← Back
      </button>

      <div className="journal-view-header">
        <h1 className="journal-view-title">
          {journal.title}
          {journal.isPinned && <span className="journal-card-pin">📌</span>}
        </h1>

        <div className="journal-view-meta">
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

          {journal.updatedAt !== journal.createdAt && (
            <div className="journal-card-date">
              <span>✏️</span>
              <span>Updated {formatDate(journal.updatedAt)}</span>
            </div>
          )}

          {journal.wordCount > 0 && (
            <div>
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
              {journal.tags.map((tag) => (
                <span key={tag} className="journal-tag">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="journal-view-content">
        <ReactMarkdown>{journal.content}</ReactMarkdown>
      </div>

      {canEdit && (
        <div className="journal-view-actions">
          <button
            onClick={handleDelete}
            className="button-danger"
            disabled={isDeleting}
          >
            {isDeleting ? 'Deleting...' : 'Delete'}
          </button>
          <button onClick={handleEdit} className="button-primary">
            Edit
          </button>
        </div>
      )}
    </div>
  )
}
