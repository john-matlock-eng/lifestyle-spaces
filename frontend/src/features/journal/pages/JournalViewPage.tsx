import React, { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useJournal } from '../hooks/useJournal'
import { useAuth } from '../../../stores/authStore'
import { getTemplate } from '../services/templateApi'
import { getEmotionById } from '../data/emotionData'
import { extractTextFromTipTap, extractSectionsFromTipTap, type TipTapSection } from '../../../lib/journal/tiptapUtils'
import type { Template } from '../types/template.types'
import { ElliePerch } from '../../../components/ellie'
import { useEllieCustomizationContext } from '../../../hooks/useEllieCustomizationContext'
import { AIAssistantDock } from '../components/AIAssistantDock'
import { EnhancedTipTapViewer } from '../components/tiptap/EnhancedTipTapViewer'
import { CommentThread } from '../components/CommentThread'
import { HighlightActionsMenu } from '../components/HighlightActionsMenu'
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
  const { journal, loading, error, loadJournal, updateJournal, deleteJournal } = useJournal()
  const { user } = useAuth()
  const [isDeleting, setIsDeleting] = useState(false)
  const [template, setTemplate] = useState<Template | null>(null)
  const [displaySections, setDisplaySections] = useState<TipTapSection[]>([])
  const [showAIDock, setShowAIDock] = useState(false)
  const [selectedHighlight, setSelectedHighlight] = useState<Highlight | null>(null)
  const [showActionsMenu, setShowActionsMenu] = useState(false)
  const [menuPosition, setMenuPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 })
  const [showCommentThread, setShowCommentThread] = useState(false)
  const [editingHighlightId, setEditingHighlightId] = useState<string | null>(null)
  const [editSelection, setEditSelection] = useState<{ text: string; from: number; to: number } | null>(null)
  const [showEditButtons, setShowEditButtons] = useState(false)
  const [editButtonPosition, setEditButtonPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 })
  const [density, setDensity] = useState<'compact' | 'comfortable' | 'spacious'>('comfortable')

  // Highlights and comments real-time feature
  const {
    highlights,
    comments,
    activeUsers,
    isConnected,
    isConnecting,
    error: highlightError,
    createComment,
    deleteComment,
    deleteHighlight,
    updateHighlight,
    fetchComments,
    reconnect
  } = useHighlightsRealtime(spaceId || '', journalId || '')

  // Ellie companion - just use mood state, SmartEllie manages position
  const [mood, setMood] = useState<'idle' | 'happy' | 'excited' | 'curious' | 'playful' | 'sleeping' | 'walking' | 'concerned' | 'proud' | 'zen' | 'celebrating'>('happy')

  // Ellie customization
  const { customization } = useEllieCustomizationContext()

  useEffect(() => {
    if (spaceId && journalId) {
      loadJournal(spaceId, journalId)
    }
  }, [spaceId, journalId, loadJournal])

  useEffect(() => {
    // Load template and extract sections from contentTiptap if journal has one
    if (journal?.templateId) {
      const loadTemplateAndExtractSections = async () => {
        try {
          const templateData = await getTemplate(journal.templateId!)
          setTemplate(templateData)

          // Extract sections from TipTap content
          const sections = extractSectionsFromTipTap(journal.contentTiptap, templateData)
          setDisplaySections(sections)

          console.log('[DEBUG VIEW] Extracted TipTap sections:', sections)
        } catch (err) {
          console.error('Failed to load template or extract sections:', err)
          setDisplaySections([])
        }
      }
      loadTemplateAndExtractSections()
    } else {
      setTemplate(null)
      setDisplaySections([])
    }
  }, [journal])

  // Listen for highlight click events from TipTap viewer
  useEffect(() => {
    const handleHighlightClick = (event: Event) => {
      const customEvent = event as CustomEvent
      const { id, authorName, commentCount, color } = customEvent.detail
      const mouseEvent = (event as CustomEvent & { sourceEvent?: MouseEvent }).sourceEvent

      // Try to find the full highlight from the list
      const fullHighlight = highlights.find(h => h.id === id)

      // Use full highlight if found, otherwise create minimal object
      const highlight: Highlight = fullHighlight || {
        id,
        text: '', // Not needed for panel
        color,
        authorId: user?.userId || '',
        authorName: authorName || user?.displayName || 'Unknown',
        createdAt: new Date().toISOString(),
        commentCount: commentCount || 0,
        range: { from: 0, to: 0 } // Not needed for panel
      }

      console.log('[JournalView] Highlight clicked:', { id, highlight })
      setSelectedHighlight(highlight)

      // Show actions menu at click position
      const clickX = mouseEvent?.clientX || window.innerWidth / 2
      const clickY = mouseEvent?.clientY || window.innerHeight / 2
      setMenuPosition({ x: clickX, y: clickY })
      setShowActionsMenu(true)
      setShowCommentThread(false)
    }

    document.addEventListener('highlight-clicked', handleHighlightClick)
    return () => {
      document.removeEventListener('highlight-clicked', handleHighlightClick)
    }
  }, [user, highlights])

  // Listen for text selection events when in edit mode
  useEffect(() => {
    if (!editingHighlightId) return

    const handleTextSelected = (event: Event) => {
      const customEvent = event as CustomEvent<{ text: string; from: number; to: number; x: number; y: number }>
      const { text, from, to, x, y } = customEvent.detail

      if (!text || text.trim() === '') {
        setEditSelection(null)
        setShowEditButtons(false)
        return
      }

      console.log('[JournalView] Text selected for edit:', { text, from, to })
      setEditSelection({ text, from, to })
      setEditButtonPosition({ x, y })
      setShowEditButtons(true)
    }

    document.addEventListener('text-selected', handleTextSelected)
    return () => {
      document.removeEventListener('text-selected', handleTextSelected)
    }
  }, [editingHighlightId])

  // Broadcast edit mode status to TipTap viewers
  useEffect(() => {
    if (editingHighlightId) {
      const event = new CustomEvent('highlight-edit-mode', {
        detail: { highlightId: editingHighlightId, enabled: true }
      })
      document.dispatchEvent(event)
    } else {
      const event = new CustomEvent('highlight-edit-mode', {
        detail: { highlightId: null, enabled: false }
      })
      document.dispatchEvent(event)
    }
  }, [editingHighlightId])

  const handleSaveEdit = async () => {
    if (!editingHighlightId || !editSelection || !spaceId || !journalId) return

    try {
      // Update via backend API
      await updateHighlight(editingHighlightId, {
        text: editSelection.text,
        range: {
          startOffset: editSelection.from,
          endOffset: editSelection.to,
        },
      })

      // Dispatch event to TipTap to update the mark
      const event = new CustomEvent('update-highlight-mark', {
        detail: {
          highlightId: editingHighlightId,
          from: editSelection.from,
          to: editSelection.to,
        }
      })
      document.dispatchEvent(event)

      // Clear edit state
      setEditingHighlightId(null)
      setEditSelection(null)
      setShowEditButtons(false)

      // Reload journal to get fresh content
      await loadJournal(spaceId, journalId)
    } catch (error) {
      console.error('[JournalView] Failed to save highlight edit:', error)
      alert('Failed to save changes. Please try again.')
    }
  }

  const handleCancelEdit = () => {
    setEditingHighlightId(null)
    setEditSelection(null)
    setShowEditButtons(false)
  }

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

    // Extract text from TipTap content
    const content = journal.contentTiptap
      ? extractTextFromTipTap(journal.contentTiptap)
      : 'No content available'

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
              {journal.isPrivate && <span style={{ marginLeft: '8px' }} title="Private journal">🔒</span>}
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
        {journal.contentTiptap && typeof journal.contentTiptap === 'object' && 'type' in journal.contentTiptap && journal.contentTiptap.type === 'doc' ? (
          // Render single-document TipTap journal with native highlighting (zero offset drift)
          <EnhancedTipTapViewer
            contentTiptap={journal.contentTiptap}
            onHighlightCreate={async (highlight) => {
              // When a new highlight is created in TipTap, the document is already updated
              console.log('[JournalView] New TipTap highlight created:', highlight)
            }}
            onContentChange={async (updatedContent) => {
              // When highlights change, save the updated contentTiptap to backend
              if (!spaceId || !journalId) return

              try {
                console.log('[JournalView] Saving updated contentTiptap to backend...')
                // Update journal with new contentTiptap (which includes the highlight)
                await updateJournal(spaceId, journalId, {
                  contentTiptap: updatedContent
                })
                console.log('[JournalView] ContentTiptap saved successfully')

                // Don't reload - TipTap already has the updated content
                // Reloading causes unnecessary flashing
              } catch (error) {
                console.error('[JournalView] Failed to save contentTiptap:', error)
              }
            }}
          />
        ) : template && displaySections.length > 0 ? (
          // Render template sections with highlighting
          <div className="template-content">
            {displaySections.map((section) => {
              // Use section.content which already includes empty docs for missing sections
              const sectionTiptapContent = section.content

              const hasTiptapContent = sectionTiptapContent &&
                typeof sectionTiptapContent === 'object' &&
                'type' in sectionTiptapContent &&
                sectionTiptapContent.type === 'doc'

              return (
                <div key={section.id} className="template-section template-section-compact">
                  <h3 className="template-section-title template-section-title-compact">{section.title}</h3>
                  <div className="template-section-content">
                    {hasTiptapContent && (section.type === 'paragraph' || section.type === 'prose') ? (
                      // Render paragraph sections with TipTap content using EnhancedTipTapViewer (preserves highlight positions)
                      <EnhancedTipTapViewer
                        contentTiptap={sectionTiptapContent as Record<string, unknown>}
                        onContentChange={async (updatedContent) => {
                          if (!spaceId || !journalId || !journal.contentTiptap) return

                          try {
                            // Update the specific section in the multi-section TipTap content
                            const updatedMultiSection = {
                              ...(journal.contentTiptap as Record<string, unknown>),
                              [section.id]: updatedContent
                            }
                            await updateJournal(spaceId, journalId, {
                              contentTiptap: updatedMultiSection
                            })
                            await loadJournal(spaceId, journalId)
                          } catch (error) {
                            console.error('[JournalView] Failed to save section TipTap content:', error)
                          }
                        }}
                      />
                    ) : hasTiptapContent && section.type === 'q_and_a' ? (
                      // Render Q&A sections with TipTap content using EnhancedTipTapViewer (with qaPair nodes)
                      <EnhancedTipTapViewer
                        contentTiptap={sectionTiptapContent as Record<string, unknown>}
                        onContentChange={async (updatedContent) => {
                          if (!spaceId || !journalId || !journal.contentTiptap) return

                          try {
                            // Update the specific section in the multi-section TipTap content
                            const updatedMultiSection = {
                              ...(journal.contentTiptap as Record<string, unknown>),
                              [section.id]: updatedContent
                            }
                            await updateJournal(spaceId, journalId, {
                              contentTiptap: updatedMultiSection
                            })
                            await loadJournal(spaceId, journalId)
                          } catch (error) {
                            console.error('[JournalView] Failed to save Q&A section TipTap content:', error)
                          }
                        }}
                      />
                    ) : (
                    // All sections should have TipTap content after migration
                    <div className="section-migration-notice">
                      <p>This section needs to be re-saved to enable full TipTap support.</p>
                      <p>Section type: {section.type}</p>
                    </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        ) : journal.contentTiptap ? (
          // Render single-doc TipTap content (already handled above)
          <div className="migration-notice">
            <p>Content rendering error. Please try refreshing the page.</p>
          </div>
        ) : (
          // No content available
          <div className="no-content-notice">
            <p>No content available for this journal.</p>
          </div>
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
      {showAIDock && journal.contentTiptap && (
        <AIAssistantDock
          journalContent={extractTextFromTipTap(journal.contentTiptap)}
          journalTitle={journal.title}
          journalId={journalId}
          emotions={journal.emotions?.map(id => getEmotionById(id)?.label).filter((label): label is string => !!label)}
          onClose={() => setShowAIDock(false)}
        />
      )}

      {/* Highlight Actions Menu - Floating menu with options */}
      {showActionsMenu && selectedHighlight && (
        <HighlightActionsMenu
          highlightId={selectedHighlight.id}
          position={menuPosition}
          commentCount={selectedHighlight.commentCount}
          onViewComments={async () => {
            if (!selectedHighlight) return

            setShowActionsMenu(false)

            // Fetch comments for this highlight
            try {
              await fetchComments(selectedHighlight.id)
            } catch (error) {
              console.error('[JournalView] Failed to fetch comments:', error)
            }

            setShowCommentThread(true)
          }}
          onEditSelection={() => {
            if (!selectedHighlight) return

            // Enter edit mode
            setEditingHighlightId(selectedHighlight.id)
            setShowActionsMenu(false)

            console.log('[JournalView] Entering edit mode for highlight:', selectedHighlight.id)
          }}
          onDelete={async () => {
            if (!selectedHighlight) return

            try {
              await deleteHighlight(selectedHighlight.id)
              setShowActionsMenu(false)
              setSelectedHighlight(null)

              // Reload journal to refresh TipTap content without the deleted highlight
              if (spaceId && journalId) {
                await loadJournal(spaceId, journalId)
              }
            } catch (error) {
              console.error('[JournalView] Failed to delete highlight:', error)
              alert('Failed to delete highlight. Please try again.')
            }
          }}
          onClose={() => {
            setShowActionsMenu(false)
            setSelectedHighlight(null)
          }}
        />
      )}

      {/* Comment Thread - Renders as sliding panel with its own backdrop */}
      {showCommentThread && selectedHighlight && (
        <CommentThread
          highlight={selectedHighlight}
          comments={comments[selectedHighlight.id] || []}
          spaceMembers={activeUsers.map(u => ({ id: u.userId, name: u.userName }))}
          currentUserId={user?.userId || ''}
          onAddComment={(text, parentId) => createComment(selectedHighlight.id, text, parentId)}
          onDeleteComment={(commentId) => deleteComment(selectedHighlight.id, commentId)}
          onClose={() => {
            setShowCommentThread(false)
            setSelectedHighlight(null)
          }}
        />
      )}

      {/* Edit Selection Buttons - Show Save/Cancel when editing highlight */}
      {showEditButtons && editingHighlightId && (
        <div
          style={{
            position: 'fixed',
            left: `${editButtonPosition.x}px`,
            top: `${editButtonPosition.y}px`,
            transform: 'translate(-50%, 0%)',
            zIndex: 99999,
            animation: 'fadeIn 0.2s ease-out',
            display: 'flex',
            gap: '8px',
          }}
        >
          <button
            onClick={handleSaveEdit}
            style={{
              padding: '10px 20px',
              fontSize: '14px',
              fontWeight: '600',
              color: 'white',
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              borderRadius: '8px',
              boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              whiteSpace: 'nowrap',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.05)'
              e.currentTarget.style.boxShadow = '0 6px 16px rgba(16, 185, 129, 0.4)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)'
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.3)'
            }}
          >
            ✓ Save
          </button>
          <button
            onClick={handleCancelEdit}
            style={{
              padding: '10px 20px',
              fontSize: '14px',
              fontWeight: '600',
              color: '#374151',
              background: 'white',
              border: '1px solid rgba(0, 0, 0, 0.2)',
              borderRadius: '8px',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              whiteSpace: 'nowrap',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.05)'
              e.currentTarget.style.background = '#f9fafb'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)'
              e.currentTarget.style.background = 'white'
            }}
          >
            ✕ Cancel
          </button>
        </div>
      )}

      {/* Ellie companion with smart positioning */}
      <ElliePerch
        showThoughtBubble={true}
        thoughtText={journal.wordCount > 500 ? "Great writing! 📝" : "Nice entry! 😊"}
        size="md"
        onClick={() => setMood(mood === 'playful' ? 'happy' : 'playful')}
        furColor={customization.furColor}
        collarStyle={customization.collarStyle}
        collarColor={customization.collarColor}
        collarTag={customization.collarTag}
        showPerchControl={true}
        
      />
    </div>
  )
}
