/**
 * Custom TipTap Node for Q&A Pairs
 *
 * Stores question/answer data directly in TipTap document structure.
 * Eliminates need for markdown parsing and separate storage.
 */
import { Node, mergeAttributes } from '@tiptap/core'
import type { Node as ProseMirrorNode } from '@tiptap/pm/model'
import type { Transaction, EditorState } from '@tiptap/pm/state'
import type { Command } from '@tiptap/core'
import { ReactNodeViewRenderer } from '@tiptap/react'
import { QAPairNodeView } from '../components/tiptap/QAPairNodeView'

export interface QAPairAttributes {
  id: string
  question: string
  answer: string
  isCollapsed: boolean
}

export const QAPairNode = Node.create({
  name: 'qaPair',

  group: 'block',

  content: '', // Q&A pairs don't have editable content inside

  atom: true, // Treat as atomic unit

  addAttributes() {
    return {
      id: {
        default: null,
        parseHTML: element => element.getAttribute('data-id'),
        renderHTML: attributes => ({
          'data-id': attributes.id,
        }),
      },
      question: {
        default: '',
        parseHTML: element => element.getAttribute('data-question'),
        renderHTML: attributes => ({
          'data-question': attributes.question,
        }),
      },
      answer: {
        default: '',
        parseHTML: element => element.getAttribute('data-answer'),
        renderHTML: attributes => ({
          'data-answer': attributes.answer,
        }),
      },
      isCollapsed: {
        default: false,
        parseHTML: element => element.getAttribute('data-collapsed') === 'true',
        renderHTML: attributes => ({
          'data-collapsed': attributes.isCollapsed,
        }),
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="qa-pair"]',
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'qa-pair' })]
  },

  addNodeView() {
    return ReactNodeViewRenderer(QAPairNodeView)
  },

  addCommands() {
    return {
      insertQAPair:
        (attributes: QAPairAttributes): Command =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: attributes,
          })
        },
      updateQAPair:
        (id: string, updates: Partial<QAPairAttributes>): Command =>
        ({ tr, state }: { tr: Transaction; state: EditorState }) => {
          const { doc } = state
          let updated = false

          doc.descendants((node: ProseMirrorNode, pos: number) => {
            if (node.type.name === this.name && node.attrs.id === id) {
              tr.setNodeMarkup(pos, undefined, { ...node.attrs, ...updates })
              updated = true
              return false // Stop searching
            }
          })

          return updated
        },
    }
  },
})
