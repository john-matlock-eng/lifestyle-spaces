import React, { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { RichTextEditor } from '../components/RichTextEditor'
import { EmotionSelector } from '../components/EmotionSelector'
import { QASection } from '../components/sections/QASection'
import { AddSectionButton } from '../components/AddSectionButton'
import { ListSection } from '../components/sections/ListSection'
import { useJournal } from '../hooks/useJournal'
import { useAuth } from '../../../stores/authStore'
import { getTemplate } from '../services/templateApi'
import { JournalContentManager } from '../../../lib/journal/JournalContentManager'
import { AIAssistantDock } from '../components/AIAssistantDock'
import { aiService } from '../../../services/ai'
import { Ellie } from '../../../components/ellie'
import { useEllieCustomizationContext } from '../../../hooks/useEllieCustomizationContext'
import { useEllieJournalGuide } from '../hooks/useEllieJournalGuide'
import type { Template, TemplateData, QAPair, ListItem } from '../types/template.types'
import type { CustomSection } from '../types/customSection.types'
import { Trash2, Edit2, Bot } from 'lucide-react'
import '../styles/journal.css'
import '../styles/qa-section.css'
import '../styles/dynamic-sections.css'
import '../styles/ai-assistant-dock.css'

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
  const [customSections, setCustomSections] = useState<CustomSection[]>([])
  const [showAIDock, setShowAIDock] = useState(false)
  const [currentSectionId, setCurrentSectionId] = useState<string | undefined>()

  // Ellie customization
  const { customization } = useEllieCustomizationContext()

  // Template-driven Ellie guidance
  const {
    mood,
    position,
    thoughtText,
    particleEffect,
    handleTemplateSelect: onEllieTemplateSelect,
    handleJournalStart,
    handleSectionStart,
    updateSectionProgress,
    handleSectionComplete,
    handleSave: onEllieSave,
    getHint
  } = useEllieJournalGuide(template, currentSectionId)

  const handleAddCustomSection = (section: Omit<CustomSection, 'isEditing'>) => {
    setCustomSections([...customSections, { ...section, isEditing: false }])
  }

  const handleRemoveCustomSection = (id: string) => {
    setCustomSections(customSections.filter(s => s.id !== id))
  }

  const handleUpdateCustomSection = (id: string, updates: Partial<CustomSection>) => {
    setCustomSections(customSections.map(s =>
      s.id === id ? { ...s, ...updates } : s
    ))
  }

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
            const parsedCustomSections: CustomSection[] = []

            Object.entries(parsed.sections).forEach(([sectionId, section]) => {
              // Check if this is a custom section (starts with 'custom_')
              const isCustomSection = sectionId.startsWith('custom_')

              // Parse content based on section type
              let parsedContent: string | QAPair[] | ListItem[] | number
              if (section.type === 'q_and_a') {
                try {
                  // Parse JSON string back to QAPair array
                  parsedContent = JSON.parse(section.content) as QAPair[]
                } catch {
                  // If parsing fails, default to empty array
                  parsedContent = []
                }
              } else if (section.type === 'list') {
                try {
                  // Parse JSON string back to ListItem array
                  parsedContent = JSON.parse(section.content) as ListItem[]
                } catch {
                  // If parsing fails, default to empty array
                  parsedContent = []
                }
              } else {
                // Other sections are plain strings or numbers
                parsedContent = section.content
              }

              if (isCustomSection) {
                // Add to custom sections
                parsedCustomSections.push({
                  id: sectionId,
                  title: section.title || 'Untitled Section',
                  type: section.type || 'paragraph',
                  content: parsedContent,
                  isEditing: false
                })
              } else {
                // Add to template data
                parsedTemplateData[sectionId] = parsedContent
              }
            })

            setTemplateData(parsedTemplateData)
            setCustomSections(parsedCustomSections)
            console.log('[DEBUG EDIT LOAD] Template data extracted:', parsedTemplateData)
            console.log('[DEBUG EDIT LOAD] Custom sections extracted:', parsedCustomSections)

            // Notify Ellie of template and start editing
            onEllieTemplateSelect()
            handleJournalStart()
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
  }, [journal, onEllieTemplateSelect, handleJournalStart])

  const handleTemplateDataChange = (sectionId: string, value: string | QAPair[] | ListItem[] | number) => {
    // Get previous value before updating
    const previousValue = templateData[sectionId]

    setTemplateData((prev) => ({
      ...prev,
      [sectionId]: value
    }))

    // Update section progress for Ellie guidance
    if (typeof value === 'string') {
      // Word count for paragraph sections
      const wordCount = value.trim().split(/\s+/).filter(w => w.length > 0).length
      updateSectionProgress(sectionId, { wordCount })

      // Mark section as complete if it has content and was previously empty
      if (wordCount > 0 && (!previousValue || previousValue === '')) {
        handleSectionComplete(sectionId)
      }
    } else if (Array.isArray(value)) {
      // Item count for Q&A and list sections
      updateSectionProgress(sectionId, { itemCount: value.length })

      // Mark section as complete if it has items and was previously empty
      if (value.length > 0 && (!Array.isArray(previousValue) || previousValue.length === 0)) {
        handleSectionComplete(sectionId)
      }
    }
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
      if (template || customSections.length > 0) {
        // Convert templateData to the format expected by JournalContentManager
        const sections: Record<string, { content: string; title: string; type: string }> = {}

        // Add template sections
        if (template) {
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
            } else if (section.type === 'list') {
              // List sections store arrays of ListItem objects
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
        }

        // Add custom sections
        customSections.forEach(section => {
          if (section.type === 'q_and_a' || section.type === 'list') {
            // Q&A and List sections store arrays
            if (Array.isArray(section.content) && section.content.length > 0) {
              sections[section.id] = {
                content: JSON.stringify(section.content),
                title: section.title,
                type: section.type
              }
            }
          } else {
            // Other section types store strings
            if (section.content && typeof section.content === 'string' && section.content.trim()) {
              sections[section.id] = {
                content: section.content,
                title: section.title,
                type: section.type
              }
            }
          }
        })

        // Serialize everything into content with embedded metadata
        finalContent = JournalContentManager.serialize({
          template: template?.id || 'blank',
          templateVersion: String(template?.version || 1),
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

      // Notify Ellie of successful save
      onEllieSave()

      // Navigate after a brief celebration (Ellie's save guidance includes delay)
      setTimeout(() => {
        navigate(`/spaces/${spaceId}/journals/${journalId}`)
      }, 2000)
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

  const handleGenerateQuestions = async (type: 'reflection' | 'emotional' | 'growth' | 'patterns') => {
    if (!content.trim() && !title.trim()) {
      alert('Please write some content first so the AI can generate relevant questions')
      return
    }

    try {
      // Get the journal content (either from template sections or free-form content)
      let journalText = content
      if (template) {
        // Combine all template section content
        journalText = Object.values(templateData)
          .map(val => {
            if (typeof val === 'string') return val
            if (Array.isArray(val)) return JSON.stringify(val)
            return String(val)
          })
          .join('\n\n')
      }

      // Generate questions using AI
      const questions = await aiService.generateReflectionQuestions(
        journalText || title,
        title,
        emotions
      )

      // Find or create a Q&A section
      const qaSectionId = customSections.find(s => s.type === 'q_and_a')?.id

      if (!qaSectionId) {
        // Create new Q&A section
        const newSection: CustomSection = {
          id: `custom_${Date.now()}`,
          title: `${type.charAt(0).toUpperCase() + type.slice(1)} Questions`,
          type: 'q_and_a',
          content: questions.map((q, idx) => ({
            id: `q_${Date.now()}_${idx}`,
            question: q,
            answer: '',
            isCollapsed: false
          })),
          isEditing: false
        }
        setCustomSections([...customSections, newSection])
      } else {
        // Add to existing Q&A section
        handleUpdateCustomSection(qaSectionId, {
          content: [
            ...(Array.isArray(customSections.find(s => s.id === qaSectionId)?.content)
              ? customSections.find(s => s.id === qaSectionId)!.content as QAPair[]
              : []),
            ...questions.map((q, idx) => ({
              id: `q_${Date.now()}_${idx}`,
              question: q,
              answer: '',
              isCollapsed: false
            }))
          ]
        })
      }

      alert(`Added ${questions.length} ${type} questions to your journal!`)
    } catch (err) {
      console.error('Error generating questions:', err)
      alert('Failed to generate questions. Please try again.')
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
              <div
                key={section.id}
                className="journal-form-group"
                onFocus={() => {
                  setCurrentSectionId(section.id)
                  handleSectionStart(section.id)
                }}
              >
                <label htmlFor={section.id} className="journal-form-label">
                  {section.title}
                </label>
                {section.type === 'q_and_a' ? (
                  <QASection
                    value={(Array.isArray(templateData[section.id]) ? templateData[section.id] :
                      Array.isArray(section.defaultValue) ? section.defaultValue :
                      []) as QAPair[]}
                    onChange={(value) => handleTemplateDataChange(section.id, value)}
                    placeholder={section.placeholder}
                    disabled={isSubmitting}
                    config={section.config}
                  />
                ) : section.type === 'list' ? (
                  <ListSection
                    value={(Array.isArray(templateData[section.id]) ? templateData[section.id] :
                      Array.isArray(section.defaultValue) ? section.defaultValue :
                      []) as ListItem[]}
                    onChange={(value) => handleTemplateDataChange(section.id, value)}
                    placeholder={section.placeholder}
                    disabled={isSubmitting}
                  />
                ) : (
                  <RichTextEditor
                    content={typeof templateData[section.id] === 'string' ? templateData[section.id] as string :
                      typeof section.defaultValue === 'string' ? section.defaultValue :
                      ''}
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

        {/* Custom Sections */}
        {customSections.map(section => (
          <div key={section.id} className="journal-custom-section">
            <div className="custom-section-header">
              {section.isEditing ? (
                <input
                  type="text"
                  value={section.title}
                  onChange={(e) => handleUpdateCustomSection(section.id, { title: e.target.value })}
                  onBlur={() => handleUpdateCustomSection(section.id, { isEditing: false })}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleUpdateCustomSection(section.id, { isEditing: false })
                    }
                  }}
                  className="custom-section-title-input"
                  autoFocus
                />
              ) : (
                <h3 className="custom-section-title">{section.title}</h3>
              )}

              <div className="custom-section-actions">
                <button
                  type="button"
                  onClick={() => handleUpdateCustomSection(section.id, { isEditing: true })}
                  className="custom-section-edit"
                  title="Edit title"
                  disabled={isSubmitting}
                >
                  <Edit2 size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => handleRemoveCustomSection(section.id)}
                  className="custom-section-remove"
                  title="Remove section"
                  disabled={isSubmitting}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>

            <div className="custom-section-content">
              {section.type === 'paragraph' && (
                <RichTextEditor
                  content={typeof section.content === 'string' ? section.content : ''}
                  onChange={(content) => handleUpdateCustomSection(section.id, { content })}
                  placeholder="Write here..."
                  minHeight="200px"
                  showToolbar={true}
                  disabled={isSubmitting}
                />
              )}
              {section.type === 'q_and_a' && (
                <QASection
                  value={Array.isArray(section.content) ? section.content as QAPair[] : []}
                  onChange={(content) => handleUpdateCustomSection(section.id, { content })}
                  config={section.config}
                  disabled={isSubmitting}
                  showGenerateButton={true}
                  onGenerateQuestions={async (type) => {
                    // Get all journal content for context
                    let journalText = content
                    if (template || customSections.length > 0) {
                      journalText = [
                        ...Object.values(templateData).map(val => {
                          if (typeof val === 'string') return val
                          if (Array.isArray(val)) return JSON.stringify(val)
                          return String(val)
                        }),
                        ...customSections.map(s => {
                          if (typeof s.content === 'string') return s.content
                          if (Array.isArray(s.content)) return JSON.stringify(s.content)
                          return String(s.content)
                        })
                      ].filter(text => text.trim()).join('\n\n')
                    }

                    // Generate questions using AI with the selected type
                    const questions = await aiService.generateReflectionQuestions(
                      journalText || title,
                      title,
                      emotions,
                      type
                    )
                    return questions
                  }}
                />
              )}
              {section.type === 'list' && (
                <ListSection
                  value={Array.isArray(section.content) ? section.content as ListItem[] : []}
                  onChange={(content) => handleUpdateCustomSection(section.id, { content })}
                  disabled={isSubmitting}
                />
              )}
            </div>
          </div>
        ))}

        {/* Add Section Button */}
        <AddSectionButton
          onAddSection={handleAddCustomSection}
          currentSectionCount={(template?.sections.length || 0) + customSections.length}
          maxSections={15}
          disabled={isSubmitting}
        />

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
            onClick={() => setShowAIDock(!showAIDock)}
            className={`button-secondary ${showAIDock ? 'active' : ''}`}
            disabled={isSubmitting}
            title="AI Writing Assistant"
          >
            <Bot size={18} />
            {showAIDock ? 'Hide AI Assistant' : 'Show AI Assistant'}
          </button>
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

      {/* AI Assistant Dock */}
      {showAIDock && (
        <AIAssistantDock
          journalContent={
            // For templated journals, combine all section content
            template || customSections.length > 0
              ? [
                  // Template sections
                  ...Object.values(templateData).map(val => {
                    if (typeof val === 'string') return val
                    if (Array.isArray(val)) {
                      // For Q&A pairs and lists, extract content
                      return val.map((item: QAPair | ListItem | unknown) => {
                        if (typeof item === 'object' && item !== null) {
                          const qaItem = item as QAPair
                          if ('question' in qaItem && 'answer' in qaItem) {
                            return `**Q:** ${qaItem.question}\n\n**A:** ${qaItem.answer || '(not answered yet)'}`
                          }
                          const listItem = item as ListItem
                          if ('text' in listItem) {
                            return `- ${listItem.text}`
                          }
                        }
                        return String(item)
                      }).join('\n\n')
                    }
                    return String(val)
                  }),
                  // Custom sections
                  ...customSections.map(section => {
                    if (typeof section.content === 'string') return section.content
                    if (Array.isArray(section.content)) {
                      return section.content.map((item: QAPair | ListItem | unknown) => {
                        if (typeof item === 'object' && item !== null) {
                          const qaItem = item as QAPair
                          if ('question' in qaItem && 'answer' in qaItem) {
                            return `**Q:** ${qaItem.question}\n\n**A:** ${qaItem.answer || '(not answered yet)'}`
                          }
                          const listItem = item as ListItem
                          if ('text' in listItem) {
                            return `- ${listItem.text}`
                          }
                        }
                        return String(item)
                      }).join('\n\n')
                    }
                    return String(section.content)
                  })
                ]
                  .filter(text => text.trim())
                  .join('\n\n---\n\n')
              : content
          }
          journalTitle={title}
          journalId={journalId}
          emotions={emotions}
          onClose={() => setShowAIDock(false)}
          onGenerateQuestions={handleGenerateQuestions}
        />
      )}

      {/* Ellie companion */}
      <Ellie
        mood={mood}
        position={position}
        showThoughtBubble={true}
        thoughtText={thoughtText || "Let's refine this masterpiece! ✨"}
        size="md"
        particleEffect={particleEffect}
        onClick={() => {
          // Get a hint for the current section, or just be playful
          const hint = getHint()
          if (hint) {
            console.log('Ellie hint:', hint)
          }
        }}
        furColor={customization.furColor}
        collarStyle={customization.collarStyle}
        collarColor={customization.collarColor}
        collarTag={customization.collarTag}
      />
    </div>
  )
}
