/**
 * JournalConversationCard - Grouped conversation card for a journal
 *
 * Shows a parent card for the journal with expandable sub-cards
 * for each conversation thread (highlights and discussions).
 */

import React, { useState } from 'react'
import {
  MessageSquare,
  Highlighter,
  ChevronDown,
  ChevronRight,
  Check,
  Reply,
  User,
} from 'lucide-react'
import type { ConversationThread, GroupedJournalConversations } from '../types/conversation'
import './JournalConversationCard.css'

interface JournalConversationCardProps {
  group: GroupedJournalConversations
  onThreadClick: (thread: ConversationThread) => void
  onMarkThreadRead: (e: React.MouseEvent, thread: ConversationThread) => void
}

// Format timestamp smartly - exported for use in ConversationsTab
export const formatTimestamp = (isoString: string): string => {
  const now = new Date()
  const normalizedString =
    isoString.endsWith('Z') || isoString.includes('+') || isoString.includes('-', 10)
      ? isoString
      : isoString + 'Z'
  const then = new Date(normalizedString)
  const diffMs = now.getTime() - then.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  const diffHour = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHour / 24)

  if (diffMin < 1) return 'now'
  if (diffMin < 60) return `${diffMin}m`
  if (diffHour < 24) return `${diffHour}h`
  if (diffDay < 7) return `${diffDay}d`

  return then.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

// Get participation status text
const getParticipationText = (thread: ConversationThread): string => {
  if (thread.userStarted && thread.userParticipated) {
    return 'You started'
  }
  if (thread.userParticipated) {
    return 'You replied'
  }
  return ''
}

export const JournalConversationCard: React.FC<JournalConversationCardProps> = ({
  group,
  onThreadClick,
  onMarkThreadRead,
}) => {
  const [isExpanded, setIsExpanded] = useState(true)

  const toggleExpanded = () => {
    setIsExpanded((prev) => !prev)
  }

  return (
    <div
      className={`journal-group-card ${group.totalUnreadCount > 0 ? 'journal-group-card--has-unread' : ''}`}
    >
      {/* Journal Header */}
      <div
        className="journal-group-header"
        onClick={toggleExpanded}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            toggleExpanded()
          }
        }}
      >
        <div className="journal-group-expand">
          {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
        </div>

        <div className="journal-group-info">
          <h3 className="journal-group-title">{group.journalTitle}</h3>
          <div className="journal-group-meta">
            <span className="journal-group-author">by {group.journalAuthorName}</span>
            <span className="journal-group-separator">·</span>
            <span className="journal-group-time">{formatTimestamp(group.journalDate)}</span>
          </div>
        </div>

        <div className="journal-group-stats">
          {group.hasReplyToUser && (
            <span className="journal-group-reply-badge" title="Someone replied to you">
              <Reply size={12} />
            </span>
          )}
          {group.totalUnreadCount > 0 && (
            <span className="journal-group-badge">{group.totalUnreadCount} new</span>
          )}
          <span className="journal-group-thread-count">
            {group.threads.length} {group.threads.length === 1 ? 'thread' : 'threads'}
          </span>
        </div>
      </div>

      {/* Thread Sub-cards */}
      {isExpanded && (
        <div className="journal-group-threads">
          {group.threads.map((thread) => {
            const isHighlight = thread.threadType === 'highlight'
            const participationText = getParticipationText(thread)

            return (
              <div
                key={thread.threadId}
                className={`thread-subcard ${thread.isUnread ? 'thread-subcard--unread' : ''} ${
                  thread.hasReplyToUser ? 'thread-subcard--has-reply' : ''
                }`}
                onClick={() => onThreadClick(thread)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    onThreadClick(thread)
                  }
                }}
              >
                {/* Thread type icon */}
                <div
                  className={`thread-subcard-icon ${
                    isHighlight ? 'thread-subcard-icon--highlight' : 'thread-subcard-icon--discussion'
                  }`}
                >
                  {isHighlight ? <Highlighter size={14} /> : <MessageSquare size={14} />}
                </div>

                {/* Thread content */}
                <div className="thread-subcard-content">
                  <div className="thread-subcard-header">
                    {isHighlight && thread.highlightText ? (
                      <span
                        className={`thread-subcard-title ${
                          thread.isUnread ? 'thread-subcard-title--unread' : ''
                        }`}
                      >
                        "{thread.highlightText}"
                      </span>
                    ) : (
                      <span
                        className={`thread-subcard-title ${
                          thread.isUnread ? 'thread-subcard-title--unread' : ''
                        }`}
                      >
                        Journal Discussion
                      </span>
                    )}
                    <span className="thread-subcard-time">
                      {formatTimestamp(thread.lastActivity)}
                    </span>
                  </div>

                  {/* Latest comment preview */}
                  {thread.latestCommentText && (
                    <div className="thread-subcard-preview">
                      <span className="thread-subcard-preview-author">
                        {thread.latestCommentAuthor}:
                      </span>
                      <span className="thread-subcard-preview-text">{thread.latestCommentText}</span>
                    </div>
                  )}

                  {/* Stats row */}
                  <div className="thread-subcard-stats">
                    <span className="thread-subcard-stat">
                      {thread.commentCount} {thread.commentCount === 1 ? 'comment' : 'comments'}
                    </span>
                    {participationText && (
                      <span className="thread-subcard-participation">
                        <User size={10} />
                        {participationText}
                      </span>
                    )}
                    {thread.hasReplyToUser && (
                      <span className="thread-subcard-reply-indicator" title="Someone replied to you">
                        <Reply size={10} />
                        Reply
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="thread-subcard-actions">
                  {thread.isUnread ? (
                    <>
                      <span className="thread-subcard-unread-count">{thread.unreadCount}</span>
                      <button
                        className="thread-subcard-mark-read-btn"
                        onClick={(e) => onMarkThreadRead(e, thread)}
                        title="Mark as read"
                      >
                        <Check size={12} />
                      </button>
                    </>
                  ) : (
                    <ChevronRight size={16} className="thread-subcard-chevron" />
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default JournalConversationCard
