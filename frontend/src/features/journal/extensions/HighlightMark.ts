import { Mark, mergeAttributes } from '@tiptap/core';

export interface HighlightAttributes {
  id: string;
  color: string;
  authorId: string;
  authorName: string;
  createdAt: string;
  commentCount: number;
}

export const HighlightMark = Mark.create<{
  HTMLAttributes: Record<string, unknown>;
}>({
  name: 'highlight',

  addOptions() {
    return {
      HTMLAttributes: {},
      multicolor: true,
    };
  },

  addAttributes() {
    return {
      id: {
        default: null,
        parseHTML: element => element.getAttribute('data-highlight-id'),
        renderHTML: attributes => ({
          'data-highlight-id': attributes.id,
        }),
      },
      color: {
        default: 'yellow',
        parseHTML: element => element.getAttribute('data-highlight-color') || 'yellow',
        renderHTML: attributes => {
          const colorHex = this.getColorHex(attributes.color);
          return {
            'data-highlight-color': attributes.color,
            style: `background-color: ${colorHex}; padding: 2px 0; border-radius: 2px; cursor: pointer;`,
          };
        },
      },
      authorId: {
        default: null,
        parseHTML: element => element.getAttribute('data-author-id'),
        renderHTML: attributes => ({
          'data-author-id': attributes.authorId,
        }),
      },
      authorName: {
        default: null,
        parseHTML: element => element.getAttribute('data-author-name'),
        renderHTML: attributes => ({
          'data-author-name': attributes.authorName,
        }),
      },
      createdAt: {
        default: null,
        parseHTML: element => element.getAttribute('data-created-at'),
        renderHTML: attributes => ({
          'data-created-at': attributes.createdAt,
        }),
      },
      commentCount: {
        default: 0,
        parseHTML: element => parseInt(element.getAttribute('data-comment-count') || '0'),
        renderHTML: attributes => ({
          'data-comment-count': attributes.commentCount,
          title: `${attributes.commentCount} comment${attributes.commentCount !== 1 ? 's' : ''}`,
        }),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'mark[data-highlight-id]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ['mark', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes), 0];
  },

  addCommands() {
    return {
      setHighlight: (attributes: Partial<HighlightAttributes>) => ({ commands, state }) => {
        if (state.selection.empty) return false;

        const id = attributes.id || `highlight-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        return commands.setMark(this.name, {
          ...attributes,
          id,
          createdAt: attributes.createdAt || new Date().toISOString(),
        });
      },

      toggleHighlight: (attributes: Partial<HighlightAttributes>) => ({ commands }) => {
        return commands.toggleMark(this.name, attributes);
      },

      unsetHighlight: (id?: string) => ({ state, commands, view }) => {
        if (id) {
          // Remove specific highlight by ID
          const { tr } = state;
          let updated = false;

          state.doc.descendants((node, pos) => {
            node.marks.forEach(mark => {
              if (mark.type.name === this.name && mark.attrs.id === id) {
                const from = pos;
                const to = pos + node.nodeSize;
                tr.removeMark(from, to, mark.type);
                updated = true;
              }
            });
          });

          if (updated) {
            view.dispatch(tr);
            return true;
          }
          return false;
        }
        return commands.unsetMark(this.name);
      },

      updateHighlightCommentCount: (id: string, count: number) => ({ state, view }) => {
        const { tr } = state;
        let updated = false;

        state.doc.descendants((node, pos) => {
          node.marks.forEach(mark => {
            if (mark.type.name === this.name && mark.attrs.id === id) {
              const from = pos;
              const to = pos + node.nodeSize;
              const newMark = mark.type.create({ ...mark.attrs, commentCount: count });
              tr.removeMark(from, to, mark.type);
              tr.addMark(from, to, newMark);
              updated = true;
            }
          });
        });

        if (updated) {
          view.dispatch(tr);
          return true;
        }
        return false;
      },
    };
  },

  // Handle click events on highlights
  onCreate() {
    this.editor.on('click', ({ event }) => {
      const target = event.target as HTMLElement;
      const markElement = target.closest('mark[data-highlight-id]');

      if (markElement) {
        const highlightId = markElement.getAttribute('data-highlight-id');
        const authorName = markElement.getAttribute('data-author-name');
        const commentCount = parseInt(markElement.getAttribute('data-comment-count') || '0');
        const color = markElement.getAttribute('data-highlight-color');

        // Dispatch custom event for highlight click
        const customEvent = new CustomEvent('highlight-clicked', {
          detail: {
            id: highlightId,
            authorName,
            commentCount,
            color,
          },
        });
        document.dispatchEvent(customEvent);
      }
    });
  },

  // Helper method for color hex values
  getColorHex(color: string): string {
    const colors: Record<string, string> = {
      yellow: '#FEF08A',
      green: '#86EFAC',
      blue: '#93C5FD',
      purple: '#C4B5FD',
      pink: '#F9A8D4',
      orange: '#FDBA74',
    };
    return colors[color] || colors.yellow;
  },
});

// Extend Commands interface for TypeScript
declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    highlight: {
      /**
       * Set a highlight mark on selected text
       */
      setHighlight: (attributes: Partial<HighlightAttributes>) => ReturnType;
      /**
       * Toggle highlight mark
       */
      toggleHighlight: (attributes: Partial<HighlightAttributes>) => ReturnType;
      /**
       * Remove highlight mark (optionally by ID)
       */
      unsetHighlight: (id?: string) => ReturnType;
      /**
       * Update the comment count on a highlight
       */
      updateHighlightCommentCount: (id: string, count: number) => ReturnType;
    };
  }
}
