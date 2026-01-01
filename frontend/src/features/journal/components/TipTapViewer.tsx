import React, { useEffect, useState, useCallback } from 'react'
import ReactDOM from 'react-dom'
import { useEditor, EditorContent } from '@tiptap/react'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'
import { getEditorExtensions } from './extensions'
import { HighlightToolbar } from './HighlightToolbar'
import { HIGHLIGHT_COLORS, type HighlightColor } from '../types/highlight.types'
import type { Highlight, HighlightSelection } from '../types/highlight.types'
import '../styles/journal.css'

interface HighlightData {
  id: string;
  color: string;
  authorId: string;
  authorName: string;
  createdAt: string;
  commentCount: number;
  text: string;
  range: { from: number; to: number };
}

interface TipTapViewerProps {
  contentTiptap: Record<string, unknown>
  highlights?: Highlight[]
  onHighlightCreate?: (highlight: HighlightData) => void
  onHighlightClick?: (highlight: Highlight) => void
  onHighlightUpdate?: (highlightId: string, selection: HighlightSelection) => void
  onHighlightDelete?: (highlightId: string) => void
  onContentChange?: (contentTiptap: Record<string, unknown>) => void
  minHeight?: string
}

// Plugin key for highlight decorations
const highlightDecorationKey = new PluginKey('apiHighlights')

/**
 * Create decoration plugin for API highlights
 */
const createHighlightDecorationPlugin = (
  highlights: Highlight[],
  onHighlightClicked?: (highlight: Highlight, event: MouseEvent) => void
) => {
  return new Plugin({
    key: highlightDecorationKey,
    state: {
      init() {
        return DecorationSet.empty
      },
      apply(_tr, _oldState, _oldEditorState, newEditorState) {
        // Create decorations from highlights
        const decorations: Decoration[] = []
        const docSize = newEditorState.doc.content.size

        highlights.forEach((highlight) => {
          const from = highlight.textRange.startOffset
          const to = highlight.textRange.endOffset

          // Validate positions are within document bounds
          if (from >= 0 && to <= docSize && from < to) {
            const color = HIGHLIGHT_COLORS[(highlight.color as HighlightColor) || 'yellow'] || HIGHLIGHT_COLORS.yellow

            decorations.push(
              Decoration.inline(from, to, {
                class: 'api-highlight',
                style: `background-color: ${color}; cursor: pointer;`,
                'data-highlight-id': highlight.id,
              })
            )
          }
        })

        return DecorationSet.create(newEditorState.doc, decorations)
      },
    },
    props: {
      decorations(state) {
        return this.getState(state)
      },
      handleClick(_view, _pos, event) {
        const target = event.target as HTMLElement
        const highlightEl = target.closest('.api-highlight')

        if (highlightEl && onHighlightClicked) {
          const highlightId = highlightEl.getAttribute('data-highlight-id')
          const highlight = highlights.find(h => h.id === highlightId)

          if (highlight) {
            onHighlightClicked(highlight, event)
            return true
          }
        }

        return false
      },
    },
  })
}

/**
 * Validate that content is a proper TipTap document
 */
const isValidTipTapDoc = (content: unknown): content is Record<string, unknown> => {
  if (!content || typeof content !== 'object') {
    console.warn('[TipTapViewer] Invalid content: not an object', { content, type: typeof content })
    return false
  }

  // Check for type: 'doc' property
  const hasType = 'type' in content && (content as Record<string, unknown>).type === 'doc'
  if (!hasType) {
    console.warn('[TipTapViewer] Invalid content: missing type=doc', { content, keys: Object.keys(content as object) })
    return false
  }

  return true
}

/**
 * Read-only TipTap viewer for journals with native TipTap highlighting
 */
