/**
 * Enhanced TipTap Viewer with Custom Nodes
 *
 * Supports all content types including Q&A pairs.
 * Replaces the need for HighlightableText and markdown rendering.
 */
import React, { useEffect, useState } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import { getEditorExtensions } from '../extensions'
import { QAPairNode, QAPairQuestion, QAPairAnswer } from '../../extensions/QAPairNode'
import { HighlightToolbar } from '../HighlightToolbar'
import '../../styles/journal.css'

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

interface EnhancedTipTapViewerProps {
  contentTiptap: Record<string, unknown>
  onHighlightCreate?: (highlight: HighlightData) => void
  onContentChange?: (content: Record<string, unknown>) => void
  isEditable?: boolean
  className?: string
  minHeight?: string
}

export const EnhancedTipTapViewer: React.FC<EnhancedTipTapViewerProps> = ({
  contentTiptap,
  onHighlightCreate,
  onContentChange,
  isEditable = false,
  className = '',
  minHeight = '300px'
}) => {
  const [editingHighlightId, setEditingHighlightId] = useState<string | null>(null)

  const editor = useEditor({
    extensions: [
      ...getEditorExtensions('Start writing...', true), // Use standard extensions
      QAPairQuestion, // Q&A child node for question
      QAPairAnswer, // Q&A child node for answer
      QAPairNode, // Add custom Q&A node (must be after child nodes)
    ],
    content: contentTiptap,
    editable: isEditable,
    editorProps: {
      attributes: {
        class: `prose max-w-none journal-tiptap-viewer ${className}`,
      },
    },
    onUpdate: ({ editor }) => {
      if (onContentChange) {
        const json = editor.getJSON()
        onContentChange(json)
      }
    },
  })

  // Update content when prop changes
  useEffect(() => {
    if (editor && contentTiptap) {
      const currentContent = editor.getJSON()
      if (JSON.stringify(currentContent) !== JSON.stringify(contentTiptap)) {
        editor.commands.setContent(contentTiptap)
      }
    }
  }, [contentTiptap, editor])

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

  // Handle highlight click events
  useEffect(() => {
    if (!editor) return;

    const handleHighlightClick = (event: CustomEvent) => {
      console.log('[EnhancedTipTapViewer] Highlight clicked:', event.detail);
      // Parent component can listen to this event
    };

    document.addEventListener('highlight-clicked', handleHighlightClick as EventListener);
    return () => {
      document.removeEventListener('highlight-clicked', handleHighlightClick as EventListener);
    };
  }, [editor]);

  // Listen for edit mode changes
  useEffect(() => {
    const handleEditMode = (event: Event) => {
      const customEvent = event as CustomEvent<{ highlightId: string | null; enabled: boolean }>
      const { highlightId, enabled } = customEvent.detail

      console.log('[EnhancedTipTapViewer] Edit mode changed:', { highlightId, enabled })
      setEditingHighlightId(enabled ? highlightId : null)
    }

    document.addEventListener('highlight-edit-mode', handleEditMode)
    return () => {
      document.removeEventListener('highlight-edit-mode', handleEditMode)
    }
  }, [])

  // Listen for text selections when in edit mode
  useEffect(() => {
    if (!editor || !editingHighlightId) return

    const handleSelectionUpdate = () => {
      const { selection } = editor.state
      const { from, to, empty } = selection

      if (empty) {
        return
      }

      const text = editor.state.doc.textBetween(from, to, ' ')
      if (!text || text.trim() === '') {
        return
      }

      // Get viewport coordinates for the selection
      const { view } = editor
      const coords = view.coordsAtPos(from)
      const endCoords = view.coordsAtPos(to)

      // Calculate center position for buttons
      const centerX = coords.left + (endCoords.left - coords.left) / 2
      const y = endCoords.bottom + 10 // Position below selection

      console.log('[EnhancedTipTapViewer] Selection for edit:', { text, from, to })

      // Dispatch event with selection data
      const event = new CustomEvent('text-selected', {
        detail: { text, from, to, x: centerX, y }
      })
      document.dispatchEvent(event)
    }

    editor.on('selectionUpdate', handleSelectionUpdate)
    return () => {
      editor.off('selectionUpdate', handleSelectionUpdate)
    }
  }, [editor, editingHighlightId])

  // Listen for mark update commands
  useEffect(() => {
    if (!editor) return

    const handleUpdateMark = (event: Event) => {
      const customEvent = event as CustomEvent<{ highlightId: string; from: number; to: number }>
      const { highlightId, from, to } = customEvent.detail

      console.log('[EnhancedTipTapViewer] Updating highlight mark:', { highlightId, from, to })

      // Find and remove the old highlight mark
      const { doc } = editor.state
      let oldFrom = -1
      let oldTo = -1
      let highlightAttrs = null

      doc.descendants((node, pos) => {
        if (oldFrom !== -1) return false // Already found

        node.marks.forEach(mark => {
          if (mark.type.name === 'highlight' && mark.attrs.id === highlightId) {
            oldFrom = pos
            oldTo = pos + node.nodeSize
            highlightAttrs = mark.attrs
          }
        })
      })

      if (oldFrom === -1 || !highlightAttrs) {
        console.error('[EnhancedTipTapViewer] Could not find highlight mark:', highlightId)
        return
      }

      // Remove old mark and apply new one
      editor
        .chain()
        .focus()
        .setTextSelection({ from: oldFrom, to: oldTo })
        .unsetHighlight()
        .setTextSelection({ from, to })
        .setHighlight(highlightAttrs)
        .run()

      console.log('[EnhancedTipTapViewer] Updated highlight mark position')
    }

    document.addEventListener('update-highlight-mark', handleUpdateMark)
    return () => {
      document.removeEventListener('update-highlight-mark', handleUpdateMark)
    }
  }, [editor])

  if (!editor) {
    return <div className="tiptap-loading">Loading...</div>
  }

  return (
    <div className="tiptap-viewer" data-editing-highlight={editingHighlightId || undefined}>
      <style>{`
        /* Visual feedback for highlight being edited */
        .tiptap-viewer[data-editing-highlight] mark[data-highlight-id] {
          position: relative;
        }

        ${editingHighlightId ? `
        .tiptap-viewer mark[data-highlight-id="${editingHighlightId}"] {
          border: 2px dashed var(--theme-primary-500, #14b8a6) !important;
          outline: 2px solid var(--theme-primary-300, #5eead4) !important;
          animation: pulse-highlight 2s ease-in-out infinite !important;
          box-shadow: 0 0 0 4px rgba(20, 184, 166, 0.1) !important;
        }

        @keyframes pulse-highlight {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }
        ` : ''}

        /* Instruction text when in edit mode */
        .edit-mode-instruction {
          position: fixed;
          top: 20px;
          left: 50%;
          transform: translateX(-50%);
          background: linear-gradient(135deg, var(--theme-primary-500) 0%, var(--theme-primary-700) 100%);
          color: white;
          padding: 12px 24px;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
          z-index: 9998;
          box-shadow: 0 4px 12px rgba(20, 184, 166, 0.3);
          animation: slideDown 0.3s ease-out;
        }

        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateX(-50%) translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
          }
        }
      `}</style>

      {/* Show instruction when in edit mode */}
      {editingHighlightId && (
        <div className="edit-mode-instruction">
          ✏️ Select new text for this highlight, then click Save
        </div>
      )}

      {/* Highlight toolbar (floating) for creating new highlights */}
      <HighlightToolbar
        editor={editor}
        onHighlightCreate={handleHighlightCreate}
        disabled={!!editingHighlightId} // Disable during edit mode
      />

      <EditorContent
        editor={editor}
        style={{
          minHeight,
          cursor: isEditable ? 'text' : 'default',
        }}
      />
    </div>
  )
}
