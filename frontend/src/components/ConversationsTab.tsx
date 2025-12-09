/**
 * ConversationsTab Component
 *
 * Displays aggregated discussion data for all journals in a space.
 * Clean inbox-style list with automatic read tracking.
 */

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageSquare, Highlighter, Check } from 'lucide-react';
import { conversationService } from '../services/conversationService';
import type { Conversation } from '../types/conversation';
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

// Get activity type label
const getActivityLabel = (type: string): string => {
  switch (type) {
    case 'highlight_comment':
      return 'highlight';
    case 'journal_comment':
      return 'discussion';
    default:
      return 'activity';
  }
};

export const ConversationsTab: React.FC<ConversationsTabProps> = ({ spaceId }) => {
  const navigate = useNavigate();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [totalUnread, setTotalUnread] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'recent' | 'unread'>('recent');

  useEffect(() => {
    const fetchConversations = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await conversationService.getSpaceConversations(spaceId, {
          sort: sortBy,
          limit: 50,
        });
        setConversations(response.conversations);
        setTotalUnread(response.totalUnread);
      } catch (err) {
        console.error('Error fetching conversations:', err);
        setError('Failed to load conversations');
      } finally {
        setLoading(false);
      }
    };

    fetchConversations();
  }, [spaceId, sortBy]);

  const handleConversationClick = async (conversation: Conversation) => {
    // Auto-mark as read when clicking (fire and forget)
    if (conversation.unreadCount > 0) {
      // Update local state immediately for responsiveness
      setConversations(prev =>
        prev.map(c =>
          c.journalId === conversation.journalId
            ? { ...c, unreadCount: 0 }
            : c
        )
      );
      setTotalUnread(prev => Math.max(0, prev - conversation.unreadCount));

      // Mark as read in background
      conversationService.markJournalAsRead(spaceId, conversation.journalId).catch(err => {
        console.error('Error auto-marking as read:', err);
      });
    }

    // Navigate to journal with the appropriate panel open
    const baseUrl = `/spaces/${spaceId}/journals/${conversation.journalId}`;

    if (conversation.lastActivityType === 'highlight_comment' && conversation.lastActivityHighlightId) {
      navigate(`${baseUrl}?highlightId=${conversation.lastActivityHighlightId}`);
    } else if (conversation.lastActivityType === 'journal_comment') {
      navigate(`${baseUrl}?openJournalComments=true`);
    } else {
      navigate(baseUrl);
    }
  };

  const handleMarkAsRead = async (e: React.MouseEvent, conversation: Conversation) => {
    e.stopPropagation();
    try {
      // Update local state immediately
      setConversations(prev =>
        prev.map(c =>
          c.journalId === conversation.journalId
            ? { ...c, unreadCount: 0 }
            : c
        )
      );
      setTotalUnread(prev => Math.max(0, prev - conversation.unreadCount));

      await conversationService.markJournalAsRead(spaceId, conversation.journalId);
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
        </div>
        <div className="conversations-header-right">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'recent' | 'unread')}
            className="conversations-sort-select"
          >
            <option value="recent">Recent</option>
            <option value="unread">Unread</option>
          </select>
        </div>
      </div>

      {/* Conversations List */}
      {conversations.length === 0 ? (
        <div className="conversations-empty">
          <MessageSquare size={48} strokeWidth={1} />
          <h3>No conversations yet</h3>
          <p>Discussions will appear here when members start commenting on journals.</p>
        </div>
      ) : (
        <div className="conversations-list">
          {conversations.map((conversation) => {
            const isUnread = conversation.unreadCount > 0;
            const isHighlight = conversation.lastActivityType === 'highlight_comment';
            const totalComments = conversation.highlightCommentCount + conversation.journalCommentCount;

            return (
              <div
                key={conversation.journalId}
                className={`conversation-row ${isUnread ? 'conversation-row--unread' : ''}`}
                onClick={() => handleConversationClick(conversation)}
              >
                {/* Left: Activity type icon */}
                <div className="conversation-row-icon">
                  {isHighlight ? (
                    <Highlighter size={18} />
                  ) : (
                    <MessageSquare size={18} />
                  )}
                  {isUnread && <span className="conversation-unread-dot" />}
                </div>

                {/* Middle: Content */}
                <div className="conversation-row-content">
                  <div className="conversation-row-top">
                    <span className={`conversation-row-title ${isUnread ? 'conversation-row-title--unread' : ''}`}>
                      {conversation.journalTitle}
                    </span>
                    <span className="conversation-row-meta">
                      <span className="conversation-row-type">{getActivityLabel(conversation.lastActivityType)}</span>
                      <span className="conversation-row-time">{formatTimestamp(conversation.lastActivity)}</span>
                    </span>
                  </div>

                  <div className="conversation-row-middle">
                    <span className="conversation-row-author">
                      {conversation.journalAuthorName}
                    </span>
                    {conversation.previewText && (
                      <span className="conversation-row-preview">
                        {conversation.previewText}
                      </span>
                    )}
                  </div>

                  <div className="conversation-row-bottom">
                    {/* Participants */}
                    <div className="conversation-row-participants">
                      {conversation.participants.slice(0, 4).map((name, index) => (
                        <div
                          key={index}
                          className="conversation-avatar"
                          style={{ backgroundColor: getParticipantColor(name) }}
                          title={name}
                        >
                          {name.charAt(0).toUpperCase()}
                        </div>
                      ))}
                      {conversation.participants.length > 4 && (
                        <div className="conversation-avatar conversation-avatar--more">
                          +{conversation.participants.length - 4}
                        </div>
                      )}
                    </div>

                    {/* Stats */}
                    <div className="conversation-row-stats">
                      {totalComments > 0 && (
                        <span className="conversation-row-stat">
                          {totalComments} {totalComments === 1 ? 'comment' : 'comments'}
                        </span>
                      )}
                      {conversation.highlightCount > 0 && (
                        <span className="conversation-row-stat">
                          {conversation.highlightCount} {conversation.highlightCount === 1 ? 'highlight' : 'highlights'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right: Unread count and actions */}
                <div className="conversation-row-actions">
                  {isUnread ? (
                    <>
                      <span className="conversation-unread-count">{conversation.unreadCount}</span>
                      <button
                        className="conversation-mark-read-btn"
                        onClick={(e) => handleMarkAsRead(e, conversation)}
                        title="Mark as read"
                      >
                        <Check size={14} />
                      </button>
                    </>
                  ) : (
                    <span className="conversation-row-chevron">›</span>
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
