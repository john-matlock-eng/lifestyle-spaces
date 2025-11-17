/**
 * React Node View for Q&A Pair
 *
 * Renders Q&A pairs with collapse/expand functionality.
 * Questions and answers support rich text with highlights.
 */
import React, { useState } from 'react'
import { NodeViewWrapper, NodeViewContent, type NodeViewProps } from '@tiptap/react'
import { ChevronDown, ChevronUp, Trash2 } from 'lucide-react'

export const QAPairNodeView: React.FC<NodeViewProps> = ({ node, updateAttributes, deleteNode, editor }) => {
  const { id, isCollapsed } = node.attrs
  const [localCollapsed, setLocalCollapsed] = useState(isCollapsed)

  const isReadOnly = !editor.isEditable

  const handleToggleCollapse = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setLocalCollapsed(!localCollapsed)
    // Don't update attributes to avoid triggering editor re-render
    // Collapse state is local UI state only
  }

  const handleDelete = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    deleteNode()
  }

  return (
    <NodeViewWrapper className="qa-pair-tiptap">
      <div className="qa-pair-display" data-qa-id={id}>
        <div className="qa-pair-header-display">
          <button
            type="button"
            onClick={handleToggleCollapse}
            className="qa-collapse-btn"
            aria-expanded={!localCollapsed}
            aria-label={localCollapsed ? 'Expand question' : 'Collapse question'}
          >
            {localCollapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
          </button>

          <span className="qa-number">Q</span>

          {!isReadOnly && (
            <div className="qa-actions">
              <button
                type="button"
                onClick={handleDelete}
                className="qa-action-btn qa-delete-btn"
                title="Delete"
              >
                <Trash2 size={14} />
              </button>
            </div>
          )}
        </div>

        <NodeViewContent
          className={`qa-content-wrapper ${localCollapsed ? 'collapsed' : 'expanded'}`}
        />
      </div>

      <style>{`
        .qa-pair-tiptap {
          margin: 16px 0;
        }

        .qa-pair-display {
          background: var(--theme-bg-surface);
          border: 1px solid var(--theme-border-base);
          border-radius: 8px;
          overflow: hidden;
          transition: all 0.2s ease;
        }

        .qa-pair-display:hover {
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
        }

        .dark .qa-pair-display:hover {
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
        }

        .qa-pair-header-display {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px;
          background: var(--theme-bg-elevated);
        }

        .qa-collapse-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 24px;
          height: 24px;
          border: none;
          background: transparent;
          color: var(--theme-text-secondary);
          cursor: pointer;
          transition: all 0.2s;
          flex-shrink: 0;
        }

        .qa-collapse-btn:hover {
          color: var(--theme-primary-600);
        }

        .qa-number {
          display: flex;
          align-items: center;
          justify-content: center;
          min-width: 32px;
          height: 32px;
          padding: 0 8px;
          background: var(--theme-primary-600);
          color: white;
          font-weight: 600;
          font-size: 12px;
          border-radius: 16px;
          flex-shrink: 0;
        }

        .qa-actions {
          display: flex;
          gap: 4px;
          flex-shrink: 0;
        }

        .qa-action-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 24px;
          height: 24px;
          border: none;
          background: transparent;
          color: var(--theme-text-secondary);
          cursor: pointer;
          transition: all 0.2s;
          border-radius: 4px;
        }

        .qa-action-btn:hover {
          background: var(--theme-bg-surface);
          color: var(--theme-text-primary);
        }

        .qa-delete-btn:hover {
          color: #ef4444;
          background: rgba(239, 68, 68, 0.1);
        }

        /* Content wrapper */
        .qa-content-wrapper {
          display: flex;
          flex-direction: column;
        }

        /* Question styling - appears in header */
        .qa-content-wrapper > [data-qa-question] {
          flex: 1;
          color: var(--theme-text-primary);
          font-weight: 500;
          padding: 0 12px;
          min-width: 0;
          outline: none;
          margin-top: -44px; /* Move up to align with header */
          padding-top: 12px;
          padding-bottom: 12px;
        }

        .qa-content-wrapper > [data-qa-question]:focus {
          outline: 2px solid var(--theme-primary-600);
          outline-offset: 2px;
          border-radius: 4px;
        }

        /* Answer styling - appears below when expanded */
        .qa-content-wrapper > [data-qa-answer] {
          padding: 16px;
          color: var(--theme-text-primary);
          font-size: 14px;
          line-height: 1.6;
          outline: none;
        }

        .qa-content-wrapper.collapsed > [data-qa-answer] {
          display: none;
        }

        .qa-content-wrapper > [data-qa-answer]:focus {
          outline: 2px solid var(--theme-primary-600);
          outline-offset: 2px;
          border-radius: 4px;
        }

        /* Support for highlights within Q&A */
        .qa-content-wrapper mark[data-highlight-id] {
          cursor: pointer;
        }
      `}</style>
    </NodeViewWrapper>
  )
}
