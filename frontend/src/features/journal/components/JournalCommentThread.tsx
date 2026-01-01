/**
 * JournalCommentThread Component
 *
 * Inline comment thread for journal-level discussions.
 * Features:
 * - Collapsible view showing comment count
 * - Threaded replies
 * - @mention support
 * - Dark mode compatibility
 * - Option to expand to side panel
 */

import React, { useState, useRef, useEffect } from 'react';
import { useJournalComments } from '../hooks/useJournalComments';
import type { JournalComment } from '../types/journalComment.types';

interface JournalCommentThreadProps {
  spaceId: string;
  journalId: string;
  journalTitle: string;
  currentUserId: string;
  spaceMembers?: Array<{ id: string; name: string }>;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  onOpenPanel?: () => void;
}

// Generate consistent color for user based on their ID
const getUserColor = (userId: string): string => {
  const colors = [
    '#14b8a6', '#a855f7', '#ec4899', '#10b981',
    '#0ea5e9', '#f59e0b', '#0d9488', '#9333ea',
  ];
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

// Format timestamp
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

  return then.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

// Highlight @mentions in text
const highlightMentions = (text: string, isDarkMode: boolean): React.ReactNode => {
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
            padding: '2px 6px',
            borderRadius: '4px',
          }}
        >
          {part}
        </span>
      );
    }
    return <span key={index}>{part}</span>;
  });
};

