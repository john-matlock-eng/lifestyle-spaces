/**
 * CommentThread Component - INLINE SIDE PANEL DESIGN
 *
 * Displays a highlight with its associated comment thread as an inline side panel.
 * Features:
 * - Full dark mode support with automatic detection
 * - Inline side panel (no backdrop/blur overlay)
 * - Navigation between highlights with < > buttons
 * - Theme-aware gradient header with dark mode variants
 * - Enhanced contrast for readability
 * - Consistent avatar colors per user
 * - Smooth animations (fadeIn)
 * - Modern comment bubbles with proper backgrounds
 * - Smart timestamp formatting (just now, 5m ago, etc.)
 * - @mention highlighting with theme awareness
 * - Elegant reply threading
 * - Floating mention autocomplete
 * - Improved spacing and visual hierarchy
 *
 * Renders inline within the page layout (not as a portal).
 */

import React, { useState, useRef, useEffect } from 'react';
import type { Highlight, Comment } from '../types/highlight.types';
import { HIGHLIGHT_COLORS } from '../types/highlight.types';

interface CommentThreadProps {
  highlight: Highlight;
  comments: Comment[];
  spaceMembers: Array<{ id: string; name: string }>;
  currentUserId: string;
  onAddComment: (text: string, parentId?: string) => void;
  onDeleteComment: (commentId: string) => void;
  onClose: () => void;
  // Navigation between highlights
  allHighlights?: Highlight[];
  onNavigateHighlight?: (highlight: Highlight) => void;
}

