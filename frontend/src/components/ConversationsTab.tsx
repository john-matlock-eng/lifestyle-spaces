/**
 * ConversationsTab Component
 *
 * Displays aggregated discussion data for all journals in a space.
 * Shows journals with active discussions, sorted by recent activity,
 * with unread counts and participant info.
 */

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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

  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;

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

  const handleConversationClick = (conversation: Conversation) => {
    // Navigate to journal with the appropriate panel open based on last activity type
    const baseUrl = `/spaces/${spaceId}/journals/${conversation.journalId}`;

    if (conversation.lastActivityType === 'highlight_comment' && conversation.lastActivityHighlightId) {
      // Open the specific highlight's comment panel
      navigate(`${baseUrl}?highlightId=${conversation.lastActivityHighlightId}`);
    } else if (conversation.lastActivityType === 'journal_comment') {
      // Open the journal-level discussion panel
      navigate(`${baseUrl}?openJournalComments=true`);
    } else {
      // Default: just open the journal
      navigate(baseUrl);
    }
  };

  const handleMarkAsRead = async (e: React.MouseEvent, conversation: Conversation) => {
    e.stopPropagation();
    try {
      await conversationService.markJournalAsRead(spaceId, conversation.journalId);
      // Update local state
      setConversations(prev =>
        prev.map(c =>
          c.journalId === conversation.journalId
            ? { ...c, unreadCount: 0 }
            : c
        )
      );
      setTotalUnread(prev => Math.max(0, prev - conversation.unreadCount));
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
            <span className="conversations-unread-badge">{totalUnread} unread</span>
          )}
        </div>
        <div className="conversations-header-right">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'recent' | 'unread')}
            className="conversations-sort-select"
          >
            <option value="recent">Most Recent</option>
            <option value="unread">Unread First</option>
          </select>
        </div>
      </div>

      {/* Conversations List */}
      {conversations.length === 0 ? (
        <div className="conversations-empty">
          <div className="conversations-empty-icon">💬</div>
          <h3>No conversations yet</h3>
          <p>Discussions will appear here when members start commenting on journals.</p>
        </div>
      ) : (
        <div className="conversations-list">
          {conversations.map((conversation) => (
            <div
              key={conversation.journalId}
              className={`conversation-card ${conversation.unreadCount > 0 ? 'conversation-card--unread' : ''}`}
              onClick={() => handleConversationClick(conversation)}
            >
              <div className="conversation-card-main">
                <div className="conversation-card-header">
                  <h3 className="conversation-journal-title">{conversation.journalTitle}</h3>
                  <span className="conversation-timestamp">
                    {formatTimestamp(conversation.lastActivity)}
                  </span>
                </div>

                <div className="conversation-author">
                  by {conversation.journalAuthorName}
                </div>

                {conversation.previewText && (
                  <p className="conversation-preview">{conversation.previewText}</p>
                )}

                <div className="conversation-stats">
                  <span className="conversation-stat" title="Highlights">
                    🎨 {conversation.highlightCount}
                  </span>
                  <span className="conversation-stat" title="Highlight comments">
                    💬 {conversation.highlightCommentCount}
                  </span>
                  <span className="conversation-stat" title="Discussion comments">
                    🗨️ {conversation.journalCommentCount}
                  </span>
                </div>
              </div>

              <div className="conversation-card-side">
                {conversation.unreadCount > 0 && (
                  <div className="conversation-unread-indicator">
                    <span className="conversation-unread-count">{conversation.unreadCount}</span>
                    <button
                      className="conversation-mark-read-btn"
                      onClick={(e) => handleMarkAsRead(e, conversation)}
                      title="Mark as read"
                    >
                      ✓
                    </button>
                  </div>
                )}

                {conversation.participants.length > 0 && (
                  <div className="conversation-participants">
                    {conversation.participants.slice(0, 3).map((name, index) => (
                      <div
                        key={index}
                        className="conversation-participant-avatar"
                        style={{ backgroundColor: getParticipantColor(name) }}
                        title={name}
                      >
                        {name.charAt(0).toUpperCase()}
                      </div>
                    ))}
                    {conversation.participants.length > 3 && (
                      <div className="conversation-participant-more">
                        +{conversation.participants.length - 3}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ConversationsTab;
