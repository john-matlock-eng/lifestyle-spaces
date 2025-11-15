/**
 * React Node View for Q&A Pair
 *
 * Renders Q&A pairs with collapse/expand functionality.
 * Works in both edit and read-only modes.
 */
import React, { useState } from 'react'
import { NodeViewWrapper, NodeViewProps } from '@tiptap/react'
import { ChevronDown, ChevronUp, Trash2 } from 'lucide-react'

export const QAPairNodeView: React.FC<NodeViewProps> = ({ node, updateAttributes, deleteNode, editor }) => {
  const { id, question, answer, isCollapsed } = node.attrs
  const [localCollapsed, setLocalCollapsed] = useState(isCollapsed)
  const [isEditing, setIsEditing] = useState(false)
  const [editQuestion, setEditQuestion] = useState(question)
  const [editAnswer, setEditAnswer] = useState(answer)

  const isReadOnly = !editor.isEditable

  const handleToggleCollapse = () => {
    const newCollapsed = !localCollapsed
    setLocalCollapsed(newCollapsed)
    updateAttributes({ isCollapsed: newCollapsed })
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
          margin: 12px 0;
        }

        .qa-pair-display {
          border: 1px solid var(--color-border, #e5e7eb);
          border-radius: 8px;
          padding: 12px;
          background: var(--color-background, white);
        }

        .qa-pair-header-display {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .qa-collapse-btn {
          background: none;
          border: none;
          padding: 4px;
          cursor: pointer;
          color: var(--color-text-secondary, #6b7280);
          display: flex;
          align-items: center;
          transition: color 0.2s;
        }

        .qa-collapse-btn:hover {
          color: var(--color-text-primary, #111827);
        }

        .qa-number {
          font-weight: 600;
          color: var(--color-primary, #14b8a6);
          min-width: 20px;
        }

        .qa-question-display {
          flex: 1;
        }

        .qa-question-input {
          width: 100%;
          padding: 4px 8px;
          border: 1px solid var(--color-border, #e5e7eb);
          border-radius: 4px;
          font-size: 14px;
        }

        .qa-actions {
          display: flex;
          gap: 4px;
        }

        .qa-action-btn {
          background: none;
          border: none;
          padding: 4px 8px;
          cursor: pointer;
          color: var(--color-text-secondary, #6b7280);
          border-radius: 4px;
          transition: all 0.2s;
          font-size: 14px;
        }

        .qa-action-btn:hover {
          background: var(--color-background-hover, #f3f4f6);
          color: var(--color-text-primary, #111827);
        }

        .qa-save-btn {
          color: var(--color-success, #10b981);
        }

        .qa-delete-btn:hover {
          color: var(--color-danger, #ef4444);
        }

        .qa-answer-display {
          margin-top: 8px;
          padding-left: 44px;
        }

        .qa-answer-text {
          color: var(--color-text-primary, #111827);
          line-height: 1.6;
          white-space: pre-wrap;
        }

        .qa-answer-input {
          width: 100%;
          padding: 8px;
          border: 1px solid var(--color-border, #e5e7eb);
          border-radius: 4px;
          font-size: 14px;
          font-family: inherit;
          resize: vertical;
        }
      `}</style>
    </NodeViewWrapper>
  )
}