// Generate consistent color for user based on their ID (using theme colors)
const getUserColor = (userId: string): string => {
  const colors = [
    '#14b8a6', // theme teal (primary-500)
    '#a855f7', // theme purple (secondary-500)
    '#ec4899', // theme pink (accent-500)
    '#10b981', // theme green (status-success)
    '#0ea5e9', // theme blue (status-info)
    '#f59e0b', // theme yellow (status-warning)
    '#0d9488', // theme teal dark (primary-600)
    '#9333ea', // theme purple dark (secondary-600)
  ];

  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

// Format timestamp smartly (just now, 5m ago, 2h ago, etc.) - Timezone agnostic
const formatTimestamp = (isoString: string): string => {
  const now = new Date();
  const then = new Date(isoString);
  const diffMs = now.getTime() - then.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  // Relative times (timezone agnostic)
  if (diffSec < 10) return 'just now';
  if (diffSec < 60) return `${diffSec}s ago`;
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;

  // For older dates, show full date in user's locale with year if different
  const currentYear = now.getFullYear();
  const thenYear = then.getFullYear();

  if (currentYear === thenYear) {
    // Same year - show month and day in user's locale
    return then.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  } else {
    // Different year - include year
    return then.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  }
};

// Highlight @mentions in text using theme colors (dark mode compatible)
const highlightMentions = (text: string, isDarkMode: boolean = false): React.ReactNode => {
  const parts = text.split(/(@\w+)/g);
  return parts.map((part, index) => {
    if (part.startsWith('@')) {
      return (
        <span
          key={index}
          style={{
            color: isDarkMode ? '#60a5fa' : 'var(--theme-primary-700)',
            fontWeight: '700',
            backgroundColor: isDarkMode ? 'rgba(59, 130, 246, 0.15)' : 'var(--theme-primary-100)',
            padding: '3px 6px',
            borderRadius: '4px',
            border: isDarkMode ? '1px solid rgba(59, 130, 246, 0.3)' : 'none',
          }}
        >
          {part}
        </span>
      );
    }
    return <span key={index}>{part}</span>;
  });
};

export const CommentThread: React.FC<CommentThreadProps> = ({
  highlight,
  comments,
  spaceMembers,
  currentUserId,
  onAddComment,
  onDeleteComment,
  onClose,
  allHighlights = [],
  onNavigateHighlight,
}) => {
  const [replyToId, setReplyToId] = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');
  const [showMentions, setShowMentions] = useState(false);
  const [mentionSearch, setMentionSearch] = useState('');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [, setTimestampTick] = useState(0); // Forces re-render to update timestamps
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Update timestamps every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setTimestampTick(tick => tick + 1);
    }, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, []);

  // Detect dark mode
  useEffect(() => {
    const checkDarkMode = () => {
      const isDark = document.documentElement.classList.contains('dark');
      setIsDarkMode(isDark);
    };

    // Initial check
    checkDarkMode();

    // Watch for theme changes
    const observer = new MutationObserver(checkDarkMode);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });

    return () => observer.disconnect();
  }, []);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [commentText]);

  // Handle @mention detection
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    setCommentText(text);

    // Check for @ symbol at cursor position
    const cursorPos = e.target.selectionStart;
    const textBeforeCursor = text.substring(0, cursorPos);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');

    if (lastAtIndex !== -1) {
      const textAfterAt = textBeforeCursor.substring(lastAtIndex + 1);
      if (!textAfterAt.includes(' ')) {
        setMentionSearch(textAfterAt);
        setShowMentions(true);
        return;
      }
    }

    setShowMentions(false);
    setMentionSearch('');
  };

  // Handle mention selection
  const handleMentionSelect = (memberName: string) => {
    if (!textareaRef.current) return;

    const cursorPos = textareaRef.current.selectionStart;
    const textBeforeCursor = commentText.substring(0, cursorPos);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');
    const textAfterCursor = commentText.substring(cursorPos);

    const newText =
      commentText.substring(0, lastAtIndex) +
      `@${memberName} ` +
      textAfterCursor;

    setCommentText(newText);
    setShowMentions(false);
    setMentionSearch('');
    textareaRef.current.focus();
  };

  // Submit comment
  const handleSubmit = () => {
    if (!commentText.trim()) return;

    onAddComment(commentText, replyToId || undefined);
    setCommentText('');
    setReplyToId(null);
  };

  // Filter members for mention autocomplete
  const filteredMembers = spaceMembers.filter((member) =>
    member.name.toLowerCase().includes(mentionSearch.toLowerCase())
  );

  // Organize comments by parent/child relationship
  const rootComments = comments.filter((c) => !c.parentCommentId);
  const getReplies = (parentId: string) =>
    comments.filter((c) => c.parentCommentId === parentId);

  // Navigation helpers
  const currentIndex = allHighlights.findIndex(h => h.id === highlight.id);
  const hasPrevious = currentIndex > 0;
  const hasNext = currentIndex < allHighlights.length - 1;
  const totalHighlights = allHighlights.length;

  const handlePrevious = () => {
    if (hasPrevious && onNavigateHighlight) {
      onNavigateHighlight(allHighlights[currentIndex - 1]);
    }
  };

  const handleNext = () => {
    if (hasNext && onNavigateHighlight) {
      onNavigateHighlight(allHighlights[currentIndex + 1]);
    }
  };

  // Render a single comment
  const renderComment = (comment: Comment, depth: number = 0) => {
    const isAuthor = comment.author === currentUserId;
    const replies = getReplies(comment.id);
    const userColor = getUserColor(comment.author);

    return (
      <div
        key={comment.id}
        className={`comment-item ${depth > 0 ? 'ml-8 mt-3' : 'mt-4'}`}
        style={{
          animation: 'fadeIn 0.3s ease-out',
        }}
      >
        <div className="flex gap-3">
          {/* Avatar */}
          <div className="flex-shrink-0">
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: `linear-gradient(135deg, ${userColor} 0%, ${userColor}dd 100%)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: '14px',
                fontWeight: '600',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
              }}
            >
              {comment.authorName.charAt(0).toUpperCase()}
            </div>
          </div>

          {/* Comment content - Dark mode enhanced */}
          <div className="flex-1 min-w-0">
            <div
              style={{
                backgroundColor: isDarkMode
                  ? (isAuthor ? 'rgba(59, 130, 246, 0.12)' : 'rgba(30, 41, 59, 0.6)')
                  : (isAuthor ? 'var(--theme-primary-100)' : 'var(--theme-bg-elevated)'),
                borderRadius: '14px',
                padding: '14px 16px',
                boxShadow: isDarkMode
                  ? '0 4px 12px rgba(0, 0, 0, 0.2)'
                  : 'var(--theme-shadow-sm)',
                border: `1px solid ${
                  isDarkMode
                    ? (isAuthor ? 'rgba(59, 130, 246, 0.25)' : 'rgba(148, 163, 184, 0.15)')
                    : (isAuthor ? 'var(--theme-primary-200)' : 'var(--theme-border-light)')
                }`,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'baseline',
                  gap: '8px',
                  marginBottom: '8px',
                }}
              >
                <span
                  style={{
                    fontWeight: '700',
                    fontSize: '14px',
                    color: isDarkMode ? '#f1f5f9' : 'var(--theme-text-primary)',
                  }}
                >
                  {comment.authorName}
                </span>
                <span
                  style={{
                    fontSize: '12px',
                    color: isDarkMode ? '#94a3b8' : 'var(--theme-text-secondary)',
                    fontWeight: '500',
                  }}
                >
                  {formatTimestamp(comment.createdAt)}
                </span>
                {comment.isEdited && (
                  <span
                    style={{
                      fontSize: '11px',
                      color: isDarkMode ? '#64748b' : 'var(--theme-text-muted)',
                      fontStyle: 'italic',
                    }}
                  >
                    (edited)
                  </span>
                )}
              </div>
              <p
                style={{
                  fontSize: '14px',
                  color: isDarkMode ? '#e2e8f0' : 'var(--theme-text-primary)',
                  lineHeight: '1.6',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  margin: 0,
                }}
              >
                {highlightMentions(comment.text, isDarkMode)}
              </p>
            </div>

            {/* Comment actions - Dark mode compatible */}
            <div
              style={{
                display: 'flex',
                gap: '16px',
                marginTop: '12px',
                marginLeft: '8px',
              }}
            >
              <button
                style={{
                  fontSize: '13px',
                  color: isDarkMode ? '#60a5fa' : 'var(--theme-primary-600)',
                  fontWeight: '600',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '0',
                  transition: 'all 0.15s ease',
                }}
                onClick={() => setReplyToId(comment.id)}
                onMouseEnter={(e) => {
                  e.currentTarget.style.textDecoration = 'underline';
                  e.currentTarget.style.color = isDarkMode ? '#93c5fd' : 'var(--theme-primary-700)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.textDecoration = 'none';
                  e.currentTarget.style.color = isDarkMode ? '#60a5fa' : 'var(--theme-primary-600)';
                }}
              >
                Reply
              </button>
              {isAuthor && (
                <button
                  style={{
                    fontSize: '13px',
                    color: isDarkMode ? '#f87171' : 'var(--theme-error-600)',
                    fontWeight: '600',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '0',
                    transition: 'all 0.15s ease',
                  }}
                  onClick={() => onDeleteComment(comment.id)}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.textDecoration = 'underline';
                    e.currentTarget.style.color = isDarkMode ? '#fca5a5' : 'var(--theme-error-700)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.textDecoration = 'none';
                    e.currentTarget.style.color = isDarkMode ? '#f87171' : 'var(--theme-error-600)';
                  }}
                >
                  Delete
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Nested replies */}
        {replies.length > 0 && (
          <div className="mt-2">
            {replies.map((reply) => renderComment(reply, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  // Render the inline panel (no backdrop/blur)
  return (
    <div
      ref={panelRef}
      className="comment-thread-panel"
      style={{
        width: '100%',
        height: '100%',
        background: isDarkMode ? '#0f172a' : 'var(--theme-bg-surface)',
        border: `1px solid ${isDarkMode ? 'rgba(148, 163, 184, 0.1)' : 'var(--theme-border-light)'}`,
        borderRadius: '12px',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        .comment-item {
          animation: fadeIn 0.3s ease-out;
        }

        /* Custom scrollbar for comment list */
        .comments-scrollable::-webkit-scrollbar {
          width: 8px;
        }

        .comments-scrollable::-webkit-scrollbar-track {
          background: ${isDarkMode ? 'rgba(15, 23, 42, 0.5)' : 'rgba(0, 0, 0, 0.05)'};
          border-radius: 4px;
        }

        .comments-scrollable::-webkit-scrollbar-thumb {
          background: ${isDarkMode ? 'rgba(148, 163, 184, 0.3)' : 'rgba(0, 0, 0, 0.2)'};
          border-radius: 4px;
        }

        .comments-scrollable::-webkit-scrollbar-thumb:hover {
          background: ${isDarkMode ? 'rgba(148, 163, 184, 0.5)' : 'rgba(0, 0, 0, 0.3)'};
        }

        .nav-button {
          background: rgba(255, 255, 255, 0.15);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.25);
          border-radius: 6px;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s ease;
          color: white;
          font-size: 16px;
          font-weight: 600;
        }

        .nav-button:hover:not(:disabled) {
          background: rgba(255, 255, 255, 0.25);
          transform: scale(1.05);
        }

        .nav-button:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }
      `}</style>

      {/* Header with navigation */}
      <div
        style={{
          position: 'relative',
          background: isDarkMode
            ? 'linear-gradient(135deg, #1e40af 0%, #7c3aed 100%)'
            : 'linear-gradient(135deg, var(--theme-primary-500) 0%, var(--theme-primary-700) 100%)',
          padding: '12px 16px',
          color: 'white',
          boxShadow: isDarkMode
            ? '0 4px 12px rgba(0, 0, 0, 0.3)'
            : '0 2px 8px rgba(0, 0, 0, 0.1)',
          borderBottom: `1px solid ${isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.2)'}`,
        }}
      >
        {/* Top row: Navigation and close */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          {/* Navigation buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              className="nav-button"
              onClick={handlePrevious}
              disabled={!hasPrevious}
              title="Previous highlight"
            >
              ‹
            </button>
            <span style={{ fontSize: '13px', fontWeight: '500', minWidth: '60px', textAlign: 'center' }}>
              {totalHighlights > 0 ? `${currentIndex + 1} / ${totalHighlights}` : '—'}
            </span>
            <button
              className="nav-button"
              onClick={handleNext}
              disabled={!hasNext}
              title="Next highlight"
            >
              ›
            </button>
          </div>

          {/* Close button */}
          <button
            onClick={onClose}
            title="Close discussion"
            style={{
              background: 'rgba(255, 255, 255, 0.15)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.25)',
              borderRadius: '6px',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              color: 'white',
              fontSize: '18px',
              fontWeight: '400',
              lineHeight: '1',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.25)';
              e.currentTarget.style.transform = 'scale(1.05)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)';
              e.currentTarget.style.transform = 'scale(1)';
            }}
          >
            ✕
          </button>
        </div>

        {/* Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
          <span style={{ fontSize: '18px' }}>💬</span>
          <h3
            style={{
              fontSize: '15px',
              fontWeight: '600',
              margin: 0,
              letterSpacing: '0.3px',
            }}
          >
            Discussion
          </h3>
        </div>

        {/* Highlighted text preview */}
        <div
          style={{
            padding: '8px 10px',
            borderRadius: '6px',
            backgroundColor: isDarkMode
              ? 'rgba(251, 191, 36, 0.12)'
              : (highlight.color || HIGHLIGHT_COLORS.yellow),
            color: isDarkMode ? '#f1f5f9' : '#1e293b',
            fontSize: '12px',
            lineHeight: '1.5',
            boxShadow: isDarkMode
              ? '0 2px 8px rgba(0, 0, 0, 0.2)'
              : '0 1px 4px rgba(0, 0, 0, 0.1)',
            maxHeight: '60px',
            overflow: 'auto',
            border: isDarkMode ? '1px solid rgba(251, 191, 36, 0.25)' : 'none',
            fontWeight: '500',
          }}
        >
          "{highlight.highlightedText}"
        </div>

        <div
          style={{
            fontSize: '11px',
            marginTop: '8px',
            opacity: 0.95,
            fontWeight: '400',
          }}
        >
          Highlighted by {highlight.createdByName} • {formatTimestamp(highlight.createdAt)}
        </div>
      </div>

      {/* Comments list - Dark mode compatible */}
      <div
        className="comments-scrollable"
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '20px 24px',
          backgroundColor: isDarkMode ? '#1e293b' : 'var(--theme-bg-base)',
        }}
      >
        {comments.length === 0 ? (
          <div
            style={{
              textAlign: 'center',
              padding: '60px 24px',
              color: isDarkMode ? '#94a3b8' : 'var(--theme-text-secondary)',
            }}
          >
            <div style={{ fontSize: '56px', marginBottom: '16px', opacity: isDarkMode ? 0.6 : 1 }}>💭</div>
            <div style={{
              fontSize: '15px',
              fontWeight: '600',
              color: isDarkMode ? '#cbd5e1' : 'inherit',
              marginBottom: '6px'
            }}>
              No comments yet
            </div>
            <div style={{
              fontSize: '13px',
              color: isDarkMode ? '#94a3b8' : 'inherit',
              opacity: 0.9
            }}>
              Be the first to share your thoughts!
            </div>
          </div>
        ) : (
          <div>{rootComments.map((comment) => renderComment(comment))}</div>
        )}
      </div>

      {/* Comment input - Dark mode compatible */}
      <div
        style={{
          borderTop: `1px solid ${isDarkMode ? 'rgba(148, 163, 184, 0.2)' : 'var(--theme-border-light)'}`,
          padding: '24px',
          backgroundColor: isDarkMode ? '#0f172a' : 'var(--theme-bg-surface)',
          boxShadow: isDarkMode
            ? '0 -4px 16px rgba(0, 0, 0, 0.3)'
            : '0 -4px 12px rgba(0, 0, 0, 0.05)',
          position: 'relative',
        }}
      >
        {replyToId && (
          <div
            style={{
              marginBottom: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '10px 14px',
              backgroundColor: isDarkMode
                ? 'rgba(59, 130, 246, 0.15)'
                : 'var(--theme-primary-100)',
              borderRadius: '8px',
              fontSize: '13px',
              color: isDarkMode ? '#93c5fd' : 'var(--theme-primary-700)',
              border: isDarkMode ? '1px solid rgba(59, 130, 246, 0.3)' : 'none',
            }}
          >
            <span style={{ fontWeight: '500' }}>↩ Replying to comment</span>
            <button
              onClick={() => setReplyToId(null)}
              style={{
                marginLeft: 'auto',
                background: 'none',
                border: 'none',
                color: isDarkMode ? '#93c5fd' : 'var(--theme-primary-700)',
                fontWeight: '600',
                cursor: 'pointer',
                fontSize: '13px',
              }}
            >
              Cancel
            </button>
          </div>
        )}

        {/* Mention autocomplete - Dark mode compatible */}
        {showMentions && filteredMembers.length > 0 && (
          <div
            style={{
              position: 'absolute',
              bottom: '100%',
              left: '24px',
              right: '24px',
              marginBottom: '10px',
              backgroundColor: isDarkMode ? '#1e293b' : 'var(--theme-bg-surface)',
              border: `1px solid ${isDarkMode ? 'rgba(148, 163, 184, 0.2)' : 'var(--theme-border-light)'}`,
              borderRadius: '10px',
              boxShadow: isDarkMode
                ? '0 20px 25px -5px rgba(0, 0, 0, 0.4)'
                : 'var(--theme-shadow-lg)',
              maxHeight: '180px',
              overflowY: 'auto',
            }}
          >
            {filteredMembers.map((member) => (
              <button
                key={member.id}
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  textAlign: 'left',
                  fontSize: '14px',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  transition: 'background-color 0.15s ease',
                  color: isDarkMode ? '#e2e8f0' : 'var(--theme-text-primary)',
                  fontWeight: '500',
                }}
                onClick={() => handleMentionSelect(member.name)}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = isDarkMode
                    ? 'rgba(59, 130, 246, 0.15)'
                    : 'var(--theme-primary-50)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <div
                  style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    background: `linear-gradient(135deg, ${getUserColor(member.id)} 0%, ${getUserColor(member.id)}dd 100%)`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontSize: '11px',
                    fontWeight: '600',
                  }}
                >
                  {member.name.charAt(0).toUpperCase()}
                </div>
                {member.name}
              </button>
            ))}
          </div>
        )}

        <textarea
          ref={textareaRef}
          value={commentText}
          onChange={handleTextChange}
          placeholder="Add a comment... (use @ to mention)"
          style={{
            width: '100%',
            padding: '14px 16px',
            border: `2px solid ${isDarkMode ? 'rgba(148, 163, 184, 0.2)' : 'var(--theme-border-light)'}`,
            borderRadius: '10px',
            fontSize: '14px',
            resize: 'none',
            minHeight: '52px',
            maxHeight: '140px',
            outline: 'none',
            transition: 'all 0.2s ease',
            backgroundColor: isDarkMode ? '#1e293b' : 'var(--theme-bg-surface)',
            color: isDarkMode ? '#f1f5f9' : 'var(--theme-text-primary)',
            fontFamily: 'inherit',
            lineHeight: '1.5',
          }}
          rows={1}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSubmit();
            }
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = isDarkMode ? '#3b82f6' : 'var(--theme-primary-500)';
            e.currentTarget.style.boxShadow = isDarkMode
              ? '0 0 0 3px rgba(59, 130, 246, 0.1)'
              : '0 0 0 3px rgba(20, 184, 166, 0.1)';
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = isDarkMode ? 'rgba(148, 163, 184, 0.2)' : 'var(--theme-border-light)';
            e.currentTarget.style.boxShadow = 'none';
          }}
        />

        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '8px',
            marginTop: '12px',
          }}
        >
          <button
            onClick={() => {
              setCommentText('');
              setReplyToId(null);
            }}
            className="button-secondary"
            style={{
              padding: '8px 16px',
              fontSize: '13px',
              fontWeight: '500',
            }}
          >
            Clear
          </button>
          <button
            onClick={handleSubmit}
            disabled={!commentText.trim()}
            className="button-primary"
            style={{
              padding: '8px 20px',
              fontSize: '13px',
              fontWeight: '600',
            }}
          >
            Post Comment
          </button>
        </div>
      </div>
    </div>
  );
};
