import React, { useEffect, useState, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useJournal } from '../hooks/useJournal'
import { useAuth } from '../../../stores/authStore'
import { getTemplate } from '../services/templateApi'
import { getEmotionById } from '../data/emotionData'
import { JournalContentManager } from '../../../lib/journal/JournalContentManager'
import type { DisplaySection } from '../../../lib/journal/types'
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
import { ListSectionDisplay } from '../components/sections/ListSectionDisplay'
import { QASectionDisplay } from '../components/sections/QASectionDisplay'
import { CheckboxSectionDisplay } from '../components/sections/CheckboxSectionDisplay'
import { ScaleSectionDisplay } from '../components/sections/ScaleSectionDisplay'
import { TableSectionDisplay } from '../components/sections/TableSectionDisplay'
import { JournalHeaderCompact } from '../components/JournalHeaderCompact'
import { useScrollProgress } from '../hooks/useScrollProgress'
import '../styles/journal.css'
import '../styles/qa-section.css'
import '../styles/dynamic-sections.css'
import '../styles/ai-assistant-dock.css'
import '../styles/journal-compact.css'
import '../styles/journal-header-progressive.css'

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
  const contentRef = useRef<HTMLDivElement>(null)

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

  // Scroll progress tracking for header transitions
  const { headerState, readProgress } = useScrollProgress({
    contentRef,
    compactThreshold: 100,
    hideThreshold: 500
  })

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
    <>
      {/* Progressive Disclosure Header - Fixed at top */}
      <JournalHeaderCompact
        title={journal.title}
        content={journal.content}
        template={template}
        author={journal.author}
        createdAt={journal.createdAt}
        updatedAt={journal.updatedAt}
        isPinned={journal.isPinned}
        emotions={journal.emotions}
        tags={journal.tags}
        wordCount={journal.wordCount}
        highlightCount={highlightCount}
        commentCount={totalComments}
        headerState={headerState}
        readProgress={readProgress}
        density={density}
        onDensityChange={setDensity}
        readTime={calculateReadTime(journal.wordCount)}
      />

      <div className={`journal-view-container compact density-${density} has-sticky-actions has-progressive-header`}>
        <button onClick={handleBack} className="button-secondary" style={{ marginBottom: '12px' }}>
          ← Back
        </button>

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

      <div ref={contentRef} className="journal-view-content">
        {template && displaySections.length > 0 ? (
          // Render template sections with highlighting
          <div className="template-content">
            {displaySections.map((section) => (
              <div key={section.id} className="template-section template-section-compact">
                <h3 className="template-section-title template-section-title-compact">{section.title}</h3>
                <div className="template-section-content">
                  {section.type === 'q_and_a' ? (
                    // Render Q&A section with highlighting support
                    <QASectionDisplay
                      value={section.content}
                      sectionId={section.id}
                      journalEntryId={journalId || ''}
                      spaceId={spaceId || ''}
                      highlights={highlights}
                      onHighlightCreate={(selection, color) => createHighlight(selection, color)}
                      onHighlightClick={handleHighlightClick}
                      onHighlightUpdate={updateHighlight}
                      onHighlightDelete={deleteHighlight}
                      className="qa-view-section-compact"
                    />
                  ) : section.type === 'list' ? (
                    // Render List section with highlighting support
                    <ListSectionDisplay
                      value={section.content}
                      sectionId={section.id}
                      journalEntryId={journalId || ''}
                      spaceId={spaceId || ''}
                      highlights={highlights}
                      onHighlightCreate={(selection, color) => createHighlight(selection, color)}
                      onHighlightClick={handleHighlightClick}
                      onHighlightUpdate={updateHighlight}
                      onHighlightDelete={deleteHighlight}
                      className="list-view-section-compact"
                    />
                  ) : section.type === 'checkbox' ? (
                    // Render Checkbox section with highlighting support
                    <CheckboxSectionDisplay
                      value={section.content}
                      sectionId={section.id}
                      journalEntryId={journalId || ''}
                      spaceId={spaceId || ''}
                      highlights={highlights}
                      onHighlightCreate={(selection, color) => createHighlight(selection, color)}
                      onHighlightClick={handleHighlightClick}
                      onHighlightUpdate={updateHighlight}
                      onHighlightDelete={deleteHighlight}
                      className="checkbox-view-section-compact"
                    />
                  ) : section.type === 'table' ? (
                    // Render Table section (no highlighting for tables)
                    <TableSectionDisplay
                      value={section.content}
                      config={template?.sections.find(s => s.id === section.id)?.config}
                      className="table-view-section"
                    />
                  ) : section.type === 'scale' ? (
                    // Render Scale section (no highlighting for numeric values)
                    <ScaleSectionDisplay
                      value={section.content}
                      config={template?.sections.find(s => s.id === section.id)?.config}
                      className="scale-view-section"
                    />
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
    </>
  )
}
