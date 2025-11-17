/**
 * Custom TipTap Node for Q&A Pairs
 *
 * Stores question/answer data directly in TipTap document structure.
 * Questions and answers support rich text with marks (highlights, etc.)
 */
import { Node, mergeAttributes } from '@tiptap/core'
import type { Node as ProseMirrorNode } from '@tiptap/pm/model'
import type { Transaction, EditorState } from '@tiptap/pm/state'
import type { Command } from '@tiptap/core'
import { ReactNodeViewRenderer } from '@tiptap/react'
import { QAPairNodeView } from '../components/tiptap/QAPairNodeView'

export interface QAPairAttributes {
  id: string
  isCollapsed: boolean
}

// Child nodes for Q&A content
export const QAPairQuestion = Node.create({
  name: 'qaPairQuestion',
  content: 'inline*',
  group: 'block',
  defining: true,

  parseHTML() {
    return [{ tag: 'div[data-qa-question]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-qa-question': '' }), 0]
  },
})

export const QAPairAnswer = Node.create({
  name: 'qaPairAnswer',
  content: 'inline*',
  group: 'block',
  defining: true,

  parseHTML() {
    return [{ tag: 'div[data-qa-answer]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-qa-answer': '' }), 0]
  },
})

// Extend TipTap's RawCommands to include our custom commands
declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    qaPair: {
      /**
       * Insert a Q&A pair node with question and answer content
       */
      insertQAPair: (id: string, question: string, answer: string) => ReturnType
      /**
       * Update a Q&A pair node by ID
       */
      updateQAPair: (id: string, updates: Partial<QAPairAttributes>) => ReturnType
    }
  }
}

export const QAPairNode = Node.create({
  name: 'qaPair',

  group: 'block',

  content: 'qaPairQuestion qaPairAnswer', // Required structure: question then answer

  isolating: true, // Prevent content from outside affecting this node

  addAttributes() {
    return {
      id: {
        default: null,
        parseHTML: element => element.getAttribute('data-id'),
        renderHTML: attributes => ({
          'data-id': attributes.id,
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
        (id: string, question: string, answer: string): Command =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: { id, isCollapsed: false },
            content: [
              {
                type: 'qaPairQuestion',
                content: question ? [{ type: 'text', text: question }] : [],
              },
              {
                type: 'qaPairAnswer',
                content: answer ? [{ type: 'text', text: answer }] : [],
              },
            ],
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
