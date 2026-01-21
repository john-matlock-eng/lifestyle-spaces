import React, { useEffect, useState, useCallback, useRef } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useJournal } from '../hooks/useJournal'
import { useAuth } from '../../../stores/authStore'
import { getTemplate } from '../services/templateApi'
import { getFrameworkRegistry } from '../frameworks'
import { getEmotionById } from '../data/emotionData'
import { JournalContentManager } from '../../../lib/journal/JournalContentManager'
import type { DisplaySection } from '../../../lib/journal/types'
import type { Template } from '../types/template.types'
import type { FrameworkTemplateConfig } from '../types/framework.types'
import { ElliePerch } from '../../../components/ellie'
import { useEllieCustomizationContext } from '../../../hooks/useEllieCustomizationContext'
import { HighlightableText } from '../components/HighlightableText'
import { TipTapViewer } from '../components/TipTapViewer'
import { MultiSectionTipTapViewer } from '../components/MultiSectionTipTapViewer'
import { CommentThread } from '../components/CommentThread'
import { JournalCommentThread } from '../components/JournalCommentThread'
import { JournalCommentPanel } from '../components/JournalCommentPanel'
import { PresenceAvatars } from '../components/PresenceAvatars'
import { ConnectionStatus } from '../components/ConnectionStatus'
import { useHighlightsRealtime } from '../hooks/useHighlightsRealtime'
import { useJournalComments } from '../hooks/useJournalComments'
import type { Highlight } from '../types/highlight.types'
import { ListSectionDisplay } from '../components/sections/ListSectionDisplay'
import { QASectionDisplay } from '../components/sections/QASectionDisplay'
import { CheckboxSectionDisplay } from '../components/sections/CheckboxSectionDisplay'
import { ScaleSectionDisplay } from '../components/sections/ScaleSectionDisplay'
import { TableSectionDisplay } from '../components/sections/TableSectionDisplay'
import { MomentBlocksSectionDisplay } from '../components/sections/MomentBlocksSectionDisplay'
import { ChatSidebar, ChatBottomSheet } from '../../chat'
import { JournalSynopsis } from '../../../components/journal/JournalSynopsis'
import { JournalMetadataBadges } from '../../../components/journal/JournalMetadataBadges'
import { BackToChat } from '../../../components/BackToChat'
import { UnreadNavigationBar } from '../../../components/UnreadNavigationBar'
import { useUnreadNavigation } from '../../../hooks/useUnreadNavigation'
import '../styles/journal.css'
import '../styles/qa-section.css'
import '../styles/dynamic-sections.css'
import '../styles/journal-compact.css'

/**
 * Page for viewing a single journal entry
 */
