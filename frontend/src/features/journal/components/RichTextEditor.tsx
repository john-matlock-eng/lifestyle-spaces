import React, { useEffect } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import { Markdown } from 'tiptap-markdown'
import { getEditorExtensions } from './extensions'
import '../styles/journal.css'

interface RichTextEditorProps {
  content: string
  onChange: (content: string) => void
  placeholder?: string
  minHeight?: string
  showToolbar?: boolean
  disabled?: boolean
}

/**
 * Rich text editor component using TipTap
 */
export const RichTextEditor: React.FC<RichTextEditorProps> = ({
  content,
  onChange,
  placeholder = 'Start writing...',
  minHeight = '300px',
  showToolbar = true,
  disabled = false
}) => {
  const editor = useEditor({
    extensions: [...getEditorExtensions(placeholder), Markdown],
    content,
    editable: !disabled,
    onUpdate: ({ editor }) => {
      // Get content as markdown
      const markdown = editor.getText()
      onChange(markdown)
    }
  })

  // Update editor content when prop changes
  useEffect(() => {
    if (editor && content !== editor.getText()) {
      editor.commands.setContent(content)
    }
  }, [content, editor])

  // Update editable state when disabled prop changes
  useEffect(() => {
    if (editor) {
      editor.setEditable(!disabled)
    }
  }, [disabled, editor])

  if (!editor) {
    return null
  }

  return (
    <div className="rich-text-editor">
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
