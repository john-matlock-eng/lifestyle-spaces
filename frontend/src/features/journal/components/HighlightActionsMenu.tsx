/**
 * HighlightActionsMenu - Floating menu for highlight actions
 *
 * Appears when clicking on an existing highlight
 * Provides options to view comments, edit selection, or delete highlight
 *
 * Based on the original menu from HighlightableText component
 */
import React, { useEffect, useRef } from 'react'
import ReactDOM from 'react-dom'

interface HighlightActionsMenuProps {
  highlightId: string
  position: { x: number; y: number }
  commentCount: number
  onViewComments: () => void
  onEditSelection: () => void
  onDelete: () => void
  onClose: () => void
}

export const HighlightActionsMenu: React.FC<HighlightActionsMenuProps> = ({
  position,
  commentCount,
  onViewComments,
  onEditSelection,
  onDelete,
  onClose
}) => {
  const menuRef = useRef<HTMLDivElement>(null)

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [onClose])

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (!target.closest('.highlight-menu')) {
        onClose()
      }
    }

    // Small delay to prevent immediate close from the click that opened the menu
    const timeoutId = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside)
    }, 100)

    return () => {
      clearTimeout(timeoutId)
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [onClose])

  const handleViewComments = async () => {
    await onViewComments()
    // Don't call onClose() - let the parent component handle closing
    // The parent needs to keep selectedHighlight set to show the CommentThread
  }

  const handleEditSelection = async () => {
    await onEditSelection()
    // Don't call onClose() - let the parent component handle closing
  }

  const handleDelete = async () => {
    if (confirm('Delete this highlight and its comments?')) {
      await onDelete()
      // Don't call onClose() - let the parent component handle closing
    }
  }

  const menuElement = (
    <div
      ref={menuRef}
      className="highlight-menu"
      style={{
        position: 'fixed',
        left: `${position.x}px`,
        top: `${position.y}px`,
        transform: 'translateX(-50%)',
        zIndex: 99999,
        background: 'white',
        borderRadius: '10px',
        boxShadow: '0 10px 40px rgba(0, 0, 0, 0.2)',
        border: '1px solid rgba(0, 0, 0, 0.1)',
        overflow: 'hidden',
        minWidth: '200px',
        animation: 'fadeIn 0.2s ease-out',
      }}
    >
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateX(-50%) translateY(-10px); }
          to { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
      `}</style>

      {/* View Comments Button */}
      <button
        onClick={handleViewComments}
        style={{
          width: '100%',
          padding: '14px 18px',
          fontSize: '14px',
          fontWeight: '600',
          color: 'var(--theme-primary-700)',
          background: 'none',
          border: 'none',
          borderBottom: '1px solid rgba(0, 0, 0, 0.08)',
          cursor: 'pointer',
          textAlign: 'left',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          transition: 'background-color 0.15s ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = 'rgba(20, 184, 166, 0.08)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'transparent';
        }}
      >
        <span style={{ fontSize: '18px' }}>💬</span>
        <span>View Comments ({commentCount || 0})</span>
      </button>

      {/* Edit Selection Button */}
      <button
        onClick={handleEditSelection}
        style={{
          width: '100%',
          padding: '14px 18px',
          fontSize: '14px',
          fontWeight: '600',
          color: 'var(--theme-primary-600)',
          background: 'none',
          border: 'none',
          borderBottom: '1px solid rgba(0, 0, 0, 0.08)',
          cursor: 'pointer',
          textAlign: 'left',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          transition: 'background-color 0.15s ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.08)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'transparent';
        }}
      >
        <span style={{ fontSize: '18px' }}>✏️</span>
        <span>Edit Selection</span>
      </button>

      {/* Delete Highlight Button */}
      <button
        onClick={handleDelete}
        style={{
          width: '100%',
          padding: '14px 18px',
          fontSize: '14px',
          fontWeight: '600',
          color: 'var(--theme-error-700)',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          textAlign: 'left',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          transition: 'background-color 0.15s ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.08)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'transparent';
        }}
      >
        <span style={{ fontSize: '18px' }}>🗑️</span>
        <span>Delete Highlight</span>
      </button>
    </div>
  )

  // Use React Portal to render at document body level (like original implementation)
  return ReactDOM.createPortal(menuElement, document.body)
}
