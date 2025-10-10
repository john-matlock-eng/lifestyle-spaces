import React, { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { RichTextEditor } from '../components/RichTextEditor'
import { EmotionSelector } from '../components/EmotionSelector'
import { useJournal } from '../hooks/useJournal'
import { useAuth } from '../../../stores/authStore'
import { getTemplate } from '../services/templateApi'
import type { Template, TemplateData } from '../types/template.types'
import '../styles/journal.css'

/**
 * Page for editing an existing journal entry
 */
export const JournalEditPage: React.FC = () => {
  const navigate = useNavigate()
  const { spaceId, journalId } = useParams<{ spaceId: string; journalId: string }>()
  const { journal, loading, error, loadJournal, updateJournal } = useJournal()
  const { user } = useAuth()

  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [tags, setTags] = useState('')
  const [emotions, setEmotions] = useState<string[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [template, setTemplate] = useState<Template | null>(null)
  const [templateData, setTemplateData] = useState<TemplateData>({})

  useEffect(() => {
    if (spaceId && journalId) {
      loadJournal(spaceId, journalId)
    }
  }, [spaceId, journalId, loadJournal])

  useEffect(() => {
    if (journal) {
      setTitle(journal.title)
      setContent(journal.content)
      setTags(journal.tags.join(', '))
      setEmotions(journal.emotions || [])

      // If journal has a template, load it and populate templateData
      if (journal.templateId && journal.templateData) {
        const loadTemplate = async () => {
          try {
            const loadedTemplate = await getTemplate(journal.templateId!)
            setTemplate(loadedTemplate)
            setTemplateData(journal.templateData as TemplateData)
          } catch (err) {
            console.error('Failed to load template:', err)
            // If template fails to load, fall back to content-only editing
          }
        }
        loadTemplate()
      }
    }
  }, [journal])

  const handleTemplateDataChange = (sectionId: string, value: string) => {
    setTemplateData((prev) => ({
      ...prev,
      [sectionId]: value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!spaceId || !journalId) {
      return
    }

    try {
      setIsSubmitting(true)

      const tagsArray = tags
        .split(',')
        .map((tag) => tag.trim())
        .filter((tag) => tag.length > 0)

      // For templated journals, store a simple text summary in content field
      // The actual structured data is in templateData
      let finalContent = content
      if (template && templateData) {
        // Create a simple plain text summary for search/preview purposes
        finalContent = template.sections
          .map((section) => {
            const sectionContent = templateData[section.id] || ''
            if (!sectionContent.trim()) return ''
            // Strip HTML tags for plain text summary
            const plainText = sectionContent.replace(/<[^>]*>/g, '').trim()
            return `${section.title}: ${plainText}`
          })
          .filter((section) => section.length > 0)
          .join(' | ')
      }

      await updateJournal(spaceId, journalId, {
        title,
        content: finalContent,
        tags: tagsArray.length > 0 ? tagsArray : undefined,
        emotions: emotions.length > 0 ? emotions : undefined
      })

      navigate(`/spaces/${spaceId}/journals/${journalId}`)
    } catch (err) {
      console.error('Failed to update journal:', err)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancel = () => {
    if (spaceId && journalId) {
      navigate(`/spaces/${spaceId}/journals/${journalId}`)
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
        {template && (
          <div className="selected-template-info">
            <div className="selected-template-header">
              <span className="template-icon-large">{template.icon}</span>
              <div>
                <h3>{template.name}</h3>
                <p>{template.description}</p>
              </div>
            </div>
          </div>
        )}

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

        {template ? (
          // Render template sections
          <div className="template-sections">
            {template.sections.map((section) => (
              <div key={section.id} className="journal-form-group">
                <label htmlFor={section.id} className="journal-form-label">
                  {section.title}
                </label>
                <RichTextEditor
                  content={templateData[section.id] || ''}
                  onChange={(value) => handleTemplateDataChange(section.id, value)}
                  placeholder={section.placeholder}
                  minHeight="200px"
                  showToolbar={true}
                  disabled={isSubmitting}
                />
              </div>
            ))}
          </div>
        ) : (
          // Free-form content editor
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
        )}

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
          <label className="journal-form-label">
            Emotions (optional)
          </label>
          <EmotionSelector
            selectedEmotions={emotions}
            onEmotionsChange={setEmotions}
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
