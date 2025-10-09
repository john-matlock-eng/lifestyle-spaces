import React, { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { RichTextEditor } from '../components/RichTextEditor'
import { useJournal } from '../hooks/useJournal'
import { useAuth } from '../../../stores/authStore'
import '../styles/journal.css'

/**
 * Page for editing an existing journal entry
 */
export const JournalEditPage: React.FC = () => {
  const navigate = useNavigate()
  const { journalId } = useParams<{ journalId: string }>()
  const { journal, loading, error, loadJournal, updateJournal } = useJournal()
  const { user } = useAuth()

  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [tags, setTags] = useState('')
  const [mood, setMood] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (journalId) {
      loadJournal(journalId)
    }
  }, [journalId, loadJournal])

  useEffect(() => {
    if (journal) {
      setTitle(journal.title)
      setContent(journal.content)
      setTags(journal.tags.join(', '))
      setMood(journal.mood || '')
    }
  }, [journal])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!journalId) {
      return
    }

    try {
      setIsSubmitting(true)

      const tagsArray = tags
        .split(',')
        .map((tag) => tag.trim())
        .filter((tag) => tag.length > 0)

      await updateJournal(journalId, {
        title,
        content,
        tags: tagsArray.length > 0 ? tagsArray : undefined,
        mood: mood || undefined
      })

      navigate(`/journals/${journalId}`)
    } catch (err) {
      console.error('Failed to update journal:', err)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancel = () => {
    if (journalId) {
      navigate(`/journals/${journalId}`)
    }
  }

  if (loading && !journal) {
    return (
      <div className="journal-form-container">
        <p>Loading journal...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="journal-form-container">
        <p>Error: {error}</p>
        <button onClick={handleCancel} className="button-secondary">
          Go Back
        </button>
      </div>
    )
  }

  if (!journal) {
    return (
      <div className="journal-form-container">
        <p>Journal not found</p>
        <button onClick={handleCancel} className="button-secondary">
          Go Back
        </button>
      </div>
    )
  }

  // Check if user is the author
  if (user?.userId !== journal.userId) {
    return (
      <div className="journal-form-container">
        <p>You don't have permission to edit this journal</p>
        <button onClick={handleCancel} className="button-secondary">
          Go Back
        </button>
      </div>
    )
  }

  return (
    <div className="journal-form-container">
      <h1>Edit Journal</h1>

      <form onSubmit={handleSubmit} className="journal-form">
        <div className="journal-form-group">
          <label htmlFor="title" className="journal-form-label">
            Title *
          </label>
          <input
            id="title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="journal-form-input title-input"
            placeholder="Give your journal a title..."
            required
            maxLength={200}
            disabled={isSubmitting}
          />
        </div>

        <div className="journal-form-group">
          <label htmlFor="content" className="journal-form-label">
            Content *
          </label>
          <RichTextEditor
            content={content}
            onChange={setContent}
            placeholder="Start writing your thoughts..."
            minHeight="400px"
            showToolbar={true}
            disabled={isSubmitting}
          />
        </div>

        <div className="journal-form-group">
          <label htmlFor="tags" className="journal-form-label">
            Tags (comma-separated)
          </label>
          <input
            id="tags"
            type="text"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            className="journal-form-input"
            placeholder="personal, reflection, goals..."
            disabled={isSubmitting}
          />
        </div>

        <div className="journal-form-group">
          <label htmlFor="mood" className="journal-form-label">
            Mood (optional)
          </label>
          <input
            id="mood"
            type="text"
            value={mood}
            onChange={(e) => setMood(e.target.value)}
            className="journal-form-input"
            placeholder="How are you feeling?"
            maxLength={50}
            disabled={isSubmitting}
          />
        </div>

        {error && <div className="journal-form-error">{error}</div>}

        <div className="journal-form-actions">
          <button
            type="button"
            onClick={handleCancel}
            className="button-secondary"
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button type="submit" className="button-primary" disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  )
}
