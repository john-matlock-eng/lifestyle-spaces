import React, { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { RichTextEditor } from '../components/RichTextEditor'
import { EmotionSelector } from '../components/EmotionSelector'
import { QASection } from '../components/sections/QASection'
import { useJournal } from '../hooks/useJournal'
import { useAuth } from '../../../stores/authStore'
import { getTemplate } from '../services/templateApi'
import { JournalContentManager } from '../../../lib/journal/JournalContentManager'
import type { Template, TemplateData } from '../types/template.types'
import '../styles/journal.css'
import '../styles/qa-section.css'

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
      setTags(journal.tags.join(', '))
      setEmotions(journal.emotions || [])

      // Parse content to extract template data if it exists
      if (journal.templateId) {
        const loadTemplateAndParse = async () => {
          try {
            // Load the template definition
            const loadedTemplate = await getTemplate(journal.templateId!)
            setTemplate(loadedTemplate)

            // Parse the content to extract embedded template data
            const parsed = JournalContentManager.parse(journal.content)

            console.log('[DEBUG EDIT LOAD] Parsed content:', parsed)
            console.log('[DEBUG EDIT LOAD] Parsed sections:', Object.keys(parsed.sections))

            // Convert parsed sections back to TemplateData format for editing
            const parsedTemplateData: TemplateData = {}
            Object.entries(parsed.sections).forEach(([sectionId, section]) => {
              // Check if this is a Q&A section
              if (section.type === 'q_and_a') {
                try {
                  // Parse JSON string back to QAPair array
                  parsedTemplateData[sectionId] = JSON.parse(section.content)
                } catch {
                  // If parsing fails, default to empty array
                  parsedTemplateData[sectionId] = []
                }
              } else {
                // Other sections are plain strings
                parsedTemplateData[sectionId] = section.content
              }
            })

            setTemplateData(parsedTemplateData)
            console.log('[DEBUG EDIT LOAD] Template data extracted:', parsedTemplateData)
          } catch (err) {
            console.error('Failed to load template or parse content:', err)
            // If template fails to load, fall back to content-only editing
            setContent(journal.content)
          }
        }
        loadTemplateAndParse()
      } else {
        // Non-templated journal, just set the content
        setContent(journal.content)
      }
    }
  }, [journal])

  const handleTemplateDataChange = (sectionId: string, value: string | any) => {
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

      // Use JournalContentManager to serialize template data into content field
      let finalContent = content
      if (template && templateData) {
        // Convert templateData to the format expected by JournalContentManager
        const sections: Record<string, { content: string; title: string; type: string }> = {}
        template.sections.forEach((section) => {
          const sectionContent = templateData[section.id]

          // Handle different section types
          if (section.type === 'q_and_a') {
            // Q&A sections store arrays of QAPair objects
            if (Array.isArray(sectionContent) && sectionContent.length > 0) {
              sections[section.id] = {
                content: JSON.stringify(sectionContent),
                title: section.title,
                type: section.type
              }
            }
          } else {
            // Other sections store strings
            if (sectionContent && typeof sectionContent === 'string' && sectionContent.trim()) {
              sections[section.id] = {
                content: sectionContent,
                title: section.title,
                type: section.type
              }
            }
          }
        })

        // Serialize everything into content with embedded metadata
        finalContent = JournalContentManager.serialize({
          template: template.id,
          templateVersion: String(template.version || 1),
          metadata: {
            title,
            emotions: emotions.length > 0 ? emotions : undefined
          },
          sections
        })

        console.log('[DEBUG EDIT] Serialized content length:', finalContent.length)
        console.log('[DEBUG EDIT] Template data sections:', Object.keys(templateData))
      }

      console.log('[DEBUG EDIT] Updating journal with content only (no templateData field)')

      await updateJournal(spaceId, journalId, {
        title,
        content: finalContent,
        tags: tagsArray.length > 0 ? tagsArray : undefined,
        emotions: emotions.length > 0 ? emotions : undefined,
        templateId: template?.id
        // NO templateData field!
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
                {section.type === 'q_and_a' ? (
                  <QASection
                    value={templateData[section.id] || section.defaultValue || []}
                    onChange={(value) => handleTemplateDataChange(section.id, value)}
                    placeholder={section.placeholder}
                    disabled={isSubmitting}
                    config={section.config}
                  />
                ) : (
                  <RichTextEditor
                    content={templateData[section.id] || ''}
                    onChange={(value) => handleTemplateDataChange(section.id, value)}
                    placeholder={section.placeholder}
                    minHeight="200px"
                    showToolbar={true}
                    disabled={isSubmitting}
                  />
                )}
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
