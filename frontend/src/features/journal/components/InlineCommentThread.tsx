/**
 * InlineCommentThread Component
 *
 * Displays comments inline at the text selection point, replacing the sliding panel.
 * Features:
 * - Renders inline at highlight position
 * - Glassmorphism panel design
 * - Comment resolution (resolve/unresolve)
 * - Comment filtering (all/mine/collaborators)
 * - Nested replies with indentation
 * - Real-time updates via WebSocket
 * - Mobile-friendly touch interactions
 */

import React, { useState, useRef, useEffect } from 'react';
import type { Highlight, Comment } from '../types/highlight.types';

interface InlineCommentThreadProps {
  highlight: Highlight;
  comments: Comment[];
  spaceMembers: Array<{ id: string; name: string }>;
  currentUserId: string;
  position: { top: number; left: number };
  onAddComment: (text: string, parentId?: string) => void;
  onDeleteComment: (commentId: string) => void;
  onResolveComment: (commentId: string, resolved: boolean) => void;
  onClose: () => void;
}

// Generate consistent color for user
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
const highlightMentions = (text: string, isDarkMode: boolean = false): React.ReactNode => {
  const parts = text.split(/(@\w+)/g);
  return parts.map((part, index) => {
    if (part.startsWith('@')) {
      return (
        <span
          key={index}
          style={{
            color: isDarkMode ? '#60a5fa' : '#0369a1',
            fontWeight: '700',
            backgroundColor: isDarkMode ? 'rgba(59, 130, 246, 0.15)' : 'rgba(3, 105, 161, 0.1)',
            padding: '2px 4px',
            borderRadius: '4px',
          }}
        >
          {part}
        </span>
      );
    }
    return part;
  });
};

