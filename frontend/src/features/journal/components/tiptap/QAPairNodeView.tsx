/**
 * React Node View for Q&A Pair
 *
 * Renders Q&A pairs with collapse/expand functionality.
 * Note: Highlighting is not supported in Q&A - they render as plain text for read-only view.
 */
import React, { useState, useMemo } from 'react'
import { NodeViewWrapper, type NodeViewProps } from '@tiptap/react'
import { ChevronDown, ChevronUp, Trash2 } from 'lucide-react'

export const QAPairNodeView: React.FC<NodeViewProps> = ({ node, updateAttributes, deleteNode, editor }) => {
  const { id, isCollapsed } = node.attrs
  const [localCollapsed, setLocalCollapsed] = useState(isCollapsed)

  const isReadOnly = !editor.isEditable

  // Extract question and answer text from child nodes
  const questionText = useMemo(() => {
    if (node.content.childCount < 1) return ''
    const questionNode = node.content.child(0)
    return questionNode.textContent
  }, [node.content])

  const answerText = useMemo(() => {
    if (node.content.childCount < 2) return ''
    const answerNode = node.content.child(1)
    return answerNode.textContent
  }, [node.content])

  const handleToggleCollapse = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setLocalCollapsed(!localCollapsed)
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

          <div className="qa-question-text">
            {questionText}
          </div>

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

        {!localCollapsed && (
          <div className="qa-answer-display">
            <div className="qa-answer-text">{answerText}</div>
          </div>
        )}
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
          border-bottom: 1px solid var(--theme-border-base);
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

        .qa-question-text {
          flex: 1;
          color: var(--theme-text-primary);
          font-weight: 500;
          min-width: 0;
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

        .qa-answer-display {
          padding: 16px;
        }

        .qa-answer-text {
          color: var(--theme-text-primary);
          font-size: 14px;
          line-height: 1.6;
          white-space: pre-wrap;
        }
      `}</style>
    </NodeViewWrapper>
  )
}
