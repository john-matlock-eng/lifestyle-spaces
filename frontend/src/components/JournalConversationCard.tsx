/**
 * JournalConversationCard Component
 *
 * Displays a journal as a parent card with expandable sub-cards
 * for each conversation thread (highlights and discussions).
 */

import React, { useState } from 'react';
import {
  MessageSquare,
  Highlighter,
  Check,
  ChevronDown,
  ChevronRight,
  Reply,
  User,
} from 'lucide-react';
import type { ConversationThread, GroupedJournalConversations } from '../types/conversation';

interface JournalConversationCardProps {
  group: GroupedJournalConversations;
  onThreadClick: (thread: ConversationThread) => void;
  onMarkThreadRead: (e: React.MouseEvent, thread: ConversationThread) => void;
}

// Format timestamp smartly
const formatTimestamp = (isoString: string): string => {
  const now = new Date();
  const normalizedString =
    isoString.endsWith('Z') || isoString.includes('+') || isoString.includes('-', 10)
      ? isoString
      : isoString + 'Z';
  const then = new Date(normalizedString);
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

export const JournalConversationCard: React.FC<JournalConversationCardProps> = ({
  group,
  onThreadClick,
  onMarkThreadRead,
}) => {
  const [isExpanded, setIsExpanded] = useState(group.totalUnreadCount > 0);

  const hasUnread = group.totalUnreadCount > 0;

  return (
    <div className={`journal-group-card ${hasUnread ? 'journal-group-card--has-unread' : ''}`}>
      {/* Journal Header - Clickable to expand/collapse */}
      <div
        className="journal-group-header"
        onClick={() => setIsExpanded(!isExpanded)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setIsExpanded(!isExpanded);
          }
        }}
      >
        <div className="journal-group-expand-icon">
          {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
        </div>

        <div className="journal-group-info">
          <h3 className="journal-group-title">{group.journalTitle}</h3>
          <div className="journal-group-meta">
            <span className="journal-group-author">by {group.journalAuthorName}</span>
            <span className="journal-group-separator">·</span>
            <span className="journal-group-time">{formatTimestamp(group.lastActivity)}</span>
          </div>
        </div>

        <div className="journal-group-stats">
          {group.hasReplyToUser && (
            <span className="journal-group-reply-badge" title="Someone replied to you">
              <Reply size={12} />
            </span>
          )}
          {hasUnread && <span className="journal-group-unread-badge">{group.totalUnreadCount}</span>}
          <span className="journal-group-thread-count">
            {group.threads.length} {group.threads.length === 1 ? 'thread' : 'threads'}
          </span>
        </div>
      </div>

      {/* Expandable Thread List */}
      {isExpanded && (
        <div className="journal-group-threads">
          {group.threads.map((thread) => {
            const isHighlight = thread.threadType === 'highlight';

            return (
              <div
                key={thread.threadId}
                className={`thread-subcard ${thread.isUnread ? 'thread-subcard--unread' : ''}`}
                onClick={() => onThreadClick(thread)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onThreadClick(thread);
                  }
                }}
              >
                <div
                  className={`thread-subcard-icon ${
                    isHighlight ? 'thread-subcard-icon--highlight' : 'thread-subcard-icon--discussion'
                  }`}
                >
                  {isHighlight ? <Highlighter size={14} /> : <MessageSquare size={14} />}
                </div>

                <div className="thread-subcard-content">
                  <div className="thread-subcard-title">
                    {isHighlight && thread.highlightText ? (
                      <span>"{thread.highlightText}"</span>
                    ) : (
                      <span>Journal Discussion</span>
                    )}
                  </div>
                  {thread.latestCommentText && (
                    <div className="thread-subcard-preview">
                      <span className="thread-subcard-preview-author">{thread.latestCommentAuthor}:</span>
                      <span className="thread-subcard-preview-text">{thread.latestCommentText}</span>
                    </div>
                  )}
                  <div className="thread-subcard-stats">
                    <span>
                      {thread.commentCount} {thread.commentCount === 1 ? 'comment' : 'comments'}
                    </span>
                    {thread.userParticipated && (
                      <span className="thread-subcard-participation">
                        <User size={10} />
                        {thread.userStarted ? 'You started' : 'You replied'}
                      </span>
                    )}
                  </div>
                </div>

                <div className="thread-subcard-actions">
                  {thread.isUnread ? (
                    <>
                      <span className="thread-subcard-unread-count">{thread.unreadCount}</span>
                      <button
                        className="thread-subcard-mark-read"
                        onClick={(e) => onMarkThreadRead(e, thread)}
                        title="Mark as read"
                      >
                        <Check size={12} />
                      </button>
                    </>
                  ) : (
                    <span className="thread-subcard-time">{formatTimestamp(thread.lastActivity)}</span>
                  )}
                  {thread.hasReplyToUser && (
                    <span className="thread-subcard-reply-indicator" title="Someone replied to you">
                      <Reply size={10} />
                    </span>
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

export default JournalConversationCard;