export const InlineCommentThread: React.FC<InlineCommentThreadProps> = ({
  highlight: _highlight,
  comments,
  spaceMembers: _spaceMembers,
  currentUserId,
  position,
  onAddComment,
  onDeleteComment,
  onResolveComment,
  onClose,
}) => {
  const [commentText, setCommentText] = useState('');
  const [replyToId, setReplyToId] = useState<string | null>(null);
  const [filterMode, setFilterMode] = useState<'all' | 'mine' | 'collaborators'>('all');
  const [showResolved, setShowResolved] = useState(true);
  const threadRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Detect dark mode
  const isDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (threadRef.current && !threadRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  // Filter comments based on mode and resolution status
  const filteredComments = comments.filter((comment) => {
    // Filter by resolution status
    if (!showResolved && comment.isResolved) return false;

    // Filter by author
    if (filterMode === 'mine') {
      return comment.author === currentUserId;
    } else if (filterMode === 'collaborators') {
      return comment.author !== currentUserId;
    }
    return true;
  });

  // Organize comments by parent/child relationship
  const rootComments = filteredComments.filter((c) => !c.parentCommentId);
  const getReplies = (parentId: string) =>
    filteredComments.filter((c) => c.parentCommentId === parentId);

  // Submit comment
  const handleSubmit = () => {
    if (!commentText.trim()) return;
    onAddComment(commentText, replyToId || undefined);
    setCommentText('');
    setReplyToId(null);
  };

  // Render a single comment
  const renderComment = (comment: Comment, depth: number = 0) => {
    const isAuthor = comment.author === currentUserId;
    const replies = getReplies(comment.id);
    const userColor = getUserColor(comment.author);

    return (
      <div
        key={comment.id}
        className={`${depth > 0 ? 'ml-6 mt-2' : 'mt-3'}`}
        style={{ animation: 'fadeIn 0.3s ease-out' }}
      >
        <div className="flex gap-2">
          {/* Avatar */}
          <div className="flex-shrink-0">
            <div
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                background: userColor,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: '12px',
                fontWeight: '600',
              }}
            >
              {comment.authorName.charAt(0).toUpperCase()}
            </div>
          </div>

          {/* Comment content */}
          <div className="flex-1 min-w-0">
            <div
              style={{
                backgroundColor: isDarkMode
                  ? (isAuthor ? 'rgba(59, 130, 246, 0.12)' : 'rgba(30, 41, 59, 0.6)')
                  : (isAuthor ? 'rgba(59, 130, 246, 0.1)' : '#f8fafc'),
                borderRadius: '12px',
                padding: '10px 12px',
                border: `1px solid ${
                  isDarkMode
                    ? (isAuthor ? 'rgba(59, 130, 246, 0.25)' : 'rgba(148, 163, 184, 0.15)')
                    : (isAuthor ? 'rgba(59, 130, 246, 0.2)' : '#e2e8f0')
                }`,
                opacity: comment.isResolved ? 0.6 : 1,
              }}
            >
              <div className="flex items-baseline gap-2 mb-1">
                <span
                  style={{
                    fontWeight: '700',
                    fontSize: '13px',
                    color: isDarkMode ? '#f1f5f9' : '#0f172a',
                  }}
                >
                  {comment.authorName}
                </span>
                <span
                  style={{
                    fontSize: '11px',
                    color: isDarkMode ? '#94a3b8' : '#64748b',
                    fontWeight: '500',
                  }}
                >
                  {formatTimestamp(comment.createdAt)}
                </span>
                {comment.isResolved && (
                  <span
                    style={{
                      fontSize: '11px',
                      color: '#10b981',
                      fontWeight: '600',
                    }}
                  >
                    ✓ Resolved
                  </span>
                )}
              </div>
              <p
                style={{
                  fontSize: '13px',
                  color: isDarkMode ? '#e2e8f0' : '#0f172a',
                  lineHeight: '1.5',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  margin: 0,
                }}
              >
                {highlightMentions(comment.text, isDarkMode)}
              </p>
            </div>

            {/* Comment actions */}
            <div className="flex gap-3 mt-2 ml-2">
              <button
                onClick={() => setReplyToId(comment.id)}
                style={{
                  fontSize: '12px',
                  color: isDarkMode ? '#60a5fa' : '#0369a1',
                  fontWeight: '600',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 0,
                }}
              >
                Reply
              </button>
              {!comment.parentCommentId && (
                <button
                  onClick={() => onResolveComment(comment.id, !comment.isResolved)}
                  style={{
                    fontSize: '12px',
                    color: comment.isResolved ? '#64748b' : '#10b981',
                    fontWeight: '600',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: 0,
                  }}
                >
                  {comment.isResolved ? 'Unresolve' : 'Resolve'}
                </button>
              )}
              {isAuthor && (
                <button
                  onClick={() => onDeleteComment(comment.id)}
                  style={{
                    fontSize: '12px',
                    color: '#ef4444',
                    fontWeight: '600',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: 0,
                  }}
                >
                  Delete
                </button>
              )}
            </div>

            {/* Nested replies */}
            {replies.length > 0 && (
              <div className="mt-2">
                {replies.map((reply) => renderComment(reply, depth + 1))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div
      ref={threadRef}
      style={{
        position: 'absolute',
        top: `${position.top}px`,
        left: `${position.left}px`,
        width: '380px',
        maxWidth: '90vw',
        maxHeight: '500px',
        background: isDarkMode
          ? 'rgba(15, 23, 42, 0.95)'
          : 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(20px)',
        borderRadius: '16px',
        boxShadow: isDarkMode
          ? '0 20px 40px rgba(0, 0, 0, 0.5)'
          : '0 20px 40px rgba(0, 0, 0, 0.15)',
        border: `1px solid ${isDarkMode ? 'rgba(148, 163, 184, 0.2)' : 'rgba(148, 163, 184, 0.3)'}`,
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column',
        animation: 'fadeIn 0.2s ease-out',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '16px',
          borderBottom: `1px solid ${isDarkMode ? 'rgba(148, 163, 184, 0.2)' : '#e2e8f0'}`,
        }}
      >
        <div className="flex items-center justify-between mb-3">
          <h3
            style={{
              margin: 0,
              fontSize: '16px',
              fontWeight: '700',
              color: isDarkMode ? '#f1f5f9' : '#0f172a',
            }}
          >
            Comments ({comments.length})
          </h3>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '20px',
              cursor: 'pointer',
              color: isDarkMode ? '#94a3b8' : '#64748b',
              padding: 0,
              lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>

        {/* Filters */}
        <div className="flex gap-2">
          <button
            onClick={() => setFilterMode('all')}
            style={{
              fontSize: '12px',
              fontWeight: '600',
              padding: '4px 10px',
              borderRadius: '6px',
              border: 'none',
              cursor: 'pointer',
              background: filterMode === 'all'
                ? (isDarkMode ? '#3b82f6' : '#3b82f6')
                : (isDarkMode ? 'rgba(59, 130, 246, 0.2)' : '#e0f2fe'),
              color: filterMode === 'all'
                ? '#ffffff'
                : (isDarkMode ? '#60a5fa' : '#0369a1'),
            }}
          >
            All
          </button>
          <button
            onClick={() => setFilterMode('mine')}
            style={{
              fontSize: '12px',
              fontWeight: '600',
              padding: '4px 10px',
              borderRadius: '6px',
              border: 'none',
              cursor: 'pointer',
              background: filterMode === 'mine'
                ? (isDarkMode ? '#3b82f6' : '#3b82f6')
                : (isDarkMode ? 'rgba(59, 130, 246, 0.2)' : '#e0f2fe'),
              color: filterMode === 'mine'
                ? '#ffffff'
                : (isDarkMode ? '#60a5fa' : '#0369a1'),
            }}
          >
            Mine
          </button>
          <button
            onClick={() => setFilterMode('collaborators')}
            style={{
              fontSize: '12px',
              fontWeight: '600',
              padding: '4px 10px',
              borderRadius: '6px',
              border: 'none',
              cursor: 'pointer',
              background: filterMode === 'collaborators'
                ? (isDarkMode ? '#3b82f6' : '#3b82f6')
                : (isDarkMode ? 'rgba(59, 130, 246, 0.2)' : '#e0f2fe'),
              color: filterMode === 'collaborators'
                ? '#ffffff'
                : (isDarkMode ? '#60a5fa' : '#0369a1'),
            }}
          >
            Others
          </button>
          <button
            onClick={() => setShowResolved(!showResolved)}
            style={{
              fontSize: '12px',
              fontWeight: '600',
              padding: '4px 10px',
              borderRadius: '6px',
              border: 'none',
              cursor: 'pointer',
              marginLeft: 'auto',
              background: showResolved
                ? (isDarkMode ? '#10b981' : '#10b981')
                : (isDarkMode ? 'rgba(16, 185, 129, 0.2)' : '#d1fae5'),
              color: showResolved ? '#ffffff' : '#059669',
            }}
          >
            {showResolved ? 'Hide' : 'Show'} Resolved
          </button>
        </div>
      </div>

      {/* Comments list */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '16px',
        }}
      >
        {rootComments.length === 0 ? (
          <p
            style={{
              textAlign: 'center',
              color: isDarkMode ? '#94a3b8' : '#64748b',
              fontSize: '13px',
              margin: '40px 0',
            }}
          >
            No comments yet. Be the first to comment!
          </p>
        ) : (
          rootComments.map((comment) => renderComment(comment))
        )}
      </div>

      {/* Input area */}
      <div
        style={{
          padding: '16px',
          borderTop: `1px solid ${isDarkMode ? 'rgba(148, 163, 184, 0.2)' : '#e2e8f0'}`,
        }}
      >
        {replyToId && (
          <div
            style={{
              fontSize: '12px',
              color: isDarkMode ? '#94a3b8' : '#64748b',
              marginBottom: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <span>Replying to comment</span>
            <button
              onClick={() => setReplyToId(null)}
              style={{
                background: 'none',
                border: 'none',
                color: '#ef4444',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: '600',
                padding: 0,
              }}
            >
              Cancel
            </button>
          </div>
        )}
        <div className="flex gap-2">
          <textarea
            ref={textareaRef}
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            placeholder="Add a comment... (Use @ to mention)"
            style={{
              flex: 1,
              padding: '8px 12px',
              borderRadius: '8px',
              border: `1px solid ${isDarkMode ? 'rgba(148, 163, 184, 0.3)' : '#cbd5e1'}`,
              background: isDarkMode ? 'rgba(15, 23, 42, 0.5)' : '#ffffff',
              color: isDarkMode ? '#f1f5f9' : '#0f172a',
              fontSize: '13px',
              resize: 'none',
              minHeight: '60px',
              outline: 'none',
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                handleSubmit();
              }
            }}
          />
          <button
            onClick={handleSubmit}
            disabled={!commentText.trim()}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: 'none',
              background: commentText.trim()
                ? '#3b82f6'
                : (isDarkMode ? 'rgba(59, 130, 246, 0.3)' : '#cbd5e1'),
              color: '#ffffff',
              fontSize: '13px',
              fontWeight: '600',
              cursor: commentText.trim() ? 'pointer' : 'not-allowed',
              alignSelf: 'flex-end',
            }}
          >
            Send
          </button>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(-8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
};
