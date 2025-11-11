import React, { useEffect, useState, useCallback, useContext } from 'react';
import { Editor } from '@tiptap/react';
import { AuthContext } from '../../../stores/authStore';
import type { HighlightColor } from '../types/highlight.types';
import { HIGHLIGHT_COLORS } from '../types/highlight.types';

import type { Highlight, HighlightSelection } from '../types/highlight.types';

interface HighlightData {
  id: string;
  color: string;
  authorId: string;
  authorName: string;
  createdAt: string;
  commentCount: number;
  text: string;
  range: { from: number; to: number };
}

interface HighlightToolbarProps {
  editor: Editor | null;
  onHighlightCreate?: (highlight: HighlightData) => void;
  // Function to create backend highlight and return it (with its ID)
  onCreateBackendHighlight?: (selection: HighlightSelection, color: string) => Promise<Highlight>;
  disabled?: boolean;
}

const TOOLBAR_OFFSET_Y = -60; // Position above selection

export const HighlightToolbar: React.FC<HighlightToolbarProps> = ({
  editor,
  onHighlightCreate,
  onCreateBackendHighlight,
  disabled = false,
}) => {
  // Use auth context if available (gracefully handle tests without AuthProvider)
  const authContext = useContext(AuthContext);
  const user = authContext?.user ?? null;
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);

  const updatePosition = useCallback(() => {
    if (!editor || disabled) {
      setShowColorPicker(false);
      return;
    }

    const { selection, doc } = editor.state;
    const { from, to } = selection;

    // Only show toolbar if there's a non-empty selection
    if (selection.empty) {
      setShowColorPicker(false);
      return;
    }

    // Get selected text
    const selectedText = doc.textBetween(from, to, ' ');
    if (!selectedText.trim()) {
      setShowColorPicker(false);
      return;
    }

    // Get the DOM coordinates of the selection
    const { view } = editor;
    const coords = view.coordsAtPos(from);

    // Calculate position (centered above selection)
    const selectionWidth = view.coordsAtPos(to).left - coords.left;
    const centerX = coords.left + selectionWidth / 2;

    setPosition({
      x: centerX,
      y: coords.top + TOOLBAR_OFFSET_Y,
    });
    setShowColorPicker(true);
  }, [editor, disabled]);

  // Listen to selection changes
  useEffect(() => {
    if (!editor) return;

    // Update on selection change
    const handleSelectionUpdate = () => {
      // Small delay to let the browser update selection
      setTimeout(updatePosition, 10);
    };

    const handleTransaction = () => {
      // Check if selection changed
      handleSelectionUpdate();
    };

    editor.on('selectionUpdate', handleSelectionUpdate);
    editor.on('transaction', handleTransaction);
    editor.on('blur', () => setShowColorPicker(false));

    return () => {
      editor.off('selectionUpdate', handleSelectionUpdate);
      editor.off('transaction', handleTransaction);
      editor.off('blur');
    };
  }, [editor, updatePosition]);

  // Handle color selection
  const handleColorSelect = useCallback(
    async (color: HighlightColor) => {
      if (!editor) return;

      const { selection } = editor.state;
      const { from, to } = selection;

      // Get selected text
      const selectedText = editor.state.doc.textBetween(from, to, ' ');

      let highlightId: string;
      let highlightData: any;

      // If we have a backend highlight creator, use it to get a backend ID
      if (onCreateBackendHighlight) {
        try {
          // Create backend highlight first
          console.log('[HighlightToolbar] Creating backend highlight first...');
          const backendHighlight = await onCreateBackendHighlight(
            {
              text: selectedText,
              range: {
                startOffset: from,
                endOffset: to,
              },
            } as HighlightSelection,
            color
          );

          // Use the backend-generated ID
          highlightId = backendHighlight.id;
          console.log('[HighlightToolbar] Backend highlight created with ID:', highlightId);

          highlightData = {
            id: highlightId,
            color,
            authorId: backendHighlight.createdBy,
            authorName: backendHighlight.createdByName,
            createdAt: backendHighlight.createdAt,
            commentCount: 0,
          };
        } catch (error) {
          console.error('[HighlightToolbar] Failed to create backend highlight:', error);
          // Fallback to local ID
          highlightId = `highlight-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          highlightData = {
            id: highlightId,
            color,
            authorId: user?.userId || 'test-user',
            authorName: user?.displayName || user?.username || user?.email || 'Test User',
            createdAt: new Date().toISOString(),
            commentCount: 0,
          };
        }
      } else {
        // No backend integration - generate local ID
        highlightId = `highlight-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        highlightData = {
          id: highlightId,
          color,
          authorId: user?.userId || 'test-user',
          authorName: user?.displayName || user?.username || user?.email || 'Test User',
          createdAt: new Date().toISOString(),
          commentCount: 0,
        };
      }

      // Apply highlight mark with the ID (either from backend or local)
      editor
        .chain()
        .focus()
        .setHighlight(highlightData)
        .run();

      // Notify parent component
      if (onHighlightCreate) {
        onHighlightCreate({
          ...highlightData,
          text: selectedText,
          range: {
            from,
            to,
          },
        });
      }

      // Hide toolbar
      setShowColorPicker(false);

      // Clear selection after a brief delay
      setTimeout(() => {
        editor.commands.focus();
      }, 100);
    },
    [editor, onHighlightCreate, onCreateBackendHighlight, user]
  );

  // Handle click outside to close
  useEffect(() => {
    if (!showColorPicker) return;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.highlight-toolbar')) {
        setShowColorPicker(false);
      }
    };

    // Use timeout to avoid immediate closing
    const timeoutId = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 100);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showColorPicker]);

  if (!showColorPicker || !position || disabled) {
    return null;
  }

  return (
    <div
      className="highlight-toolbar"
      style={{
        position: 'fixed',
        left: `${position.x}px`,
        top: `${position.y}px`,
        transform: 'translateX(-50%)',
        zIndex: 9999,
        background: 'linear-gradient(135deg, var(--theme-primary-500) 0%, var(--theme-primary-700) 100%)',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        borderRadius: '12px',
        padding: '8px 12px',
        display: 'flex',
        gap: '8px',
        alignItems: 'center',
        boxShadow: '0 10px 40px rgba(20, 184, 166, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.1)',
        animation: 'slideInFromTop 0.2s ease-out',
      }}
    >
      <style>{`
        @keyframes slideInFromTop {
          from {
            opacity: 0;
            transform: translateX(-50%) translateY(-10px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateX(-50%) translateY(0) scale(1);
          }
        }

        /* Pointer arrow pointing down */
        .highlight-toolbar::after {
          content: '';
          position: absolute;
          bottom: -8px;
          left: 50%;
          transform: translateX(-50%);
          width: 0;
          height: 0;
          border-left: 8px solid transparent;
          border-right: 8px solid transparent;
          border-top: 8px solid var(--theme-primary-700);
        }

        .highlight-toolbar-label {
          color: white;
          font-size: 12px;
          font-weight: 600;
          margin-right: 4px;
          white-space: nowrap;
          letter-spacing: 0.3px;
        }

        .highlight-color-btn {
          width: 32px;
          height: 32px;
          border-radius: 6px;
          border: 2px solid rgba(255, 255, 255, 0.4);
          cursor: pointer;
          transition: all 0.2s ease;
          position: relative;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
        }

        .highlight-color-btn:hover {
          transform: scale(1.15);
          border-color: white;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
        }

        .highlight-color-btn:active {
          transform: scale(1.05);
        }

        .highlight-toolbar-divider {
          width: 1px;
          height: 24px;
          background: rgba(255, 255, 255, 0.3);
          margin: 0 4px;
        }

        .highlight-toolbar-cancel {
          padding: 6px 12px;
          font-size: 12px;
          font-weight: 500;
          color: white;
          background: rgba(255, 255, 255, 0.15);
          border: 1px solid rgba(255, 255, 255, 0.3);
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.2s ease;
          white-space: nowrap;
        }

        .highlight-toolbar-cancel:hover {
          background: rgba(255, 255, 255, 0.25);
        }
      `}</style>

      <span className="highlight-toolbar-label">Highlight:</span>

      {/* Color buttons */}
      {(Object.keys(HIGHLIGHT_COLORS) as HighlightColor[]).map((color) => (
        <button
          key={color}
          className="highlight-color-btn"
          style={{
            backgroundColor: HIGHLIGHT_COLORS[color],
          }}
          onClick={() => handleColorSelect(color)}
          title={`Highlight in ${color}`}
          aria-label={`Highlight in ${color}`}
        />
      ))}

      <div className="highlight-toolbar-divider" />

      {/* Cancel button */}
      <button
        className="highlight-toolbar-cancel"
        onClick={() => setShowColorPicker(false)}
        aria-label="Cancel"
      >
        Cancel
      </button>
    </div>
  );
};
