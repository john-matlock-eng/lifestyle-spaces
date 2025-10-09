import React, { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { RichTextEditor } from '../components/RichTextEditor'
import { useJournal } from '../hooks/useJournal'
import '../styles/journal.css'

/**
 * Page for creating a new journal entry
 */
export const JournalCreatePage: React.FC = () => {
  const navigate = useNavigate()
  const { spaceId } = useParams<{ spaceId: string }>()
  const { createJournal, loading, error } = useJournal()

  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [tags, setTags] = useState('')
  const [mood, setMood] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!spaceId) {
      return
    }

    try {
      const tagsArray = tags
        .split(',')
        .map((tag) => tag.trim())
        .filter((tag) => tag.length > 0)

      const journal = await createJournal(spaceId, {
        title,
        content,
        tags: tagsArray.length > 0 ? tagsArray : undefined,
        mood: mood || undefined
      })

      navigate(`/journals/${journal.journalId}`)
    } catch (err) {
      // Error is handled by the hook
      console.error('Failed to create journal:', err)
    }
  }

  const handleCancel = () => {
    navigate(`/spaces/${spaceId}`)
  }

  if (!spaceId) {
    return (
      <div className="journal-form-container">
        <p>Error: Space ID not found</p>
      </div>
    )
  }

  return (
    <div className="journal-form-container">
      <h1>Create New Journal</h1>

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
            disabled={loading}
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
            disabled={loading}
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
            disabled={loading}
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
            disabled={loading}
          />
        </div>

        {error && <div className="journal-form-error">{error}</div>}

        <div className="journal-form-actions">
          <button
            type="button"
            onClick={handleCancel}
            className="button-secondary"
            disabled={loading}
          >
            Cancel
          </button>
          <button type="submit" className="button-primary" disabled={loading}>
            {loading ? 'Creating...' : 'Create Journal'}
          </button>
        </div>
      </form>
    </div>
  )
}
