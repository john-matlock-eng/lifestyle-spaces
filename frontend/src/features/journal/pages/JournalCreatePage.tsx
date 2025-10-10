import React, { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { RichTextEditor } from '../components/RichTextEditor'
import { TemplatePicker } from '../components/TemplatePicker'
import { EmotionSelector } from '../components/EmotionSelector'
import { useJournal } from '../hooks/useJournal'
import type { Template, TemplateData } from '../types/template.types'
import '../styles/journal.css'

/**
 * Page for creating a new journal entry
 */
export const JournalCreatePage: React.FC = () => {
  const navigate = useNavigate()
  const { spaceId } = useParams<{ spaceId: string }>()
  const { createJournal, loading, error } = useJournal()

  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null)
  const [templateData, setTemplateData] = useState<TemplateData>({})
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [tags, setTags] = useState('')
  const [emotions, setEmotions] = useState<string[]>([])
  const [showTemplatePicker, setShowTemplatePicker] = useState(true)

  const handleTemplateSelect = (template: Template | null) => {
    setSelectedTemplate(template)
    if (template) {
      // Initialize template data with empty strings for each section
      const initialData: TemplateData = {}
      template.sections.forEach((section) => {
        initialData[section.id] = section.defaultValue || ''
      })
      setTemplateData(initialData)
      setShowTemplatePicker(false)
    } else {
      setTemplateData({})
    }
  }

  const handleTemplateDataChange = (sectionId: string, value: string) => {
    setTemplateData((prev) => ({
      ...prev,
      [sectionId]: value
    }))
  }

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

      // For templated journals, store a simple text summary in content field
      // The actual structured data is in templateData
      let finalContent = content
      if (selectedTemplate && templateData) {
        // Create a simple plain text summary for search/preview purposes
        finalContent = selectedTemplate.sections
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

      console.log('[DEBUG] Emotions state before submission:', emotions)
      console.log('[DEBUG] Emotions length:', emotions.length)

      const journal = await createJournal(spaceId, {
        title,
        content: finalContent,
        tags: tagsArray.length > 0 ? tagsArray : undefined,
        emotions: emotions.length > 0 ? emotions : undefined,
        templateId: selectedTemplate?.id,
        templateData: selectedTemplate ? templateData : undefined
      })

      navigate(`/spaces/${spaceId}/journals/${journal.journalId}`)
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

      {showTemplatePicker ? (
        <div className="template-picker-section">
          <TemplatePicker
            onSelectTemplate={handleTemplateSelect}
            selectedTemplateId={selectedTemplate?.id}
          />
          <div className="template-picker-actions">
            <button
              type="button"
              onClick={() => setShowTemplatePicker(false)}
              className="button-secondary"
            >
              Skip Template
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="journal-form">
          {selectedTemplate && (
            <div className="selected-template-info">
              <div className="selected-template-header">
                <span className="template-icon-large">{selectedTemplate.icon}</span>
                <div>
                  <h3>{selectedTemplate.name}</h3>
                  <p>{selectedTemplate.description}</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedTemplate(null)
                    setTemplateData({})
                    setShowTemplatePicker(true)
                  }}
                  className="button-secondary"
                >
                  Change Template
                </button>
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
              disabled={loading}
            />
          </div>

          {selectedTemplate ? (
            // Render template sections
            <div className="template-sections">
              {selectedTemplate.sections.map((section) => (
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
                    disabled={loading}
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
                disabled={loading}
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
            disabled={loading}
          />
        </div>

        <div className="journal-form-group">
          <label className="journal-form-label">
            Emotions (optional)
          </label>
          <EmotionSelector
            selectedEmotions={emotions}
            onEmotionsChange={setEmotions}
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
      )}
    </div>
  )
}