export const JournalCommentThread: React.FC<JournalCommentThreadProps> = ({
  spaceId,
  journalId,
  currentUserId,
  spaceMembers = [],
  isExpanded = false,
  onToggleExpand,
  onOpenPanel,
}) => {
  const {
    comments,
    loading,
    error,
    commentCount,
    createComment,
    updateComment,
    deleteComment,
  } = useJournalComments(spaceId, journalId);

  const [expanded, setExpanded] = useState(isExpanded);
  const [commentText, setCommentText] = useState('');
  const [replyToId, setReplyToId] = useState<string | null>(null);
  const [showMentions, setShowMentions] = useState(false);
  const [mentionSearch, setMentionSearch] = useState('');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [prevCommentCount, setPrevCommentCount] = useState(0);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const commentsEndRef = useRef<HTMLDivElement>(null);

  // Detect dark mode
  useEffect(() => {
    const checkDarkMode = () => {
      setIsDarkMode(document.documentElement.classList.contains('dark'));
    };
    checkDarkMode();
    const observer = new MutationObserver(checkDarkMode);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [commentText]);

  // Auto-scroll to new comments
  useEffect(() => {
    if (comments.length > prevCommentCount && commentsEndRef.current) {
      commentsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
    setPrevCommentCount(comments.length);
  }, [comments.length, prevCommentCount]);

  const handleToggleExpand = () => {
    setExpanded(!expanded);
    onToggleExpand?.();
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    setCommentText(text);

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

  const handleMentionSelect = (memberName: string) => {
    if (!textareaRef.current) return;

    const cursorPos = textareaRef.current.selectionStart;
    const textBeforeCursor = commentText.substring(0, cursorPos);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');
    const textAfterCursor = commentText.substring(cursorPos);

    const newText = commentText.substring(0, lastAtIndex) + `@${memberName} ` + textAfterCursor;
    setCommentText(newText);
    setShowMentions(false);
    textareaRef.current.focus();
  };

  const handleSubmit = async () => {
    if (!commentText.trim()) return;
    await createComment(commentText, replyToId || undefined);
    setCommentText('');
    setReplyToId(null);
  };

  const handleStartEdit = (comment: JournalComment) => {
    setEditingCommentId(comment.id);
    setEditText(comment.text);
  };

  const handleCancelEdit = () => {
    setEditingCommentId(null);
    setEditText('');
  };

  const handleSaveEdit = async () => {
    if (!editingCommentId || !editText.trim()) return;
    await updateComment(editingCommentId, editText);
    setEditingCommentId(null);
    setEditText('');
  };

  const filteredMembers = spaceMembers.filter((member) =>
    member.name.toLowerCase().includes(mentionSearch.toLowerCase())
  );

  const rootComments = comments.filter((c) => !c.parentCommentId);
  const getReplies = (parentId: string) => comments.filter((c) => c.parentCommentId === parentId);

  const renderComment = (comment: JournalComment, depth: number = 0) => {
    const isAuthor = comment.author === currentUserId;
    const replies = getReplies(comment.id);
    const userColor = getUserColor(comment.author);

    return (
      <div key={comment.id} className={depth > 0 ? 'ml-8 mt-3' : 'mt-4'}>
        <div className="flex gap-3">
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
              flexShrink: 0,
            }}
          >
            {comment.authorName.charAt(0).toUpperCase()}
          </div>

          <div className="flex-1 min-w-0">
            <div
              style={{
                backgroundColor: isDarkMode
                  ? (isAuthor ? 'rgba(59, 130, 246, 0.12)' : 'rgba(30, 41, 59, 0.6)')
                  : (isAuthor ? 'var(--theme-primary-100)' : 'var(--theme-bg-elevated)'),
                borderRadius: '14px',
                padding: '12px 14px',
                border: `1px solid ${isDarkMode
                  ? (isAuthor ? 'rgba(59, 130, 246, 0.25)' : 'rgba(148, 163, 184, 0.15)')
                  : (isAuthor ? 'var(--theme-primary-200)' : 'var(--theme-border-light)')}`,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '6px' }}>
                <span style={{
                  fontWeight: '700',
                  fontSize: '13px',
                  color: isDarkMode ? '#f1f5f9' : 'var(--theme-text-primary)',
                }}>
                  {comment.authorName}
                </span>
                <span style={{
                  fontSize: '11px',
                  color: isDarkMode ? '#94a3b8' : 'var(--theme-text-secondary)',
                }}>
                  {formatTimestamp(comment.createdAt)}
                </span>
                {comment.isEdited && (
                  <span style={{ fontSize: '10px', color: isDarkMode ? '#64748b' : 'var(--theme-text-muted)', fontStyle: 'italic' }}>
                    (edited)
                  </span>
                )}
              </div>
              {editingCommentId === comment.id ? (
                <div>
                  <textarea
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px',
                      border: `1px solid ${isDarkMode ? 'rgba(148, 163, 184, 0.3)' : 'var(--theme-border-light)'}`,
                      borderRadius: '6px',
                      fontSize: '13px',
                      backgroundColor: isDarkMode ? '#1e293b' : 'var(--theme-bg-surface)',
                      color: isDarkMode ? '#f1f5f9' : 'var(--theme-text-primary)',
                      fontFamily: 'inherit',
                      resize: 'none',
                      minHeight: '60px',
                    }}
                    autoFocus
                  />
                  <div style={{ display: 'flex', gap: '8px', marginTop: '8px', justifyContent: 'flex-end' }}>
                    <button
                      onClick={handleCancelEdit}
                      style={{
                        fontSize: '12px',
                        padding: '4px 10px',
                        borderRadius: '4px',
                        border: `1px solid ${isDarkMode ? 'rgba(148, 163, 184, 0.3)' : 'var(--theme-border-light)'}`,
                        background: 'none',
                        color: isDarkMode ? '#94a3b8' : 'var(--theme-text-secondary)',
                        cursor: 'pointer',
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveEdit}
                      style={{
                        fontSize: '12px',
                        padding: '4px 10px',
                        borderRadius: '4px',
                        border: 'none',
                        backgroundColor: isDarkMode ? '#3b82f6' : 'var(--theme-primary-600)',
                        color: 'white',
                        cursor: 'pointer',
                        fontWeight: '600',
                      }}
                    >
                      Save
                    </button>
                  </div>
                </div>
              ) : (
                <p style={{
                  fontSize: '13px',
                  color: isDarkMode ? '#e2e8f0' : 'var(--theme-text-primary)',
                  lineHeight: '1.5',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  margin: 0,
                }}>
                  {highlightMentions(comment.text, isDarkMode)}
                </p>
              )}
            </div>

            {editingCommentId !== comment.id && (
              <div style={{ display: 'flex', gap: '12px', marginTop: '8px', marginLeft: '8px' }}>
                <button
                  style={{
                    fontSize: '12px',
                    color: isDarkMode ? '#60a5fa' : 'var(--theme-primary-600)',
                    fontWeight: '600',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '0',
                  }}
                  onClick={() => setReplyToId(comment.id)}
                >
                  Reply
                </button>
                {isAuthor && (
                  <>
                    <button
                      style={{
                        fontSize: '12px',
                        color: isDarkMode ? '#94a3b8' : 'var(--theme-text-secondary)',
                        fontWeight: '600',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '0',
                      }}
                      onClick={() => handleStartEdit(comment)}
                    >
                      Edit
                    </button>
                    <button
                      style={{
                        fontSize: '12px',
                        color: isDarkMode ? '#f87171' : 'var(--theme-error-600)',
                        fontWeight: '600',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '0',
                      }}
                      onClick={() => deleteComment(comment.id)}
                    >
                      Delete
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {replies.length > 0 && (
          <div className="mt-2">
            {replies.map((reply) => renderComment(reply, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      style={{
        marginTop: '2rem',
        borderTop: `1px solid ${isDarkMode ? 'rgba(148, 163, 184, 0.2)' : 'var(--theme-border-light)'}`,
        paddingTop: '1.5rem',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: expanded ? '1rem' : '0',
        }}
      >
        <button
          onClick={handleToggleExpand}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '8px 0',
            color: isDarkMode ? '#f1f5f9' : 'var(--theme-text-primary)',
            fontSize: '15px',
            fontWeight: '600',
          }}
        >
          <span style={{ fontSize: '18px' }}>💬</span>
          <span>Discussion</span>
          {commentCount > 0 && (
            <span
              style={{
                backgroundColor: isDarkMode ? 'rgba(59, 130, 246, 0.2)' : 'var(--theme-primary-100)',
                color: isDarkMode ? '#60a5fa' : 'var(--theme-primary-700)',
                padding: '2px 8px',
                borderRadius: '12px',
                fontSize: '12px',
                fontWeight: '600',
              }}
            >
              {commentCount}
            </span>
          )}
          <span style={{ fontSize: '12px', transform: expanded ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s' }}>
            ▼
          </span>
        </button>

        {onOpenPanel && (
          <button
            onClick={onOpenPanel}
            style={{
              fontSize: '12px',
              color: isDarkMode ? '#94a3b8' : 'var(--theme-text-secondary)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '4px 8px',
            }}
            title="Open in panel"
          >
            ⬚ Expand
          </button>
        )}
      </div>

      {/* Expanded content */}
      {expanded && (
        <div>
          {loading && (
            <div style={{ textAlign: 'center', padding: '1rem', color: isDarkMode ? '#94a3b8' : 'var(--theme-text-secondary)' }}>
              Loading comments...
            </div>
          )}

          {error && (
            <div style={{ textAlign: 'center', padding: '1rem', color: 'var(--theme-error-600)' }}>
              {error}
            </div>
          )}

          {!loading && !error && comments.length === 0 && (
            <div style={{
              textAlign: 'center',
              padding: '2rem',
              color: isDarkMode ? '#94a3b8' : 'var(--theme-text-secondary)',
            }}>
              <div style={{ fontSize: '32px', marginBottom: '8px', opacity: 0.6 }}>💭</div>
              <div style={{ fontSize: '14px' }}>No comments yet. Start the conversation!</div>
            </div>
          )}

          {!loading && rootComments.map((comment) => renderComment(comment))}

          {/* Auto-scroll target */}
          <div ref={commentsEndRef} />

          {/* Comment input */}
          <div style={{ marginTop: '1.5rem', position: 'relative' }}>
            {replyToId && (
              <div
                style={{
                  marginBottom: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 12px',
                  backgroundColor: isDarkMode ? 'rgba(59, 130, 246, 0.15)' : 'var(--theme-primary-100)',
                  borderRadius: '6px',
                  fontSize: '12px',
                  color: isDarkMode ? '#93c5fd' : 'var(--theme-primary-700)',
                }}
              >
                <span>↩ Replying to comment</span>
                <button
                  onClick={() => setReplyToId(null)}
                  style={{
                    marginLeft: 'auto',
                    background: 'none',
                    border: 'none',
                    color: 'inherit',
                    fontWeight: '600',
                    cursor: 'pointer',
                    fontSize: '12px',
                  }}
                >
                  Cancel
                </button>
              </div>
            )}

            {showMentions && filteredMembers.length > 0 && (
              <div
                style={{
                  position: 'absolute',
                  bottom: '100%',
                  left: 0,
                  right: 0,
                  marginBottom: '8px',
                  backgroundColor: isDarkMode ? '#1e293b' : 'var(--theme-bg-surface)',
                  border: `1px solid ${isDarkMode ? 'rgba(148, 163, 184, 0.2)' : 'var(--theme-border-light)'}`,
                  borderRadius: '8px',
                  boxShadow: 'var(--theme-shadow-lg)',
                  maxHeight: '150px',
                  overflowY: 'auto',
                  zIndex: 10,
                }}
              >
                {filteredMembers.map((member) => (
                  <button
                    key={member.id}
                    onClick={() => handleMentionSelect(member.name)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      textAlign: 'left',
                      fontSize: '13px',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      color: isDarkMode ? '#e2e8f0' : 'var(--theme-text-primary)',
                    }}
                  >
                    <div
                      style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        background: getUserColor(member.id),
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
                border: `2px solid ${isDarkMode ? 'rgba(148, 163, 184, 0.2)' : 'var(--theme-border-light)'}`,
                borderRadius: '8px',
                fontSize: '13px',
                resize: 'none',
                minHeight: '44px',
                maxHeight: '120px',
                outline: 'none',
                backgroundColor: isDarkMode ? '#1e293b' : 'var(--theme-bg-surface)',
                color: isDarkMode ? '#f1f5f9' : 'var(--theme-text-primary)',
                fontFamily: 'inherit',
              }}
              rows={1}
              onKeyDown={(e) => {
                // On mobile/touch devices, Enter creates new line; use button to submit
                // On desktop, Ctrl/Cmd+Enter submits (Enter creates new line)
                const isMobile = window.matchMedia('(max-width: 768px)').matches || 'ontouchstart' in window;
                if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && !isMobile) {
                  e.preventDefault();
                  handleSubmit();
                }
              }}
            />

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
              {commentText && (
                <button
                  onClick={() => {
                    setCommentText('');
                    setReplyToId(null);
                  }}
                  className="button-secondary"
                  style={{ padding: '6px 12px', fontSize: '12px' }}
                >
                  Clear
                </button>
              )}
              <button
                onClick={handleSubmit}
                disabled={!commentText.trim()}
                className="button-primary"
                style={{ padding: '6px 14px', fontSize: '12px', fontWeight: '600' }}
              >
                Post
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default JournalCommentThread;
