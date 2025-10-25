import React, { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useJournal } from '../hooks/useJournal'
import { useAuth } from '../../../stores/authStore'
import { getTemplate } from '../services/templateApi'
import { getEmotionById } from '../data/emotionData'
import { JournalContentManager } from '../../../lib/journal/JournalContentManager'
import type { DisplaySection } from '../../../lib/journal/types'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { Template } from '../types/template.types'
import { SmartEllie } from '../../../components/ellie'
import { useEllieCustomizationContext } from '../../../hooks/useEllieCustomizationContext'
import { AIAssistantDock } from '../components/AIAssistantDock'
import { HighlightableText } from '../components/HighlightableText'
import { CommentThread } from '../components/CommentThread'
import { PresenceAvatars } from '../components/PresenceAvatars'
import { ConnectionStatus } from '../components/ConnectionStatus'
import { useHighlightsRealtime } from '../hooks/useHighlightsRealtime'
import type { Highlight } from '../types/highlight.types'
import '../styles/journal.css'
import '../styles/qa-section.css'
import '../styles/dynamic-sections.css'
import '../styles/ai-assistant-dock.css'
import '../styles/journal-compact.css'

/**
 * Page for viewing a single journal entry
 */
export const JournalViewPage: React.FC = () => {
  const navigate = useNavigate()
  const { spaceId, journalId } = useParams<{ spaceId: string; journalId: string }>()
  const { journal, loading, error, loadJournal, deleteJournal } = useJournal()
  const { user } = useAuth()
  const [isDeleting, setIsDeleting] = useState(false)
  const [template, setTemplate] = useState<Template | null>(null)
  const [displaySections, setDisplaySections] = useState<DisplaySection[]>([])
  const [showAIDock, setShowAIDock] = useState(false)
  const [selectedHighlight, setSelectedHighlight] = useState<Highlight | null>(null)
  const [density, setDensity] = useState<'compact' | 'comfortable' | 'spacious'>('comfortable')

  // Highlights and comments real-time feature
  const {
    highlights,
    comments,
    activeUsers,
    isConnected,
    isConnecting,
    error: highlightError,
    createHighlight,
    updateHighlight,
    deleteHighlight,
    createComment,
    deleteComment,
    fetchComments,
    reconnect
  } = useHighlightsRealtime(spaceId || '', journalId || '')

  // Ellie companion - just use mood state, SmartEllie manages position
  const [mood, setMood] = useState<'idle' | 'happy' | 'excited' | 'curious' | 'playful' | 'sleeping' | 'walking' | 'concerned' | 'proud' | 'zen' | 'celebrating'>('happy')

  // Ellie customization
  const { customization } = useEllieCustomizationContext()

  // Handler to open highlight and load its comments
  const handleHighlightClick = (highlight: Highlight) => {
    setSelectedHighlight(highlight)
    // Fetch comments for this highlight
    fetchComments(highlight.id)
  }

  useEffect(() => {
    if (spaceId && journalId) {
      loadJournal(spaceId, journalId)
    }
  }, [spaceId, journalId, loadJournal])

  useEffect(() => {
    // Load template and parse content if journal has one
    if (journal?.templateId) {
      const loadTemplateAndParse = async () => {
        try {
          const templateData = await getTemplate(journal.templateId!)
          setTemplate(templateData)

          // Parse the content to extract template sections
          const sections = JournalContentManager.extractDisplaySections(journal.content)
          setDisplaySections(sections)

          console.log('[DEBUG VIEW] Parsed sections:', sections)
        } catch (err) {
          console.error('Failed to load template or parse content:', err)
          setDisplaySections([])
        }
      }
      loadTemplateAndParse()
    } else {
      setTemplate(null)
      setDisplaySections([])
    }
  }, [journal])

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

  const handleExportMarkdown = () => {
    if (!journal) return

    // Create filename from title and date
    const safeTitle = journal.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()
    const dateStr = new Date(journal.createdAt).toISOString().split('T')[0]
    const filename = `${safeTitle}_${dateStr}.md`

    // Get the markdown content
    const content = template
      ? JournalContentManager.extractCleanMarkdown(journal.content)
      : journal.content

    // Create markdown file with metadata
    const markdown = `# ${journal.title}

**Date:** ${formatDate(journal.createdAt)}
${journal.author ? `**Author:** ${journal.author.displayName}\n` : ''}${journal.tags && journal.tags.length > 0 ? `**Tags:** ${journal.tags.join(', ')}\n` : ''}
---

${content}
`

    // Create blob and download
    const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  // Calculate read time (average 200 words per minute)
  const calculateReadTime = (wordCount: number): string => {
    const minutes = Math.ceil(wordCount / 200)
    return minutes === 1 ? '1 min' : `${minutes} min`
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
  const highlightCount = highlights.length
  const totalComments = Object.values(comments).reduce((sum, arr) => sum + arr.length, 0)

  return (
    <div className={`journal-view-container compact density-${density} has-sticky-actions`}>
      <button onClick={handleBack} className="button-secondary" style={{ marginBottom: '12px' }}>
        ← Back
      </button>

      {/* Compact Header */}
      <div className="journal-header-compact">
        {/* Title Row */}
        <div className="journal-title-row">
          <div className="journal-title-content">
            <h1 className="journal-title-compact">
              {journal.title}
              {journal.isPinned && <span style={{ marginLeft: '8px' }}>📌</span>}
            </h1>
            {template && (
              <div className="journal-template-badge-compact">
                <span>{template.icon}</span>
                <span>{template.name}</span>
              </div>
            )}
          </div>

          {/* Density Toggle */}
          <div className="density-toggle">
            <button
              className={`density-option ${density === 'compact' ? 'active' : ''}`}
              onClick={() => setDensity('compact')}
              title="Compact view"
            >
              Compact
            </button>
            <button
              className={`density-option ${density === 'comfortable' ? 'active' : ''}`}
              onClick={() => setDensity('comfortable')}
              title="Comfortable view"
            >
              Comfortable
            </button>
            <button
              className={`density-option ${density === 'spacious' ? 'active' : ''}`}
              onClick={() => setDensity('spacious')}
              title="Spacious view"
            >
              Spacious
            </button>
          </div>
        </div>

        {/* Metadata Pills */}
        <div className="journal-meta-pills">
          {journal.author && (
            <div className="journal-meta-pill">
              <span>👤</span>
              <span>{journal.author.displayName}</span>
            </div>
          )}

          <div className="journal-meta-pill">
            <span>📅</span>
            <span>{formatDate(journal.createdAt)}</span>
          </div>

          {journal.updatedAt !== journal.createdAt && (
            <div className="journal-meta-pill">
              <span>✏️</span>
              <span>Updated {formatDate(journal.updatedAt)}</span>
            </div>
          )}
        </div>

        {/* Inline Emotions and Tags */}
        {((journal.emotions && journal.emotions.length > 0) || (journal.tags && journal.tags.length > 0)) && (
          <div className="journal-meta-inline">
            {journal.emotions && journal.emotions.length > 0 && (
              <>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>💭</span>
                {journal.emotions.map((emotionId) => {
                  const emotion = getEmotionById(emotionId)
                  if (!emotion) return null
                  return (
                    <span
                      key={emotionId}
                      className="emotion-badge"
                      style={{
                        backgroundColor: emotion.color + '20',
                        borderColor: emotion.color,
                        color: emotion.color,
                      }}
                    >
                      {emotion.label}
                    </span>
                  )
                })}
              </>
            )}

            {journal.tags && journal.tags.length > 0 && (
              <>
                <span className="journal-meta-separator">•</span>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>🏷️</span>
                {journal.tags.map((tag) => (
                  <span key={tag} className="journal-tag">
                    {tag}
                  </span>
                ))}
              </>
            )}
          </div>
        )}
      </div>

      {/* Quick Stats Bar */}
      <div className="journal-stats-bar">
        <div className="journal-stat-item">
          <span>📝</span>
          <span className="journal-stat-value">{journal.wordCount}</span>
          <span className="journal-stat-label">words</span>
        </div>
        <div className="journal-stat-item">
          <span>⏱️</span>
          <span className="journal-stat-value">{calculateReadTime(journal.wordCount)}</span>
          <span className="journal-stat-label">read</span>
        </div>
        <div className="journal-stat-item">
          <span>🎨</span>
          <span className="journal-stat-value">{highlightCount}</span>
          <span className="journal-stat-label">{highlightCount === 1 ? 'highlight' : 'highlights'}</span>
        </div>
        <div className="journal-stat-item">
          <span>💬</span>
          <span className="journal-stat-value">{totalComments}</span>
          <span className="journal-stat-label">{totalComments === 1 ? 'comment' : 'comments'}</span>
        </div>
      </div>

      {/* Presence and Connection Status */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <PresenceAvatars activeUsers={activeUsers} maxVisible={5} />
        <ConnectionStatus
          isConnected={isConnected}
          isConnecting={isConnecting}
          error={highlightError}
          onReconnect={reconnect}
        />
      </div>

      <div className="journal-view-content">
        {template && displaySections.length > 0 ? (
          // Render template sections with highlighting
          <div className="template-content">
            {displaySections.map((section) => (
              <div key={section.id} className="template-section template-section-compact">
                <h3 className="template-section-title template-section-title-compact">{section.title}</h3>
                <div className="template-section-content">
                  {section.type === 'q_and_a' ? (
                    // Render Q&A section (without highlighting for structured content)
                    (() => {
                      try {
                        const qaPairs = JSON.parse(section.content) as Array<{
                          id?: string
                          question: string
                          answer: string
                        }>
                        return (
                          <div className="qa-view-section qa-view-section-compact">
                            {qaPairs.map((pair, index: number) => (
                              <div key={pair.id || index} className="qa-view-pair qa-view-pair-compact">
                                <div className="qa-view-question qa-view-question-compact">
                                  <span className="qa-number qa-number-compact">Q{index + 1}</span>
                                  <strong>{pair.question}</strong>
                                </div>
                                <div className="qa-view-answer qa-view-answer-compact">
                                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{pair.answer}</ReactMarkdown>
                                </div>
                              </div>
                            ))}
                          </div>
                        )
                      } catch {
                        // If parsing fails, use highlightable text
                        return (
                          <HighlightableText
                            content={section.content}
                            highlights={highlights}
                            sectionId={section.id}
                            journalEntryId={journalId || ''}
                            spaceId={spaceId || ''}
                            onHighlightCreate={(selection, color) => createHighlight(selection, color)}
                            onHighlightClick={handleHighlightClick}
                            onHighlightUpdate={updateHighlight}
                            onHighlightDelete={deleteHighlight}
                          />
                        )
                      }
                    })()
                  ) : section.type === 'list' ? (
                    // Render List section
                    (() => {
                      try {
                        const listItems = JSON.parse(section.content) as Array<{
                          id?: string
                          text: string
                        }>
                        return (
                          <ul className="list-view-section list-view-section-compact">
                            {listItems.map((item, index: number) => (
                              <li key={item.id || index} className="list-view-item list-view-item-compact">
                                {item.text}
                              </li>
                            ))}
                          </ul>
                        )
                      } catch {
                        // If parsing fails, use highlightable text
                        return (
                          <HighlightableText
                            content={section.content}
                            highlights={highlights}
                            sectionId={section.id}
                            journalEntryId={journalId || ''}
                            spaceId={spaceId || ''}
                            onHighlightCreate={(selection, color) => createHighlight(selection, color)}
                            onHighlightClick={handleHighlightClick}
                            onHighlightUpdate={updateHighlight}
                            onHighlightDelete={deleteHighlight}
                          />
                        )
                      }
                    })()
                  ) : section.type === 'checkbox' ? (
                    // Render Checkbox section
                    (() => {
                      try {
                        const checkboxItems = JSON.parse(section.content) as Array<{
                          id?: string
                          text: string
                          checked?: boolean
                        }>
                        return (
                          <ul className="checkbox-view-section checkbox-view-section-compact">
                            {checkboxItems.map((item, index: number) => (
                              <li key={item.id || index} className="checkbox-view-item checkbox-view-item-compact">
                                <input
                                  type="checkbox"
                                  checked={item.checked !== undefined ? item.checked : true}
                                  readOnly
                                  className="checkbox-view-input"
                                />
                                <span className="checkbox-view-label">{item.text}</span>
                              </li>
                            ))}
                          </ul>
                        )
                      } catch {
                        // If parsing fails, use highlightable text
                        return (
                          <HighlightableText
                            content={section.content}
                            highlights={highlights}
                            sectionId={section.id}
                            journalEntryId={journalId || ''}
                            spaceId={spaceId || ''}
                            onHighlightCreate={(selection, color) => createHighlight(selection, color)}
                            onHighlightClick={handleHighlightClick}
                            onHighlightUpdate={updateHighlight}
                            onHighlightDelete={deleteHighlight}
                          />
                        )
                      }
                    })()
                  ) : (
                    // Render other section types with highlighting
                    <HighlightableText
                      content={section.content}
                      highlights={highlights}
                      sectionId={section.id}
                      journalEntryId={journalId || ''}
                      spaceId={spaceId || ''}
                      onHighlightCreate={(selection, color) => createHighlight(selection, color)}
                      onHighlightClick={handleHighlightClick}
                      onHighlightUpdate={updateHighlight}
                      onHighlightDelete={deleteHighlight}
                    />
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          // Render regular content with highlighting
          <HighlightableText
            content={template
              ? JournalContentManager.extractCleanMarkdown(journal.content)
              : journal.content}
            highlights={highlights}
            journalEntryId={journalId || ''}
            spaceId={spaceId || ''}
            onHighlightCreate={(selection, color) => createHighlight(selection, color)}
            onHighlightClick={handleHighlightClick}
            onHighlightUpdate={updateHighlight}
            onHighlightDelete={deleteHighlight}
          />
        )}
      </div>

      {/* Sticky Action Bar */}
      <div className="journal-actions-sticky">
        <div className="journal-actions-left">
          <button
            onClick={handleExportMarkdown}
            className="journal-action-icon-btn"
            title="Export as Markdown"
          >
            📥
          </button>
          <button
            onClick={() => setShowAIDock(!showAIDock)}
            className="journal-action-icon-btn"
            title="AI Assistant"
          >
            🤖
          </button>
        </div>

        <div className="journal-actions-right">
          {canEdit && (
            <>
              <button
                onClick={handleDelete}
                className="journal-action-icon-btn danger"
                disabled={isDeleting}
                title={isDeleting ? 'Deleting...' : 'Delete'}
              >
                🗑️
              </button>
              <button
                onClick={handleEdit}
                className="journal-action-icon-btn primary"
                title="Edit"
              >
                ✏️
              </button>
            </>
          )}
        </div>
      </div>

      {/* AI Assistant Dock */}
      {showAIDock && (
        <AIAssistantDock
          journalContent={journal.content}
          journalTitle={journal.title}
          journalId={journalId}
          emotions={journal.emotions?.map(id => getEmotionById(id)?.label).filter((label): label is string => !!label)}
          onClose={() => setShowAIDock(false)}
        />
      )}

      {/* Comment Thread - Renders as sliding panel with its own backdrop */}
      {selectedHighlight && (
        <CommentThread
          highlight={selectedHighlight}
          comments={comments[selectedHighlight.id] || []}
          spaceMembers={activeUsers.map(u => ({ id: u.userId, name: u.userName }))}
          currentUserId={user?.userId || ''}
          onAddComment={(text, parentId) => createComment(selectedHighlight.id, text, parentId)}
          onDeleteComment={(commentId) => deleteComment(selectedHighlight.id, commentId)}
          onClose={() => setSelectedHighlight(null)}
        />
      )}

      {/* Ellie companion with smart positioning */}
      <SmartEllie
        mood={mood}
        showThoughtBubble={true}
        thoughtText={journal.wordCount > 500 ? "Great writing! 📝" : "Nice entry! 😊"}
        size="md"
        onClick={() => setMood(mood === 'playful' ? 'happy' : 'playful')}
        furColor={customization.furColor}
        collarStyle={customization.collarStyle}
        collarColor={customization.collarColor}
        collarTag={customization.collarTag}
        enableSmartPositioning={true}
        showControlPanel={true}
      />
    </div>
  )
}
