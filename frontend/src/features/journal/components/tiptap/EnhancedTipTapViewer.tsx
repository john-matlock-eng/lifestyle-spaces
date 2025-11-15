/**
 * Enhanced TipTap Viewer with Custom Nodes
 *
 * Supports all content types including Q&A pairs.
 * Replaces the need for HighlightableText and markdown rendering.
 */
import React, { useEffect } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import { getEditorExtensions } from '../extensions'
import { QAPairNode } from '../../extensions/QAPairNode'
import { HighlightToolbar } from '../HighlightToolbar'
import '../../styles/tiptap-viewer.css'
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
  const editor = useEditor({
    extensions: [
      ...getEditorExtensions('Start writing...', true), // Use standard extensions
      QAPairNode, // Add custom Q&A node
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

  if (!editor) {
    return <div className="tiptap-loading">Loading...</div>
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
          cursor: isEditable ? 'text' : 'default',
        }}
      />
    </div>
  )
}
