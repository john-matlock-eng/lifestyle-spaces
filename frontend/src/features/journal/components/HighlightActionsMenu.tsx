/**
 * HighlightActionsMenu - Floating menu for highlight actions
 *
 * Appears when clicking on an existing highlight
 * Provides options to view comments, edit selection, or delete highlight
 */
import React, { useEffect, useState, useRef } from 'react'
import { MessageSquare, Edit3, Trash2, X } from 'lucide-react'

interface HighlightActionsMenuProps {
  highlightId: string
  position: { x: number; y: number }
  onViewComments: () => void
  onEditSelection: () => void
  onDelete: () => void
  onClose: () => void
}

export const HighlightActionsMenu: React.FC<HighlightActionsMenuProps> = ({
  highlightId,
  position,
  onViewComments,
  onEditSelection,
  onDelete,
  onClose
}) => {
  const menuRef = useRef<HTMLDivElement>(null)
  const [adjustedPosition, setAdjustedPosition] = useState(position)

  // Adjust position to keep menu on screen
  useEffect(() => {
    if (!menuRef.current) return

    const menu = menuRef.current
    const rect = menu.getBoundingClientRect()
    const viewportWidth = window.innerWidth
    const viewportHeight = window.innerHeight

    let { x, y } = position

    // Keep horizontal position on screen
    if (x + rect.width > viewportWidth - 10) {
      x = viewportWidth - rect.width - 10
    }
    if (x < 10) {
      x = 10
    }

    // Keep vertical position on screen
    if (y + rect.height > viewportHeight - 10) {
      y = viewportHeight - rect.height - 10
    }
    if (y < 10) {
      y = 10
    }

    setAdjustedPosition({ x, y })
  }, [position])

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
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose()
      }
    }

    // Small delay to prevent immediate close from the click that opened the menu
    setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside)
    }, 100)

    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [onClose])

  return (
    <div
      ref={menuRef}
      className="highlight-actions-menu"
      style={{
        position: 'fixed',
        left: `${adjustedPosition.x}px`,
        top: `${adjustedPosition.y}px`,
        zIndex: 9999
      }}
    >
      <div className="menu-content">
        <button
          className="menu-action"
          onClick={() => {
            onViewComments()
            onClose()
          }}
        >
          <MessageSquare size={16} />
          <span>View Comments</span>
        </button>

        <button
          className="menu-action"
          onClick={() => {
            onEditSelection()
            onClose()
          }}
        >
          <Edit3 size={16} />
          <span>Edit Selection</span>
        </button>

        <div className="menu-divider" />

        <button
          className="menu-action menu-action-danger"
          onClick={() => {
            if (confirm('Delete this highlight and its comments?')) {
              onDelete()
              onClose()
            }
          }}
        >
          <Trash2 size={16} />
          <span>Delete Highlight</span>
        </button>
      </div>

      <style>{`
        .highlight-actions-menu {
          animation: fadeInScale 0.15s ease-out;
        }

        @keyframes fadeInScale {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        .menu-content {
          background: var(--theme-bg-elevated);
          border: 1px solid var(--theme-border-base);
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
          padding: 6px;
          min-width: 200px;
        }

        .dark .menu-content {
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
        }

        .menu-action {
          display: flex;
          align-items: center;
          gap: 12px;
          width: 100%;
          padding: 10px 12px;
          border: none;
          background: transparent;
          color: var(--theme-text-primary);
          font-size: 14px;
          font-family: inherit;
          cursor: pointer;
          border-radius: 6px;
          transition: all 0.15s;
          text-align: left;
        }

        .menu-action:hover {
          background: var(--theme-bg-surface);
        }

        .menu-action-danger {
          color: #ef4444;
        }

        .menu-action-danger:hover {
          background: rgba(239, 68, 68, 0.1);
        }

        .menu-divider {
          height: 1px;
          background: var(--theme-border-base);
          margin: 6px 0;
        }
      `}</style>
    </div>
  )
}
