/**
 * JournalCommentPanel Component
 *
 * Full-height sliding panel for journal-level discussions.
 * Features:
 * - Glassmorphism sliding panel from right
 * - Full dark mode support
 * - Threaded replies
 * - @mention support with autocomplete
 * - Uses React Portal for overlay
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { useJournalComments } from '../hooks/useJournalComments';
import { useCommentVisibility } from '../../../hooks/useCommentVisibility';
import type { JournalComment } from '../types/journalComment.types';

interface JournalCommentPanelProps {
  spaceId: string;
  journalId: string;
  journalTitle: string;
  currentUserId: string;
  spaceMembers?: Array<{ id: string; name: string }>;
  isOpen: boolean;
  onClose: () => void;
  scrollToUnread?: boolean;
  userLastSeen?: string | null;
  onMarkAsRead?: () => void;
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

  const currentYear = now.getFullYear();
  const thenYear = then.getFullYear();

  if (currentYear === thenYear) {
    return then.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }
  return then.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
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

export const JournalCommentPanel: React.FC<JournalCommentPanelProps> = ({
  spaceId,
  journalId,
  journalTitle,
  currentUserId,
  spaceMembers = [],
  isOpen,
  onClose,
  scrollToUnread = false,
  userLastSeen,
  onMarkAsRead,
}) => {
  const {
    comments,
    loading,
    createComment,
    updateComment,
    deleteComment,
  } = useJournalComments(spaceId, journalId);

  const [commentText, setCommentText] = useState('');
  const [replyToId, setReplyToId] = useState<string | null>(null);
  const [showMentions, setShowMentions] = useState(false);
  const [mentionSearch, setMentionSearch] = useState('');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [prevCommentCount, setPrevCommentCount] = useState(0);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [didScrollToUnread, setDidScrollToUnread] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const commentsEndRef = useRef<HTMLDivElement>(null);

  // Comment visibility tracking for auto mark-as-read
  const {
    registerComment,
    scrollToFirstUnread,
  } = useCommentVisibility({
    spaceId,
    threadId: `journal-discussion-${journalId}`,
    threadType: 'journal_discussion',
    userLastSeen,
    onMarkAsRead,
    enabled: isOpen,
  });

  // Scroll to first unread when panel opens with scrollToUnread flag
  useEffect(() => {
    if (isOpen && scrollToUnread && !loading && comments.length > 0 && !didScrollToUnread) {
      // Small delay to ensure DOM is ready
      const timer = setTimeout(() => {
        scrollToFirstUnread();
        setDidScrollToUnread(true);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen, scrollToUnread, loading, comments.length, didScrollToUnread, scrollToFirstUnread]);

  // Reset scroll state when panel closes
  useEffect(() => {
    if (!isOpen) {
      setDidScrollToUnread(false);
    }
  }, [isOpen]);

  // Callback ref for registering comments
  const commentRef = useCallback(
    (commentId: string, createdAt: string) => (element: HTMLDivElement | null) => {
      if (element) {
        element.setAttribute('data-comment-time', createdAt);
        registerComment(commentId, element);
      }
    },
    [registerComment]
  );

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
      <div
        key={comment.id}
        ref={commentRef(comment.id, comment.createdAt)}
        data-comment-id={comment.id}
        className={depth > 0 ? 'ml-8 mt-3' : 'mt-4'}
      >
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
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
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
                padding: '14px 16px',
                boxShadow: isDarkMode ? '0 4px 12px rgba(0, 0, 0, 0.2)' : 'var(--theme-shadow-sm)',
                border: `1px solid ${isDarkMode
                  ? (isAuthor ? 'rgba(59, 130, 246, 0.25)' : 'rgba(148, 163, 184, 0.15)')
                  : (isAuthor ? 'var(--theme-primary-200)' : 'var(--theme-border-light)')}`,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '8px' }}>
                <span style={{
                  fontWeight: '700',
                  fontSize: '14px',
                  color: isDarkMode ? '#f1f5f9' : 'var(--theme-text-primary)',
                }}>
                  {comment.authorName}
                </span>
                <span style={{
                  fontSize: '12px',
                  color: isDarkMode ? '#94a3b8' : 'var(--theme-text-secondary)',
                  fontWeight: '500',
                }}>
                  {formatTimestamp(comment.createdAt)}
                </span>
                {comment.isEdited && (
                  <span style={{ fontSize: '11px', color: isDarkMode ? '#64748b' : 'var(--theme-text-muted)', fontStyle: 'italic' }}>
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
                      padding: '10px',
                      border: `1px solid ${isDarkMode ? 'rgba(148, 163, 184, 0.3)' : 'var(--theme-border-light)'}`,
                      borderRadius: '8px',
                      fontSize: '14px',
                      backgroundColor: isDarkMode ? '#1e293b' : 'var(--theme-bg-surface)',
                      color: isDarkMode ? '#f1f5f9' : 'var(--theme-text-primary)',
                      fontFamily: 'inherit',
                      resize: 'none',
                      minHeight: '80px',
                    }}
                    autoFocus
                  />
                  <div style={{ display: 'flex', gap: '8px', marginTop: '10px', justifyContent: 'flex-end' }}>
                    <button
                      onClick={handleCancelEdit}
                      style={{
                        fontSize: '13px',
                        padding: '6px 14px',
                        borderRadius: '6px',
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
                        fontSize: '13px',
                        padding: '6px 14px',
                        borderRadius: '6px',
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
                  fontSize: '14px',
                  color: isDarkMode ? '#e2e8f0' : 'var(--theme-text-primary)',
                  lineHeight: '1.6',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  margin: 0,
                }}>
                  {highlightMentions(comment.text, isDarkMode)}
                </p>
              )}
            </div>

            {editingCommentId !== comment.id && (
              <div style={{ display: 'flex', gap: '16px', marginTop: '12px', marginLeft: '8px' }}>
                <button
                  style={{
                    fontSize: '13px',
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
                        fontSize: '13px',
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
                        fontSize: '13px',
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

  if (!isOpen) return null;

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
          backgroundColor: isDarkMode ? 'rgba(0, 0, 0, 0.7)' : 'rgba(0, 0, 0, 0.5)',
          backdropFilter: 'blur(4px)',
          zIndex: 9998,
          animation: 'fadeIn 0.3s ease-out',
        }}
        onClick={onClose}
      />

      {/* Sliding Panel */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          width: '480px',
          maxWidth: '90vw',
          background: isDarkMode ? '#0f172a' : 'var(--theme-bg-surface)',
          backdropFilter: isDarkMode ? 'blur(30px)' : 'blur(20px)',
          boxShadow: isDarkMode
            ? '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
            : 'var(--theme-shadow-2xl)',
          border: `1px solid ${isDarkMode ? 'rgba(148, 163, 184, 0.1)' : 'var(--theme-border-light)'}`,
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          animation: 'slideInRight 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <style>{`
          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          @keyframes slideInRight {
            from { transform: translateX(100%); }
            to { transform: translateX(0); }
          }
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
        `}</style>

        {/* Header */}
        <div
          style={{
            position: 'relative',
            background: isDarkMode
              ? 'linear-gradient(135deg, #1e40af 0%, #7c3aed 100%)'
              : 'linear-gradient(135deg, var(--theme-primary-500) 0%, var(--theme-primary-700) 100%)',
            padding: '20px 24px',
            paddingRight: '60px',
            color: 'white',
            boxShadow: isDarkMode ? '0 4px 12px rgba(0, 0, 0, 0.3)' : '0 2px 8px rgba(0, 0, 0, 0.1)',
          }}
        >
          <button
            onClick={onClose}
            title="Close discussion"
            style={{
              position: 'absolute',
              top: '16px',
              right: '16px',
              background: 'rgba(255, 255, 255, 0.15)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.25)',
              borderRadius: '6px',
              width: '36px',
              height: '36px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: 'white',
              fontSize: '20px',
              zIndex: 1,
            }}
          >
            ✕
          </button>

          <div className="flex items-center mb-2" style={{ gap: '10px' }}>
            <span style={{ fontSize: '20px' }}>💬</span>
            <h3 style={{ fontSize: '17px', fontWeight: '600', margin: 0 }}>
              Journal Discussion
            </h3>
          </div>

          <div
            style={{
              fontSize: '14px',
              opacity: 0.95,
              fontWeight: '500',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {journalTitle}
          </div>
        </div>

        {/* Comments list */}
        <div
          className="comments-scrollable"
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '20px 24px',
            backgroundColor: isDarkMode ? '#1e293b' : 'var(--theme-bg-base)',
          }}
        >
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: isDarkMode ? '#94a3b8' : 'var(--theme-text-secondary)' }}>
              Loading comments...
            </div>
          ) : comments.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 24px', color: isDarkMode ? '#94a3b8' : 'var(--theme-text-secondary)' }}>
              <div style={{ fontSize: '56px', marginBottom: '16px', opacity: isDarkMode ? 0.6 : 1 }}>💭</div>
              <div style={{ fontSize: '15px', fontWeight: '600', color: isDarkMode ? '#cbd5e1' : 'inherit', marginBottom: '6px' }}>
                No comments yet
              </div>
              <div style={{ fontSize: '13px', opacity: 0.9 }}>
                Be the first to share your thoughts!
              </div>
            </div>
          ) : (
            <div>
              {rootComments.map((comment) => renderComment(comment))}
              {/* Auto-scroll target */}
              <div ref={commentsEndRef} />
            </div>
          )}
        </div>

        {/* Comment input */}
        <div
          style={{
            borderTop: `1px solid ${isDarkMode ? 'rgba(148, 163, 184, 0.2)' : 'var(--theme-border-light)'}`,
            padding: '24px',
            backgroundColor: isDarkMode ? '#0f172a' : 'var(--theme-bg-surface)',
            boxShadow: isDarkMode ? '0 -4px 16px rgba(0, 0, 0, 0.3)' : '0 -4px 12px rgba(0, 0, 0, 0.05)',
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
                backgroundColor: isDarkMode ? 'rgba(59, 130, 246, 0.15)' : 'var(--theme-primary-100)',
                borderRadius: '8px',
                fontSize: '13px',
                color: isDarkMode ? '#93c5fd' : 'var(--theme-primary-700)',
              }}
            >
              <span style={{ fontWeight: '500' }}>↩ Replying to comment</span>
              <button
                onClick={() => setReplyToId(null)}
                style={{
                  marginLeft: 'auto',
                  background: 'none',
                  border: 'none',
                  color: 'inherit',
                  fontWeight: '600',
                  cursor: 'pointer',
                  fontSize: '13px',
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
                left: '24px',
                right: '24px',
                marginBottom: '10px',
                backgroundColor: isDarkMode ? '#1e293b' : 'var(--theme-bg-surface)',
                border: `1px solid ${isDarkMode ? 'rgba(148, 163, 184, 0.2)' : 'var(--theme-border-light)'}`,
                borderRadius: '10px',
                boxShadow: 'var(--theme-shadow-lg)',
                maxHeight: '180px',
                overflowY: 'auto',
              }}
            >
              {filteredMembers.map((member) => (
                <button
                  key={member.id}
                  onClick={() => handleMentionSelect(member.name)}
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
              padding: '14px 16px',
              border: `2px solid ${isDarkMode ? 'rgba(148, 163, 184, 0.2)' : 'var(--theme-border-light)'}`,
              borderRadius: '10px',
              fontSize: '14px',
              resize: 'none',
              minHeight: '52px',
              maxHeight: '140px',
              outline: 'none',
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
          />

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '12px' }}>
            <button
              onClick={() => {
                setCommentText('');
                setReplyToId(null);
              }}
              className="button-secondary"
              style={{ padding: '8px 16px', fontSize: '13px', fontWeight: '500' }}
            >
              Clear
            </button>
            <button
              onClick={handleSubmit}
              disabled={!commentText.trim()}
              className="button-primary"
              style={{ padding: '8px 20px', fontSize: '13px', fontWeight: '600' }}
            >
              Post Comment
            </button>
          </div>
        </div>
      </div>
    </>
  );

  return ReactDOM.createPortal(panelElement, document.body);
};

export default JournalCommentPanel;
