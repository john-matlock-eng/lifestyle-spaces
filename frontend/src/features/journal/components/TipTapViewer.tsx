import React, { useEffect } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import { getEditorExtensions } from './extensions'
import { HighlightToolbar } from './HighlightToolbar'
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
  onHighlightCreate?: (highlight: HighlightData) => void
  onContentChange?: (contentTiptap: Record<string, unknown>) => void
  minHeight?: string
}

/**
 * Read-only TipTap viewer for journals with native TipTap highlighting
 */
export const TipTapViewer: React.FC<TipTapViewerProps> = ({
  contentTiptap,
  onHighlightCreate,
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
