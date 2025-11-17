import React, { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { RichTextEditor } from '../components/RichTextEditor'
import { EmotionSelector } from '../components/EmotionSelector'
import { QASection } from '../components/sections/QASection'
import { AddSectionButton } from '../components/AddSectionButton'
import { ListSection } from '../components/sections/ListSection'
import { CheckboxSection } from '../components/sections/CheckboxSection'
import { ScaleSection } from '../components/sections/ScaleSection'
import { TableSection } from '../components/sections/TableSection'
import { useJournal } from '../hooks/useJournal'
import { useSectionTipTap } from '../hooks/useSectionTipTap'
import { useAuth } from '../../../stores/authStore'
import { getTemplate } from '../services/templateApi'
import { extractTemplateDataFromTipTap } from '../../../lib/journal/tiptapUtils'
import { AIAssistantDock } from '../components/AIAssistantDock'
import { aiService } from '../../../services/ai'
import { ElliePerch } from '../../../components/ellie'
import { useEllie } from '../../../contexts/EllieContext'
import { useEllieCustomizationContext } from '../../../hooks/useEllieCustomizationContext'
import { useEllieJournalGuide } from '../hooks/useEllieJournalGuide'
import type { Template, TemplateData, QAPair, ListItem, TableRow } from '../types/template.types'
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
  const [content, setContent] = useState('')  // For free-form editor initialization only
  const [tags, setTags] = useState('')
  const [emotions, setEmotions] = useState<string[]>([])
  const [isPrivate, setIsPrivate] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [template, setTemplate] = useState<Template | null>(null)
  const [templateData, setTemplateData] = useState<TemplateData>({})
  const [customSections, setCustomSections] = useState<CustomSection[]>([])
  const [showAIDock, setShowAIDock] = useState(false)
  const [currentSectionId, setCurrentSectionId] = useState<string | undefined>()

  // Multi-section TipTap state management
  const { updateSection, getAllSections } = useSectionTipTap()

  // Track if journal has been initialized to prevent duplicate template loads
  const initializedJournalId = useRef<string | null>(null)

  // Ellie customization
  const { customization } = useEllieCustomizationContext()

  // Ellie context for mood and typing state
  const { setMood: setEllieContextMood } = useEllie()

  // Template-driven Ellie guidance
  const {
    mood: guidanceMood,
    thoughtText,
    particleEffect,
    handleTemplateSelect: onEllieTemplateSelect,
    handleJournalStart,
    handleSectionStart,
    updateSectionProgress,
    handleSectionComplete,
    handleSave: onEllieSave,
    getHint,
    handleTyping
  } = useEllieJournalGuide(template, currentSectionId)

  // Sync guidance mood to context mood
  React.useEffect(() => {
    setEllieContextMood(guidanceMood)
  }, [guidanceMood, setEllieContextMood])

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

  // Typing handler for mobile OSK awareness
  const handleEditorFocus = React.useCallback(() => {
    if (handleTyping) {
      handleTyping()
    }
  }, [handleTyping])

  useEffect(() => {
    if (spaceId && journalId) {
      loadJournal(spaceId, journalId)
    }
  }, [spaceId, journalId, loadJournal])

  useEffect(() => {
    if (journal && initializedJournalId.current !== journal.journalId) {
      // Mark this journal as initialized to prevent duplicate template loads
      initializedJournalId.current = journal.journalId

      setTitle(journal.title)
      setTags(journal.tags.join(', '))
      setEmotions(journal.emotions || [])
      setIsPrivate(journal.isPrivate || false)

      // Parse content to extract template data if it exists
      // Skip loading for "blank" template (non-templated journals)
      if (journal.templateId && journal.templateId !== 'blank') {
        const loadTemplateAndParse = async () => {
          try {
            // Load the template definition
            const loadedTemplate = await getTemplate(journal.templateId!)
            setTemplate(loadedTemplate)

            // Extract template data from TipTap content
            const parsedTemplateData = extractTemplateDataFromTipTap(journal.contentTiptap)

            // Extract custom sections (sections with IDs starting with 'custom_')
            const parsedCustomSections: CustomSection[] = []
            Object.entries(parsedTemplateData).forEach(([sectionId, content]) => {
              if (sectionId.startsWith('custom_')) {
                // Find section type from contentTiptap structure
                const sectionType = 'paragraph' // Default type
                parsedCustomSections.push({
                  id: sectionId,
                  title: sectionId.replace('custom_', '').replace(/_/g, ' '),
                  type: sectionType,
                  content: content,
                  isEditing: false
                })
              }
            })

            setTemplateData(parsedTemplateData)
            setCustomSections(parsedCustomSections)

            // Notify Ellie of template and start editing
            onEllieTemplateSelect()
            handleJournalStart()
          } catch (err) {
            console.error('Failed to load template or extract data from contentTiptap:', err)
          }
        }
        loadTemplateAndParse()
      }
      // Note: Non-templated journals (blank template) are handled via TipTap editor
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [journal])

  const handleTemplateDataChange = (sectionId: string, value: string | QAPair[] | ListItem[] | TableRow[] | number) => {
    // Get previous value before updating
    const previousValue = templateData[sectionId]

    // Start section guidance if this is the first interaction with this section
    if (!previousValue || (typeof previousValue === 'string' && !previousValue.trim()) || (Array.isArray(previousValue) && previousValue.length === 0)) {
      handleSectionStart(sectionId)
      setCurrentSectionId(sectionId)
    }

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
    } else if (typeof value === 'number') {
      // Scale sections - mark as complete when user interacts
      if (previousValue === undefined || previousValue === 5) {
        handleSectionComplete(sectionId)
      }
    } else if (Array.isArray(value)) {
      // Item count for Q&A, list, and table sections
      updateSectionProgress(sectionId, { itemCount: value.length })

      // Mark section as complete if it has items and was previously empty
      if (value.length > 0 && (!Array.isArray(previousValue) || previousValue.length === 0)) {
        handleSectionComplete(sectionId)
      }

      // Convert Q&A pairs to TipTap format with qaPair nodes
      const section = template?.sections.find(s => s.id === sectionId) ||
                      customSections.find(s => s.id === sectionId)

      if (section?.type === 'q_and_a') {
        const qaPairs = value as QAPair[]
        const tiptapContent = {
          type: 'doc',
          content: qaPairs.map(pair => ({
            type: 'qaPair',
            attrs: {
              id: pair.id,
              isCollapsed: pair.isCollapsed || false
            },
            content: [
              {
                type: 'qaPairQuestion',
                content: pair.question ? [{ type: 'text', text: pair.question }] : []
              },
              {
                type: 'qaPairAnswer',
                content: pair.answer ? [{ type: 'text', text: pair.answer }] : []
              }
            ]
          }))
        }

        // Save to TipTap format
        updateSection(sectionId, tiptapContent)
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

      // Get TipTap content from all sections
      const contentTiptapToSave = getAllSections()
      console.log('[DEBUG EDIT] contentTiptap sections:', contentTiptapToSave ? Object.keys(contentTiptapToSave) : 'none')

      // TipTap-only: Send only contentTiptap, no markdown content field
      await updateJournal(spaceId, journalId, {
        title,
        contentTiptap: contentTiptapToSave || undefined,
        tags: tagsArray.length > 0 ? tagsArray : undefined,
        emotions: emotions.length > 0 ? emotions : undefined,
        isPrivate,
        templateId: template?.id
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
    if (!title.trim()) {
      alert('Please write some content first so the AI can generate relevant questions')
      return
    }

    try {
      // Get the journal content from template sections
      let journalText = ''
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
                    showGenerateButton={true}
                    onGenerateQuestions={async (type) => {
                      // Get all journal content for context
                      let journalText = ''
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

                      const questions = await aiService.generateReflectionQuestions(
                        journalText || title,
                        title,
                        emotions,
                        type
                      )
                      return questions
                    }}
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
                ) : section.type === 'checkbox' ? (
                  <CheckboxSection
                    value={(Array.isArray(templateData[section.id]) ? templateData[section.id] :
                      Array.isArray(section.defaultValue) ? section.defaultValue :
                      []) as ListItem[]}
                    onChange={(value) => handleTemplateDataChange(section.id, value)}
                    placeholder={section.placeholder}
                    disabled={isSubmitting}
                  />
                ) : section.type === 'table' ? (
                  <TableSection
                    value={(Array.isArray(templateData[section.id]) ? templateData[section.id] :
                      Array.isArray(section.defaultValue) ? section.defaultValue :
                      []) as TableRow[]}
                    onChange={(value) => handleTemplateDataChange(section.id, value)}
                    placeholder={section.placeholder}
                    disabled={isSubmitting}
                    config={section.config}
                  />
                ) : section.type === 'scale' ? (
                  <ScaleSection
                    value={(() => {
                      const val = templateData[section.id]
                      if (typeof val === 'number') return val
                      if (typeof section.defaultValue === 'number') return section.defaultValue
                      return 5
                    })()}
                    onChange={(value) => handleTemplateDataChange(section.id, value)}
                    placeholder={section.placeholder}
                    disabled={isSubmitting}
                    config={section.config}
                  />
                ) : (
                  <RichTextEditor
                    content={typeof templateData[section.id] === 'string' ? templateData[section.id] as string :
                      typeof section.defaultValue === 'string' ? section.defaultValue :
                      ''}
                    onChange={(value) => handleTemplateDataChange(section.id, value)}
                    onTipTapChange={(json) => updateSection(section.id, json)}
                    placeholder={section.placeholder}
                    minHeight="200px"
                    showToolbar={true}
                    disabled={isSubmitting}
                    onFocus={handleEditorFocus}
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
              onTipTapChange={(json) => updateSection('content', json)}
              placeholder="Start writing your thoughts..."
              minHeight="400px"
              showToolbar={true}
              disabled={isSubmitting}
              onFocus={handleEditorFocus}
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
                  onTipTapChange={(json) => updateSection(section.id, json)}
                  placeholder="Write here..."
                  minHeight="200px"
                  showToolbar={true}
                  disabled={isSubmitting}
                  onFocus={handleEditorFocus}
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
                    let journalText = ''
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
              {section.type === 'list' || section.type === 'checkbox' && (
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

        <div className="journal-form-group">
          <label className="journal-form-checkbox-label">
            <input
              type="checkbox"
              checked={isPrivate}
              onChange={(e) => setIsPrivate(e.target.checked)}
              disabled={isSubmitting}
            />
            <span>Private journal (only visible to you)</span>
          </label>
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
              : ''
          }
          journalTitle={title}
          journalId={journalId}
          emotions={emotions}
          onClose={() => setShowAIDock(false)}
          onGenerateQuestions={handleGenerateQuestions}
        />
      )}

      {/* Ellie companion */}
      <ElliePerch
        showThoughtBubble={true}
        thoughtText={thoughtText || "Let's refine this masterpiece! ✨"}
        size="md"
        particleEffect={particleEffect}
        onClick={() => {
          const hint = getHint()
          if (hint) {
            console.log('Ellie hint:', hint)
          }
        }}
        furColor={customization.furColor}
        collarStyle={customization.collarStyle}
        collarColor={customization.collarColor}
        collarTag={customization.collarTag}
        
        showPerchControl={true}
      />
    </div>
  )
}
