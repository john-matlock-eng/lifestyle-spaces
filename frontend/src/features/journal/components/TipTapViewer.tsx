import React, { useEffect } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'
import { getEditorExtensions } from './extensions'
import { HighlightToolbar } from './HighlightToolbar'
import { HIGHLIGHT_COLORS, type HighlightColor } from '../types/highlight.types'
import type { Highlight } from '../types/highlight.types'
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
  onHighlightClick?: (highlight: Highlight) => void
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

        if (highlightEl && onHighlightClick) {
          const highlightId = highlightEl.getAttribute('data-highlight-id')
          const highlight = highlights.find(h => h.id === highlightId)

          if (highlight) {
            onHighlightClick(highlight)
            return true
          }
        }

        return false
      },
    },
  })
}

/**
 * Read-only TipTap viewer for journals with native TipTap highlighting
 */
export const TipTapViewer: React.FC<TipTapViewerProps> = ({
  contentTiptap,
  highlights = [],
  onHighlightCreate,
  onHighlightClick,
  onContentChange,
  minHeight = '300px',
}) => {
  const editor = useEditor({
    extensions: getEditorExtensions('', true),
    content: contentTiptap,
    editable: false, // Read-only by default
    editorProps: {
      attributes: {
        class: 'prose max-w-none journal-tiptap-viewer',
      },
    },
  })

  // Update editor content when prop changes
  useEffect(() => {
    if (editor && contentTiptap) {
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
      const plugin = createHighlightDecorationPlugin(highlights, onHighlightClick)
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
  }, [editor, highlights, onHighlightClick])

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
      console.log('[TipTapViewer] Highlight clicked:', event.detail);
      // Parent component can listen to this event
      // and show comment thread, etc.
    };

    document.addEventListener('highlight-clicked', handleHighlightClick as EventListener);
    return () => {
      document.removeEventListener('highlight-clicked', handleHighlightClick as EventListener);
    };
  }, [editor]);

  if (!editor) {
    return null
  }

  return (
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
  )
}
