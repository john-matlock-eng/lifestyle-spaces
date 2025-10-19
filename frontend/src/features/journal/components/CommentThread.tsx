/**
 * CommentThread Component - STUNNING GLASSMORPHISM REDESIGN
 *
 * Displays a highlight with its associated comment thread.
 * Features:
 * - Glassmorphism sliding panel from right
 * - Gradient header with project branding
 * - Consistent avatar colors per user
 * - Smooth animations (slideInRight, fadeIn)
 * - Modern comment bubbles
 * - Smart timestamp formatting (just now, 5m ago, etc.)
 * - @mention highlighting
 * - Elegant reply threading
 * - Floating mention autocomplete
 * - Gradient submit button
 *
 * Uses React Portal to render at document.body level.
 */

import React, { useState, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';
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
}

// Generate consistent color for user based on their ID
const getUserColor = (userId: string): string => {
  const colors = [
    '#667eea', // purple
    '#f093fb', // pink
    '#4facfe', // blue
    '#43e97b', // green
    '#fa709a', // rose
    '#feca57', // yellow
    '#48dbfb', // cyan
    '#ff6b6b', // red
  ];

  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

// Format timestamp smartly (just now, 5m ago, 2h ago, etc.)
const formatTimestamp = (isoString: string): string => {
  const now = new Date();
  const then = new Date(isoString);
  const diffMs = now.getTime() - then.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 10) return 'just now';
  if (diffSec < 60) return `${diffSec}s ago`;
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;

  return then.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

// Highlight @mentions in text
const highlightMentions = (text: string): React.ReactNode => {
  const parts = text.split(/(@\w+)/g);
  return parts.map((part, index) => {
    if (part.startsWith('@')) {
      return (
        <span
          key={index}
          style={{
            color: '#667eea',
            fontWeight: '600',
            backgroundColor: 'rgba(102, 126, 234, 0.1)',
            padding: '2px 4px',
            borderRadius: '3px',
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
}) => {
  const [replyToId, setReplyToId] = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');
  const [showMentions, setShowMentions] = useState(false);
  const [mentionSearch, setMentionSearch] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

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

          {/* Comment content */}
          <div className="flex-1 min-w-0">
            <div
              style={{
                backgroundColor: isAuthor ? 'rgba(102, 126, 234, 0.08)' : 'rgba(0, 0, 0, 0.03)',
                borderRadius: '12px',
                padding: '12px',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
              }}
            >
              <div className="flex items-baseline gap-2 mb-1">
                <span
                  style={{
                    fontWeight: '600',
                    fontSize: '14px',
                    color: '#1a202c',
                  }}
                >
                  {comment.authorName}
                </span>
                <span
                  style={{
                    fontSize: '12px',
                    color: '#718096',
                  }}
                >
                  {formatTimestamp(comment.createdAt)}
                </span>
                {comment.isEdited && (
                  <span
                    style={{
                      fontSize: '11px',
                      color: '#a0aec0',
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
                  color: '#2d3748',
                  lineHeight: '1.5',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                }}
              >
                {highlightMentions(comment.text)}
              </p>
            </div>

            {/* Comment actions */}
            <div className="flex gap-4 mt-2 ml-1">
              <button
                style={{
                  fontSize: '12px',
                  color: '#667eea',
                  fontWeight: '500',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '0',
                }}
                onClick={() => setReplyToId(comment.id)}
                onMouseEnter={(e) => {
                  e.currentTarget.style.textDecoration = 'underline';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.textDecoration = 'none';
                }}
              >
                Reply
              </button>
              {isAuthor && (
                <button
                  style={{
                    fontSize: '12px',
                    color: '#e53e3e',
                    fontWeight: '500',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '0',
                  }}
                  onClick={() => onDeleteComment(comment.id)}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.textDecoration = 'underline';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.textDecoration = 'none';
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

  // Render the panel using React Portal
  const panelElement = (
    <>
      {/* Backdrop */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          backdropFilter: 'blur(4px)',
          zIndex: 9998,
          animation: 'fadeIn 0.3s ease-out',
        }}
        onClick={onClose}
      />

      {/* Sliding Panel */}
      <div
        ref={panelRef}
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          width: '480px',
          maxWidth: '90vw',
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(20px)',
          boxShadow: '-10px 0 40px rgba(0, 0, 0, 0.1)',
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          animation: 'slideInRight 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
        onClick={(e) => e.stopPropagation()}
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

          @keyframes slideInRight {
            from {
              transform: translateX(100%);
            }
            to {
              transform: translateX(0);
            }
          }

          .comment-item {
            animation: fadeIn 0.3s ease-out;
          }
        `}</style>

        {/* Gradient Header */}
        <div
          style={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            padding: '20px 24px',
            color: 'white',
            boxShadow: '0 4px 12px rgba(102, 126, 234, 0.2)',
          }}
        >
          <div className="flex items-center justify-between mb-3">
            <h3
              style={{
                fontSize: '20px',
                fontWeight: '700',
                margin: 0,
                letterSpacing: '0.5px',
              }}
            >
              💬 Discussion
            </h3>
            <button
              onClick={onClose}
              style={{
                background: 'rgba(255, 255, 255, 0.2)',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                borderRadius: '8px',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
              }}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          {/* Highlighted text preview */}
          <div
            style={{
              padding: '12px',
              borderRadius: '8px',
              backgroundColor: highlight.color || HIGHLIGHT_COLORS.yellow,
              color: '#1a202c',
              fontSize: '14px',
              lineHeight: '1.5',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
              maxHeight: '80px',
              overflow: 'auto',
            }}
          >
            "{highlight.highlightedText}"
          </div>

          <div
            style={{
              fontSize: '12px',
              marginTop: '8px',
              opacity: 0.9,
            }}
          >
            Highlighted by {highlight.createdByName} • {formatTimestamp(highlight.createdAt)}
          </div>
        </div>

        {/* Comments list */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '16px 24px',
            backgroundColor: 'rgba(248, 250, 252, 0.8)',
          }}
        >
          {comments.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: '48px 24px',
                color: '#718096',
              }}
            >
              <div style={{ fontSize: '48px', marginBottom: '12px' }}>💭</div>
              <div style={{ fontSize: '14px', fontWeight: '500' }}>
                No comments yet
              </div>
              <div style={{ fontSize: '13px', marginTop: '4px' }}>
                Be the first to share your thoughts!
              </div>
            </div>
          ) : (
            <div>{rootComments.map((comment) => renderComment(comment))}</div>
          )}
        </div>

        {/* Comment input */}
        <div
          style={{
            borderTop: '1px solid rgba(0, 0, 0, 0.08)',
            padding: '20px 24px',
            backgroundColor: 'white',
            boxShadow: '0 -4px 12px rgba(0, 0, 0, 0.05)',
            position: 'relative',
          }}
        >
          {replyToId && (
            <div
              style={{
                marginBottom: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 12px',
                backgroundColor: 'rgba(102, 126, 234, 0.08)',
                borderRadius: '6px',
                fontSize: '13px',
                color: '#667eea',
              }}
            >
              <span>↩ Replying to comment</span>
              <button
                onClick={() => setReplyToId(null)}
                style={{
                  marginLeft: 'auto',
                  background: 'none',
                  border: 'none',
                  color: '#667eea',
                  fontWeight: '600',
                  cursor: 'pointer',
                  fontSize: '13px',
                }}
              >
                Cancel
              </button>
            </div>
          )}

          {/* Mention autocomplete */}
          {showMentions && filteredMembers.length > 0 && (
            <div
              style={{
                position: 'absolute',
                bottom: '100%',
                left: '24px',
                right: '24px',
                marginBottom: '8px',
                backgroundColor: 'white',
                border: '1px solid rgba(0, 0, 0, 0.1)',
                borderRadius: '8px',
                boxShadow: '0 4px 16px rgba(0, 0, 0, 0.1)',
                maxHeight: '160px',
                overflowY: 'auto',
              }}
            >
              {filteredMembers.map((member) => (
                <button
                  key={member.id}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    textAlign: 'left',
                    fontSize: '14px',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    transition: 'background-color 0.2s ease',
                  }}
                  onClick={() => handleMentionSelect(member.name)}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(102, 126, 234, 0.08)';
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
              padding: '12px',
              border: '1px solid rgba(0, 0, 0, 0.1)',
              borderRadius: '8px',
              fontSize: '14px',
              resize: 'none',
              minHeight: '44px',
              maxHeight: '120px',
              outline: 'none',
              transition: 'border-color 0.2s ease',
            }}
            rows={1}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit();
              }
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = '#667eea';
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = 'rgba(0, 0, 0, 0.1)';
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
              style={{
                padding: '8px 16px',
                fontSize: '13px',
                fontWeight: '500',
                color: '#718096',
                backgroundColor: 'transparent',
                border: '1px solid rgba(0, 0, 0, 0.1)',
                borderRadius: '6px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.03)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              Clear
            </button>
            <button
              onClick={handleSubmit}
              disabled={!commentText.trim()}
              style={{
                padding: '8px 20px',
                fontSize: '13px',
                fontWeight: '600',
                color: 'white',
                background: commentText.trim()
                  ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                  : '#cbd5e0',
                border: 'none',
                borderRadius: '6px',
                cursor: commentText.trim() ? 'pointer' : 'not-allowed',
                transition: 'all 0.2s ease',
                boxShadow: commentText.trim()
                  ? '0 2px 8px rgba(102, 126, 234, 0.3)'
                  : 'none',
              }}
              onMouseEnter={(e) => {
                if (commentText.trim()) {
                  e.currentTarget.style.transform = 'translateY(-1px)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.4)';
                }
              }}
              onMouseLeave={(e) => {
                if (commentText.trim()) {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 2px 8px rgba(102, 126, 234, 0.3)';
                }
              }}
            >
              Post Comment
            </button>
          </div>
        </div>
      </div>
    </>
  );

  // Use React Portal to render at document body level
  return ReactDOM.createPortal(panelElement, document.body);
};
