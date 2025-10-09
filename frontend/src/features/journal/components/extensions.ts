import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import Link from '@tiptap/extension-link'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'

/**
 * TipTap editor extensions configuration
 */
export const getEditorExtensions = (placeholder?: string) => [
  StarterKit.configure({
    heading: {
      levels: [1, 2, 3]
    },
    bulletList: {
      keepMarks: true,
      keepAttributes: false
    },
    orderedList: {
      keepMarks: true,
      keepAttributes: false
    }
  }),
  Placeholder.configure({
    placeholder: placeholder || 'Start writing...'
  }),
  Link.configure({
    openOnClick: false,
    HTMLAttributes: {
      class: 'journal-link'
    }
  }),
  TaskList,
  TaskItem.configure({
    nested: true
  })
]
