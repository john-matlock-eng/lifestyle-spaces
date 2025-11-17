/**
 * React Node View for Q&A Pair
 *
 * Renders Q&A pairs with collapse/expand functionality.
 * Works in both edit and read-only modes.
 */
import React, { useState } from 'react'
import { NodeViewWrapper, type NodeViewProps } from '@tiptap/react'
import { ChevronDown, ChevronUp, Trash2 } from 'lucide-react'

export const QAPairNodeView: React.FC<NodeViewProps> = ({ node, updateAttributes, deleteNode, editor }) => {
  const { id, question, answer, isCollapsed } = node.attrs
  const [localCollapsed, setLocalCollapsed] = useState(isCollapsed)
  const [isEditing, setIsEditing] = useState(false)
  const [editQuestion, setEditQuestion] = useState(question)
  const [editAnswer, setEditAnswer] = useState(answer)

  const isReadOnly = !editor.isEditable

  const handleToggleCollapse = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setLocalCollapsed(!localCollapsed)
    // Don't update attributes to avoid triggering editor re-render
    // Collapse state is local UI state only
  }

  const handleSaveEdit = () => {
    updateAttributes({
      question: editQuestion,
      answer: editAnswer,
    })
    setIsEditing(false)
  }

  const handleCancelEdit = () => {
    setEditQuestion(question)
    setEditAnswer(answer)
    setIsEditing(false)
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

          <div className="qa-question-display">
            {isEditing ? (
              <input
                type="text"
                value={editQuestion}
                onChange={(e) => setEditQuestion(e.target.value)}
                className="qa-question-input"
                placeholder="Question"
              />
            ) : (
              <strong>{question}</strong>
            )}
          </div>

          {!isReadOnly && (
            <div className="qa-actions">
              {isEditing ? (
                <>
                  <button
                    type="button"
                    onClick={handleSaveEdit}
                    className="qa-action-btn qa-save-btn"
                    title="Save"
                  >
                    ✓
                  </button>
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    className="qa-action-btn qa-cancel-btn"
                    title="Cancel"
                  >
                    ✕
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => setIsEditing(true)}
                    className="qa-action-btn"
                    title="Edit"
                  >
                    ✎
                  </button>
                  <button
                    type="button"
                    onClick={deleteNode}
                    className="qa-action-btn qa-delete-btn"
                    title="Delete"
                  >
                    <Trash2 size={14} />
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        {!localCollapsed && (
          <div className="qa-answer-display">
            {isEditing ? (
              <textarea
                value={editAnswer}
                onChange={(e) => setEditAnswer(e.target.value)}
                className="qa-answer-input"
                placeholder="Answer"
                rows={4}
              />
            ) : (
              <div className="qa-answer-text">{answer}</div>
            )}
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
        }

        .qa-question-display {
          flex: 1;
          color: var(--theme-text-primary);
        }

        .qa-question-display strong {
          font-weight: 500;
          color: var(--theme-text-primary);
        }

        .qa-question-input {
          flex: 1;
          padding: 8px 12px;
          border: 1px solid var(--theme-border-base);
          border-radius: 4px;
          font-size: 14px;
          font-weight: 500;
          background: var(--theme-bg-base);
          color: var(--theme-text-primary);
          transition: all 0.2s;
        }

        .qa-question-input:focus {
          outline: none;
          border-color: var(--theme-primary-600);
          box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
        }

        .dark .qa-question-input:focus {
          box-shadow: 0 0 0 2px rgba(96, 165, 250, 0.2);
        }

        .qa-actions {
          display: flex;
          gap: 4px;
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
          font-size: 14px;
        }

        .qa-action-btn:hover {
          background: var(--theme-bg-surface);
          color: var(--theme-text-primary);
        }

        .qa-save-btn {
          color: #10b981;
        }

        .qa-save-btn:hover {
          background: rgba(16, 185, 129, 0.1);
        }

        .qa-cancel-btn:hover {
          background: rgba(239, 68, 68, 0.1);
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

        .qa-answer-input {
          width: 100%;
          padding: 12px;
          border: 1px solid var(--theme-border-base);
          border-radius: 4px;
          font-size: 14px;
          line-height: 1.6;
          resize: vertical;
          min-height: 100px;
          background: var(--theme-bg-base);
          color: var(--theme-text-primary);
          transition: all 0.2s;
          font-family: inherit;
        }

        .qa-answer-input:focus {
          outline: none;
          border-color: var(--theme-primary-600);
          box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
        }

        .dark .qa-answer-input:focus {
          box-shadow: 0 0 0 2px rgba(96, 165, 250, 0.2);
        }
      `}</style>
    </NodeViewWrapper>
  )
}
