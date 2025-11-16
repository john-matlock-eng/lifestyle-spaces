import React, { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { RichTextEditor } from '../components/RichTextEditor'
import { TemplatePicker } from '../components/TemplatePicker'
import { EmotionSelector } from '../components/EmotionSelector'
import { QASection } from '../components/sections/QASection'
import { AddSectionButton } from '../components/AddSectionButton'
import { ListSection } from '../components/sections/ListSection'
import { CheckboxSection } from '../components/sections/CheckboxSection'
import { ScaleSection } from '../components/sections/ScaleSection'
import { TableSection } from '../components/sections/TableSection'
import AIWritingPrompts from '../../../components/AIWritingPrompts'
import { useJournal } from '../hooks/useJournal'
import { useSectionTipTap } from '../hooks/useSectionTipTap'
import { AIAssistantDock } from '../components/AIAssistantDock'
import { aiService } from '../../../services/ai'
import { ElliePerch } from '../../../components/ellie'
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
  const [isPrivate, setIsPrivate] = useState(false)
  const [showTemplatePicker, setShowTemplatePicker] = useState(true)
  const [customSections, setCustomSections] = useState<CustomSection[]>([])
  const [showAIDock, setShowAIDock] = useState(false)
  const [currentSectionId, setCurrentSectionId] = useState<string | undefined>()

  // Multi-section TipTap state management
  const { updateSection, getAllSections } = useSectionTipTap()

  // Ellie customization
  const { customization } = useEllieCustomizationContext()

  // Template-driven Ellie guidance
  const {
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
  } = useEllieJournalGuide(selectedTemplate, currentSectionId)

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

  const handleTemplateSelect = (template: Template | null) => {
    setSelectedTemplate(template)

    // Notify Ellie of template selection
    onEllieTemplateSelect()

    if (template) {
      // Initialize template data with appropriate default values based on section type
      const initialData: TemplateData = {}
      template.sections.forEach((section) => {
        if (section.defaultValue !== undefined) {
          // Cast default value based on section type
          if (section.type === 'q_and_a') {
            initialData[section.id] = (Array.isArray(section.defaultValue) ? section.defaultValue : []) as QAPair[]
          } else if (section.type === 'list' || section.type === 'checkbox') {
            initialData[section.id] = (Array.isArray(section.defaultValue) ? section.defaultValue : []) as ListItem[]
          } else if (section.type === 'table') {
            initialData[section.id] = (Array.isArray(section.defaultValue) ? section.defaultValue : []) as TableRow[]
          } else if (section.type === 'scale') {
            initialData[section.id] = typeof section.defaultValue === 'number' ? section.defaultValue : 5
          } else {
            initialData[section.id] = typeof section.defaultValue === 'string' ? section.defaultValue : ''
          }
        } else if (section.type === 'q_and_a') {
          initialData[section.id] = [] as QAPair[]
        } else if (section.type === 'list' || section.type === 'checkbox') {
          initialData[section.id] = [] as ListItem[]
        } else if (section.type === 'table') {
          initialData[section.id] = [] as TableRow[]
        } else if (section.type === 'scale') {
          initialData[section.id] = 5
        } else {
          initialData[section.id] = ''
        }

        // Initialize TipTap state for all sections (ensures they're saved even if empty)
        updateSection(section.id, {
          type: 'doc',
          content: [{ type: 'paragraph' }]
        })
      })
      setTemplateData(initialData)
      setShowTemplatePicker(false)

      // Notify Ellie that journal has started
      handleJournalStart()
    } else {
      setTemplateData({})
    }
  }

  const handleTemplateDataChange = (sectionId: string, value: string | QAPair[] | ListItem[] | TableRow[] | number) => {
    // Notify Ellie of typing activity
    handleTyping()

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
      const section = selectedTemplate?.sections.find(s => s.id === sectionId) ||
                      customSections.find(s => s.id === sectionId)

      if (section?.type === 'q_and_a') {
        const qaPairs = value as QAPair[]
        const tiptapContent = {
          type: 'doc',
          content: qaPairs.map(pair => ({
            type: 'qaPair',
            attrs: {
              id: pair.id,
              question: pair.question,
              answer: pair.answer,
              isCollapsed: pair.isCollapsed || false
            }
          }))
        }

        // Save to TipTap format
        updateSection(sectionId, tiptapContent)
      }
    }
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

      console.log('[DEBUG] Emotions state before submission:', emotions)
      console.log('[DEBUG] Emotions length:', emotions.length)

      const contentTiptapToSave = getAllSections()
      console.log('[DEBUG] contentTiptap sections:', contentTiptapToSave ? Object.keys(contentTiptapToSave) : 'none')
      console.log('[DEBUG] contentTiptap structure:', contentTiptapToSave ? JSON.stringify(contentTiptapToSave).substring(0, 200) : 'null')

      // WARNING: If contentTiptap is null, this means TipTap JSON wasn't captured!
      if (!contentTiptapToSave) {
        console.warn('[DEBUG] WARNING: contentTiptap is null! This will cause highlighting issues.')
        console.warn('[DEBUG] Template:', selectedTemplate?.id)
        console.warn('[DEBUG] Template sections:', selectedTemplate?.sections.map(s => s.id))
      }

      const journal = await createJournal(spaceId, {
        title,
        contentTiptap: contentTiptapToSave || { type: 'doc', content: [] },
        tags: tagsArray.length > 0 ? tagsArray : undefined,
        emotions: emotions.length > 0 ? emotions : undefined,
        isPrivate,
        templateId: selectedTemplate?.id
        // NO templateData field!
      })

      console.log('[DEBUG] Created journal response:', journal)

      // Notify Ellie of successful save
      onEllieSave()

      // Navigate after a brief celebration (Ellie's save guidance includes delay)
      setTimeout(() => {
        navigate(`/spaces/${spaceId}/journals/${journal.journalId}`)
      }, 2000)
    } catch (err) {
      // Error is handled by the hook
      console.error('Failed to create journal:', err)
    }
  }

  const handleCancel = () => {
    navigate(`/spaces/${spaceId}`)
  }

  const handleSelectPrompt = (prompt: string) => {
    // Add the prompt to the content with some formatting
    const promptText = `**Prompt:** ${prompt}\n\n`
    setContent(prevContent => {
      if (!prevContent.trim()) {
        return promptText
      }
      return `${prevContent}\n\n${promptText}`
    })
  }

  const handleGenerateQuestions = async (type: 'reflection' | 'emotional' | 'growth' | 'patterns') => {
    if (!content.trim() && !title.trim()) {
      alert('Please write some content first so the AI can generate relevant questions')
      return
    }

    try {
      // Get the journal content (either from template sections or free-form content)
      let journalText = content
      if (selectedTemplate) {
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
              onChange={(e) => {
                setTitle(e.target.value)
                handleTyping()
              }}
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
                      disabled={loading}
                      config={section.config}
                      showGenerateButton={true}
                      onGenerateQuestions={async (type) => {
                        // Get all journal content for context
                        let journalText = content
                        if (selectedTemplate || customSections.length > 0) {
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
                  ) : section.type === 'list' ? (
                    <ListSection
                      value={(Array.isArray(templateData[section.id]) ? templateData[section.id] :
                        Array.isArray(section.defaultValue) ? section.defaultValue :
                        []) as ListItem[]}
                      onChange={(value) => handleTemplateDataChange(section.id, value)}
                      placeholder={section.placeholder}
                      disabled={loading}
                    />
                  ) : section.type === 'checkbox' ? (
                    <CheckboxSection
                      value={(Array.isArray(templateData[section.id]) ? templateData[section.id] :
                        Array.isArray(section.defaultValue) ? section.defaultValue :
                        []) as ListItem[]}
                      onChange={(value) => handleTemplateDataChange(section.id, value)}
                      placeholder={section.placeholder}
                      disabled={loading}
                    />
                  ) : section.type === 'table' ? (
                    <TableSection
                      value={(Array.isArray(templateData[section.id]) ? templateData[section.id] :
                        Array.isArray(section.defaultValue) ? section.defaultValue :
                        []) as TableRow[]}
                      onChange={(value) => handleTemplateDataChange(section.id, value)}
                      placeholder={section.placeholder}
                      disabled={loading}
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
                      disabled={loading}
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
                      disabled={loading}
                    />
                  )}
                </div>
              ))}
            </div>
          ) : (
            // Free-form content editor
            <>
              <AIWritingPrompts
                onSelectPrompt={handleSelectPrompt}
                disabled={loading}
              />
              <div className="journal-form-group">
                <label htmlFor="content" className="journal-form-label">
                  Content *
                </label>
                <RichTextEditor
                  content={content}
                  onChange={(newContent) => {
                    setContent(newContent)
                    handleTyping()
                  }}
                  onTipTapChange={(json) => updateSection('content', json)}
                  placeholder="Start writing your thoughts..."
                  minHeight="400px"
                  showToolbar={true}
                  disabled={loading}
                />
              </div>
            </>
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
                    disabled={loading}
                  >
                    <Edit2 size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRemoveCustomSection(section.id)}
                    className="custom-section-remove"
                    title="Remove section"
                    disabled={loading}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              <div className="custom-section-content">
                {section.type === 'paragraph' && (
                  <RichTextEditor
                    content={typeof section.content === 'string' ? section.content : ''}
                    onChange={(content) => {
                      handleUpdateCustomSection(section.id, { content })
                      handleTyping()
                    }}
                    onTipTapChange={(json) => updateSection(section.id, json)}
                    placeholder="Write here..."
                    minHeight="200px"
                    showToolbar={true}
                    disabled={loading}
                  />
                )}
                {section.type === 'q_and_a' && (
                  <QASection
                    value={Array.isArray(section.content) ? section.content as QAPair[] : []}
                    onChange={(content) => {
                      handleUpdateCustomSection(section.id, { content })
                      handleTyping()
                    }}
                    config={section.config}
                    disabled={loading}
                    showGenerateButton={true}
                    onGenerateQuestions={async (type) => {
                      // Get all journal content for context
                      let journalText = content
                      if (selectedTemplate || customSections.length > 0) {
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
                    onChange={(content) => {
                      handleUpdateCustomSection(section.id, { content })
                      handleTyping()
                    }}
                    disabled={loading}
                  />
                )}
                {section.type === 'checkbox' && (
                  <CheckboxSection
                    value={Array.isArray(section.content) ? section.content as ListItem[] : []}
                    onChange={(content) => {
                      handleUpdateCustomSection(section.id, { content })
                      handleTyping()
                    }}
                    disabled={loading}
                  />
                )}
              </div>
            </div>
          ))}

          {/* Add Section Button */}
          <AddSectionButton
            onAddSection={handleAddCustomSection}
            currentSectionCount={(selectedTemplate?.sections.length || 0) + customSections.length}
            maxSections={15}
            disabled={loading}
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
            disabled={loading}
          />
        </div>

        <div className="journal-form-group">
          <label className="journal-form-label">
            Emotions (optional)
          </label>
          <EmotionSelector
            selectedEmotions={emotions}
            onEmotionsChange={(newEmotions) => {
              setEmotions(newEmotions)
              // Trigger Ellie reaction when emotions are selected
              if (newEmotions.length > emotions.length && selectedTemplate?.ellie?.onStart) {
                // User added an emotion - show supportive message
                console.log('[DEBUG] Emotion added, Ellie reacting')
              }
            }}
            disabled={loading}
          />
        </div>

        <div className="journal-form-group">
          <label className="journal-form-checkbox-label">
            <input
              type="checkbox"
              checked={isPrivate}
              onChange={(e) => setIsPrivate(e.target.checked)}
              disabled={loading}
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
            disabled={loading}
            title="AI Writing Assistant"
          >
            <Bot size={18} />
            {showAIDock ? 'Hide AI Assistant' : 'Show AI Assistant'}
          </button>
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

      {/* AI Assistant Dock */}
      {showAIDock && !showTemplatePicker && (
        <AIAssistantDock
          journalContent={
            // For templated journals, combine all section content
            selectedTemplate || customSections.length > 0
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
          journalId="draft"
          emotions={emotions}
          onClose={() => setShowAIDock(false)}
          onGenerateQuestions={handleGenerateQuestions}
        />
      )}

      {/* Ellie companion */}
      {!showTemplatePicker && (
        <ElliePerch
          showThoughtBubble={true}
          thoughtText={thoughtText || "Let's create something meaningful! 💫"}
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
          showPerchControl={true}
          
        />
      )}
    </div>
  )
}
