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

interface RichTextEditorProps {
  content: string
  onChange: (content: string) => void
  onTipTapChange?: (contentTiptap: Record<string, unknown>) => void
  placeholder?: string
  minHeight?: string
  showToolbar?: boolean
  disabled?: boolean
  onFocus?: () => void
  enableHighlights?: boolean
  onHighlightCreate?: (highlight: HighlightData) => void
}

/**
 * Rich text editor component using TipTap
 */
export const RichTextEditor: React.FC<RichTextEditorProps> = ({
  content,
  onChange,
  onTipTapChange,
  placeholder = 'Start writing...',
  minHeight = '300px',
  showToolbar = true,
  disabled = false,
  onFocus,
  enableHighlights = true,
  onHighlightCreate
}) => {
  const editor = useEditor({
    extensions: getEditorExtensions(placeholder, enableHighlights),
    content,
    editable: !disabled,
    onCreate: ({ editor }) => {
      // Initialize TipTap JSON on editor creation
      console.log('[RichTextEditor] onCreate fired, onTipTapChange exists?', !!onTipTapChange)
      if (onTipTapChange) {
        const tiptapJSON = editor.getJSON()
        console.log('[RichTextEditor] onCreate - setting initial TipTap JSON:', tiptapJSON)
        onTipTapChange(tiptapJSON)
      }
    },
    onUpdate: ({ editor }) => {
      // Get properly formatted markdown from storage
      // @ts-expect-error - markdown storage is added by tiptap-markdown extension
      const markdown = editor.storage.markdown.getMarkdown() as string
      onChange(markdown)

      // Also provide TipTap JSON if callback is provided
      console.log('[RichTextEditor] onUpdate fired, onTipTapChange exists?', !!onTipTapChange)
      if (onTipTapChange) {
        const tiptapJSON = editor.getJSON()
        console.log('[RichTextEditor] onUpdate - setting TipTap JSON:', tiptapJSON)
        onTipTapChange(tiptapJSON)
      }
    },
    onFocus: () => {
      if (onFocus) {
        onFocus()
      }
    }
  })

  // Ensure contentTiptap is initialized when editor becomes available
  useEffect(() => {
    if (editor && onTipTapChange) {
      const tiptapJSON = editor.getJSON()
      console.log('[RichTextEditor] useEffect - initializing TipTap JSON:', tiptapJSON)
      onTipTapChange(tiptapJSON)
    }
  }, [editor, onTipTapChange])

  // Update editor content when prop changes
  useEffect(() => {
    if (editor) {
      // @ts-expect-error - markdown storage is added by tiptap-markdown extension
      const currentMarkdown = editor.storage.markdown.getMarkdown() as string
      if (content !== currentMarkdown) {
        editor.commands.setContent(content)
      }
    }
  }, [content, editor])

  // Update editable state when disabled prop changes
  useEffect(() => {
    if (editor) {
      editor.setEditable(!disabled)
    }
  }, [disabled, editor])

  // Handle highlight click events
  useEffect(() => {
    if (!editor || !enableHighlights) return;

    const handleHighlightClick = (event: CustomEvent) => {
      console.log('[RichTextEditor] Highlight clicked:', event.detail);
      // This can be handled by parent component if needed
    };

    document.addEventListener('highlight-clicked', handleHighlightClick as EventListener);
    return () => {
      document.removeEventListener('highlight-clicked', handleHighlightClick as EventListener);
    };
  }, [editor, enableHighlights]);

  if (!editor) {
    return null
  }

  return (
    <div className="rich-text-editor">
      {/* Highlight toolbar (floating) */}
      {enableHighlights && (
        <HighlightToolbar
          editor={editor}
          onHighlightCreate={onHighlightCreate}
          disabled={disabled}
        />
      )}

      {showToolbar && (
        <div className="editor-toolbar">
          <div className="toolbar-group">
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleBold().run()}
              className={editor.isActive('bold') ? 'is-active' : ''}
              disabled={disabled}
              title="Bold"
            >
              <strong>B</strong>
            </button>
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleItalic().run()}
              className={editor.isActive('italic') ? 'is-active' : ''}
              disabled={disabled}
              title="Italic"
            >
              <em>I</em>
            </button>
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleStrike().run()}
              className={editor.isActive('strike') ? 'is-active' : ''}
              disabled={disabled}
              title="Strikethrough"
            >
              <s>S</s>
            </button>
          </div>

          <div className="toolbar-group">
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
              className={editor.isActive('heading', { level: 1 }) ? 'is-active' : ''}
              disabled={disabled}
              title="Heading 1"
            >
              H1
            </button>
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
              className={editor.isActive('heading', { level: 2 }) ? 'is-active' : ''}
              disabled={disabled}
              title="Heading 2"
            >
              H2
            </button>
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
              className={editor.isActive('heading', { level: 3 }) ? 'is-active' : ''}
              disabled={disabled}
              title="Heading 3"
            >
              H3
            </button>
          </div>

          <div className="toolbar-group">
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleBulletList().run()}
              className={editor.isActive('bulletList') ? 'is-active' : ''}
              disabled={disabled}
              title="Bullet List"
            >
              • List
            </button>
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
              className={editor.isActive('orderedList') ? 'is-active' : ''}
              disabled={disabled}
              title="Numbered List"
            >
              1. List
            </button>
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleTaskList().run()}
              className={editor.isActive('taskList') ? 'is-active' : ''}
              disabled={disabled}
              title="Task List"
            >
              ☑ Tasks
            </button>
          </div>

          <div className="toolbar-group">
            <button
              type="button"
              onClick={() => editor.chain().focus().sinkListItem('listItem').run()}
              disabled={!editor.can().sinkListItem('listItem') || disabled}
              title="Indent"
            >
              → Indent
            </button>
            <button
              type="button"
              onClick={() => editor.chain().focus().liftListItem('listItem').run()}
              disabled={!editor.can().liftListItem('listItem') || disabled}
              title="Unindent"
            >
              ← Unindent
            </button>
          </div>

          <div className="toolbar-group">
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleBlockquote().run()}
              className={editor.isActive('blockquote') ? 'is-active' : ''}
              disabled={disabled}
              title="Quote"
            >
              " Quote
            </button>
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleCodeBlock().run()}
              className={editor.isActive('codeBlock') ? 'is-active' : ''}
              disabled={disabled}
              title="Code Block"
            >
              {'<> Code'}
            </button>
          </div>

          <div className="toolbar-group">
            <button
              type="button"
              onClick={() => editor.chain().focus().setHorizontalRule().run()}
              disabled={disabled}
              title="Horizontal Line"
            >
              ― Line
            </button>
            <button
              type="button"
              onClick={() => editor.chain().focus().undo().run()}
              disabled={!editor.can().undo() || disabled}
              title="Undo"
            >
              ↶ Undo
            </button>
            <button
              type="button"
              onClick={() => editor.chain().focus().redo().run()}
              disabled={!editor.can().redo() || disabled}
              title="Redo"
            >
              ↷ Redo
            </button>
          </div>
        </div>
      )}

      <EditorContent
        editor={editor}
        className="editor-content"
        style={{ minHeight }}
      />
    </div>
  )
}