export const TipTapViewer: React.FC<TipTapViewerProps> = ({
  contentTiptap,
  highlights = [],
  onHighlightCreate,
  onHighlightClick,
  onHighlightUpdate,
  onHighlightDelete,
  onContentChange,
  minHeight = '300px',
}) => {
  // State for highlight menu
  const [clickedHighlight, setClickedHighlight] = useState<Highlight | null>(null)
  const [highlightMenuPosition, setHighlightMenuPosition] = useState<{ x: number; y: number } | null>(null)

  // Log what we receive
  console.log('[TipTapViewer] Received contentTiptap:', {
    exists: !!contentTiptap,
    type: typeof contentTiptap,
    isNull: contentTiptap === null,
    keys: contentTiptap && typeof contentTiptap === 'object' ? Object.keys(contentTiptap) : 'N/A',
    hasTypeDoc: contentTiptap && typeof contentTiptap === 'object' && 'type' in contentTiptap && (contentTiptap as Record<string, unknown>).type === 'doc'
  })

  // Ensure we have valid TipTap content to prevent schema errors
  const validContent = isValidTipTapDoc(contentTiptap) ? contentTiptap : undefined
  console.log('[TipTapViewer] Valid content result:', !!validContent)

  const editor = useEditor({
    extensions: getEditorExtensions('', true),
    content: validContent,
    editable: false, // Read-only by default
    editorProps: {
      attributes: {
        class: 'prose max-w-none journal-tiptap-viewer',
      },
    },
  })

  // Handle clicking on an existing highlight - show menu
  const handleHighlightClicked = useCallback((highlight: Highlight, event: MouseEvent) => {
    event.stopPropagation()

    // Calculate position for menu (viewport-relative for fixed positioning)
    const target = event.target as HTMLElement
    const rect = target.getBoundingClientRect()

    setClickedHighlight(highlight)
    setHighlightMenuPosition({
      x: rect.left + (rect.width / 2),
      y: rect.bottom + 8, // 8px below highlight
    })

    console.log('[TipTapViewer] Highlight menu position:', {
      x: rect.left + (rect.width / 2),
      y: rect.bottom + 8,
      highlight: highlight.id
    })
  }, [])

  // Update editor content when prop changes
  useEffect(() => {
    if (editor && contentTiptap && isValidTipTapDoc(contentTiptap)) {
      const currentContent = editor.getJSON()
      if (JSON.stringify(currentContent) !== JSON.stringify(contentTiptap)) {
        editor.commands.setContent(contentTiptap)
      }
    }
  }, [contentTiptap, editor])

  // Register/update highlight decoration plugin when highlights change
  useEffect(() => {
    if (!editor) return

    // Unregister existing plugin if any
    const existingPlugin = editor.state.plugins.find(
      p => p.spec.key === highlightDecorationKey
    )
    if (existingPlugin) {
      editor.unregisterPlugin(highlightDecorationKey)
    }

    // Register new plugin with current highlights
    if (highlights.length > 0) {
      const plugin = createHighlightDecorationPlugin(highlights, handleHighlightClicked)
      editor.registerPlugin(plugin)

      // Force a state update to apply decorations
      const { tr } = editor.state
      editor.view.dispatch(tr)
    }

    return () => {
      // Cleanup on unmount
      if (editor && !editor.isDestroyed) {
        const plugin = editor.state.plugins.find(
          p => p.spec.key === highlightDecorationKey
        )
        if (plugin) {
          editor.unregisterPlugin(highlightDecorationKey)
        }
      }
    }
  }, [editor, highlights, handleHighlightClicked])

  // Handle highlight creation
  const handleHighlightCreate = (highlight: HighlightData) => {
    if (onHighlightCreate) {
      onHighlightCreate(highlight)
    }

    // Notify parent of content change (with new highlight embedded)
    if (editor && onContentChange) {
      const updatedContent = editor.getJSON()
      onContentChange(updatedContent)
    }
  }

  // Handle deleting a highlight
  const handleDeleteHighlight = useCallback(() => {
    if (clickedHighlight && onHighlightDelete) {
      onHighlightDelete(clickedHighlight.id)
      setClickedHighlight(null)
      setHighlightMenuPosition(null)
    }
  }, [clickedHighlight, onHighlightDelete])

  // Handle viewing comments for a highlight
  const handleViewComments = useCallback(() => {
    if (clickedHighlight && onHighlightClick) {
      onHighlightClick(clickedHighlight)
      setClickedHighlight(null)
      setHighlightMenuPosition(null)
    }
  }, [clickedHighlight, onHighlightClick])

  // Handle clicking outside to close menu
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      const target = e.target as HTMLElement

      // Check if click/tap is on any highlight menu element
      if (!target.closest('.highlight-menu') &&
          !target.closest('.api-highlight')) {
        setClickedHighlight(null)
        setHighlightMenuPosition(null)
      }
    }

    // Use setTimeout to avoid clearing immediately after setting
    const timeoutId = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('touchstart', handleClickOutside)
    }, 100)

    return () => {
      clearTimeout(timeoutId)
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('touchstart', handleClickOutside)
    }
  }, [clickedHighlight])

  // Handle escape key to close menu
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setClickedHighlight(null)
        setHighlightMenuPosition(null)
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [])

  // Render highlight menu (for existing highlights)
  const renderHighlightMenu = () => {
    if (!clickedHighlight || !highlightMenuPosition) {
      return null
    }

    const menuElement = (
      <div
        className="highlight-menu"
        style={{
          position: 'fixed',
          left: `${highlightMenuPosition.x}px`,
          top: `${highlightMenuPosition.y}px`,
          transform: 'translateX(-50%)',
          zIndex: 99999,
          background: 'white',
          borderRadius: '10px',
          boxShadow: '0 10px 40px rgba(0, 0, 0, 0.2)',
          border: '1px solid rgba(0, 0, 0, 0.1)',
          overflow: 'hidden',
          minWidth: '200px',
          animation: 'fadeIn 0.2s ease-out',
        }}
      >
        <style>{`
          @keyframes fadeIn {
            from { opacity: 0; transform: translateX(-50%) translateY(-10px); }
            to { opacity: 1; transform: translateX(-50%) translateY(0); }
          }
        `}</style>

        {/* View Comments Button */}
        <button
          onClick={handleViewComments}
          style={{
            width: '100%',
            padding: '14px 18px',
            fontSize: '14px',
            fontWeight: '600',
            color: 'var(--theme-primary-700)',
            background: 'none',
            border: 'none',
            borderBottom: '1px solid rgba(0, 0, 0, 0.08)',
            cursor: 'pointer',
            textAlign: 'left',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            transition: 'background-color 0.15s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(20, 184, 166, 0.08)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent'
          }}
        >
          <span style={{ fontSize: '18px' }}>💬</span>
          <span>View Comments ({clickedHighlight.commentCount || 0})</span>
        </button>

        {/* Edit Selection Button */}
        {onHighlightUpdate && (
          <button
            onClick={() => {
              // For TipTap, we don't support inline editing like HighlightableText
              // Just close the menu - full editing would require more complex implementation
              setClickedHighlight(null)
              setHighlightMenuPosition(null)
            }}
            style={{
              width: '100%',
              padding: '14px 18px',
              fontSize: '14px',
              fontWeight: '600',
              color: 'var(--theme-primary-600)',
              background: 'none',
              border: 'none',
              borderBottom: '1px solid rgba(0, 0, 0, 0.08)',
              cursor: 'pointer',
              textAlign: 'left',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              transition: 'background-color 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.08)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent'
            }}
          >
            <span style={{ fontSize: '18px' }}>✏️</span>
            <span>Edit Selection</span>
          </button>
        )}

        {/* Delete Highlight Button */}
        {onHighlightDelete && (
          <button
            onClick={handleDeleteHighlight}
            style={{
              width: '100%',
              padding: '14px 18px',
              fontSize: '14px',
              fontWeight: '600',
              color: 'var(--theme-error-700)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              textAlign: 'left',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              transition: 'background-color 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.08)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent'
            }}
          >
            <span style={{ fontSize: '18px' }}>🗑️</span>
            <span>Delete Highlight</span>
          </button>
        )}
      </div>
    )

    return ReactDOM.createPortal(menuElement, document.body)
  }

  if (!editor) {
    return null
  }

  return (
    <>
      <div className="tiptap-viewer">
        {/* Highlight toolbar (floating) for creating new highlights */}
        <HighlightToolbar
          editor={editor}
          onHighlightCreate={handleHighlightCreate}
          disabled={false}
        />

        <EditorContent
          editor={editor}
          style={{
            minHeight,
            cursor: 'text',
          }}
        />
      </div>

      {/* Render highlight menu via portal */}
      {renderHighlightMenu()}
    </>
  )
}
