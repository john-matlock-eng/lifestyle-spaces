/**
 * ConversationsTab Component
 *
 * Displays thread-level conversation data for a space.
 * Each row is a conversation thread (highlight or journal discussion).
 */

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageSquare, Highlighter, Check, Reply, User } from 'lucide-react';
import { conversationService } from '../services/conversationService';
import type { ConversationThread, GetThreadsOptions } from '../types/conversation';
import './ConversationsTab.css';

interface ConversationsTabProps {
  spaceId: string;
}

// Format timestamp smartly
const formatTimestamp = (isoString: string): string => {
  const now = new Date();
  const then = new Date(isoString);
  const diffMs = now.getTime() - then.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffMin < 1) return 'now';
  if (diffMin < 60) return `${diffMin}m`;
  if (diffHour < 24) return `${diffHour}h`;
  if (diffDay < 7) return `${diffDay}d`;

  return then.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

// Generate consistent color for participant
const getParticipantColor = (name: string): string => {
  const colors = [
    '#14b8a6', '#a855f7', '#ec4899', '#10b981',
    '#0ea5e9', '#f59e0b', '#0d9488', '#9333ea',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

// Get participation status text
const getParticipationText = (thread: ConversationThread): string => {
  if (thread.userStarted && thread.userParticipated) {
    return 'You started';
  }
  if (thread.userParticipated) {
    return 'You replied';
  }
  return '';
};

export const ConversationsTab: React.FC<ConversationsTabProps> = ({ spaceId }) => {
  const navigate = useNavigate();
  const [threads, setThreads] = useState<ConversationThread[]>([]);
  const [totalUnread, setTotalUnread] = useState(0);
  const [threadsWithReplies, setThreadsWithReplies] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<GetThreadsOptions['sort']>('recent');
  const [filterType, setFilterType] = useState<GetThreadsOptions['type']>(undefined);

  useEffect(() => {
    const fetchThreads = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await conversationService.getThreads(spaceId, {
          sort: sortBy,
          type: filterType,
          limit: 50,
        });
        setThreads(response.threads);
        setTotalUnread(response.totalUnread);
        setThreadsWithReplies(response.threadsWithReplies);
      } catch (err) {
        console.error('Error fetching threads:', err);
        setError('Failed to load conversations');
      } finally {
        setLoading(false);
      }
    };

    fetchThreads();
  }, [spaceId, sortBy, filterType]);

  const handleThreadClick = async (thread: ConversationThread) => {
    // Auto-mark as read
    if (thread.isUnread) {
      setThreads(prev =>
        prev.map(t =>
          t.threadId === thread.threadId
            ? { ...t, isUnread: false, unreadCount: 0, hasReplyToUser: false }
            : t
        )
      );
      setTotalUnread(prev => Math.max(0, prev - thread.unreadCount));
      if (thread.hasReplyToUser) {
        setThreadsWithReplies(prev => Math.max(0, prev - 1));
      }

      conversationService.markJournalAsRead(spaceId, thread.journalId).catch(err => {
        console.error('Error marking as read:', err);
      });
    }

    // Navigate to the appropriate location
    const baseUrl = `/spaces/${spaceId}/journals/${thread.journalId}`;

    if (thread.threadType === 'highlight') {
      // Open the highlight's comment panel
      navigate(`${baseUrl}?highlightId=${thread.threadId}`);
    } else {
      // Open the journal discussion panel
      navigate(`${baseUrl}?openJournalComments=true`);
    }
  };

  const handleMarkAsRead = async (e: React.MouseEvent, thread: ConversationThread) => {
    e.stopPropagation();
    setThreads(prev =>
      prev.map(t =>
        t.threadId === thread.threadId
          ? { ...t, isUnread: false, unreadCount: 0, hasReplyToUser: false }
          : t
      )
    );
    setTotalUnread(prev => Math.max(0, prev - thread.unreadCount));
    if (thread.hasReplyToUser) {
      setThreadsWithReplies(prev => Math.max(0, prev - 1));
    }

    try {
      await conversationService.markJournalAsRead(spaceId, thread.journalId);
    } catch (err) {
      console.error('Error marking as read:', err);
    }
  };

  if (loading) {
    return (
      <div className="conversations-tab">
        <div className="conversations-loading">
          <div className="conversations-loading-spinner" />
          <span>Loading conversations...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="conversations-tab">
        <div className="conversations-error">
          <span className="conversations-error-icon">!</span>
          <span>{error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="conversations-tab">
      {/* Header */}
      <div className="conversations-header">
        <div className="conversations-header-left">
          <h2 className="conversations-title">Conversations</h2>
          {totalUnread > 0 && (
            <span className="conversations-unread-badge">{totalUnread} new</span>
          )}
          {threadsWithReplies > 0 && (
            <span className="conversations-replies-badge">
              <Reply size={12} />
              {threadsWithReplies}
            </span>
          )}
        </div>
        <div className="conversations-header-right">
          <select
            value={filterType || 'all'}
            onChange={(e) => setFilterType(e.target.value === 'all' ? undefined : e.target.value as GetThreadsOptions['type'])}
            className="conversations-filter-select"
          >
            <option value="all">All</option>
            <option value="highlight">Highlights</option>
            <option value="journal_discussion">Discussions</option>
          </select>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as GetThreadsOptions['sort'])}
            className="conversations-sort-select"
          >
            <option value="recent">Recent</option>
            <option value="unread">Unread</option>
            <option value="replies">Replies to you</option>
          </select>
        </div>
      </div>

      {/* Threads List */}
      {threads.length === 0 ? (
        <div className="conversations-empty">
          <MessageSquare size={48} strokeWidth={1} />
          <h3>No conversations yet</h3>
          <p>Discussions will appear here when members start commenting on highlights or journals.</p>
        </div>
      ) : (
        <div className="conversations-list">
          {threads.map((thread) => {
            const isHighlight = thread.threadType === 'highlight';
            const participationText = getParticipationText(thread);

            return (
              <div
                key={thread.threadId}
                className={`thread-row ${thread.isUnread ? 'thread-row--unread' : ''} ${thread.hasReplyToUser ? 'thread-row--has-reply' : ''}`}
                onClick={() => handleThreadClick(thread)}
              >
                {/* Left: Type icon with indicators */}
                <div className="thread-row-icon-area">
                  <div className={`thread-row-icon ${isHighlight ? 'thread-row-icon--highlight' : 'thread-row-icon--discussion'}`}>
                    {isHighlight ? (
                      <Highlighter size={16} />
                    ) : (
                      <MessageSquare size={16} />
                    )}
                  </div>
                  {thread.isUnread && <span className="thread-unread-dot" />}
                  {thread.hasReplyToUser && (
                    <span className="thread-reply-indicator" title="Someone replied to you">
                      <Reply size={10} />
                    </span>
                  )}
                </div>

                {/* Middle: Content */}
                <div className="thread-row-content">
                  {/* Top row: title and time */}
                  <div className="thread-row-top">
                    <div className="thread-row-title-area">
                      {isHighlight && thread.highlightText ? (
                        <span className={`thread-row-title ${thread.isUnread ? 'thread-row-title--unread' : ''}`}>
                          "{thread.highlightText}"
                        </span>
                      ) : (
                        <span className={`thread-row-title ${thread.isUnread ? 'thread-row-title--unread' : ''}`}>
                          Journal Discussion
                        </span>
                      )}
                    </div>
                    <span className="thread-row-time">{formatTimestamp(thread.lastActivity)}</span>
                  </div>

                  {/* Second row: journal info and participation */}
                  <div className="thread-row-context">
                    <span className="thread-row-journal">{thread.journalTitle}</span>
                    <span className="thread-row-author">by {thread.journalAuthorName}</span>
                    {participationText && (
                      <span className="thread-row-participation">
                        <User size={10} />
                        {participationText}
                      </span>
                    )}
                  </div>

                  {/* Third row: latest comment preview */}
                  {thread.latestCommentText && (
                    <div className="thread-row-preview">
                      <span className="thread-row-preview-author">{thread.latestCommentAuthor}:</span>
                      <span className="thread-row-preview-text">{thread.latestCommentText}</span>
                    </div>
                  )}

                  {/* Bottom row: participants and stats */}
                  <div className="thread-row-bottom">
                    <div className="thread-row-participants">
                      {thread.participants.slice(0, 4).map((name, index) => (
                        <div
                          key={index}
                          className="thread-avatar"
                          style={{ backgroundColor: getParticipantColor(name) }}
                          title={name}
                        >
                          {name.charAt(0).toUpperCase()}
                        </div>
                      ))}
                      {thread.participants.length > 4 && (
                        <div className="thread-avatar thread-avatar--more">
                          +{thread.participants.length - 4}
                        </div>
                      )}
                    </div>
                    <div className="thread-row-stats">
                      <span className="thread-row-stat">
                        {thread.commentCount} {thread.commentCount === 1 ? 'comment' : 'comments'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right: Unread count and actions */}
                <div className="thread-row-actions">
                  {thread.isUnread ? (
                    <>
                      <span className="thread-unread-count">{thread.unreadCount}</span>
                      <button
                        className="thread-mark-read-btn"
                        onClick={(e) => handleMarkAsRead(e, thread)}
                        title="Mark as read"
                      >
                        <Check size={14} />
                      </button>
                    </>
                  ) : (
                    <span className="thread-row-chevron">›</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ConversationsTab;