export const JournalViewPage: React.FC = () => {
  const navigate = useNavigate()
  const { spaceId, journalId } = useParams<{ spaceId: string; journalId: string }>()
  const [searchParams, setSearchParams] = useSearchParams()
  const { journal, loading, error, loadJournal, deleteJournal } = useJournal()
  const { user } = useAuth()
  const [isDeleting, setIsDeleting] = useState(false)
  const [template, setTemplate] = useState<Template | null>(null)
  const [displaySections, setDisplaySections] = useState<DisplaySection[]>([])
    const [selectedHighlight, setSelectedHighlight] = useState<Highlight | null>(null)
  const [density, setDensity] = useState<'compact' | 'comfortable' | 'spacious'>('comfortable')
  const [pendingHighlightId, setPendingHighlightId] = useState<string | null>(null)
  const [showJournalCommentPanel, setShowJournalCommentPanel] = useState(false)
  const [highlightedSectionIndex, setHighlightedSectionIndex] = useState<number | null>(null)
  const sectionRefs = useRef<Map<number, HTMLElement>>(new Map())

  // Unread navigation state
  const [showUnreadNavBar, setShowUnreadNavBar] = useState(false)
  const [scrollToUnread, setScrollToUnread] = useState(false)
  const [initialUnreadNavIndex, setInitialUnreadNavIndex] = useState(0)

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
    editComment,
    deleteComment,
    fetchComments,
    reconnect
  } = useHighlightsRealtime(spaceId || '', journalId || '')

  // Journal-level comments (Conversations feature) - get count for stats display
  const { commentCount: journalCommentCount } = useJournalComments(spaceId || '', journalId || '')

  // Ellie companion - just use mood state, SmartEllie manages position
  const [mood, setMood] = useState<'idle' | 'happy' | 'excited' | 'curious' | 'playful' | 'sleeping' | 'walking' | 'concerned' | 'proud' | 'zen' | 'celebrating'>('happy')

  // Ellie customization
  const { customization } = useEllieCustomizationContext()

  // Unread navigation hook for cross-journal navigation
  const unreadNav = useUnreadNavigation({
    spaceId: spaceId || '',
    initialIndex: initialUnreadNavIndex,
    enabled: showUnreadNavBar && !!spaceId,
  })

  // Handler to open highlight and load its comments
  const handleHighlightClick = useCallback((highlight: Highlight) => {
    setSelectedHighlight(highlight)
    // Fetch comments for this highlight
    fetchComments(highlight.id)

    // Scroll to the highlight element and flash it to draw attention
    setTimeout(() => {
      const highlightElement = document.querySelector(`mark[data-highlight-id="${highlight.id}"]`)
      if (highlightElement) {
        highlightElement.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        })

        // Add flash animation to draw attention
        highlightElement.classList.add('highlight-flash')
        setTimeout(() => {
          highlightElement.classList.remove('highlight-flash')
        }, 2000) // Remove after animation completes (3 cycles × 0.6s = 1.8s)
      }
    }, 100)
  }, [fetchComments])

  // Handler for navigating between highlights - scrolls to the highlight in the document
  const handleNavigateHighlight = useCallback((highlight: Highlight) => {
    setSelectedHighlight(highlight)
    fetchComments(highlight.id)

    // Scroll to the highlight element and flash it to draw attention
    setTimeout(() => {
      const highlightElement = document.querySelector(`mark[data-highlight-id="${highlight.id}"]`)
      if (highlightElement) {
        highlightElement.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        })

        // Add flash animation to draw attention
        highlightElement.classList.add('highlight-flash')
        setTimeout(() => {
          highlightElement.classList.remove('highlight-flash')
        }, 2000) // Remove after animation completes (3 cycles × 0.6s = 1.8s)
      }
    }, 100)
  }, [fetchComments])

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
          // Parse the content to extract template sections
          const sections = JournalContentManager.extractDisplaySections(journal.content)

          // Check if this is a framework template
          const registry = getFrameworkRegistry()
          const frameworkTemplateData = registry.getTemplateById(journal.templateId!)

          if (frameworkTemplateData) {
            // Framework template - use content.sections for ordering
            const frameworkTemplate = frameworkTemplateData.template as FrameworkTemplateConfig
            const templateSections = frameworkTemplate.content?.sections || []

            // Create a basic Template object for display purposes
            const templateData: Template = {
              id: frameworkTemplate.id || journal.templateId!,
              name: frameworkTemplate.name || 'Template',
              description: frameworkTemplate.description || '',
              version: frameworkTemplate.version || 1,
              sections: [],
              icon: frameworkTemplate.icon,
              color: frameworkTemplate.color,
              frameworkId: frameworkTemplateData.frameworkId,
            }
            setTemplate(templateData)

            // Sort sections according to framework template's defined order
            if (templateSections.length > 0) {
              const sectionOrderMap = new Map<string, number>()
              templateSections.forEach((sec: { id: string; order?: number }, index: number) => {
                sectionOrderMap.set(sec.id, sec.order ?? index)
              })

              sections.sort((a, b) => {
                const orderA = sectionOrderMap.get(a.id) ?? 999
                const orderB = sectionOrderMap.get(b.id) ?? 999
                return orderA - orderB
              })
            }
          } else {
            // Regular backend template
            const templateData = await getTemplate(journal.templateId!)
            setTemplate(templateData)

            // Sort sections according to template's section order (array position)
            if (templateData?.sections) {
              const sectionOrderMap = new Map<string, number>()
              templateData.sections.forEach((sec, index) => {
                sectionOrderMap.set(sec.id, index)
              })

              sections.sort((a, b) => {
                const orderA = sectionOrderMap.get(a.id) ?? 999
                const orderB = sectionOrderMap.get(b.id) ?? 999
                return orderA - orderB
              })
            }
          }

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

  // Handle URL params for deep linking to highlights/comments from activity feed or conversations
  useEffect(() => {
    const highlightId = searchParams.get('highlightId')
    const openJournalComments = searchParams.get('openJournalComments')
    const scrollToUnreadParam = searchParams.get('scrollToUnread')
    const unreadNavIndexParam = searchParams.get('unreadNavIndex')
    const fromConversations = searchParams.get('fromConversations')

    // Handle unread navigation state
    if (fromConversations === 'true') {
      setShowUnreadNavBar(true)
    }

    if (scrollToUnreadParam === 'true') {
      setScrollToUnread(true)
    }

    if (unreadNavIndexParam) {
      const navIndex = parseInt(unreadNavIndexParam, 10)
      if (!isNaN(navIndex)) {
        setInitialUnreadNavIndex(navIndex)
      }
    }

    if (highlightId) {
      setPendingHighlightId(highlightId)
      // Clear the URL params after capturing them
      setSearchParams({}, { replace: true })
    } else if (openJournalComments === 'true') {
      // Open the journal-level discussion panel
      setShowJournalCommentPanel(true)
      // Clear the URL params after capturing them
      setSearchParams({}, { replace: true })
    }
  }, [searchParams, setSearchParams])

  // Handle section deep linking from chat citations
  useEffect(() => {
    const sectionParam = searchParams.get('section')

    if (sectionParam !== null && displaySections.length > 0) {
      const sectionIndex = parseInt(sectionParam, 10)

      if (!isNaN(sectionIndex)) {
        // Small delay to ensure DOM is ready
        const scrollTimer = setTimeout(() => {
          const sectionElement = sectionRefs.current.get(sectionIndex)

          if (sectionElement) {
            // Scroll to section with offset for header
            const headerOffset = 120
            const elementPosition = sectionElement.getBoundingClientRect().top
            const offsetPosition = elementPosition + window.pageYOffset - headerOffset

            window.scrollTo({
              top: offsetPosition,
              behavior: 'smooth'
            })

            // Set highlight state
            setHighlightedSectionIndex(sectionIndex)

            // Remove highlight after animation completes
            setTimeout(() => {
              setHighlightedSectionIndex(null)

              // Clean up URL parameter but keep fromChat for back button
              const newParams = new URLSearchParams(searchParams)
              newParams.delete('section')
              setSearchParams(newParams, { replace: true })
            }, 3000)
          }
        }, 300)

        return () => clearTimeout(scrollTimer)
      }
    }
  }, [searchParams, setSearchParams, displaySections])

  // Register section ref callback
  const registerSectionRef = useCallback((index: number, element: HTMLElement | null) => {
    if (element) {
      sectionRefs.current.set(index, element)
    } else {
      sectionRefs.current.delete(index)
    }
  }, [])

  // Open highlight when highlights are loaded and we have a pending highlight ID
  useEffect(() => {
    if (pendingHighlightId && highlights.length > 0) {
      const highlight = highlights.find(h => h.id === pendingHighlightId)
      if (highlight) {
        handleHighlightClick(highlight)
        setPendingHighlightId(null)
      }
    }
  }, [pendingHighlightId, highlights, handleHighlightClick])

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
      navigate(`/spaces/${spaceId}/journals`)
    } catch (err) {
      console.error('Failed to delete journal:', err)
    } finally {
      setIsDeleting(false)
    }
  }

  const handleBack = () => {
    // Use browser history to go back to where user came from
    // This maintains continuity from Content tab, Conversations tab, etc.
    navigate(-1)
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

  // Handle dismissing unread nav bar
  const handleDismissUnreadNav = useCallback(() => {
    setShowUnreadNavBar(false)
    unreadNav.dismiss()
  }, [unreadNav])

  // Handle marking current thread as read (called from comment panels)
  // BUG FIX #4: Actually remove the thread from navigation when auto-marked as read
  const handleThreadMarkedAsRead = useCallback((threadId: string) => {
    // Remove from unread navigation list so it doesn't appear in "next unread" navigation
    unreadNav.removeThread(threadId)
  }, [unreadNav])

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
  const highlightCommentCount = Object.values(comments).reduce((sum, arr) => sum + arr.length, 0)
  const totalComments = highlightCommentCount + journalCommentCount

  return (
    <div className={`journal-view-page-wrapper ${selectedHighlight ? 'with-comment-panel' : ''}`}>
    {/* Unread Navigation Bar - floating at top */}
    <UnreadNavigationBar
      totalUnread={unreadNav.state.totalUnread}
      hasNext={unreadNav.hasNext}
      onNext={unreadNav.navigateToNext}
      onClose={handleDismissUnreadNav}
      isVisible={showUnreadNavBar && !unreadNav.isDismissed}
      isLoading={unreadNav.state.isLoading}
    />

    <div className={`journal-view-container compact density-${density} has-sticky-actions ${selectedHighlight ? 'shifted' : ''} ${showUnreadNavBar && !unreadNav.isDismissed ? 'with-unread-nav' : ''}`}>
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
            {/* AI Metadata Badges */}
            {journal.aiMetadata && (
              <JournalMetadataBadges
                metadata={journal.aiMetadata}
                compact
                maxThemes={3}
                showSentiment={true}
              />
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
        <div className="journal-stat-item" title={`${highlightCommentCount} on highlights, ${journalCommentCount} in discussion`}>
          <span>💬</span>
          <span className="journal-stat-value">{totalComments}</span>
          <span className="journal-stat-label">{totalComments === 1 ? 'comment' : 'comments'}</span>
        </div>
        {journalCommentCount > 0 && (
          <div className="journal-stat-item" style={{ cursor: 'pointer' }} onClick={() => setShowJournalCommentPanel(true)}>
            <span>🗨️</span>
            <span className="journal-stat-value">{journalCommentCount}</span>
            <span className="journal-stat-label">discussion</span>
          </div>
        )}
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

      {/* AI Synopsis (collapsible) */}
      {journal.aiMetadata && (
        <JournalSynopsis metadata={journal.aiMetadata} />
      )}

      <div className="journal-view-content">
        {journal.contentTiptap && template && displaySections.length > 0 ? (
          // Hybrid: TipTap sections + Markdown fallback for missing sections
          (() => {
            const tiptapSections = new Set(Object.keys(journal.contentTiptap))

            return (
              <div className="template-content">
                {displaySections.map((section, sectionIndex) => {
                  const hasTiptap = tiptapSections.has(section.id)
                  const isHighlighted = highlightedSectionIndex === sectionIndex

                  return (
                    <div
                      key={section.id}
                      ref={(el) => registerSectionRef(sectionIndex, el)}
                      className={`template-section template-section-compact${isHighlighted ? ' section-highlighted' : ''}`}
                      data-section-index={sectionIndex}
                    >
                      <h3 className="template-section-title template-section-title-compact">{section.title}</h3>
                      <div className="template-section-content">
                        {hasTiptap && journal.contentTiptap ? (
                          // Render TipTap version if available
                          <TipTapViewer
                            contentTiptap={journal.contentTiptap[section.id] as Record<string, unknown>}
                            highlights={highlights.filter(h => h.textRange.startContainerId === section.id)}
                            minHeight="150px"
                            onHighlightCreate={(highlightData) => {
                              // Convert TipTap highlight to API format
                              const selection = {
                                text: highlightData.text,
                                range: {
                                  startOffset: highlightData.range.from,
                                  endOffset: highlightData.range.to,
                                  startContainerId: section.id,
                                  endContainerId: section.id,
                                },
                                boundingRect: new DOMRect(),
                              };
                              createHighlight(selection, highlightData.color);
                            }}
                            onHighlightClick={handleHighlightClick}
                            onHighlightUpdate={updateHighlight}
                            onHighlightDelete={deleteHighlight}
                          />
                        ) : section.type === 'q_and_a' ? (
                          // Fallback to markdown Q&A rendering
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
                          />
                        ) : section.type === 'list' ? (
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
                          />
                        ) : section.type === 'checkbox' ? (
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
                          />
                        ) : section.type === 'scale' ? (
                          <ScaleSectionDisplay
                            value={section.content}
                            config={template?.sections.find(s => s.id === section.id)?.config}
                          />
                        ) : section.type === 'table' ? (
                          <TableSectionDisplay
                            value={section.content}
                            config={template?.sections.find(s => s.id === section.id)?.config}
                          />
                        ) : section.type === 'moment_blocks' ? (
                          <MomentBlocksSectionDisplay
                            value={section.content}
                            sectionId={section.id}
                            journalEntryId={journalId || ''}
                            spaceId={spaceId || ''}
                            highlights={highlights}
                            onHighlightCreate={(selection, color) => createHighlight(selection, color)}
                            onHighlightClick={handleHighlightClick}
                            onHighlightUpdate={updateHighlight}
                            onHighlightDelete={deleteHighlight}
                          />
                        ) : (
                          // Fallback to markdown paragraph rendering
                          <HighlightableText
                            content={section.content}
                            sectionId={section.id}
                            journalEntryId={journalId || ''}
                            spaceId={spaceId || ''}
                            highlights={highlights}
                            onHighlightCreate={(selection, color) => createHighlight(selection, color)}
                            onHighlightClick={handleHighlightClick}
                            onHighlightUpdate={updateHighlight}
                            onHighlightDelete={deleteHighlight}
                          />
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )
          })()
        ) : journal.contentTiptap ? (
          // Pure TipTap (no template)
          (() => {
            const isMultiSection = journal.contentTiptap &&
              typeof journal.contentTiptap === 'object' &&
              !journal.contentTiptap.type &&
              Object.values(journal.contentTiptap).some(
                (val) => typeof val === 'object' && val !== null && 'type' in val
              )

            return isMultiSection ? (
              <MultiSectionTipTapViewer
                contentTiptap={journal.contentTiptap}
                highlights={highlights}
                onHighlightCreate={(highlightData) => {
                  // Convert TipTap highlight to API format (includes sectionId)
                  const selection = {
                    text: highlightData.text,
                    range: {
                      startOffset: highlightData.range.from,
                      endOffset: highlightData.range.to,
                      startContainerId: highlightData.sectionId,
                      endContainerId: highlightData.sectionId,
                    },
                    boundingRect: new DOMRect(),
                  };
                  createHighlight(selection, highlightData.color);
                }}
                onHighlightClick={handleHighlightClick}
                onHighlightUpdate={updateHighlight}
                onHighlightDelete={deleteHighlight}
              />
            ) : (
              <TipTapViewer
                contentTiptap={journal.contentTiptap}
                highlights={highlights}
                onHighlightCreate={(highlightData) => {
                  // Convert TipTap highlight to API format
                  const selection = {
                    text: highlightData.text,
                    range: {
                      startOffset: highlightData.range.from,
                      endOffset: highlightData.range.to,
                    },
                    boundingRect: new DOMRect(),
                  };
                  createHighlight(selection, highlightData.color);
                }}
                onHighlightClick={handleHighlightClick}
                onHighlightUpdate={updateHighlight}
                onHighlightDelete={deleteHighlight}
              />
            )
          })()
        ) : template && displaySections.length > 0 ? (
          // Render template sections with highlighting
          <div className="template-content">
            {displaySections.map((section, sectionIndex) => (
              <div
                key={section.id}
                ref={(el) => registerSectionRef(sectionIndex, el)}
                className={`template-section template-section-compact${highlightedSectionIndex === sectionIndex ? ' section-highlighted' : ''}`}
                data-section-index={sectionIndex}
              >
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
                  ) : section.type === 'moment_blocks' ? (
                    // Render Moment Blocks section with highlighting support
                    <MomentBlocksSectionDisplay
                      value={section.content}
                      sectionId={section.id}
                      journalEntryId={journalId || ''}
                      spaceId={spaceId || ''}
                      highlights={highlights}
                      onHighlightCreate={(selection, color) => createHighlight(selection, color)}
                      onHighlightClick={handleHighlightClick}
                      onHighlightUpdate={updateHighlight}
                      onHighlightDelete={deleteHighlight}
                      className="moment-blocks-display-compact"
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

      {/* Journal Comments Thread (Conversations) */}
      {spaceId && journalId && (
        <JournalCommentThread
          spaceId={spaceId}
          journalId={journalId}
          journalTitle={journal.title}
          currentUserId={user?.userId || ''}
          spaceMembers={activeUsers.map(u => ({ id: u.userId, name: u.userName }))}
          onOpenPanel={() => setShowJournalCommentPanel(true)}
        />
      )}

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


      {/* Journal Comment Panel (expanded Conversations view) */}
      {spaceId && journalId && (
        <JournalCommentPanel
          spaceId={spaceId}
          journalId={journalId}
          journalTitle={journal.title}
          currentUserId={user?.userId || ''}
          spaceMembers={activeUsers.map(u => ({ id: u.userId, name: u.userName }))}
          isOpen={showJournalCommentPanel}
          onClose={() => setShowJournalCommentPanel(false)}
          scrollToUnread={scrollToUnread}
          onMarkAsRead={handleThreadMarkedAsRead}
        />
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

    {/* Comment Thread Panel - Inline side panel */}
    {selectedHighlight && (
      <div className="comment-thread-side-panel">
        <CommentThread
          highlight={selectedHighlight}
          comments={comments[selectedHighlight.id] || []}
          spaceMembers={activeUsers.map(u => ({ id: u.userId, name: u.userName }))}
          currentUserId={user?.userId || ''}
          onAddComment={(text, parentId) => createComment(selectedHighlight.id, text, parentId)}
          onEditComment={(commentId, newText) => editComment(selectedHighlight.id, commentId, newText)}
          onDeleteComment={(commentId) => deleteComment(selectedHighlight.id, commentId)}
          onClose={() => setSelectedHighlight(null)}
          allHighlights={highlights}
          onNavigateHighlight={handleNavigateHighlight}
          spaceId={spaceId}
          scrollToUnread={scrollToUnread}
          onMarkAsRead={handleThreadMarkedAsRead}
        />
      </div>
    )}

    {/* Ellie Chat - Desktop sidebar and mobile bottom sheet */}
    {spaceId && (
      <>
        <ChatSidebar spaceId={spaceId} />
        <ChatBottomSheet spaceId={spaceId} />
      </>
    )}

    {/* Back to Chat button - only shows when navigated from chat citations */}
    <BackToChat />
    </div>
  )
}
