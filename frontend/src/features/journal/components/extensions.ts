import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import { Markdown } from 'tiptap-markdown'
import { HighlightMark } from '../extensions/HighlightMark'

/**
 * TipTap editor extensions configuration
 */
export const getEditorExtensions = (placeholder?: string, enableHighlights = true) => {
  const extensions = [
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
    TaskList,
    TaskItem.configure({
      nested: true
    }),
    ...(enableHighlights ? [
      HighlightMark.configure({
        HTMLAttributes: {
          class: 'journal-highlight',
        },
      })
    ] : []),
    Markdown.configure({
      html: false,              // Output markdown, not HTML
      tightLists: true,         // Use tight list spacing
      bulletListMarker: '-',    // Use - for bullet lists
      linkify: false,           // Disable auto-linking
      breaks: false,            // No hard breaks
      transformPastedText: true, // Convert pasted content to markdown
      transformCopiedText: false // Don't transform on copy to avoid conflicts
    })
    // Note: Link extension is provided by the Markdown extension
  ]

  return extensions
}
